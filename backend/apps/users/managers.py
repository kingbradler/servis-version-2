"""Custom user manager — email-based authentication."""

from django.contrib.auth.models import BaseUserManager

from apps.users.choices import UserRole


class UserManager(BaseUserManager):
    """Manager for the custom User model."""

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user with the given email and password."""
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")

        email = self.normalize_email(email)
        extra_fields.setdefault("role", UserRole.CLIENT)
        extra_fields.setdefault("is_active", True)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser with the ADMIN role."""
        extra_fields.setdefault("role", UserRole.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_verified", True)

        if extra_fields.get("role") != UserRole.ADMIN:
            raise ValueError("Le superutilisateur doit avoir le rôle ADMIN.")
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superutilisateur doit avoir is_superuser=True.")

        return self.create_user(email, password, **extra_fields)
