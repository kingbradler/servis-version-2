"""Serializers for authentication and user profile."""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.choices import UserRole
from apps.users.models import User


class UserMeSerializer(serializers.ModelSerializer):
    """Public profile fields for the authenticated user — never exposes secrets."""

    has_store = serializers.SerializerMethodField()
    has_professional_profile = serializers.SerializerMethodField()
    can_shop = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "avatar",
            "is_verified",
            "can_shop",
            "has_store",
            "has_professional_profile",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_has_store(self, obj) -> bool:
        from apps.stores.models import Store

        return Store.objects.filter(owner_id=obj.pk).exists()

    def get_has_professional_profile(self, obj) -> bool:
        from apps.professionals.models import ProfessionalProfile

        return ProfessionalProfile.objects.filter(owner_id=obj.pk).exists()


class UserMeUpdateSerializer(serializers.ModelSerializer):
    """Authenticated user may update profile fields — never role/email/password."""

    class Meta:
        model = User
        fields = ("first_name", "last_name", "phone", "avatar")

    def validate_first_name(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Le prénom est obligatoire.")
        return value

    def validate_last_name(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Le nom est obligatoire.")
        return value

    def validate_phone(self, value: str) -> str:
        from apps.stores.validators import validate_phone

        return validate_phone(value or "")

    def validate_avatar(self, value: str) -> str:
        return (value or "").strip()

    def validate(self, attrs):
        forbidden = {
            "email",
            "password",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "is_verified",
        }
        for key in forbidden:
            if key in self.initial_data:
                raise serializers.ValidationError(
                    {key: "Ce champ ne peut pas être modifié via cet endpoint."}
                )
        return attrs


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin user list/detail — no secrets."""

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "avatar",
            "is_active",
            "is_verified",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Admin may activate/deactivate and adjust role (with safeguards)."""

    class Meta:
        model = User
        fields = ("is_active", "role", "first_name", "last_name", "phone")
        extra_kwargs = {
            "first_name": {"required": False},
            "last_name": {"required": False},
            "phone": {"required": False},
            "is_active": {"required": False},
            "role": {"required": False},
        }

    def validate_role(self, value):
        if value not in UserRole.values:
            raise serializers.ValidationError("Rôle invalide.")
        return value

    def validate_phone(self, value: str) -> str:
        from apps.stores.validators import validate_phone

        return validate_phone(value or "")

    def validate(self, attrs):
        request = self.context.get("request")
        instance: User = self.instance
        if request and instance and request.user.pk == instance.pk:
            if "is_active" in attrs and attrs["is_active"] is False:
                raise serializers.ValidationError(
                    {"is_active": "Vous ne pouvez pas désactiver votre propre compte."}
                )
            if "role" in attrs and attrs["role"] != UserRole.ADMIN:
                raise serializers.ValidationError(
                    {"role": "Vous ne pouvez pas retirer votre propre rôle ADMIN."}
                )
        forbidden = {"email", "password", "is_staff", "is_superuser", "is_verified"}
        for key in forbidden:
            if key in self.initial_data:
                raise serializers.ValidationError(
                    {key: "Ce champ ne peut pas être modifié via cet endpoint."}
                )
        return attrs


class BaseRegisterSerializer(serializers.Serializer):
    """Shared registration fields and validation."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})
    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=True, allow_blank=False)

    default_role = UserRole.CLIENT

    def validate_email(self, value: str) -> str:
        email = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Cette adresse e-mail est déjà utilisée.")
        return email

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def validate_phone(self, value: str) -> str:
        from apps.stores.validators import validate_phone

        cleaned = validate_phone(value or "")
        if not cleaned:
            raise serializers.ValidationError(
                "Le numéro WhatsApp est obligatoire (ex. +212612345678)."
            )
        return cleaned

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Les mots de passe ne correspondent pas."}
            )

        role = self.initial_data.get("role")
        if role is not None:
            if role == UserRole.ADMIN:
                raise serializers.ValidationError(
                    {"role": "Le rôle ADMIN ne peut pas être défini via l'inscription."}
                )
            raise serializers.ValidationError(
                {"role": "Le rôle ne peut pas être défini via l'inscription."}
            )

        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        return User.objects.create_user(
            **validated_data,
            password=password,
            role=self.default_role,
        )


class ClientRegisterSerializer(BaseRegisterSerializer):
    """Register a new client account — role forced to CLIENT."""

    default_role = UserRole.CLIENT


class SellerRegisterSerializer(BaseRegisterSerializer):
    """Register a new seller account — role forced to SELLER, no store yet."""

    default_role = UserRole.SELLER


class VerifyEmailSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, attrs):
        from apps.users.email_verification import (
            decode_uid,
            email_verification_token,
        )

        uid = decode_uid(attrs["uid"])
        if not uid:
            raise serializers.ValidationError(
                {"detail": "Lien de confirmation invalide."}
            )
        try:
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError) as exc:
            raise serializers.ValidationError(
                {"detail": "Lien de confirmation invalide."}
            ) from exc

        if user.is_verified:
            attrs["user"] = user
            attrs["already_verified"] = True
            return attrs

        if not email_verification_token.check_token(user, attrs["token"]):
            raise serializers.ValidationError(
                {"detail": "Lien de confirmation invalide ou expiré."}
            )

        attrs["user"] = user
        attrs["already_verified"] = False
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        if not self.validated_data.get("already_verified"):
            user.mark_email_verified()
        return user


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context.get("request")
        user = None
        if request and getattr(request, "user", None) and request.user.is_authenticated:
            user = request.user
        else:
            email = User.objects.normalize_email(attrs.get("email") or "")
            if email:
                user = User.objects.filter(email__iexact=email).first()

        if user and user.is_verified:
            attrs["user"] = None
        else:
            attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        return self.validated_data.get("user")


class LoginSerializer(serializers.Serializer):
    """Authenticate with email and password."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        email = User.objects.normalize_email(attrs["email"])
        password = attrs["password"]

        user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=password,
        )

        if user is None:
            raise serializers.ValidationError(
                {"detail": "Identifiants invalides."},
                code="invalid_credentials",
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "Ce compte est désactivé."},
                code="inactive_account",
            )

        attrs["user"] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Request a reset email — always succeeds from the client's POV."""

    email = serializers.EmailField()

    def validate(self, attrs):
        email = User.objects.normalize_email(attrs["email"])
        attrs["user"] = User.objects.filter(
            email__iexact=email, is_active=True
        ).first()
        return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(
        write_only=True, min_length=8, style={"input_type": "password"}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def validate(self, attrs):
        from apps.users.password_reset import decode_uid, password_reset_token

        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Les mots de passe ne correspondent pas."}
            )

        uid = decode_uid(attrs["uid"])
        if not uid:
            raise serializers.ValidationError(
                {"detail": "Lien de réinitialisation invalide."}
            )
        try:
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError) as exc:
            raise serializers.ValidationError(
                {"detail": "Lien de réinitialisation invalide."}
            ) from exc

        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "Ce compte est désactivé."}
            )

        if not password_reset_token.check_token(user, attrs["token"]):
            raise serializers.ValidationError(
                {"detail": "Lien de réinitialisation invalide ou expiré."}
            )

        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["password"])
        user.save(update_fields=["password"])
        return user
