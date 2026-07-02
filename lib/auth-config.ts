import type { DefaultSession, NextAuthConfig } from "next-auth";

declare module "next-auth" {
  /** Session shape used app-wide: `user.id` is what every query scopes by. */
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

// Signs/encrypts the JWT session cookie. The fallback keeps the zero-.env dev
// setup working (same pattern as the DATABASE_URL default) but is strictly
// non-production: it is committed to the repo, so a production deployment
// running on it would have forgeable sessions. In production the secret comes
// from the environment only — when AUTH_SECRET is missing there, Auth.js fails
// closed per request with MissingSecret instead of serving insecure sessions.
const secret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : "habitlog-dev-only-secret-change-in-production");

/**
 * Base Auth.js options shared by the full server config (`lib/auth.ts`) and
 * the proxy route guard (`proxy.ts`). Deliberately free of Prisma and bcrypt:
 * the proxy must only decode the session cookie (optimistic check), never hit
 * the database.
 */
export const authConfig = {
  secret,
  // Required for self-hosted deployments (`next start`); we serve on localhost.
  trustHost: true,
  // Credentials sign-in only works with JWT sessions (no DB session table).
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Providers live in lib/auth.ts; the proxy never initiates a sign-in.
  providers: [],
  callbacks: {
    /** Stores the user id in the JWT at sign-in (`sub` claim). */
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    /** Exposes the user id on `session.user` for query scoping. */
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
