"""Messaging API tests."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.messaging.models import Conversation, Message
from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
from apps.stores.models import City
from apps.users.choices import UserRole
from apps.users.models import User


def make_user(email: str, role: str) -> User:
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        first_name="Test",
        last_name="User",
        role=role,
    )


class MessagingAPITests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger-msg", region="Nord", is_active=True
        )
        self.seller = make_user("pro.msg@servis.ma", UserRole.SELLER)
        self.client_user = make_user("client.msg@servis.ma", UserRole.CLIENT)
        self.stranger = make_user("stranger.msg@servis.ma", UserRole.CLIENT)
        self.profile = ProfessionalProfile.objects.create(
            owner=self.seller,
            display_name="Pro Msg",
            slug="pro-msg",
            headline="Coach",
            city=self.city,
            status=ProfessionalStatus.ACTIVE,
        )

    def test_client_starts_conversation(self):
        self.client.force_authenticate(self.client_user)
        res = self.client.post(
            reverse("messaging-conversations"),
            {
                "professional_slug": self.profile.slug,
                "message": "Bonjour, êtes-vous disponible ?",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.count(), 1)
        self.assertEqual(Message.objects.count(), 1)

        # Idempotent second start reuses conversation
        res2 = self.client.post(
            reverse("messaging-conversations"),
            {
                "professional_slug": self.profile.slug,
                "message": "Deuxième message",
            },
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.count(), 1)
        self.assertEqual(Message.objects.count(), 2)

    def test_pro_can_reply_and_client_sees_unread(self):
        conversation = Conversation.objects.create(
            client=self.client_user, professional=self.profile
        )
        Message.objects.create(
            conversation=conversation,
            sender=self.client_user,
            body="Hello",
        )

        self.client.force_authenticate(self.seller)
        reply = self.client.post(
            reverse(
                "messaging-messages",
                kwargs={"conversation_id": conversation.id},
            ),
            {"body": "Oui, je suis dispo demain."},
            format="json",
        )
        self.assertEqual(reply.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(self.client_user)
        inbox = self.client.get(reverse("messaging-conversations"))
        self.assertEqual(inbox.status_code, status.HTTP_200_OK)
        self.assertEqual(inbox.data["results"][0]["unread_count"], 1)

        mark = self.client.post(
            reverse(
                "messaging-mark-read",
                kwargs={"conversation_id": conversation.id},
            )
        )
        self.assertEqual(mark.status_code, status.HTTP_200_OK)
        self.assertEqual(mark.data["marked_read"], 1)

        count = self.client.get(reverse("messaging-unread-count"))
        self.assertEqual(count.status_code, status.HTTP_200_OK)
        self.assertEqual(count.data["unread_count"], 0)

    def test_unread_count_endpoint(self):
        conversation = Conversation.objects.create(
            client=self.client_user, professional=self.profile
        )
        Message.objects.create(
            conversation=conversation,
            sender=self.seller,
            body="Ping",
        )
        self.client.force_authenticate(self.client_user)
        res = self.client.get(reverse("messaging-unread-count"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["unread_count"], 1)

    def test_stranger_cannot_read_conversation(self):
        conversation = Conversation.objects.create(
            client=self.client_user, professional=self.profile
        )
        self.client.force_authenticate(self.stranger)
        res = self.client.get(
            reverse(
                "messaging-conversation-detail",
                kwargs={"conversation_id": conversation.id},
            )
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_message_self(self):
        self.client.force_authenticate(self.seller)
        res = self.client.post(
            reverse("messaging-conversations"),
            {
                "professional_slug": self.profile.slug,
                "message": "Auto message",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
