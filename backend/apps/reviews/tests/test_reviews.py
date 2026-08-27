"""Review API tests — additive, does not alter existing flows."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.categories.models import Category
from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
from apps.reviews.models import Review
from apps.services.models import (
    Service,
    ServicePriceType,
    ServiceRequest,
    ServiceRequestStatus,
    ServiceStatus,
)
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


class ReviewAPITests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger-reviews", region="Nord", is_active=True
        )
        self.category = Category.objects.create(
            name="Plomberie R", slug="plomberie-r", is_active=True, order=1
        )
        self.seller = make_user("pro.reviews@servis.ma", UserRole.SELLER)
        self.client_user = make_user("client.reviews@servis.ma", UserRole.CLIENT)
        self.other_client = make_user("client.other@servis.ma", UserRole.CLIENT)
        self.admin = make_user("admin.reviews@servis.ma", UserRole.ADMIN)

        self.profile = ProfessionalProfile.objects.create(
            owner=self.seller,
            display_name="Pro Reviews",
            slug="pro-reviews",
            headline="Plombier",
            city=self.city,
            status=ProfessionalStatus.ACTIVE,
        )
        self.service = Service.objects.create(
            professional_profile=self.profile,
            name="Réparation",
            slug="reparation-reviews",
            price="100.00",
            price_type=ServicePriceType.FIXED,
            status=ServiceStatus.ACTIVE,
            category=self.category,
        )
        self.completed = ServiceRequest.objects.create(
            service=self.service,
            client=self.client_user,
            professional=self.profile,
            status=ServiceRequestStatus.COMPLETED,
            message="Merci",
            address="Tanger",
            phone="+212600000001",
        )
        self.pending = ServiceRequest.objects.create(
            service=self.service,
            client=self.client_user,
            professional=self.profile,
            status=ServiceRequestStatus.PENDING,
            message="En attente",
            address="Tanger",
            phone="+212600000002",
        )

    def test_public_summary_empty(self):
        res = self.client.get(
            reverse(
                "review-professional-summary",
                kwargs={"slug": self.profile.slug},
            )
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data["average_rating"])
        self.assertEqual(res.data["ratings_count"], 0)

    def test_cannot_review_pending_request(self):
        self.client.force_authenticate(self.client_user)
        res = self.client.post(
            reverse("review-create"),
            {
                "service_request_id": str(self.pending.id),
                "rating": 5,
                "comment": "Trop tôt",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_after_completed(self):
        self.client.force_authenticate(self.client_user)
        res = self.client.post(
            reverse("review-create"),
            {
                "service_request_id": str(self.completed.id),
                "rating": 4,
                "comment": "Bon travail",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["rating"], 4)
        self.assertEqual(Review.objects.count(), 1)

        summary = self.client.get(
            reverse(
                "review-professional-summary",
                kwargs={"slug": self.profile.slug},
            )
        )
        self.assertEqual(summary.data["ratings_count"], 1)
        self.assertEqual(summary.data["average_rating"], 4.0)

        # Duplicate blocked
        dup = self.client.post(
            reverse("review-create"),
            {
                "service_request_id": str(self.completed.id),
                "rating": 5,
            },
            format="json",
        )
        self.assertEqual(dup.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_client_cannot_review_foreign_request(self):
        self.client.force_authenticate(self.other_client)
        res = self.client.post(
            reverse("review-create"),
            {
                "service_request_id": str(self.completed.id),
                "rating": 1,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_eligible_lists_completed_without_review(self):
        self.client.force_authenticate(self.client_user)
        res = self.client.get(reverse("review-eligible"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in res.data["results"]]
        self.assertIn(str(self.completed.id), ids)

    def test_admin_can_hide_review(self):
        review = Review.objects.create(
            author=self.client_user,
            professional=self.profile,
            service_request=self.completed,
            rating=3,
            comment="Moyen",
        )
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            reverse("review-admin-visibility", kwargs={"review_id": review.id}),
            {"is_visible": False},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        review.refresh_from_db()
        self.assertFalse(review.is_visible)

        public = self.client.get(
            reverse(
                "review-professional-list",
                kwargs={"slug": self.profile.slug},
            )
        )
        self.assertEqual(public.data["count"], 0)
