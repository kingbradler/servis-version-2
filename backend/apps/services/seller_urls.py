from django.urls import path

from apps.services.views import (
    SellerServiceArchiveView,
    SellerServiceDetailView,
    SellerServiceImageDeleteView,
    SellerServiceImageListCreateView,
    SellerServiceListCreateView,
    SellerServicePublishView,
)

app_name = "seller_services"

urlpatterns = [
    path("", SellerServiceListCreateView.as_view(), name="list-create"),
    path("<uuid:service_id>/", SellerServiceDetailView.as_view(), name="detail"),
    path(
        "<uuid:service_id>/publish/",
        SellerServicePublishView.as_view(),
        name="publish",
    ),
    path(
        "<uuid:service_id>/archive/",
        SellerServiceArchiveView.as_view(),
        name="archive",
    ),
    path(
        "<uuid:service_id>/images/",
        SellerServiceImageListCreateView.as_view(),
        name="images",
    ),
    path(
        "<uuid:service_id>/images/<uuid:image_id>/",
        SellerServiceImageDeleteView.as_view(),
        name="image-delete",
    ),
]
