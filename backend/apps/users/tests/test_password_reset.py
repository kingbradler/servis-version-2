"""Password reset API tests."""

from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.choices import UserRole
from apps.users.models import User
from apps.users.password_reset import (
    build_password_reset_url,
    make_uid,
    password_reset_token,
)

REQUEST_URL = reverse("auth:password-reset")
CONFIRM_URL = reverse("auth:password-reset-confirm")
LOGIN_URL = reverse("auth:login")
VALID_PASSWORD = "StrongPass123!"
NEW_PASSWORD = "BrandNewPass456!"


class PasswordResetAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="reset.me@example.com",
            password=VALID_PASSWORD,
            first_name="Reset",
            last_name="Me",
            role=UserRole.CLIENT,
        )

    def test_request_sends_email_for_existing_user(self):
        res = self.client.post(
            REQUEST_URL, {"email": "reset.me@example.com"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Réinitialisation", mail.outbox[0].subject)
        self.assertIn("/reset-password?", mail.outbox[0].body)

    def test_request_unknown_email_still_ok_no_mail(self):
        res = self.client.post(
            REQUEST_URL, {"email": "ghost@example.com"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_confirm_resets_password_and_logs_in(self):
        uid = make_uid(self.user)
        token = password_reset_token.make_token(self.user)
        res = self.client.post(
            CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "password": NEW_PASSWORD,
                "password_confirm": NEW_PASSWORD,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["email"], self.user.email)
        self.assertIn("servis_access", res.cookies)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        self.assertFalse(self.user.check_password(VALID_PASSWORD))

        # Old token must not work again
        res2 = self.client.post(
            CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "password": "AnotherPass789!",
                "password_confirm": "AnotherPass789!",
            },
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

        # Can login with new password
        login = self.client.post(
            LOGIN_URL,
            {"email": self.user.email, "password": NEW_PASSWORD},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_confirm_invalid_token(self):
        res = self.client.post(
            CONFIRM_URL,
            {
                "uid": make_uid(self.user),
                "token": "bogus-token",
                "password": NEW_PASSWORD,
                "password_confirm": NEW_PASSWORD,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(VALID_PASSWORD))

    def test_confirm_password_mismatch(self):
        res = self.client.post(
            CONFIRM_URL,
            {
                "uid": make_uid(self.user),
                "token": password_reset_token.make_token(self.user),
                "password": NEW_PASSWORD,
                "password_confirm": "DifferentPass123!",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_build_reset_url_contains_frontend(self):
        url = build_password_reset_url(self.user)
        self.assertIn("/reset-password?", url)
        self.assertIn("uid=", url)
        self.assertIn("token=", url)
