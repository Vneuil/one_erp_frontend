"use client";

import * as React from "react";
import { Plus, Pencil, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAlert, useConfirm, usePrompt } from "@/components/shared/confirm-modal";
import { useRole } from "@/lib/hooks/use-role";
import { certificationsApi, CertificateItem, CertificateInput, CertEffectiveStatus } from "@/lib/api/certifications";
import { suppliersApi, SupplierItem } from "@/lib/api/suppliers";
import { productsApi, ProductItem } from "@/lib/api/products";

const STATUS_LABEL: Record<CertEffectiveStatus, string> = {
  active: "Aktif",
  suspended: "Suspend",
  revoked: "Dicabut",
  expired: "Kedaluwarsa",
  not_yet_valid: "Belum berlaku",
};
const STATUS_VARIANT: Record<CertEffectiveStatus, "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  suspended: "warning",
  revoked: "destructive",
  expired: "destructive",
  not_yet_valid: "secondary",
};

const selectClass = "flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-xs";
const empty: CertificateInput = { scheme: "", number: "", issuer: "", supplierId: "", productId: "", validFrom: "", validUntil: "", attachment: "", notes: "" };

export default function CertificationsPage() {
  const alert = useAlert();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const { canManageMasterData } = useRole();

  const [items, setItems] = React.useState<CertificateItem[]>([]);
  const [suppliers, setSuppliers] = React.useState<SupplierItem[]>([]);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [schemes, setSchemes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CertificateInput>(empty);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    certificationsApi
      .list()
      .then((r) => { setItems(r.data || []); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat sertifikat"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
    certificationsApi.schemes().then((r) => setSchemes(r.data || [])).catch(() => undefined);
    suppliersApi.list({ perPage: 200 }).then((r) => setSuppliers(r.data || [])).catch(() => undefined);
    productsApi.list({ perPage: 500 }).then((r) => setProducts(r.data || [])).catch(() => undefined);
  }, [load]);

  const supplierName = (id?: string) => suppliers.find((s) => s.id === id)?.name;
  const productName = (id?: string) => products.find((p) => p.id === id)?.name;

  const openCreate = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (c: CertificateItem) => {
    setEditingId(c.id);
    setForm({ scheme: c.scheme, number: c.number, issuer: c.issuer ?? "", supplierId: c.supplierId ?? "", productId: c.productId ?? "", validFrom: c.validFrom ?? "", validUntil: c.validUntil, attachment: c.attachment ?? "", notes: c.notes ?? "" });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: CertificateInput = { ...form, supplierId: form.supplierId || undefined, productId: form.productId || undefined };
    try {
      if (editingId) await certificationsApi.update(editingId, payload);
      else await certificationsApi.create(payload);
      setOpen(false);
      load();
    } catch (err) {
      await alert({ title: "Gagal Menyimpan Sertifikat", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); load(); } catch (err) {
      await alert({ title: "Gagal", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    }
  };

  const suspend = async (c: CertificateItem) => {
    const reason = await prompt({ title: "Suspend Sertifikat", message: `Alasan menangguhkan ${c.scheme} ${c.number}:`, confirmText: "Suspend", variant: "destructive", inputType: "textarea" });
    if (reason?.trim()) await run(() => certificationsApi.suspend(c.id, reason.trim()));
  };
  const revoke = async (c: CertificateItem) => {
    const reason = await prompt({ title: "Cabut Sertifikat", message: `Alasan mencabut ${c.scheme} ${c.number} (tidak dapat dibatalkan):`, confirmText: "Cabut", variant: "destructive", inputType: "textarea" });
    if (reason?.trim()) await run(() => certificationsApi.revoke(c.id, reason.trim()));
  };
  const resume = async (c: CertificateItem) => {
    if (await confirm({ title: "Aktifkan Kembali", message: `Aktifkan kembali ${c.scheme} ${c.number}?`, confirmText: "Aktifkan" })) await run(() => certificationsApi.resume(c.id));
  };

  const columns: Column<CertificateItem>[] = [
    { key: "scheme", header: "Sertifikasi", sortable: true, render: (c) => (<div><p className="text-xs font-semibold">{c.scheme}</p><span className="font-mono text-[11px] text-muted-foreground">{c.number}</span></div>) },
    { key: "holder", header: "Pemegang", render: (c) => (<div className="text-xs">{supplierName(c.supplierId) && <p>Vendor: {supplierName(c.supplierId)}</p>}{productName(c.productId) && <p>Produk: {productName(c.productId)}</p>}</div>) },
    { key: "validUntil", header: "Berlaku s/d", sortable: true, render: (c) => (<div className="text-xs"><p>{c.validUntil}</p>{c.effectiveStatus === "active" && c.daysLeft !== undefined && c.daysLeft <= 60 && <span className="text-amber-700">{c.daysLeft} hari lagi</span>}</div>) },
    { key: "status", header: "Status", render: (c) => (<div><Badge variant={STATUS_VARIANT[c.effectiveStatus]}>{STATUS_LABEL[c.effectiveStatus]}</Badge>{c.suspendReason && <p className="mt-0.5 max-w-[16rem] text-[10px] text-muted-foreground">{c.suspendReason}</p>}</div>) },
    {
      key: "id", header: "Aksi", render: (c) => (
        <div className="flex flex-wrap gap-1.5">
          {c.status !== "revoked" && <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /> Edit</Button>}
          {canManageMasterData && c.status === "active" && <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => suspend(c)}><PauseCircle className="h-3 w-3" /> Suspend</Button>}
          {canManageMasterData && c.status === "suspended" && <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => resume(c)}><PlayCircle className="h-3 w-3" /> Aktifkan</Button>}
          {canManageMasterData && c.status !== "revoked" && <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1 border-rose-200 text-rose-700" onClick={() => revoke(c)}><XCircle className="h-3 w-3" /> Cabut</Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Sertifikasi" description="Multi-sertifikasi per vendor dan produk. Sertifikat otomatis nonaktif setelah tanggal berlaku habis; status Suspend menahan vendor dari pilihan PO.">
        <Button onClick={openCreate} variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Tambah Sertifikat</Button>
      </PageHeader>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      <DataTable columns={columns} data={items} isLoading={loading} searchKey="scheme" searchPlaceholder="Cari skema sertifikasi..." />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Sertifikat" : "Tambah Sertifikat"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1"><span className="font-semibold">Skema *</span>
                <Input list="cert-schemes" value={form.scheme} onChange={(e) => setForm({ ...form, scheme: e.target.value })} required placeholder="USDA Organic" />
                <datalist id="cert-schemes">{schemes.map((s) => <option key={s} value={s} />)}</datalist>
              </label>
              <label className="space-y-1"><span className="font-semibold">Nomor Sertifikat *</span><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required /></label>
            </div>
            <label className="space-y-1 block"><span className="font-semibold">Lembaga Penerbit</span><Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1"><span className="font-semibold">Vendor</span>
                <select className={selectClass} value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">— Tidak ada —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </select>
              </label>
              <label className="space-y-1"><span className="font-semibold">Produk</span>
                <select className={selectClass} value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                  <option value="">— Tidak ada —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </select>
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground">Isi vendor dan/atau produk (minimal salah satu).</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1"><span className="font-semibold">Berlaku Dari</span><Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></label>
              <label className="space-y-1"><span className="font-semibold">Berlaku Sampai *</span><Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} required /></label>
            </div>
            <label className="space-y-1 block"><span className="font-semibold">Dokumen (tautan)</span><Input value={form.attachment} onChange={(e) => setForm({ ...form, attachment: e.target.value })} placeholder="https://..." /></label>
            <label className="space-y-1 block"><span className="font-semibold">Catatan</span><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" variant="gradient" size="sm" disabled={saving}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
