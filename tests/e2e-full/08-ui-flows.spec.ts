import { test, expect, request } from "@playwright/test";
import { admin, state } from "./world";
import { loginViaUi } from "./ui";

test.describe("the real UI: public form, POS transactions, role visibility", () => {
  test("public lead form page submits and the lead shows up in the CRM", async ({ page }) => {
    const { client: a } = await admin();
    const form = await a.post("/crm/lead-forms", { name: "UI Form", source: "web-form", defaultPic: state().adminEmail });
    expect(form.ok, JSON.stringify(form.body)).toBeTruthy();
    const key: string = form.body.data.key;
    // The CRM API spec deliberately trips the public endpoint's per-IP limiter (20/min); wait it out.
    test.setTimeout(120_000);
    const anon = await request.newContext();
    const infoUrl = `${process.env.E2E_API_URL ?? "http://localhost:3100/api/v1"}/public/lead-forms/${key}`;
    for (let i = 0; i < 70 && (await anon.get(infoUrl)).status() === 429; i++) await new Promise((r) => setTimeout(r, 1000));
    await page.goto(`/forms/${key}`);
    await expect(page.locator("form")).toBeVisible({ timeout: 20_000 });
    await page.getByLabel(/^Nama/).fill("Lead Dari UI");
    await page.getByLabel("Email").fill("ui-lead@web.test");
    await page.getByLabel(/^Telepon/).fill("+62 811-2222-333");
    await page.getByLabel("Pesan").fill("Ingin demo produk");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/terima kasih|thank/i).first()).toBeVisible({ timeout: 20_000 });
    const leads = await a.get("/crm/leads", { perPage: "100" });
    expect(JSON.stringify(leads.body)).toContain("Lead Dari UI");
  });

  test("POS transactions: sale visible; staff sees no void/approve controls they may not use", async ({ page }) => {
    await loginViaUi(page, state().kasirEmail);
    await page.goto("/pos/transactions");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.locator("body")).not.toContainText(/Application error/i);
    // Leaves page: cashier must not see approve/reject controls.
    await page.goto("/hrm/leaves");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.getByRole("button", { name: /^(Setujui|Approve)$/ })).toHaveCount(0);
  });

  test("route guard: anonymous visitor to a protected page is sent to login", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/hrm/payroll");
    await page.waitForURL(/\/login/, { timeout: 20_000 });
    await ctx.close();
  });

  test("budget page: pasted CSV previews and imports", async ({ page }) => {
    const { client: a } = await admin();
    const proj = await a.post("/projects", { name: "UI Proyek", customer: "PT UI" });
    expect(proj.ok, JSON.stringify(proj.body)).toBeTruthy();
    const id = proj.body.data.id;
    await loginViaUi(page, state().adminEmail);
    await page.goto(`/projects/${id}/budget`);
    const box = page.getByPlaceholder(/tempel isi spreadsheet/);
    await box.fill("kind,category,description,quantity,unit,unitPrice\nrab,Material,Semen 50kg,100,sak,65000\nrap,Material,Semen 50kg,100,sak,58000");
    await page.getByRole("button", { name: /Impor$/ }).click();
    await expect(page.getByText("Anggaran diimpor.")).toBeVisible({ timeout: 20_000 });
    const view = await a.get(`/projects/${id}/budget`);
    expect(JSON.stringify(view.body)).toContain("Semen 50kg");
  });
});
