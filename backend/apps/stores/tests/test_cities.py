"""Tests for City model and APIs."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.stores.models import City
from apps.users.choices import UserRole

User = get_user_model()
PASSWORD = "SecurePass123!"


def make_user(email, role):
    return User.objects.create_user(
        email=email,
        password=PASSWORD,
        first_name="T",
        last_name="U",
        role=role,
    )


class CityModelTests(APITestCase):
    def test_slug_unique(self):
        City.objects.create(name="Tanger", slug="tanger", region="R1")
        with self.assertRaises(Exception):
            City.objects.create(name="Autre", slug="tanger", region="R1")


class CityPublicAPITests(APITestCase):
    def setUp(self):
        self.active = City.objects.create(
            name="Tanger", slug="tanger", region="Tanger-Tétouan-Al Hoceïma", is_active=True
        )
        self.inactive = City.objects.create(
            name="Rabat", slug="rabat", region="Rabat-Salé-Kénitra", is_active=False
        )

    def test_list_only_active(self):
        url = reverse("cities:list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [c["slug"] for c in response.data]
        self.assertIn("tanger", slugs)
        self.assertNotIn("rabat", slugs)

    def test_detail_active(self):
        url = reverse("cities:detail", kwargs={"slug": "tanger"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Tanger")

    def test_detail_inactive_404(self):
        url = reverse("cities:detail", kwargs={"slug": "rabat"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CityAdminAPITests(APITestCase):
    def setUp(self):
        self.admin = make_user("city.admin@servis.ma", UserRole.ADMIN)
        self.client_user = make_user("city.client@servis.ma", UserRole.CLIENT)
        self.seller = make_user("city.seller@servis.ma", UserRole.SELLER)
        self.list_url = "/api/v1/admin/cities/"

    def test_client_forbidden(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            self.list_url,
            {"name": "Fès", "region": "Fès-Meknès"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_forbidden(self):
        self.client.force_authenticate(user=self.seller)
        response = self.client.post(
            self.list_url,
            {"name": "Fès", "region": "Fès-Meknès"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_create_update_soft_delete(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.list_url,
            {"name": "Agadir", "region": "Souss-Massa"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["slug"], "agadir")
        city_id = response.data["id"]

        patch = self.client.patch(
            f"{self.list_url}{city_id}/",
            {"is_active": True, "name": "Agadir Ville"},
            format="json",
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)

        delete = self.client.delete(f"{self.list_url}{city_id}/")
        self.assertEqual(delete.status_code, status.HTTP_200_OK)
        self.assertFalse(City.objects.get(id=city_id).is_active)

        public = self.client.get(reverse("cities:detail", kwargs={"slug": "agadir"}))
        # slug may have changed if name update regenerated — check inactive not public
        city = City.objects.get(id=city_id)
        public = self.client.get(reverse("cities:detail", kwargs={"slug": city.slug}))
        self.assertEqual(public.status_code, status.HTTP_404_NOT_FOUND)
