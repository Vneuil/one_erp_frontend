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
import { customersApi, CustomerItem } from "@/lib/api/customers";
import { productsApi, ProductItem } from "@/lib/api/products";
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

type Source = "po" | "order" | "quotation" | "pi";
interface PoLine { productId: string; quantity: number; unitPrice: number }

export default function TradeInvoicesPage() {
  const { canUseTradeDocs } = useRole();
  const confirm = useConfirm();
  const alert = useAlert();

  const [tab, setTab] = React.useState<TradeKind>("PI");
  const [items, setItems] = React.useState<TradeInvoice[]>([]);
  const [allPi, setAllPi] = React.useState<TradeInvoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<TradeInvoice | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [source, setSource] = React.useState<Source>("po");
  // PO Masuk: the customer's own PO, answered by a PI (prices are ours to set; they start from what that customer paid last).
  const [customers, setCustomers] = React.useState<CustomerItem[]>([]);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [poCustomerId, setPoCustomerId] = React.useState("");
  const [poNumber, setPoNumber] = React.useState("");
  const [poFileKey, setPoFileKey] = React.useState("");
  const [poFileName, setPoFileName] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [dpPercent, setDpPercent] = React.useState("50");
  const [poLines, setPoLines] = React.useState<PoLine[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);
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
    if (canUseTradeDocs) load();
  }, [canUseTradeDocs, load]);

  React.useEffect(() => {
    if (!createOpen) return;
    salesApi.listOrders({ perPage: 100 }).then((r) => setOrders(r.data || [])).catch(() => undefined);
    salesApi.listQuotations({ perPage: 100 }).then((r) => setQuotes(r.data || [])).catch(() => undefined);
    customersApi.list({ perPage: 200 }).then((r) => setCustomers((r.data || []).filter((c) => c.status?.toLowerCase() !== "inactive"))).catch(() => undefined);
    productsApi.list({ perPage: 500 }).then((r) => setProducts(r.data || [])).catch(() => undefined);
  }, [createOpen]);

  const openCreate = (kind: TradeKind, fromPi?: TradeInvoice) => {
    setTab(kind);
    setSource(fromPi ? "pi" : kind === "PI" ? "po" : "order");
    setPoCustomerId(""); setPoNumber(""); setPoFileKey(""); setPoFileName(""); setDpPercent("50");
    setPoLines([{ productId: "", quantity: 1, unitPrice: 0 }]);
    setSourceId(fromPi?.id ?? "");
    setPaymentTerm("");
    setIncoterm("");
    setNotes("");
    setVatExempt(null);
    setView(null);
    setCreateOpen(true);
  };

  const poCustomer = customers.find((c) => c.id === poCustomerId);

  const updatePoLine = (i: number, patch: Partial<PoLine>) => setPoLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  // Prefill the unit price with what this customer last paid; it stays editable.
  const applyLastPrice = async (i: number, customerName: string, productId: string) => {
    if (!customerName || !productId) return;
    try {
      const r = await salesApi.lastSalePrice(customerName, productId);
      if (r.data?.unitPrice) updatePoLine(i, { productId, unitPrice: r.data.unitPrice });
    } catch {
      /* no history: leave the price for the user to type */
    }
  };

  const onPickProduct = (i: number, productId: string) => {
    updatePoLine(i, { productId });
    if (poCustomer) void applyLastPrice(i, poCustomer.name, productId);
  };

  const onPickCustomer = (id: string) => {
    setPoCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) poLines.forEach((l, i) => l.productId && void applyLastPrice(i, c.name, l.productId));
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const r = await salesApi.uploadAttachment(file);
      setPoFileKey(r.data.key);
      setPoFileName(r.data.filename || file.name);
    } catch (err) {
      await alert({ title: "Gagal Mengunggah", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (source !== "po" && !sourceId) return;
    if (source === "po") {
      const lines = poLines.filter((l) => l.productId);
      if (!poCustomer || lines.length === 0 || lines.some((l) => !(l.quantity > 0) || l.unitPrice < 0)) {
        await alert({ title: "Data belum lengkap", message: "Pilih pelanggan dan isi minimal satu barang dengan jumlah dan harga.", variant: "warning" });
        return;
      }
      if (!poNumber.trim() && !poFileKey) {
        await alert({ title: "PO Masuk wajib", message: "Isi nomor PO Masuk dan/atau unggah dokumennya.", variant: "warning" });
        return;
      }
    }
    setSaving(true);
    try {
      await tradeInvoicesApi.create({
        kind: tab,
        ...(source === "po"
          ? {
              customerName: poCustomer?.name,
              billingAddress: poCustomer ? [poCustomer.address, poCustomer.city].filter(Boolean).join(", ") : undefined,
              shippingAddress: (poCustomer?.shippingAddresses?.find((a) => a.isDefault) || poCustomer?.shippingAddresses?.[0])?.address,
              customerPoNumber: poNumber.trim() || undefined,
              customerPoAttachment: poFileKey || undefined,
              dpPercent: Number(dpPercent) || 0,
              lines: poLines.filter((l) => l.productId).map((l) => {
                const p = products.find((x) => x.id === l.productId);
                return { productId: l.productId, description: p?.name ?? "", unit: p?.unit ?? "", quantity: l.quantity, unitPrice: l.unitPrice };
              }),
            }
          : {}),
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

  const makeOrder = async (pi: TradeInvoice, dpPaid: boolean) => {
    const ok = await confirm({
      title: dpPaid ? "Buat SO (DP diterima)" : "Buat SO (DP menyusul)",
      message: dpPaid
        ? `Buat Sales Order dari ${pi.number} dengan DP sudah diterima?`
        : `Buat Sales Order dari ${pi.number} sekarang, DP belum diterima. PR/PO dan produksi bisa mulai; centang DP di SO begitu transfer masuk.`,
      confirmText: "Buat SO",
    });
    if (!ok) return;
    try {
      const res = await tradeInvoicesApi.createOrder(pi.id, { dpPaid });
      await alert({ title: "SO dibuat", message: `Sales Order ${res.data.orderNumber} dibuat dari ${pi.number}.` });
      setView(null);
      load();
    } catch (err) {
      await alert({ title: "Gagal membuat SO", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
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

  if (!canUseTradeDocs) {
    return (
      <div className="space-y-6">
        <PageHeader title="Proforma / Commercial Invoice (PI/CI)" description="Menu ini khusus superadmin, admin, dan akuntan." />
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Anda tidak memiliki akses ke menu PI/CI. Hubungi superadmin (Ko Steven) atau admin.
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
      <PageHeader title="Proforma / Commercial Invoice (PI/CI)" description="Dokumen penagihan ekspor/komersial, dibuat dari Penawaran atau Pesanan Penjualan. Khusus superadmin, admin, dan akuntan.">
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                {tab === "PI" && <option value="po">PO Masuk dari pelanggan (alur utama)</option>}
                <option value="order">Pesanan Penjualan</option>
                <option value="quotation">Penawaran (Quotation)</option>
                {tab === "CI" && <option value="pi">Proforma Invoice (PI) yang sudah terbit</option>}
              </select>
            </div>
            {source !== "po" ? (
              <div className="space-y-1">
                <label className="font-semibold">Dokumen sumber *</label>
                <select className={selectClass} value={sourceId} onChange={(e) => setSourceId(e.target.value)} required>
                  <option value="">— Pilih —</option>
                  {sourceOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-[11px] text-muted-foreground">
                  Perusahaan pemesan membuat PO ke kita. Catat PO tersebut, tentukan harga (awalnya harga terakhir yang dibayar pelanggan, boleh diubah), lalu tagih DP.
                </p>
                <div className="space-y-1">
                  <label className="font-semibold">Pelanggan *</label>
                  <select className={selectClass} value={poCustomerId} onChange={(e) => onPickCustomer(e.target.value)} required>
                    <option value="">— Pilih pelanggan —</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold">Nomor PO Masuk</label>
                    <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO 018-0725" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">Dokumen PO Masuk</label>
                    <Input type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={uploading} onChange={(e) => onUpload(e.target.files?.[0])} />
                    {poFileName && <span className="text-[10px] text-emerald-700">Terunggah: {poFileName}</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-semibold">Barang &amp; harga *</label>
                  {poLines.map((l, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_6rem_8rem_auto] gap-2 items-center">
                      <select className={selectClass} value={l.productId} onChange={(e) => onPickProduct(i, e.target.value)}>
                        <option value="">— Produk —</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                      </select>
                      <Input type="number" min={0} step="0.01" aria-label="Jumlah" placeholder="Qty" value={l.quantity} onChange={(e) => updatePoLine(i, { quantity: Number(e.target.value) })} />
                      <Input type="number" min={0} aria-label="Harga satuan" placeholder="Harga" value={l.unitPrice} onChange={(e) => updatePoLine(i, { unitPrice: Number(e.target.value) })} />
                      <Button type="button" size="sm" variant="outline" disabled={poLines.length === 1} onClick={() => setPoLines((ls) => ls.filter((_, idx) => idx !== i))}>×</Button>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => setPoLines((ls) => [...ls, { productId: "", quantity: 1, unitPrice: 0 }])}>
                    <Plus className="h-3 w-3 mr-1" /> Tambah barang
                  </Button>
                </div>
                <div className="space-y-1 w-40">
                  <label className="font-semibold">DP yang ditagih (%)</label>
                  <Input type="number" min={0} max={100} value={dpPercent} onChange={(e) => setDpPercent(e.target.value)} />
                </div>
              </div>
            )}
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
              <Button type="submit" variant="gradient" size="sm" disabled={saving || uploading || (source !== "po" && !sourceId)}>Simpan Draft</Button>
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
                {(view.customerPoNumber || view.customerPoAttachment) && (
                  <div className="col-span-2"><span className="text-muted-foreground block">PO Masuk</span>{view.customerPoNumber || "(dokumen terunggah)"}</div>
                )}
                {view.kind === "PI" && !!view.dpPercent && (
                  <div className="col-span-2"><span className="text-muted-foreground block">DP ditagih</span>{view.dpPercent}% = {fmt(view.dpAmount ?? 0, view.currency)}</div>
                )}
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
                {view.kind === "PI" && view.status === "issued" && !view.salesOrderId && (
                  <>
                    <Button size="sm" variant="gradient" className="gap-1" onClick={() => makeOrder(view, true)}>Buat SO — DP diterima</Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => makeOrder(view, false)}>Buat SO — DP menyusul</Button>
                  </>
                )}
                {view.kind === "PI" && view.salesOrderId && <span className="text-[11px] text-emerald-700 self-center">SO sudah dibuat dari PI ini</span>}
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
