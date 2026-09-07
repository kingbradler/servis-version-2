/** Lightweight UI session marker. JWT cookies are HttpOnly; this avoids
 * probing /auth/me on every public page for visitors who never logged in. */

const FLAG = "servis_ui_session";
export const UI_SESSION_EVENT = "servis-ui-session";

export function hasUiSession(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((part) => part.startsWith(`${FLAG}=`));
}

function notify(on: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UI_SESSION_EVENT, { detail: on }));
}

export function markUiSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${FLAG}=1; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  notify(true);
}

export function clearUiSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${FLAG}=; Path=/; Max-Age=0; SameSite=Lax`;
  notify(false);
}
