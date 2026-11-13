"use client";

import * as React from "react";
import { Plus, Download, Mail, Phone, Pencil, Power, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { suppliersApi, SupplierItem, VendorTypeOption } from "@/lib/api/suppliers";
import { pricingApi, PaymentTermItem } from "@/lib/api/pricing";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/utils/csv";
import { useConfirm, useAlert } from "@/components/shared/confirm-modal";
import { useRole } from "@/lib/hooks/use-role";

const DEFAULT_CITY = "Semarang";
const FALLBACK_TYPES: VendorTypeOption[] = [
  { code: "PRD", label: "Produk / Bahan Baku" },
  { code: "PCK", label: "Kemasan (Packaging)" },
  { code: "ATK", label: "Alat Tulis Kantor" },
];

function extractVendorTypeFromCode(code: string): string | null {
  const m = code.trim().toUpperCase().match(/^VD-([A-Z]{2,4})-/);
  return m ? m[1] : null;
}

interface FormState {
  code: string;
  vendorType: string;
  batchCode: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  paymentTerm: string;
  npwp: string;
  nik: string;
  status: "Active" | "Inactive";
}

const emptyForm = (vendorType: string): FormState => ({
  code: "",
  vendorType,
  batchCode: "",
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  category: "Raw Materials",
  address: "",
  city: DEFAULT_CITY,
  province: "",
  postalCode: "",
  paymentTerm: "",
  npwp: "",
  nik: "",
  status: "Active",
});

const fromItem = (s: SupplierItem): FormState => ({
  code: s.code,
  vendorType: s.vendorType || extractVendorTypeFromCode(s.code) || "",
  batchCode: s.batchCode || "",
  name: s.name,
  contactPerson: s.contactPerson || "",
  email: s.email || "",
  phone: s.phone || "",
  category: s.category || "",
  address: s.address || "",
  city: s.city || DEFAULT_CITY,
  province: s.province || "",
  postalCode: s.postalCode || "",
  paymentTerm: s.paymentTerm || "",
  npwp: s.npwp || "",
  nik: s.nik || "",
  status: s.status?.toLowerCase() === "inactive" ? "Inactive" : "Active",
});

const selectClass =
  "flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary shadow-xs";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="font-semibold text-foreground flex items-center justify-between">
        <span>{label}</span>
        {hint && <span className="text-[10px] text-brand-primary font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export default function SuppliersPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const { canManageMasterData } = useRole();

  const [suppliers, setSuppliers] = React.useState<SupplierItem[]>([]);
  const [vendorTypes, setVendorTypes] = React.useState<VendorTypeOption[]>(FALLBACK_TYPES);
  const [paymentTerms, setPaymentTerms] = React.useState<PaymentTermItem[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm("PRD"));
  const [showAddressDetails, setShowAddressDetails] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const fetchSuppliers = React.useCallback(() => {
    suppliersApi
      .list({ perPage: 200 })
      .then((res) => setSuppliers(res.data || []))
      .catch((err) => {
        console.error("Failed to load supplier", err);
        setLoadError("Gagal memuat data vendor dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    fetchSuppliers();
    suppliersApi.types().then((r) => r.data?.length && setVendorTypes(r.data)).catch(() => undefined);
    pricingApi.listPaymentTerms().then((r) => setPaymentTerms(r.data || [])).catch(() => undefined);
  }, [fetchSuppliers]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(vendorTypes[0]?.code ?? "PRD"));
    setShowAddressDetails(false);
    setDialogOpen(true);
  };

  const openEdit = (s: SupplierItem) => {
    setEditingId(s.id);
    setForm(fromItem(s));
    setShowAddressDetails(Boolean(s.address || s.province || s.postalCode));
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      vendorType: form.vendorType || undefined,
      batchCode: form.batchCode.trim().toUpperCase(),
      name: form.name,
      contactPerson: form.contactPerson,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city.trim() || DEFAULT_CITY,
      province: form.province,
      postalCode: form.postalCode,
      paymentTerm: form.paymentTerm,
      npwp: form.npwp,
      nik: form.nik,
      category: form.category,
    };
    try {
      if (editingId) {
        // The code is sent too: changing it (e.g. PCK-001 -> VD-PCK-001) is saved.
        const res = await suppliersApi.update(editingId, {
          ...payload,
          code: form.code,
          ...(canManageMasterData ? { status: form.status } : {}),
        });
        setSuppliers((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...res.data } : s)));
      } else {
        await suppliersApi.create({ ...payload, code: form.code.trim() || undefined });
        fetchSuppliers();
      }
      setDialogOpen(false);
      setEditingId(null);
    } catch (err) {
      await alert({
        title: editingId ? "Gagal Memperbarui Vendor" : "Gagal Menambahkan Vendor",
        message: err instanceof Error ? err.message : "Kesalahan server",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (s: SupplierItem) => {
    const activating = s.status?.toLowerCase() !== "active";
    const ok = await confirm({
      title: activating ? "Aktifkan Vendor" : "Nonaktifkan Vendor",
      message: activating
        ? `Aktifkan kembali ${s.name}?`
        : `Nonaktifkan ${s.name}? Vendor tidak bisa dipilih untuk PR/PO baru, riwayat transaksi tetap tersimpan.`,
      confirmText: activating ? "Aktifkan" : "Nonaktifkan",
    });
    if (!ok) return;
    try {
      const res = await suppliersApi.setStatus(s.id, activating ? "Active" : "Inactive");
      setSuppliers((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...res.data } : x)));
    } catch (err) {
      await alert({ title: "Gagal Mengubah Status", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    }
  };

  const handleExport = () => {
    downloadCsv(
      "vendor.csv",
      ["Kode", "Nama", "Tipe", "Kategori", "Contact Person", "Email", "Telepon", "Kota", "Payment Term", "Status"],
      suppliers.map((s) => [s.code, s.name, s.vendorType ?? "", s.category, s.contactPerson, s.email, s.phone, s.city ?? "", s.paymentTerm ?? "", s.status])
    );
  };

  const columns: Column<SupplierItem>[] = [
    {
      key: "code",
      header: "Kode Vendor",
      sortable: true,
      render: (s) => (
        <div>
          <span className="font-mono text-xs font-bold text-brand-primary">{s.code}</span>
          {s.batchCode && (
            <span className="block mt-0.5 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-fit">
              Trace: {s.batchCode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "name",
      header: "Nama Vendor",
      sortable: true,
      render: (s) => (
        <div>
          <p className="font-semibold text-xs text-foreground">{s.name}</p>
          <span className="text-[11px] text-muted-foreground">{s.category}</span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Kontak",
      render: (s) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {s.email || "-"}</div>
          <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {s.phone || "-"}</div>
        </div>
      ),
    },
    {
      key: "paymentTerm",
      header: "Payment Term",
      render: (s) => <span className="text-xs font-medium text-foreground">{s.paymentTerm || "-"}</span>,
    },
    {
      key: "city",
      header: "Kota",
      render: (s) => <span className="text-xs text-muted-foreground">{s.city || DEFAULT_CITY}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge status={s.status?.toLowerCase() === "active" ? "active" : "inactive"} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (s) => {
        const active = s.status?.toLowerCase() === "active";
        return (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => openEdit(s)} className="h-7 px-2 text-[11px] gap-1">
              <Pencil className="h-3 w-3" /> <span>Edit</span>
            </Button>
            {canManageMasterData && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleStatus(s)}
                className={
                  active
                    ? "h-7 px-2 text-[11px] gap-1 border-amber-200 text-amber-800 hover:bg-amber-50"
                    : "h-7 px-2 text-[11px] gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                }
              >
                <Power className="h-3 w-3" /> <span>{active ? "Nonaktifkan" : "Aktifkan"}</span>
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const codePreview = `VD-${form.vendorType || "XXX"}-###`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Vendor"
        description="Kelola vendor/pemasok, payment term, dan status aktif. Kode vendor: VD-PRD / VD-PCK / VD-ATK."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Ekspor
        </Button>
        <Button onClick={openCreate} variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> Tambah Vendor
        </Button>
      </PageHeader>

      {loadError && (
        <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <DataTable
          columns={columns}
          data={suppliers}
          isLoading={isLoading}
          searchKey="name"
          searchPlaceholder="Cari vendor berdasarkan nama atau kategori..."
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Vendor" : "Tambah Vendor Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipe Vendor *" hint="menentukan kode">
                <select
                  className={selectClass}
                  value={form.vendorType}
                  onChange={(e) => set({ vendorType: e.target.value })}
                  required={!editingId}
                >
                  {editingId && <option value="">-</option>}
                  {vendorTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} — {t.label}
                    </option>
                  ))}
                  {form.vendorType && !vendorTypes.some((t) => t.code === form.vendorType) && (
                    <option value={form.vendorType}>{form.vendorType} — Kustom</option>
                  )}
                </select>
              </Field>
              <Field label="Kode Vendor" hint={editingId ? "format VD-XXX-NNN" : "kosongkan = otomatis"}>
                <Input
                  value={form.code}
                  onChange={(e) => {
                    const nextCode = e.target.value.toUpperCase();
                    const derivedType = extractVendorTypeFromCode(nextCode);
                    set({
                      code: nextCode,
                      ...(derivedType ? { vendorType: derivedType } : {}),
                    });
                  }}
                  placeholder={codePreview}
                  className="font-mono"
                  required={!!editingId}
                />
              </Field>
            </div>
            <Field label="Kode Traceability Supplier" hint="2 huruf (cth: PW)">
              <Input
                value={form.batchCode}
                onChange={(e) => set({ batchCode: e.target.value.toUpperCase() })}
                maxLength={4}
                placeholder="e.g. PW"
                className="font-mono uppercase font-bold"
              />
            </Field>
            <Field label="Nama Vendor / Perusahaan *">
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} required />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Contact Person">
                <Input value={form.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} />
              </Field>
              <Field label="Kategori">
                <Input value={form.category} onChange={(e) => set({ category: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </Field>
              <Field label="Telepon">
                <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </Field>
            </div>
            <Field label="Payment Term">
              <select className={selectClass} value={form.paymentTerm} onChange={(e) => set({ paymentTerm: e.target.value })}>
                <option value="">— Pilih payment term —</option>
                {paymentTerms.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.days} hari)
                  </option>
                ))}
                {form.paymentTerm && !paymentTerms.some((p) => p.name === form.paymentTerm) && (
                  <option value={form.paymentTerm}>{form.paymentTerm}</option>
                )}
              </select>
              {paymentTerms.length === 0 && (
                <p className="text-[10px] text-muted-foreground">Belum ada Payment Term. Tambahkan di Master Data › Term of Payment (TOP).</p>
              )}
            </Field>
            <Field label="Kota" hint="default Semarang">
              <Input value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder={DEFAULT_CITY} />
            </Field>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 space-y-2.5">
              <button
                type="button"
                onClick={() => setShowAddressDetails((v) => !v)}
                className="flex w-full items-center justify-between text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                <span>Tambah Alamat, Provinsi &amp; Kode Pos (Opsional)</span>
                {showAddressDetails ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {showAddressDetails && (
                <div className="space-y-3 pt-1">
                  <Field label="Alamat (Opsional)">
                    <Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Alamat lengkap (opsional)" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Provinsi (Opsional)">
                      <Input value={form.province} onChange={(e) => set({ province: e.target.value })} placeholder="Jawa Tengah" />
                    </Field>
                    <Field label="Kode Pos (Opsional)">
                      <Input value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} inputMode="numeric" maxLength={10} />
                    </Field>
                  </div>
                </div>
              )}
            </div>
            {editingId && canManageMasterData && (
              <Field label="Status Vendor" hint="khusus Manager / Admin">
                <select
                  className={selectClass}
                  value={form.status}
                  onChange={(e) => set({ status: e.target.value === "Inactive" ? "Inactive" : "Active" })}
                >
                  <option value="Active">Active (Aktif)</option>
                  <option value="Inactive">Inactive (Nonaktif)</option>
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="NPWP">
                <Input value={form.npwp} onChange={(e) => set({ npwp: e.target.value })} placeholder="15 atau 16 digit" inputMode="numeric" />
              </Field>
              <Field label="NIK">
                <Input value={form.nik} onChange={(e) => set({ nik: e.target.value })} placeholder="16 digit (jika tanpa NPWP)" inputMode="numeric" />
              </Field>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="font-semibold" disabled={saving}>
                {editingId ? "Simpan Perubahan" : "Simpan Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
