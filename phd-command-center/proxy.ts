import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth check plus crawler headers.
 *
 * This only reads the session cookie — it is a redirect for signed-out visitors, not the security
 * boundary. The real check is `requireViewer()` in `lib/guard.ts`, which runs next to the data.
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

const PRIVATE_PREFIXES = [
  "/dashboard",
  "/api/jobs",
  "/api/programs",
  "/api/professors",
  "/api/outreach",
  "/api/cv",
  "/api/statements",
  "/api/applications",
  "/api/export",
];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isPrivate = PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isPrivate) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.get(name)?.value);

  if (!hasSession && pathname.startsWith("/dashboard")) {
    const signIn = new URL("/signin", request.url);
    signIn.searchParams.set("from", pathname);
    const redirectResponse = NextResponse.redirect(signIn);
    redirectResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    return redirectResponse;
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
