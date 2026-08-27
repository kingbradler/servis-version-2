"""Tests for billing cron: expire + reminders."""

from datetime import timedelta

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.billing.models import (
    Plan,
    PlanCategory,
    PlanType,
    Subscription,
    SubscriptionStatus,
)
from apps.billing.services import (
    remind_expiring_subscriptions,
    run_billing_maintenance,
)
from apps.notifications.models import Notification, NotificationType
from apps.users.choices import UserRole
from apps.users.models import User


class BillingJobsTests(TestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            email="seller.jobs@servis.ma",
            password="SecurePass123!",
            first_name="S",
            last_name="J",
            role=UserRole.SELLER,
        )
        self.plan = Plan.objects.create(
            code=PlanType.STORE_STANDARD,
            plan_type=PlanType.STORE_STANDARD,
            category=PlanCategory.STORE,
            name="Boutique Standard",
            price="99.00",
            duration_days=30,
            product_limit=20,
            product_image_limit=3,
            is_active=True,
        )

    def _active_sub(self, *, expires_at):
        return Subscription.objects.create(
            owner=self.seller,
            plan=self.plan,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(days=20),
            activated_at=timezone.now() - timedelta(days=20),
            expires_at=expires_at,
        )

    def test_expire_notifies_owner(self):
        self._active_sub(expires_at=timezone.now() - timedelta(hours=1))
        result = run_billing_maintenance(remind=False)
        self.assertEqual(result["expired_subscriptions"], 1)
        sub = Subscription.objects.get(owner=self.seller)
        self.assertEqual(sub.status, SubscriptionStatus.EXPIRED)
        self.assertTrue(
            Notification.objects.filter(
                user=self.seller, type=NotificationType.SUB_EXPIRED
            ).exists()
        )

    def test_remind_j3_idempotent(self):
        now = timezone.now().replace(hour=12, minute=0, second=0, microsecond=0)
        expires = now + timedelta(days=3)
        self._active_sub(expires_at=expires)

        first = remind_expiring_subscriptions(now=now, days_before=(3,))
        second = remind_expiring_subscriptions(now=now, days_before=(3,))
        self.assertEqual(first, 1)
        self.assertEqual(second, 0)
        self.assertEqual(
            Notification.objects.filter(
                user=self.seller, type=NotificationType.SUB_EXPIRING
            ).count(),
            1,
        )

    def test_management_command_runs(self):
        self._active_sub(expires_at=timezone.now() - timedelta(minutes=5))
        call_command("run_billing_jobs", verbosity=0)
        self.assertEqual(
            Subscription.objects.get(owner=self.seller).status,
            SubscriptionStatus.EXPIRED,
        )
