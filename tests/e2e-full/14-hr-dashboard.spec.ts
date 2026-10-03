import { test, expect } from "@playwright/test";
import { admin, kasir, state } from "./world";
import { loginViaUi } from "./ui";

test.describe("HR executive dashboard", () => {
  test("HR sees workforce figures; staff are refused", async () => {
    const { client: a } = await admin();
    const { client: k } = await kasir();
    await k.get("/hrm/employees");
    const d = (await a.get<any>("/hrm/dashboard")).body.data;
    expect(d.headcount).toBeGreaterThanOrEqual(2);
    expect(d.presentToday + d.notClockedInYet).toBe(d.headcount);
    expect(d.byDepartment.reduce((s: number, r: any) => s + r.count, 0)).toBe(d.headcount);
    expect(d.pending.total).toBe(d.pending.leaves + d.pending.corrections + d.pending.overtime + d.pending.shiftChanges + d.pending.advances);
    expect((await k.get("/hrm/dashboard")).status).toBe(403);
  });

  test("an expiring document appears with its days left", async () => {
    const { client: a } = await admin();
    const emp = (await a.get<any[]>("/hrm/employees", { perPage: "10" })).body.data[0];
    const soon = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    expect((await a.post(`/hrm/employees/${emp.id}/documents`, { title: "Visa Kerja", docType: "Lain", expiresOn: soon })).ok).toBeTruthy();
    const d = (await a.get<any>("/hrm/dashboard")).body.data;
    const row = d.expiringDocuments.find((x: any) => x.title === "Visa Kerja");
    expect(row, JSON.stringify(d.expiringDocuments)).toBeTruthy();
    expect(row.daysLeft).toBeGreaterThanOrEqual(4);
    expect(row.daysLeft).toBeLessThanOrEqual(5);
  });

  test("the dashboard page renders for HR", async ({ page }) => {
    await loginViaUi(page, state().adminEmail);
    await page.goto("/hrm/dashboard");
    await expect(page.getByText("Karyawan aktif")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Visa Kerja")).toBeVisible();
  });
});
