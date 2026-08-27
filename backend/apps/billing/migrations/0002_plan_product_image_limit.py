# Generated manually for product_image_limit on Plan

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="plan",
            name="product_image_limit",
            field=models.PositiveIntegerField(
                default=1,
                help_text="Nombre max d'images par article boutique. Ignoré pour les plans SERVICE.",
                verbose_name="limite photos par produit",
            ),
        ),
    ]
