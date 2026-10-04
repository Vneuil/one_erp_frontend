"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { reportsApi } from "@/lib/api/reports";
import { downloadCsv } from "@/lib/utils/csv";
import { Note, RangeFilter, ReportState, Stat, Tabs, monthStart, td, tdr, th, thr, today, useReport } from "@/components/reports/report-ui";

type Tab = "supplier" | "invoices" | "product";
const TABS = [["supplier", "Per Supplier"], ["invoices", "Daftar Invoice"], ["product", "Per Produk (PO)"]] as const;
const num = (n: number) => n.toLocaleString("id-ID");

export default function PurchaseReportsPage() {
  const [tab, setTab] = React.useState<Tab>("supplier");
  const [from, setFrom] = React.useState(monthStart());
  const [to, setTo] = React.useState(today());
  const { data, error, loading } = useReport(`${from}|${to}`, () => reportsApi.purchaseReport({ from, to }).then((r) => r.data));

  const exportCsv = () => {
    if (!data) return;
    const name = (s: string) => `${s}-${from}-${to}.csv`;
    if (tab === "supplier") downloadCsv(name("pembelian-per-supplier"), ["Peringkat", "Supplier", "Invoice", "Subtotal", "Diskon", "Biaya Tambahan", "PPN", "Total", "Dibayar", "Sisa"], data.bySupplier.map((s) => [s.rank, s.supplier, s.invoices, s.subtotal, s.discount, s.additionalCost, s.vat, s.total, s.paid, s.outstanding]));
    else if (tab === "invoices") downloadCsv(name("pembelian-invoice"), ["Tanggal", "No. Invoice", "Supplier", "Subtotal", "Diskon", "Biaya Tambahan", "PPN", "Total", "Dibayar", "Sisa", "Status"], data.invoices.map((i) => [i.date, i.invoiceNumber, i.supplier, i.subtotal, i.discount, i.additionalCost, i.vat, i.total, i.paid, i.outstanding, i.status]));
    else downloadCsv(name("pembelian-per-produk"), ["SKU", "Produk", "Kategori", "Qty", "Nilai", "Harga Rata-rata"], data.byProduct.map((p) => [p.sku, p.name, p.category, p.quantity, p.amount, p.avgPrice]));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Pembelian" description="Pembelian berdasarkan invoice supplier per periode, per supplier, dan per produk (dari purchase order).">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" disabled={!data} onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>Cetak</Button>
      </PageHeader>
      <RangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      <Tabs value={tab} onChange={setTab} tabs={TABS} />
      <ReportState loading={loading} error={error} />

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total pembelian"><MoneyDisplay amount={data.total} /></Stat>
            <Stat label="PPN Masukan"><MoneyDisplay amount={data.vat} /></Stat>
            <Stat label="Sudah dibayar"><MoneyDisplay amount={data.paid} /></Stat>
            <Stat label="Belum dibayar"><MoneyDisplay amount={data.outstanding} /></Stat>
          </div>

          {tab === "supplier" && (
            <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
              <table className="w-full"><thead><tr><th className={th}>#</th><th className={th}>Supplier</th><th className={thr}>Invoice</th><th className={thr}>Subtotal</th><th className={thr}>Diskon</th><th className={thr}>Biaya tambahan</th><th className={thr}>PPN</th><th className={thr}>Total</th><th className={thr}>Dibayar</th><th className={thr}>Sisa</th></tr></thead>
                <tbody>
                  {data.bySupplier.length === 0 && <tr><td className={td} colSpan={10}>Tidak ada invoice pembelian pada periode ini.</td></tr>}
                  {data.bySupplier.map((s) => (
                    <tr key={s.supplier} className="border-t border-border"><td className={td}>{s.rank}</td><td className={td}>{s.supplier}</td><td className={tdr}>{s.invoices}</td><td className={tdr}><MoneyDisplay amount={s.subtotal} /></td><td className={tdr}><MoneyDisplay amount={s.discount} /></td><td className={tdr}><MoneyDisplay amount={s.additionalCost} /></td><td className={tdr}><MoneyDisplay amount={s.vat} /></td><td className={`${tdr} font-bold`}><MoneyDisplay amount={s.total} /></td><td className={tdr}><MoneyDisplay amount={s.paid} /></td><td className={tdr}><MoneyDisplay amount={s.outstanding} /></td></tr>
                  ))}
                </tbody></table>
            </CardContent></Card>
          )}

          {tab === "invoices" && (
            <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
              <table className="w-full"><thead><tr><th className={th}>Tanggal</th><th className={th}>No. Invoice</th><th className={th}>Supplier</th><th className={thr}>Subtotal</th><th className={thr}>PPN</th><th className={thr}>Total</th><th className={thr}>Dibayar</th><th className={thr}>Sisa</th><th className={th}>Status</th></tr></thead>
                <tbody>
                  {data.invoices.length === 0 && <tr><td className={td} colSpan={9}>Tidak ada invoice pembelian pada periode ini.</td></tr>}
                  {data.invoices.map((i) => (
                    <tr key={i.invoiceId} className="border-t border-border"><td className={td}>{i.date}</td><td className={`${td} font-mono`}>{i.invoiceNumber}</td><td className={td}>{i.supplier}</td><td className={tdr}><MoneyDisplay amount={i.subtotal || i.total} /></td><td className={tdr}>{i.vat ? <MoneyDisplay amount={i.vat} /> : "-"}</td><td className={tdr}><MoneyDisplay amount={i.total} /></td><td className={tdr}><MoneyDisplay amount={i.paid} /></td><td className={tdr}><MoneyDisplay amount={i.outstanding} /></td><td className={td}>{i.status}</td></tr>
                  ))}
                </tbody></table>
            </CardContent></Card>
          )}

          {tab === "product" && (
            <>
              <Note>{data.note}</Note>
              <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
                <table className="w-full"><thead><tr><th className={th}>SKU</th><th className={th}>Produk</th><th className={th}>Kategori</th><th className={thr}>Qty</th><th className={thr}>Nilai</th><th className={thr}>Harga rata-rata</th></tr></thead>
                  <tbody>
                    {data.byProduct.length === 0 && <tr><td className={td} colSpan={6}>Tidak ada purchase order pada periode ini.</td></tr>}
                    {data.byProduct.map((p) => (
                      <tr key={p.productId} className="border-t border-border"><td className={`${td} font-mono`}>{p.sku}</td><td className={td}>{p.name}</td><td className={td}>{p.category || "-"}</td><td className={tdr}>{num(p.quantity)}</td><td className={tdr}><MoneyDisplay amount={p.amount} /></td><td className={tdr}><MoneyDisplay amount={p.avgPrice} /></td></tr>
                    ))}
                  </tbody></table>
              </CardContent></Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
