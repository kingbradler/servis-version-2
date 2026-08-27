from django.urls import path

from apps.disputes.views import SellerDisputeListView, SellerDisputeReplyView

urlpatterns = [
    path("disputes/", SellerDisputeListView.as_view(), name="seller-dispute-list"),
    path(
        "disputes/<uuid:dispute_id>/reply/",
        SellerDisputeReplyView.as_view(),
        name="seller-dispute-reply",
    ),
]
