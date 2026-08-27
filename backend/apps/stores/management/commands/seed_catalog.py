"""
Seed initial SERVIS catalog: Tanger + student-marketplace categories.

Usage:
    python manage.py seed_catalog
    python manage.py seed_catalog --reset-categories  # deactivate then recreate (dev)
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.categories.models import Category, CategoryScope
from apps.core.slug import slugify_text, unique_slug
from apps.stores.models import City

# Future cities (inactive) — ready to activate later
FUTURE_CITIES = [
    ("Tétouan", "tetouan", "Tanger-Tétouan-Al Hoceïma"),
    ("Rabat", "rabat", "Rabat-Salé-Kénitra"),
    ("Casablanca", "casablanca", "Casablanca-Settat"),
    ("Fès", "fes", "Fès-Meknès"),
    ("Marrakech", "marrakech", "Marrakech-Safi"),
    ("Agadir", "agadir", "Souss-Massa"),
]

# (name, icon, scope, children[(name, icon), ...])
# scope: PRODUCT | SERVICE | BOTH
CATEGORY_TREE = [
    (
        "Mode",
        "shirt",
        CategoryScope.PRODUCT,
        [
            ("Vêtements", "shirt"),
            ("Chaussures", "footprints"),
            ("Accessoires", "watch"),
            ("Personnalisation", "pen-tool"),
        ],
    ),
    (
        "Alimentation",
        "utensils",
        CategoryScope.PRODUCT,
        [
            ("Plats faits maison", "cooking-pot"),
            ("Snacks", "cookie"),
            ("Pâtisseries", "cake"),
            ("Boissons", "cup-soda"),
        ],
    ),
    (
        "Beauté",
        "sparkles",
        CategoryScope.BOTH,
        [
            ("Soins", "heart"),
            ("Maquillage", "palette"),
            ("Parfums", "flower-2"),
            ("Coiffure", "scissors"),
        ],
    ),
    (
        "Électronique",
        "smartphone",
        CategoryScope.PRODUCT,
        [
            ("Téléphones", "smartphone"),
            ("Accessoires", "headphones"),
            ("Ordinateurs", "laptop"),
            ("Audio", "speaker"),
        ],
    ),
    (
        "Informatique",
        "monitor",
        CategoryScope.BOTH,
        [
            ("Développement", "code"),
            ("Design", "figma"),
            ("Maintenance", "wrench"),
            ("Formation", "graduation-cap"),
        ],
    ),
    (
        "Livres & Fournitures",
        "book-open",
        CategoryScope.PRODUCT,
        [
            ("Manuels", "book"),
            ("Fournitures", "pencil"),
            ("Notes & polycopiés", "file-text"),
        ],
    ),
    (
        "Maison & Décoration",
        "home",
        CategoryScope.PRODUCT,
        [
            ("Décoration", "lamp"),
            ("Artisanat", "hammer"),
        ],
    ),
    (
        "Sport",
        "dumbbell",
        CategoryScope.PRODUCT,
        [
            ("Équipement", "dumbbell"),
            ("Vêtements sport", "shirt"),
        ],
    ),
    (
        "Services",
        "handshake",
        CategoryScope.SERVICE,
        [
            ("Plomberie", "wrench"),
            ("Électricité", "zap"),
            ("Réparation", "hammer"),
            ("Cours particuliers", "book-open"),
            ("Design & créa", "palette"),
            ("Livraison", "bike"),
            ("Transport", "car"),
            ("Photographie", "camera"),
            ("Nettoyage", "sparkles"),
            ("Automobile", "car"),
            ("Construction", "hard-hat"),
            ("Autres services", "briefcase"),
        ],
    ),
    ("Autres", "more-horizontal", CategoryScope.BOTH, []),
]


class Command(BaseCommand):
    help = "Charge Tanger et les catégories initiales SERVIS (marketplace étudiante)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-future-cities",
            action="store_true",
            help="Crée aussi les autres villes marocaines en is_active=False.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        tanger, created = City.objects.update_or_create(
            slug="tanger",
            defaults={
                "name": "Tanger",
                "region": "Tanger-Tétouan-Al Hoceïma",
                "is_active": True,
            },
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"{'Créé' if created else 'Mis à jour'}: City {tanger.name}"
            )
        )

        if options["with_future_cities"]:
            for name, slug, region in FUTURE_CITIES:
                city, c = City.objects.update_or_create(
                    slug=slug,
                    defaults={"name": name, "region": region, "is_active": False},
                )
                self.stdout.write(
                    f"  {'+' if c else '~'} {city.name} (inactive)"
                )

        order = 0
        for name, icon, scope, children in CATEGORY_TREE:
            order += 10
            root = self._upsert_category(
                name=name, icon=icon, parent=None, order=order, scope=scope
            )
            child_order = 0
            for child_name, child_icon in children:
                child_order += 10
                self._upsert_category(
                    name=child_name,
                    icon=child_icon,
                    parent=root,
                    order=child_order,
                    scope=scope,
                )

        self.stdout.write(self.style.SUCCESS("Catalogue initial SERVIS prêt."))

    def _upsert_category(self, *, name, icon, parent, order, scope=CategoryScope.BOTH):
        base = slugify_text(name)
        # Prefer stable slug from name; if another category owns it, keep existing match by name+parent
        existing = Category.objects.filter(name=name, parent=parent).first()
        if existing:
            existing.icon = icon
            existing.order = order
            existing.scope = scope
            existing.is_active = True
            existing.description = existing.description or ""
            existing.save()
            return existing

        slug = unique_slug(Category, base)
        return Category.objects.create(
            name=name,
            slug=slug,
            icon=icon,
            parent=parent,
            order=order,
            scope=scope,
            is_active=True,
            description="",
        )
