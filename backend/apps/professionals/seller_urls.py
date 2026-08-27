"""Seller professional profile routes."""

from django.urls import path

from apps.professionals.views import (
    SellerProfessionalSubmitView,
    SellerProfessionalView,
)

app_name = "seller_professional"

urlpatterns = [
    path(
        "professional-profile/",
        SellerProfessionalView.as_view(),
        name="profile",
    ),
    path(
        "professional-profile/submit/",
        SellerProfessionalSubmitView.as_view(),
        name="profile-submit",
    ),
]
