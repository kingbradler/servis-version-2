# Generated manually for Notification

import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Notification",
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
                            ("ORDER_NEW", "Nouvelle commande"),
                            ("PAYMENT_PROOF", "Preuve de paiement"),
                            ("PAYMENT_CONFIRMED", "Paiement confirmé"),
                            ("PAYMENT_REJECTED", "Paiement rejeté"),
                            ("MESSAGE_NEW", "Nouveau message"),
                            ("SYSTEM", "Système"),
                        ],
                        db_index=True,
                        default="SYSTEM",
                        max_length=40,
                        verbose_name="type",
                    ),
                ),
                ("title", models.CharField(max_length=160, verbose_name="titre")),
                (
                    "body",
                    models.CharField(blank=True, max_length=500, verbose_name="message"),
                ),
                (
                    "link",
                    models.CharField(blank=True, max_length=300, verbose_name="lien"),
                ),
                (
                    "is_read",
                    models.BooleanField(
                        db_index=True, default=False, verbose_name="lu"
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
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="destinataire",
                    ),
                ),
            ],
            options={
                "verbose_name": "notification",
                "verbose_name_plural": "notifications",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(
                fields=["user", "is_read", "-created_at"],
                name="notificatio_user_id_7f0c4a_idx",
            ),
        ),
    ]
