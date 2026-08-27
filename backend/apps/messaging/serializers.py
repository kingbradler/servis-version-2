"""Serializers for messaging."""

from __future__ import annotations

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import serializers

from apps.messaging.models import Conversation, Message
from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
from apps.stores.validators import sanitize_text
from apps.users.choices import UserRole


class MessagingUserBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField(required=False)


class MessagingProfessionalBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    display_name = serializers.CharField()
    slug = serializers.CharField()
    avatar = serializers.CharField(required=False, allow_blank=True)


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(source="sender.id", read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id",
            "sender_id",
            "body",
            "created_at",
            "read_at",
            "is_mine",
        )
        read_only_fields = fields

    def get_is_mine(self, obj: Message) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.sender_id == request.user.id


class ConversationSerializer(serializers.ModelSerializer):
    client = serializers.SerializerMethodField()
    professional = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Conversation
        fields = (
            "id",
            "client",
            "professional",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_client(self, obj: Conversation):
        return MessagingUserBriefSerializer(
            {
                "id": obj.client.id,
                "first_name": obj.client.first_name,
                "last_name": obj.client.last_name,
                "email": obj.client.email,
            }
        ).data

    def get_professional(self, obj: Conversation):
        return MessagingProfessionalBriefSerializer(
            {
                "id": obj.professional.id,
                "display_name": obj.professional.display_name,
                "slug": obj.professional.slug,
                "avatar": obj.professional.avatar or "",
            }
        ).data

    def get_last_message(self, obj: Conversation):
        msg = getattr(obj, "_last_message", None)
        if msg is None:
            msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return MessageSerializer(msg, context=self.context).data


class ConversationCreateSerializer(serializers.Serializer):
    professional_slug = serializers.SlugField()
    message = serializers.CharField(min_length=1, max_length=4000)

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        try:
            professional = ProfessionalProfile.objects.select_related("owner").get(
                slug=attrs["professional_slug"],
                status=ProfessionalStatus.ACTIVE,
            )
        except ProfessionalProfile.DoesNotExist as exc:
            raise serializers.ValidationError(
                {"professional_slug": "Professionnel introuvable."}
            ) from exc

        if professional.owner_id == user.id:
            raise serializers.ValidationError(
                {"professional_slug": "Vous ne pouvez pas vous écrire à vous-même."}
            )

        attrs["professional"] = professional
        attrs["message"] = sanitize_text(attrs["message"])
        if not attrs["message"]:
            raise serializers.ValidationError({"message": "Message vide."})
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        professional = validated_data["professional"]
        conversation, _created = Conversation.objects.get_or_create(
            client=user,
            professional=professional,
        )
        body = validated_data["message"]
        Message.objects.create(
            conversation=conversation,
            sender=user,
            body=body,
        )
        Conversation.objects.filter(id=conversation.id).update(updated_at=timezone.now())
        conversation.refresh_from_db()
        from apps.notifications.services import notify_new_message

        notify_new_message(
            conversation=conversation, sender=user, message_preview=body
        )
        return conversation


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(min_length=1, max_length=4000)

    def validate_body(self, value: str) -> str:
        cleaned = sanitize_text(value)
        if not cleaned:
            raise serializers.ValidationError("Message vide.")
        return cleaned

    def create(self, validated_data):
        conversation: Conversation = self.context["conversation"]
        user = self.context["request"].user
        body = validated_data["body"]
        message = Message.objects.create(
            conversation=conversation,
            sender=user,
            body=body,
        )
        Conversation.objects.filter(id=conversation.id).update(updated_at=timezone.now())
        from apps.notifications.services import notify_new_message

        notify_new_message(
            conversation=conversation, sender=user, message_preview=body
        )
        return message


def annotate_unread(qs, user):
    return qs.annotate(
        unread_count=Count(
            "messages",
            filter=Q(messages__read_at__isnull=True) & ~Q(messages__sender=user),
        )
    )


def user_can_access_conversation(user, conversation: Conversation) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if conversation.client_id == user.id:
        return True
    try:
        profile = ProfessionalProfile.objects.only("id").get(owner=user)
    except ProfessionalProfile.DoesNotExist:
        return False
    return conversation.professional_id == profile.id
