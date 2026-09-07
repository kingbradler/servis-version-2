# Store social profile URLs (TikTok, YouTube, Facebook)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("stores", "0003_geolocation_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="store",
            name="facebook_url",
            field=models.URLField(
                blank=True, max_length=500, verbose_name="Facebook"
            ),
        ),
        migrations.AddField(
            model_name="store",
            name="tiktok_url",
            field=models.URLField(
                blank=True, max_length=500, verbose_name="TikTok"
            ),
        ),
        migrations.AddField(
            model_name="store",
            name="youtube_url",
            field=models.URLField(
                blank=True, max_length=500, verbose_name="YouTube"
            ),
        ),
    ]
