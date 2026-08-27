"""Messaging API views."""

from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.messaging.models import Conversation, Message
from apps.messaging.serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    MessageCreateSerializer,
    MessageSerializer,
    annotate_unread,
    user_can_access_conversation,
)
from apps.professionals.models import ProfessionalProfile
from apps.users.permissions import CanShop, IsAuthenticatedUser


def _conversation_qs_for_user(user):
    base = Conversation.objects.select_related("client", "professional")
    try:
        profile = ProfessionalProfile.objects.only("id").get(owner=user)
        return base.filter(Q(client=user) | Q(professional=profile))
    except ProfessionalProfile.DoesNotExist:
        return base.filter(client=user)


def _conversations_for_user(user):
    return annotate_unread(_conversation_qs_for_user(user), user).order_by(
        "-updated_at"
    )


def unread_messages_count(user) -> int:
    conv_ids = _conversation_qs_for_user(user).values_list("id", flat=True)
    return (
        Message.objects.filter(
            conversation_id__in=conv_ids,
            read_at__isnull=True,
        )
        .exclude(sender=user)
        .count()
    )


def _get_conversation_for_user(user, conversation_id) -> Conversation:
    try:
        conversation = Conversation.objects.select_related(
            "client", "professional", "professional__owner"
        ).get(id=conversation_id)
    except Conversation.DoesNotExist as exc:
        raise NotFound("Conversation introuvable.") from exc
    if not user_can_access_conversation(user, conversation):
        raise PermissionDenied("Accès refusé à cette conversation.")
    return conversation


class ConversationListCreateView(generics.ListCreateAPIView):
    permission_classes = [CanShop]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ConversationCreateSerializer
        return ConversationSerializer

    def get_queryset(self):
        return _conversations_for_user(self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        rows = list(page) if page is not None else list(queryset)
        # Simple last-message attach (works on SQLite + Postgres)
        for row in rows:
            row._last_message = row.messages.order_by("-created_at").first()
        serializer = ConversationSerializer(
            rows, many=True, context={"request": request}
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @extend_schema(tags=["Messaging"], summary="Mes conversations")
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    @extend_schema(
        tags=["Messaging"],
        summary="Démarrer / poursuivre une conversation avec un pro",
        request=ConversationCreateSerializer,
        responses={201: ConversationSerializer},
    )
    def post(self, request, *args, **kwargs):
        serializer = ConversationCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        conversation = serializer.save()
        conversation = (
            annotate_unread(
                Conversation.objects.filter(id=conversation.id), request.user
            )
            .select_related("client", "professional")
            .get()
        )
        conversation._last_message = conversation.messages.order_by(
            "-created_at"
        ).first()
        return Response(
            ConversationSerializer(
                conversation, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticatedUser]
    serializer_class = ConversationSerializer

    def get_object(self):
        conversation = _get_conversation_for_user(
            self.request.user, self.kwargs["conversation_id"]
        )
        annotated = (
            annotate_unread(
                Conversation.objects.filter(id=conversation.id), self.request.user
            )
            .select_related("client", "professional")
            .get()
        )
        annotated._last_message = annotated.messages.order_by("-created_at").first()
        return annotated

    @extend_schema(tags=["Messaging"], summary="Détail conversation")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ConversationMessageListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedUser]
    pagination_class = StandardPagination

    def get_conversation(self) -> Conversation:
        return _get_conversation_for_user(
            self.request.user, self.kwargs["conversation_id"]
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MessageCreateSerializer
        return MessageSerializer

    def get_queryset(self):
        conversation = self.get_conversation()
        return conversation.messages.select_related("sender").order_by("created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if self.request.method == "POST":
            ctx["conversation"] = self.get_conversation()
        return ctx

    @extend_schema(tags=["Messaging"], summary="Messages d'une conversation")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        tags=["Messaging"],
        summary="Envoyer un message",
        request=MessageCreateSerializer,
        responses={201: MessageSerializer},
    )
    def post(self, request, *args, **kwargs):
        conversation = self.get_conversation()
        serializer = MessageCreateSerializer(
            data=request.data,
            context={"request": request, "conversation": conversation},
        )
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationMarkReadView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(tags=["Messaging"], summary="Marquer les messages comme lus")
    def post(self, request, conversation_id):
        conversation = _get_conversation_for_user(request.user, conversation_id)
        updated = (
            conversation.messages.filter(read_at__isnull=True)
            .exclude(sender=request.user)
            .update(read_at=timezone.now())
        )
        return Response({"marked_read": updated})


class MessagingUnreadCountView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(tags=["Messaging"], summary="Nombre de messages non lus")
    def get(self, request):
        return Response({"unread_count": unread_messages_count(request.user)})
