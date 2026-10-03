import { test, expect } from "@playwright/test";
import { admin, spv, kasir, state } from "./world";

test.describe.configure({ mode: "serial" });

const jakarta = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
const TODAY = jakarta();
const PERIOD = TODAY.slice(0, 7);

test.describe("digital payslip with overtime detail", () => {
  let entryId = "";

  test("an approved payslip shows earnings, deductions and the overtime day", async () => {
    const { client: a } = await admin();
    const { client: s } = await spv();
    await s.get("/hrm/employees");
    const list = (await a.get<any[]>("/hrm/employees", { perPage: "200" })).body.data;
    const me = list.find((e: any) => e.email?.toLowerCase() === state().spvEmail.toLowerCase());
    expect((await a.put(`/hrm/employees/${me.id}`, { baseSalary: 10_000_000 })).ok).toBeTruthy();

    const ot = await s.post("/hr-self/overtime", { date: TODAY, minutes: 90, reason: "Closing" });
    expect(ot.ok, JSON.stringify(ot.body)).toBeTruthy();
    expect((await a.post(`/hrm/overtime/${ot.body.data.id}/approve`)).ok).toBeTruthy();

    const created = await a.post("/payroll/entries", { period: PERIOD, employeeId: me.id, taxMethod: "manual", paymentBank: "BCA", bankAccount: "1234567890" });
    expect(created.ok, JSON.stringify(created.body)).toBeTruthy();
    entryId = created.body.data.id;
    expect((await a.post("/payroll/entries/calculate", { period: PERIOD })).ok).toBeTruthy();

    // Not visible to the employee until approved.
    expect((await s.get<any[]>("/hr-self/payslips")).body.data.find((x: any) => x.entryId === entryId)).toBeUndefined();
    expect((await s.get(`/hr-self/payslips/${entryId}`)).status).toBe(404);

    expect((await a.put(`/payroll/entries/${entryId}/status`, { status: "approved" })).ok).toBeTruthy();
    const mine = (await s.get<any[]>("/hr-self/payslips")).body.data;
    expect(mine.find((x: any) => x.entryId === entryId)).toBeTruthy();

    const slip = (await s.get<any>(`/hr-self/payslips/${entryId}`)).body.data;
    expect(slip.period).toBe(PERIOD);
    expect(slip.accountMasked).toBe("••••••7890");
    expect(slip.overtime).toHaveLength(1);
    expect(slip.overtime[0].date).toBe(TODAY);
    expect(slip.overtime[0].minutes).toBe(90);
    expect(slip.overtime[0].amount).toBe(slip.overtime[0].amount); // priced per day
    expect(slip.overtimeHours).toBe(1.5);
    expect(slip.earnings.map((l: any) => l.label)).toEqual(expect.arrayContaining(["Gaji pokok", "Lembur"]));
    expect(Math.round((slip.gross - slip.totalDeductions) * 100)).toBe(Math.round(slip.takeHomePay * 100));
    expect(slip.overtime[0].amount).toBe(slip.earnings.find((l: any) => l.label === "Lembur").amount);
  });

  test("nobody else can read it, HR can", async () => {
    const { client: k } = await kasir();
    expect((await k.get(`/hr-self/payslips/${entryId}`)).status).toBe(404);
    expect((await k.get(`/payroll/entries/${entryId}/payslip`)).status).not.toBe(200);
    const { client: a } = await admin();
    const hr = await a.get<any>(`/payroll/entries/${entryId}/payslip`);
    expect(hr.ok, JSON.stringify(hr.body)).toBeTruthy();
    expect(hr.body.data.entryId).toBe(entryId);
  });

  test("a staff member cannot list everyone's payroll", async () => {
    const { client: k } = await kasir();
    const r = await k.get<any[]>("/payroll/entries", { perPage: "100" });
    const others = r.ok ? (r.body.data ?? []).filter((e: any) => e.id === entryId) : [];
    expect(others, "the supervisor's salary must not be visible to the cashier").toHaveLength(0);
  });

  test("the employee sees it on the payslip page", async ({ page }) => {
    const { loginViaUi } = await import("./ui");
    await loginViaUi(page, state().spvEmail);
    await page.goto("/hrm/my-payslips");
    await page.getByRole("button", { name: /Disetujui|Dibayar/ }).first().click({ timeout: 20_000 });
    await expect(page.getByText("Total penghasilan")).toBeVisible();
    await expect(page.getByText(/Rincian lembur \(1.5 jam\)/)).toBeVisible();
    await expect(page.getByText("••••••7890")).toBeVisible();
  });
});
