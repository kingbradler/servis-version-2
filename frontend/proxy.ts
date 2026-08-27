import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Soft UX guards for private areas (Next.js 16 `proxy` convention).
 * Real authorization is enforced by Django DRF permissions.
 */

const ACCESS_COOKIE = "servis_access";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessCookie = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);

  const needsAuth =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/admin");

  if (needsAuth && !hasAccessCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/seller/:path*", "/admin/:path*"],
};
