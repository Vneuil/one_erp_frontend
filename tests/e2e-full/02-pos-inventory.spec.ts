import { test, expect } from "@playwright/test";
import { admin, kasir, spv } from "./world";
import { unique } from "./api";

test.describe.configure({ mode: "serial" });

test.describe("POS, inventory batches and the books", () => {
  let warehouseId = "";
  let coffee = { id: "", sku: "" };
  let bread = { id: "", sku: "" };
  let saleId = "";
  let lineIds: string[] = [];

  test("set up a warehouse, two products and batch stock", async () => {
    const { client: a } = await admin();
    const wh = await a.post("/inventory/warehouses", { code: unique("WH").toUpperCase(), name: "Gudang Utama", address: "Jakarta" });
    expect(wh.ok, JSON.stringify(wh.body)).toBeTruthy();
    warehouseId = wh.body.data.id;

    const mk = async (name: string, cost: number, price: number) => {
      const sku = unique("P").toUpperCase();
      const r = await a.post("/products", { sku, name, category: "Food", unit: "pcs", stock: 0, costPrice: cost, sellingPrice: price });
      expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
      return { id: r.body.data.id as string, sku };
    };
    coffee = await mk("Kopi Susu", 6_000, 10_000);
    bread = await mk("Roti Bakar", 4_000, 8_000);

    const soon = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    for (const b of [
      { productId: coffee.id, batchNo: "K-SOON", expiryDate: soon, quantity: 5 },
      { productId: coffee.id, batchNo: "K-LATE", expiryDate: later, quantity: 10 },
      { productId: bread.id, batchNo: "R-1", quantity: 20 },
    ]) {
      const r = await a.post("/inventory/batches/receive", { warehouseId, ...b });
      expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
    }
    const levels = await a.get<any[]>("/inventory/stock-levels", { perPage: "50" });
    const coffeeLevel = levels.body.data.find((l) => l.productId === coffee.id);
    expect(coffeeLevel.quantity).toBe(15);
  });

  test("POS settings: 11% tax included in the price", async () => {
    const { client: a } = await admin();
    const put = await a.put("/pos/settings", { taxPercent: 11, taxInclusive: true, roundTo: 0, defaultOutlet: "Outlet E2E", receiptHeader: "Jl. Uji 1", receiptFooter: "Terima kasih", nonCashAccountCode: "" });
    expect(put.ok, JSON.stringify(put.body)).toBeTruthy();
    const { client: k } = await kasir();
    const get = await k.get("/pos/settings");
    expect(get.body.data.taxPercent).toBe(11);
    // Only an admin may change settings.
    expect((await k.put("/pos/settings", { taxPercent: 0, taxInclusive: true })).status).toBe(403);
  });

  test("a cashier sells: server-side totals, change, FEFO stock", async () => {
    const { client: k } = await kasir();
    const short = await k.post("/pos/checkout", { warehouseId, paymentMethod: "cash", amountTendered: 5_000, lines: [{ productId: coffee.id, quantity: 2 }] });
    expect(short.status).toBe(400); // cash short of total (2 x 10,000)

    const wrongTotal = await k.post("/pos/checkout", { warehouseId, paymentMethod: "card", totalAmount: 1, lines: [{ productId: coffee.id, quantity: 2 }] });
    expect(wrongTotal.status).toBe(400);

    const sale = await k.post("/pos/checkout", {
      warehouseId, paymentMethod: "cash", amountTendered: 100_000, customer: "Budi",
      lines: [{ productId: coffee.id, quantity: 7, unitPrice: 10_000 }, { productId: bread.id, quantity: 1, unitPrice: 8_000 }],
    });
    expect(sale.ok, JSON.stringify(sale.body)).toBeTruthy();
    const s = sale.body.data;
    expect(s.totalAmount).toBe(78_000);
    expect(s.taxAmount).toBeCloseTo(7_729.73, 2); // 78,000 - 78,000/1.11
    expect(s.changeAmount).toBe(22_000);
    expect(s.cashier).toContain("kasir-");
    expect(s.outlet).toBe("Outlet E2E");
    expect(s.lines).toHaveLength(2);
    saleId = s.id;
    lineIds = s.lines.map((l: any) => l.id);
  });

  test("stock left in FEFO order: the soonest-expiring coffee lot first", async () => {
    const { client: a } = await admin();
    const batches = await a.get<any[]>("/inventory/batches", { productId: coffee.id, all: "true" });
    const by = Object.fromEntries(batches.body.data.map((b) => [b.batchNo, b.quantity]));
    expect(by["K-SOON"]).toBe(0);
    expect(by["K-LATE"]).toBe(8); // 7 sold: 5 from the soon lot, 2 from the late one
  });

  test("the sale reached the ledger and the balance sheet balances", async () => {
    const { client: a } = await admin();
    const bs = await a.get("/finance/reports/balance-sheet");
    expect(bs.ok).toBeTruthy();
    const d = bs.body.data;
    expect(d.assets).toBeCloseTo(d.totalLiabilitiesAndEquity, 2);
    expect(d.retainedEarnings).toBeGreaterThan(0);
    const pnl = await a.get("/finance/reports/profit-loss");
    expect(pnl.body.data.revenue ?? pnl.body.data.totalRevenue).toBeGreaterThan(0);
    const tb = await a.get("/finance/reports/trial-balance");
    const lines = tb.body.data.lines ?? [];
    const debit = lines.reduce((s: number, l: any) => s + (l.debit ?? 0), 0);
    const credit = lines.reduce((s: number, l: any) => s + (l.credit ?? 0), 0);
    expect(debit).toBeCloseTo(credit, 2);
  });

  test("the cashier cannot void their own sale; a supervisor can, and stock comes back", async () => {
    const { client: k } = await kasir();
    const own = await k.post(`/pos/transactions/${saleId}/void`, { reason: "salah input" });
    expect(own.status).toBe(403);

    const { client: s } = await spv();
    const noReason = await s.post(`/pos/transactions/${saleId}/void`, { reason: " " });
    expect(noReason.status).toBe(400);
    const voided = await s.post(`/pos/transactions/${saleId}/void`, { reason: "pelanggan batal" });
    expect(voided.ok, JSON.stringify(voided.body)).toBeTruthy();
    expect(voided.body.data.status).toBe("Voided");
    expect((await s.post(`/pos/transactions/${saleId}/void`, { reason: "lagi" })).status).toBe(409);

    const { client: a } = await admin();
    const levels = await a.get<any[]>("/inventory/stock-levels", { perPage: "50" });
    expect(levels.body.data.find((l) => l.productId === coffee.id).quantity).toBe(15);
    const bs = (await a.get("/finance/reports/balance-sheet")).body.data;
    expect(bs.assets).toBeCloseTo(bs.totalLiabilitiesAndEquity, 2);
  });

  test("partial refund: only the returned units, exact remainder on the last one", async () => {
    const { client: k } = await kasir();
    const sale = await k.post("/pos/checkout", { warehouseId, paymentMethod: "qris", lines: [{ productId: bread.id, quantity: 3, unitPrice: 8_000 }] });
    expect(sale.ok, JSON.stringify(sale.body)).toBeTruthy();
    const id = sale.body.data.id;
    const line = sale.body.data.lines[0].id;
    const { client: s } = await spv();
    const first = await s.post(`/pos/transactions/${id}/refund`, { reason: "rusak", lines: [{ lineId: line, quantity: 1 }] });
    expect(first.ok, JSON.stringify(first.body)).toBeTruthy();
    expect(first.body.data.status).toBe("Partially Refunded");
    expect(first.body.data.refundedAmount).toBe(8_000);
    expect((await s.post(`/pos/transactions/${id}/refund`, { reason: "x", lines: [{ lineId: line, quantity: 5 }] })).status).toBe(400);
    const rest = await s.post(`/pos/transactions/${id}/refund`, { reason: "sisa", lines: [{ lineId: line, quantity: 2 }] });
    expect(rest.body.data.status).toBe("Refunded");
    expect(rest.body.data.refundedAmount).toBe(24_000);
  });

  test("the sales report nets out refunds and leaves voids out", async () => {
    const { client: a } = await admin();
    const rep = await a.get("/pos/reports/sales");
    expect(rep.ok, JSON.stringify(rep.body)).toBeTruthy();
    const t = rep.body.data.totals;
    expect(t.voided).toBe(1);
    expect(t.refunds).toBe(24_000);
    expect(t.grossSales).toBe(24_000); // only the refunded bread sale counts as a sale
    expect(t.netSales).toBe(0);
  });

  test("expired stock is unsellable and can be written off as a loss", async () => {
    const { client: a } = await admin();
    const p = await a.post("/products", { sku: unique("EXP").toUpperCase(), name: "Susu", category: "Food", unit: "pcs", stock: 0, costPrice: 5_000, sellingPrice: 9_000 });
    const id = p.body.data.id;
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    // Receiving already-expired stock is refused.
    expect((await a.post("/inventory/batches/receive", { productId: id, warehouseId, batchNo: "OLD", expiryDate: yesterday, quantity: 4 })).status).toBe(400);
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    const rec = await a.post("/inventory/batches/receive", { productId: id, warehouseId, batchNo: "FRESH", expiryDate: tomorrow, quantity: 4 });
    expect(rec.ok).toBeTruthy();
    const { client: s } = await spv();
    const wo = await s.post(`/inventory/batches/${rec.body.data.id}/write-off`, { reason: "rusak" });
    expect(wo.ok, JSON.stringify(wo.body)).toBeTruthy();
    expect(wo.body.data.quantity).toBe(0);
    const { client: k } = await kasir();
    const sell = await k.post("/pos/checkout", { warehouseId, paymentMethod: "card", lines: [{ productId: id, quantity: 1, unitPrice: 9_000 }] });
    expect(sell.status).toBe(400); // nothing left to sell
  });
});
