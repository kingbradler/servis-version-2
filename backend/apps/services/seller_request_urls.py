from django.urls import path

from apps.services.request_views import (
    SellerServiceRequestAcceptView,
    SellerServiceRequestCompleteView,
    SellerServiceRequestDetailView,
    SellerServiceRequestListView,
    SellerServiceRequestRejectView,
)

app_name = "seller_service_requests"

urlpatterns = [
    path("", SellerServiceRequestListView.as_view(), name="list"),
    path(
        "<uuid:request_id>/",
        SellerServiceRequestDetailView.as_view(),
        name="detail",
    ),
    path(
        "<uuid:request_id>/accept/",
        SellerServiceRequestAcceptView.as_view(),
        name="accept",
    ),
    path(
        "<uuid:request_id>/reject/",
        SellerServiceRequestRejectView.as_view(),
        name="reject",
    ),
    path(
        "<uuid:request_id>/complete/",
        SellerServiceRequestCompleteView.as_view(),
        name="complete",
    ),
]
