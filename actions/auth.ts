"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { loginSchema, parseAuthForm, signupSchema, type AuthFormState } from "@/lib/auth-schema";
import {
  clearFailedLogins,
  lockoutLabel,
  loginLockRemainingMs,
  recordFailedLogin,
} from "@/lib/login-rate-limit";
import { isPrismaErrorCode, prisma } from "@/lib/prisma";

/** bcrypt cost factor for password hashing (matches the seed script). */
const BCRYPT_ROUNDS = 10;

/**
 * Creates an account from the signup form, then signs the new user in and
 * redirects home. Returns per-field errors (including "email taken") instead.
 */
export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseAuthForm(signupSchema, formData);
  if (!parsed.success) {
    return parsed.state;
  }
  const { email, password } = parsed.data;

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    await prisma.user.create({ data: { email, passwordHash } });
  } catch (error) {
    // Unique violation: the email is already registered (or a concurrent
    // signup won the race) — report it on the field either way.
    if (!isPrismaErrorCode(error, "P2002")) {
      throw error;
    }
    return {
      status: "error",
      fieldErrors: { email: "An account with this email already exists." },
      values: { email },
    };
  }

  return signInWithCredentials(email, password);
}

/**
 * Logs in with email + password; bad credentials come back as a form error.
 * Repeated failures are throttled per email (lib/login-rate-limit.ts): a
 * locked email is refused before any credential check, with a message that
 * never discloses whether the account exists.
 */
export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = parseAuthForm(loginSchema, formData);
  if (!parsed.success) {
    return parsed.state;
  }
  const { email, password } = parsed.data;

  const lockMs = loginLockRemainingMs(email, Date.now());
  if (lockMs > 0) {
    return {
      status: "error",
      formError: `Too many failed attempts. Try again in ${lockoutLabel(lockMs)}.`,
      values: { email },
    };
  }
  return signInWithCredentials(email, password);
}

/** Signs the user out and lands on the login page. */
export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

/**
 * Runs the credentials sign-in: success redirects home, failure returns form
 * state. Each failure feeds the per-email throttle; success clears it.
 */
async function signInWithCredentials(email: string, password: string): Promise<AuthFormState> {
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      recordFailedLogin(email, Date.now());
      return { status: "error", formError: "Invalid email or password.", values: { email } };
    }
    // Success surfaces as Next's redirect "error" — clear the failure streak,
    // then rethrow so Next handles the redirect.
    clearFailedLogins(email);
    throw error;
  }
  clearFailedLogins(email);
  return { status: "idle" };
}
