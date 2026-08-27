"""Rebuild payments for seller-owned methods + seller confirmation."""

import django.core.validators
import django.db.models.deletion
import django.utils.timezone
import uuid
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0001_initial"),
        ("stores", "0002_store"),
        ("orders", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.DeleteModel(name="Payment"),
        migrations.DeleteModel(name="PaymentMethod"),
        migrations.CreateModel(
            name="PaymentMethod",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("MOBILE_MONEY", "Mobile Money"),
                            ("BANK_TRANSFER", "Virement bancaire"),
                            ("CASH", "Espèces"),
                            ("OTHER", "Autre"),
                        ],
                        default="MOBILE_MONEY",
                        max_length=30,
                        verbose_name="type",
                    ),
                ),
                ("label", models.CharField(max_length=120, verbose_name="libellé")),
                (
                    "account_name",
                    models.CharField(max_length=150, verbose_name="nom du bénéficiaire"),
                ),
                (
                    "account_number",
                    models.CharField(
                        blank=True, max_length=120, verbose_name="numéro / compte"
                    ),
                ),
                (
                    "instructions",
                    models.TextField(blank=True, verbose_name="instructions"),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        db_index=True, default=True, verbose_name="actif"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        default=django.utils.timezone.now,
                        editable=False,
                        verbose_name="créé le",
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="modifié le"),
                ),
                (
                    "store",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payment_methods",
                        to="stores.store",
                        verbose_name="boutique",
                    ),
                ),
            ],
            options={
                "verbose_name": "moyen de paiement",
                "verbose_name_plural": "moyens de paiement",
                "ordering": ["label"],
            },
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=12,
                        validators=[
                            django.core.validators.MinValueValidator(Decimal("0.01"))
                        ],
                        verbose_name="montant",
                    ),
                ),
                (
                    "currency",
                    models.CharField(default="MAD", max_length=3, verbose_name="devise"),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "En attente"),
                            ("PROOF_SUBMITTED", "Preuve envoyée"),
                            ("CONFIRMED", "Confirmé"),
                            ("REJECTED", "Rejeté"),
                            ("CANCELLED", "Annulé"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=30,
                        verbose_name="statut",
                    ),
                ),
                (
                    "proof",
                    models.CharField(
                        blank=True, max_length=500, verbose_name="preuve courante"
                    ),
                ),
                (
                    "proof_uploaded_at",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="dernière preuve le"
                    ),
                ),
                (
                    "seller_reviewed_at",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="revu par vendeur le"
                    ),
                ),
                (
                    "seller_rejection_reason",
                    models.TextField(blank=True, verbose_name="motif de rejet"),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        default=django.utils.timezone.now,
                        editable=False,
                        verbose_name="créé le",
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="modifié le"),
                ),
                (
                    "order",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payment",
                        to="orders.order",
                        verbose_name="commande",
                    ),
                ),
                (
                    "payment_method",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payments",
                        to="payments.paymentmethod",
                        verbose_name="moyen de paiement",
                    ),
                ),
            ],
            options={
                "verbose_name": "paiement",
                "verbose_name_plural": "paiements",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="PaymentProof",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("file_url", models.CharField(max_length=500, verbose_name="fichier")),
                (
                    "uploaded_at",
                    models.DateTimeField(
                        default=django.utils.timezone.now,
                        editable=False,
                        verbose_name="envoyé le",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("SUBMITTED", "Soumise"),
                            ("ACCEPTED", "Acceptée"),
                            ("REJECTED", "Rejetée"),
                            ("SUPERSEDED", "Remplacée"),
                        ],
                        db_index=True,
                        default="SUBMITTED",
                        max_length=20,
                        verbose_name="statut",
                    ),
                ),
                (
                    "rejection_reason",
                    models.TextField(blank=True, verbose_name="motif de rejet"),
                ),
                (
                    "payment",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="proofs",
                        to="payments.payment",
                        verbose_name="paiement",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payment_proofs",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="envoyé par",
                    ),
                ),
            ],
            options={
                "verbose_name": "preuve de paiement",
                "verbose_name_plural": "preuves de paiement",
                "ordering": ["-uploaded_at"],
            },
        ),
        migrations.AddIndex(
            model_name="paymentmethod",
            index=models.Index(
                fields=["store", "is_active"], name="payments_pa_store_i_4a1f0d_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(
                fields=["status", "-created_at"], name="payments_pa_status_9c8e2a_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="paymentproof",
            index=models.Index(
                fields=["payment", "-uploaded_at"],
                name="payments_pa_payment_7b3c1e_idx",
            ),
        ),
    ]
