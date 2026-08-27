"""Permission and access-control tests."""

from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate

from apps.users.choices import UserRole
from apps.users.permissions import (
    IsAdminRole,
    IsAuthenticatedUser,
    IsClient,
    IsSeller,
    IsSellerOrAdmin,
    IsStoreOwner,
)
from apps.users.tokens import issue_tokens_for_user
from apps.users.cookies import ACCESS_COOKIE

User = get_user_model()

VALID_PASSWORD = "SecurePass123!"

ME_URL = reverse("auth:me")
LOGOUT_URL = reverse("auth:logout")
REGISTER_URL = reverse("auth:register")
ACCESS_AUTH = reverse("auth:access-authenticated")
ACCESS_CLIENT = reverse("auth:access-client")
ACCESS_SELLER = reverse("auth:access-seller")
ACCESS_ADMIN = reverse("auth:access-admin")
ACCESS_SELLER_OR_ADMIN = reverse("auth:access-seller-or-admin")


def create_user(*, email: str, role: str, **extra):
    return User.objects.create_user(
        email=email,
        password=VALID_PASSWORD,
        first_name=extra.pop("first_name", "Test"),
        last_name=extra.pop("last_name", "User"),
        role=role,
        **extra,
    )


class AnonymousAccessTests(APITestCase):
    def test_anonymous_me_returns_401(self):
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_logout_returns_401(self):
        response = self.client.post(LOGOUT_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_seller_access_returns_401(self):
        response = self.client.get(ACCESS_SELLER)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_admin_access_returns_401(self):
        response = self.client.get(ACCESS_ADMIN)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ClientPermissionTests(APITestCase):
    def setUp(self):
        self.user = create_user(email="client@example.com", role=UserRole.CLIENT)
        self.client.force_authenticate(user=self.user)

    def test_client_authenticated_access_allowed(self):
        response = self.client.get(ACCESS_AUTH)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_client_client_access_allowed(self):
        response = self.client.get(ACCESS_CLIENT)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_client_seller_access_forbidden(self):
        response = self.client.get(ACCESS_SELLER)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_client_admin_access_forbidden(self):
        response = self.client.get(ACCESS_ADMIN)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_client_seller_or_admin_forbidden(self):
        response = self.client.get(ACCESS_SELLER_OR_ADMIN)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SellerPermissionTests(APITestCase):
    def setUp(self):
        self.user = create_user(email="seller@example.com", role=UserRole.SELLER)
        self.client.force_authenticate(user=self.user)

    def test_seller_authenticated_access_allowed(self):
        response = self.client.get(ACCESS_AUTH)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_seller_seller_access_allowed(self):
        response = self.client.get(ACCESS_SELLER)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_seller_seller_or_admin_allowed(self):
        response = self.client.get(ACCESS_SELLER_OR_ADMIN)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_seller_admin_access_forbidden(self):
        response = self.client.get(ACCESS_ADMIN)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_client_access_forbidden(self):
        response = self.client.get(ACCESS_CLIENT)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminPermissionTests(APITestCase):
    def setUp(self):
        self.user = create_user(email="admin@example.com", role=UserRole.ADMIN)
        self.client.force_authenticate(user=self.user)

    def test_admin_authenticated_access_allowed(self):
        response = self.client.get(ACCESS_AUTH)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_admin_access_allowed(self):
        response = self.client.get(ACCESS_ADMIN)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_seller_or_admin_allowed(self):
        response = self.client.get(ACCESS_SELLER_OR_ADMIN)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_seller_only_forbidden(self):
        """Strict IsSeller rejects ADMIN (role must be SELLER)."""
        response = self.client.get(ACCESS_SELLER)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_is_staff_alone_does_not_grant_admin_role(self):
        staff_only = create_user(
            email="staff@example.com",
            role=UserRole.CLIENT,
        )
        staff_only.is_staff = True
        staff_only.save(update_fields=["is_staff"])
        self.client.force_authenticate(user=staff_only)
        response = self.client.get(ACCESS_ADMIN)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class RoleManipulationTests(APITestCase):
    def test_register_cannot_force_admin_role(self):
        response = self.client.post(
            REGISTER_URL,
            {
                "email": "hacker@example.com",
                "password": VALID_PASSWORD,
                "password_confirm": VALID_PASSWORD,
                "first_name": "Hack",
                "last_name": "Er",
                "phone": "+212612345678",
                "role": UserRole.ADMIN,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="hacker@example.com").exists())

    def test_register_cannot_force_seller_role(self):
        response = self.client.post(
            REGISTER_URL,
            {
                "email": "fakeseller@example.com",
                "password": VALID_PASSWORD,
                "password_confirm": VALID_PASSWORD,
                "first_name": "Fake",
                "last_name": "Seller",
                "phone": "+212612345678",
                "role": UserRole.SELLER,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="fakeseller@example.com").exists())


class MeIsolationTests(APITestCase):
    def setUp(self):
        self.client1 = create_user(email="client1@example.com", role=UserRole.CLIENT, first_name="C1")
        self.client2 = create_user(email="client2@example.com", role=UserRole.CLIENT, first_name="C2")

    def test_me_returns_only_authenticated_user(self):
        self.client.force_authenticate(user=self.client1)
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "client1@example.com")
        self.assertEqual(response.data["id"], str(self.client1.id))

    def test_me_ignores_user_id_query_param(self):
        self.client.force_authenticate(user=self.client1)
        response = self.client.get(ME_URL, {"user_id": str(self.client2.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "client1@example.com")
        self.assertNotEqual(response.data["id"], str(self.client2.id))

    def test_me_with_jwt_cookie_not_another_user(self):
        access, _ = issue_tokens_for_user(self.client1)
        self.client.cookies[ACCESS_COOKIE] = access
        response = self.client.get(ME_URL, {"user_id": str(self.client2.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "client1@example.com")


class ImpersonationPreventionTests(APITestCase):
    def setUp(self):
        self.client1 = create_user(email="imp.client1@example.com", role=UserRole.CLIENT)
        self.client2 = create_user(email="imp.client2@example.com", role=UserRole.CLIENT)
        self.seller1 = create_user(email="imp.seller1@example.com", role=UserRole.SELLER)
        self.seller2 = create_user(email="imp.seller2@example.com", role=UserRole.SELLER)
        self.admin1 = create_user(email="imp.admin1@example.com", role=UserRole.ADMIN)

    def test_users_are_distinct(self):
        ids = {
            self.client1.id,
            self.client2.id,
            self.seller1.id,
            self.seller2.id,
            self.admin1.id,
        }
        self.assertEqual(len(ids), 5)

    def test_client1_cannot_see_client2_via_me(self):
        self.client.force_authenticate(user=self.client1)
        response = self.client.get(ME_URL, {"id": str(self.client2.id)})
        self.assertEqual(response.data["email"], self.client1.email)

    def test_seller1_cannot_use_seller2_identity(self):
        self.client.force_authenticate(user=self.seller1)
        response = self.client.get(ACCESS_SELLER)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], UserRole.SELLER)
        # Response identity must match authenticated seller1
        self.client.force_authenticate(user=self.seller2)
        response2 = self.client.get(ME_URL)
        self.assertEqual(response2.data["email"], self.seller2.email)
        self.assertNotEqual(response2.data["email"], self.seller1.email)


class IsStoreOwnerUnitTests(APITestCase):
    """Unit tests for future store isolation (no Store model yet)."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.owner = create_user(email="owner@example.com", role=UserRole.SELLER)
        self.other = create_user(email="other@example.com", role=UserRole.SELLER)
        self.admin = create_user(email="owner.admin@example.com", role=UserRole.ADMIN)
        self.permission = IsStoreOwner()

    def _request(self, user):
        request = self.factory.get("/")
        force_authenticate(request, user=user)
        # force_authenticate sets request.user on DRF Request wrapper in views;
        # for unit tests, set user directly on Django request
        request.user = user
        return request

    def test_owner_via_owner_attribute(self):
        obj = SimpleNamespace(owner=self.owner)
        self.assertTrue(
            self.permission.has_object_permission(self._request(self.owner), None, obj)
        )
        self.assertFalse(
            self.permission.has_object_permission(self._request(self.other), None, obj)
        )

    def test_owner_via_store_owner(self):
        store = SimpleNamespace(owner=self.owner)
        obj = SimpleNamespace(store=store)
        self.assertTrue(
            self.permission.has_object_permission(self._request(self.owner), None, obj)
        )
        self.assertFalse(
            self.permission.has_object_permission(self._request(self.other), None, obj)
        )

    def test_admin_bypasses_ownership(self):
        obj = SimpleNamespace(owner=self.owner)
        self.assertTrue(
            self.permission.has_object_permission(self._request(self.admin), None, obj)
        )


class PermissionClassUnitTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.client_user = create_user(email="pc.client@example.com", role=UserRole.CLIENT)
        self.seller_user = create_user(email="pc.seller@example.com", role=UserRole.SELLER)
        self.admin_user = create_user(email="pc.admin@example.com", role=UserRole.ADMIN)

    def _req(self, user=None):
        request = self.factory.get("/")
        if user is not None:
            request.user = user
        else:
            from django.contrib.auth.models import AnonymousUser

            request.user = AnonymousUser()
        return request

    def test_is_authenticated_user(self):
        perm = IsAuthenticatedUser()
        self.assertFalse(perm.has_permission(self._req(None), None))
        self.assertTrue(perm.has_permission(self._req(self.client_user), None))

    def test_role_permissions(self):
        self.assertTrue(IsClient().has_permission(self._req(self.client_user), None))
        self.assertFalse(IsClient().has_permission(self._req(self.seller_user), None))
        self.assertTrue(IsSeller().has_permission(self._req(self.seller_user), None))
        self.assertFalse(IsSeller().has_permission(self._req(self.admin_user), None))
        self.assertTrue(IsAdminRole().has_permission(self._req(self.admin_user), None))
        self.assertTrue(IsSellerOrAdmin().has_permission(self._req(self.seller_user), None))
        self.assertTrue(IsSellerOrAdmin().has_permission(self._req(self.admin_user), None))
        self.assertFalse(IsSellerOrAdmin().has_permission(self._req(self.client_user), None))
