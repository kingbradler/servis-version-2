/**
 * WhatsApp deep links (wa.me) — no Business API required.
 */

export function digitsOnlyPhone(value: string | null | undefined): string {
  return (value || "").replace(/\D/g, "");
}

export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message?: string
): string | null {
  const digits = digitsOnlyPhone(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function orderPaymentNotifySellerMessage(params: {
  orderId: string;
  storeName: string;
  amountLabel: string;
}): string {
  const short = params.orderId.slice(0, 8);
  return (
    `Bonjour ${params.storeName},\n\n` +
    `Je viens d'effectuer le paiement de ma commande #${short} ` +
    `(${params.amountLabel}) sur SERVIS.\n\n` +
    `Pouvez-vous vérifier et me confirmer la prise en charge ? Merci.`
  );
}

export function orderPaymentConfirmedMessage(params: {
  orderId: string;
  storeName: string;
  amountLabel: string;
  etaHint?: string;
}): string {
  const short = params.orderId.slice(0, 8);
  const eta =
    params.etaHint?.trim() ||
    "Je vous indiquerai le délai de livraison / disponibilité sous peu.";
  return (
    `Bonjour,\n\n` +
    `Votre paiement pour la commande #${short} chez ${params.storeName} ` +
    `(${params.amountLabel}) a bien été confirmé sur SERVIS.\n\n` +
    `${eta}\n\n` +
    `Merci pour votre confiance.`
  );
}

export function serviceRequestPaymentNotifySellerMessage(params: {
  requestId: string;
  serviceName: string;
  amountLabel: string;
}): string {
  const short = params.requestId.slice(0, 8);
  return (
    `Bonjour,\n\n` +
    `Je viens d'effectuer le paiement pour la demande de service « ${params.serviceName} » ` +
    `#${short} (${params.amountLabel}) sur SERVIS.\n\n` +
    `Pouvez-vous vérifier et me confirmer ? Merci.`
  );
}

export function serviceRequestPaymentConfirmedMessage(params: {
  requestId: string;
  serviceName: string;
  amountLabel: string;
  etaHint?: string;
}): string {
  const short = params.requestId.slice(0, 8);
  const eta =
    params.etaHint?.trim() ||
    "Je vous recontacte bientôt pour la suite de l'intervention.";
  return (
    `Bonjour,\n\n` +
    `Votre paiement pour la demande « ${params.serviceName} » #${short} ` +
    `(${params.amountLabel}) a bien été confirmé sur SERVIS.\n\n` +
    `${eta}\n\n` +
    `Merci pour votre confiance.`
  );
}

export function subscriptionPaymentNotifyPlatformMessage(params: {
  planName: string;
  amountLabel: string;
  ownerEmail?: string;
}): string {
  return (
    `Bonjour SERVIS,\n\n` +
    `Je viens de payer l'abonnement « ${params.planName} » ` +
    `(${params.amountLabel})` +
    (params.ownerEmail ? ` — compte ${params.ownerEmail}` : "") +
    `.\n\n` +
    `Merci de vérifier ma preuve et d'activer mon offre.`
  );
}

export function subscriptionPaymentConfirmedMessage(params: {
  planName: string;
}): string {
  return (
    `Bonjour,\n\n` +
    `Votre paiement pour l'abonnement « ${params.planName} » a été validé sur SERVIS.\n\n` +
    `Votre offre est maintenant active. Merci !`
  );
}
