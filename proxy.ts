import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth-config";

// Session-cookie decoding only (optimistic check) — the base config has no
// Prisma or bcrypt, per the framework guidance to keep the proxy DB-free.
const { auth } = NextAuth(authConfig);

/** The only routes reachable without a session. */
const PUBLIC_PATHS = new Set(["/login", "/signup"]);

/**
 * Route guard (Next 16 renamed middleware to proxy): without a session every
 * page except /login and /signup redirects to /login; signed-in users are
 * bounced off the auth pages back home. Real authorization still happens in
 * the data layer — every query/mutation is scoped by the session user id.
 */
export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);
  const isAuthenticated = Boolean(request.auth);

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
  if (isAuthenticated && isPublic) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }
  return NextResponse.next();
});

/** Run on every request except Next internals and static assets. */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
