"""DRF permission classes based on user roles.

Security rule: Frontend = UX only. Backend = source of truth via request.user.role.
Never trust a role sent by the client.
"""

from rest_framework.permissions import BasePermission, IsAuthenticated

from apps.users.choices import UserRole


class IsAuthenticatedUser(IsAuthenticated):
    """Allow only authenticated users (alias with SERVIS naming)."""

    message = "Authentification requise."


class IsClient(BasePermission):
    """Allow access only to users with the CLIENT role."""

    message = "Accès réservé aux clients."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.CLIENT
        )


class CanShop(BasePermission):
    """
    Allow marketplace shopping (cart / orders / client payments).

    Phase 6: a professionnel (SELLER) may also act as a client.
    """

    message = "Accès réservé aux acheteurs (client ou professionnel)."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.CLIENT, UserRole.SELLER)
        )


class IsSeller(BasePermission):
    """Allow access only to users with the SELLER role (not is_staff)."""

    message = "Accès réservé aux professionnels."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.SELLER
        )


class IsAdminRole(BasePermission):
    """
    Allow access only to users with role == ADMIN.

    Distinct from Django's is_staff / is_superuser.
    """

    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsSellerOrAdmin(BasePermission):
    """Allow access to sellers and platform admins (role-based)."""

    message = "Accès réservé aux vendeurs et administrateurs."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.SELLER, UserRole.ADMIN)
        )


class IsStoreOwner(BasePermission):
    """
    Object-level permission for future Store / Product / Order isolation.

    Supports objects shaped as:
    - obj.owner == request.user
    - obj.store.owner == request.user

    ADMIN role bypasses ownership checks (platform moderation).
    Do not use until Store/Product models exist — prepared for Phase 3+.
    """

    message = "Accès réservé au propriétaire de la boutique."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role == UserRole.ADMIN:
            return True

        owner = getattr(obj, "owner", None)
        if owner is not None:
            return owner == user

        store = getattr(obj, "store", None)
        if store is not None:
            return getattr(store, "owner", None) == user

        return False
