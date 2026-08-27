"""Custom DRF exception handler."""

from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """Normalize API error responses."""
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "detail": response.data.get("detail", response.data),
            "code": getattr(exc, "default_code", "error"),
            "fields": {
                key: value
                for key, value in response.data.items()
                if key != "detail"
            }
            or None,
        }

    return response
