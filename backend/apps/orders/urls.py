"""Client order URL routes."""

from django.urls import path

from apps.orders.views import ClientOrderDetailView, ClientOrderListCreateView

app_name = "orders"

urlpatterns = [
    path("", ClientOrderListCreateView.as_view(), name="list-create"),
    path("<uuid:order_id>/", ClientOrderDetailView.as_view(), name="detail"),
]
