"""SERVIS API URL configuration."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "api/schema/",
        SpectacularAPIView.as_view(permission_classes=[AllowAny]),
        name="schema",
    ),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[AllowAny]),
        name="swagger-ui",
    ),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/cities/", include("apps.stores.urls")),
    path("api/v1/categories/", include("apps.categories.urls")),
    path("api/v1/admin/", include("apps.core.admin_urls")),
    path("api/v1/seller/", include("apps.stores.seller_urls")),
    path("api/v1/seller/", include("apps.professionals.seller_urls")),
    path("api/v1/seller/products/", include("apps.products.seller_urls")),
    path("api/v1/seller/services/", include("apps.services.seller_urls")),
    path("api/v1/seller/orders/", include("apps.orders.seller_urls")),
    path("api/v1/seller/orders/", include("apps.payments.seller_order_urls")),
    path(
        "api/v1/seller/payment-methods/",
        include("apps.payments.seller_method_urls"),
    ),
    path("api/v1/stores/", include("apps.stores.store_urls")),
    path("api/v1/professionals/", include("apps.professionals.urls")),
    path("api/v1/products/", include("apps.products.urls")),
    path("api/v1/services/", include("apps.services.urls")),
    path(
        "api/v1/service-requests/",
        include("apps.services.request_urls"),
    ),
    path(
        "api/v1/service-requests/",
        include("apps.payments.service_request_urls"),
    ),
    path(
        "api/v1/seller/service-requests/",
        include("apps.services.seller_request_urls"),
    ),
    path(
        "api/v1/seller/service-requests/",
        include("apps.payments.seller_service_request_urls"),
    ),
    path("api/v1/cart/", include("apps.orders.cart_urls")),
    path("api/v1/orders/", include("apps.orders.urls")),
    path("api/v1/orders/", include("apps.payments.order_urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/billing/", include("apps.billing.urls")),
    path("api/v1/seller/", include("apps.billing.seller_urls")),
    path("api/v1/reviews/", include("apps.reviews.urls")),
    path("api/v1/messaging/", include("apps.messaging.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/disputes/", include("apps.disputes.urls")),
    path("api/v1/seller/", include("apps.disputes.seller_urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
