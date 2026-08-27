# Generated manually — social profile URLs

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("professionals", "0002_geolocation_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="professionalprofile",
            name="facebook_url",
            field=models.URLField(
                blank=True, max_length=500, verbose_name="Facebook"
            ),
        ),
        migrations.AddField(
            model_name="professionalprofile",
            name="instagram_url",
            field=models.URLField(
                blank=True, max_length=500, verbose_name="Instagram"
            ),
        ),
        migrations.AddField(
            model_name="professionalprofile",
            name="tiktok_url",
            field=models.URLField(
                blank=True, max_length=500, verbose_name="TikTok"
            ),
        ),
    ]
