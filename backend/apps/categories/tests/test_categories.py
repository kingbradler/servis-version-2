"""Tests for Category model and APIs."""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.categories.models import Category
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


class CategoryModelTests(APITestCase):
    def test_self_parent_forbidden(self):
        cat = Category.objects.create(name="Mode", slug="mode", order=1)
        cat.parent = cat
        with self.assertRaises(ValidationError):
            cat.save()

    def test_slug_unique(self):
        Category.objects.create(name="Mode", slug="mode")
        with self.assertRaises(Exception):
            Category.objects.create(name="Autre", slug="mode")


class CategoryPublicAPITests(APITestCase):
    def setUp(self):
        self.root = Category.objects.create(
            name="Électronique", slug="electronique", icon="smartphone", order=10
        )
        self.child = Category.objects.create(
            name="Téléphones",
            slug="telephones",
            parent=self.root,
            icon="smartphone",
            order=10,
        )
        self.inactive = Category.objects.create(
            name="Archivé", slug="archive", is_active=False, order=99
        )
        self.inactive_child = Category.objects.create(
            name="Old",
            slug="old-child",
            parent=self.root,
            is_active=False,
            order=20,
        )

    def test_list_tree_active_only(self):
        response = self.client.get(reverse("categories:list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [c["slug"] for c in response.data]
        self.assertIn("electronique", slugs)
        self.assertNotIn("archive", slugs)
        e = next(c for c in response.data if c["slug"] == "electronique")
        child_slugs = [c["slug"] for c in e["children"]]
        self.assertIn("telephones", child_slugs)
        self.assertNotIn("old-child", child_slugs)

    def test_detail(self):
        response = self.client.get(
            reverse("categories:detail", kwargs={"slug": "electronique"})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Électronique")

    def test_inactive_detail_404(self):
        response = self.client.get(reverse("categories:detail", kwargs={"slug": "archive"}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_filter_by_parent(self):
        response = self.client.get(reverse("categories:list"), {"parent": "electronique"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [c["slug"] for c in response.data]
        self.assertIn("telephones", slugs)
        self.assertNotIn("old-child", slugs)


class CategoryAdminAPITests(APITestCase):
    def setUp(self):
        self.admin = make_user("cat.admin@servis.ma", UserRole.ADMIN)
        self.client_user = make_user("cat.client@servis.ma", UserRole.CLIENT)
        self.seller = make_user("cat.seller@servis.ma", UserRole.SELLER)
        self.url = "/api/v1/admin/categories/"

    def test_client_forbidden(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(self.url, {"name": "Test"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_forbidden(self):
        self.client.force_authenticate(user=self.seller)
        response = self.client.post(self.url, {"name": "Test"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_create_with_parent_and_soft_delete(self):
        self.client.force_authenticate(user=self.admin)
        root = self.client.post(
            self.url,
            {"name": "Services", "icon": "handshake", "order": 1},
            format="json",
        )
        self.assertEqual(root.status_code, status.HTTP_201_CREATED)
        root_id = root.data["id"]

        child = self.client.post(
            self.url,
            {
                "name": "Cours particuliers",
                "parent": root_id,
                "icon": "book-open",
                "order": 10,
            },
            format="json",
        )
        self.assertEqual(child.status_code, status.HTTP_201_CREATED)

        # Self-parent forbidden
        bad = self.client.patch(
            f"{self.url}{root_id}/",
            {"parent": root_id},
            format="json",
        )
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

        delete = self.client.delete(f"{self.url}{root_id}/")
        self.assertEqual(delete.status_code, status.HTTP_200_OK)
        self.assertFalse(Category.objects.get(id=root_id).is_active)
