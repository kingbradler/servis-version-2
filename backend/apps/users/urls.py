"""Authentication + access-control URL configuration."""

from django.urls import path

from apps.users import access_views, views

app_name = "auth"

urlpatterns = [
    # Auth (public)
    path("register/", views.RegisterView.as_view(), name="register"),
    path("register/seller/", views.SellerRegisterView.as_view(), name="register-seller"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("verify-email/", views.VerifyEmailView.as_view(), name="verify-email"),
    path(
        "resend-verification/",
        views.ResendVerificationView.as_view(),
        name="resend-verification",
    ),
    path(
        "password-reset/",
        views.PasswordResetRequestView.as_view(),
        name="password-reset",
    ),
    path(
        "password-reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("refresh/", views.RefreshView.as_view(), name="refresh"),
    path("csrf/", views.CsrfView.as_view(), name="csrf"),
    # Auth (authenticated)
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
    # Access probes (role gates — no business logic)
    path(
        "access/authenticated/",
        access_views.AuthenticatedAccessView.as_view(),
        name="access-authenticated",
    ),
    path("access/client/", access_views.ClientAccessView.as_view(), name="access-client"),
    path("access/seller/", access_views.SellerAccessView.as_view(), name="access-seller"),
    path("access/admin/", access_views.AdminAccessView.as_view(), name="access-admin"),
    path(
        "access/seller-or-admin/",
        access_views.SellerOrAdminAccessView.as_view(),
        name="access-seller-or-admin",
    ),
]
