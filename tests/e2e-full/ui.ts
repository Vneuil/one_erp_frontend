import { expect, Page } from "@playwright/test";
import { PASSWORD } from "./api";

/** Signs in through the real login form and waits for the dashboard shell. */
export async function loginViaUi(page: Page, email: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  // The shell shows "Loading account…" until the profile and permissions are in.
  await expect(page.getByText(/Memuat akun|Loading account/)).toHaveCount(0, { timeout: 30_000 });
}

/** Collects browser errors so a test can assert the page rendered cleanly. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource.*(401|404)/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}
