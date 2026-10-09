"""Seller order URL routes — foundations (read-only)."""

from django.urls import path

from apps.orders.views import (
    SellerOrderCompleteView,
    SellerOrderDetailView,
    SellerOrderListView,
)

app_name = "seller_orders"

urlpatterns = [
    path("", SellerOrderListView.as_view(), name="list"),
    path(
        "<uuid:order_id>/complete/",
        SellerOrderCompleteView.as_view(),
        name="complete",
    ),
    path("<uuid:order_id>/", SellerOrderDetailView.as_view(), name="detail"),
]
