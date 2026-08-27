/** Resolve relative or signed media URLs for payment proofs. */
export function resolveProofUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const api =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const origin = api.replace(/\/api\/v1\/?$/, "");
  // Signed local proofs: /api/v1/storage/signed/...
  if (url.startsWith("/api/")) {
    return `${origin}${url}`;
  }
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

/** Guess a download filename from a proof URL. */
export function proofFilenameFromUrl(url: string, fallback = "preuve"): string {
  try {
    const path = new URL(url, "http://local").pathname;
    const last = path.split("/").filter(Boolean).pop() || "";
    if (/\.(jpe?g|png|webp|pdf)$/i.test(last)) return last;
  } catch {
    /* ignore */
  }
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) return `${fallback}.pdf`;
  if (lower.includes(".png")) return `${fallback}.png`;
  if (lower.includes(".webp")) return `${fallback}.webp`;
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return `${fallback}.jpg`;
  return `${fallback}.bin`;
}

function withDownloadParam(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("download", "1");
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}download=1`;
  }
}

/**
 * Download a proof via blob — required for cross-origin signed URLs
 * (`<a download>` is ignored by browsers when the host differs).
 */
export async function downloadProofFile(
  url: string,
  filename?: string
): Promise<void> {
  const response = await fetch(withDownloadParam(url), {
    method: "GET",
    credentials: "omit",
  });
  if (!response.ok) {
    throw new Error("Impossible de télécharger la preuve.");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename || proofFilenameFromUrl(url);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
