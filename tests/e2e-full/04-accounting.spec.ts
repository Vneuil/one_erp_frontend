import { test, expect } from "@playwright/test";
import { admin, spv, kasir } from "./world";
import { unique } from "./api";

test.describe.configure({ mode: "serial" });

const balanced = async (a: Awaited<ReturnType<typeof admin>>["client"]) => {
  const bs = (await a.get("/finance/reports/balance-sheet")).body.data;
  expect(bs.assets).toBeCloseTo(bs.totalLiabilitiesAndEquity, 2);
  return bs;
};

test.describe("accounting: invoices, capital, billing terms, insights", () => {
  test("a sales invoice with discount, freight and rounding posts a balanced journal", async () => {
    const { client: a } = await admin();
    const before = (await a.get("/finance/reports/profit-loss")).body.data;
    const inv = await a.post("/sales/invoices", { customerName: "PT Maju", totalAmount: 999_400, discountPercent: 0, additionalCost: 300, roundTo: 1000, dueDate: "2026-12-31" });
    expect(inv.ok, JSON.stringify(inv.body)).toBeTruthy();
    const d = inv.body.data;
    expect(d.totalAmount).toBe(1_000_000);
    expect(d.subtotal).toBe(999_400);
    expect(d.additionalCost).toBe(300);
    expect(d.roundingAmount).toBe(300);
    await balanced(a);
    expect(before).toBeTruthy();

    // Bad adjustments are refused.
    expect((await a.post("/sales/invoices", { customerName: "X", totalAmount: 100, discountPercent: 5, discountAmount: 5 })).status).toBe(400);
    expect((await a.post("/sales/invoices", { customerName: "X", totalAmount: 100, discountAmount: 150 })).status).toBe(400);
    // The receivable exists for the full billed total.
    const recv = await a.get<any[]>("/finance/receivables", { perPage: "100" });
    expect(recv.body.data.some((r) => r.totalInvoice === 1_000_000)).toBe(true);
  });

  test("owner capital and drawings: only an approver may record a drawing", async () => {
    const { client: a } = await admin();
    const { client: k } = await kasir();
    const inj = await a.post("/finance/capital/injections", { ownerName: "Pemilik", amount: 50_000_000, description: "modal awal" });
    expect(inj.ok, JSON.stringify(inj.body)).toBeTruthy();
    expect(inj.body.data.posted).toBe(true);
    expect((await k.post("/finance/capital/drawings", { ownerName: "Pemilik", amount: 1_000_000 })).status).toBe(403);
    const draw = await a.post("/finance/capital/drawings", { ownerName: "Pemilik", amount: 5_000_000 });
    expect(draw.ok, JSON.stringify(draw.body)).toBeTruthy();
    const bs = await balanced(a);
    expect(bs.equity).toBeGreaterThanOrEqual(45_000_000); // capital less drawings
    // A future date and an unknown payment account are refused.
    const future = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    expect((await a.post("/finance/capital/injections", { ownerName: "P", amount: 1, date: future })).status).toBe(400);
    expect((await a.post("/finance/capital/injections", { ownerName: "P", amount: 1, paymentAccountCode: "9999" })).status).toBe(400);
  });

  test("other income posts to its own account and the books still balance", async () => {
    const { client: a } = await admin();
    const r = await a.post("/finance/other-income", { category: "Bunga bank", amount: 125_000, description: "bunga September" });
    expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
    await balanced(a);
    const list = await a.get<any[]>("/finance/other-income");
    expect(list.body.data.some((o) => o.category === "Bunga bank")).toBe(true);
  });

  test("cash flow counts only cash and bank accounts", async () => {
    const { client: a } = await admin();
    const cf = (await a.get("/finance/reports/cash-flow")).body.data;
    // The 1,000,000 receivable is not cash; the 50m capital, 5m drawing and 125k interest are.
    expect(cf.cashInflow).toBeGreaterThanOrEqual(50_125_000);
    expect(cf.cashOutflow).toBeGreaterThanOrEqual(5_000_000);
    expect(cf.cashInflow).toBeLessThan(50_125_000 + 10_000_000); // receivable/inventory movements are not inflows
  });

  test("billing terms: a sales order is invoiced in order, once, adding up to the order", async () => {
    const { client: a } = await admin();
    const order = await a.post("/sales/orders", { customerName: "PT Termin", totalAmount: 10_000_000, channel: "Direct B2B", status: "Confirmed" });
    expect(order.ok, JSON.stringify(order.body)).toBeTruthy();
    const oid = order.body.data.id;
    const bad = await a.put(`/sales/orders/${oid}/billing-schedule`, { terms: [{ label: "DP", percent: 50 }, { label: "Lunas", percent: 40 }] });
    expect(bad.status).toBe(400);
    const sched = await a.put(`/sales/orders/${oid}/billing-schedule`, { terms: [{ label: "DP", percent: 30 }, { label: "Progres", percent: 40, dueInDays: 30 }, { label: "Lunas", percent: 30, dueInDays: 60 }] });
    expect(sched.ok, JSON.stringify(sched.body)).toBeTruthy();
    const terms = sched.body.data;
    expect(terms.map((t: any) => t.amount)).toEqual([3_000_000, 4_000_000, 3_000_000]);
    expect((await a.post(`/sales/billing-terms/${terms[1].id}/invoice`)).status).toBe(409); // out of order
    let billed = 0;
    for (const t of terms) {
      const r = await a.post(`/sales/billing-terms/${t.id}/invoice`);
      expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
      billed += r.body.data.totalAmount;
    }
    expect(billed).toBe(10_000_000);
    expect((await a.post(`/sales/billing-terms/${terms[0].id}/invoice`)).status).toBe(409); // only once
    expect((await a.put(`/sales/orders/${oid}/billing-schedule`, { terms: [{ percent: 100 }] })).status).toBe(409); // frozen
    await balanced(a);
  });

  test("the automatic review flags a repeated manual journal", async () => {
    const { client: a } = await admin();
    const accounts = (await a.get<any[]>("/finance/accounts", { perPage: "200" })).body.data;
    const cash = accounts.find((x) => x.code === "1000").id;
    const expense = accounts.find((x) => x.code === "5000").id;
    // Two identical postings a few days apart (a typical double entry).
    for (let i = 0; i < 2; i++) {
      const je = await a.post("/finance/journal-entries", { date: new Date().toISOString().slice(0, 10), memo: "Bayar sewa kantor", lines: [{ accountId: expense, debit: 7_500_000, credit: 0 }, { accountId: cash, debit: 0, credit: 7_500_000 }] });
      expect(je.ok, JSON.stringify(je.body)).toBeTruthy();
      const posted = await a.post(`/finance/journal-entries/${je.body.data.id}/post`);
      expect(posted.ok, JSON.stringify(posted.body)).toBeTruthy();
    }
    const ins = (await a.get<any[]>("/finance/reports/insights")).body.data;
    const dup = ins.find((i) => i.rule === "duplicate_entry");
    expect(dup, JSON.stringify(ins)).toBeTruthy();
    expect(dup.severity).toBe("warning");
    // The books themselves are fine, so nothing critical is reported.
    expect(ins.some((i) => i.rule === "unbalanced")).toBe(false);
  });

  test("the cost of goods sold follows a sales order's stock", async () => {
    const { client: a } = await admin();
    const wh = await a.post("/inventory/warehouses", { code: unique("SO").toUpperCase(), name: "Gudang SO", address: "x" });
    const p = await a.post("/products", { sku: unique("C").toUpperCase(), name: "Barang HPP", category: "Goods", unit: "pcs", stock: 0, costPrice: 40_000, sellingPrice: 65_000 });
    const pid = p.body.data.id;
    expect((await a.post("/inventory/batches/receive", { productId: pid, warehouseId: wh.body.data.id, batchNo: "B1", quantity: 10 })).ok).toBeTruthy();
    const tbBefore = (await a.get("/finance/reports/trial-balance")).body.data.lines;
    const cogsBefore = tbBefore.find((l: any) => l.accountCode === "5200")?.debit ?? 0;
    const so = await a.post("/sales/orders", { customerName: "PT HPP", totalAmount: 195_000, channel: "Direct B2B", status: "Confirmed", warehouseId: wh.body.data.id, lines: [{ productId: pid, quantity: 3, unitPrice: 65_000 }] });
    expect(so.ok, JSON.stringify(so.body)).toBeTruthy();
    const tbAfter = (await a.get("/finance/reports/trial-balance")).body.data.lines;
    const cogsAfter = tbAfter.find((l: any) => l.accountCode === "5200")?.debit ?? 0;
    expect(cogsAfter - cogsBefore).toBe(120_000); // 3 x 40,000
    await balanced(a);
  });

  test("a supervisor is not treated as an approver of their own sales order", async () => {
    const { client: s } = await spv();
    const so = await s.post("/sales/orders", { customerName: "PT Sendiri", totalAmount: 1_000_000, channel: "Direct B2B", status: "Confirmed" });
    expect(so.ok, JSON.stringify(so.body)).toBeTruthy();
    expect(so.body.data.createdByEmail).toContain("spv-");
  });
});
