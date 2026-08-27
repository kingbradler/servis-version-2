"""Tests for the User model and manager."""

from django.db import IntegrityError
from django.test import TestCase

from apps.users.choices import UserRole
from apps.users.models import User


class UserModelTests(TestCase):
    """Tests for User model creation and role helpers."""

    def test_create_user_with_email(self):
        user = User.objects.create_user(
            email="client@example.com",
            password="securepass123",
            first_name="Ali",
            last_name="Benali",
        )

        self.assertEqual(user.email, "client@example.com")
        self.assertEqual(user.role, UserRole.CLIENT)
        self.assertTrue(user.check_password("securepass123"))
        self.assertFalse(user.is_verified)
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_client)
        self.assertFalse(user.is_seller)
        self.assertFalse(user.is_admin_role)

    def test_create_user_normalizes_email(self):
        user = User.objects.create_user(
            email="Test@Example.COM",
            password="securepass123",
            first_name="Test",
            last_name="User",
        )
        self.assertEqual(user.email, "Test@example.com")

    def test_create_user_without_email_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="securepass123")

    def test_create_seller_user(self):
        user = User.objects.create_user(
            email="seller@example.com",
            password="securepass123",
            first_name="Sara",
            last_name="Idrissi",
            role=UserRole.SELLER,
        )

        self.assertEqual(user.role, UserRole.SELLER)
        self.assertTrue(user.is_seller)
        self.assertFalse(user.is_client)

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email="admin@servis.ma",
            password="adminpass123",
            first_name="Admin",
            last_name="SERVIS",
        )

        self.assertEqual(admin.role, UserRole.ADMIN)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_verified)
        self.assertTrue(admin.is_admin_role)

    def test_email_must_be_unique(self):
        User.objects.create_user(
            email="dup@example.com",
            password="securepass123",
            first_name="First",
            last_name="User",
        )

        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                email="dup@example.com",
                password="otherpass123",
                first_name="Second",
                last_name="User",
            )

    def test_full_name_property(self):
        user = User.objects.create_user(
            email="name@example.com",
            password="securepass123",
            first_name="Youssef",
            last_name="Alami",
        )
        self.assertEqual(user.full_name, "Youssef Alami")

    def test_mark_email_verified(self):
        user = User.objects.create_user(
            email="verify@example.com",
            password="securepass123",
            first_name="Verify",
            last_name="Test",
        )

        self.assertFalse(user.is_verified)
        self.assertIsNone(user.email_verified_at)

        user.mark_email_verified()
        user.refresh_from_db()

        self.assertTrue(user.is_verified)
        self.assertIsNotNone(user.email_verified_at)

    def test_str_returns_email(self):
        user = User.objects.create_user(
            email="str@example.com",
            password="securepass123",
            first_name="Str",
            last_name="Test",
        )
        self.assertEqual(str(user), "str@example.com")
