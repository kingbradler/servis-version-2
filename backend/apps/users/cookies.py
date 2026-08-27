"""JWT cookie helpers — tokens never exposed to JavaScript (HttpOnly)."""

from django.conf import settings


ACCESS_COOKIE = getattr(settings, "JWT_ACCESS_COOKIE_NAME", "servis_access")
REFRESH_COOKIE = getattr(settings, "JWT_REFRESH_COOKIE_NAME", "servis_refresh")


def _cookie_common_kwargs() -> dict:
    return {
        "httponly": True,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "domain": settings.JWT_COOKIE_DOMAIN or None,
        "path": "/",
    }


def set_jwt_cookies(response, access_token: str, refresh_token: str) -> None:
    """Attach access and refresh JWT as HttpOnly cookies."""
    common = _cookie_common_kwargs()

    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        **common,
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        **common,
    )


def clear_jwt_cookies(response) -> None:
    """Remove JWT cookies (logout / invalidation)."""
    common = _cookie_common_kwargs()
    response.delete_cookie(ACCESS_COOKIE, path="/", domain=common["domain"], samesite=common["samesite"])
    response.delete_cookie(REFRESH_COOKIE, path="/", domain=common["domain"], samesite=common["samesite"])


def get_access_token_from_request(request) -> str | None:
    return request.COOKIES.get(ACCESS_COOKIE)


def get_refresh_token_from_request(request) -> str | None:
    return request.COOKIES.get(REFRESH_COOKIE)
