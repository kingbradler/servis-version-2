"""Phase 6.8 — billing subscriptions, limits, boosts, admin review."""

from datetime import timedelta
from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.billing.models import (
    Boost,
    BoostPackage,
    BoostPaymentStatus,
    BoostStatus,
    BoostTargetType,
    Plan,
    PlanCategory,
    PlanType,
    PlatformPaymentMethod,
    Subscription,
    SubscriptionPayment,
    SubscriptionPaymentStatus,
    SubscriptionStatus,
)
from apps.billing.services import (
    approve_subscription_payment,
    create_subscription_request,
    expire_stale_subscriptions,
    get_store_entitlements,
)
from apps.categories.models import Category, CategoryScope
from apps.products.models import Product, ProductStatus
from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
from apps.services.models import Service, ServiceStatus
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


def make_jpeg(name="proof.jpg"):
    buf = BytesIO()
    Image.new("RGB", (40, 40), (10, 120, 200)).save(buf, format="JPEG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


class BillingBaseTestCase(APITestCase):
    def setUp(self):
        from django.core.management import call_command

        call_command("seed_billing", verbosity=0)

        self.city = City.objects.create(
            name="Tanger", slug="tanger-bill", region="Nord", is_active=True
        )
        self.cat = Category.objects.create(
            name="Divers", slug="divers-bill", is_active=True, scope=CategoryScope.BOTH
        )
        self.seller = make_user("seller.bill@servis.ma", UserRole.SELLER)
        self.seller2 = make_user("seller2.bill@servis.ma", UserRole.SELLER)
        self.client_user = make_user("client.bill@servis.ma", UserRole.CLIENT)
        self.admin = make_user("admin.bill@servis.ma", UserRole.ADMIN)

        self.store = Store.objects.create(
            owner=self.seller,
            name="Bill Store",
            slug="bill-store",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.profile = ProfessionalProfile.objects.create(
            owner=self.seller,
            display_name="Pro Bill",
            slug="pro-bill",
            headline="Plombier",
            city=self.city,
            status=ProfessionalStatus.ACTIVE,
        )

        self.plan_free = Plan.objects.get(code=PlanType.STORE_FREE)
        self.plan_std = Plan.objects.get(code=PlanType.STORE_STANDARD)
        self.plan_pro = Plan.objects.get(code=PlanType.STORE_PRO)
        self.plan_svc = Plan.objects.get(code=PlanType.SERVICE_STANDARD)
        self.plan_svc_pro = Plan.objects.get(code=PlanType.SERVICE_PRO)
        self.method = PlatformPaymentMethod.objects.filter(is_active=True).first()
        self.boost_pkg = BoostPackage.objects.get(code="BOOST_7D")


class PlanApiTests(BillingBaseTestCase):
    def test_public_plans_hide_inactive(self):
        self.plan_std.is_active = False
        self.plan_std.save(update_fields=["is_active"])
        resp = self.client.get(reverse("billing-plans"))
        self.assertEqual(resp.status_code, 200)
        codes = {p["code"] for p in resp.data}
        self.assertNotIn(PlanType.STORE_STANDARD, codes)
        self.assertIn(PlanType.STORE_FREE, codes)


class SubscriptionWorkflowTests(BillingBaseTestCase):
    def test_free_activates_immediately(self):
        self.client.force_authenticate(self.seller)
        resp = self.client.post(
            reverse("seller-subscriptions"),
            {"plan_id": str(self.plan_free.id)},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["status"], SubscriptionStatus.ACTIVE)
        self.assertIsNone(resp.data["latest_payment"])

    def test_paid_flow_proof_admin_approve(self):
        self.client.force_authenticate(self.seller)
        resp = self.client.post(
            reverse("seller-subscriptions"),
            {
                "plan_id": str(self.plan_std.id),
                "payment_method_id": str(self.method.id),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["status"], SubscriptionStatus.PENDING)
        sub_id = resp.data["id"]
        payment = resp.data["latest_payment"]
        self.assertEqual(Decimal(payment["amount"]), Decimal("49.00"))

        proof = self.client.post(
            reverse("seller-subscription-proof", kwargs={"subscription_id": sub_id}),
            {"proof": make_jpeg(), "reference": "OM-123"},
            format="multipart",
        )
        self.assertEqual(proof.status_code, 200)
        self.assertEqual(proof.data["status"], SubscriptionPaymentStatus.PROOF_SUBMITTED)

        # Seller cannot approve
        pay_id = payment["id"]
        deny = self.client.post(
            reverse("admin-subscription-payment-approve", kwargs={"payment_id": pay_id})
        )
        self.assertIn(deny.status_code, (403, 401))

        self.client.force_authenticate(self.admin)
        ok = self.client.post(
            reverse("admin-subscription-payment-approve", kwargs={"payment_id": pay_id})
        )
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.data["status"], SubscriptionStatus.ACTIVE)
        self.assertIsNotNone(ok.data["expires_at"])

        # Double approve blocked
        again = self.client.post(
            reverse("admin-subscription-payment-approve", kwargs={"payment_id": pay_id})
        )
        self.assertEqual(again.status_code, 400)

    def test_reject_shows_reason(self):
        self.client.force_authenticate(self.seller)
        resp = self.client.post(
            reverse("seller-subscriptions"),
            {
                "plan_id": str(self.plan_std.id),
                "payment_method_id": str(self.method.id),
            },
            format="json",
        )
        sub_id = resp.data["id"]
        pay_id = resp.data["latest_payment"]["id"]
        self.client.post(
            reverse("seller-subscription-proof", kwargs={"subscription_id": sub_id}),
            {"proof": make_jpeg()},
            format="multipart",
        )
        self.client.force_authenticate(self.admin)
        rej = self.client.post(
            reverse("admin-subscription-payment-reject", kwargs={"payment_id": pay_id}),
            {"rejection_reason": "Montant incorrect"},
            format="json",
        )
        self.assertEqual(rej.status_code, 200)
        self.assertEqual(rej.data["status"], SubscriptionPaymentStatus.REJECTED)
        self.assertIn("incorrect", rej.data["rejection_reason"])

        sub = Subscription.objects.get(pk=sub_id)
        self.assertEqual(sub.status, SubscriptionStatus.REJECTED)

    def test_store_and_service_independent(self):
        now = timezone.now()
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_std,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            activated_at=now,
            expires_at=now + timedelta(days=30),
        )
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_svc_pro,
            category=PlanCategory.SERVICE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            activated_at=now,
            expires_at=now + timedelta(days=30),
        )
        store = get_store_entitlements(self.seller)
        self.assertEqual(store.plan_code, PlanType.STORE_STANDARD)
        self.assertEqual(store.product_limit, 20)

        self.client.force_authenticate(self.seller)
        ent = self.client.get(reverse("seller-billing-entitlements"))
        self.assertTrue(ent.data["services"]["has_active_subscription"])
        self.assertEqual(ent.data["services"]["plan_code"], PlanType.SERVICE_PRO)

    def test_cannot_two_active_same_category(self):
        now = timezone.now()
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_std,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            activated_at=now,
            expires_at=now + timedelta(days=30),
        )
        sub, payment = create_subscription_request(
            owner=self.seller, plan=self.plan_pro, payment_method=self.method
        )
        payment.proof = "billing-proofs/x/y.jpg"
        payment.status = SubscriptionPaymentStatus.PROOF_SUBMITTED
        payment.save()
        approve_subscription_payment(payment=payment, admin=self.admin)
        actives = Subscription.objects.filter(
            owner=self.seller,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
        )
        self.assertEqual(actives.count(), 1)
        self.assertEqual(actives.first().plan.code, PlanType.STORE_PRO)

    def test_expiration(self):
        now = timezone.now()
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_std,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now - timedelta(days=40),
            activated_at=now - timedelta(days=40),
            expires_at=now - timedelta(days=1),
        )
        expire_stale_subscriptions(now=now)
        ent = get_store_entitlements(self.seller, now=now)
        self.assertEqual(ent.plan_code, PlanType.STORE_FREE)
        self.assertEqual(ent.product_limit, 5)


