"use client";

import * as React from "react";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { downloadCsv } from "@/lib/utils/csv";
import { posApi, SalesReport } from "@/lib/api/pos";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function PosReportsPage() {
  const [from, setFrom] = React.useState(today().slice(0, 8) + "01");
  const [to, setTo] = React.useState(today());
  const [outlet, setOutlet] = React.useState("");
  const [report, setReport] = React.useState<SalesReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    posApi
      .salesReport({ from, to, outlet: outlet || undefined })
      .then((r) => {
        if (!alive) return;
        setReport(r.data);
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat laporan.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [from, to, outlet]);

  const exportCsv = () =>
    report &&
    downloadCsv(
      `pos-sales-${report.from}_${report.to}.csv`,
      ["Tanggal", "Transaksi", "Item", "Penjualan Kotor", "Diskon", "Pajak", "Retur", "Penjualan Bersih", "Void"],
      report.days.map((d) => [d.date, d.transactions, d.itemsSold, d.grossSales, d.discounts, d.tax, d.refunds, d.netSales, d.voided])
    );

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";
  const t = report?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand-primary" />
            <span>Laporan Penjualan POS</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Ringkasan harian, metode pembayaran, kasir, dan produk terlaris. Retur mengurangi hari retur dibuat; void tidak dihitung sebagai penjualan.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs font-semibold">
          <label className="space-y-1">Dari<Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-xs" /></label>
          <label className="space-y-1">Sampai<Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-xs" /></label>
          <label className="space-y-1">Outlet<Input value={outlet} onChange={(e) => setOutlet(e.target.value)} placeholder="semua" className="h-8 w-36 text-xs" /></label>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!report} className="h-8 gap-1 text-xs"><Download className="h-3.5 w-3.5" /> CSV</Button>
        </div>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {loading && <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>}

      {report && t && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Penjualan bersih", <MoneyDisplay key="n" amount={t.netSales} />, `kotor `],
              ["Transaksi", `${t.transactions}`, `${t.itemsSold} item terjual`],
              ["Pajak dipungut", <MoneyDisplay key="x" amount={t.tax} />, `diskon `],
              ["Retur / void", <MoneyDisplay key="r" amount={t.refunds} />, `${t.voided} transaksi void`],
            ].map(([label, value, hint], i) => (
              <Card key={i} className="border-border shadow-2xs"><CardContent className="p-4 space-y-1"><div className="text-xs text-muted-foreground font-semibold">{label}</div><div className="text-xl font-black">{value}</div><div className="text-[11px] text-muted-foreground">{i === 0 ? <>kotor <MoneyDisplay amount={t.grossSales} /></> : i === 2 ? <>diskon <MoneyDisplay amount={t.discounts} /></> : hint}</div></CardContent></Card>
            ))}
          </div>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead><tr>{["Tanggal", "Transaksi", "Item", "Kotor", "Diskon", "Pajak", "Retur", "Bersih", "Void"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {report.days.length === 0 && <tr><td className={td} colSpan={9}>Tidak ada penjualan pada periode ini.</td></tr>}
                  {report.days.map((d) => (
                    <tr key={d.date} className="border-t border-border">
                      <td className={`${td} font-semibold`}>{d.date}</td><td className={td}>{d.transactions}</td><td className={td}>{d.itemsSold}</td>
                      <td className={td}><MoneyDisplay amount={d.grossSales} /></td><td className={td}><MoneyDisplay amount={d.discounts} /></td><td className={td}><MoneyDisplay amount={d.tax} /></td>
                      <td className={td}><MoneyDisplay amount={d.refunds} /></td><td className={`${td} font-bold`}><MoneyDisplay amount={d.netSales} /></td><td className={td}>{d.voided}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              ["Metode pembayaran", report.byPayment],
              ["Kasir", report.byCashier],
            ].map(([title, rows]) => (
              <Card key={title as string} className="border-border shadow-2xs"><CardContent className="p-4 space-y-1.5">
                <div className="text-xs font-bold">{title as string}</div>
                {(rows as SalesReport["byPayment"]).length === 0 && <p className="text-xs text-muted-foreground">Belum ada data.</p>}
                {(rows as SalesReport["byPayment"]).map((r) => <div key={r.name} className="flex justify-between text-xs"><span className="uppercase">{r.name} <span className="text-muted-foreground normal-case">({r.transactions})</span></span><MoneyDisplay amount={r.amount} /></div>)}
              </CardContent></Card>
            ))}
            <Card className="border-border shadow-2xs"><CardContent className="p-4 space-y-1.5">
              <div className="text-xs font-bold">Produk terlaris (bersih dari retur)</div>
              {report.topProducts.length === 0 && <p className="text-xs text-muted-foreground">Belum ada data.</p>}
              {report.topProducts.map((p) => <div key={p.sku + p.name} className="flex justify-between text-xs"><span>{p.name}</span><span>{p.quantity} · <MoneyDisplay amount={p.revenue} /></span></div>)}
            </CardContent></Card>
          </div>
        </>
      )}
    </div>
  );
}
