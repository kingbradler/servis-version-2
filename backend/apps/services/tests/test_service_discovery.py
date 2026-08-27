"""Phase 6.3 — Public service search, filters, ordering, visibility."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.categories.models import Category, CategoryScope
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


class ServiceDiscoveryTests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger", region="Nord", is_active=True
        )
        self.city_inactive = City.objects.create(
            name="Ghost", slug="ghost", region="X", is_active=False
        )
        self.cat_service = Category.objects.create(
            name="Plomberie",
            slug="plomberie",
            is_active=True,
            order=1,
            scope=CategoryScope.SERVICE,
        )
        self.cat_product = Category.objects.create(
            name="Vêtements",
            slug="vetements",
            is_active=True,
            order=2,
            scope=CategoryScope.PRODUCT,
        )
        self.seller = make_user("pro@servis.ma", UserRole.SELLER)
        self.seller_b = make_user("pro.b@servis.ma", UserRole.SELLER)
        self.profile = ProfessionalProfile.objects.create(
            owner=self.seller,
            display_name="Ahmed Plombier",
            slug="ahmed-plombier",
            headline="Expert plomberie",
            city=self.city,
            status=ProfessionalStatus.ACTIVE,
        )
        self.profile_b = ProfessionalProfile.objects.create(
            owner=self.seller_b,
            display_name="Sara Elec",
            slug="sara-elec",
            headline="Électricité",
            city=self.city,
            status=ProfessionalStatus.ACTIVE,
        )
        self.url = reverse("services:list")

        self.svc_fixed = Service.objects.create(
            professional_profile=self.profile,
            name="Débouchage",
            slug="debouchage",
            description="Canalisation bloquée",
            price="200.00",
            price_type=ServicePriceType.FIXED,
            status=ServiceStatus.ACTIVE,
            category=self.cat_service,
            is_featured=True,
            duration="2 h",
        )
        self.svc_from = Service.objects.create(
            professional_profile=self.profile,
            name="Installation sanitaires",
            slug="installation",
            description="Pose WC et lavabo",
            price="80.00",
            price_type=ServicePriceType.FROM,
            status=ServiceStatus.ACTIVE,
            category=self.cat_service,
        )
        self.svc_quote = Service.objects.create(
            professional_profile=self.profile_b,
            name="Audit électrique",
            slug="audit",
            description="Sur mesure",
            price=None,
            price_type=ServicePriceType.QUOTE,
            status=ServiceStatus.ACTIVE,
            category=self.cat_service,
        )
        self.svc_draft = Service.objects.create(
            professional_profile=self.profile,
            name="Brouillon secret",
            slug="draft-secret",
            description="Ne pas exposer",
            price="10.00",
            status=ServiceStatus.DRAFT,
            category=self.cat_service,
        )
        self.svc_archived = Service.objects.create(
            professional_profile=self.profile,
            name="Ancien service",
            slug="archived-svc",
            description="Archivé",
            price="15.00",
            status=ServiceStatus.ARCHIVED,
            category=self.cat_service,
        )

    def _ids(self, res):
        results = res.data.get("results", res.data)
        return {item["id"] for item in results}

    def test_search_by_name(self):
        res = self.client.get(self.url, {"search": "débouchage"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._ids(res), {str(self.svc_fixed.id)})

    def test_search_by_description(self):
        res = self.client.get(self.url, {"search": "CANALISATION"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._ids(res), {str(self.svc_fixed.id)})

    def test_search_by_professional(self):
        res = self.client.get(self.url, {"search": "ahmed"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = self._ids(res)
        self.assertIn(str(self.svc_fixed.id), ids)
        self.assertIn(str(self.svc_from.id), ids)
        self.assertNotIn(str(self.svc_quote.id), ids)

    def test_filter_category_slug(self):
        res = self.client.get(self.url, {"category": "plomberie"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = self._ids(res)
        self.assertEqual(len(ids), 3)
        self.assertNotIn(str(self.svc_draft.id), ids)

    def test_filter_category_product_scope_empty(self):
        res = self.client.get(self.url, {"category": "vetements"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._ids(res)), 0)

    def test_filter_city_slug(self):
        res = self.client.get(self.url, {"city": "tanger"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._ids(res)), 3)

    def test_filter_inactive_city_empty(self):
        res = self.client.get(self.url, {"city": "ghost"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._ids(res)), 0)

    def test_filter_min_price(self):
        res = self.client.get(self.url, {"min_price": "100"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._ids(res), {str(self.svc_fixed.id)})

    def test_filter_max_price(self):
        res = self.client.get(self.url, {"max_price": "100"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._ids(res), {str(self.svc_from.id)})

    def test_price_filter_excludes_quote(self):
        res = self.client.get(self.url, {"min_price": "1", "max_price": "999"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = self._ids(res)
        self.assertNotIn(str(self.svc_quote.id), ids)
        self.assertIn(str(self.svc_fixed.id), ids)
        self.assertIn(str(self.svc_from.id), ids)

    def test_filter_price_type(self):
        res = self.client.get(self.url, {"price_type": "QUOTE"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._ids(res), {str(self.svc_quote.id)})

    def test_filter_featured(self):
        res = self.client.get(self.url, {"featured": "true"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self._ids(res), {str(self.svc_fixed.id)})

    def test_ordering_price_asc_nulls_last(self):
        res = self.client.get(self.url, {"ordering": "price"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        slugs = [r["slug"] for r in results]
        self.assertEqual(slugs[:2], ["installation", "debouchage"])
        self.assertEqual(slugs[-1], "audit")

    def test_ordering_name(self):
        res = self.client.get(self.url, {"ordering": "name"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        names = [r["name"] for r in results]
        self.assertEqual(names, sorted(names))

    def test_ordering_created_at_desc_default(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertGreaterEqual(len(results), 3)

    def test_pagination_with_filters(self):
        res = self.client.get(
            self.url,
            {"category": "plomberie", "page_size": 1, "page": 1},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 3)
        self.assertEqual(len(res.data["results"]), 1)
        self.assertIsNotNone(res.data["next"])

    def test_draft_invisible(self):
        res = self.client.get(self.url, {"search": "brouillon"})
        self.assertEqual(len(self._ids(res)), 0)

    def test_archived_invisible(self):
        res = self.client.get(self.url, {"search": "ancien"})
        self.assertEqual(len(self._ids(res)), 0)

    def test_suspended_professional_invisible(self):
        self.profile.status = ProfessionalStatus.SUSPENDED
        self.profile.save(update_fields=["status"])
        res = self.client.get(self.url)
        ids = self._ids(res)
        self.assertNotIn(str(self.svc_fixed.id), ids)
        self.assertNotIn(str(self.svc_from.id), ids)
        self.assertIn(str(self.svc_quote.id), ids)

    def test_active_pair_visible(self):
        res = self.client.get(self.url, {"search": "débouchage"})
        self.assertIn(str(self.svc_fixed.id), self._ids(res))

    def test_filters_cannot_expose_private_services(self):
        """Search/filters must not leak DRAFT/ARCHIVED even with exact match."""
        res = self.client.get(
            self.url,
            {
                "search": "secret",
                "category": "plomberie",
                "city": "tanger",
                "min_price": "1",
                "featured": "false",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._ids(res)), 0)

    def test_categories_for_service_param(self):
        res = self.client.get(reverse("categories:list"), {"for": "service"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = {c["slug"] for c in res.data}
        self.assertIn("plomberie", slugs)
        self.assertNotIn("vetements", slugs)
