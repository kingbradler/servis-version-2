from django.urls import path

from apps.billing.views import (
    BoostPackageListView,
    PlanListView,
    PlatformPaymentMethodListView,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="billing-plans"),
    path("boost-packages/", BoostPackageListView.as_view(), name="billing-boost-packages"),
    path(
        "payment-methods/",
        PlatformPaymentMethodListView.as_view(),
        name="billing-payment-methods",
    ),
]
