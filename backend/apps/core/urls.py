"""Core app URL configuration."""

from django.urls import path

from apps.core import views
from apps.core.feedback_views import SiteFeedbackCreateView
from apps.core.hero_views import PublicHeroSlideListView
from apps.core.storage_views import SignedStorageDownloadView

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path(
        "feedback/",
        SiteFeedbackCreateView.as_view(),
        name="site-feedback-create",
    ),
    path(
        "hero-slides/",
        PublicHeroSlideListView.as_view(),
        name="hero-slides-public",
    ),
    path(
        "storage/signed/<path:token>/",
        SignedStorageDownloadView.as_view(),
        name="storage-signed",
    ),
]
