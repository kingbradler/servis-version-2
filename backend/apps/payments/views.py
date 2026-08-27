"""Payment API views — seller methods + order-scoped client/seller payment."""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.models import Payment, PaymentMethod
from apps.payments.serializers import (
    CreateOrderPaymentSerializer,
    PaymentMethodPublicSerializer,
    PaymentSerializer,
    RejectPaymentSerializer,
    SellerPaymentMethodSerializer,
    UploadProofSerializer,
)
from apps.payments.services import (
    confirm_payment,
    confirm_service_request_payment,
    create_payment,
    create_service_request_payment,
    get_client_order,
    get_client_service_request,
    get_seller_order,
    get_seller_service_request,
    get_seller_store,
    list_service_request_payment_methods,
    reject_payment,
    reject_service_request_payment,
    submit_proof,
    submit_service_request_proof,
)
from apps.users.permissions import CanShop, IsAdminRole, IsSeller


# ── Seller payment methods ───────────────────────────────────────────


class SellerPaymentMethodListCreateView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Payment methods"],
        summary="Lister mes moyens de paiement",
        responses={200: SellerPaymentMethodSerializer(many=True)},
    )
    def get(self, request):
        store = get_seller_store(request.user)
        qs = PaymentMethod.objects.filter(store=store).order_by("label")
        return Response(SellerPaymentMethodSerializer(qs, many=True).data)

    @extend_schema(
        tags=["Seller — Payment methods"],
        summary="Créer un moyen de paiement",
        request=SellerPaymentMethodSerializer,
        responses={201: SellerPaymentMethodSerializer},
    )
    def post(self, request):
        store = get_seller_store(request.user)
        serializer = SellerPaymentMethodSerializer(
            data=request.data, context={"store": store, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        method = serializer.save()
        return Response(
            SellerPaymentMethodSerializer(method).data,
            status=status.HTTP_201_CREATED,
        )


class SellerPaymentMethodDetailView(APIView):
    permission_classes = [IsSeller]

    def _get(self, user, method_id):
        store = get_seller_store(user)
        try:
            return PaymentMethod.objects.get(pk=method_id, store=store)
        except PaymentMethod.DoesNotExist as exc:
            raise NotFound("Moyen de paiement introuvable.") from exc

    @extend_schema(tags=["Seller — Payment methods"], summary="Modifier un moyen")
    def patch(self, request, method_id):
        method = self._get(request.user, method_id)
        serializer = SellerPaymentMethodSerializer(
            method,
            data=request.data,
            partial=True,
            context={"store": method.store, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(tags=["Seller — Payment methods"], summary="Supprimer un moyen")
    def delete(self, request, method_id):
        method = self._get(request.user, method_id)
        method.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Client order payment ─────────────────────────────────────────────


class ClientOrderPaymentMethodsView(APIView):
    """Active payment methods of the order's store — for the order owner only."""

    permission_classes = [CanShop]

    @extend_schema(
        tags=["Payments"],
        summary="Moyens de paiement disponibles pour ma commande",
        responses={200: PaymentMethodPublicSerializer(many=True)},
    )
    def get(self, request, order_id):
        order = get_client_order(request.user, order_id)
        qs = PaymentMethod.objects.filter(
            store=order.store, is_active=True
        ).order_by("label")
        return Response(PaymentMethodPublicSerializer(qs, many=True).data)


class ClientOrderPaymentView(APIView):
    permission_classes = [CanShop]

    @extend_schema(
        tags=["Payments"],
        summary="Voir le paiement de ma commande",
        responses={200: PaymentSerializer},
    )
    def get(self, request, order_id):
        order = get_client_order(request.user, order_id)
        try:
            payment = Payment.objects.select_related("payment_method").prefetch_related(
                "proofs"
            ).get(order=order)
        except Payment.DoesNotExist as exc:
            raise NotFound("Aucun paiement pour cette commande.") from exc
        return Response(PaymentSerializer(payment, context={"request": request}).data)

    @extend_schema(
        tags=["Payments"],
        summary="Créer un paiement pour ma commande",
        request=CreateOrderPaymentSerializer,
        responses={201: PaymentSerializer},
    )
    def post(self, request, order_id):
        serializer = CreateOrderPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = create_payment(
            user=request.user,
            order_id=order_id,
            payment_method_id=serializer.validated_data["payment_method_id"],
        )
        payment = (
            Payment.objects.select_related("payment_method")
            .prefetch_related("proofs")
            .get(pk=payment.pk)
        )
        return Response(
            PaymentSerializer(payment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ClientOrderPaymentProofView(APIView):
    permission_classes = [CanShop]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        tags=["Payments"],
        summary="Envoyer une preuve de paiement",
        request=UploadProofSerializer,
        responses={200: PaymentSerializer},
    )
    def post(self, request, order_id):
        serializer = UploadProofSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = submit_proof(
            user=request.user,
            order_id=order_id,
            uploaded_file=serializer.validated_data["proof"],
        )
        payment = (
            Payment.objects.select_related("payment_method")
            .prefetch_related("proofs")
            .get(pk=payment.pk)
        )
        return Response(PaymentSerializer(payment, context={"request": request}).data)


# ── Seller order payment ─────────────────────────────────────────────


class SellerOrderPaymentView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Payments"],
        summary="Voir le paiement d'une commande de ma boutique",
        responses={200: PaymentSerializer},
    )
    def get(self, request, order_id):
        order = get_seller_order(request.user, order_id)
        try:
            payment = Payment.objects.select_related("payment_method").prefetch_related(
                "proofs"
            ).get(order=order)
        except Payment.DoesNotExist as exc:
            raise NotFound("Aucun paiement pour cette commande.") from exc
        return Response(PaymentSerializer(payment, context={"request": request}).data)


class SellerOrderPaymentConfirmView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Payments"],
        summary="Confirmer le paiement (preuve OK)",
        responses={200: PaymentSerializer},
    )
    def post(self, request, order_id):
        payment = confirm_payment(seller=request.user, order_id=order_id)
        payment = (
            Payment.objects.select_related("payment_method")
            .prefetch_related("proofs")
            .get(pk=payment.pk)
        )
        return Response(PaymentSerializer(payment, context={"request": request}).data)


class SellerOrderPaymentRejectView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Payments"],
        summary="Rejeter la preuve de paiement",
        request=RejectPaymentSerializer,
        responses={200: PaymentSerializer},
    )
    def post(self, request, order_id):
        serializer = RejectPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = reject_payment(
            seller=request.user,
            order_id=order_id,
            reason=serializer.validated_data["reason"],
        )
        payment = (
            Payment.objects.select_related("payment_method")
            .prefetch_related("proofs")
            .get(pk=payment.pk)
        )
        return Response(PaymentSerializer(payment, context={"request": request}).data)


# ── Client / seller service-request payments ─────────────────────────


class ClientServiceRequestPaymentMethodsView(APIView):
    permission_classes = [CanShop]

    @extend_schema(
        tags=["Payments"],
        summary="Moyens de paiement pour ma demande de service",
        responses={200: PaymentMethodPublicSerializer(many=True)},
    )
    def get(self, request, request_id):
        qs = list_service_request_payment_methods(
            user=request.user, request_id=request_id
        )
        return Response(PaymentMethodPublicSerializer(qs, many=True).data)


class ClientServiceRequestPaymentView(APIView):
    permission_classes = [CanShop]

    @extend_schema(
        tags=["Payments"],
        summary="Voir le paiement de ma demande de service",
        responses={200: PaymentSerializer},
    )
    def get(self, request, request_id):
        sr = get_client_service_request(request.user, request_id)
        try:
            payment = Payment.objects.select_related("payment_method").prefetch_related(
                "proofs"
            ).get(service_request=sr)
        except Payment.DoesNotExist as exc:
            raise NotFound("Aucun paiement pour cette demande.") from exc
        return Response(PaymentSerializer(payment, context={"request": request}).data)

    @extend_schema(
        tags=["Payments"],
        summary="Créer un paiement pour ma demande de service",
        request=CreateOrderPaymentSerializer,
        responses={201: PaymentSerializer},
    )
    def post(self, request, request_id):
        serializer = CreateOrderPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = create_service_request_payment(
            user=request.user,
            request_id=request_id,
            payment_method_id=serializer.validated_data["payment_method_id"],
        )
        payment = (
            Payment.objects.select_related("payment_method")
            .prefetch_related("proofs")
            .get(pk=payment.pk)
        )
        return Response(
            PaymentSerializer(payment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ClientServiceRequestPaymentProofView(APIView):
    permission_classes = [CanShop]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        tags=["Payments"],
        summary="Envoyer une preuve (demande de service)",
        request=UploadProofSerializer,
        responses={200: PaymentSerializer},
    )
    def post(self, request, request_id):
        serializer = UploadProofSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = submit_service_request_proof(
            user=request.user,
            request_id=request_id,
            uploaded_file=serializer.validated_data["proof"],
        )
        payment = (
            Payment.objects.select_related("payment_method")
            .prefetch_related("proofs")
            .get(pk=payment.pk)
        )
        return Response(PaymentSerializer(payment, context={"request": request}).data)


class SellerServiceRequestPaymentView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Payments"],
        summary="Voir le paiement d'une demande de service",
        responses={200: PaymentSerializer},
    )
    def get(self, request, request_id):
        sr = get_seller_service_request(request.user, request_id)
        try:
            payment = Payment.objects.select_related("payment_method").prefetch_related(
                "proofs"
            ).get(service_request=sr)
        except Payment.DoesNotExist as exc:
            raise NotFound("Aucun paiement pour cette demande.") from exc
        return Response(PaymentSerializer(payment, context={"request": request}).data)


class SellerServiceRequestPaymentConfirmView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Payments"],
        summary="Confirmer le paiement d'une demande de service",
        responses={200: PaymentSerializer},
    )
    def post(self, request, request_id):
        payment = confirm_service_request_payment(
            seller=request.user, request_id=request_id
        )
        payment = (
            Payment.objects.select_related("payment_method")
            .prefetch_related("proofs")
            .get(pk=payment.pk)
        )
        return Response(PaymentSerializer(payment, context={"request": request}).data)


class SellerServiceRequestPaymentRejectView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Payments"],
        summary="Rejeter la preuve (demande de service)",
        request=RejectPaymentSerializer,
        responses={200: PaymentSerializer},
    )
    def post(self, request, request_id):
        serializer = RejectPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = reject_service_request_payment(
            seller=request.user,
            request_id=request_id,
            reason=serializer.validated_data["reason"],
        )
        payment = (
            Payment.objects.select_related("payment_method")
            .prefetch_related("proofs")
            .get(pk=payment.pk)
        )
        return Response(PaymentSerializer(payment, context={"request": request}).data)


class AdminPaymentListView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(tags=["Admin — Payments"], summary="Liste admin (lecture seule)")
    def get(self, request):
        qs = (
            Payment.objects.select_related(
                "payment_method",
                "order",
                "order__user",
                "service_request",
                "service_request__client",
            )
            .prefetch_related("proofs")
            .order_by("-created_at")[:100]
        )
        return Response(
            PaymentSerializer(qs, many=True, context={"request": request}).data
        )


class AdminPaymentDetailView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(tags=["Admin — Payments"], summary="Détail admin (lecture seule)")
    def get(self, request, payment_id):
        try:
            payment = (
                Payment.objects.select_related("payment_method", "order")
                .prefetch_related("proofs")
                .get(pk=payment_id)
            )
        except Payment.DoesNotExist as exc:
            raise NotFound("Paiement introuvable.") from exc
        return Response(PaymentSerializer(payment, context={"request": request}).data)
