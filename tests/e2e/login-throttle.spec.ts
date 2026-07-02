import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, logout, signup, uniqueEmail } from "./helpers";

// Audit S-2 regression: 5 consecutive failed logins lock the email for
// 15 minutes; while locked, even the correct password is refused (the
// throttle sits in front of the credential check).
test("five failed logins lock the account, refusing even the correct password", async ({
  page,
}) => {
  const email = uniqueEmail("throttle");
  await signup(page, email);
  await logout(page);

  for (let attempt = 1; attempt <= 5; attempt++) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(`wrong-password-${attempt}`);
    await Promise.all([
      // Network-level barrier: the server action round-trip must finish
      // before the next attempt, or a submit could race the form reset.
      page.waitForResponse((response) => response.request().method() === "POST"),
      page.getByRole("button", { name: "Log in" }).click(),
    ]);
    // Fresh form state per attempt, independent of React's post-action reset.
    await page.reload();
  }

  // The 6th attempt uses the CORRECT password — still refused while locked,
  // with a message that names the throttle, not the credentials.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText(/Too many failed attempts/)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
