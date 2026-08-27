from django.urls import path

from apps.disputes.views import (
    DisputeCloseView,
    DisputeDetailView,
    DisputeListCreateView,
)

urlpatterns = [
    path("", DisputeListCreateView.as_view(), name="dispute-list-create"),
    path("<uuid:dispute_id>/", DisputeDetailView.as_view(), name="dispute-detail"),
    path(
        "<uuid:dispute_id>/close/",
        DisputeCloseView.as_view(),
        name="dispute-close",
    ),
]
