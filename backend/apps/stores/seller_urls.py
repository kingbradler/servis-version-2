"""Seller store URL routes."""

from django.urls import path

from apps.core.stats_views import SellerAdvancedStatsView, SellerStatsView
from apps.stores.store_views import (
    SellerStoreMediaView,
    SellerStoreSubmitView,
    SellerStoreView,
)

app_name = "seller_store"

urlpatterns = [
    path("store/", SellerStoreView.as_view(), name="store"),
    path("store/media/", SellerStoreMediaView.as_view(), name="store-media"),
    path("store/submit/", SellerStoreSubmitView.as_view(), name="store-submit"),
    path("stats/", SellerStatsView.as_view(), name="stats"),
    path(
        "stats/advanced/",
        SellerAdvancedStatsView.as_view(),
        name="stats-advanced",
    ),
]