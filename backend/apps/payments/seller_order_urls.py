"""Seller order payment routes."""

from django.urls import path

from apps.payments.views import (
    SellerOrderPaymentConfirmView,
    SellerOrderPaymentRejectView,
    SellerOrderPaymentView,
)

app_name = "seller_order_payments"

urlpatterns = [
    path(
        "<uuid:order_id>/payment/",
        SellerOrderPaymentView.as_view(),
        name="detail",
    ),
    path(
        "<uuid:order_id>/payment/confirm/",
        SellerOrderPaymentConfirmView.as_view(),
        name="confirm",
    ),
    path(
        "<uuid:order_id>/payment/reject/",
        SellerOrderPaymentRejectView.as_view(),
        name="reject",
    ),
]
