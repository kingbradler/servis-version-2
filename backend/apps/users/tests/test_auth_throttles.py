"""Auth rate-limit tests."""

from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import SimpleRateThrottle

from apps.users.choices import UserRole
from apps.users.models import User

LOGIN_URL = reverse("auth:login")
RESET_URL = reverse("auth:password-reset")
VALID_PASSWORD = "StrongPass123!"

_THROTTLE_RATES = {
    "auth_login": "3/min",
    "auth_register": "10/hour",
    "auth_password_reset": "2/hour",
    "auth_email": "5/hour",
}


class AuthThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        # DRF copies DEFAULT_THROTTLE_RATES onto the class at import time
        self._prev_rates = SimpleRateThrottle.THROTTLE_RATES
        SimpleRateThrottle.THROTTLE_RATES = {
            **(self._prev_rates or {}),
            **_THROTTLE_RATES,
        }
        self.user = User.objects.create_user(
            email="throttle@example.com",
            password=VALID_PASSWORD,
            first_name="T",
            last_name="H",
            role=UserRole.CLIENT,
        )

    def tearDown(self):
        SimpleRateThrottle.THROTTLE_RATES = self._prev_rates
        cache.clear()

    def test_login_throttled_after_limit(self):
        payload = {"email": "throttle@example.com", "password": "WrongPass999!"}
        for _ in range(3):
            res = self.client.post(LOGIN_URL, payload, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        blocked = self.client.post(LOGIN_URL, payload, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_password_reset_throttled(self):
        for _ in range(2):
            res = self.client.post(
                RESET_URL, {"email": "throttle@example.com"}, format="json"
            )
            self.assertEqual(res.status_code, status.HTTP_200_OK)

        blocked = self.client.post(
            RESET_URL, {"email": "throttle@example.com"}, format="json"
        )
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
