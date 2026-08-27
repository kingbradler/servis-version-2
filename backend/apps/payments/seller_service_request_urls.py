"""Seller service-request payment routes."""

from django.urls import path

from apps.payments.views import (
    SellerServiceRequestPaymentConfirmView,
    SellerServiceRequestPaymentRejectView,
    SellerServiceRequestPaymentView,
)

urlpatterns = [
    path(
        "<uuid:request_id>/payment/",
        SellerServiceRequestPaymentView.as_view(),
        name="seller-service-request-payment",
    ),
    path(
        "<uuid:request_id>/payment/confirm/",
        SellerServiceRequestPaymentConfirmView.as_view(),
        name="seller-service-request-payment-confirm",
    ),
    path(
        "<uuid:request_id>/payment/reject/",
        SellerServiceRequestPaymentRejectView.as_view(),
        name="seller-service-request-payment-reject",
    ),
]
