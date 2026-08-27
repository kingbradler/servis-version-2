"""User model for SERVIS — email authentication with roles."""

import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.users.choices import UserRole
from apps.users.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model.

    - Email is the unique login identifier (no username).
    - Role determines access: CLIENT, SELLER, or ADMIN.
    - is_verified tracks email verification (Phase 2+).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField("adresse e-mail", unique=True, db_index=True)
    first_name = models.CharField("prénom", max_length=150)
    last_name = models.CharField("nom", max_length=150)
    phone = models.CharField("téléphone", max_length=20, blank=True)
    role = models.CharField(
        "rôle",
        max_length=10,
        choices=UserRole.choices,
        default=UserRole.CLIENT,
        db_index=True,
    )
    avatar = models.URLField("avatar", blank=True)
    is_active = models.BooleanField("actif", default=True)
    is_staff = models.BooleanField("accès admin Django", default=False)
    is_verified = models.BooleanField("e-mail vérifié", default=False)
    email_verified_at = models.DateTimeField(
        "e-mail vérifié le",
        null=True,
        blank=True,
        help_text="Date de vérification de l'e-mail (Phase 2+).",
    )
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["role", "is_active"]),
        ]

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_client(self) -> bool:
        return self.role == UserRole.CLIENT

    @property
    def is_seller(self) -> bool:
        """Professionnel (soft-migrated SELLER role) — boutique et/ou services."""
        return self.role == UserRole.SELLER

    @property
    def can_shop(self) -> bool:
        """CLIENT or SELLER may buy products (Phase 6)."""
        return self.role in (UserRole.CLIENT, UserRole.SELLER)

    @property
    def is_admin_role(self) -> bool:
        """Platform admin role — distinct from is_staff (Django admin access)."""
        return self.role == UserRole.ADMIN

    def mark_email_verified(self) -> None:
        """Mark the user's email as verified (used after email confirmation)."""
        self.is_verified = True
        self.email_verified_at = timezone.now()
        self.save(update_fields=["is_verified", "email_verified_at", "updated_at"])
