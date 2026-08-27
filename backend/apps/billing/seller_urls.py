from django.urls import path

from apps.billing.views import (
    SellerBoostListCreateView,
    SellerBoostProofView,
    SellerEntitlementsView,
    SellerSubscriptionDetailView,
    SellerSubscriptionListCreateView,
    SellerSubscriptionPaymentListView,
    SellerSubscriptionProofView,
)

urlpatterns = [
    path(
        "entitlements/",
        SellerEntitlementsView.as_view(),
        name="seller-billing-entitlements",
    ),
    path(
        "subscriptions/",
        SellerSubscriptionListCreateView.as_view(),
        name="seller-subscriptions",
    ),
    path(
        "subscriptions/<uuid:subscription_id>/",
        SellerSubscriptionDetailView.as_view(),
        name="seller-subscription-detail",
    ),
    path(
        "subscriptions/<uuid:subscription_id>/proof/",
        SellerSubscriptionProofView.as_view(),
        name="seller-subscription-proof",
    ),
    path(
        "subscription-payments/",
        SellerSubscriptionPaymentListView.as_view(),
        name="seller-subscription-payments",
    ),
    path("boosts/", SellerBoostListCreateView.as_view(), name="seller-boosts"),
    path(
        "boosts/<uuid:boost_id>/proof/",
        SellerBoostProofView.as_view(),
        name="seller-boost-proof",
    ),
]
