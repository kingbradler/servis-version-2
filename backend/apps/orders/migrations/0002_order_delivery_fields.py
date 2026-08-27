# Generated manually for delivery address fields on Order.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="delivery_address",
            field=models.CharField(
                blank=True, max_length=300, verbose_name="adresse"
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_city",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="ville"
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_name",
            field=models.CharField(
                blank=True, max_length=120, verbose_name="destinataire"
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_notes",
            field=models.CharField(
                blank=True, max_length=400, verbose_name="notes livraison"
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_phone",
            field=models.CharField(
                blank=True, max_length=30, verbose_name="téléphone livraison"
            ),
        ),
    ]