class ProductLimitTests(BillingBaseTestCase):
    def _create_active_products(self, n):
        for i in range(n):
            Product.objects.create(
                store=self.store,
                name=f"P{i}",
                slug=f"p-{i}",
                price=Decimal("10.00"),
                stock=1,
                status=ProductStatus.ACTIVE,
                category=self.cat,
            )

    def test_free_max_5_publish(self):
        self._create_active_products(5)
        draft = Product.objects.create(
            store=self.store,
            name="Extra",
            slug="extra",
            price=Decimal("10.00"),
            stock=1,
            status=ProductStatus.DRAFT,
        )
        self.client.force_authenticate(self.seller)
        url = reverse("seller_products:publish", kwargs={"product_id": draft.id})
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, 400)
        fields = resp.data.get("fields") or {}
        self.assertEqual(fields.get("error_code"), "product_limit_exceeded")

    def test_standard_max_20(self):
        now = timezone.now()
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_std,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            activated_at=now,
            expires_at=now + timedelta(days=30),
        )
        self._create_active_products(20)
        draft = Product.objects.create(
            store=self.store,
            name="Extra20",
            slug="extra20",
            price=Decimal("10.00"),
            stock=1,
            status=ProductStatus.DRAFT,
        )
        self.client.force_authenticate(self.seller)
        resp = self.client.post(
            reverse("seller_products:publish", kwargs={"product_id": draft.id})
        )
        self.assertEqual(resp.status_code, 400)

    def test_pro_unlimited_and_downgrade_keeps_excess(self):
        now = timezone.now()
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_pro,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            activated_at=now,
            expires_at=now + timedelta(days=30),
        )
        self._create_active_products(8)
        self.assertEqual(Product.objects.filter(status=ProductStatus.ACTIVE).count(), 8)
        # Expire to free — products remain, cannot add more
        Subscription.objects.filter(owner=self.seller).update(
            status=SubscriptionStatus.EXPIRED,
            expires_at=now - timedelta(days=1),
        )
        self.assertEqual(get_store_entitlements(self.seller).active_product_count, 8)
        draft = Product.objects.create(
            store=self.store,
            name="More",
            slug="more",
            price=Decimal("10.00"),
            stock=1,
            status=ProductStatus.DRAFT,
        )
        self.client.force_authenticate(self.seller)
        resp = self.client.post(
            reverse("seller_products:publish", kwargs={"product_id": draft.id})
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            Product.objects.filter(status=ProductStatus.ACTIVE).count(), 8
        )


