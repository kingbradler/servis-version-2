# Generated manually for HeroSlide

import uuid

from django.db import migrations, models
import django.utils.timezone


DEFAULT_SLIDES = [
    {
        "title": "Marketplace locale",
        "highlight": "près de vous",
        "subtitle": "Produits d'étudiants entrepreneurs et services de proximité à Tanger.",
        "image": "https://images.pexels.com/photos/4495416/pexels-photo-4495416.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
        "cta_href": "/products",
        "cta_label": "Shop produits",
        "sort_order": 0,
    },
    {
        "title": "Services pro",
        "highlight": "autour de vous",
        "subtitle": "Trouvez un professionnel, échangez, avancez sans friction.",
        "image": "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
        "cta_href": "/services",
        "cta_label": "Voir les services",
        "sort_order": 1,
    },
    {
        "title": "Carte & proximité",
        "highlight": "Explorer",
        "subtitle": "Boutiques et prestataires sur la carte — ce qui compte est près de chez vous.",
        "image": "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
        "cta_href": "/explore",
        "cta_label": "Ouvrir Explorer",
        "sort_order": 2,
    },
]


def seed_slides(apps, schema_editor):
    HeroSlide = apps.get_model("core", "HeroSlide")
    if HeroSlide.objects.exists():
        return
    for row in DEFAULT_SLIDES:
        HeroSlide.objects.create(id=uuid.uuid4(), is_active=True, **row)


def unseed_slides(apps, schema_editor):
    HeroSlide = apps.get_model("core", "HeroSlide")
    HeroSlide.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_site_feedback"),
    ]

    operations = [
        migrations.CreateModel(
            name="HeroSlide",
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
                ("title", models.CharField(max_length=120, verbose_name="titre")),
                (
                    "highlight",
                    models.CharField(
                        blank=True, max_length=120, verbose_name="surbrillance"
                    ),
                ),
                (
                    "subtitle",
                    models.CharField(
                        blank=True, max_length=300, verbose_name="sous-titre"
                    ),
                ),
                ("image", models.CharField(max_length=500, verbose_name="image")),
                (
                    "cta_href",
                    models.CharField(
                        default="/products", max_length=200, verbose_name="lien CTA"
                    ),
                ),
                (
                    "cta_label",
                    models.CharField(
                        default="Découvrir", max_length=80, verbose_name="libellé CTA"
                    ),
                ),
                (
                    "sort_order",
                    models.PositiveIntegerField(
                        db_index=True, default=0, verbose_name="ordre"
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        db_index=True, default=True, verbose_name="actif"
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
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="modifié le"),
                ),
            ],
            options={
                "verbose_name": "slide accueil",
                "verbose_name_plural": "slides accueil",
                "ordering": ["sort_order", "created_at"],
            },
        ),
        migrations.RunPython(seed_slides, unseed_slides),
    ]
