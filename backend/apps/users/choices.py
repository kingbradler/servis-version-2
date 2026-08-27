"""User-related enums and constants."""

from django.db import models


class UserRole(models.TextChoices):
    """Application roles — used for authorization across the platform."""

    CLIENT = "CLIENT", "Client"
    # Soft migration Phase 6: SELLER = compte professionnel (boutique et/ou services)
    SELLER = "SELLER", "Professionnel"
    ADMIN = "ADMIN", "Administrateur"
