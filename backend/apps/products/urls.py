"""Public product URL routes."""

from django.urls import path

from apps.products.views import PublicProductListView

app_name = "products"

urlpatterns = [
    path("", PublicProductListView.as_view(), name="list"),
]
