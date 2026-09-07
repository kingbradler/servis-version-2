from django.db import migrations

CTA_FR = {
    "shop produits": "Voir les produits",
    "shop products": "Voir les produits",
    "shop all": "Tous les produits",
    "shop now": "Découvrir",
}


def french_hero_ctas(apps, schema_editor):
    HeroSlide = apps.get_model("core", "HeroSlide")
    for slide in HeroSlide.objects.all():
        label = (slide.cta_label or "").strip()
        mapped = CTA_FR.get(label.lower())
        if mapped and mapped != slide.cta_label:
            slide.cta_label = mapped
            slide.save(update_fields=["cta_label"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_hero_slide_morocco_copy"),
    ]

    operations = [
        migrations.RunPython(french_hero_ctas, noop),
    ]
