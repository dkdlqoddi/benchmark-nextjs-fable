import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { authConfig } from "@/lib/auth-config";
import { loginSchema } from "@/lib/auth-schema";
import { prisma } from "@/lib/prisma";

// Compared when the email is unknown so failed logins cost one bcrypt compare
// either way (no user-enumeration timing signal). Hash of a throwaway string.
const DUMMY_HASH = "$2b$10$2VDbJcrFblziQ1WrFVHkX.LqWYOYeoUCP6tA.tyT.zSI1TnZIa8Cu";

/**
 * Full Auth.js setup: the shared base config plus the credentials provider,
 * which needs Prisma and bcrypt and therefore must stay out of the proxy.
 * `signIn`/`signOut` are only ever called from server actions (no API routes).
 */
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      /** Verifies email + password against the User table; null rejects the login. */
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !passwordMatches) {
          return null;
        }
        return { id: user.id, email: user.email };
      },
    }),
  ],
});

/**
 * Returns the signed-in user's id for scoping queries; redirects to /login
 * when there is no session. Pages and server actions must call this (or scope
 * by `auth()` themselves) rather than trusting the proxy guard alone.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  return userId;
}
