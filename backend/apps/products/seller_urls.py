"""Seller product URL routes."""

from django.urls import path

from apps.products.views import (
    SellerProductDetailView,
    SellerProductImageDeleteView,
    SellerProductImageListCreateView,
    SellerProductListCreateView,
    SellerProductPublishView,
)

app_name = "seller_products"

urlpatterns = [
    path("", SellerProductListCreateView.as_view(), name="list-create"),
    path("<uuid:product_id>/", SellerProductDetailView.as_view(), name="detail"),
    path(
        "<uuid:product_id>/publish/",
        SellerProductPublishView.as_view(),
        name="publish",
    ),
    path(
        "<uuid:product_id>/images/",
        SellerProductImageListCreateView.as_view(),
        name="images",
    ),
    path(
        "<uuid:product_id>/images/<uuid:image_id>/",
        SellerProductImageDeleteView.as_view(),
        name="image-delete",
    ),
]
