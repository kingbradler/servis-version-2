"""Email verification API tests."""

from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.email_verification import (
    build_verification_url,
    email_verification_token,
    make_uid,
)
from apps.users.models import User
from apps.users.choices import UserRole

REGISTER_URL = reverse("auth:register")
VERIFY_URL = reverse("auth:verify-email")
RESEND_URL = reverse("auth:resend-verification")
VALID_PASSWORD = "StrongPass123!"


class EmailVerificationAPITests(APITestCase):
    def test_register_sends_verification_email(self):
        res = self.client.post(
            REGISTER_URL,
            {
                "email": "new.user@example.com",
                "password": VALID_PASSWORD,
                "password_confirm": VALID_PASSWORD,
                "first_name": "New",
                "last_name": "User",
                "phone": "+212612345678",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(res.data["is_verified"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Confirmez", mail.outbox[0].subject)
        self.assertIn("/verify-email?", mail.outbox[0].body)

    def test_verify_email_success(self):
        user = User.objects.create_user(
            email="verify.me@example.com",
            password=VALID_PASSWORD,
            first_name="V",
            last_name="M",
            role=UserRole.CLIENT,
        )
        self.assertFalse(user.is_verified)
        uid = make_uid(user)
        token = email_verification_token.make_token(user)
        res = self.client.post(
            VERIFY_URL, {"uid": uid, "token": token}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_verified)
        self.assertTrue(res.data["is_verified"])

    def test_verify_invalid_token(self):
        user = User.objects.create_user(
            email="bad.token@example.com",
            password=VALID_PASSWORD,
            first_name="B",
            last_name="T",
            role=UserRole.CLIENT,
        )
        res = self.client.post(
            VERIFY_URL,
            {"uid": make_uid(user), "token": "not-a-valid-token"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertFalse(user.is_verified)

    def test_resend_verification(self):
        user = User.objects.create_user(
            email="resend@example.com",
            password=VALID_PASSWORD,
            first_name="R",
            last_name="S",
            role=UserRole.CLIENT,
        )
        res = self.client.post(
            RESEND_URL, {"email": "resend@example.com"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(user.email, mail.outbox[0].to)

    def test_build_verification_url_contains_frontend(self):
        user = User.objects.create_user(
            email="link@example.com",
            password=VALID_PASSWORD,
            first_name="L",
            last_name="K",
            role=UserRole.CLIENT,
        )
        url = build_verification_url(user)
        self.assertIn("/verify-email?", url)
        self.assertIn("uid=", url)
        self.assertIn("token=", url)
