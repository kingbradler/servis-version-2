"""Notification API — list, unread count, mark read."""

from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.notifications.models import Notification
from apps.users.permissions import IsAuthenticatedUser


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "type",
            "title",
            "body",
            "link",
            "is_read",
            "created_at",
        )
        read_only_fields = fields


class NotificationListView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(tags=["Notifications"], summary="Mes notifications")
    def get(self, request):
        qs = Notification.objects.filter(user=request.user).order_by("-created_at")
        unread_only = request.query_params.get("unread")
        if unread_only in ("1", "true", "yes"):
            qs = qs.filter(is_read=False)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        data = NotificationSerializer(page, many=True).data
        return paginator.get_paginated_response(data)


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(tags=["Notifications"], summary="Nombre de non lues")
    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count})


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(tags=["Notifications"], summary="Marquer une notification comme lue")
    def post(self, request, notification_id):
        updated = Notification.objects.filter(
            id=notification_id, user=request.user, is_read=False
        ).update(is_read=True)
        if not updated and not Notification.objects.filter(
            id=notification_id, user=request.user
        ).exists():
            return Response({"detail": "Notification introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"ok": True})


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(tags=["Notifications"], summary="Tout marquer comme lu")
    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"ok": True})
