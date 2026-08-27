"""Serializers for disputes."""

from __future__ import annotations

from rest_framework import serializers

from apps.disputes.models import Dispute, DisputeReason, DisputeStatus


class DisputeSerializer(serializers.ModelSerializer):
    order_id = serializers.UUIDField(source="order.id", read_only=True, allow_null=True)
    service_request_id = serializers.UUIDField(
        source="service_request.id", read_only=True, allow_null=True
    )
    opened_by_email = serializers.EmailField(source="opened_by.email", read_only=True)
    subject_label = serializers.SerializerMethodField()

    class Meta:
        model = Dispute
        fields = (
            "id",
            "order_id",
            "service_request_id",
            "opened_by_email",
            "reason",
            "description",
            "seller_reply",
            "admin_note",
            "status",
            "subject_label",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_subject_label(self, obj):
        if obj.order_id:
            name = obj.order.store_name_snapshot or (
                obj.order.store.name if obj.order.store_id else "Commande"
            )
            return f"Commande #{str(obj.order_id)[:8]} — {name}"
        if obj.service_request_id:
            sr = obj.service_request
            svc = getattr(sr, "service", None)
            name = svc.name if svc else "Service"
            return f"Demande #{str(obj.service_request_id)[:8]} — {name}"
        return "Litige"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["order_id"] = str(instance.order_id) if instance.order_id else None
        data["service_request_id"] = (
            str(instance.service_request_id) if instance.service_request_id else None
        )
        # Hide admin_note from non-admins
        request = self.context.get("request")
        role = getattr(getattr(request, "user", None), "role", None)
        if role != "ADMIN":
            data.pop("admin_note", None)
            # sellers shouldn't need admin note; clients neither
        return data


class DisputeCreateSerializer(serializers.Serializer):
    order_id = serializers.UUIDField(required=False, allow_null=True)
    service_request_id = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.ChoiceField(choices=DisputeReason.choices)
    description = serializers.CharField(min_length=10, max_length=3000)


class DisputeReplySerializer(serializers.Serializer):
    reply = serializers.CharField(min_length=5, max_length=3000)


class DisputeAdminResolveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            DisputeStatus.RESOLVED,
            DisputeStatus.REJECTED,
            DisputeStatus.CLOSED,
        ]
    )
    admin_note = serializers.CharField(
        required=False, allow_blank=True, max_length=3000, default=""
    )
