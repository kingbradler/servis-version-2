"""Seller payment-method URL routes."""

from django.urls import path

from apps.payments.views import (
    SellerPaymentMethodDetailView,
    SellerPaymentMethodListCreateView,
)

app_name = "seller_payment_methods"

urlpatterns = [
    path("", SellerPaymentMethodListCreateView.as_view(), name="list-create"),
    path("<uuid:method_id>/", SellerPaymentMethodDetailView.as_view(), name="detail"),
]
