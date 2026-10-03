import { test, expect } from "@playwright/test";
import { state } from "./world";
import { loginViaUi, watchErrors } from "./ui";

test.describe("the real UI: sign-in, navigation and page health", () => {
  test("an admin signs in and reaches the dashboard", async ({ page }) => {
    const errors = watchErrors(page);
    await loginViaUi(page, state().adminEmail);
    await expect(page).toHaveURL(/\/dashboard/);
    expect(errors.filter((e) => !/hydrat/i.test(e))).toEqual([]);
  });

  test("wrong password stays on the login page with an error", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(state().adminEmail);
    await page.locator('input[type="password"]').fill("not-the-password");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("alert").or(page.getByText(/invalid|salah|gagal/i)).first()).toBeVisible();
  });

  const PAGES = [
    "/hrm/requests", "/hrm/schedule", "/hrm/documents", "/hrm/feedback", "/hrm/announcements", "/hrm/canteen", "/hrm/visits",
    "/hrm/payroll", "/hrm/reimbursements", "/hrm/leaves", "/hrm/attendance",
    "/finance/owner-funds", "/finance/budgets", "/finance/reports", "/sales/billing-terms", "/sales/invoices", "/sales/deliveries",
    "/pos", "/pos/transactions", "/pos/reports", "/pos/settings", "/inventory/batches", "/master-data/labels", "/master-data/products",
    "/crm/leads", "/crm/pipeline", "/crm/tasks", "/crm/contacts", "/crm/analytics", "/crm/settings",
    "/projects", "/projects/work-orders", "/projects/profitability",
    "/hrm/cash-advances", "/hrm/attendance-locations", "/inventory/stock-movements/summary", "/tools/drive", "/hrm/employees", "/hrm/dashboard", "/hrm/my-payslips", "/hrm/organization", "/hrm/team-approvals",
  ];
  test("every new or changed page renders for an admin without browser errors", async ({ page }) => {
    test.setTimeout(240_000);
    await loginViaUi(page, state().adminEmail);
    const failures: string[] = [];
    for (const path of PAGES) {
      const errors = watchErrors(page);
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      const body = (await page.locator("body").innerText()).slice(0, 4000);
      if (!res || res.status() >= 400) failures.push(`${path}: HTTP ${res?.status()}`);
      else if (/Application error|Unhandled Runtime Error|This page couldn.t load/i.test(body)) failures.push(`${path}: crashed`);
      else if (/^\s*$/.test(body)) failures.push(`${path}: blank`);
      const real = errors.filter((e) => !/hydrat|Warning:/i.test(e));
      if (real.length) failures.push(`${path}: ${real.slice(0, 2).join(" | ")}`);
      page.removeAllListeners("pageerror");
      page.removeAllListeners("console");
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});
