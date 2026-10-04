"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { inventoryApi, WarehouseItem } from "@/lib/api/inventory";
import { productsApi, ProductItem } from "@/lib/api/products";
import { reportsApi } from "@/lib/api/reports";
import { downloadCsv } from "@/lib/utils/csv";
import { Note, RangeFilter, ReportState, Stat, Tabs, monthStart, selectCls, td, tdr, th, thr, today, useReport } from "@/components/reports/report-ui";

type Tab = "card" | "transactions" | "aging";
const TABS = [["card", "Kartu Stock"], ["transactions", "Perincian Transaksi"], ["aging", "Analisa Umur Stock"]] as const;
const TYPE_LABEL: Record<string, string> = { in: "Masuk", out: "Keluar", adjustment: "Penyesuaian", transfer_in: "Transfer masuk", transfer_out: "Transfer keluar" };
const typeLabel = (t: string) => TYPE_LABEL[t] ?? t;
const num = (n: number) => n.toLocaleString("id-ID");

export default function StockReportsPage() {
  const [tab, setTab] = React.useState<Tab>("card");
  const [from, setFrom] = React.useState(monthStart());
  const [to, setTo] = React.useState(today());
  const [asOf, setAsOf] = React.useState(today());
  const [productId, setProductId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [type, setType] = React.useState("");

  const [productSearch, setProductSearch] = React.useState("");
  // The API returns at most 100 products per request, so the picker is searchable.
  const masters = useReport(`masters|${productSearch}`, async () => {
    const [p, w] = await Promise.all([productsApi.list({ perPage: 100, search: productSearch || undefined }), inventoryApi.listWarehouses({ perPage: 100 })]);
    return { products: (p.data || []) as ProductItem[], warehouses: (w.data || []) as WarehouseItem[] };
  });
  const products = masters.data?.products ?? [];
  const warehouses = masters.data?.warehouses ?? [];

  const wh = warehouseId || undefined;
  const card = useReport(`card|${productId}|${wh}|${from}|${to}`, () => reportsApi.stockCard({ productId, warehouseId: wh, from, to }).then((r) => r.data), tab === "card" && productId !== "");
  const tx = useReport(`tx|${productId}|${wh}|${type}|${from}|${to}`, () => reportsApi.stockTransactions({ productId: productId || undefined, warehouseId: wh, type: type || undefined, from, to }).then((r) => r.data), tab === "transactions");
  const aging = useReport(`ag|${wh}|${asOf}`, () => reportsApi.stockAging({ asOf, warehouseId: wh }).then((r) => r.data), tab === "aging");
  const active = tab === "card" ? card : tab === "transactions" ? tx : aging;

  const exportCsv = () => {
    if (tab === "card" && card.data) {
      downloadCsv(`kartu-stock-${card.data.sku}-${from}-${to}.csv`, ["Tanggal", "Jam", "Gudang", "Jenis", "Referensi", "Keterangan", "Batch", "Masuk", "Keluar", "Saldo"],
        [["", "", "", "", "", "Saldo awal", "", "", "", card.data.openingBalance], ...card.data.entries.map((e) => [e.date, e.time, e.warehouse, typeLabel(e.type), e.reference, e.reason, e.batchNo ?? "", e.in || "", e.out || "", e.balance])]);
    } else if (tab === "transactions" && tx.data) {
      downloadCsv(`perincian-transaksi-stock-${from}-${to}.csv`, ["Tanggal", "Jam", "SKU", "Produk", "Gudang", "Jenis", "Referensi", "Keterangan", "Batch", "Oleh", "Qty", "Saldo", "HPP Satuan", "Nilai"],
        tx.data.rows.map((r) => [r.date, r.time, r.sku, r.product, r.warehouse, typeLabel(r.type), r.reference, r.reason, r.batchNo ?? "", r.createdBy ?? "", r.quantity, r.balance, r.unitCost, r.value]));
    } else if (tab === "aging" && aging.data) {
      downloadCsv(`umur-stock-${aging.data.asOf}.csv`, ["SKU", "Produk", "Kategori", "Gudang", ...aging.data.bucketLabels.map((l) => `${l} hari`), "Tanpa batch", "Total", "Nilai", "Umur tertua (hari)", "Kedaluwarsa"],
        aging.data.rows.map((r) => [r.sku, r.product, r.category, r.warehouse, ...r.buckets, r.untracked, r.total, r.value, r.oldestDays, r.expired]));
    }
  };

  const warehouseSelect = (
    <label className="space-y-1 text-xs font-semibold">Gudang
      <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
        <option value="">Semua gudang</option>
        {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
    </label>
  );
  const productSelect = (required: boolean) => (
    <div className="space-y-1 text-xs font-semibold sm:col-span-2">
      <label className="block">Produk</label>
      <div className="flex gap-1.5">
        <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Cari SKU / nama" className="w-36" aria-label="Cari produk" />
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectCls} aria-label="Produk">
          <option value="">{required ? "Pilih produk..." : "Semua produk"}</option>
          {productId && !products.some((p) => p.id === productId) && <option value={productId}>(produk terpilih)</option>}
          {products.map((p) => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Stock" description="Kartu stock dengan saldo berjalan, perincian semua transaksi stock, dan analisa umur stock berdasarkan tanggal penerimaan batch.">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>Cetak</Button>
      </PageHeader>
      <Tabs value={tab} onChange={setTab} tabs={TABS} />

      {tab === "card" && <RangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }}>{productSelect(true)}{warehouseSelect}</RangeFilter>}
      {tab === "transactions" && (
        <RangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }}>
          {productSelect(false)}{warehouseSelect}
          <label className="space-y-1 text-xs font-semibold">Jenis
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
              <option value="">Semua jenis</option>
              {Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        </RangeFilter>
      )}
      {tab === "aging" && (
        <Card className="border-border shadow-2xs print:hidden"><CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold">Umur dihitung per<Input type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)} /></label>
          {warehouseSelect}
        </CardContent></Card>
      )}

      <ReportState loading={active.loading} error={active.error ?? masters.error} empty={tab === "card" && productId === "" ? "Pilih produk untuk melihat kartu stock." : false} />

      {tab === "card" && card.data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Saldo awal">{num(card.data.openingBalance)}</Stat><Stat label="Total masuk">{num(card.data.totalIn)}</Stat>
            <Stat label="Total keluar">{num(card.data.totalOut)}</Stat><Stat label="Saldo akhir">{num(card.data.closingBalance)}</Stat>
          </div>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <div className="px-3 py-2 border-b border-border bg-slate-50 text-sm font-bold"><span className="font-mono text-brand-primary">{card.data.sku}</span> {card.data.productName}</div>
            <table className="w-full"><thead><tr><th className={th}>Tanggal</th><th className={th}>Gudang</th><th className={th}>Jenis</th><th className={th}>Referensi</th><th className={th}>Keterangan</th><th className={thr}>Masuk</th><th className={thr}>Keluar</th><th className={thr}>Saldo</th></tr></thead>
              <tbody>
                <tr className="border-t border-border font-semibold"><td className={td} colSpan={7}>Saldo awal</td><td className={tdr}>{num(card.data.openingBalance)}</td></tr>
                {card.data.entries.length === 0 && <tr className="border-t border-border"><td className={td} colSpan={8}>Tidak ada pergerakan stock pada periode ini.</td></tr>}
                {card.data.entries.map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className={td}>{e.date} <span className="text-muted-foreground">{e.time}</span></td><td className={td}>{e.warehouse}</td><td className={td}>{typeLabel(e.type)}</td>
                    <td className={`${td} font-mono`}>{e.reference || "-"}</td><td className={td}>{e.reason || "-"}{e.batchNo ? ` · batch ${e.batchNo}` : ""}</td>
                    <td className={`${tdr} text-emerald-700`}>{e.in ? num(e.in) : ""}</td><td className={`${tdr} text-rose-700`}>{e.out ? num(e.out) : ""}</td><td className={`${tdr} font-bold`}>{num(e.balance)}</td>
                  </tr>
                ))}
              </tbody></table>
          </CardContent></Card>
        </>
      )}

      {tab === "transactions" && tx.data && (
        <>
          {tx.data.truncated && <div role="status" className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">Hanya 5.000 transaksi pertama yang ditampilkan. Persempit rentang tanggal atau filter.</div>}
          <Note>{tx.data.note}</Note>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full"><thead><tr><th className={th}>Jenis</th><th className={thr}>Transaksi</th><th className={thr}>Qty bersih</th><th className={thr}>Nilai</th></tr></thead>
              <tbody>{tx.data.byType.map((t) => <tr key={t.type} className="border-t border-border"><td className={td}>{typeLabel(t.type)}</td><td className={tdr}>{t.count}</td><td className={tdr}>{num(t.quantity)}</td><td className={tdr}><MoneyDisplay amount={t.value} /></td></tr>)}</tbody></table>
          </CardContent></Card>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full"><thead><tr><th className={th}>Tanggal</th><th className={th}>Produk</th><th className={th}>Gudang</th><th className={th}>Jenis</th><th className={th}>Referensi</th><th className={th}>Keterangan</th><th className={thr}>Qty</th><th className={thr}>Saldo</th><th className={thr}>Nilai</th></tr></thead>
              <tbody>
                {tx.data.rows.length === 0 && <tr><td className={td} colSpan={9}>Tidak ada transaksi stock pada periode ini.</td></tr>}
                {tx.data.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className={td}>{r.date} <span className="text-muted-foreground">{r.time}</span></td><td className={td}><span className="font-mono">{r.sku}</span> {r.product}</td><td className={td}>{r.warehouse}</td><td className={td}>{typeLabel(r.type)}</td>
                    <td className={`${td} font-mono`}>{r.reference || "-"}</td><td className={td}>{r.reason || "-"}</td>
                    <td className={`${tdr} ${r.quantity < 0 ? "text-rose-700" : "text-emerald-700"}`}>{num(r.quantity)}</td><td className={tdr}>{num(r.balance)}</td><td className={tdr}><MoneyDisplay amount={r.value} /></td>
                  </tr>
                ))}
              </tbody></table>
          </CardContent></Card>
        </>
      )}

      {tab === "aging" && aging.data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total stock">{num(aging.data.totalQuantity)}</Stat>
            <Stat label="Nilai stock"><MoneyDisplay amount={aging.data.totalValue} /></Stat>
            <Stat label="Tanpa batch (umur tidak diketahui)">{num(aging.data.untrackedQty)}</Stat>
            <Stat label={`Umur > 90 hari`}>{num(aging.data.bucketTotals[aging.data.bucketTotals.length - 1] ?? 0)}</Stat>
          </div>
          <Note>{aging.data.note}</Note>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full"><thead><tr><th className={th}>SKU</th><th className={th}>Produk</th><th className={th}>Gudang</th>{aging.data.bucketLabels.map((l) => <th key={l} className={thr}>{l} hari</th>)}<th className={thr}>Tanpa batch</th><th className={thr}>Total</th><th className={thr}>Nilai</th><th className={thr}>Tertua</th><th className={thr}>Kedaluwarsa</th></tr></thead>
              <tbody>
                {aging.data.rows.length === 0 && <tr><td className={td} colSpan={9 + aging.data.bucketLabels.length}>Tidak ada stock.</td></tr>}
                {aging.data.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className={`${td} font-mono`}>{r.sku}</td><td className={td}>{r.product}</td><td className={td}>{r.warehouse}</td>
                    {r.buckets.map((b, j) => <td key={j} className={tdr}>{b ? num(b) : ""}</td>)}
                    <td className={tdr}>{r.untracked ? num(r.untracked) : ""}</td><td className={`${tdr} font-bold`}>{num(r.total)}</td><td className={tdr}><MoneyDisplay amount={r.value} /></td>
                    <td className={tdr}>{r.oldestDays ? `${r.oldestDays} hr` : "-"}</td><td className={`${tdr} ${r.expired ? "text-rose-700 font-bold" : ""}`}>{r.expired ? num(r.expired) : ""}</td>
                  </tr>
                ))}
                {aging.data.rows.length > 0 && (
                  <tr className="border-t-2 border-border font-bold bg-slate-50"><td className={td} colSpan={3}>Total</td>{aging.data.bucketTotals.map((b, j) => <td key={j} className={tdr}>{num(b)}</td>)}<td className={tdr}>{num(aging.data.untrackedQty)}</td><td className={tdr}>{num(aging.data.totalQuantity)}</td><td className={tdr}><MoneyDisplay amount={aging.data.totalValue} /></td><td className={td} colSpan={2} /></tr>
                )}
              </tbody></table>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
