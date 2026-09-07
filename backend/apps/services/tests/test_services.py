"""Phase 6.2 — Service API tests."""

from datetime import timedelta
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.billing.models import (
    Plan,
    PlanCategory,
    PlanType,
    Subscription,
    SubscriptionStatus,
)
from apps.categories.models import Category
from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
from apps.services.models import Service, ServicePriceType, ServiceStatus
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


def make_jpeg(name="pic.jpg") -> SimpleUploadedFile:
    buf = BytesIO()
    Image.new("RGB", (32, 32), color=(200, 80, 40)).save(buf, format="JPEG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


def grant_service_plan(user) -> Subscription:
    plan = Plan.objects.get(code=PlanType.SERVICE_STANDARD)
    now = timezone.now()
    return Subscription.objects.create(
        owner=user,
        plan=plan,
        category=PlanCategory.SERVICE,
        status=SubscriptionStatus.ACTIVE,
        starts_at=now - timedelta(days=1),
        activated_at=now - timedelta(days=1),
        expires_at=now + timedelta(days=29),
    )


class ServiceAPITests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger", region="Nord", is_active=True
        )
        self.category = Category.objects.create(
            name="Plomberie", slug="plomberie", is_active=True, order=1
        )
        self.seller_a = make_user("pro.a@servis.ma", UserRole.SELLER)
        self.seller_b = make_user("pro.b@servis.ma", UserRole.SELLER)
        self.client_user = make_user("client@servis.ma", UserRole.CLIENT)
        self.admin = make_user("admin@servis.ma", UserRole.ADMIN)

        self.profile_a = ProfessionalProfile.objects.create(
            owner=self.seller_a,
            display_name="Jean Pro",
            slug="jean-pro",
            headline="Plombier",
            city=self.city,
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
        self.payload = {
            "name": "Réparation fuite",
            "description": "Intervention rapide",
            "category": str(self.category.id),
            "price": "100.00",
            "price_type": ServicePriceType.FROM,
            "duration": "1 h",
        }

    def test_client_cannot_create_service(self):
        self.client.force_authenticate(self.client_user)
        res = self.client.post(
            reverse("seller_services:list-create"), self.payload, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_creates_service_as_draft(self):
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse("seller_services:list-create"), self.payload, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], ServiceStatus.DRAFT)
        self.assertEqual(res.data["price_type"], ServicePriceType.FROM)

    def test_rejects_client_owned_fields(self):
        self.client.force_authenticate(self.seller_a)
        bad = {
            **self.payload,
            "status": ServiceStatus.ACTIVE,
            "professional_profile": str(self.profile_b.id),
            "owner": str(self.seller_b.id),
        }
        res = self.client.post(
            reverse("seller_services:list-create"), bad, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_isolation_between_professionals(self):
        service = Service.objects.create(
            professional_profile=self.profile_a,
            name="Service A",
            slug="service-a",
            price="50.00",
            price_type=ServicePriceType.FIXED,
            status=ServiceStatus.DRAFT,
        )
        self.client.force_authenticate(self.seller_b)
        res = self.client.get(
            reverse("seller_services:detail", kwargs={"service_id": service.id})
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_slug_unique_per_professional(self):
        Service.objects.create(
            professional_profile=self.profile_a,
            name="Plomberie",
            slug="plomberie",
            price="80.00",
            status=ServiceStatus.DRAFT,
        )
        Service.objects.create(
            professional_profile=self.profile_b,
            name="Plomberie",
            slug="plomberie",
            price="90.00",
            status=ServiceStatus.DRAFT,
        )
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse("seller_services:list-create"),
            {**self.payload, "name": "Plomberie"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(res.data["slug"], "plomberie")

    def test_publish_requires_active_profile(self):
        self.profile_a.status = ProfessionalStatus.DRAFT
        self.profile_a.save(update_fields=["status"])
        service = Service.objects.create(
            professional_profile=self.profile_a,
            name="Draft svc",
            slug="draft-svc",
            price="40.00",
            status=ServiceStatus.DRAFT,
        )
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse("seller_services:publish", kwargs={"service_id": service.id})
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_publish_and_public_visibility(self):
        grant_service_plan(self.seller_a)
        service = Service.objects.create(
            professional_profile=self.profile_a,
            name="Visible",
            slug="visible",
            price="120.00",
            price_type=ServicePriceType.FIXED,
            status=ServiceStatus.DRAFT,
            category=self.category,
        )
        self.client.force_authenticate(self.seller_a)
        pub = self.client.post(
            reverse("seller_services:publish", kwargs={"service_id": service.id})
        )
        self.assertEqual(pub.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(None)
        listing = self.client.get(reverse("services:list"))
        results = listing.data.get("results", listing.data)
        ids = {item["id"] for item in results}
        self.assertIn(str(service.id), ids)

        detail = self.client.get(
            reverse("services:detail", kwargs={"service_id": service.id})
        )
        self.assertEqual(detail.status_code, status.HTTP_200_OK)

    def test_archived_and_suspended_excluded_from_public(self):
        archived = Service.objects.create(
            professional_profile=self.profile_a,
            name="Archived",
            slug="archived",
            price="10.00",
            status=ServiceStatus.ARCHIVED,
        )
        suspended_owner = make_user("sus@servis.ma", UserRole.SELLER)
        sus_profile = ProfessionalProfile.objects.create(
            owner=suspended_owner,
            display_name="Sus",
            slug="sus-pro",
            headline="X",
            city=self.city,
            status=ProfessionalStatus.SUSPENDED,
        )
        hidden = Service.objects.create(
            professional_profile=sus_profile,
            name="Hidden",
            slug="hidden",
            price="20.00",
            status=ServiceStatus.ACTIVE,
        )
        res = self.client.get(reverse("services:list"))
        results = res.data.get("results", res.data)
        ids = {item["id"] for item in results}
        self.assertNotIn(str(archived.id), ids)
        self.assertNotIn(str(hidden.id), ids)

    def test_archive_endpoint(self):
        service = Service.objects.create(
            professional_profile=self.profile_a,
            name="To archive",
            slug="to-archive",
            price="55.00",
            status=ServiceStatus.ACTIVE,
        )
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse("seller_services:archive", kwargs={"service_id": service.id})
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], ServiceStatus.ARCHIVED)

    def test_cannot_republish_archived_directly(self):
        service = Service.objects.create(
            professional_profile=self.profile_a,
            name="Dead",
            slug="dead",
            price="55.00",
            status=ServiceStatus.ARCHIVED,
        )
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse("seller_services:publish", kwargs={"service_id": service.id})
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filters_search_category_price(self):
        Service.objects.create(
            professional_profile=self.profile_a,
            name="Fuite urgente",
            slug="fuite",
            price="150.00",
            status=ServiceStatus.ACTIVE,
            category=self.category,
        )
        Service.objects.create(
            professional_profile=self.profile_b,
            name="Autre",
            slug="autre",
            price="30.00",
            status=ServiceStatus.ACTIVE,
        )
        res = self.client.get(
            reverse("services:list"),
            {
                "search": "fuite",
                "category": "plomberie",
                "city": "tanger",
                "min_price": "100",
                "max_price": "200",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["slug"], "fuite")

    def test_quote_allows_null_price(self):
        self.client.force_authenticate(self.seller_a)
        res = self.client.post(
            reverse("seller_services:list-create"),
            {
                "name": "Dev web",
                "price_type": ServicePriceType.QUOTE,
                "description": "Sur devis",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(res.data["price"])

    def test_images_limit(self):
        service = Service.objects.create(
            professional_profile=self.profile_a,
            name="With images",
            slug="with-images",
            price="70.00",
            status=ServiceStatus.DRAFT,
        )
        self.client.force_authenticate(self.seller_a)
        url = reverse("seller_services:images", kwargs={"service_id": service.id})
        for i in range(Service.MAX_IMAGES):
            res = self.client.post(
                url, {"image": make_jpeg(f"i{i}.jpg")}, format="multipart"
            )
            self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        overflow = self.client.post(
            url, {"image": make_jpeg("extra.jpg")}, format="multipart"
        )
        self.assertEqual(overflow.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_professional_profile(self):
        seller = make_user("noprofile@servis.ma", UserRole.SELLER)
        self.client.force_authenticate(seller)
        res = self.client.post(
            reverse("seller_services:list-create"), self.payload, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_archive(self):
        service = Service.objects.create(
            professional_profile=self.profile_a,
            name="Admin archive",
            slug="admin-archive",
            price="40.00",
            status=ServiceStatus.ACTIVE,
        )
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            reverse("admin-service-detail", kwargs={"id": service.id}),
            {"status": ServiceStatus.ARCHIVED},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        service.refresh_from_db()
        self.assertEqual(service.status, ServiceStatus.ARCHIVED)
