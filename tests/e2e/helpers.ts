import { expect, type Page } from "@playwright/test";

/** Password shared by every E2E account (signup requires ≥ 8 characters). */
export const E2E_PASSWORD = "e2e-password-123";

/** Returns a unique email so repeated runs never collide on the unique index. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`;
}

/** Creates an account through /signup; ends signed in on the home page. */
export async function signup(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("heading", { name: "Your habits" })).toBeVisible();
}

/** Signs in through /login; ends on the home page. */
export async function login(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("heading", { name: "Your habits" })).toBeVisible();
}

/** Signs out via the top-nav button; ends on the login page. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/login");
}

/**
 * Creates a habit through the /habits/new form (default color and every-day
 * target days); ends back on the home page with the new card visible.
 */
export async function createHabit(
  page: Page,
  habit: { name: string; description?: string; tags?: string },
): Promise<void> {
  await page.getByRole("link", { name: "New habit" }).click();
  await page.waitForURL("/habits/new");
  await page.getByLabel("Name", { exact: true }).fill(habit.name);
  if (habit.description) {
    await page.getByLabel("Description").fill(habit.description);
  }
  if (habit.tags) {
    await page.getByLabel("Tags").fill(habit.tags);
  }
  await page.getByRole("button", { name: "Create habit" }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("heading", { name: habit.name })).toBeVisible();
}
