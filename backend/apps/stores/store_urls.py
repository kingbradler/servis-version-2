"""Public store URL routes."""

from django.urls import path

from apps.products.views import PublicStoreProductDetailView
from apps.stores.store_views import PublicStoreDetailView, PublicStoreListView

app_name = "stores"

urlpatterns = [
    path("", PublicStoreListView.as_view(), name="list"),
    path(
        "<slug:store_slug>/products/<slug:product_slug>/",
        PublicStoreProductDetailView.as_view(),
        name="product-detail",
    ),
    path("<slug:slug>/", PublicStoreDetailView.as_view(), name="detail"),
]
