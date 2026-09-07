"""Which purchases can receive a public review."""

from apps.orders.models import OrderStatus
from apps.services.models import ServiceRequestStatus

# Payment confirmed (or later). PENDING/CANCELLED stay blocked.
PRODUCT_REVIEW_ORDER_STATUSES = (
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
)

SERVICE_REVIEW_REQUEST_STATUSES = (
    ServiceRequestStatus.ACCEPTED,
    ServiceRequestStatus.COMPLETED,
)

SELLER_CAN_COMPLETE_FROM = (
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.READY,
)
