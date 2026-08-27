"""ServiceRequest API views — client / seller / admin (Phase 6.6)."""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.professionals.models import ProfessionalProfile
from apps.services.models import ServiceRequest, ServiceRequestStatus
from apps.services.request_serializers import (
    ServiceRequestCreateSerializer,
    ServiceRequestSerializer,
)
from apps.services.request_transitions import assert_request_transition
from apps.users.permissions import CanShop, IsAdminRole, IsSeller


def _client_queryset(user):
    return ServiceRequest.objects.filter(client=user).select_related(
        "service",
        "professional",
        "professional__city",
        "client",
    )


def _seller_queryset(user):
    try:
        profile = ProfessionalProfile.objects.get(owner=user)
    except ProfessionalProfile.DoesNotExist:
        return ServiceRequest.objects.none()
    return ServiceRequest.objects.filter(professional=profile).select_related(
        "service",
        "professional",
        "professional__city",
        "client",
    )


class ClientServiceRequestListCreateView(generics.ListCreateAPIView):
    permission_classes = [CanShop]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ServiceRequestCreateSerializer
        return ServiceRequestSerializer

    def get_queryset(self):
        return _client_queryset(self.request.user)

    @extend_schema(
        tags=["Service Requests"],
        summary="Mes demandes de service / créer une demande",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        tags=["Service Requests"],
        summary="Créer une demande de service (sans paiement)",
        request=ServiceRequestCreateSerializer,
        responses={201: ServiceRequestSerializer},
    )
    def post(self, request, *args, **kwargs):
        serializer = ServiceRequestCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(
            ServiceRequestSerializer(obj).data,
            status=status.HTTP_201_CREATED,
        )


class ClientServiceRequestDetailView(generics.RetrieveAPIView):
    permission_classes = [CanShop]
    serializer_class = ServiceRequestSerializer
    lookup_field = "id"
    lookup_url_kwarg = "request_id"

    def get_queryset(self):
        return _client_queryset(self.request.user)

    @extend_schema(tags=["Service Requests"], summary="Détail d'une demande (client)")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ClientServiceRequestCancelView(APIView):
    permission_classes = [CanShop]

    @extend_schema(
        tags=["Service Requests"],
        summary="Annuler une demande PENDING",
        responses={200: ServiceRequestSerializer},
    )
    def post(self, request, request_id):
        try:
            obj = _client_queryset(request.user).get(pk=request_id)
        except ServiceRequest.DoesNotExist as exc:
            raise NotFound("Demande introuvable.") from exc

        assert_request_transition(
            obj.status, ServiceRequestStatus.CANCELLED, actor="client"
        )
        obj.status = ServiceRequestStatus.CANCELLED
        obj.save(update_fields=["status", "updated_at"])
        return Response(ServiceRequestSerializer(obj).data)


class SellerServiceRequestListView(generics.ListAPIView):
    permission_classes = [IsSeller]
    serializer_class = ServiceRequestSerializer

    def get_queryset(self):
        return _seller_queryset(self.request.user)

    @extend_schema(
        tags=["Seller — Service Requests"],
        summary="Demandes reçues sur mes services",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class SellerServiceRequestDetailView(generics.RetrieveAPIView):
    permission_classes = [IsSeller]
    serializer_class = ServiceRequestSerializer
    lookup_field = "id"
    lookup_url_kwarg = "request_id"

    def get_queryset(self):
        return _seller_queryset(self.request.user)

    @extend_schema(
        tags=["Seller — Service Requests"],
        summary="Détail d'une demande (professionnel)",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


def _seller_transition(request, request_id, target: str):
    try:
        obj = _seller_queryset(request.user).get(pk=request_id)
    except ServiceRequest.DoesNotExist as exc:
        raise NotFound("Demande introuvable.") from exc
    assert_request_transition(obj.status, target, actor="professional")
    obj.status = target
    obj.save(update_fields=["status", "updated_at"])
    return Response(ServiceRequestSerializer(obj).data)


class SellerServiceRequestAcceptView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Service Requests"], summary="Accepter (PENDING)")
    def post(self, request, request_id):
        return _seller_transition(
            request, request_id, ServiceRequestStatus.ACCEPTED
        )


class SellerServiceRequestRejectView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Service Requests"], summary="Refuser (PENDING)")
    def post(self, request, request_id):
        return _seller_transition(
            request, request_id, ServiceRequestStatus.REJECTED
        )


class SellerServiceRequestCompleteView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Service Requests"],
        summary="Marquer terminée (ACCEPTED → COMPLETED)",
    )
    def post(self, request, request_id):
        return _seller_transition(
            request, request_id, ServiceRequestStatus.COMPLETED
        )


class AdminServiceRequestListView(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = ServiceRequestSerializer
    queryset = ServiceRequest.objects.select_related(
        "service",
        "professional",
        "professional__city",
        "client",
    ).all()

    @extend_schema(
        tags=["Admin — Service Requests"],
        summary="Liste admin (lecture seule)",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class AdminServiceRequestDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = ServiceRequestSerializer
    lookup_field = "id"
    lookup_url_kwarg = "request_id"
    queryset = ServiceRequest.objects.select_related(
        "service",
        "professional",
        "professional__city",
        "client",
    ).all()

    @extend_schema(
        tags=["Admin — Service Requests"],
        summary="Détail admin (lecture seule)",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
