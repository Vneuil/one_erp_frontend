"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { inventoryApi, StockDocument, StockDocumentType } from "@/lib/api/inventory";
import { productsApi, ProductItem } from "@/lib/api/products";
import { manufacturingApi } from "@/lib/api/manufacturing";
import { Tabs, errText, selectCls, td, tdr, th, thr, today, useReport } from "@/components/reports/report-ui";

interface TypeConfig {
  label: string;
  hint: string;
  direction: "in" | "out";
  needsReason: boolean;
  showCost?: boolean;
}

const TYPES: Record<StockDocumentType, TypeConfig> = {
  material_issue: { label: "Pengambilan Bahan", hint: "Bahan keluar dari gudang ke produksi (Dr Barang dalam Proses / Cr Persediaan).", direction: "out", needsReason: false },
  finished_goods_receipt: { label: "Penerimaan Barang Jadi", hint: "Barang jadi hasil produksi masuk gudang (Dr Persediaan / Cr Barang dalam Proses). Biaya per unit bisa diisi dari biaya produksi.", direction: "in", needsReason: false, showCost: true },
  scrap: { label: "Scrap", hint: "Barang rusak/tidak layak dibuang dari stok sebagai kerugian (Dr Rugi Scrap / Cr Persediaan).", direction: "out", needsReason: true },
  memo_in: { label: "Memo Stock Masuk", hint: "Penambahan stok di luar pembelian/produksi, misalnya koreksi atau temuan (Dr Persediaan / Cr Penyesuaian Persediaan).", direction: "in", needsReason: true },
  memo_out: { label: "Memo Stock Keluar", hint: "Pengurangan stok di luar penjualan/produksi, misalnya koreksi atau sampel (Dr Penyesuaian Persediaan / Cr Persediaan).", direction: "out", needsReason: true },
};
const TYPE_KEYS = Object.keys(TYPES) as StockDocumentType[];

interface DraftLine {
  productId: string;
  quantity: number;
  unitCost: string;
  batchNo: string;
  expiryDate: string;
}
const emptyLine = (): DraftLine => ({ productId: "", quantity: 0, unitCost: "", batchNo: "", expiryDate: "" });

