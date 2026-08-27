"""Tests for Store model and APIs."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.stores.models import City, Store, StoreStatus
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


class StoreAPITestCase(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger",
            slug="tanger",
            region="Tanger-Tétouan-Al Hoceïma",
            is_active=True,
        )
        self.inactive_city = City.objects.create(
            name="Rabat",
            slug="rabat",
            region="Rabat-Salé-Kénitra",
            is_active=False,
        )
        self.seller_a = make_user("seller.a@servis.ma", UserRole.SELLER)
        self.seller_b = make_user("seller.b@servis.ma", UserRole.SELLER)
        self.client_user = make_user("client.store@servis.ma", UserRole.CLIENT)
        self.admin = make_user("admin.store@servis.ma", UserRole.ADMIN)

        self.seller_url = reverse("seller_store:store")
        self.submit_url = reverse("seller_store:store-submit")
        self.public_list = reverse("stores:list")


class StoreCreationTests(StoreAPITestCase):
    def test_seller_can_create_store(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.seller_url,
            {
                "name": "Chez Romaric",
                "description": "Boutique étudiante",
                "city": str(self.city.id),
                "phone": "+212612345678",
                "whatsapp": "+212612345678",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], StoreStatus.DRAFT)
        self.assertEqual(response.data["slug"], "chez-romaric")
        store = Store.objects.get(owner=self.seller_a)
        self.assertEqual(store.owner_id, self.seller_a.id)

    def test_client_cannot_create_store(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            self.seller_url,
            {"name": "Hack", "city": str(self.city.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_create_second_store(self):
        Store.objects.create(
            owner=self.seller_a,
            name="First",
            slug="first",
            city=self.city,
            status=StoreStatus.DRAFT,
        )
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.seller_url,
            {"name": "Second", "city": str(self.city.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_in_payload_rejected(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.seller_url,
            {
                "name": "Mine",
                "city": str(self.city.id),
                "owner": str(self.seller_b.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_city_rejected(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.seller_url,
            {"name": "Bad City", "city": str(self.inactive_city.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_name_required(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.seller_url,
            {"name": "  ", "city": str(self.city.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_slug_collision(self):
        Store.objects.create(
            owner=self.seller_b,
            name="Chez Romaric",
            slug="chez-romaric",
            city=self.city,
        )
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.seller_url,
            {"name": "Chez Romaric", "city": str(self.city.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["slug"], "chez-romaric-2")

    def test_html_stripped_from_description(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.seller_url,
            {
                "name": "Safe Shop",
                "description": "<script>alert(1)</script>Bonjour",
                "city": str(self.city.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("<script>", response.data["description"])
        self.assertIn("Bonjour", response.data["description"])


class StoreIsolationTests(StoreAPITestCase):
    def setUp(self):
        super().setUp()
        self.store_a = Store.objects.create(
            owner=self.seller_a,
            name="Boutique A",
            slug="boutique-a",
            city=self.city,
            status=StoreStatus.DRAFT,
        )
        self.store_b = Store.objects.create(
            owner=self.seller_b,
            name="Boutique B",
            slug="boutique-b",
            city=self.city,
            status=StoreStatus.DRAFT,
        )

    def test_seller_gets_own_store_only(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.get(self.seller_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["slug"], "boutique-a")

    def test_seller_cannot_patch_other_via_payload(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.patch(
            self.seller_url,
            {"name": "Hijacked", "owner": str(self.seller_b.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.store_a.refresh_from_db()
        self.assertEqual(self.store_a.name, "Boutique A")

    def test_seller_patch_updates_own(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.patch(
            self.seller_url,
            {"name": "Boutique A Renommée"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.store_a.refresh_from_db()
        self.assertEqual(self.store_a.name, "Boutique A Renommée")
        self.store_b.refresh_from_db()
        self.assertEqual(self.store_b.name, "Boutique B")


class StoreStatusWorkflowTests(StoreAPITestCase):
    def setUp(self):
        super().setUp()
        self.store = Store.objects.create(
            owner=self.seller_a,
            name="Workflow Shop",
            slug="workflow-shop",
            city=self.city,
            status=StoreStatus.DRAFT,
        )

    def test_submit_draft_to_pending(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(self.submit_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], StoreStatus.PENDING)

    def test_seller_cannot_activate(self):
        self.store.status = StoreStatus.PENDING
        self.store.save(update_fields=["status"])
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.patch(
            self.seller_url,
            {"status": StoreStatus.ACTIVE},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.store.refresh_from_db()
        self.assertEqual(self.store.status, StoreStatus.PENDING)

    def test_admin_approve_pending(self):
        self.store.status = StoreStatus.PENDING
        self.store.save(update_fields=["status"])
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f"/api/v1/admin/stores/{self.store.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], StoreStatus.ACTIVE)

    def test_admin_cannot_approve_draft_directly_via_approve(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f"/api/v1/admin/stores/{self.store.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_suspend_and_activate(self):
        self.store.status = StoreStatus.ACTIVE
        self.store.save(update_fields=["status"])
        self.client.force_authenticate(user=self.admin)
        sus = self.client.post(f"/api/v1/admin/stores/{self.store.id}/suspend/")
        self.assertEqual(sus.status_code, status.HTTP_200_OK)
        self.assertEqual(sus.data["status"], StoreStatus.SUSPENDED)
        act = self.client.post(f"/api/v1/admin/stores/{self.store.id}/activate/")
        self.assertEqual(act.status_code, status.HTTP_200_OK)
        self.assertEqual(act.data["status"], StoreStatus.ACTIVE)

    def test_admin_patch_draft_to_active_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/v1/admin/stores/{self.store.id}/",
            {"status": StoreStatus.ACTIVE},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_patch_active_to_draft_rejected(self):
        self.store.status = StoreStatus.ACTIVE
        self.store.save(update_fields=["status"])
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/v1/admin/stores/{self.store.id}/",
            {"status": StoreStatus.DRAFT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.store.refresh_from_db()
        self.assertEqual(self.store.status, StoreStatus.ACTIVE)

    def test_admin_create_store_method_not_allowed(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/v1/admin/stores/",
            {"name": "Nope"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class StorePublicAPITests(StoreAPITestCase):
    def setUp(self):
        super().setUp()
        self.active = Store.objects.create(
            owner=self.seller_a,
            name="Active Shop",
            slug="active-shop",
            city=self.city,
            status=StoreStatus.ACTIVE,
            description="Visible",
        )
        self.draft = Store.objects.create(
            owner=self.seller_b,
            name="Draft Shop",
            slug="draft-shop",
            city=self.city,
            status=StoreStatus.DRAFT,
        )

    def test_anonymous_sees_only_active(self):
        response = self.client.get(self.public_list)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"] if "results" in response.data else response.data
        slugs = [s["slug"] for s in results]
        self.assertIn("active-shop", slugs)
        self.assertNotIn("draft-shop", slugs)

    def test_store_in_inactive_city_hidden(self):
        owner = make_user("seller.inactive.city@servis.ma", UserRole.SELLER)
        Store.objects.create(
            owner=owner,
            name="Hidden City Shop",
            slug="hidden-city-shop",
            city=self.inactive_city,
            status=StoreStatus.ACTIVE,
        )
        response = self.client.get(self.public_list)
        results = response.data["results"] if "results" in response.data else response.data
        slugs = [s["slug"] for s in results]
        self.assertNotIn("hidden-city-shop", slugs)

    def test_pending_and_suspended_hidden(self):
        pending_owner = make_user("seller.p@servis.ma", UserRole.SELLER)
        sus_owner = make_user("seller.s@servis.ma", UserRole.SELLER)
        Store.objects.create(
            owner=pending_owner, name="P", slug="pending-shop", city=self.city, status=StoreStatus.PENDING
        )
        Store.objects.create(
            owner=sus_owner, name="S", slug="suspended-shop", city=self.city, status=StoreStatus.SUSPENDED
        )
        response = self.client.get(self.public_list)
        results = response.data["results"] if "results" in response.data else response.data
        slugs = [s["slug"] for s in results]
        self.assertNotIn("pending-shop", slugs)
        self.assertNotIn("suspended-shop", slugs)

    def test_filter_city(self):
        response = self.client.get(self.public_list, {"city": "tanger"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertTrue(all(s["city"]["slug"] == "tanger" for s in results))

    def test_search(self):
        response = self.client.get(self.public_list, {"search": "Visible"})
        results = response.data["results"] if "results" in response.data else response.data
        self.assertTrue(any(s["slug"] == "active-shop" for s in results))

    def test_detail_active(self):
        response = self.client.get(reverse("stores:detail", kwargs={"slug": "active-shop"}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_detail_draft_404(self):
        response = self.client.get(reverse("stores:detail", kwargs={"slug": "draft-shop"}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_client_cannot_access_admin_stores(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get("/api/v1/admin/stores/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_access_admin_stores(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.get("/api/v1/admin/stores/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
