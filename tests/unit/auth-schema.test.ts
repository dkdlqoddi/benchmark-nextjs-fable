import { describe, expect, it } from "vitest";
import { loginSchema, parseAuthForm, signupSchema } from "@/lib/auth-schema";

describe("loginSchema — valid inputs", () => {
  it("accepts a plain email + password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "secret" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ email: "user@example.com", password: "secret" });
  });

  it("trims and lowercases the email", () => {
    const result = loginSchema.safeParse({
      email: "  User@EXAMPLE.com  ",
      password: "password123",
    });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("user@example.com");
  });

  it("accepts any non-empty password (even 1 char) — real checking is authorize()'s job", () => {
    const result = loginSchema.safeParse({ email: "a.b+tag@sub.example.co", password: "x" });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema — invalid inputs", () => {
  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter a valid email address.");
  });

  it("rejects an empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Password is required.");
  });
});

describe("signupSchema — valid inputs", () => {
  it("accepts a normal signup", () => {
    const result = signupSchema.safeParse({
      email: "new@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts the 8-character lower bound", () => {
    const result = signupSchema.safeParse({ email: "new@example.com", password: "12345678" });
    expect(result.success).toBe(true);
  });

  it("accepts the 72-character upper bound (bcrypt input limit)", () => {
    const result = signupSchema.safeParse({
      email: "new@example.com",
      password: "p".repeat(72),
    });
    expect(result.success).toBe(true);
  });

  it("normalizes the email like the login schema", () => {
    const result = signupSchema.safeParse({
      email: " New@Example.COM ",
      password: "password123",
    });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("new@example.com");
  });
});

describe("signupSchema — invalid inputs", () => {
  it("rejects a 7-character password", () => {
    const result = signupSchema.safeParse({ email: "new@example.com", password: "1234567" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Password must be at least 8 characters.");
  });

  it("rejects a 73-character password", () => {
    const result = signupSchema.safeParse({
      email: "new@example.com",
      password: "p".repeat(73),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Password must be at most 72 characters.");
  });

  it("rejects a malformed email", () => {
    const result = signupSchema.safeParse({ email: "nope@", password: "password123" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter a valid email address.");
  });
});

describe("parseAuthForm — FormData wrapper", () => {
  /** Builds an auth FormData from the given fields. */
  function authFormData(fields: Record<string, string>): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    return formData;
  }

  it("returns normalized data on success", () => {
    const parsed = parseAuthForm(
      loginSchema,
      authFormData({ email: " User@Example.com ", password: "secret" }),
    );
    expect(parsed).toEqual({
      success: true,
      data: { email: "user@example.com", password: "secret" },
    });
  });

  it("maps one message per invalid field", () => {
    const parsed = parseAuthForm(signupSchema, authFormData({ email: "bad", password: "short" }));
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.state.status).toBe("error");
      expect(parsed.state.fieldErrors).toEqual({
        email: "Enter a valid email address.",
        password: "Password must be at least 8 characters.",
      });
    }
  });

  it("echoes the email back but never the password", () => {
    const parsed = parseAuthForm(
      signupSchema,
      authFormData({ email: "someone@example.com", password: "short" }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.state.values).toEqual({ email: "someone@example.com" });
    }
  });

  it("treats missing form fields as empty strings", () => {
    const parsed = parseAuthForm(loginSchema, new FormData());
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.state.fieldErrors?.email).toBeDefined();
      expect(parsed.state.fieldErrors?.password).toBe("Password is required.");
    }
  });
});
