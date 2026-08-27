"""City URL routes."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.stores.views import CityAdminViewSet, CityDetailView, CityListView

app_name = "cities"

urlpatterns = [
    path("", CityListView.as_view(), name="list"),
    path("<slug:slug>/", CityDetailView.as_view(), name="detail"),
]

admin_router = DefaultRouter()
admin_router.register("", CityAdminViewSet, basename="admin-city")
