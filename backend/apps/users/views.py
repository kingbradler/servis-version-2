"""Authentication API views — JWT HttpOnly cookies + CSRF."""

from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.authentication import enforce_csrf
from apps.users.cookies import (
    clear_jwt_cookies,
    get_refresh_token_from_request,
    set_jwt_cookies,
)
from apps.users.permissions import IsAuthenticatedUser
from apps.users.serializers import (
    ClientRegisterSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ResendVerificationSerializer,
    SellerRegisterSerializer,
    UserMeSerializer,
    UserMeUpdateSerializer,
    VerifyEmailSerializer,
)
from apps.users.tokens import issue_tokens_for_user
from apps.users.email_verification import send_verification_email
from apps.users.password_reset import send_password_reset_email
from apps.users.throttles import (
    AuthEmailRateThrottle,
    LoginRateThrottle,
    PasswordResetRateThrottle,
    RegisterRateThrottle,
)


def _auth_response(user, *, http_status=status.HTTP_200_OK) -> Response:
    """Build user payload response and attach JWT cookies."""
    access, refresh = issue_tokens_for_user(user)
    response = Response(UserMeSerializer(user).data, status=http_status)
    set_jwt_cookies(response, access, refresh)
    return response


class RegisterView(APIView):
    """Register a new client account and issue JWT cookies."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RegisterRateThrottle]
    serializer_class = ClientRegisterSerializer

    @extend_schema(
        tags=["Auth"],
        summary="Inscription client",
        request=ClientRegisterSerializer,
        responses={
            201: UserMeSerializer,
            400: OpenApiResponse(description="Erreur de validation"),
        },
    )
    def post(self, request):
        serializer = ClientRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification_email(user)
        return _auth_response(user, http_status=status.HTTP_201_CREATED)


class SellerRegisterView(APIView):
    """Register a new seller account and issue JWT cookies."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RegisterRateThrottle]
    serializer_class = SellerRegisterSerializer

    @extend_schema(
        tags=["Auth"],
        summary="Inscription vendeur",
        request=SellerRegisterSerializer,
        responses={
            201: UserMeSerializer,
            400: OpenApiResponse(description="Erreur de validation"),
        },
    )
    def post(self, request):
        serializer = SellerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if not send_verification_email(user):
    user.mark_email_verified()
        return _auth_response(user, http_status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    """Confirm email from uid + token (public)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Auth"],
        summary="Confirmer l'adresse e-mail",
        request=VerifyEmailSerializer,
        responses={200: UserMeSerializer},
    )
    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserMeSerializer(user).data, status=status.HTTP_200_OK)


class ResendVerificationView(APIView):
    """Resend verification email (authenticated or by email)."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthEmailRateThrottle]

    @extend_schema(
        tags=["Auth"],
        summary="Renvoyer l'e-mail de confirmation",
        request=ResendVerificationSerializer,
        responses={200: OpenApiResponse(description="E-mail renvoyé si applicable")},
    )
    def post(self, request):
        serializer = ResendVerificationSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        sent = False
        if user is not None:
            sent = send_verification_email(user)
        return Response(
            {
                "detail": (
                    "Si un compte correspond, un e-mail de confirmation "
                    "a été envoyé."
                ),
                "sent": sent,
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """Send password reset email (always 200 — no email enumeration)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetRateThrottle]

    @extend_schema(
        tags=["Auth"],
        summary="Demander une réinitialisation de mot de passe",
        request=PasswordResetRequestSerializer,
        responses={
            200: OpenApiResponse(description="E-mail envoyé si le compte existe"),
        },
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data.get("user")
        if user is not None:
            send_password_reset_email(user)
        return Response(
            {
                "detail": (
                    "Si un compte existe pour cet e-mail, vous recevrez "
                    "un lien de réinitialisation."
                )
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Set a new password from uid + token, then issue JWT cookies."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetRateThrottle]

    @extend_schema(
        tags=["Auth"],
        summary="Confirmer la réinitialisation du mot de passe",
        request=PasswordResetConfirmSerializer,
        responses={200: UserMeSerializer},
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _auth_response(user, http_status=status.HTTP_200_OK)


class LoginView(APIView):
    """Login with email/password — sets HttpOnly JWT cookies."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle]
    serializer_class = LoginSerializer

    @extend_schema(
        tags=["Auth"],
        summary="Connexion",
        request=LoginSerializer,
        responses={
            200: UserMeSerializer,
            400: OpenApiResponse(description="Identifiants invalides"),
        },
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return _auth_response(user)


class LogoutView(APIView):
    """Logout — requires authentication; blacklist refresh + clear JWT cookies."""

    permission_classes = [IsAuthenticatedUser]

    @extend_schema(
        tags=["Auth"],
        summary="Déconnexion",
        responses={
            200: OpenApiResponse(description="Déconnexion réussie"),
            401: OpenApiResponse(description="Non authentifié"),
        },
    )
    def post(self, request):
        # Cookie auth → CSRF on unsafe methods (handled by JWTCookieAuthentication)
        refresh_token = get_refresh_token_from_request(request)
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, InvalidToken, AttributeError):
                pass

        response = Response({"detail": "Déconnexion réussie."}, status=status.HTTP_200_OK)
        clear_jwt_cookies(response)
        return response


class MeView(APIView):
    """
    Return / update the currently authenticated user's profile.

    Source of truth: request.user from JWT cookie.
    Query params such as ?user_id= are ignored and never used for lookup.
    """

    permission_classes = [IsAuthenticatedUser]

    @extend_schema(
        tags=["Auth"],
        summary="Profil utilisateur connecté",
        responses={
            200: UserMeSerializer,
            401: OpenApiResponse(description="Non authentifié"),
        },
    )
    def get(self, request):
        # Never use request.query_params / request.data for identity
        return Response(UserMeSerializer(request.user).data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["Auth"],
        summary="Mettre à jour mon profil",
        request=UserMeUpdateSerializer,
        responses={
            200: UserMeSerializer,
            400: OpenApiResponse(description="Erreur de validation"),
            401: OpenApiResponse(description="Non authentifié"),
        },
    )
    def patch(self, request):
        serializer = UserMeUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserMeSerializer(request.user).data, status=status.HTTP_200_OK)


class RefreshView(APIView):
    """
    Rotate access (and refresh) tokens from the HttpOnly refresh cookie.

    Does not require a valid access token — only a valid refresh cookie.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Auth"],
        summary="Rafraîchir les tokens JWT",
        request=None,
        responses={
            200: OpenApiResponse(description="Tokens renouvelés (cookies HttpOnly)"),
            401: OpenApiResponse(description="Refresh token manquant ou invalide"),
        },
    )
    def post(self, request):
        refresh_token = get_refresh_token_from_request(request)
        if not refresh_token:
            return Response(
                {"detail": "Refresh token manquant."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Refresh cookie present → CSRF required
        enforce_csrf(request)

        from django.contrib.auth import get_user_model

        User = get_user_model()

        try:
            old_refresh = RefreshToken(refresh_token)
            user_id = old_refresh.payload.get("user_id")
            # Blacklist old refresh (rotation)
            try:
                old_refresh.blacklist()
            except AttributeError:
                pass

            user = User.objects.get(pk=user_id)
            if not user.is_active:
                return Response(
                    {"detail": "Ce compte est désactivé."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            access, refresh = issue_tokens_for_user(user)
        except (TokenError, InvalidToken, User.DoesNotExist):
            response = Response(
                {"detail": "Refresh token invalide ou expiré."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_jwt_cookies(response)
            return response

        response = Response({"detail": "Tokens renouvelés."}, status=status.HTTP_200_OK)
        set_jwt_cookies(response, access, refresh)
        return response


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    """Issue a CSRF cookie readable by the frontend (double-submit pattern)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Auth"],
        summary="Obtenir un cookie CSRF",
        responses={200: OpenApiResponse(description="CSRF cookie défini")},
    )
    def get(self, request):
        token = get_token(request)
        return Response({"detail": "CSRF cookie défini.", "csrfToken": token})
