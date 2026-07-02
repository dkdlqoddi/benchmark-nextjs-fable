import { z } from "zod";
import { firstIssuePerField, type FormState, type ParsedForm } from "@/lib/form-state";

const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

/** Login form: any non-empty password — real checking happens in authorize(). */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required."),
});

/** Signup form: bcrypt only uses the first 72 bytes, hence the upper bound. */
export const signupSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters."),
});

/** Submitted email echoed back on error (passwords are never echoed). */
export type AuthFormValues = { email: string };

/** State returned by the auth server actions for useActionState. */
export type AuthFormState = FormState<"email" | "password", AuthFormValues>;

type ParsedAuthForm = ParsedForm<{ email: string; password: string }, AuthFormState>;

/**
 * Parses a login/signup form against the given schema; on failure returns a
 * form state carrying one message per invalid field plus the submitted email.
 */
export function parseAuthForm(
  schema: typeof loginSchema | typeof signupSchema,
  formData: FormData,
): ParsedAuthForm {
  const values = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const result = schema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    state: {
      status: "error",
      fieldErrors: firstIssuePerField<"email" | "password">(result.error.issues),
      // Only the email is echoed back — passwords never round-trip into state.
      values: { email: values.email },
    },
  };
}
