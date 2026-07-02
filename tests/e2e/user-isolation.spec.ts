import { expect, test } from "@playwright/test";
import { createHabit, login, logout, signup, uniqueEmail } from "./helpers";

test("one user's habit data is invisible and unreachable for another user", async ({ page }) => {
  // Alice creates a habit and checks in.
  const alice = uniqueEmail("alice");
  await signup(page, alice);
  await createHabit(page, { name: "Alice secret habit" });
  await page.getByRole("button", { name: "Check in today" }).click();
  await expect(page.getByRole("button", { name: "✓ Done today" })).toBeVisible();
  const habitUrl = await page
    .getByRole("heading", { name: "Alice secret habit" })
    .getByRole("link")
    .getAttribute("href");
  expect(habitUrl).toMatch(/^\/habits\/[^/]+$/);
  await logout(page);

  // Bob signs up: his home and stats are empty — Alice's data never shows.
  const bob = uniqueEmail("bob");
  await signup(page, bob);
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alice secret habit" })).toHaveCount(0);
  await page.goto("/stats");
  await expect(page.getByText("No habits to analyze yet.")).toBeVisible();

  // Direct navigation to Alice's habit detail and edit pages 404s for Bob —
  // a foreign habit id behaves exactly like a missing one.
  const detailResponse = await page.goto(habitUrl!);
  expect(detailResponse?.status()).toBe(404);
  await expect(page.getByText("This page could not be found.")).toBeVisible();

  const editResponse = await page.goto(`${habitUrl}/edit`);
  expect(editResponse?.status()).toBe(404);

  // Alice's data was not disturbed: she still sees her habit, checked in.
  await logout(page);
  await login(page, alice);
  await expect(page.getByRole("heading", { name: "Alice secret habit" })).toBeVisible();
  await expect(page.getByRole("button", { name: "✓ Done today" })).toBeVisible();
});

test("signed-out visitors are redirected to the login page", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("/login");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});
