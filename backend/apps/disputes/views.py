"""Dispute API views."""

from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.disputes.models import Dispute
from apps.disputes.serializers import (
    DisputeAdminResolveSerializer,
    DisputeCreateSerializer,
    DisputeReplySerializer,
    DisputeSerializer,
)
from apps.disputes.services import (
    close_dispute_by_client,
    create_dispute,
    disputes_for_seller,
    reply_to_dispute,
    resolve_dispute_admin,
    user_can_view_dispute,
)
from apps.users.permissions import CanShop, IsAdminRole, IsAuthenticatedUser, IsSeller


class DisputeListCreateView(generics.ListCreateAPIView):
    permission_classes = [CanShop]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DisputeCreateSerializer
        return DisputeSerializer

    def get_queryset(self):
        return (
            Dispute.objects.filter(opened_by=self.request.user)
            .select_related(
                "opened_by",
                "order",
                "order__store",
                "service_request",
                "service_request__service",
            )
            .order_by("-created_at")
        )

    @extend_schema(tags=["Disputes"], summary="Mes litiges")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        tags=["Disputes"],
        summary="Ouvrir un litige",
        request=DisputeCreateSerializer,
        responses={201: DisputeSerializer},
    )
    def post(self, request, *args, **kwargs):
        serializer = DisputeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dispute = create_dispute(
            user=request.user,
            order_id=serializer.validated_data.get("order_id"),
            service_request_id=serializer.validated_data.get("service_request_id"),
            reason=serializer.validated_data["reason"],
            description=serializer.validated_data["description"],
        )
        dispute = Dispute.objects.select_related(
            "opened_by",
            "order",
            "order__store",
            "service_request",
            "service_request__service",
        ).get(pk=dispute.pk)
        return Response(
            DisputeSerializer(dispute, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class DisputeDetailView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get_object(self, request, dispute_id):
        try:
            dispute = Dispute.objects.select_related(
                "opened_by",
                "order",
                "order__store",
                "order__store__owner",
                "service_request",
                "service_request__service",
                "service_request__professional",
                "service_request__professional__owner",
            ).get(pk=dispute_id)
        except Dispute.DoesNotExist as exc:
            raise NotFound("Litige introuvable.") from exc
        if not user_can_view_dispute(request.user, dispute):
            raise PermissionDenied("Accès refusé.")
        return dispute

    @extend_schema(tags=["Disputes"], summary="Détail litige", responses={200: DisputeSerializer})
    def get(self, request, dispute_id):
        dispute = self.get_object(request, dispute_id)
        return Response(DisputeSerializer(dispute, context={"request": request}).data)


class DisputeCloseView(APIView):
    permission_classes = [CanShop]

    @extend_schema(tags=["Disputes"], summary="Fermer mon litige")
    def post(self, request, dispute_id):
        dispute = close_dispute_by_client(user=request.user, dispute_id=dispute_id)
        dispute = Dispute.objects.select_related(
            "opened_by", "order", "order__store", "service_request", "service_request__service"
        ).get(pk=dispute.pk)
        return Response(DisputeSerializer(dispute, context={"request": request}).data)


class SellerDisputeListView(generics.ListAPIView):
    permission_classes = [IsSeller]
    serializer_class = DisputeSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return disputes_for_seller(self.request.user)

    @extend_schema(tags=["Seller — Disputes"], summary="Litiges concernant ma boutique / mes services")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class SellerDisputeReplyView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Disputes"],
        summary="Répondre à un litige",
        request=DisputeReplySerializer,
        responses={200: DisputeSerializer},
    )
    def post(self, request, dispute_id):
        serializer = DisputeReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dispute = reply_to_dispute(
            seller=request.user,
            dispute_id=dispute_id,
            reply=serializer.validated_data["reply"],
        )
        return Response(DisputeSerializer(dispute, context={"request": request}).data)


class AdminDisputeListView(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = DisputeSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return Dispute.objects.select_related(
            "opened_by",
            "order",
            "order__store",
            "service_request",
            "service_request__service",
        ).order_by("-created_at")

    @extend_schema(tags=["Admin — Disputes"], summary="Tous les litiges")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class AdminDisputeResolveView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(
        tags=["Admin — Disputes"],
        summary="Résoudre / rejeter / fermer un litige",
        request=DisputeAdminResolveSerializer,
        responses={200: DisputeSerializer},
    )
    def post(self, request, dispute_id):
        serializer = DisputeAdminResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dispute = resolve_dispute_admin(
            dispute_id=dispute_id,
            status=serializer.validated_data["status"],
            admin_note=serializer.validated_data.get("admin_note") or "",
        )
        return Response(DisputeSerializer(dispute, context={"request": request}).data)
