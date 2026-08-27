"""Phase 6.4 — Geolocation: validation, distance, radius filters."""

from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.geo import MAX_RADIUS_KM, haversine_km
from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
from apps.services.models import Service, ServicePriceType, ServiceStatus
from apps.stores.models import City, Store, StoreStatus
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


class HaversineUnitTests(APITestCase):
    def test_haversine_nearby_tanger(self):
        # ~2 km between nearby points in Tangier area
        d = haversine_km(35.7600, -5.8300, 35.7700, -5.8100)
        self.assertGreater(d, 1.5)
        self.assertLess(d, 3.5)

    def test_haversine_same_point(self):
        self.assertAlmostEqual(haversine_km(35.76, -5.83, 35.76, -5.83), 0.0, places=5)


class StoreGeolocationAPITests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger", region="Nord", is_active=True
        )
        self.seller_a = make_user("store.a@servis.ma", UserRole.SELLER)
        self.seller_b = make_user("store.b@servis.ma", UserRole.SELLER)
        self.store_a = Store.objects.create(
            owner=self.seller_a,
            name="Boutique A",
            slug="boutique-a",
            city=self.city,
            status=StoreStatus.ACTIVE,
            address="12 Rue Mohammed V",
            neighborhood="Centre-ville",
            latitude=Decimal("35.759500"),
            longitude=Decimal("-5.834000"),
        )
        self.store_far = Store.objects.create(
            owner=self.seller_b,
            name="Boutique Far",
            slug="boutique-far",
            city=self.city,
            status=StoreStatus.ACTIVE,
            latitude=Decimal("35.900000"),
            longitude=Decimal("-5.500000"),
        )

    def test_seller_updates_own_location(self):
        self.client.force_authenticate(self.seller_a)
        res = self.client.patch(
            reverse("seller_store:store"),
            {
                "address": "10 Avenue Hassan II",
                "neighborhood": "Malabata",
                "latitude": "35.780000",
                "longitude": "-5.800000",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["location"]["neighborhood"], "Malabata")
        self.assertAlmostEqual(float(res.data["latitude"]), 35.78, places=4)

    def test_rejects_latitude_out_of_range(self):
        self.client.force_authenticate(self.seller_a)
        res = self.client.patch(
            reverse("seller_store:store"),
            {"latitude": "200", "longitude": "-5.8"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_longitude_out_of_range(self):
        self.client.force_authenticate(self.seller_a)
        res = self.client.patch(
            reverse("seller_store:store"),
            {"latitude": "35.7", "longitude": "-300"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_latitude_without_longitude(self):
        self.store_a.latitude = None
        self.store_a.longitude = None
        self.store_a.save(update_fields=["latitude", "longitude"])
        self.client.force_authenticate(self.seller_a)
        res = self.client.patch(
            reverse("seller_store:store"),
            {"latitude": "35.7"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_longitude_without_latitude(self):
        self.store_a.latitude = None
        self.store_a.longitude = None
        self.store_a.save(update_fields=["latitude", "longitude"])
        self.client.force_authenticate(self.seller_a)
        res = self.client.patch(
            reverse("seller_store:store"),
            {"longitude": "-5.8"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_public_location_payload(self):
        res = self.client.get(reverse("stores:detail", kwargs={"slug": "boutique-a"}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        loc = res.data["location"]
        self.assertEqual(loc["city"], "Tanger")
        self.assertEqual(loc["address"], "12 Rue Mohammed V")
        self.assertIsNotNone(loc["latitude"])

    def test_radius_filter(self):
        res = self.client.get(
            reverse("stores:list"),
            {
                "latitude": "35.7595",
                "longitude": "-5.8340",
                "radius": "5",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        slugs = {r["slug"] for r in results}
        self.assertIn("boutique-a", slugs)
        self.assertNotIn("boutique-far", slugs)

    def test_ordering_distance(self):
        res = self.client.get(
            reverse("stores:list"),
            {
                "latitude": "35.7595",
                "longitude": "-5.8340",
                "ordering": "distance",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertEqual(results[0]["slug"], "boutique-a")
        self.assertIn("distance_km", results[0])

    def test_ordering_distance_without_coords(self):
        res = self.client.get(
            reverse("stores:list"),
            {"ordering": "distance"},
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_radius_too_large(self):
        res = self.client.get(
            reverse("stores:list"),
            {
                "latitude": "35.76",
                "longitude": "-5.83",
                "radius": str(MAX_RADIUS_KM + 1),
            },
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_cannot_patch_other_store_via_public(self):
        """Isolation: seller API is owner-scoped (404 if no own store)."""
        lonely = make_user("lonely@servis.ma", UserRole.SELLER)
        self.client.force_authenticate(lonely)
        res = self.client.patch(
            reverse("seller_store:store"),
            {"latitude": "35.7", "longitude": "-5.8"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class ProfessionalGeolocationAPITests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger", region="Nord", is_active=True
        )
        self.seller = make_user("pro.geo@servis.ma", UserRole.SELLER)
        self.other = make_user("pro.other@servis.ma", UserRole.SELLER)
        self.profile = ProfessionalProfile.objects.create(
            owner=self.seller,
            display_name="Pro Geo",
            slug="pro-geo",
            headline="Plombier",
            city=self.city,
            status=ProfessionalStatus.ACTIVE,
            latitude=Decimal("35.760000"),
            longitude=Decimal("-5.830000"),
            address="Rue 1",
            neighborhood="Centre",
        )
        ProfessionalProfile.objects.create(
            owner=self.other,
            display_name="Pro Far",
            slug="pro-far",
            headline="Elec",
            city=self.city,
            status=ProfessionalStatus.ACTIVE,
            latitude=Decimal("35.900000"),
            longitude=Decimal("-5.500000"),
        )
        self.service = Service.objects.create(
            professional_profile=self.profile,
            name="Débouchage",
            slug="debouchage-geo",
            price="100.00",
            price_type=ServicePriceType.FIXED,
            status=ServiceStatus.ACTIVE,
        )

    def test_professional_updates_location(self):
        self.client.force_authenticate(self.seller)
        res = self.client.patch(
            reverse("seller_professional:profile"),
            {
                "neighborhood": "Iberia",
                "latitude": "35.761000",
                "longitude": "-5.831000",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["location"]["neighborhood"], "Iberia")

    def test_other_seller_cannot_update_foreign_profile(self):
        self.client.force_authenticate(self.other)
        # PATCH updates their own profile, not seller's — verify seller coords unchanged
        before = (self.profile.latitude, self.profile.longitude)
        self.client.patch(
            reverse("seller_professional:profile"),
            {"latitude": "1.000000", "longitude": "1.000000"},
            format="json",
        )
        self.profile.refresh_from_db()
        self.assertEqual((self.profile.latitude, self.profile.longitude), before)

    def test_services_radius_and_ordering(self):
        res = self.client.get(
            reverse("services:list"),
            {
                "latitude": "35.7600",
                "longitude": "-5.8300",
                "radius": "5",
                "ordering": "distance",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["slug"], "debouchage-geo")
        self.assertIn("distance_km", results[0])
        self.assertEqual(results[0]["professional"]["location"]["city"], "Tanger")

    def test_public_professional_without_coords(self):
        bare_owner = make_user("bare@servis.ma", UserRole.SELLER)
        ProfessionalProfile.objects.create(
            owner=bare_owner,
            display_name="Sans GPS",
            slug="sans-gps",
            headline="Coach",
            city=self.city,
            status=ProfessionalStatus.ACTIVE,
        )
        res = self.client.get(reverse("professionals:detail", kwargs={"slug": "sans-gps"}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data["location"]["latitude"])
        self.assertFalse(res.data["has_coordinates"])
