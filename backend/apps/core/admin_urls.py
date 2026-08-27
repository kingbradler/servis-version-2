"""Admin API URL aggregation for catalog resources."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.categories.urls import admin_router as categories_admin_router
from apps.core.hero_views import AdminHeroSlideDetailView, AdminHeroSlideListCreateView
from apps.core.stats_views import AdminStatsView
from apps.disputes.views import AdminDisputeListView, AdminDisputeResolveView
from apps.orders.views import AdminOrderDetailView, AdminOrderListView
from apps.payments.views import AdminPaymentDetailView, AdminPaymentListView
from apps.products.views import ProductAdminViewSet
from apps.professionals.views import ProfessionalAdminViewSet
from apps.services.request_views import (
    AdminServiceRequestDetailView,
    AdminServiceRequestListView,
)
from apps.services.views import ServiceAdminViewSet
from apps.stores.store_views import StoreAdminViewSet
from apps.stores.urls import admin_router as cities_admin_router
from apps.users.admin_views import AdminUserDetailView, AdminUserListView

stores_admin_router = DefaultRouter()
stores_admin_router.register("stores", StoreAdminViewSet, basename="admin-store")

products_admin_router = DefaultRouter()
products_admin_router.register("products", ProductAdminViewSet, basename="admin-product")

professionals_admin_router = DefaultRouter()
professionals_admin_router.register(
    "professionals",
    ProfessionalAdminViewSet,
    basename="admin-professional",
)

services_admin_router = DefaultRouter()
services_admin_router.register("services", ServiceAdminViewSet, basename="admin-service")

urlpatterns = [
    path("cities/", include(cities_admin_router.urls)),
    path("categories/", include(categories_admin_router.urls)),
    path("", include(stores_admin_router.urls)),
    path("", include(products_admin_router.urls)),
    path("", include(professionals_admin_router.urls)),
    path("", include(services_admin_router.urls)),
    path("orders/", AdminOrderListView.as_view(), name="admin-order-list"),
    path(
        "orders/<uuid:order_id>/",
        AdminOrderDetailView.as_view(),
        name="admin-order-detail",
    ),
    path("payments/", AdminPaymentListView.as_view(), name="admin-payment-list"),
    path(
        "payments/<uuid:payment_id>/",
        AdminPaymentDetailView.as_view(),
        name="admin-payment-detail",
    ),
    path("users/", AdminUserListView.as_view(), name="admin-user-list"),
    path(
        "users/<uuid:user_id>/",
        AdminUserDetailView.as_view(),
        name="admin-user-detail",
    ),
    path("stats/", AdminStatsView.as_view(), name="admin-stats"),
    path(
        "hero-slides/",
        AdminHeroSlideListCreateView.as_view(),
        name="admin-hero-slide-list",
    ),
    path(
        "hero-slides/<uuid:slide_id>/",
        AdminHeroSlideDetailView.as_view(),
        name="admin-hero-slide-detail",
    ),
    path(
        "service-requests/",
        AdminServiceRequestListView.as_view(),
        name="admin-service-request-list",
    ),
    path(
        "service-requests/<uuid:request_id>/",
        AdminServiceRequestDetailView.as_view(),
        name="admin-service-request-detail",
    ),
    path("disputes/", AdminDisputeListView.as_view(), name="admin-dispute-list"),
    path(
        "disputes/<uuid:dispute_id>/resolve/",
        AdminDisputeResolveView.as_view(),
        name="admin-dispute-resolve",
    ),
    path("", include("apps.billing.admin_urls")),
]
