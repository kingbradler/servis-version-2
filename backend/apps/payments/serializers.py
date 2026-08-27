"""Payment serializers — seller methods + client/seller payment views."""

from rest_framework import serializers

from apps.core.storage import sign_private_url
from apps.payments.models import Payment, PaymentMethod, PaymentProof, PaymentMethodType
from apps.payments.validators import sanitize_text


def _absolutize(request, url: str | None) -> str | None:
    if not url:
        return url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


class SellerPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = (
            "id",
            "type",
            "label",
            "account_name",
            "account_number",
            "instructions",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_label(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le libellé est obligatoire.")
        return value

    def validate_account_name(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le nom du bénéficiaire est obligatoire.")
        return value

    def validate_account_number(self, value):
        return sanitize_text(value)

    def validate_instructions(self, value):
        return sanitize_text(value)

    def validate_type(self, value):
        if value not in PaymentMethodType.values:
            raise serializers.ValidationError("Type de paiement invalide.")
        return value

    def validate(self, attrs):
        forbidden = {"store", "store_id", "owner", "user", "role"}
        leaked = forbidden.intersection(self.initial_data.keys())
        if leaked:
            raise serializers.ValidationError(
                {f: "Ce champ ne peut pas être défini par le client." for f in leaked}
            )
        return attrs

    def create(self, validated_data):
        store = self.context["store"]
        return PaymentMethod.objects.create(store=store, **validated_data)


class PaymentMethodPublicSerializer(serializers.ModelSerializer):
    """Exposed on payment responses — no internal ids beyond method id."""

    class Meta:
        model = PaymentMethod
        fields = (
            "id",
            "type",
            "label",
            "account_name",
            "account_number",
            "instructions",
        )
        read_only_fields = fields


class PaymentProofSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = PaymentProof
        fields = (
            "id",
            "file_url",
            "uploaded_at",
            "status",
            "rejection_reason",
        )
        read_only_fields = fields

    def get_file_url(self, obj):
        url = sign_private_url(obj.file_url)
        return _absolutize(self.context.get("request"), url)


class PaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.UUIDField(read_only=True, allow_null=True)
    service_request_id = serializers.UUIDField(read_only=True, allow_null=True)
    payment_method = PaymentMethodPublicSerializer(read_only=True)
    proofs = PaymentProofSerializer(many=True, read_only=True)
    is_paid = serializers.BooleanField(read_only=True)
    proof = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "order_id",
            "service_request_id",
            "amount",
            "currency",
            "status",
            "payment_method",
            "proof",
            "proof_uploaded_at",
            "seller_reviewed_at",
            "seller_rejection_reason",
            "proofs",
            "is_paid",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_proof(self, obj):
        url = sign_private_url(obj.proof)
        return _absolutize(self.context.get("request"), url) or ""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["order_id"] = str(instance.order_id) if instance.order_id else None
        data["service_request_id"] = (
            str(instance.service_request_id) if instance.service_request_id else None
        )
        return data


class CreateOrderPaymentSerializer(serializers.Serializer):
    payment_method_id = serializers.UUIDField()

    def validate(self, attrs):
        forbidden = {
            "amount",
            "total",
            "total_amount",
            "status",
            "store",
            "store_id",
            "seller_id",
            "user",
            "role",
            "payment_status",
        }
        leaked = forbidden.intersection(self.initial_data.keys())
        if leaked:
            raise serializers.ValidationError(
                {f: "Ce champ ne peut pas être défini par le client." for f in leaked}
            )
        return attrs


class UploadProofSerializer(serializers.Serializer):
    proof = serializers.FileField()


class RejectPaymentSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500)

    def validate_reason(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Une raison de rejet est obligatoire.")
        return value
