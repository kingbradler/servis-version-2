from django.db import migrations

NEW_SUBTITLE = (
    "Produits d'étudiants entrepreneurs et services de proximité, "
    "partout au Maroc."
)


def update_hero_copy(apps, schema_editor):
    HeroSlide = apps.get_model("core", "HeroSlide")
    for slide in HeroSlide.objects.all():
        subtitle = slide.subtitle or ""
        if "Tanger" not in subtitle:
            continue
        slide.subtitle = NEW_SUBTITLE
        slide.save(update_fields=["subtitle"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_hero_slide"),
    ]

    operations = [
        migrations.RunPython(update_hero_copy, noop),
    ]
