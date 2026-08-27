"""Billing API views — public plans, seller subscriptions/boosts, admin review."""

from __future__ import annotations

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import (
    Boost,
    BoostPackage,
    BoostPayment,
    Plan,
    PlatformPaymentMethod,
    Subscription,
    SubscriptionPayment,
)
from apps.billing.serializers import (
    AdminBoostPaymentSerializer,
    AdminSubscriptionPaymentSerializer,
    AdminSubscriptionSerializer,
    BoostPackageSerializer,
    BoostPaymentSerializer,
    BoostSerializer,
    CreateBoostSerializer,
    CreateSubscriptionSerializer,
    EntitlementsSerializer,
    PlanSerializer,
    PlatformPaymentMethodPublicSerializer,
    PlatformPaymentMethodSerializer,
    RejectReasonSerializer,
    SubscriptionPaymentSerializer,
    SubscriptionSerializer,
    UploadBillingProofSerializer,
)
from apps.billing.services import (
    approve_boost_payment,
    approve_subscription_payment,
    create_boost_request,
    create_subscription_request,
    reject_boost_payment,
    reject_subscription_payment,
    submit_boost_proof,
    submit_subscription_proof,
)
from apps.core.storage import build_billing_proof_path, get_storage_backend
from apps.users.permissions import IsAdminRole, IsSeller


def _upload_billing_proof(payment_id, uploaded) -> str:
    storage = get_storage_backend()
    path = build_billing_proof_path(payment_id, getattr(uploaded, "name", "proof.jpg"))
    content_type = uploaded.content_type or "application/octet-stream"
    try:
        return storage.upload(path, uploaded, content_type, private=True)
    except Exception as exc:
        raise PermissionDenied(f"Impossible d'enregistrer la preuve: {exc}") from exc


# ── Public / seller catalog ──────────────────────────────────────────


class PlanListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Billing"], summary="Plans d'abonnement disponibles")
    def get(self, request):
        qs = Plan.objects.filter(is_active=True).order_by("sort_order", "price")
        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return Response(PlanSerializer(qs, many=True).data)


class BoostPackageListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Billing"], summary="Forfaits Boost disponibles")
    def get(self, request):
        qs = BoostPackage.objects.filter(is_active=True).order_by("duration_days")
        return Response(BoostPackageSerializer(qs, many=True).data)


class PlatformPaymentMethodListView(APIView):
    """SERVIS platform payment methods (not seller store methods)."""

    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Billing"],
        summary="Moyens de paiement SERVIS (abonnements / boosts)",
    )
    def get(self, request):
        qs = PlatformPaymentMethod.objects.filter(is_active=True).order_by(
            "sort_order", "name"
        )
        return Response(PlatformPaymentMethodPublicSerializer(qs, many=True).data)


# ── Seller subscriptions ─────────────────────────────────────────────


class SellerEntitlementsView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Billing"], summary="Mes droits / quotas")
    def get(self, request):
        return Response(EntitlementsSerializer.from_owner(request.user))


class SellerSubscriptionListCreateView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Billing"], summary="Mes abonnements")
    def get(self, request):
        qs = (
            Subscription.objects.filter(owner=request.user)
            .select_related("plan")
            .prefetch_related("payments__payment_method")
            .order_by("-created_at")
        )
        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return Response(SubscriptionSerializer(qs, many=True).data)

    @extend_schema(
        tags=["Seller — Billing"],
        summary="Demander un abonnement",
        request=CreateSubscriptionSerializer,
    )
    def post(self, request):
        ser = CreateSubscriptionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            plan = Plan.objects.get(pk=ser.validated_data["plan_id"], is_active=True)
        except Plan.DoesNotExist as exc:
            raise NotFound("Plan introuvable.") from exc

        method = None
        method_id = ser.validated_data.get("payment_method_id")
        if method_id:
            try:
                method = PlatformPaymentMethod.objects.get(pk=method_id, is_active=True)
            except PlatformPaymentMethod.DoesNotExist as exc:
                raise NotFound("Moyen de paiement introuvable.") from exc

        sub, payment = create_subscription_request(
            owner=request.user, plan=plan, payment_method=method
        )
        data = SubscriptionSerializer(sub).data
        if payment:
            data["latest_payment"] = SubscriptionPaymentSerializer(payment).data
        return Response(data, status=status.HTTP_201_CREATED)


class SellerSubscriptionDetailView(APIView):
    permission_classes = [IsSeller]

    def _get(self, user, subscription_id):
        try:
            return (
                Subscription.objects.select_related("plan")
                .prefetch_related("payments__payment_method")
                .get(pk=subscription_id, owner=user)
            )
        except Subscription.DoesNotExist as exc:
            raise NotFound("Abonnement introuvable.") from exc

    @extend_schema(tags=["Seller — Billing"], summary="Détail abonnement")
    def get(self, request, subscription_id):
        return Response(SubscriptionSerializer(self._get(request.user, subscription_id)).data)


