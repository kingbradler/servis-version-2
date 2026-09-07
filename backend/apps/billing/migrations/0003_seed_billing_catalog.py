from django.db import migrations


def seed_billing_catalog(apps, schema_editor):
    from apps.billing.catalog import apply_billing_catalog

    apply_billing_catalog(
        Plan=apps.get_model("billing", "Plan"),
        BoostPackage=apps.get_model("billing", "BoostPackage"),
        PlatformPaymentMethod=apps.get_model("billing", "PlatformPaymentMethod"),
    )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0002_plan_product_image_limit"),
    ]

    operations = [
        migrations.RunPython(seed_billing_catalog, noop),
    ]
