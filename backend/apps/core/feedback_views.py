"""Public site feedback (footer form)."""

from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.core.models import SiteFeedback, SiteFeedbackKind
from apps.stores.validators import sanitize_text


class SiteFeedbackCreateSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(
        choices=SiteFeedbackKind.values,
        default=SiteFeedbackKind.MESSAGE,
    )
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    body = serializers.CharField(min_length=5, max_length=3000)

    def validate_name(self, value: str) -> str:
        cleaned = sanitize_text(value)
        if not cleaned:
            raise serializers.ValidationError("Nom requis.")
        return cleaned[:120]

    def validate_body(self, value: str) -> str:
        cleaned = sanitize_text(value)
        if len(cleaned) < 5:
            raise serializers.ValidationError("Message trop court.")
        return cleaned

    def create(self, validated_data):
        return SiteFeedback.objects.create(
            kind=validated_data["kind"],
            name=validated_data["name"],
            email=(validated_data.get("email") or "").strip(),
            body=validated_data["body"],
        )


class SiteFeedbackCreateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Feedback"],
        summary="Envoyer un message ou une recommandation (footer)",
        request=SiteFeedbackCreateSerializer,
        responses={201: dict},
    )
    def post(self, request):
        serializer = SiteFeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback = serializer.save()
        return Response(
            {
                "id": str(feedback.id),
                "ok": True,
                "message": "Merci — votre message a bien été reçu.",
            },
            status=status.HTTP_201_CREATED,
        )
