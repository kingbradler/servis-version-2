"""API tests for authentication endpoints."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.choices import UserRole

User = get_user_model()

REGISTER_URL = reverse("auth:register")
SELLER_REGISTER_URL = reverse("auth:register-seller")
LOGIN_URL = reverse("auth:login")
LOGOUT_URL = reverse("auth:logout")
ME_URL = reverse("auth:me")

VALID_PASSWORD = "SecurePass123!"
VALID_USER_DATA = {
    "email": "client@example.com",
    "password": VALID_PASSWORD,
    "password_confirm": VALID_PASSWORD,
    "first_name": "Ali",
    "last_name": "Benali",
    "phone": "0612345678",
}


class RegisterAPITests(APITestCase):
    """Tests for client and seller registration."""

    def test_client_register_success(self):
        response = self.client.post(REGISTER_URL, VALID_USER_DATA, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "client@example.com")
        self.assertEqual(response.data["role"], UserRole.CLIENT)
        self.assertEqual(response.data["first_name"], "Ali")
        self.assertNotIn("password", response.data)

        user = User.objects.get(email="client@example.com")
        self.assertEqual(user.role, UserRole.CLIENT)
        self.assertTrue(user.check_password(VALID_PASSWORD))

    def test_seller_register_success(self):
        data = {**VALID_USER_DATA, "email": "seller@example.com"}
        response = self.client.post(SELLER_REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], UserRole.SELLER)

        user = User.objects.get(email="seller@example.com")
        self.assertEqual(user.role, UserRole.SELLER)

    def test_register_duplicate_email(self):
        User.objects.create_user(
            email="dup@example.com",
            password=VALID_PASSWORD,
            first_name="Existing",
            last_name="User",
        )

        data = {**VALID_USER_DATA, "email": "dup@example.com"}
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data["fields"])

    def test_register_invalid_email(self):
        data = {**VALID_USER_DATA, "email": "not-an-email"}
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data["fields"])

    def test_register_weak_password(self):
        data = {
            **VALID_USER_DATA,
            "email": "weak@example.com",
            "password": "123",
            "password_confirm": "123",
        }
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data["fields"])

    def test_register_password_mismatch(self):
        data = {
            **VALID_USER_DATA,
            "email": "mismatch@example.com",
            "password_confirm": "DifferentPass123!",
        }
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_confirm", response.data["fields"])

    def test_register_force_admin_role_rejected(self):
        data = {**VALID_USER_DATA, "email": "admin@example.com", "role": UserRole.ADMIN}
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data["fields"])
        self.assertFalse(User.objects.filter(email="admin@example.com").exists())

    def test_register_force_seller_role_on_client_endpoint_rejected(self):
        data = {**VALID_USER_DATA, "email": "fake@example.com", "role": UserRole.SELLER}
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data["fields"])

    def test_register_missing_required_fields(self):
        response = self.client.post(REGISTER_URL, {"email": "partial@example.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        fields = response.data["fields"]
        self.assertIn("password", fields)
        self.assertIn("first_name", fields)
        self.assertIn("last_name", fields)
        self.assertIn("phone", fields)

    def test_register_requires_whatsapp_phone(self):
        data = {**VALID_USER_DATA, "email": "nophone@example.com", "phone": ""}
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data["fields"])
        self.assertFalse(User.objects.filter(email="nophone@example.com").exists())


class LoginAPITests(APITestCase):
    """Tests for login endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="login@example.com",
            password=VALID_PASSWORD,
            first_name="Login",
            last_name="Test",
        )

    def test_login_success(self):
        response = self.client.post(
            LOGIN_URL,
            {"email": "login@example.com", "password": VALID_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "login@example.com")
        self.assertNotIn("password", response.data)

    def test_login_wrong_password(self):
        response = self.client.post(
            LOGIN_URL,
            {"email": "login@example.com", "password": "WrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_nonexistent_user(self):
        response = self.client.post(
            LOGIN_URL,
            {"email": "ghost@example.com", "password": VALID_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_inactive_account(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(
            LOGIN_URL,
            {"email": "login@example.com", "password": VALID_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MeAPITests(APITestCase):
    """Tests for current user endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="me@example.com",
            password=VALID_PASSWORD,
            first_name="Me",
            last_name="User",
            phone="0600000000",
        )

    def test_me_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "me@example.com")
        self.assertEqual(response.data["role"], UserRole.CLIENT)
        self.assertEqual(response.data["first_name"], "Me")
        self.assertIn("id", response.data)
        self.assertIn("is_verified", response.data)
        self.assertIn("created_at", response.data)

    def test_me_unauthenticated(self):
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_never_returns_password(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(ME_URL)

        forbidden_keys = {"password", "password_hash", "is_superuser", "is_staff", "groups"}
        for key in forbidden_keys:
            self.assertNotIn(key, response.data)


class LogoutAPITests(APITestCase):
    """Tests for logout endpoint."""

    def test_logout_authenticated(self):
        user = User.objects.create_user(
            email="logout@example.com",
            password=VALID_PASSWORD,
            first_name="Logout",
            last_name="Test",
        )
        self.client.force_authenticate(user=user)
        response = self.client.post(LOGOUT_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Déconnexion réussie.")

    def test_logout_unauthenticated_returns_401(self):
        response = self.client.post(LOGOUT_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
