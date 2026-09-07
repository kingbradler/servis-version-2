import { NextResponse } from "next/server";
import type { NextRequest } from "next/request";

/**
 * Soft UX note for private areas (Next.js 16 `proxy` convention).
 *
 * Do not redirect here based on `servis_access`. That JWT cookie is set by
 * the API host (api.servis-superrapid.com). The browser does not send it to
 * the frontend host (www) unless JWT_COOKIE_DOMAIN is the parent domain.
 * Gating on it bounced logged-in admins back to /login.
 *
 * Real authorization: RequireAuth (client, via /auth/me) + Django.
 */

export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/seller/:path*", "/admin/:path*"],
};
