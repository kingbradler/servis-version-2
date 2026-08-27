from django.urls import path

from apps.services.views import PublicServiceDetailView, PublicServiceListView

app_name = "services"

urlpatterns = [
    path("", PublicServiceListView.as_view(), name="list"),
    path("<uuid:service_id>/", PublicServiceDetailView.as_view(), name="detail"),
]
