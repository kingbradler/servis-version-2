"""JWT authentication via HttpOnly cookies + CSRF enforcement."""

from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from apps.users.cookies import get_access_token_from_request

SAFE_METHODS = ("GET", "HEAD", "OPTIONS", "TRACE")


def enforce_csrf(request) -> None:
    """Enforce CSRF for cookie-authenticated unsafe methods."""
    if request.method in SAFE_METHODS:
        return

    check = CSRFCheck(lambda req: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")


class JWTCookieAuthentication(JWTAuthentication):
    """
    Authenticate using JWT access token stored in an HttpOnly cookie.

    - Tokens are never read from localStorage.
    - CSRF is enforced for unsafe HTTP methods when a cookie is present.
    """

    def authenticate(self, request):
        raw_token = get_access_token_from_request(request)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except (InvalidToken, TokenError) as exc:
            raise exceptions.AuthenticationFailed(
                "Token d'accès invalide ou expiré."
            ) from exc

        user = self.get_user(validated_token)
        enforce_csrf(request)
        return (user, validated_token)

    def authenticate_header(self, request):
        return "Cookie"