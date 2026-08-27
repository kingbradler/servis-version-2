from django.contrib import admin

from apps.messaging.models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("id", "sender", "body", "created_at", "read_at")
    can_delete = False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "professional", "updated_at", "created_at")
    search_fields = (
        "client__email",
        "professional__display_name",
        "professional__slug",
    )
    readonly_fields = ("id", "created_at", "updated_at")
    raw_id_fields = ("client", "professional")
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at", "read_at")
    list_filter = ("created_at",)
    search_fields = ("body", "sender__email")
    readonly_fields = ("id", "created_at")
    raw_id_fields = ("conversation", "sender")
