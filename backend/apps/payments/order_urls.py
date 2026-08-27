"""Client order-scoped payment routes (included under /orders/)."""

from django.urls import path

from apps.payments.views import (
    ClientOrderPaymentMethodsView,
    ClientOrderPaymentProofView,
    ClientOrderPaymentView,
)

urlpatterns = [
    path(
        "<uuid:order_id>/payment-methods/",
        ClientOrderPaymentMethodsView.as_view(),
        name="order-payment-methods",
    ),
    path(
        "<uuid:order_id>/payment/",
        ClientOrderPaymentView.as_view(),
        name="order-payment",
    ),
    path(
        "<uuid:order_id>/payment/proof/",
        ClientOrderPaymentProofView.as_view(),
        name="order-payment-proof",
    ),
]