class ServiceSubscriptionGateTests(BillingBaseTestCase):
    def test_publish_requires_service_plan(self):
        service = Service.objects.create(
            professional_profile=self.profile,
            name="Réparation",
            slug="reparation",
            price=Decimal("50.00"),
            status=ServiceStatus.DRAFT,
            category=self.cat,
        )
        self.client.force_authenticate(self.seller)
        resp = self.client.post(
            reverse("seller_services:publish", kwargs={"service_id": service.id})
        )
        self.assertEqual(resp.status_code, 400)
        fields = resp.data.get("fields") or {}
        self.assertEqual(fields.get("error_code"), "service_subscription_required")

        now = timezone.now()
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_svc,
            category=PlanCategory.SERVICE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            activated_at=now,
            expires_at=now + timedelta(days=30),
        )
        ok = self.client.post(
            reverse("seller_services:publish", kwargs={"service_id": service.id})
        )
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.data["status"], ServiceStatus.ACTIVE)

    def test_expiry_archives_services_allows_reactivate(self):
        now = timezone.now()
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_svc,
            category=PlanCategory.SERVICE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now - timedelta(days=40),
            activated_at=now - timedelta(days=40),
            expires_at=now - timedelta(hours=1),
        )
        service = Service.objects.create(
            professional_profile=self.profile,
            name="Plomberie",
            slug="plomberie",
            price=Decimal("80.00"),
            status=ServiceStatus.ACTIVE,
            category=self.cat,
        )
        expire_stale_subscriptions(now=now)
        service.refresh_from_db()
        self.assertEqual(service.status, ServiceStatus.ARCHIVED)

        # Renew then republish
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_svc,
            category=PlanCategory.SERVICE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            activated_at=now,
            expires_at=now + timedelta(days=30),
        )
        self.client.force_authenticate(self.seller)
        ok = self.client.post(
            reverse("seller_services:publish", kwargs={"service_id": service.id})
        )
        self.assertEqual(ok.status_code, 200)


