"""Tests for PATCH /auth/me/ profile update."""

from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.choices import UserRole

User = get_user_model()
ME_URL = reverse("auth:me")
AVATAR_URL = reverse("auth:me-avatar")
PASSWORD = "SecurePass123!"


def make_jpeg():
    buf = BytesIO()
    Image.new("RGB", (32, 32), (20, 90, 140)).save(buf, format="JPEG")
    return SimpleUploadedFile("photo.jpg", buf.getvalue(), content_type="image/jpeg")


class MeUpdateAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patch.me@example.com",
            password=PASSWORD,
            first_name="Old",
            last_name="Name",
            phone="0611111111",
            role=UserRole.CLIENT,
        )

    def test_patch_me_updates_profile_fields(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            ME_URL,
            {
                "first_name": "New",
                "last_name": "Person",
                "phone": "+212612345678",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "New")
        self.assertEqual(response.data["last_name"], "Person")
        self.assertEqual(response.data["phone"], "+212612345678")
        self.assertEqual(response.data["email"], "patch.me@example.com")
        self.assertEqual(response.data["role"], UserRole.CLIENT)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "New")

    def test_patch_me_rejects_avatar_url(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            ME_URL,
            {"avatar": "https://cdn.example.com/a.png"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_me_rejects_role_and_email(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            ME_URL,
            {"role": UserRole.ADMIN, "email": "hacker@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, UserRole.CLIENT)
        self.assertEqual(self.user.email, "patch.me@example.com")

    def test_patch_me_unauthenticated(self):
        response = self.client.patch(
            ME_URL, {"first_name": "X"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_me_invalid_phone(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            ME_URL, {"phone": "12"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_avatar_from_gallery(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            AVATAR_URL, {"image": make_jpeg()}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["avatar"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.avatar)

    def test_delete_avatar(self):
        self.user.avatar = "https://cdn.example.com/old.jpg"
        self.user.save(update_fields=["avatar"])
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(AVATAR_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["avatar"], "")
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar, "")

    def test_upload_avatar_unauthenticated(self):
        response = self.client.post(
            AVATAR_URL, {"image": make_jpeg()}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

