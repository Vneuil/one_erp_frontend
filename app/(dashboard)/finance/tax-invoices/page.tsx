"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { salesApi, InvoiceItem } from "@/lib/api/sales";
import { procurementApi, PurchaseInvoiceItem } from "@/lib/api/procurement";
import { taxApi, TaxDirection, TaxInvoice, TaxStatus, UpdateTaxInvoiceInput } from "@/lib/api/tax";
import { downloadCsv } from "@/lib/utils/csv";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const STATUS: Record<TaxStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700" },
  issued: { label: "Terbit", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Batal", cls: "bg-rose-100 text-rose-800" },
  replaced: { label: "Diganti", cls: "bg-amber-100 text-amber-800" },
};

export default function TaxInvoicesPage() {
  const [direction, setDirection] = React.useState<TaxDirection>("output");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [reload, setReload] = React.useState(0);
  const [items, setItems] = React.useState<TaxInvoice[] | null>(null);
  const [allOpen, setAllOpen] = React.useState<TaxInvoice[]>([]);
  const [salesInvoices, setSalesInvoices] = React.useState<InvoiceItem[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = React.useState<PurchaseInvoiceItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [sourceId, setSourceId] = React.useState("");
  const [supplierFaktur, setSupplierFaktur] = React.useState("");
  const [supplierDate, setSupplierDate] = React.useState(today());
  const [detail, setDetail] = React.useState<TaxInvoice | null>(null);
  const [edit, setEdit] = React.useState<{ id: string; form: UpdateTaxInvoiceInput } | null>(null);
  const [exportFrom, setExportFrom] = React.useState(today().slice(0, 8) + "01");
  const [exportTo, setExportTo] = React.useState(today());

  const filterKey = `${direction}|${statusFilter}|${search}|${reload}`;
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  const loading = loadedKey !== filterKey;

  React.useEffect(() => {
    let alive = true;
    Promise.all([
      taxApi.listInvoices({ direction, status: statusFilter || undefined, search: search || undefined }),
      taxApi.listInvoices({}),
      salesApi.listInvoices({ perPage: 100 }),
      procurementApi.listPurchaseInvoices({ perPage: 100 }),
    ])
      .then(([list, all, sales, purchases]) => {
        if (!alive) return;
        setItems(list.data || []);
        setAllOpen((all.data || []).filter((t) => t.status === "draft" || t.status === "issued"));
        setSalesInvoices(sales.data || []);
        setPurchaseInvoices(purchases.data || []);
        setError(null);
        setLoadedKey(filterKey);
      })
      .catch((e) => {
        if (!alive) return;
        setError(errText(e, "Gagal memuat Faktur Pajak."));
        setLoadedKey(filterKey);
      });
    return () => {
      alive = false;
    };
  }, [filterKey, direction, statusFilter, search]);

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
      setReload((n) => n + 1);
    }
  };

  const openSources = new Set(allOpen.map((t) => t.sourceId));
  const salesCandidates = salesInvoices.filter((i) => (i.vatAmount ?? 0) > 0 && !openSources.has(i.id));
  const purchaseCandidates = purchaseInvoices.filter((i) => (i.vatAmount ?? 0) > 0 && i.vatCreditable && !openSources.has(i.id));

  const create = () =>
    run(async () => {
      if (direction === "output") await taxApi.createFromSalesInvoice({ salesInvoiceId: sourceId });
      else await taxApi.createFromPurchaseInvoice({ purchaseInvoiceId: sourceId, taxNumber: supplierFaktur, date: supplierDate });
      setSourceId("");
      setSupplierFaktur("");
    }, "Draft Faktur Pajak dibuat. Periksa datanya lalu terbitkan.");

  const askReason = (t: TaxInvoice) => {
    const reason = window.prompt(`Alasan pembatalan ${t.taxNumber || t.number}:`, "");
    if (reason === null) return;
    run(() => taxApi.cancel(t.id, reason), "Faktur Pajak dibatalkan.");
  };
  const askNumber = (t: TaxInvoice) => {
    const n = window.prompt("Nomor Faktur Pajak resmi:", t.taxNumber);
    if (n === null || !n.trim()) return;
    run(() => taxApi.setTaxNumber(t.id, n.trim()), "Nomor Faktur Pajak disimpan.");
  };

  const exportCoretax = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await taxApi.coretaxExport(exportFrom, exportTo);
      const ex = res.data;
      if (ex.rows.length === 0) {
        setNotice("Tidak ada Faktur Pajak Keluaran yang terbit pada rentang tanggal ini.");
        return;
      }
      downloadCsv(`coretax-faktur-keluaran-${exportFrom}-${exportTo}.csv`, ex.headers, ex.rows);
      setNotice(`${ex.invoices} faktur (${ex.rows.length} baris) diekspor.${ex.warnings.length ? " Perhatian: " + ex.warnings.join("; ") : ""}`);
    } catch (e) {
      setError(errText(e, "Gagal menyiapkan ekspor Coretax."));
    } finally {
      setBusy(false);
    }
  };

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs align-top";
  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-xs";
  const btn = "h-7 text-[11px]";

  return (
    <div className="space-y-6">
      <PageHeader title="Faktur Pajak" description="Faktur Pajak Keluaran dari invoice penjualan ber-PPN dan Faktur Pajak Masukan dari invoice pembelian ber-PPN." />

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <div className="flex gap-1.5">
        {([["output", "Keluaran (Penjualan)"], ["input", "Masukan (Pembelian)"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setDirection(k); setSourceId(""); }} className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${direction === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-bold">{direction === "output" ? "Buat Faktur Pajak Keluaran dari invoice" : "Catat Faktur Pajak Masukan dari invoice pembelian"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
            <label className="space-y-1 text-xs font-semibold sm:col-span-2">
              Invoice
              <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={sel}>
                <option value="">{(direction === "output" ? salesCandidates : purchaseCandidates).length === 0 ? "Tidak ada invoice ber-PPN yang belum difakturkan" : "Pilih invoice..."}</option>
                {direction === "output"
                  ? salesCandidates.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} - {i.customerName} (PPN {i.vatAmount?.toLocaleString("id-ID")})</option>)
                  : purchaseCandidates.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} - {i.supplierName} (PPN {i.vatAmount?.toLocaleString("id-ID")})</option>)}
              </select>
            </label>
            {direction === "input" && (
              <>
                <label className="space-y-1 text-xs font-semibold sm:col-span-2">No. Faktur Pajak supplier<Input value={supplierFaktur} onChange={(e) => setSupplierFaktur(e.target.value)} placeholder="010.000-26.12345678" /></label>
                <label className="space-y-1 text-xs font-semibold">Tanggal faktur<Input type="date" value={supplierDate} onChange={(e) => setSupplierDate(e.target.value)} /></label>
              </>
            )}
            <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || !sourceId} onClick={create}>Buat draft</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <label className="space-y-1 text-xs font-semibold">Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={sel}>
            <option value="">Semua</option>
            {(Object.keys(STATUS) as TaxStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold sm:col-span-2">Cari<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nomor, nama, atau invoice" /></label>
      </div>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["No. Dokumen", "No. Faktur Pajak", "Tanggal", direction === "output" ? "Pembeli" : "Penjual", "Invoice", "DPP", "PPN", "Status", ""].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td className={td} colSpan={9}>Memuat...</td></tr>}
              {!loading && items?.length === 0 && <tr><td className={td} colSpan={9}>Belum ada Faktur Pajak.</td></tr>}
              {!loading && items?.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className={`${td} font-mono font-bold`}>{t.number}{t.revision > 0 && <span className="ml-1 text-[10px] text-amber-700">pengganti</span>}</td>
                  <td className={`${td} font-mono`}>{t.taxNumber || <span className="text-muted-foreground">-</span>}</td>
                  <td className={td}>{t.date}</td>
                  <td className={td}>{t.counterpartyName}<div className="text-[10px] text-muted-foreground font-mono">{t.counterpartyNpwp || t.counterpartyNik || "tanpa NPWP/NIK"}</div></td>
                  <td className={`${td} font-mono`}>{t.sourceReference}</td>
                  <td className={`${td} text-right`}><MoneyDisplay amount={t.taxBase} /></td>
                  <td className={`${td} text-right font-bold`}><MoneyDisplay amount={t.vatAmount} /></td>
                  <td className={td}><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span></td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="outline" size="sm" className={btn} onClick={() => setDetail(t)}>Detail</Button>
                      {t.status === "draft" && <Button variant="outline" size="sm" className={btn} disabled={busy} onClick={() => setEdit({ id: t.id, form: { transactionCode: t.transactionCode, date: t.date, counterpartyName: t.counterpartyName, counterpartyNpwp: t.counterpartyNpwp, counterpartyNik: t.counterpartyNik, counterpartyAddress: t.counterpartyAddress, counterpartyEmail: t.counterpartyEmail, taxNumber: t.taxNumber, notes: t.notes } })}>Edit</Button>}
                      {t.status === "draft" && <Button size="sm" className={btn} disabled={busy} onClick={() => run(() => taxApi.issue(t.id), "Faktur Pajak diterbitkan.")}>Terbitkan</Button>}
                      {(t.status === "draft" || t.status === "issued") && <Button variant="outline" size="sm" className={btn} disabled={busy} onClick={() => askNumber(t)}>Nomor</Button>}
                      {t.status === "issued" && <Button variant="outline" size="sm" className={btn} disabled={busy} onClick={() => run(() => taxApi.replace(t.id), "Draft faktur pengganti dibuat.")}>Pengganti</Button>}
                      {(t.status === "draft" || t.status === "issued") && <Button variant="outline" size="sm" className={`${btn} text-rose-700`} disabled={busy} onClick={() => askReason(t)}>Batalkan</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {direction === "output" && (
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-bold">Ekspor ke Coretax (CSV)</div>
            <p className="text-[11px] text-muted-foreground">Mengekspor Faktur Pajak Keluaran berstatus Terbit pada rentang tanggal faktur. Susunan kolom mengikuti template impor Coretax sesuai pengetahuan terbaik kami dan belum divalidasi dengan unggahan Coretax sungguhan: uji dengan satu faktur sebelum dipakai untuk periode penuh.</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <label className="space-y-1 text-xs font-semibold">Dari<Input type="date" value={exportFrom} max={exportTo} onChange={(e) => setExportFrom(e.target.value)} /></label>
              <label className="space-y-1 text-xs font-semibold">Sampai<Input type="date" value={exportTo} min={exportFrom} onChange={(e) => setExportTo(e.target.value)} /></label>
              <Button size="sm" className="h-9 gap-1.5 text-xs font-bold" disabled={busy} onClick={exportCoretax}><Download className="h-3.5 w-3.5" /> Unduh CSV Coretax</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">{detail?.number} {detail?.taxNumber ? `· ${detail.taxNumber}` : ""}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div><span className="text-muted-foreground">{detail.direction === "output" ? "Pembeli" : "Penjual"}:</span> {detail.counterpartyName}</div>
                <div><span className="text-muted-foreground">NPWP/NIK:</span> <span className="font-mono">{detail.counterpartyNpwp || detail.counterpartyNik || "-"}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Alamat:</span> {detail.counterpartyAddress || "-"}</div>
                <div><span className="text-muted-foreground">Tanggal:</span> {detail.date} (masa {detail.period})</div>
                <div><span className="text-muted-foreground">Kode transaksi:</span> {detail.transactionCode || "-"}</div>
                {detail.cancelReason && <div className="col-span-2 text-rose-700">Alasan batal: {detail.cancelReason}</div>}
              </div>
              <table className="w-full">
                <thead><tr>{["Barang / Jasa", "Qty", "Harga", "DPP", "PPN"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {detail.lines?.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-3 py-1.5">{l.description}</td><td className="px-3 py-1.5">{l.quantity} {l.unit}</td>
                      <td className="px-3 py-1.5"><MoneyDisplay amount={l.unitPrice} /></td><td className="px-3 py-1.5"><MoneyDisplay amount={l.taxBase} /></td><td className="px-3 py-1.5"><MoneyDisplay amount={l.vatAmount} /></td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="px-3 py-1.5" colSpan={3}>Total (PPN {detail.vatRate}%{detail.dppOtherValue > 0 ? `, DPP nilai lain ${detail.dppOtherValue.toLocaleString("id-ID")}` : ""})</td>
                    <td className="px-3 py-1.5"><MoneyDisplay amount={detail.taxBase} /></td><td className="px-3 py-1.5"><MoneyDisplay amount={detail.vatAmount} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-base font-bold">Edit draft Faktur Pajak</DialogTitle></DialogHeader>
          {edit && (
            <form
              className="space-y-3 text-xs"
              onSubmit={(e) => {
                e.preventDefault();
                const { id, form } = edit;
                setEdit(null);
                run(() => taxApi.updateDraft(id, form), "Draft diperbarui.");
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 font-semibold">Nama<Input value={edit.form.counterpartyName ?? ""} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, counterpartyName: e.target.value } })} /></label>
                <label className="space-y-1 font-semibold">Tanggal faktur<Input type="date" value={edit.form.date ?? ""} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, date: e.target.value } })} /></label>
                <label className="space-y-1 font-semibold">NPWP<Input inputMode="numeric" value={edit.form.counterpartyNpwp ?? ""} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, counterpartyNpwp: e.target.value } })} /></label>
                <label className="space-y-1 font-semibold">NIK<Input inputMode="numeric" value={edit.form.counterpartyNik ?? ""} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, counterpartyNik: e.target.value } })} /></label>
                <label className="space-y-1 font-semibold">Kode transaksi<Input value={edit.form.transactionCode ?? ""} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, transactionCode: e.target.value } })} /></label>
                {direction === "input" && <label className="space-y-1 font-semibold">No. Faktur Pajak supplier<Input value={edit.form.taxNumber ?? ""} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, taxNumber: e.target.value } })} /></label>}
              </div>
              <label className="space-y-1 font-semibold block">Alamat<Input value={edit.form.counterpartyAddress ?? ""} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, counterpartyAddress: e.target.value } })} /></label>
              <label className="space-y-1 font-semibold block">Email<Input value={edit.form.counterpartyEmail ?? ""} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, counterpartyEmail: e.target.value } })} /></label>
              <label className="space-y-1 font-semibold block">Keterangan tambahan<Input value={edit.form.notes ?? ""} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, notes: e.target.value } })} /></label>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEdit(null)}>Batal</Button>
                <Button type="submit" size="sm" className="font-semibold">Simpan</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
