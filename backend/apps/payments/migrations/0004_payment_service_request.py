# Generated manually — Payment may target Order XOR ServiceRequest.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0003_rename_payments_pa_status_9c8e2a_idx_payments_pa_status_21ed42_idx_and_more"),
        ("pro_services", "0002_service_request"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payment",
            name="order",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="payment",
                to="orders.order",
                verbose_name="commande",
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="service_request",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="payment",
                to="pro_services.servicerequest",
                verbose_name="demande de service",
            ),
        ),
        migrations.AddConstraint(
            model_name="payment",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(("order__isnull", False), ("service_request__isnull", True))
                    | models.Q(
                        ("order__isnull", True), ("service_request__isnull", False)
                    )
                ),
                name="payment_order_xor_service_request",
            ),
        ),
    ]
