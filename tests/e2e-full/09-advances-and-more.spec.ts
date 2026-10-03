import { test, expect } from "@playwright/test";
import { admin, kasir, state } from "./world";
import { unique } from "./api";

test.describe.configure({ mode: "serial" });

const jakarta = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
const PERIOD = jakarta().slice(0, 7);

test.describe("cash advance (kasbon) through payroll and the ledger", () => {
  let empId = "";
  let advanceId = "";
  let entryId = "";

  test("HR edits the employee (salary) through the new update endpoint", async () => {
    const { client: a } = await admin();
    const { client: k } = await kasir();
    await k.get("/hrm/employees"); // a member's employee record appears on their first tenant request
    const list = await a.get<any[]>("/hrm/employees", { perPage: "200" });
    const me = list.body.data.find((e: any) => e.email?.toLowerCase() === state().kasirEmail.toLowerCase());
    expect(me, "the cashier should have an employee record from onboarding").toBeTruthy();
    empId = me.id;
    const upd = await a.put(`/hrm/employees/${empId}`, { baseSalary: 6_000_000, department: "Ops" });
    expect(upd.ok, JSON.stringify(upd.body)).toBeTruthy();
    expect(upd.body.data.baseSalary).toBe(6_000_000);
    expect(upd.body.data.nip).toBe(me.nip); // the NIP is never editable
    expect((await a.put(`/hrm/employees/${empId}`, { baseSalary: -5 })).status).toBe(400);
    expect((await a.put(`/hrm/employees/${empId}`, { name: "  " })).status).toBe(400);
  });

  test("an employee requests an advance; a second open one is refused", async () => {
    const { client: k } = await kasir();
    expect((await k.post("/hr-self/cash-advances", { amount: 0, installments: 3, startPeriod: PERIOD })).status).toBe(400);
    expect((await k.post("/hr-self/cash-advances", { amount: 100, installments: 40, startPeriod: PERIOD })).status).toBe(400);
    const r = await k.post("/hr-self/cash-advances", { amount: 1_200_000, installments: 3, startPeriod: PERIOD, reason: "Biaya sekolah" });
    expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
    advanceId = r.body.data.id;
    expect(r.body.data.status).toBe("pending");
    expect(r.body.data.monthly).toBe(400_000);
    expect((await k.post("/hr-self/cash-advances", { amount: 500_000, installments: 2, startPeriod: PERIOD })).status).toBe(409);
    const mine = await k.get<any[]>("/hr-self/cash-advances");
    expect(mine.body.data).toHaveLength(1);
  });

  test("the borrower cannot approve; HR approves and the payout is journalled", async () => {
    const { client: k } = await kasir();
    expect([401, 403]).toContain((await k.post(`/hrm/cash-advances/${advanceId}/approve`)).status);
    const { client: a } = await admin();
    const ok = await a.post(`/hrm/cash-advances/${advanceId}/approve`);
    expect(ok.ok, JSON.stringify(ok.body)).toBeTruthy();
    expect(ok.body.data.status).toBe("approved");
    expect(ok.body.data.outstanding).toBe(800_000); // this month's installment is still to come off
    expect((await a.post(`/hrm/cash-advances/${advanceId}/approve`)).status).toBe(409);
    const tb = (await a.get("/finance/reports/trial-balance")).body.data;
    const line = tb.lines.find((l: any) => l.accountCode === "1400");
    expect(line, "Employee Advances account must exist and be used").toBeTruthy();
    expect(line.debit).toBe(1_200_000);
    const bs = (await a.get("/finance/reports/balance-sheet")).body.data;
    expect(bs.assets).toBeCloseTo(bs.totalLiabilitiesAndEquity, 2);
  });

  test("payroll withholds the installment and the accrual reduces the advance balance", async () => {
    const { client: a } = await admin();
    const created = await a.post("/payroll/entries", { period: PERIOD, employeeId: empId, taxMethod: "manual", paymentBank: "BCA", bankAccount: "999" });
    expect(created.ok, JSON.stringify(created.body)).toBeTruthy();
    entryId = created.body.data.id;
    const calc = await a.post("/payroll/entries/calculate", { period: PERIOD });
    expect(calc.ok, JSON.stringify(calc.body)).toBeTruthy();
    const e = calc.body.data.find((x: any) => x.id === entryId);
    expect(e.deductionAdvance).toBe(400_000);
    expect(e.takeHomePay).toBe(e.baseSalary + e.allowance + e.overtimePay - e.deductionAbsence - e.deductionLate - e.deductionTax - e.deductionCoop - e.deductionCanteen - 400_000);

    const ok = await a.put(`/payroll/entries/${entryId}/status`, { status: "approved" });
    expect(ok.ok, JSON.stringify(ok.body)).toBeTruthy();
    const tb = (await a.get("/finance/reports/trial-balance")).body.data;
    const line = tb.lines.find((l: any) => l.accountCode === "1400");
    expect(line.debit - line.credit).toBe(800_000);
    const bs = (await a.get("/finance/reports/balance-sheet")).body.data;
    expect(bs.assets).toBeCloseTo(bs.totalLiabilitiesAndEquity, 2);
  });
});

