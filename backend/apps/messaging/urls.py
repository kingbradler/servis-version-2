"""Messaging URL routes."""

from django.urls import path

from apps.messaging.views import (
    ConversationDetailView,
    ConversationListCreateView,
    ConversationMarkReadView,
    ConversationMessageListCreateView,
    MessagingUnreadCountView,
)

urlpatterns = [
    path(
        "unread-count/",
        MessagingUnreadCountView.as_view(),
        name="messaging-unread-count",
    ),
    path(
        "conversations/",
        ConversationListCreateView.as_view(),
        name="messaging-conversations",
    ),
    path(
        "conversations/<uuid:conversation_id>/",
        ConversationDetailView.as_view(),
        name="messaging-conversation-detail",
    ),
    path(
        "conversations/<uuid:conversation_id>/messages/",
        ConversationMessageListCreateView.as_view(),
        name="messaging-messages",
    ),
    path(
        "conversations/<uuid:conversation_id>/read/",
        ConversationMarkReadView.as_view(),
        name="messaging-mark-read",
    ),
]