class SellerSubscriptionProofView(APIView):
    permission_classes = [IsSeller]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        tags=["Seller — Billing"],
        summary="Envoyer la preuve de paiement d'abonnement",
        request=UploadBillingProofSerializer,
    )
    def post(self, request, subscription_id):
        try:
            sub = Subscription.objects.get(pk=subscription_id, owner=request.user)
        except Subscription.DoesNotExist as exc:
            raise NotFound("Abonnement introuvable.") from exc

        payment = sub.payments.order_by("-created_at").first()
        if not payment:
            raise NotFound("Aucun paiement pour cet abonnement.")

        ser = UploadBillingProofSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        stored = _upload_billing_proof(payment.id, ser.validated_data["proof"])
        payment = submit_subscription_proof(
            payment=payment,
            proof_path=stored,
            reference=ser.validated_data.get("reference", ""),
        )
        return Response(SubscriptionPaymentSerializer(payment).data)


class SellerSubscriptionPaymentListView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Billing"], summary="Historique paiements abonnement")
    def get(self, request):
        qs = (
            SubscriptionPayment.objects.filter(owner=request.user)
            .select_related("payment_method", "subscription__plan")
            .order_by("-created_at")
        )
        return Response(SubscriptionPaymentSerializer(qs, many=True).data)


# ── Seller boosts ────────────────────────────────────────────────────


class SellerBoostListCreateView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Billing"], summary="Mes boosts")
    def get(self, request):
        qs = (
            Boost.objects.filter(owner=request.user)
            .select_related("package", "payment__payment_method")
            .order_by("-created_at")
        )
        return Response(BoostSerializer(qs, many=True).data)

    @extend_schema(
        tags=["Seller — Billing"],
        summary="Demander un boost",
        request=CreateBoostSerializer,
    )
    def post(self, request):
        ser = CreateBoostSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            package = BoostPackage.objects.get(
                pk=ser.validated_data["package_id"], is_active=True
            )
        except BoostPackage.DoesNotExist as exc:
            raise NotFound("Forfait boost introuvable.") from exc
        try:
            method = PlatformPaymentMethod.objects.get(
                pk=ser.validated_data["payment_method_id"], is_active=True
            )
        except PlatformPaymentMethod.DoesNotExist as exc:
            raise NotFound("Moyen de paiement introuvable.") from exc

        boost, _payment = create_boost_request(
            owner=request.user,
            package=package,
            target_type=ser.validated_data["target_type"],
            target_id=ser.validated_data["target_id"],
            payment_method=method,
        )
        boost = Boost.objects.select_related("package", "payment__payment_method").get(
            pk=boost.pk
        )
        return Response(BoostSerializer(boost).data, status=status.HTTP_201_CREATED)


class SellerBoostProofView(APIView):
    permission_classes = [IsSeller]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        tags=["Seller — Billing"],
        summary="Envoyer la preuve de paiement boost",
        request=UploadBillingProofSerializer,
    )
    def post(self, request, boost_id):
        try:
            boost = Boost.objects.select_related("payment").get(
                pk=boost_id, owner=request.user
            )
        except Boost.DoesNotExist as exc:
            raise NotFound("Boost introuvable.") from exc
        if not boost.payment_id:
            raise NotFound("Aucun paiement lié.")

        ser = UploadBillingProofSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        stored = _upload_billing_proof(boost.payment_id, ser.validated_data["proof"])
        payment = submit_boost_proof(
            payment=boost.payment,
            proof_path=stored,
            reference=ser.validated_data.get("reference", ""),
        )
        return Response(BoostPaymentSerializer(payment).data)


# ── Admin ────────────────────────────────────────────────────────────


class AdminSubscriptionListView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(
        tags=["Admin — Billing"],
        summary="Liste abonnements",
        parameters=[
            OpenApiParameter(name="status", required=False, type=str),
            OpenApiParameter(name="category", required=False, type=str),
        ],
    )
    def get(self, request):
        qs = (
            Subscription.objects.select_related("plan", "owner")
            .prefetch_related("payments__payment_method")
            .order_by("-created_at")
        )
        if status_param := request.query_params.get("status"):
            qs = qs.filter(status=status_param)
        if category := request.query_params.get("category"):
            qs = qs.filter(category=category)
        from apps.core.pagination import StandardPagination

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response(
            AdminSubscriptionSerializer(page, many=True).data
        )