test.describe("new HR and inventory reports and drive folders", () => {
  test("stock movement summary reconciles opening + received - issued = closing", async () => {
    const { client: a } = await admin();
    const today = jakarta();
    const wh = await a.post("/inventory/warehouses", { code: unique("WS").toUpperCase(), name: "Gudang Ringkasan", address: "Jakarta" });
    const pr = await a.post("/products", { sku: unique("S").toUpperCase(), name: "Barang Ringkasan", category: "Food", unit: "pcs", stock: 0, costPrice: 1000, sellingPrice: 2000 });
    expect(wh.ok && pr.ok, JSON.stringify([wh.body, pr.body])).toBeTruthy();
    expect((await a.post("/inventory/batches/receive", { warehouseId: wh.body.data.id, productId: pr.body.data.id, batchNo: "S-1", quantity: 10 })).ok).toBeTruthy();
    expect((await a.post("/inventory/stock-levels/adjust", { warehouseId: wh.body.data.id, productId: pr.body.data.id, quantity: -3, reason: "rusak" })).ok).toBeTruthy();
    const r = await a.get<any>("/inventory/movements/summary", { from: `${PERIOD}-01`, to: today });
    expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
    const mine = r.body.data.rows.find((x: any) => x.productId === pr.body.data.id);
    expect(mine, JSON.stringify(r.body.data.rows)).toBeTruthy();
    expect(mine.received).toBe(10);
    expect(mine.issued).toBe(3);
    expect(mine.closing).toBe(7);
    for (const row of r.body.data.rows) expect(row.opening + row.received - row.issued).toBe(row.closing);
    expect((await a.get("/inventory/movements/summary", { from: "nope", to: today })).status).toBe(400);
    expect((await a.get("/inventory/movements/summary", { from: "2026-12-31", to: "2026-01-01" })).status).toBe(400);
  });

  test("project profitability lists projects and flags loss-makers", async () => {
    const { client: a } = await admin();
    const p = await a.post("/projects", { name: "Proyek Rugi", customer: "PT X" });
    expect(p.ok, JSON.stringify(p.body)).toBeTruthy();
    const id = p.body.data.id;
    await a.post(`/projects/${id}/budget/import`, { mode: "replace", lines: [
      { kind: "rab", category: "Material", description: "Kontrak", quantity: 1, unit: "ls", unitPrice: 10_000_000 },
      { kind: "rap", category: "Material", description: "Rencana", quantity: 1, unit: "ls", unitPrice: 12_000_000 },
    ] });
    const r = await a.get<any>("/project-profitability");
    expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
    const row = r.body.data.rows.find((x: any) => x.projectId === id);
    expect(row.revenue).toBe(10_000_000);
    expect(row.forecastProfit).toBe(-2_000_000);
    expect(row.lossMaking).toBe(true);
  });

  test("drive: subfolders nest and only empty folders can be deleted", async () => {
    const { client: a } = await admin();
    const parent = await a.post("/collaboration/folders", { name: "Legal" });
    expect(parent.ok, JSON.stringify(parent.body)).toBeTruthy();
    const child = await a.post("/collaboration/folders", { name: "Kontrak", parentFolderId: parent.body.data.id });
    expect(child.ok, JSON.stringify(child.body)).toBeTruthy();
    expect((await a.del(`/collaboration/folders/${parent.body.data.id}`)).status).toBe(409);
    expect((await a.del(`/collaboration/folders/${child.body.data.id}`)).ok).toBeTruthy();
    expect((await a.del(`/collaboration/folders/${parent.body.data.id}`)).ok).toBeTruthy();
    expect((await a.del(`/collaboration/folders/${parent.body.data.id}`)).status).toBe(404);
  });
});