export default function StockDocumentsPage() {
  const [type, setType] = React.useState<StockDocumentType>("material_issue");
  const cfg = TYPES[type];

  const [warehouses, setWarehouses] = React.useState<{ id: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [reference, setReference] = React.useState("");
  const [orderId, setOrderId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<DraftLine[]>([emptyLine()]);
  const [productSearch, setProductSearch] = React.useState("");
  const [known, setKnown] = React.useState<Record<string, ProductItem>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [filter, setFilter] = React.useState<"all" | StockDocumentType>("all");
  const [reload, setReload] = React.useState(0);
  const [detail, setDetail] = React.useState<StockDocument | null>(null);

  React.useEffect(() => {
    inventoryApi.listWarehouses({ perPage: 100 }).then((r) => setWarehouses(r.data || [])).catch((e) => setError(errText(e, "Gagal memuat gudang.")));
  }, []);

  // The API returns at most 100 products per request, so the picker is searchable.
  const found = useReport(`products|${productSearch}`, () => productsApi.list({ perPage: 100, search: productSearch || undefined }).then((r) => r.data || []));
  const options = React.useMemo(() => {
    const byId = new Map<string, ProductItem>(Object.entries(known));
    (found.data ?? []).forEach((p) => byId.set(p.id, p));
    return [...byId.values()].sort((a, b) => a.sku.localeCompare(b.sku));
  }, [found.data, known]);

  // Material issues can be tied to a running production order, which is what lets that order use "issued" materials.
  const runningOrders = useReport("running-orders", () => manufacturingApi.listProductionOrders({ perPage: 100 }).then((r) => (r.data || []).filter((o) => o.status === "released" || o.status === "in_progress" || o.status === "paused")), type === "material_issue");

  const history = useReport(`history|${filter}|${reload}`, () => inventoryApi.listStockDocuments({ type: filter === "all" ? undefined : filter }).then((r) => r.data || []));

  const setLine = (i: number, patch: Partial<DraftLine>) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const pickProduct = (i: number, id: string) => {
    const p = options.find((o) => o.id === id);
    if (p) setKnown((k) => ({ ...k, [p.id]: p }));
    setLine(i, { productId: id });
  };

  const total = lines.reduce((s, l) => {
    const p = known[l.productId];
    const unit = cfg.showCost && l.unitCost !== "" ? Number(l.unitCost) : p?.costPrice ?? 0;
    return s + (l.quantity > 0 ? l.quantity * unit : 0);
  }, 0);
  // An order on automatic material consumption takes its materials when units are completed, so issuing them here too would count them twice.
  const linkedOrder = type === "material_issue" ? runningOrders.data?.find((o) => o.id === orderId) : undefined;
  const doubleCount = linkedOrder?.materialMode === "backflush";
  const valid = !doubleCount && warehouseId !== "" && lines.length > 0 && lines.every((l) => l.productId && l.quantity > 0) && (!cfg.needsReason || reason.trim() !== "");

  const changeType = (t: StockDocumentType) => {
    setType(t);
    setError(null);
    setNotice(null);
    setLines((prev) => prev.map((l) => ({ ...l, unitCost: "", batchNo: "", expiryDate: "" })));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await inventoryApi.createStockDocument({
        type, date, warehouseId, reference, reason, notes,
        ...(type === "material_issue" && orderId ? { productionOrderId: orderId } : {}),
        lines: lines.map((l) => ({
          productId: l.productId, quantity: l.quantity,
          ...(cfg.showCost && l.unitCost !== "" ? { unitCost: Number(l.unitCost) } : {}),
          ...(cfg.direction === "in" && l.batchNo.trim() ? { batchNo: l.batchNo.trim(), expiryDate: l.expiryDate || undefined } : {}),
        })),
      });
      setNotice(`${res.data.typeLabel} ${res.data.number} diposting.`);
      setLines([emptyLine()]);
      setReference("");
      setOrderId("");
      setReason("");
      setNotes("");
    } catch (e) {
      setError(errText(e, "Gagal memposting dokumen."));
    } finally {
      setBusy(false);
      setReload((n) => n + 1);
    }
  };

  const fmtUnit = (p: ProductItem) => `${p.sku} - ${p.name} (${p.unit})`;

  return (
    <div className="space-y-6">
      <PageHeader title="Transaksi Stock" description="Pengambilan bahan, penerimaan barang jadi, scrap, dan memo stock. Setiap dokumen memindahkan stok seluruh barisnya sekaligus (semua atau tidak sama sekali) dan dijurnal sebesar harga pokok." />

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <Tabs value={type} onChange={changeType} tabs={TYPE_KEYS.map((k) => [k, TYPES[k].label] as const)} />

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 space-y-4">
          <p className="text-[11px] text-muted-foreground">{cfg.hint} Mutasi antar gudang ada di menu Transfers, dan penghitungan fisik di Stock Opname.</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="space-y-1 text-xs font-semibold">Gudang
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
                <option value="">Pilih gudang...</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">Tanggal<Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
            {type === "material_issue" ? (
              <label className="space-y-1 text-xs font-semibold">Order produksi
                <select value={orderId} onChange={(e) => {
                  const o = runningOrders.data?.find((x) => x.id === e.target.value);
                  setOrderId(e.target.value);
                  if (o) {
                    setReference(o.orderNumber);
                    if (!warehouseId) setWarehouseId(o.warehouseId);
                  }
                }} className={selectCls}>
                  <option value="">Tanpa order (umum)</option>
                  {runningOrders.data?.map((o) => <option key={o.id} value={o.id}>{o.orderNumber} - {o.productName || o.bomName}{o.materialMode === "issued" ? "" : " (otomatis)"}</option>)}
                </select>
              </label>
            ) : (
              <label className="space-y-1 text-xs font-semibold">{type === "finished_goods_receipt" ? "No. order produksi / SPK" : "Referensi"}<Input value={reference} onChange={(e) => setReference(e.target.value)} /></label>
            )}
            <label className="space-y-1 text-xs font-semibold">Alasan{cfg.needsReason ? " *" : ""}<Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={cfg.needsReason ? "Wajib diisi" : "Opsional"} /></label>
          </div>
          {doubleCount && <div role="alert" className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">{linkedOrder?.orderNumber} memakai pengambilan material otomatis saat unit diselesaikan, sehingga bahannya akan terpotong dua kali. Pilih order dengan mode &quot;Diambil lebih dulu&quot; atau pilih &quot;Tanpa order&quot;.</div>}
          <Input placeholder="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">Barang</span>
              <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Cari SKU / nama untuk mengisi daftar pilihan" className="max-w-xs h-8 text-xs" aria-label="Cari produk" />
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <label className="sm:col-span-5 space-y-1 text-[11px] font-semibold">{i === 0 && "Produk"}
                  <select value={l.productId} onChange={(e) => pickProduct(i, e.target.value)} className={selectCls} aria-label={`Produk baris ${i + 1}`}>
                    <option value="">Pilih produk...</option>
                    {options.map((p) => <option key={p.id} value={p.id}>{fmtUnit(p)}</option>)}
                  </select>
                </label>
                <label className="sm:col-span-1 space-y-1 text-[11px] font-semibold">{i === 0 && "Qty"}<Input type="number" min={1} value={l.quantity || ""} onChange={(e) => setLine(i, { quantity: Math.floor(Number(e.target.value)) })} aria-label={`Qty baris ${i + 1}`} /></label>
                {cfg.showCost && <label className="sm:col-span-2 space-y-1 text-[11px] font-semibold">{i === 0 && "Biaya/unit"}<Input type="number" min={0} value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} placeholder={String(known[l.productId]?.costPrice ?? "")} aria-label={`Biaya baris ${i + 1}`} /></label>}
                {cfg.direction === "in" && (
                  <>
                    <label className="sm:col-span-2 space-y-1 text-[11px] font-semibold">{i === 0 && "No. batch"}<Input value={l.batchNo} onChange={(e) => setLine(i, { batchNo: e.target.value })} aria-label={`Batch baris ${i + 1}`} /></label>
                    <label className="sm:col-span-2 space-y-1 text-[11px] font-semibold">{i === 0 && "Kedaluwarsa"}<Input type="date" value={l.expiryDate} disabled={!l.batchNo.trim()} onChange={(e) => setLine(i, { expiryDate: e.target.value })} aria-label={`Kedaluwarsa baris ${i + 1}`} /></label>
                  </>
                )}
                <Button type="button" variant="outline" size="sm" className="h-9 sm:col-span-1" disabled={lines.length === 1} onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} aria-label={`Hapus baris ${i + 1}`}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setLines((prev) => [...prev, emptyLine()])}><Plus className="h-3.5 w-3.5" /> Tambah baris</Button>
              <div className="text-sm font-bold">Perkiraan nilai: <MoneyDisplay amount={total} /></div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || !valid} onClick={submit}>{busy ? "Memposting..." : `Posting ${cfg.label}`}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="text-sm font-bold">Riwayat dokumen</div>
        <Tabs value={filter} onChange={setFilter} tabs={[["all", "Semua"], ...TYPE_KEYS.map((k) => [k, TYPES[k].label] as const)] as readonly (readonly ["all" | StockDocumentType, string])[]} />
        <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
          <table className="w-full"><thead><tr><th className={th}>No. Dokumen</th><th className={th}>Tanggal</th><th className={th}>Jenis</th><th className={th}>Gudang</th><th className={th}>Referensi</th><th className={thr}>Baris</th><th className={thr}>Nilai</th><th className={th}>Jurnal</th><th className={th} /></tr></thead>
            <tbody>
              {history.loading && <tr><td className={td} colSpan={9}>Memuat...</td></tr>}
              {history.error && <tr><td className={`${td} text-rose-700`} colSpan={9}>{history.error}</td></tr>}
              {!history.loading && history.data?.length === 0 && <tr><td className={td} colSpan={9}>Belum ada dokumen.</td></tr>}
              {history.data?.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className={`${td} font-mono font-bold`}>{d.number}</td><td className={td}>{d.date}</td><td className={td}>{d.typeLabel}</td><td className={td}>{d.warehouseName}</td>
                  <td className={td}>{d.reference || d.reason || "-"}</td><td className={tdr}>{d.lines.length}</td><td className={tdr}><MoneyDisplay amount={d.totalValue} /></td>
                  <td className={td}>{d.posted ? "Terposting" : <span className="text-rose-700 font-bold">Belum terposting</span>}</td>
                  <td className={td}><Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setDetail(d)}>Detail</Button></td>
                </tr>
              ))}
            </tbody></table>
        </CardContent></Card>
      </div>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">{detail?.typeLabel} {detail?.number}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div><span className="text-muted-foreground">Tanggal:</span> {detail.date}</div>
                <div><span className="text-muted-foreground">Gudang:</span> {detail.warehouseName}</div>
                <div><span className="text-muted-foreground">Referensi:</span> {detail.reference || "-"}</div>
                <div><span className="text-muted-foreground">Dibuat oleh:</span> {detail.createdBy || "-"}</div>
                {detail.reason && <div className="col-span-2"><span className="text-muted-foreground">Alasan:</span> {detail.reason}</div>}
                {detail.notes && <div className="col-span-2"><span className="text-muted-foreground">Catatan:</span> {detail.notes}</div>}
              </div>
              <table className="w-full"><thead><tr><th className={th}>Produk</th><th className={thr}>Qty</th><th className={thr}>Biaya/unit</th><th className={thr}>Nilai</th><th className={th}>Batch</th></tr></thead>
                <tbody>
                  {detail.lines.map((l) => (
                    <tr key={l.id} className="border-t border-border"><td className={td}><span className="font-mono">{l.productSku}</span> {l.productName}</td><td className={tdr}>{detail.direction === "out" ? "-" : "+"}{l.quantity}</td><td className={tdr}><MoneyDisplay amount={l.unitCost} /></td><td className={tdr}><MoneyDisplay amount={l.amount} /></td><td className={td}>{l.batchNo || "-"}{l.expiryDate ? ` (exp ${l.expiryDate})` : ""}</td></tr>
                  ))}
                  <tr className="border-t-2 border-border font-bold"><td className={td} colSpan={3}>Total</td><td className={tdr}><MoneyDisplay amount={detail.totalValue} /></td><td className={td} /></tr>
                </tbody></table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
