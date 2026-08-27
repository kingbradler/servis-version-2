"""Notifications API + helpers."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.notifications.models import Notification, NotificationType
from apps.notifications.services import notify
from apps.users.choices import UserRole

User = get_user_model()


class NotificationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="notif@example.com",
            password="TestPass123!",
            role=UserRole.CLIENT,
            first_name="A",
            last_name="B",
        )
        self.other = User.objects.create_user(
            email="other@example.com",
            password="TestPass123!",
            role=UserRole.CLIENT,
            first_name="C",
            last_name="D",
        )

    def test_list_and_unread_count(self):
        notify(
            user=self.user,
            type=NotificationType.SYSTEM,
            title="Hello",
            body="World",
            link="/dashboard",
        )
        notify(
            user=self.other,
            type=NotificationType.SYSTEM,
            title="Other",
        )

        self.client.force_authenticate(self.user)
        list_res = self.client.get("/api/v1/notifications/")
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(list_res.data["count"], 1)
        self.assertEqual(list_res.data["results"][0]["title"], "Hello")

        count_res = self.client.get("/api/v1/notifications/unread-count/")
        self.assertEqual(count_res.status_code, 200)
        self.assertEqual(count_res.data["unread_count"], 1)

    def test_mark_read_and_mark_all(self):
        n1 = notify(
            user=self.user,
            type=NotificationType.ORDER_NEW,
            title="One",
        )
        n2 = notify(
            user=self.user,
            type=NotificationType.MESSAGE_NEW,
            title="Two",
        )
        self.client.force_authenticate(self.user)

        res = self.client.post(f"/api/v1/notifications/{n1.id}/read/")
        self.assertEqual(res.status_code, 200)
        n1.refresh_from_db()
        self.assertTrue(n1.is_read)
        n2.refresh_from_db()
        self.assertFalse(n2.is_read)

        res = self.client.post("/api/v1/notifications/mark-all-read/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            Notification.objects.filter(user=self.user, is_read=False).count(),
            0,
        )
