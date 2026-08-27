from django.urls import path

from apps.services.request_views import (
    ClientServiceRequestCancelView,
    ClientServiceRequestDetailView,
    ClientServiceRequestListCreateView,
)

app_name = "service_requests"

urlpatterns = [
    path("", ClientServiceRequestListCreateView.as_view(), name="list-create"),
    path(
        "<uuid:request_id>/",
        ClientServiceRequestDetailView.as_view(),
        name="detail",
    ),
    path(
        "<uuid:request_id>/cancel/",
        ClientServiceRequestCancelView.as_view(),
        name="cancel",
    ),
]
