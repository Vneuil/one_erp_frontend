"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { reportsApi } from "@/lib/api/reports";
import { downloadCsv } from "@/lib/utils/csv";
import { Note, RangeFilter, ReportState, Stat, Tabs, monthStart, selectCls, td, tdr, th, thr, today, useReport } from "@/components/reports/report-ui";

type Tab = "summary" | "product" | "daily" | "ranking" | "customer" | "margin";
const TABS = [["summary", "Ringkasan & Rata-rata"], ["product", "Per Produk"], ["daily", "Produk Harian"], ["ranking", "Peringkat"], ["customer", "Per Customer"], ["margin", "Gross Profit Margin"]] as const;
const num = (n: number) => n.toLocaleString("id-ID");

export default function SalesReportsPage() {
  const [tab, setTab] = React.useState<Tab>("summary");
  const [from, setFrom] = React.useState(monthStart());
  const [to, setTo] = React.useState(today());
  const [dailyMetric, setDailyMetric] = React.useState<"quantity" | "revenue">("quantity");
  const [rankBy, setRankBy] = React.useState<"product" | "customer">("product");
  const [rankMetric, setRankMetric] = React.useState<"revenue" | "quantity">("revenue");
  const range = `${from}|${to}`;
  const p = { from, to };

  const summary = useReport(`s|${range}`, () => reportsApi.salesSummary(p).then((r) => r.data), tab === "summary");
  const products = useReport(`p|${range}`, () => reportsApi.salesByProduct(p).then((r) => r.data), tab === "product" || (tab === "ranking" && rankBy === "product"));
  const daily = useReport(`d|${range}`, () => reportsApi.dailyProductSales(p).then((r) => r.data), tab === "daily");
  const customers = useReport(`c|${range}`, () => reportsApi.salesByCustomer(p).then((r) => r.data), tab === "customer" || (tab === "ranking" && rankBy === "customer"));
  const margin = useReport(`m|${range}`, () => reportsApi.grossMargin(p).then((r) => r.data), tab === "margin");

  const active = { summary, product: products, daily, ranking: rankBy === "product" ? products : customers, customer: customers, margin }[tab];

  // Product x day matrix for the daily report.
  const matrix = React.useMemo(() => {
    const rows = daily.data?.rows ?? [];
    const dates = [...new Set(rows.map((r) => r.date))].sort();
    const byProduct = new Map<string, { name: string; sku: string; cells: Map<string, number>; total: number }>();
    for (const r of rows) {
      const e = byProduct.get(r.productId) ?? { name: r.name, sku: r.sku, cells: new Map(), total: 0 };
      const v = dailyMetric === "quantity" ? r.quantity : r.revenue;
      e.cells.set(r.date, (e.cells.get(r.date) ?? 0) + v);
      e.total += v;
      byProduct.set(r.productId, e);
    }
    return { dates, products: [...byProduct.values()].sort((a, b) => b.total - a.total) };
  }, [daily.data, dailyMetric]);

  const exportCsv = () => {
    const name = (s: string) => `${s}-${from}-${to}.csv`;
    if (tab === "summary" && summary.data) downloadCsv(name("penjualan-harian"), ["Tanggal", "Jumlah Order", "Omzet"], summary.data.daily.map((d) => [d.date, d.orders, d.revenue]));
    else if (tab === "product" && products.data) downloadCsv(name("penjualan-per-produk"), ["Peringkat", "SKU", "Produk", "Kategori", "Qty", "Omzet", "Harga Rata-rata", "HPP", "Laba Kotor", "Margin %"], products.data.rows.map((r) => [r.rank, r.sku, r.name, r.category, r.quantity, r.revenue, r.avgPrice, r.cost, r.grossProfit, r.marginPct]));
    else if (tab === "daily" && daily.data) downloadCsv(name("produk-harian"), ["Tanggal", "SKU", "Produk", "Qty", "Omzet"], daily.data.rows.map((r) => [r.date, r.sku, r.name, r.quantity, r.revenue]));
    else if (tab === "customer" && customers.data) downloadCsv(name("penjualan-per-customer"), ["Peringkat", "Customer", "Order", "Omzet", "Rata-rata Order", "Order Pertama", "Order Terakhir", "Laba Kotor", "Margin %"], customers.data.rows.map((r) => [r.rank, r.customer, r.orders, r.revenue, r.avgOrder, r.firstDate, r.lastDate, r.grossProfit, r.marginPct]));
    else if (tab === "ranking") {
      if (rankBy === "product" && products.data) downloadCsv(name("peringkat-produk"), ["Peringkat", "Produk", "Qty", "Omzet"], rankedProducts.map((r, i) => [i + 1, r.name, r.quantity, r.revenue]));
      else if (customers.data) downloadCsv(name("peringkat-customer"), ["Peringkat", "Customer", "Order", "Omzet"], rankedCustomers.map((r, i) => [i + 1, r.customer, r.orders, r.revenue]));
    } else if (tab === "margin" && margin.data) downloadCsv(name("gross-margin-per-kategori"), ["Kategori", "Qty", "Omzet", "HPP", "Laba Kotor", "Margin %"], margin.data.byCategory.map((c) => [c.category, c.quantity, c.revenue, c.cost, c.grossProfit, c.marginPct]));
  };

  const rankedProducts = [...(products.data?.rows ?? [])].sort((a, b) => b[rankMetric] - a[rankMetric]);
  const rankedCustomers = [...(customers.data?.rows ?? [])].sort((a, b) => (rankMetric === "revenue" ? b.revenue - a.revenue : b.orders - a.orders));
  const maxRank = rankBy === "product" ? Math.max(1, ...rankedProducts.map((r) => r[rankMetric])) : Math.max(1, ...rankedCustomers.map((r) => (rankMetric === "revenue" ? r.revenue : r.orders)));
  const bar = (v: number) => <div className="h-2 rounded bg-brand-primary/70" style={{ width: `${Math.max(2, (v / maxRank) * 100)}%` }} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Penjualan" description="Omzet, rata-rata, per produk, produk harian, peringkat, per customer, dan analisa gross profit margin. Mencakup semua kanal termasuk POS; order batal, ditolak, dan menunggu persetujuan tidak dihitung.">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>Cetak</Button>
      </PageHeader>

      <RangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      <Tabs value={tab} onChange={setTab} tabs={TABS} />
      <ReportState loading={active.loading} error={active.error} />

      {tab === "summary" && summary.data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Omzet"><MoneyDisplay amount={summary.data.revenue} /></Stat>
            <Stat label="Jumlah order">{num(summary.data.orders)}</Stat>
            <Stat label="Rata-rata per order"><MoneyDisplay amount={summary.data.avgOrderValue} /></Stat>
            <Stat label="Rata-rata order per hari">{summary.data.avgOrdersPerDay.toLocaleString("id-ID")}</Stat>
            <Stat label={`Rata-rata omzet per hari (${summary.data.days} hari)`}><MoneyDisplay amount={summary.data.avgPerDay} /></Stat>
            <Stat label={`Rata-rata per hari aktif (${summary.data.activeDays} hari)`}><MoneyDisplay amount={summary.data.avgPerActiveDay} /></Stat>
          </div>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full"><thead><tr><th className={th}>Bulan</th><th className={thr}>Order</th><th className={thr}>Omzet</th><th className={thr}>Hari aktif</th><th className={thr}>Rata-rata per hari aktif</th></tr></thead>
              <tbody>
                {summary.data.monthly.length === 0 && <tr><td className={td} colSpan={5}>Tidak ada penjualan pada periode ini.</td></tr>}
                {summary.data.monthly.map((m) => (
                  <tr key={m.period} className="border-t border-border"><td className={td}>{m.period}</td><td className={tdr}>{num(m.orders)}</td><td className={tdr}><MoneyDisplay amount={m.revenue} /></td><td className={tdr}>{m.activeDays}</td><td className={tdr}><MoneyDisplay amount={m.avgPerDay} /></td></tr>
                ))}
              </tbody></table>
          </CardContent></Card>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto max-h-96">
            <table className="w-full"><thead><tr><th className={th}>Tanggal</th><th className={thr}>Order</th><th className={thr}>Omzet</th></tr></thead>
              <tbody>{summary.data.daily.map((d) => <tr key={d.date} className="border-t border-border"><td className={td}>{d.date}</td><td className={tdr}>{d.orders}</td><td className={tdr}><MoneyDisplay amount={d.revenue} /></td></tr>)}</tbody></table>
          </CardContent></Card>
        </>
      )}

      {tab === "product" && products.data && (
        <>
          <Note>{products.data.note}</Note>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full"><thead><tr><th className={th}>#</th><th className={th}>SKU</th><th className={th}>Produk</th><th className={th}>Kategori</th><th className={thr}>Qty</th><th className={thr}>Omzet</th><th className={thr}>Harga rata-rata</th><th className={thr}>HPP</th><th className={thr}>Laba kotor</th><th className={thr}>Margin</th></tr></thead>
              <tbody>
                {products.data.rows.length === 0 && <tr><td className={td} colSpan={10}>Tidak ada penjualan barang pada periode ini.</td></tr>}
                {products.data.rows.map((r) => (
                  <tr key={r.productId} className="border-t border-border"><td className={td}>{r.rank}</td><td className={`${td} font-mono`}>{r.sku}</td><td className={td}>{r.name}</td><td className={td}>{r.category || "-"}</td><td className={tdr}>{num(r.quantity)}</td><td className={tdr}><MoneyDisplay amount={r.revenue} /></td><td className={tdr}><MoneyDisplay amount={r.avgPrice} /></td><td className={tdr}><MoneyDisplay amount={r.cost} /></td><td className={tdr}><MoneyDisplay amount={r.grossProfit} /></td><td className={tdr}>{r.marginPct}%</td></tr>
                ))}
                <tr className="border-t-2 border-border font-bold bg-slate-50"><td className={td} colSpan={4}>Total</td><td className={tdr}>{num(products.data.quantity)}</td><td className={tdr}><MoneyDisplay amount={products.data.revenue} /></td><td className={tdr} /><td className={tdr}><MoneyDisplay amount={products.data.cost} /></td><td className={tdr}><MoneyDisplay amount={products.data.grossProfit} /></td><td className={tdr}>{products.data.marginPct}%</td></tr>
              </tbody></table>
          </CardContent></Card>
        </>
      )}

      {tab === "daily" && daily.data && (
        <>
          <div className="flex items-center gap-2 text-xs print:hidden">
            <span className="font-semibold">Tampilkan:</span>
            <select value={dailyMetric} onChange={(e) => setDailyMetric(e.target.value as "quantity" | "revenue")} className={`${selectCls} w-40`}><option value="quantity">Jumlah (qty)</option><option value="revenue">Omzet</option></select>
          </div>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full"><thead><tr><th className={th}>Produk</th>{matrix.dates.map((d) => <th key={d} className={thr}>{d.slice(5)}</th>)}<th className={thr}>Total</th></tr></thead>
              <tbody>
                {matrix.products.length === 0 && <tr><td className={td} colSpan={2}>Tidak ada penjualan barang pada periode ini.</td></tr>}
                {matrix.products.map((p) => (
                  <tr key={p.sku + p.name} className="border-t border-border"><td className={`${td} whitespace-nowrap`}>{p.name}</td>{matrix.dates.map((d) => <td key={d} className={tdr}>{p.cells.get(d) ? num(p.cells.get(d)!) : ""}</td>)}<td className={`${tdr} font-bold`}>{num(p.total)}</td></tr>
                ))}
                {matrix.products.length > 0 && (
                  <tr className="border-t-2 border-border font-bold bg-slate-50"><td className={td}>Total</td>{matrix.dates.map((d) => <td key={d} className={tdr}>{num(matrix.products.reduce((s, p) => s + (p.cells.get(d) ?? 0), 0))}</td>)}<td className={tdr}>{num(matrix.products.reduce((s, p) => s + p.total, 0))}</td></tr>
                )}
              </tbody></table>
          </CardContent></Card>
        </>
      )}

      {tab === "ranking" && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-xs print:hidden">
            <label className="flex items-center gap-2 font-semibold">Peringkat<select value={rankBy} onChange={(e) => setRankBy(e.target.value as "product" | "customer")} className={`${selectCls} w-36`}><option value="product">Produk</option><option value="customer">Customer</option></select></label>
            <label className="flex items-center gap-2 font-semibold">Berdasarkan<select value={rankMetric} onChange={(e) => setRankMetric(e.target.value as "revenue" | "quantity")} className={`${selectCls} w-44`}><option value="revenue">Omzet</option><option value="quantity">{rankBy === "product" ? "Jumlah terjual" : "Jumlah order"}</option></select></label>
          </div>
          {((rankBy === "product" && products.data) || (rankBy === "customer" && customers.data)) && (
            <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
              <table className="w-full"><thead><tr><th className={th}>#</th><th className={th}>{rankBy === "product" ? "Produk" : "Customer"}</th><th className={thr}>{rankBy === "product" ? "Qty" : "Order"}</th><th className={thr}>Omzet</th><th className={th} style={{ width: "30%" }} /></tr></thead>
                <tbody>
                  {rankBy === "product" && rankedProducts.slice(0, 50).map((r, i) => <tr key={r.productId} className="border-t border-border"><td className={td}>{i + 1}</td><td className={td}>{r.name}</td><td className={tdr}>{num(r.quantity)}</td><td className={tdr}><MoneyDisplay amount={r.revenue} /></td><td className={td}>{bar(r[rankMetric])}</td></tr>)}
                  {rankBy === "customer" && rankedCustomers.slice(0, 50).map((r, i) => <tr key={r.customer} className="border-t border-border"><td className={td}>{i + 1}</td><td className={td}>{r.customer}</td><td className={tdr}>{num(r.orders)}</td><td className={tdr}><MoneyDisplay amount={r.revenue} /></td><td className={td}>{bar(rankMetric === "revenue" ? r.revenue : r.orders)}</td></tr>)}
                  {(rankBy === "product" ? rankedProducts : rankedCustomers).length === 0 && <tr><td className={td} colSpan={5}>Tidak ada penjualan pada periode ini.</td></tr>}
                </tbody></table>
            </CardContent></Card>
          )}
        </>
      )}

      {tab === "customer" && customers.data && (
        <>
          <Note>{customers.data.note}</Note>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full"><thead><tr><th className={th}>#</th><th className={th}>Customer</th><th className={thr}>Order</th><th className={thr}>Omzet</th><th className={thr}>Rata-rata order</th><th className={th}>Order pertama</th><th className={th}>Order terakhir</th><th className={thr}>Laba kotor</th><th className={thr}>Margin</th></tr></thead>
              <tbody>
                {customers.data.rows.length === 0 && <tr><td className={td} colSpan={9}>Tidak ada penjualan pada periode ini.</td></tr>}
                {customers.data.rows.map((r) => (
                  <tr key={r.customer} className="border-t border-border"><td className={td}>{r.rank}</td><td className={td}>{r.customer}</td><td className={tdr}>{r.orders}</td><td className={tdr}><MoneyDisplay amount={r.revenue} /></td><td className={tdr}><MoneyDisplay amount={r.avgOrder} /></td><td className={td}>{r.firstDate}</td><td className={td}>{r.lastDate}</td><td className={tdr}>{r.itemsRevenue ? <MoneyDisplay amount={r.grossProfit} /> : "-"}</td><td className={tdr}>{r.itemsRevenue ? `${r.marginPct}%` : "-"}</td></tr>
                ))}
                <tr className="border-t-2 border-border font-bold bg-slate-50"><td className={td} colSpan={2}>Total</td><td className={tdr}>{customers.data.orders}</td><td className={tdr}><MoneyDisplay amount={customers.data.revenue} /></td><td className={td} colSpan={5} /></tr>
              </tbody></table>
          </CardContent></Card>
        </>
      )}

      {tab === "margin" && margin.data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Penjualan bersih (buku besar)"><MoneyDisplay amount={margin.data.ledger.netSales} /></Stat>
            <Stat label="HPP (buku besar)"><MoneyDisplay amount={margin.data.ledger.costOfGoodsSold} /></Stat>
            <Stat label="Laba kotor (buku besar)"><MoneyDisplay amount={margin.data.ledger.grossProfit} /></Stat>
            <Stat label="Gross profit margin">{margin.data.ledger.marginPct}%</Stat>
          </div>
          <Note>Buku besar: penjualan {num(margin.data.ledger.sales)} − diskon {num(margin.data.ledger.discounts)} + biaya tambahan {num(margin.data.ledger.additionalCharges)}, dikurangi HPP yang sudah dijurnal. Rincian di bawah adalah estimasi dari baris order. {margin.data.note}</Note>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <div className="px-3 py-2 border-b border-border bg-slate-50 text-sm font-bold">Per kategori</div>
            <table className="w-full"><thead><tr><th className={th}>Kategori</th><th className={thr}>Qty</th><th className={thr}>Omzet</th><th className={thr}>HPP</th><th className={thr}>Laba kotor</th><th className={thr}>Margin</th></tr></thead>
              <tbody>
                {margin.data.byCategory.length === 0 && <tr><td className={td} colSpan={6}>Tidak ada penjualan barang pada periode ini.</td></tr>}
                {[...margin.data.byCategory, ...(margin.data.byCategory.length ? [margin.data.items] : [])].map((c) => (
                  <tr key={c.category} className={`border-t border-border ${c.category === "Total" ? "font-bold bg-slate-50 border-t-2" : ""}`}><td className={td}>{c.category}</td><td className={tdr}>{num(c.quantity)}</td><td className={tdr}><MoneyDisplay amount={c.revenue} /></td><td className={tdr}><MoneyDisplay amount={c.cost} /></td><td className={tdr}><MoneyDisplay amount={c.grossProfit} /></td><td className={tdr}>{c.marginPct}%</td></tr>
                ))}
              </tbody></table>
          </CardContent></Card>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <div className="px-3 py-2 border-b border-border bg-slate-50 text-sm font-bold">Per produk (margin tertinggi ke terendah)</div>
            <table className="w-full"><thead><tr><th className={th}>Produk</th><th className={thr}>Omzet</th><th className={thr}>HPP</th><th className={thr}>Laba kotor</th><th className={thr}>Margin</th></tr></thead>
              <tbody>
                {[...margin.data.byProduct].sort((a, b) => b.marginPct - a.marginPct).map((r) => (
                  <tr key={r.productId} className="border-t border-border"><td className={td}>{r.name}</td><td className={tdr}><MoneyDisplay amount={r.revenue} /></td><td className={tdr}><MoneyDisplay amount={r.cost} /></td><td className={tdr}><MoneyDisplay amount={r.grossProfit} /></td><td className={`${tdr} ${r.marginPct < 0 ? "text-rose-700 font-bold" : ""}`}>{r.marginPct}%</td></tr>
                ))}
              </tbody></table>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
