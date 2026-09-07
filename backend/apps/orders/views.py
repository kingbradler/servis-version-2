"""Cart, client orders, seller & admin order views."""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.orders.models import Order, OrderStatus
from apps.orders.serializers import (
    AddCartItemSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderAdminSerializer,
    OrderSerializer,
    SellerOrderSerializer,
    UpdateCartItemSerializer,
)
from apps.orders.services import (
    add_or_update_cart_item,
    checkout_cart,
    clear_cart,
    get_or_create_cart,
    remove_cart_item,
    set_cart_item_quantity,
)
from apps.users.permissions import CanShop, IsAdminRole, IsSeller


def _cart_response(cart):
    cart = (
        type(cart)
        .objects.prefetch_related("items__product__store")
        .get(pk=cart.pk)
    )
    return CartSerializer(cart).data


class CartDetailView(APIView):
    """GET cart / DELETE clear cart — owned by request.user only."""

    permission_classes = [CanShop]

    @extend_schema(tags=["Cart"], summary="Voir mon panier", responses={200: CartSerializer})
    def get(self, request):
        cart = get_or_create_cart(request.user)
        return Response(_cart_response(cart))

    @extend_schema(tags=["Cart"], summary="Vider mon panier")
    def delete(self, request):
        cart = get_or_create_cart(request.user)
        clear_cart(cart)
        return Response(_cart_response(cart))


class CartItemListCreateView(APIView):
    permission_classes = [CanShop]

    @extend_schema(
        tags=["Cart"],
        summary="Ajouter un produit au panier",
        request=AddCartItemSerializer,
        responses={201: CartSerializer},
    )
    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart = get_or_create_cart(request.user)
        add_or_update_cart_item(
            cart,
            serializer.validated_data["product_id"],
            serializer.validated_data["quantity"],
        )
        return Response(_cart_response(cart), status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    permission_classes = [CanShop]

    @extend_schema(
        tags=["Cart"],
        summary="Modifier la quantité d'un article",
        request=UpdateCartItemSerializer,
        responses={200: CartSerializer},
    )
    def patch(self, request, item_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart = get_or_create_cart(request.user)
        set_cart_item_quantity(
            cart, item_id, serializer.validated_data["quantity"]
        )
        return Response(_cart_response(cart))

    @extend_schema(tags=["Cart"], summary="Supprimer un article du panier")
    def delete(self, request, item_id):
        cart = get_or_create_cart(request.user)
        remove_cart_item(cart, item_id)
        return Response(_cart_response(cart))


class ClientOrderListCreateView(APIView):
    permission_classes = [CanShop]
    pagination_class = StandardPagination

    @extend_schema(
        tags=["Orders"],
        summary="Mes commandes",
        responses={200: OrderSerializer(many=True)},
    )
    def get(self, request):
        qs = (
            Order.objects.filter(user=request.user)
            .select_related("store")
            .prefetch_related("items")
            .order_by("-created_at")
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response(OrderSerializer(page, many=True).data)

    @extend_schema(
        tags=["Orders"],
        summary="Créer commande(s) depuis mon panier",
        description=(
            "Une commande est créée par boutique (règle SERVIS). "
            "Le panier multi-boutiques produit plusieurs commandes. "
            "Prix et stock sont validés côté serveur ; le stock est décrémenté "
            "atomiquement. L'adresse de livraison est obligatoire."
        ),
        request=CheckoutSerializer,
        responses={201: OrderSerializer(many=True)},
    )
    def post(self, request):
        # Reject client-supplied totals/prices
        forbidden = {"total", "total_amount", "price", "unit_price", "items", "user"}
        leaked = forbidden.intersection(
            request.data.keys() if hasattr(request.data, "keys") else []
        )
        if leaked:
            return Response(
                {f: "Ce champ ne peut pas être défini par le client." for f in leaked},
                status=status.HTTP_400_BAD_REQUEST,
            )

        checkout = CheckoutSerializer(data=request.data)
        checkout.is_valid(raise_exception=True)
        orders = checkout_cart(request.user, delivery=checkout.validated_data)
        return Response(
            {
                "count": len(orders),
                "orders": OrderSerializer(orders, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ClientOrderDetailView(APIView):
    permission_classes = [CanShop]

    @extend_schema(tags=["Orders"], summary="Détail de ma commande")
    def get(self, request, order_id):
        try:
            order = (
                Order.objects.select_related("store")
                .prefetch_related("items")
                .get(pk=order_id, user=request.user)
            )
        except Order.DoesNotExist:
            return Response({"detail": "Commande introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)


class SellerOrderListView(generics.ListAPIView):
    """Orders for the authenticated seller's store only."""

    permission_classes = [IsSeller]
    serializer_class = SellerOrderSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return (
            Order.objects.filter(store__owner=self.request.user)
            .select_related("store", "user")
            .prefetch_related("items")
            .order_by("-created_at")
        )

    @extend_schema(tags=["Seller — Orders"], summary="Commandes de ma boutique")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class SellerOrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsSeller]
    serializer_class = SellerOrderSerializer
    lookup_field = "id"
    lookup_url_kwarg = "order_id"

    def get_queryset(self):
        return (
            Order.objects.filter(store__owner=self.request.user)
            .select_related("store", "user")
            .prefetch_related("items")
        )

    @extend_schema(tags=["Seller — Orders"], summary="Détail commande boutique")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class SellerOrderCompleteView(APIView):
    """CONFIRMED / PROCESSING / READY → COMPLETED so the client can leave a review."""

    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Orders"], summary="Marquer la commande comme livrée")
    def post(self, request, order_id):
        from apps.reviews.eligibility import SELLER_CAN_COMPLETE_FROM

        try:
            order = Order.objects.select_related("store", "user").prefetch_related(
                "items"
            ).get(pk=order_id, store__owner=request.user)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Commande introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if order.status == OrderStatus.COMPLETED:
            return Response(SellerOrderSerializer(order).data)
        if order.status not in SELLER_CAN_COMPLETE_FROM:
            raise ValidationError(
                {
                    "status": (
                        "Confirmez d'abord le paiement, puis marquez la commande "
                        "comme livrée."
                    )
                }
            )
        order.status = OrderStatus.COMPLETED
        order.save(update_fields=["status", "updated_at"])
        return Response(SellerOrderSerializer(order).data)


@extend_schema_view(
    list=extend_schema(tags=["Admin — Orders"], summary="Liste admin des commandes"),
    retrieve=extend_schema(tags=["Admin — Orders"], summary="Détail admin commande"),
)
class AdminOrderListView(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = OrderAdminSerializer
    pagination_class = StandardPagination
    queryset = (
        Order.objects.select_related("store", "user")
        .prefetch_related("items")
        .all()
        .order_by("-created_at")
    )


class AdminOrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = OrderAdminSerializer
    lookup_field = "id"
    lookup_url_kwarg = "order_id"
    queryset = Order.objects.select_related("store", "user").prefetch_related("items").all()
