import type { Metadata } from "next";
import { login } from "@/actions/auth";
import { AuthForm } from "@/components/features/AuthForm";

export const metadata: Metadata = {
  title: "Log in",
};

/** Login page: credentials (email + password) sign-in form. */
export default function LoginPage() {
  return (
    <section className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back — sign in to get to your habits.
        </p>
      </div>
      <AuthForm
        action={login}
        submitLabel="Log in"
        pendingLabel="Logging in…"
        passwordAutoComplete="current-password"
        footer={{ text: "No account yet?", linkLabel: "Sign up", href: "/signup" }}
      />
    </section>
  );
}
