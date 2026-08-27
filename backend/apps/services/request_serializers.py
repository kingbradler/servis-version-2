"""Serializers for ServiceRequest — client / seller / admin (read-only)."""

from rest_framework import serializers
from rest_framework.exceptions import NotFound

from apps.professionals.models import ProfessionalStatus
from apps.services.models import (
    Service,
    ServiceRequest,
    ServiceRequestStatus,
    ServiceStatus,
)
from apps.stores.validators import sanitize_text, validate_phone


class ServiceRequestServiceBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.CharField()
    price = serializers.DecimalField(
        max_digits=10, decimal_places=2, allow_null=True, required=False
    )
    price_type = serializers.CharField()


class ServiceRequestProfessionalBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    display_name = serializers.CharField()
    slug = serializers.CharField()
    phone = serializers.CharField()
    whatsapp = serializers.CharField()
    city_name = serializers.CharField(required=False, allow_blank=True)


class ServiceRequestClientBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class ServiceRequestSerializer(serializers.ModelSerializer):
    service = ServiceRequestServiceBriefSerializer(read_only=True)
    professional = serializers.SerializerMethodField()
    client = ServiceRequestClientBriefSerializer(read_only=True)

    class Meta:
        model = ServiceRequest
        fields = (
            "id",
            "service",
            "client",
            "professional",
            "status",
            "message",
            "requested_date",
            "requested_time",
            "address",
            "phone",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_professional(self, obj):
        profile = obj.professional
        return {
            "id": profile.id,
            "display_name": profile.display_name,
            "slug": profile.slug,
            "phone": profile.phone,
            "whatsapp": profile.whatsapp,
            "city_name": profile.city.name if profile.city_id else "",
        }


class ServiceRequestCreateSerializer(serializers.Serializer):
    service = serializers.UUIDField()
    message = serializers.CharField(max_length=2000)
    requested_date = serializers.DateField(required=False, allow_null=True)
    requested_time = serializers.TimeField(required=False, allow_null=True)
    address = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=30)

    def validate(self, attrs):
        forbidden = {
            "professional",
            "professional_id",
            "professional_profile",
            "client",
            "client_id",
            "status",
            "id",
        }
        leaked = forbidden.intersection(self.initial_data.keys())
        if leaked:
            raise serializers.ValidationError(
                {
                    field: "Ce champ ne peut pas être défini par le client."
                    for field in leaked
                }
            )
        return attrs

    def validate_message(self, value):
        value = sanitize_text(value)
        if len(value) < 5:
            raise serializers.ValidationError("Le message est trop court.")
        return value

    def validate_address(self, value):
        value = sanitize_text(value)
        if len(value) < 3:
            raise serializers.ValidationError("L'adresse est obligatoire.")
        return value

    def validate_phone(self, value):
        value = validate_phone(value)
        if not value:
            raise serializers.ValidationError("Le téléphone est obligatoire.")
        return value

    def validate_service(self, service_id):
        try:
            service = Service.objects.select_related(
                "professional_profile", "professional_profile__owner"
            ).get(pk=service_id)
        except Service.DoesNotExist as exc:
            raise NotFound("Service introuvable.") from exc

        if service.status != ServiceStatus.ACTIVE:
            raise serializers.ValidationError(
                "Ce service n'est pas disponible pour une demande."
            )
        profile = service.professional_profile
        if profile.status != ProfessionalStatus.ACTIVE:
            raise serializers.ValidationError(
                "Ce professionnel n'est pas disponible pour le moment."
            )
        return service

    def create(self, validated_data):
        request = self.context["request"]
        service = validated_data.pop("service")
        profile = service.professional_profile

        if profile.owner_id == request.user.id:
            raise serializers.ValidationError(
                {"service": "Vous ne pouvez pas demander votre propre service."}
            )

        return ServiceRequest.objects.create(
            service=service,
            professional=profile,
            client=request.user,
            status=ServiceRequestStatus.PENDING,
            **validated_data,
        )