class BoostTests(BillingBaseTestCase):
    def test_boost_requires_pro_and_labels_sponsored(self):
        product = Product.objects.create(
            store=self.store,
            name="Boosted",
            slug="boosted-p",
            price=Decimal("12.00"),
            stock=1,
            status=ProductStatus.ACTIVE,
            category=self.cat,
        )
        self.client.force_authenticate(self.seller)
        denied = self.client.post(
            reverse("seller-boosts"),
            {
                "package_id": str(self.boost_pkg.id),
                "target_type": BoostTargetType.PRODUCT,
                "target_id": str(product.id),
                "payment_method_id": str(self.method.id),
            },
            format="json",
        )
        self.assertEqual(denied.status_code, 403)

        now = timezone.now()
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_pro,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            activated_at=now,
            expires_at=now + timedelta(days=30),
        )
        created = self.client.post(
            reverse("seller-boosts"),
            {
                "package_id": str(self.boost_pkg.id),
                "target_type": BoostTargetType.PRODUCT,
                "target_id": str(product.id),
                "payment_method_id": str(self.method.id),
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        boost_id = created.data["id"]
        pay_id = created.data["payment"]["id"]
        self.assertEqual(Decimal(created.data["amount"]), Decimal("15.00"))

        self.client.post(
            reverse("seller-boost-proof", kwargs={"boost_id": boost_id}),
            {"proof": make_jpeg()},
            format="multipart",
        )
        self.client.force_authenticate(self.admin)
        self.client.post(
            reverse("admin-boost-payment-approve", kwargs={"payment_id": pay_id})
        )
        boost = Boost.objects.get(pk=boost_id)
        self.assertEqual(boost.status, BoostStatus.ACTIVE)

        pub = self.client.get(reverse("products:list"))
        row = next(p for p in pub.data["results"] if p["id"] == str(product.id))
        self.assertTrue(row["is_boosted"])
        self.assertEqual(row["sponsored_label"], "Promu")


class PermissionTests(BillingBaseTestCase):
    def test_client_cannot_access_seller_billing(self):
        self.client.force_authenticate(self.client_user)
        resp = self.client.get(reverse("seller-subscriptions"))
        self.assertEqual(resp.status_code, 403)

    def test_seller_cannot_see_other_subscriptions(self):
        now = timezone.now()
        sub = Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_std,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.PENDING,
        )
        self.client.force_authenticate(self.seller2)
        resp = self.client.get(
            reverse("seller-subscription-detail", kwargs={"subscription_id": sub.id})
        )
        self.assertEqual(resp.status_code, 404)


class ProductImageLimitTests(BillingBaseTestCase):
    def test_free_and_paid_image_limits(self):
        free = get_store_entitlements(self.seller)
        self.assertEqual(free.product_image_limit, 1)

        now = timezone.now()
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_std,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            activated_at=now,
            expires_at=now + timedelta(days=30),
        )
        std = get_store_entitlements(self.seller)
        self.assertEqual(std.product_image_limit, 3)

        Subscription.objects.filter(
            owner=self.seller, category=PlanCategory.STORE
        ).update(status=SubscriptionStatus.EXPIRED)
        Subscription.objects.create(
            owner=self.seller,
            plan=self.plan_pro,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            activated_at=now,
            expires_at=now + timedelta(days=30),
        )
        pro = get_store_entitlements(self.seller)
        self.assertEqual(pro.product_image_limit, 5)

    def test_entitlements_api_exposes_image_limit(self):
        self.client.force_authenticate(self.seller)
        resp = self.client.get(reverse("seller-billing-entitlements"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["store"]["product_image_limit"], 1)
