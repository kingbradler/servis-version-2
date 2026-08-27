"""Daily billing maintenance: expire subscriptions/boosts + expiry reminders.

Schedule (cron / Task Scheduler), once per day::

    python manage.py run_billing_jobs

Options:
  --expire-only   Only mark expired subscriptions and boosts
  --remind-only   Only send J-7 / J-3 / J-1 reminders
  --dry-run       Print what would happen without writing
"""

from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.billing.models import Boost, BoostStatus, Subscription, SubscriptionStatus
from apps.billing.services import (
    expire_stale_boosts,
    expire_stale_subscriptions,
    remind_expiring_subscriptions,
    run_billing_maintenance,
)


class Command(BaseCommand):
    help = "Expire stale billing entities and remind sellers before expiry."

    def add_arguments(self, parser):
        parser.add_argument(
            "--expire-only",
            action="store_true",
            help="Skip reminders",
        )
        parser.add_argument(
            "--remind-only",
            action="store_true",
            help="Skip expiry updates",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report counts without mutating or notifying",
        )

    def handle(self, *args, **options):
        now = timezone.now()
        expire_only = options["expire_only"]
        remind_only = options["remind_only"]
        dry_run = options["dry_run"]

        if expire_only and remind_only:
            self.stderr.write("Use only one of --expire-only / --remind-only.")
            return

        if dry_run:
            stale_subs = Subscription.objects.filter(
                status=SubscriptionStatus.ACTIVE,
                expires_at__isnull=False,
                expires_at__lte=now,
            ).count()
            stale_boosts = Boost.objects.filter(
                status=BoostStatus.ACTIVE,
                expires_at__isnull=False,
                expires_at__lte=now,
            ).count()
            remind_count = 0
            for days in (7, 3, 1):
                target = (now + timedelta(days=days)).date()
                remind_count += (
                    Subscription.objects.filter(
                        status=SubscriptionStatus.ACTIVE,
                        expires_at__isnull=False,
                        expires_at__date=target,
                    )
                    .exclude(plan__price=0)
                    .count()
                )
            self.stdout.write(
                self.style.WARNING(
                    f"[dry-run] would expire subs={stale_subs} boosts={stale_boosts} "
                    f"remind≈{remind_count}"
                )
            )
            return

        if remind_only:
            sent = remind_expiring_subscriptions(now=now)
            self.stdout.write(self.style.SUCCESS(f"Reminders sent: {sent}"))
            return

        if expire_only:
            subs = expire_stale_subscriptions(now=now)
            boosts = expire_stale_boosts(now=now)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Expired subscriptions={subs} boosts={boosts}"
                )
            )
            return

        result = run_billing_maintenance(now=now, remind=True)
        self.stdout.write(
            self.style.SUCCESS(
                "Billing jobs OK — "
                f"expired_subscriptions={result['expired_subscriptions']} "
                f"expired_boosts={result['expired_boosts']} "
                f"reminders_sent={result['reminders_sent']}"
            )
        )
