"""Client cart URL routes."""

from django.urls import path

from apps.orders.views import CartDetailView, CartItemDetailView, CartItemListCreateView

app_name = "cart"

urlpatterns = [
    path("", CartDetailView.as_view(), name="detail"),
    path("items/", CartItemListCreateView.as_view(), name="items"),
    path("items/<uuid:item_id>/", CartItemDetailView.as_view(), name="item-detail"),
]
