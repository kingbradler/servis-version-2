"""Dashboard statistics endpoints — seller & admin."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order, OrderStatus
from apps.payments.models import Payment, PaymentStatus
from apps.products.models import Product, ProductStatus
from apps.services.models import ServiceRequest, ServiceRequestStatus
from apps.stores.models import Store, StoreStatus
from apps.users.choices import UserRole
from apps.users.permissions import IsAdminRole, IsSeller

User = get_user_model()

PERIOD_DAYS = {"30d": 30, "90d": 90, "all": None}


class SellerStatsView(APIView):
    """Aggregated counts for the authenticated seller's store."""

    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Stats"], summary="Statistiques vendeur")
    def get(self, request):
        try:
            store = Store.objects.get(owner=request.user)
        except Store.DoesNotExist:
            return Response(
                {
                    "store": None,
                    "products_count": 0,
                    "products_active": 0,
                    "orders_count": 0,
                    "orders_pending": 0,
                    "payments_proof_submitted": 0,
                    "payments_confirmed": 0,
                }
            )

        products = Product.objects.filter(store=store)
        orders = Order.objects.filter(store=store)
        payments = Payment.objects.filter(order__store=store)

        return Response(
            {
                "store": {
                    "id": str(store.id),
                    "name": store.name,
                    "slug": store.slug,
                    "status": store.status,
                },
                "products_count": products.count(),
                "products_active": products.filter(status=ProductStatus.ACTIVE).count(),
                "orders_count": orders.count(),
                "orders_pending": orders.filter(status=OrderStatus.PENDING).count(),
                "payments_proof_submitted": payments.filter(
                    status=PaymentStatus.PROOF_SUBMITTED
                ).count(),
                "payments_confirmed": payments.filter(
                    status=PaymentStatus.CONFIRMED
                ).count(),
            }
        )


class SellerAdvancedStatsView(APIView):
    """
    Premium analytics for sellers with Plan.advanced_stats (Boutique Pro
    and/or Services Pro).
    """

    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Stats"],
        summary="Statistiques avancées (abonnement Pro)",
        parameters=[
            OpenApiParameter(
                name="period",
                type=str,
                location=OpenApiParameter.QUERY,
                description="30d | 90d | all",
                required=False,
            )
        ],
    )
    def get(self, request):
        from apps.billing.services import (
            get_service_entitlements,
            get_store_entitlements,
        )

        store_ent = get_store_entitlements(request.user)
        service_ent = get_service_entitlements(request.user)
        if not (store_ent.advanced_stats or service_ent.advanced_stats):
            return Response(
                {
                    "detail": (
                        "Les statistiques avancées nécessitent un abonnement "
                        "Pro (boutique ou services)."
                    ),
                    "error_code": "advanced_stats_required",
                    "upgrade_url": "/seller/subscription",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        period_key = (request.query_params.get("period") or "30d").lower()
        if period_key not in PERIOD_DAYS:
            period_key = "30d"
        days = PERIOD_DAYS[period_key]
        now = timezone.now()
        since = now - timedelta(days=days) if days else None

        user = request.user
        payments = Payment.objects.filter(
            Q(order__store__owner=user)
            | Q(service_request__professional__owner=user)
        )
        orders = Order.objects.filter(store__owner=user)
        products = Product.objects.filter(store__owner=user)
        requests = ServiceRequest.objects.filter(professional__owner=user)

        if since is not None:
            payments_period = payments.filter(created_at__gte=since)
            orders_period = orders.filter(created_at__gte=since)
            requests_period = requests.filter(created_at__gte=since)
        else:
            payments_period = payments
            orders_period = orders
            requests_period = requests

        confirmed = payments_period.filter(status=PaymentStatus.CONFIRMED)
        revenue = confirmed.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        order_confirmed = confirmed.filter(order__isnull=False)
        avg_order = order_confirmed.aggregate(avg=Avg("amount"))["avg"]
        confirmed_order_count = order_confirmed.count()

        products_active = products.filter(status=ProductStatus.ACTIVE).count()
        orders_count = orders_period.count()
        orders_completed = orders_period.filter(
            status=OrderStatus.COMPLETED
        ).count()
        sr_count = requests_period.count()
        sr_completed = requests_period.filter(
            status=ServiceRequestStatus.COMPLETED
        ).count()
        proof_pending = payments_period.filter(
            status=PaymentStatus.PROOF_SUBMITTED
        ).count()

        return Response(
            {
                "period": period_key,
                "currency": "MAD",
                "revenue_confirmed": str(revenue.quantize(Decimal("0.01"))),
                "orders_count": orders_count,
                "orders_completed": orders_completed,
                "avg_order_value": (
                    str(Decimal(avg_order).quantize(Decimal("0.01")))
                    if avg_order is not None
                    else None
                ),
                "confirmed_order_payments": confirmed_order_count,
                "payments_proof_submitted": proof_pending,
                "service_requests_count": sr_count,
                "service_requests_completed": sr_completed,
                "products_active": products_active,
            }
        )


class AdminStatsView(APIView):
    """Platform-wide aggregated counts for admins."""

    permission_classes = [IsAdminRole]

    @extend_schema(tags=["Admin — Stats"], summary="Statistiques admin")
    def get(self, request):
        users_by_role = {
            row["role"]: row["c"]
            for row in User.objects.values("role").annotate(c=Count("id"))
        }
        stores_by_status = {
            row["status"]: row["c"]
            for row in Store.objects.values("status").annotate(c=Count("id"))
        }
        products_by_status = {
            row["status"]: row["c"]
            for row in Product.objects.values("status").annotate(c=Count("id"))
        }
        payments_by_status = {
            row["status"]: row["c"]
            for row in Payment.objects.values("status").annotate(c=Count("id"))
        }

        return Response(
            {
                "users_count": User.objects.count(),
                "users_active": User.objects.filter(is_active=True).count(),
                "users_by_role": {
                    "CLIENT": users_by_role.get(UserRole.CLIENT, 0),
                    "SELLER": users_by_role.get(UserRole.SELLER, 0),
                    "ADMIN": users_by_role.get(UserRole.ADMIN, 0),
                },
                "stores_count": Store.objects.count(),
                "stores_by_status": {
                    "DRAFT": stores_by_status.get(StoreStatus.DRAFT, 0),
                    "PENDING": stores_by_status.get(StoreStatus.PENDING, 0),
                    "ACTIVE": stores_by_status.get(StoreStatus.ACTIVE, 0),
                    "SUSPENDED": stores_by_status.get(StoreStatus.SUSPENDED, 0),
                },
                "products_count": Product.objects.count(),
                "products_active": products_by_status.get(ProductStatus.ACTIVE, 0),
                "orders_count": Order.objects.count(),
                "orders_pending": Order.objects.filter(
                    status=OrderStatus.PENDING
                ).count(),
                "payments_count": Payment.objects.count(),
                "payments_proof_submitted": payments_by_status.get(
                    PaymentStatus.PROOF_SUBMITTED, 0
                ),
                "payments_confirmed": payments_by_status.get(
                    PaymentStatus.CONFIRMED, 0
                ),
            }
        )
