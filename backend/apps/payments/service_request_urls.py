"""Client service-request payment routes."""

from django.urls import path

from apps.payments.views import (
    ClientServiceRequestPaymentMethodsView,
    ClientServiceRequestPaymentProofView,
    ClientServiceRequestPaymentView,
)

urlpatterns = [
    path(
        "<uuid:request_id>/payment-methods/",
        ClientServiceRequestPaymentMethodsView.as_view(),
        name="service-request-payment-methods",
    ),
    path(
        "<uuid:request_id>/payment/",
        ClientServiceRequestPaymentView.as_view(),
        name="service-request-payment",
    ),
    path(
        "<uuid:request_id>/payment/proof/",
        ClientServiceRequestPaymentProofView.as_view(),
        name="service-request-payment-proof",
    ),
]
