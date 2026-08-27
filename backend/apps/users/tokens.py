"""JWT token creation helpers."""

from rest_framework_simplejwt.tokens import RefreshToken


def issue_tokens_for_user(user) -> tuple[str, str]:
    """Return (access, refresh) token strings for a user."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)
