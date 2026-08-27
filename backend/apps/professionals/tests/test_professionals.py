"""Phase 6.1 — ProfessionalProfile API tests."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

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


class ProfessionalProfileAPITests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger", region="Nord", is_active=True
        )
        self.seller = make_user("pro@servis.ma", UserRole.SELLER)
        self.other = make_user("other@servis.ma", UserRole.SELLER)
        self.client_user = make_user("client@servis.ma", UserRole.CLIENT)
        self.admin = make_user("admin@servis.ma", UserRole.ADMIN)
        self.payload = {
            "display_name": "Jean Plomberie",
            "headline": "Plombier",
            "bio": "Installation et réparation",
            "city": str(self.city.id),
            "phone": "+212612345678",
            "whatsapp": "+212612345678",
        }

    def test_seller_creates_and_submits_profile(self):
        self.client.force_authenticate(self.seller)
        url = reverse("seller_professional:profile")
        res = self.client.post(url, self.payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], ProfessionalStatus.DRAFT)
        self.assertTrue(res.data["slug"])

        submit = self.client.post(reverse("seller_professional:profile-submit"))
        self.assertEqual(submit.status_code, status.HTTP_200_OK)
        self.assertEqual(submit.data["status"], ProfessionalStatus.PENDING)

    def test_seller_can_have_store_and_professional_profile(self):
        from apps.stores.models import Store, StoreStatus

        Store.objects.create(
            owner=self.seller,
            name="Boutique Jean",
            slug="boutique-jean",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.client.force_authenticate(self.seller)
        res = self.client.post(
            reverse("seller_professional:profile"), self.payload, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(hasattr(self.seller, "store"))
        self.assertTrue(
            ProfessionalProfile.objects.filter(owner=self.seller).exists()
        )

    def test_client_cannot_create_professional_profile(self):
        self.client.force_authenticate(self.client_user)
        res = self.client.post(
            reverse("seller_professional:profile"), self.payload, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_lists_only_active(self):
        draft = ProfessionalProfile.objects.create(
            owner=self.seller,
            display_name="Draft Pro",
            slug="draft-pro",
            headline="Plombier",
            city=self.city,
            status=ProfessionalStatus.DRAFT,
        )
        active_owner = self.other
        ProfessionalProfile.objects.create(
            owner=active_owner,
            display_name="Active Pro",
            slug="active-pro",
            headline="Électricien",
            city=self.city,
            status=ProfessionalStatus.ACTIVE,
        )
        res = self.client.get(reverse("professionals:list"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data["results"] if "results" in res.data else res.data
        slugs = {item["slug"] for item in results}
        self.assertIn("active-pro", slugs)
        self.assertNotIn(draft.slug, slugs)

    def test_admin_activates_profile(self):
        profile = ProfessionalProfile.objects.create(
            owner=self.seller,
            display_name="Jean",
            slug="jean-plombier",
            headline="Plombier",
            city=self.city,
            status=ProfessionalStatus.PENDING,
        )
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            reverse("admin-professional-detail", kwargs={"id": profile.id}),
            {"status": ProfessionalStatus.ACTIVE},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        profile.refresh_from_db()
        self.assertEqual(profile.status, ProfessionalStatus.ACTIVE)

    def test_rejects_partial_coordinates(self):
        self.client.force_authenticate(self.seller)
        bad = {**self.payload, "latitude": "35.759500"}
        res = self.client.post(
            reverse("seller_professional:profile"), bad, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_exposes_capabilities_flags(self):
        ProfessionalProfile.objects.create(
            owner=self.seller,
            display_name="Jean",
            slug="jean-flags",
            headline="Plombier",
            city=self.city,
            status=ProfessionalStatus.DRAFT,
        )
        self.client.force_authenticate(self.seller)
        res = self.client.get(reverse("auth:me"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["can_shop"])
        self.assertTrue(res.data["has_professional_profile"])
        self.assertFalse(res.data["has_store"])

    def test_seller_can_access_cart(self):
        self.client.force_authenticate(self.seller)
        res = self.client.get(reverse("cart:detail"))
        self.assertIn(
            res.status_code,
            (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND),
        )
        # Must not be forbidden — professionnels can shop
        self.assertNotEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class CanShopPermissionTests(APITestCase):
    def test_seller_can_shop_property(self):
        seller = make_user("shop.seller@servis.ma", UserRole.SELLER)
        client = make_user("shop.client@servis.ma", UserRole.CLIENT)
        admin = make_user("shop.admin@servis.ma", UserRole.ADMIN)
        self.assertTrue(seller.can_shop)
        self.assertTrue(client.can_shop)
        self.assertFalse(admin.can_shop)
