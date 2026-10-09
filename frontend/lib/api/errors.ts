/** API error with HTTP status — for UX redirects (401/403). */

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** Known business error codes → clear French copy for non-technical users. */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  service_subscription_required:
    "Pour publier un service, vous devez d’abord activer un abonnement Services. Rendez-vous dans Abonnement pour choisir une offre.",
  product_limit_exceeded:
    "Vous avez atteint le nombre maximum de produits actifs pour votre offre. Passez à un abonnement supérieur ou archivez des produits.",
  product_image_limit_exceeded:
    "Votre offre limite le nombre de photos par produit. Passez à un abonnement supérieur pour en ajouter davantage.",
  advanced_stats_required:
    "Les statistiques avancées sont réservées aux abonnements Pro. Consultez la page Abonnement pour passer à Pro.",
  permission_denied:
    "Vous n’avez pas l’autorisation d’effectuer cette action.",
  not_authenticated:
    "Veuillez vous connecter pour continuer.",
  authentication_failed:
    "Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.",
  invalid_credentials:
    "Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.",
  email_already_exists:
    "Cet e-mail est déjà utilisé. Connectez-vous ou utilisez une autre adresse.",
  email_not_verified:
    "Votre e-mail n’est pas encore vérifié. Consultez votre boîte de réception.",
  store_not_approved:
    "Votre boutique n’est pas encore approuvée. Patientez ou contactez SERVIS.",
  store_required:
    "Créez d’abord votre boutique pour continuer.",
  out_of_stock:
    "Ce produit n’a plus assez de stock pour cette quantité.",
  invalid_status_transition:
    "Cette action n’est pas possible dans l’état actuel. Actualisez la page puis réessayez.",
};

const STATUS_FALLBACKS: Record<number, string> = {
  400: "Certaines informations sont incorrectes ou incomplètes. Vérifiez le formulaire.",
  401: "Veuillez vous connecter pour continuer.",
  403: "Cette action n’est pas autorisée avec votre compte actuel.",
  404: "Élément introuvable. Il a peut‑être été supprimé ou n’existe plus.",
  409: "Cette action entre en conflit avec l’état actuel. Réessayez ou actualisez la page.",
  408: "Le serveur met trop de temps à répondre. Réessayez dans un instant.",
  413: "Le fichier est trop volumineux. Essayez une image plus légère.",
  429: "Trop de tentatives. Patientez un moment puis réessayez.",
  500: "Un problème est survenu de notre côté. Réessayez dans quelques instants.",
  502: "Le service est temporairement indisponible. Réessayez bientôt.",
  503: "Le service est temporairement indisponible. Réessayez bientôt.",
};

function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const found = firstString(nested);
      if (found) return found;
    }
  }
  return null;
}

function extractErrorCode(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.code === "string" && record.code !== "error") {
    return record.code;
  }
  const fields = record.fields;
  if (fields && typeof fields === "object") {
    const code = (fields as Record<string, unknown>).error_code;
    if (typeof code === "string") return code;
  }
  if (typeof record.error_code === "string") return record.error_code;
  return null;
}

/**
 * Build a user-facing French message from a DRF / API error body.
 * Never returns technical jargon like "Erreur API".
 */
export function messageFromApiBody(
  body: unknown,
  status?: number,
  fallback = "Une erreur est survenue. Veuillez réessayer."
): string {
  const code = extractErrorCode(body);
  if (code && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code];
  }

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;

    const detail = record.detail;
    if (typeof detail === "string" && detail.trim()) {
      return softenTechnicalCopy(detail.trim());
    }
    // detail may be a nested object/list (DRF validation)
    const fromDetail = firstString(detail);
    if (fromDetail) return softenTechnicalCopy(fromDetail);

    const fromFields = firstString(record.fields);
    if (fromFields) return softenTechnicalCopy(fromFields);

    // Raw DRF shape without our custom handler
    const fromRoot = firstString(
      Object.fromEntries(
        Object.entries(record).filter(
          ([key]) => !["code", "status_code", "error_code"].includes(key)
        )
      )
    );
    if (fromRoot) return softenTechnicalCopy(fromRoot);
  }

  if (status && STATUS_FALLBACKS[status]) {
    return STATUS_FALLBACKS[status];
  }
  return fallback;
}

/** Soften leftover technical bits in backend strings. */
function softenTechnicalCopy(message: string): string {
  return message
    .replace(/\s*Souscrivez via \/seller\/subscription\.?/gi, "")
    .replace(/\/seller\/subscription/gi, "la page Abonnement")
    .replace(/\bACTIVE\b/g, "actif")
    .replace(/\bDRAFT\b/g, "brouillon")
    .replace(/\bARCHIVED\b/g, "archivé")
    .replace(/\bPENDING\b/g, "en attente")
    .replace(/CSRF Failed:?[^.]*\.?/gi, "Session expirée. Actualisez la page puis réessayez.")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Preferred helper for UI catch blocks.
 */
export function getUserFacingErrorMessage(
  err: unknown,
  fallback = "Une erreur est survenue. Veuillez réessayer."
): string {
  if (isApiError(err)) {
    return messageFromApiBody(err.body, err.status, err.message || fallback);
  }
  if (err instanceof TypeError) {
    return "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
  }
  if (err instanceof Error && err.message && !/erreur api/i.test(err.message)) {
    return softenTechnicalCopy(err.message);
  }
  return fallback;
}
