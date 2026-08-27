"""Billing API serializers — amounts always from Plan/BoostPackage, never client."""

from __future__ import annotations

from rest_framework import serializers

from apps.billing.models import (
    Boost,
    BoostPackage,
    BoostPayment,
    BoostTargetType,
    Plan,
    PlatformPaymentMethod,
    Subscription,
    SubscriptionPayment,
)
from apps.billing.services import (
    get_service_entitlements,
    get_store_entitlements,
)
from apps.core.storage import sign_private_url
from apps.payments.validators import validate_proof_file


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = (
            "id",
            "code",
            "name",
            "plan_type",
            "category",
            "price",
            "duration_days",
            "product_limit",
            "product_image_limit",
            "service_enabled",
            "advanced_stats",
            "visibility_level",
            "boosts_allowed",
            "sort_order",
        )


class BoostPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoostPackage
        fields = ("id", "code", "name", "duration_days", "price")


class PlatformPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformPaymentMethod
        fields = (
            "id",
            "name",
            "account_name",
            "account_number",
            "instructions",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class PlatformPaymentMethodPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformPaymentMethod
        fields = (
            "id",
            "name",
            "account_name",
            "account_number",
            "instructions",
        )


class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    payment_method = PlatformPaymentMethodPublicSerializer(read_only=True)
    proof_url = serializers.SerializerMethodField()
    plan_code = serializers.CharField(source="subscription.plan.code", read_only=True)
    plan_name = serializers.CharField(source="subscription.plan.name", read_only=True)

    class Meta:
        model = SubscriptionPayment
        fields = (
            "id",
            "subscription",
            "amount",
            "payment_method",
            "status",
            "reference",
            "proof_url",
            "submitted_at",
            "reviewed_at",
            "rejection_reason",
            "plan_code",
            "plan_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_proof_url(self, obj):
        return sign_private_url(obj.proof)


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    latest_payment = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = (
            "id",
            "plan",
            "category",
            "status",
            "starts_at",
            "expires_at",
            "activated_at",
            "cancelled_at",
            "days_remaining",
            "latest_payment",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_days_remaining(self, obj):
        from apps.billing.services import _days_remaining

        return _days_remaining(obj.expires_at)

    def get_latest_payment(self, obj):
        payment = obj.payments.order_by("-created_at").first()
        if not payment:
            return None
        return SubscriptionPaymentSerializer(payment).data


class CreateSubscriptionSerializer(serializers.Serializer):
    plan_id = serializers.UUIDField()
    payment_method_id = serializers.UUIDField(required=False, allow_null=True)


class UploadBillingProofSerializer(serializers.Serializer):
    proof = serializers.FileField()
    reference = serializers.CharField(required=False, allow_blank=True, max_length=120)

    def validate_proof(self, value):
        return validate_proof_file(value)


class RejectReasonSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(max_length=2000)


class EntitlementsSerializer(serializers.Serializer):
    store = serializers.DictField()
    services = serializers.DictField()

    @staticmethod
    def from_owner(owner):
        store = get_store_entitlements(owner)
        service = get_service_entitlements(owner)
        return {
            "store": {
                "plan_code": store.plan_code,
                "plan_name": store.plan_name,
                "product_limit": store.product_limit,
                "product_image_limit": store.product_image_limit,
                "active_product_count": store.active_product_count,
                "advanced_stats": store.advanced_stats,
                "visibility_level": store.visibility_level,
                "boosts_allowed": store.boosts_allowed,
                "subscription_id": store.subscription_id,
                "status": store.status,
                "starts_at": store.starts_at,
                "expires_at": store.expires_at,
                "days_remaining": store.days_remaining,
            },
            "services": {
                "plan_code": service.plan_code,
                "plan_name": service.plan_name,
                "has_active_subscription": service.has_active_subscription,
                "advanced_stats": service.advanced_stats,
                "visibility_level": service.visibility_level,
                "boosts_allowed": service.boosts_allowed,
                "subscription_id": service.subscription_id,
                "status": service.status,
                "starts_at": service.starts_at,
                "expires_at": service.expires_at,
                "days_remaining": service.days_remaining,
            },
        }


class BoostPaymentSerializer(serializers.ModelSerializer):
    payment_method = PlatformPaymentMethodPublicSerializer(read_only=True)
    proof_url = serializers.SerializerMethodField()

    class Meta:
        model = BoostPayment
        fields = (
            "id",
            "amount",
            "payment_method",
            "status",
            "reference",
            "proof_url",
            "submitted_at",
            "reviewed_at",
            "rejection_reason",
            "created_at",
        )
        read_only_fields = fields

    def get_proof_url(self, obj):
        return sign_private_url(obj.proof)


class BoostSerializer(serializers.ModelSerializer):
    package = BoostPackageSerializer(read_only=True)
    payment = BoostPaymentSerializer(read_only=True)
    is_active_now = serializers.SerializerMethodField()
    is_sponsored = serializers.SerializerMethodField()

    class Meta:
        model = Boost
        fields = (
            "id",
            "package",
            "target_type",
            "target_id",
            "duration_days",
            "amount",
            "status",
            "starts_at",
            "expires_at",
            "payment",
            "is_active_now",
            "is_sponsored",
            "created_at",
        )
        read_only_fields = fields

    def get_is_active_now(self, obj):
        from apps.billing.services import is_boost_active

        return is_boost_active(obj)

    def get_is_sponsored(self, obj):
        from apps.billing.services import is_boost_active

        return is_boost_active(obj)


class CreateBoostSerializer(serializers.Serializer):
    package_id = serializers.UUIDField()
    target_type = serializers.ChoiceField(choices=BoostTargetType.choices)
    target_id = serializers.UUIDField()
    payment_method_id = serializers.UUIDField()


class AdminSubscriptionPaymentSerializer(SubscriptionPaymentSerializer):
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)
    owner_phone = serializers.CharField(source="owner.phone", read_only=True)
    reviewed_by_email = serializers.SerializerMethodField()

    class Meta(SubscriptionPaymentSerializer.Meta):
        fields = SubscriptionPaymentSerializer.Meta.fields + (
            "owner_id",
            "owner_email",
            "owner_phone",
            "reviewed_by_email",
        )

    def get_reviewed_by_email(self, obj):
        return obj.reviewed_by.email if obj.reviewed_by_id else None


class AdminSubscriptionSerializer(SubscriptionSerializer):
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)

    class Meta(SubscriptionSerializer.Meta):
        fields = SubscriptionSerializer.Meta.fields + ("owner_id", "owner_email")


class AdminBoostPaymentSerializer(BoostPaymentSerializer):
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    boost = serializers.SerializerMethodField()

    class Meta(BoostPaymentSerializer.Meta):
        fields = BoostPaymentSerializer.Meta.fields + ("owner_email", "boost")

    def get_boost(self, obj):
        try:
            return {
                "id": str(obj.boost.id),
                "target_type": obj.boost.target_type,
                "target_id": str(obj.boost.target_id),
                "status": obj.boost.status,
            }
        except Boost.DoesNotExist:
            return None
