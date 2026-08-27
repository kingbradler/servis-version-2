"""Public professional profile routes."""

from django.urls import path

from apps.professionals.views import (
    PublicProfessionalDetailView,
    PublicProfessionalListView,
)

app_name = "professionals"

urlpatterns = [
    path("", PublicProfessionalListView.as_view(), name="list"),
    path("<slug:slug>/", PublicProfessionalDetailView.as_view(), name="detail"),
]
