"""Professionals app — Phase 6.1 ProfessionalProfile / Prestataires."""

from django.apps import AppConfig


class ProfessionalsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.professionals"
    label = "professionals"
    verbose_name = "Professionnels"
