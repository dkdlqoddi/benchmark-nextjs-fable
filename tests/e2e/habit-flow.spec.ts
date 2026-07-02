import { expect, test } from "@playwright/test";
import { createHabit, login, logout, signup, uniqueEmail } from "./helpers";

test("full journey: signup → login → create habit → check in → view stats", async ({ page }) => {
  const email = uniqueEmail("journey");

  // Sign up: creates the account, signs straight in, lands on an empty home.
  await signup(page, email);
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible(); // session email in the top nav

  // Sign out, then log back in with the same credentials.
  await logout(page);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await login(page, email);

  // Create a habit (default color, every-day target days).
  await createHabit(page, {
    name: "Morning run",
    description: "5k around the park",
    tags: "health",
  });
  await expect(page.getByText("Tracking 1 habit.")).toBeVisible();
  const habitCard = page.locator("li").filter({
    has: page.getByRole("heading", { name: "Morning run" }),
  });
  await expect(habitCard.getByRole("link", { name: "#health" })).toBeVisible();

  // Check in today: the toggle flips to done.
  await page.getByRole("button", { name: "Check in today" }).click();
  const doneButton = page.getByRole("button", { name: "✓ Done today" });
  await expect(doneButton).toBeVisible();
  await expect(doneButton).toHaveAttribute("aria-pressed", "true");

  // Stats: the habit shows a 1-day current/longest streak and 1 total check-in.
  await page.getByRole("link", { name: "Stats" }).click();
  await page.waitForURL("/stats");
  await expect(page.getByRole("heading", { name: "Weekly completion" })).toBeVisible();
  const statsCard = page.locator("li").filter({
    has: page.getByRole("heading", { name: "Morning run" }),
  });
  const tile = (label: string) =>
    statsCard.locator("dl > div").filter({ hasText: label }).locator("dd");
  await expect(tile("Current streak")).toHaveText(/^1\s*day$/);
  await expect(tile("Longest streak")).toHaveText(/^1\s*day$/);
  await expect(tile("Total check-ins")).toHaveText("1");

  // The calendar detail page shows the check-in too.
  await statsCard.getByRole("link", { name: "Morning run" }).click();
  await expect(page.getByRole("heading", { name: "Morning run" })).toBeVisible();
  await expect(page.getByText(/1 check-in in/)).toBeVisible();
});
