"""Auth endpoint rate limits (DRF SimpleRateThrottle)."""

from __future__ import annotations

from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """
    Rate limit public auth endpoints.

    Uses user id when authenticated, otherwise client IP.
    Subclasses must set `scope` (rates in DEFAULT_THROTTLE_RATES).
    """

    scope = None

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginRateThrottle(AuthRateThrottle):
    scope = "auth_login"


class RegisterRateThrottle(AuthRateThrottle):
    scope = "auth_register"


class PasswordResetRateThrottle(AuthRateThrottle):
    scope = "auth_password_reset"


class AuthEmailRateThrottle(AuthRateThrottle):
    """Resend verification / similar email-sending endpoints."""

    scope = "auth_email"
