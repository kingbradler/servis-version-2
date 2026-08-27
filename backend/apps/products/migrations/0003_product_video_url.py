# Generated manually — product video_url

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0002_alter_product_compare_price_alter_product_price"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="video_url",
            field=models.URLField(
                blank=True,
                help_text="Lien optionnel vers une vidéo produit (Instagram ou TikTok).",
                max_length=500,
                verbose_name="vidéo Instagram / TikTok",
            ),
        ),
    ]