test.describe("finance budgets: realization, edit, duplicates", () => {
  test("a budget linked to an expense account tracks real spending, and can be edited and deleted", async () => {
    const { client: a } = await admin();
    const accounts = (await a.get<any[]>("/finance/accounts", { perPage: "500" })).body.data;
    const cash = accounts.find((x: any) => x.code === "1000").id;
    // A fresh expense account, so spending posted by other specs cannot leak into the figures.
    const acc = await a.post("/finance/accounts", { code: `59${Date.now().toString().slice(-6)}`, name: "Biaya ATK Uji", type: "expense" });
    expect(acc.ok, JSON.stringify(acc.body)).toBeTruthy();
    const expense = acc.body.data.id;
    const dept = unique("Dept");

    expect((await a.post("/finance/budgets", { department: dept, accountCategory: "Operasional", period: "2026", allocatedBudget: 1000, accountId: expense })).status).toBe(400); // not YYYY-MM
    const b = await a.post("/finance/budgets", { department: dept, accountCategory: "Operasional", period: PERIOD, allocatedBudget: 1_000_000, accountId: expense });
    expect(b.ok, JSON.stringify(b.body)).toBeTruthy();
    const id = b.body.data.id;
    expect((await a.post("/finance/budgets", { department: dept.toUpperCase(), accountCategory: "x", period: PERIOD, allocatedBudget: 5, accountId: expense })).status).toBe(409);

    const je = await a.post("/finance/journal-entries", { date: jakarta(), memo: "Belanja ATK", lines: [{ accountId: expense, debit: 900_000, credit: 0 }, { accountId: cash, debit: 0, credit: 900_000 }] });
    expect((await a.post(`/finance/journal-entries/${je.body.data.id}/post`)).ok).toBeTruthy();
    const find = async () => (await a.get<any[]>("/finance/budgets", { perPage: "200" })).body.data.find((x: any) => x.id === id);
    const near = await find();
    expect(near.actualSpent).toBe(900_000);
    expect(near.status).toMatch(/Warning/);

    const up = await a.put(`/finance/budgets/${id}`, { allocatedBudget: 800_000 });
    expect(up.ok, JSON.stringify(up.body)).toBeTruthy();
    expect(up.body.data.status).toBe("Exceeded");
    expect((await a.put(`/finance/budgets/${id}`, { allocatedBudget: -1 })).status).toBe(400);
    expect((await a.put(`/finance/budgets/00000000-0000-4000-8000-000000000000`, { allocatedBudget: 1 })).status).toBe(404);

    expect((await a.del(`/finance/budgets/${id}`)).ok).toBeTruthy();
    expect(await find()).toBeUndefined();
    expect((await a.del(`/finance/budgets/${id}`)).status).toBe(404);
  });
});
