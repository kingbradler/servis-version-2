"""Phase 6.6 — ServiceRequest API tests."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.categories.models import Category
from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
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


class ServiceRequestAPITests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger", region="Nord", is_active=True
        )
        self.category = Category.objects.create(
            name="Plomberie", slug="plomberie", is_active=True, order=1
        )
        self.seller_a = make_user("pro.a@servis.ma", UserRole.SELLER)
        self.seller_b = make_user("pro.b@servis.ma", UserRole.SELLER)
        self.client_a = make_user("client.a@servis.ma", UserRole.CLIENT)
        self.client_b = make_user("client.b@servis.ma", UserRole.CLIENT)
        self.admin = make_user("admin@servis.ma", UserRole.ADMIN)

        self.profile_a = ProfessionalProfile.objects.create(
            owner=self.seller_a,
            display_name="Jean Pro",
            slug="jean-pro",
            headline="Plombier",
            city=self.city,
            phone="+212612345678",
            whatsapp="+212612345678",
            status=ProfessionalStatus.ACTIVE,
        )
        self.profile_b = ProfessionalProfile.objects.create(
            owner=self.seller_b,
            display_name="Ali Pro",
            slug="ali-pro",
            headline="Électricien",
            city=self.city,
            status=ProfessionalStatus.ACTIVE,
        )
        self.service_a = Service.objects.create(
            professional_profile=self.profile_a,
            name="Réparation fuite",
            slug="reparation-fuite",
            description="Intervention",
            price="150.00",
            price_type=ServicePriceType.FIXED,
            status=ServiceStatus.ACTIVE,
            category=self.category,
        )
        self.service_archived = Service.objects.create(
            professional_profile=self.profile_a,
            name="Ancien service",
            slug="ancien-service",
            price="50.00",
            price_type=ServicePriceType.FIXED,
            status=ServiceStatus.ARCHIVED,
        )
        self.payload = {
            "service": str(self.service_a.id),
            "message": "Bonjour, j'aimerais avoir ce service.",
            "requested_date": "2026-08-20",
            "requested_time": "14:00:00",
            "address": "Rue de la Kasbah, Tanger",
            "phone": "+212698765432",
        }

    def test_unauthenticated_create_returns_401(self):
        res = self.client.post(
            reverse("service_requests:list-create"), self.payload, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_client_creates_request_ok(self):
        self.client.force_authenticate(self.client_a)
        res = self.client.post(
            reverse("service_requests:list-create"), self.payload, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], ServiceRequestStatus.PENDING)
        self.assertEqual(str(res.data["professional"]["id"]), str(self.profile_a.id))
        self.assertEqual(str(res.data["client"]["id"]), str(self.client_a.id))
        self.assertNotIn("amount", res.data)
        self.assertNotIn("payment", res.data)

    def test_missing_service_returns_404(self):
        self.client.force_authenticate(self.client_a)
        bad = {**self.payload, "service": "00000000-0000-0000-0000-000000000099"}
        res = self.client.post(
            reverse("service_requests:list-create"), bad, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_archived_service_rejected(self):
        self.client.force_authenticate(self.client_a)
        bad = {**self.payload, "service": str(self.service_archived.id)}
        res = self.client.post(
            reverse("service_requests:list-create"), bad, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_request_own_service(self):
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse("service_requests:list-create"), self.payload, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_cannot_set_professional(self):
        self.client.force_authenticate(self.client_a)
        bad = {**self.payload, "professional": str(self.profile_b.id)}
        res = self.client.post(
            reverse("service_requests:list-create"), bad, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_isolation(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            message="Demande A",
            address="Adresse A",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.client_b)
        list_res = self.client.get(reverse("service_requests:list-create"))
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        results = list_res.data.get("results", list_res.data)
        self.assertEqual(len(results), 0)

        detail = self.client.get(
            reverse("service_requests:detail", kwargs={"request_id": req.id})
        )
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_professional_isolation(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            message="Demande A",
            address="Adresse A",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.seller_b)
        list_res = self.client.get(reverse("seller_service_requests:list"))
        results = list_res.data.get("results", list_res.data)
        self.assertEqual(len(results), 0)
        detail = self.client.get(
            reverse(
                "seller_service_requests:detail", kwargs={"request_id": req.id}
            )
        )
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_pending_to_accepted(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse(
                "seller_service_requests:accept", kwargs={"request_id": req.id}
            )
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], ServiceRequestStatus.ACCEPTED)

    def test_pending_to_rejected(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse(
                "seller_service_requests:reject", kwargs={"request_id": req.id}
            )
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], ServiceRequestStatus.REJECTED)

    def test_pending_to_cancelled_by_client(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.client_a)
        res = self.client.post(
            reverse("service_requests:cancel", kwargs={"request_id": req.id})
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], ServiceRequestStatus.CANCELLED)

    def test_accepted_to_completed(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            status=ServiceRequestStatus.ACCEPTED,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse(
                "seller_service_requests:complete", kwargs={"request_id": req.id}
            )
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], ServiceRequestStatus.COMPLETED)

    def test_invalid_transition_rejected_cannot_accept(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            status=ServiceRequestStatus.REJECTED,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse(
                "seller_service_requests:accept", kwargs={"request_id": req.id}
            )
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_cannot_accept(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.client_a)
        res = self.client.post(
            reverse(
                "seller_service_requests:accept", kwargs={"request_id": req.id}
            )
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_client_cannot_reject(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.client_a)
        res = self.client.post(
            reverse(
                "seller_service_requests:reject", kwargs={"request_id": req.id}
            )
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_client_cannot_complete(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            status=ServiceRequestStatus.ACCEPTED,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.client_a)
        res = self.client.post(
            reverse(
                "seller_service_requests:complete", kwargs={"request_id": req.id}
            )
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_professional_cannot_accept(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.seller_b)
        res = self.client.post(
            reverse(
                "seller_service_requests:accept", kwargs={"request_id": req.id}
            )
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_client_cannot_cancel_accepted(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            status=ServiceRequestStatus.ACCEPTED,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.client_a)
        res = self.client.post(
            reverse("service_requests:cancel", kwargs={"request_id": req.id})
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_read_only_list(self):
        ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            message="Demande",
            address="Adresse",
            phone="+212611111111",
        )
        self.client.force_authenticate(self.admin)
        res = self.client.get(reverse("admin-service-request-list"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertEqual(len(results), 1)

    def test_archived_service_keeps_existing_request(self):
        req = ServiceRequest.objects.create(
            service=self.service_a,
            client=self.client_a,
            professional=self.profile_a,
            message="Demande historique",
            address="Adresse",
            phone="+212611111111",
        )
        self.service_a.status = ServiceStatus.ARCHIVED
        self.service_a.save(update_fields=["status", "updated_at"])
        self.assertTrue(ServiceRequest.objects.filter(pk=req.pk).exists())
        self.client.force_authenticate(self.client_a)
        res = self.client.get(
            reverse("service_requests:detail", kwargs={"request_id": req.id})
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
