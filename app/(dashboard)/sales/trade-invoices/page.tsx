"use client";

import * as React from "react";
import { Plus, Eye, Send, Ban, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useConfirm, useAlert } from "@/components/shared/confirm-modal";
import { useRole } from "@/lib/hooks/use-role";
import {
  salesApi,
  tradeInvoicesApi,
  TradeInvoice,
  TradeKind,
  SalesOrderItem,
  QuotationItem,
} from "@/lib/api/sales";

const fmt = (n: number, cur = "IDR") => `${cur} ${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
const selectClass = "flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-xs";

type Source = "order" | "quotation" | "pi";

export default function TradeInvoicesPage() {
  const { isSuperAdmin } = useRole();
  const confirm = useConfirm();
  const alert = useAlert();

  const [tab, setTab] = React.useState<TradeKind>("PI");
  const [items, setItems] = React.useState<TradeInvoice[]>([]);
  const [allPi, setAllPi] = React.useState<TradeInvoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<TradeInvoice | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [source, setSource] = React.useState<Source>("order");
  const [sourceId, setSourceId] = React.useState("");
  const [orders, setOrders] = React.useState<SalesOrderItem[]>([]);
  const [quotes, setQuotes] = React.useState<QuotationItem[]>([]);
  const [paymentTerm, setPaymentTerm] = React.useState("");
  const [incoterm, setIncoterm] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [vatExempt, setVatExempt] = React.useState<boolean | null>(null); // null = follow the source
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    Promise.all([tradeInvoicesApi.list({ kind: tab, perPage: 100 }), tradeInvoicesApi.list({ kind: "PI", perPage: 100 })])
      .then(([cur, pis]) => {
        setItems(cur.data || []);
        setAllPi(pis.data || []);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat PI/CI"))
      .finally(() => setLoading(false));
  }, [tab]);

  React.useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin, load]);

  React.useEffect(() => {
    if (!createOpen) return;
    salesApi.listOrders({ perPage: 100 }).then((r) => setOrders(r.data || [])).catch(() => undefined);
    salesApi.listQuotations({ perPage: 100 }).then((r) => setQuotes(r.data || [])).catch(() => undefined);
  }, [createOpen]);

  const openCreate = (kind: TradeKind, fromPi?: TradeInvoice) => {
    setTab(kind);
    setSource(fromPi ? "pi" : "order");
    setSourceId(fromPi?.id ?? "");
    setPaymentTerm("");
    setIncoterm("");
    setNotes("");
    setVatExempt(null);
    setView(null);
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId) return;
    setSaving(true);
    try {
      await tradeInvoicesApi.create({
        kind: tab,
        salesOrderId: source === "order" ? sourceId : undefined,
        quotationId: source === "quotation" ? sourceId : undefined,
        parentId: source === "pi" ? sourceId : undefined,
        paymentTerm: paymentTerm || undefined,
        incoterm: incoterm || undefined,
        notes: notes || undefined,
        vatExempt: vatExempt ?? undefined,
      });
      setCreateOpen(false);
      load();
    } catch (err) {
      await alert({ title: "Gagal Membuat Dokumen", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const act = async (inv: TradeInvoice, action: "issue" | "cancel") => {
    const ok = await confirm({
      title: action === "issue" ? `Terbitkan ${inv.kind}` : `Batalkan ${inv.kind}`,
      message: action === "issue" ? `Terbitkan ${inv.number}? Setelah terbit dokumen tidak dapat diubah.` : `Batalkan ${inv.number}?`,
      confirmText: action === "issue" ? "Terbitkan" : "Batalkan",
      variant: action === "cancel" ? "destructive" : "default",
    });
    if (!ok) return;
    try {
      const res = action === "issue" ? await tradeInvoicesApi.issue(inv.id) : await tradeInvoicesApi.cancel(inv.id);
      setView(res.data);
      load();
    } catch (err) {
      await alert({ title: "Gagal", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Proforma / Commercial Invoice (PI/CI)" description="Menu ini khusus superadmin." />
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Anda tidak memiliki akses ke menu PI/CI. Hubungi superadmin (Ko Steven).
        </div>
      </div>
    );
  }

  const columns: Column<TradeInvoice>[] = [
    { key: "number", header: "Nomor", sortable: true, render: (i) => <span className="font-mono text-xs font-bold text-brand-primary">{i.number}</span> },
    { key: "customerName", header: "Pelanggan", sortable: true, render: (i) => <span className="text-xs font-medium">{i.customerName}</span> },
    { key: "issueDate", header: "Tanggal", render: (i) => <span className="text-xs">{i.issueDate}</span> },
    {
      key: "vat",
      header: "PPN",
      render: (i) => <span className="text-xs text-muted-foreground">{i.vatExempt ? "Nonaktif (ekspor)" : `${i.vatRate}%`}</span>,
    },
    { key: "total", header: "Total", align: "right", render: (i) => <span className="text-xs font-semibold">{fmt(i.total, i.currency)}</span> },
    { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status === "issued" ? "approved" : i.status === "cancelled" ? "cancelled" : "draft"} label={i.status === "issued" ? "Terbit" : i.status === "cancelled" ? "Batal" : "Draft"} /> },
    {
      key: "id",
      header: "Aksi",
      render: (i) => (
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => setView(i)}>
          <Eye className="h-3 w-3" /> Lihat
        </Button>
      ),
    },
  ];

  const sourceOptions =
    source === "order"
      ? orders.map((o) => ({ id: o.id, label: `${o.orderNumber} — ${o.customerName}` }))
      : source === "quotation"
        ? quotes.map((q) => ({ id: q.id, label: `${q.quotationNumber} — ${q.customerName}` }))
        : allPi.filter((p) => p.status === "issued").map((p) => ({ id: p.id, label: `${p.number} — ${p.customerName}` }));

  return (
    <div className="space-y-6">
      <PageHeader title="Proforma / Commercial Invoice (PI/CI)" description="Dokumen penagihan ekspor/komersial, dibuat dari Penawaran atau Pesanan Penjualan. Khusus superadmin.">
        <Button onClick={() => openCreate(tab)} variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> Buat {tab}
        </Button>
      </PageHeader>

      <div className="flex gap-2">
        {(["PI", "CI"] as TradeKind[]).map((k) => (
          <Button key={k} size="sm" variant={tab === k ? "gradient" : "outline"} onClick={() => setTab(k)}>
            {k === "PI" ? "Proforma Invoice (PI)" : "Commercial Invoice (CI)"}
          </Button>
        ))}
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      <DataTable columns={columns} data={items} isLoading={loading} searchKey="customerName" searchPlaceholder="Cari pelanggan..." />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat {tab === "PI" ? "Proforma Invoice" : "Commercial Invoice"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold">Sumber</label>
              <select
                className={selectClass}
                value={source}
                onChange={(e) => { setSource(e.target.value as Source); setSourceId(""); }}
              >
                <option value="order">Pesanan Penjualan</option>
                <option value="quotation">Penawaran (Quotation)</option>
                {tab === "CI" && <option value="pi">Proforma Invoice (PI) yang sudah terbit</option>}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold">Dokumen sumber *</label>
              <select className={selectClass} value={sourceId} onChange={(e) => setSourceId(e.target.value)} required>
                <option value="">— Pilih —</option>
                {sourceOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold">Payment Term</label>
                <Input value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} placeholder="cth: 30% DP, 70% sebelum kirim" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold">Incoterm</label>
                <Input value={incoterm} onChange={(e) => setIncoterm(e.target.value)} placeholder="FOB / CIF ..." />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={vatExempt === true}
                onChange={(e) => setVatExempt(e.target.checked ? true : null)}
              />
              <span className="font-medium">Nonaktifkan PPN 11% (ekspor)</span>
              <span className="text-muted-foreground">— jika tidak dicentang, mengikuti pengaturan sumber</span>
            </label>
            <div className="space-y-1">
              <label className="font-semibold">Catatan</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Batal</Button>
              <Button type="submit" variant="gradient" size="sm" disabled={saving || !sourceId}>Simpan Draft</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>{view.kind} {view.number}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground block">Pelanggan</span><strong>{view.customerName}</strong></div>
                <div><span className="text-muted-foreground block">Tanggal</span>{view.issueDate}</div>
                <div><span className="text-muted-foreground block">Payment Term</span>{view.paymentTerm || "-"}</div>
                <div><span className="text-muted-foreground block">Incoterm</span>{view.incoterm || "-"}</div>
                <div className="col-span-2"><span className="text-muted-foreground block">Alamat kirim</span>{view.shippingAddress || "-"}</div>
              </div>
              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-muted-foreground">
                  <tr><th className="p-2 text-left">Deskripsi</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Harga</th><th className="p-2 text-right">Subtotal</th></tr>
                </thead>
                <tbody>
                  {view.lines.map((l, i) => (
                    <tr key={l.id ?? i} className="border-t border-border">
                      <td className="p-2">{l.description || l.productId?.slice(0, 8)} {l.unit && <span className="text-muted-foreground">({l.unit})</span>}</td>
                      <td className="p-2 text-right">{l.quantity}</td>
                      <td className="p-2 text-right">{fmt(l.unitPrice, view.currency)}</td>
                      <td className="p-2 text-right">{fmt(l.subtotal ?? l.quantity * l.unitPrice, view.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-xs">
                  <tr className="border-t border-border"><td colSpan={3} className="p-2 text-right">Subtotal</td><td className="p-2 text-right">{fmt(view.subtotal, view.currency)}</td></tr>
                  <tr><td colSpan={3} className="p-2 text-right">{view.vatExempt ? "PPN (nonaktif — ekspor)" : `PPN ${view.vatRate}%`}</td><td className="p-2 text-right">{fmt(view.vatAmount, view.currency)}</td></tr>
                  <tr className="font-bold"><td colSpan={3} className="p-2 text-right">Total</td><td className="p-2 text-right">{fmt(view.total, view.currency)}</td></tr>
                </tfoot>
              </table>
              {view.notes && <p className="text-xs text-muted-foreground">Catatan: {view.notes}</p>}
              <DialogFooter className="gap-2">
                {view.status === "draft" && (
                  <Button size="sm" variant="gradient" className="gap-1" onClick={() => act(view, "issue")}><Send className="h-3 w-3" /> Terbitkan</Button>
                )}
                {view.kind === "PI" && view.status === "issued" && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openCreate("CI", view)}><FilePlus2 className="h-3 w-3" /> Buat CI dari PI ini</Button>
                )}
                {view.status !== "cancelled" && (
                  <Button size="sm" variant="outline" className="gap-1 border-rose-200 text-rose-700" onClick={() => act(view, "cancel")}><Ban className="h-3 w-3" /> Batalkan</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
