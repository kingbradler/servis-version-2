"""Site feedback API tests."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import SiteFeedback, SiteFeedbackKind


class SiteFeedbackAPITests(APITestCase):
    def test_create_message(self):
        res = self.client.post(
            reverse("site-feedback-create"),
            {
                "kind": SiteFeedbackKind.MESSAGE,
                "name": "Sara",
                "email": "sara@example.com",
                "body": "Super plateforme, bravo à l'équipe.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["ok"])
        self.assertEqual(SiteFeedback.objects.count(), 1)

    def test_create_recommendation_without_email(self):
        res = self.client.post(
            reverse("site-feedback-create"),
            {
                "kind": SiteFeedbackKind.RECOMMENDATION,
                "name": "Youssef",
                "body": "Je recommande SERVIS à tous les étudiants de Tanger.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        fb = SiteFeedback.objects.get()
        self.assertEqual(fb.kind, SiteFeedbackKind.RECOMMENDATION)

    def test_rejects_short_body(self):
        res = self.client.post(
            reverse("site-feedback-create"),
            {"name": "A", "body": "ok"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
