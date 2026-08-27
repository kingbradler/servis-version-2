"""Category URL routes."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.categories.views import (
    CategoryAdminViewSet,
    CategoryDetailView,
    CategoryListView,
)

app_name = "categories"

urlpatterns = [
    path("", CategoryListView.as_view(), name="list"),
    path("<slug:slug>/", CategoryDetailView.as_view(), name="detail"),
]

admin_router = DefaultRouter()
admin_router.register("", CategoryAdminViewSet, basename="admin-category")
