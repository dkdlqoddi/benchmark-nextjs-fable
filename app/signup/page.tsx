import type { Metadata } from "next";
import { signup } from "@/actions/auth";
import { AuthForm } from "@/components/features/AuthForm";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a HabitLog account and start tracking habits.",
};

/** Signup page: creates an account and signs the new user straight in. */
export default function SignupPage() {
  return (
    <section className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sign up</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create an account to start tracking habits.
        </p>
      </div>
      <AuthForm
        action={signup}
        submitLabel="Create account"
        pendingLabel="Creating account…"
        passwordAutoComplete="new-password"
        passwordHint="At least 8 characters."
        footer={{ text: "Already have an account?", linkLabel: "Log in", href: "/login" }}
      />
    </section>
  );
}
