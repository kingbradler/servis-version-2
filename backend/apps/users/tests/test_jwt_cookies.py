"""API tests for JWT HttpOnly cookie authentication."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from apps.users.cookies import ACCESS_COOKIE, REFRESH_COOKIE
from apps.users.tokens import issue_tokens_for_user

User = get_user_model()

LOGIN_URL = reverse("auth:login")
LOGOUT_URL = reverse("auth:logout")
ME_URL = reverse("auth:me")
REFRESH_URL = reverse("auth:refresh")
CSRF_URL = reverse("auth:csrf")
REGISTER_URL = reverse("auth:register")

VALID_PASSWORD = "SecurePass123!"


def csrf_header(client) -> dict:
    """Obtain CSRF cookie + return header for mutating requests."""
    resp = client.get(CSRF_URL)
    return {"HTTP_X_CSRFTOKEN": resp.data["csrfToken"]}


class JWTCookieAuthTests(APITestCase):
    """JWT cookies issued on login/register, used for /me, refreshed and cleared."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="jwt@example.com",
            password=VALID_PASSWORD,
            first_name="Jwt",
            last_name="User",
        )

    def test_login_sets_httponly_jwt_cookies(self):
        response = self.client.post(
            LOGIN_URL,
            {"email": "jwt@example.com", "password": VALID_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(ACCESS_COOKIE, response.cookies)
        self.assertIn(REFRESH_COOKIE, response.cookies)

        access_cookie = response.cookies[ACCESS_COOKIE]
        self.assertTrue(access_cookie["httponly"])
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertNotIn("token", response.data)

    def test_register_sets_jwt_cookies(self):
        response = self.client.post(
            REGISTER_URL,
            {
                "email": "newjwt@example.com",
                "password": VALID_PASSWORD,
                "password_confirm": VALID_PASSWORD,
                "first_name": "New",
                "last_name": "Jwt",
                "phone": "+212612345678",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn(ACCESS_COOKIE, response.cookies)
        self.assertIn(REFRESH_COOKIE, response.cookies)

    def test_me_with_access_cookie(self):
        access, refresh = issue_tokens_for_user(self.user)
        self.client.cookies[ACCESS_COOKIE] = access
        self.client.cookies[REFRESH_COOKIE] = refresh

        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "jwt@example.com")

    def test_me_without_cookie_returns_401(self):
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_rotates_cookies(self):
        access, refresh = issue_tokens_for_user(self.user)
        self.client.cookies[REFRESH_COOKIE] = refresh
        headers = csrf_header(self.client)

        response = self.client.post(REFRESH_URL, {}, format="json", **headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(ACCESS_COOKIE, response.cookies)
        self.assertIn(REFRESH_COOKIE, response.cookies)
        self.assertTrue(BlacklistedToken.objects.exists())

    def test_refresh_without_cookie_returns_401(self):
        response = self.client.post(REFRESH_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_clears_cookies_and_blacklists_refresh(self):
        access, refresh = issue_tokens_for_user(self.user)
        self.client.cookies[ACCESS_COOKIE] = access
        self.client.cookies[REFRESH_COOKIE] = refresh
        headers = csrf_header(self.client)

        response = self.client.post(LOGOUT_URL, {}, format="json", **headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.cookies[ACCESS_COOKIE].value, "")
        self.assertEqual(response.cookies[REFRESH_COOKIE].value, "")
        self.assertTrue(BlacklistedToken.objects.exists())

    def test_logout_without_auth_returns_401(self):
        response = self.client.post(LOGOUT_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_csrf_endpoint_sets_cookie(self):
        response = self.client.get(CSRF_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("csrfToken", response.data)
        self.assertTrue(response.data["csrfToken"])

    def test_mutating_request_with_cookie_requires_csrf(self):
        """When auth cookies are present, logout without CSRF is rejected."""
        access, refresh = issue_tokens_for_user(self.user)
        client = APIClient(enforce_csrf_checks=True)
        client.cookies[ACCESS_COOKIE] = access
        client.cookies[REFRESH_COOKIE] = refresh

        response = client.post(LOGOUT_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        csrf_resp = client.get(CSRF_URL)
        csrf_token = csrf_resp.data["csrfToken"]
        response = client.post(
            LOGOUT_URL,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