class AdminSubscriptionDetailView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(tags=["Admin — Billing"], summary="Détail abonnement")
    def get(self, request, subscription_id):
        try:
            sub = (
                Subscription.objects.select_related("plan", "owner")
                .prefetch_related("payments__payment_method")
                .get(pk=subscription_id)
            )
        except Subscription.DoesNotExist as exc:
            raise NotFound("Abonnement introuvable.") from exc
        return Response(AdminSubscriptionSerializer(sub).data)


class AdminSubscriptionPaymentListView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(tags=["Admin — Billing"], summary="Paiements d'abonnement")
    def get(self, request):
        qs = (
            SubscriptionPayment.objects.select_related(
                "owner", "payment_method", "subscription__plan", "reviewed_by"
            )
            .order_by("-created_at")
        )
        if status_param := request.query_params.get("status"):
            qs = qs.filter(status=status_param)
        from apps.core.pagination import StandardPagination

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response(
            AdminSubscriptionPaymentSerializer(page, many=True).data
        )


class AdminSubscriptionPaymentApproveView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(tags=["Admin — Billing"], summary="Approuver un paiement d'abonnement")
    def post(self, request, payment_id):
        try:
            payment = SubscriptionPayment.objects.select_related(
                "subscription__plan", "owner"
            ).get(pk=payment_id)
        except SubscriptionPayment.DoesNotExist as exc:
            raise NotFound("Paiement introuvable.") from exc
        sub = approve_subscription_payment(payment=payment, admin=request.user)
        return Response(AdminSubscriptionSerializer(sub).data)


class AdminSubscriptionPaymentRejectView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(
        tags=["Admin — Billing"],
        summary="Refuser un paiement d'abonnement",
        request=RejectReasonSerializer,
    )
    def post(self, request, payment_id):
        try:
            payment = SubscriptionPayment.objects.select_related("subscription").get(
                pk=payment_id
            )
        except SubscriptionPayment.DoesNotExist as exc:
            raise NotFound("Paiement introuvable.") from exc
        ser = RejectReasonSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payment = reject_subscription_payment(
            payment=payment,
            admin=request.user,
            reason=ser.validated_data["rejection_reason"],
        )
        return Response(AdminSubscriptionPaymentSerializer(payment).data)


class AdminPlatformPaymentMethodListCreateView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(tags=["Admin — Billing"], summary="CRUD moyens de paiement SERVIS")
    def get(self, request):
        qs = PlatformPaymentMethod.objects.all().order_by("sort_order", "name")
        return Response(PlatformPaymentMethodSerializer(qs, many=True).data)

    def post(self, request):
        ser = PlatformPaymentMethodSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        method = ser.save()
        return Response(
            PlatformPaymentMethodSerializer(method).data,
            status=status.HTTP_201_CREATED,
        )


class AdminPlatformPaymentMethodDetailView(APIView):
    permission_classes = [IsAdminRole]

    def _get(self, method_id):
        try:
            return PlatformPaymentMethod.objects.get(pk=method_id)
        except PlatformPaymentMethod.DoesNotExist as exc:
            raise NotFound("Moyen introuvable.") from exc

    def patch(self, request, method_id):
        method = self._get(method_id)
        ser = PlatformPaymentMethodSerializer(method, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, method_id):
        method = self._get(method_id)
        method.is_active = False
        method.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBoostPaymentListView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(tags=["Admin — Billing"], summary="Paiements boost")
    def get(self, request):
        qs = (
            BoostPayment.objects.select_related("owner", "payment_method", "reviewed_by")
            .order_by("-created_at")
        )
        if status_param := request.query_params.get("status"):
            qs = qs.filter(status=status_param)
        from apps.core.pagination import StandardPagination

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response(
            AdminBoostPaymentSerializer(page, many=True).data
        )


class AdminBoostPaymentApproveView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(tags=["Admin — Billing"], summary="Approuver paiement boost")
    def post(self, request, payment_id):
        try:
            payment = BoostPayment.objects.get(pk=payment_id)
        except BoostPayment.DoesNotExist as exc:
            raise NotFound("Paiement introuvable.") from exc
        boost = approve_boost_payment(payment=payment, admin=request.user)
        return Response(BoostSerializer(boost).data)


class AdminBoostPaymentRejectView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(
        tags=["Admin — Billing"],
        summary="Refuser paiement boost",
        request=RejectReasonSerializer,
    )
    def post(self, request, payment_id):
        try:
            payment = BoostPayment.objects.get(pk=payment_id)
        except BoostPayment.DoesNotExist as exc:
            raise NotFound("Paiement introuvable.") from exc
        ser = RejectReasonSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payment = reject_boost_payment(
            payment=payment,
            admin=request.user,
            reason=ser.validated_data["rejection_reason"],
        )
        return Response(AdminBoostPaymentSerializer(payment).data)
