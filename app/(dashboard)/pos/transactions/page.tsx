"use client";

import * as React from "react";
import { Receipt, Search, Download, Printer, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/data-table/data-table";
import { MoneyDisplay } from "@/components/shared/money-display";
import { downloadCsv } from "@/lib/utils/csv";
import { useNavigationAccess } from "@/providers/navigation-access";
import { useIsOwnDocument } from "@/lib/hooks/use-own-document";
import { posApi, POSTransactionItem, POSRefundItem } from "@/lib/api/pos";
import { defaultPosSettings, PosSettings } from "@/lib/utils/pos-totals";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "");
const jakartaDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(iso));
const escapeHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STATUS_STYLE: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Partially Refunded": "bg-amber-50 text-amber-700 border-amber-200",
  Refunded: "bg-slate-100 text-slate-700 border-slate-200",
  Voided: "bg-rose-50 text-rose-700 border-rose-200",
};
const STATUS_LABEL: Record<string, string> = {
  Completed: "Selesai",
  "Partially Refunded": "Retur sebagian",
  Refunded: "Diretur penuh",
  Voided: "Dibatalkan (void)",
};

export default function PosTransactionsPage() {
  const { canApprove } = useNavigationAccess();
  const mayReverse = canApprove("pos");
  const isOwn = useIsOwnDocument();

  const [data, setData] = React.useState<POSTransactionItem[]>([]);
  const [settings, setSettings] = React.useState<PosSettings>(defaultPosSettings);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const [detail, setDetail] = React.useState<POSTransactionItem | null>(null);
  const [refunds, setRefunds] = React.useState<POSRefundItem[]>([]);
  const [qty, setQty] = React.useState<Record<string, number>>({});
  const [reason, setReason] = React.useState("");
  const [restock, setRestock] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  const load = React.useCallback(() => Promise.all([posApi.listTransactions({ perPage: 200 }), posApi.getSettings()]), []);

  React.useEffect(() => {
    let alive = true;
    load()
      .then(([t, s]) => {
        if (!alive) return;
        setData(t.data || []);
        if (s.data) setSettings({ ...defaultPosSettings, ...s.data });
        setLoadError(null);
      })
      .catch((err) => alive && setLoadError(errText(err, "Gagal memuat data transaksi POS dari server.")))
      .finally(() => alive && setIsLoading(false));
    return () => {
      alive = false;
    };
  }, [load]);

  const open = async (row: POSTransactionItem) => {
    setDetail(row);
    setQty({});
    setReason("");
    setRestock(true);
    setDialogError(null);
    setRefunds([]);
    try {
      const [full, rf] = await Promise.all([posApi.getTransaction(row.id), posApi.listRefunds(row.id)]);
      setDetail(full.data);
      setRefunds(rf.data || []);
    } catch (e) {
      setDialogError(errText(e, "Gagal memuat detail transaksi."));
    }
  };

  const reload = async (id: string) => {
    const [t, full, rf] = await Promise.all([posApi.listTransactions({ perPage: 200 }), posApi.getTransaction(id), posApi.listRefunds(id)]);
    setData(t.data || []);
    setDetail(full.data);
    setRefunds(rf.data || []);
    setQty({});
    setReason("");
  };

  const act = async (action: () => Promise<unknown>, okText: string) => {
    if (!detail) return;
    setBusy(true);
    setDialogError(null);
    try {
      await action();
      await reload(detail.id);
      setNotice(okText);
    } catch (e) {
      setDialogError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const today = jakartaDay(new Date().toISOString());
  const todays = data.filter((t) => jakartaDay(t.createdAt) === today && t.status !== "Voided");
  const todayNet = todays.reduce((a, t) => a + t.totalAmount - (t.refundedAmount ?? 0), 0);
  const q = search.toLowerCase();
  const filtered = data.filter((t) => t.orderNo.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q) || t.cashier.toLowerCase().includes(q));

  const handlePrint = (t: POSTransactionItem) => {
    const lines = (t.lines || [])
      .map((l) => `<div style="display:flex; justify-content:space-between;"><span>${escapeHtml(l.name)} x${l.quantity}</span><span>Rp ${l.subtotal.toLocaleString("id-ID")}</span></div>`)
      .join("");
    const html = `<html><head><title>Struk ${escapeHtml(t.orderNo)}</title></head>
      <body style="font-family: monospace; font-size: 12px; width: 260px; margin: 0 auto;">
        <div style="text-align:center; border-bottom: 1px dashed #999; padding-bottom: 8px;">
          <strong>${escapeHtml(t.outlet)}</strong><br/>${escapeHtml(settings.receiptHeader).replace(/\n/g, "<br/>")}<br/>${fmtDate(t.createdAt)}<br/>No: ${escapeHtml(t.orderNo)}
        </div>
        <div style="padding-top:8px;">${lines || `<div>${t.totalItems} item</div>`}</div>
        <div style="border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px;">
          ${t.taxAmount ? `<div style="display:flex; justify-content:space-between;"><span>Pajak</span><span>Rp ${t.taxAmount.toLocaleString("id-ID")}</span></div>` : ""}
          <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>TOTAL</span><span>Rp ${t.totalAmount.toLocaleString("id-ID")}</span></div>
          <div>Kasir: ${escapeHtml(t.cashier)} · ${escapeHtml(t.paymentMethod.toUpperCase())}</div>
          ${t.status !== "Completed" ? `<div style="font-weight:bold;">${escapeHtml(STATUS_LABEL[t.status] ?? t.status)}</div>` : ""}
        </div>
        <div style="text-align:center; padding-top:8px;">Cetak Ulang Struk</div>
      </body></html>`;
    const w = window.open("", "_blank", "width=320,height=600");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
  };

  const handleExportRecap = () => {
    downloadCsv(
      "pos-transactions.csv",
      ["No Struk", "Waktu", "Outlet", "Kasir", "Pelanggan", "Metode", "Subtotal", "Diskon", "Pajak", "Total", "Diretur", "Status"],
      filtered.map((t) => [t.orderNo, fmtDate(t.createdAt), t.outlet, t.cashier, t.customer, t.paymentMethod, t.subtotal ?? t.totalAmount, t.discountAmount ?? 0, t.taxAmount ?? 0, t.totalAmount, t.refundedAmount ?? 0, STATUS_LABEL[t.status] ?? t.status])
    );
  };

  const columns: Column<POSTransactionItem>[] = [
    { key: "orderNo", header: "No. Struk", sortable: true, render: (t) => <span className="font-mono text-xs font-bold text-brand-primary">{t.orderNo}</span> },
    { key: "createdAt", header: "Waktu", render: (t) => <span className="text-xs text-muted-foreground">{fmtDate(t.createdAt)}</span> },
    { key: "cashier", header: "Kasir & Outlet", render: (t) => <div className="text-xs"><div className="font-semibold">{t.cashier}</div><div className="text-[10px] text-muted-foreground">{t.outlet}</div></div> },
    { key: "customer", header: "Pelanggan", render: (t) => <span className="text-xs">{t.customer}</span> },
    { key: "paymentMethod", header: "Metode", render: (t) => <span className="text-xs uppercase">{t.paymentMethod}</span> },
    { key: "totalAmount", header: "Total", render: (t) => <div className="text-xs font-bold"><MoneyDisplay amount={t.totalAmount} />{(t.refundedAmount ?? 0) > 0 && <div className="text-[10px] font-normal text-rose-600">diretur <MoneyDisplay amount={t.refundedAmount ?? 0} /></div>}</div> },
    { key: "status", header: "Status", render: (t) => <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_STYLE[t.status] ?? ""}`}>{STATUS_LABEL[t.status] ?? t.status}</span> },
    { key: "id", header: "", render: (t) => <div className="flex items-center gap-1.5"><button onClick={() => open(t)} className="p-1 rounded text-muted-foreground hover:text-brand-primary hover:bg-brand-tint cursor-pointer" title="Detail, retur, dan void"><Eye className="h-3.5 w-3.5" /></button></div> },
  ];

  const canReverse = !!detail && mayReverse && !isOwn(detail.cashierEmail);
  const chosen = Object.entries(qty).filter(([, n]) => n > 0).map(([lineId, quantity]) => ({ lineId, quantity }));
  const canVoid = detail?.status === "Completed" && (detail.refundedAmount ?? 0) === 0;
  const canRefund = (detail?.status === "Completed" || detail?.status === "Partially Refunded") && (detail?.lines?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-brand-primary" />
            <span>Riwayat Transaksi & Struk Kasir POS</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Monitor transaksi kasir, cetak ulang struk, retur sebagian, dan batalkan (void) penjualan. Stok dan jurnal ikut dikoreksi otomatis.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportRecap} className="h-9 gap-1.5 text-xs border-border">
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Ekspor Rekap POS</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs"><CardContent className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-semibold">Omset Bersih Hari Ini</span>
          <div className="text-2xl font-black text-brand-dark"><MoneyDisplay amount={todayNet} /></div>
          <span className="text-[11px] text-muted-foreground">Setelah retur; void tidak dihitung</span>
        </CardContent></Card>
        <Card className="border-border shadow-2xs"><CardContent className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-semibold">Transaksi Hari Ini</span>
          <div className="text-2xl font-black text-emerald-600">{todays.length} Struk</div>
          <span className="text-[11px] text-muted-foreground">
            {todays.length > 0 ? <>Rata-rata <MoneyDisplay amount={todays.reduce((a, t) => a + t.totalAmount, 0) / todays.length} /> / struk</> : "Belum ada transaksi hari ini"}
          </span>
        </CardContent></Card>
        <Card className="border-border shadow-2xs"><CardContent className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-semibold">Dibatalkan / Diretur (Hari Ini)</span>
          <div className="text-2xl font-black text-rose-600">{data.filter((t) => jakartaDay(t.createdAt) === today && t.status === "Voided").length} void · {todays.filter((t) => (t.refundedAmount ?? 0) > 0).length} retur</div>
          <span className="text-[11px] text-muted-foreground">Pantau untuk mendeteksi kecurangan kasir</span>
        </CardContent></Card>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex items-center gap-2 max-w-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Cari no struk, kasir, pelanggan..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs" />
        </div>
        {loadError && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{loadError}</div>}
        {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">{notice}</div>}
        {isLoading ? <div className="py-10 text-center text-xs text-muted-foreground">Memuat transaksi...</div> : <DataTable data={filtered} columns={columns} onRowClick={open} />}
      </div>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base font-bold">{detail?.orderNo} · {detail ? STATUS_LABEL[detail.status] ?? detail.status : ""}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="text-muted-foreground">{fmtDate(detail.createdAt)} · Kasir {detail.cashier} · {detail.outlet} · {detail.paymentMethod.toUpperCase()}</div>
              {dialogError && <div role="alert" className="px-2 py-1.5 rounded bg-rose-50 border border-rose-200 text-rose-700">{dialogError}</div>}

              <table className="w-full">
                <thead><tr className="text-left text-[11px] text-muted-foreground"><th className="py-1">Produk</th><th>Qty</th><th>Harga</th><th>Diretur</th>{canRefund && canReverse && <th>Retur</th>}</tr></thead>
                <tbody>
                  {(detail.lines || []).map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="py-1.5">{l.name || l.sku}</td><td>{l.quantity}</td><td><MoneyDisplay amount={l.unitPrice} /></td><td>{l.refundedQty}</td>
                      {canRefund && canReverse && (
                        <td>
                          <Input type="number" min={0} max={l.quantity - l.refundedQty} step="1" value={qty[l.id] ?? ""} disabled={l.quantity - l.refundedQty <= 0}
                            onChange={(e) => setQty((p) => ({ ...p, [l.id]: Number(e.target.value) }))} className="h-7 w-16 text-xs" aria-label={`Jumlah retur ${l.name}`} />
                        </td>
                      )}
                    </tr>
                  ))}
                  {(detail.lines?.length ?? 0) === 0 && <tr><td colSpan={5} className="py-2 text-muted-foreground">Penjualan cepat tanpa rincian produk ({detail.totalItems} item).</td></tr>}
                </tbody>
              </table>

              <div className="border-t border-border pt-2 space-y-0.5">
                {(detail.discountAmount ?? 0) > 0 && <div className="flex justify-between"><span>Diskon</span><span><MoneyDisplay amount={detail.discountAmount ?? 0} /></span></div>}
                {(detail.taxAmount ?? 0) > 0 && <div className="flex justify-between"><span>Pajak</span><span><MoneyDisplay amount={detail.taxAmount ?? 0} /></span></div>}
                <div className="flex justify-between font-bold"><span>Total</span><span><MoneyDisplay amount={detail.totalAmount} /></span></div>
                {(detail.refundedAmount ?? 0) > 0 && <div className="flex justify-between text-rose-600"><span>Sudah dikembalikan</span><span><MoneyDisplay amount={detail.refundedAmount ?? 0} /></span></div>}
              </div>

              {detail.voidReason && <p className="text-rose-700">Alasan void: {detail.voidReason}</p>}
              {refunds.length > 0 && (
                <ul className="space-y-1">
                  {refunds.map((r) => <li key={r.id} className="rounded border border-border px-2 py-1">{r.kind === "void" ? "Void" : "Retur"} <MoneyDisplay amount={r.amount} /> · {r.reason}{r.restocked ? " · stok dikembalikan" : ""} <span className="text-muted-foreground">({fmtDate(r.createdAt)})</span></li>)}
                </ul>
              )}

              {(canRefund || canVoid) && canReverse && (
                <div className="space-y-2 border-t border-border pt-2">
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan (wajib): barang rusak, salah input, pelanggan batal..." className="h-8 text-xs" />
                  {canRefund && <label className="flex items-center gap-1.5"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Kembalikan barang ke stok</label>}
                  <div className="flex gap-2">
                    {canRefund && (
                      <Button size="sm" variant="outline" disabled={busy || !reason.trim() || chosen.length === 0} onClick={() => act(() => posApi.refund(detail.id, { lines: chosen, reason, restock }), "Retur dicatat.")} className="h-8 text-xs font-bold">
                        Proses Retur ({chosen.length} baris)
                      </Button>
                    )}
                    {canVoid && (
                      <Button size="sm" variant="outline" disabled={busy || !reason.trim()} onClick={() => window.confirm("Batalkan (void) seluruh penjualan ini?") && act(() => posApi.voidTransaction(detail.id, reason), "Transaksi dibatalkan (void).")} className="h-8 text-xs font-bold text-rose-700 border-rose-200">
                        Void Seluruh Transaksi
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {(canRefund || canVoid) && !canReverse && (
                <p className="text-[11px] text-muted-foreground">{mayReverse ? "Retur dan void tidak boleh dilakukan oleh kasir yang menjual; minta atasan." : "Retur dan void memerlukan hak approve di modul POS."}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => detail && handlePrint(detail)} className="h-8 gap-1 text-xs"><Printer className="h-3.5 w-3.5" /> Cetak Ulang</Button>
            <Button size="sm" onClick={() => setDetail(null)} className="h-8 text-xs">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
