"use client";

import * as React from "react";
import { Plus, Download, Mail, Phone, Pencil, Trash2, Power, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { customersApi, CustomerItem, CustomerAddress, CustomerType } from "@/lib/api/customers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/utils/csv";
import { useConfirm, useAlert } from "@/components/shared/confirm-modal";
import { useRole } from "@/lib/hooks/use-role";

const DEFAULT_CITY = "Semarang";

function extractCustomerTypeFromCode(code: string): CustomerType | null {
  const m = code.trim().toUpperCase().match(/^(B2B|B2C)-/);
  return m ? (m[1] as CustomerType) : null;
}

interface FormState {
  code: string;
  customerType: CustomerType;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  npwp: string;
  nik: string;
  contactPerson: string;
  contactPhone: string;
  contactMobile: string;
  contactWhatsapp: string;
  shippingAddresses: CustomerAddress[];
  status: "Active" | "Inactive";
}

const blankAddress = (): CustomerAddress => ({ label: "", address: "", city: DEFAULT_CITY, province: "", postalCode: "", isDefault: false });

const emptyForm = (): FormState => ({
  code: "",
  customerType: "B2B",
  name: "",
  email: "",
  phone: "",
  address: "",
  city: DEFAULT_CITY,
  province: "",
  postalCode: "",
  npwp: "",
  nik: "",
  contactPerson: "",
  contactPhone: "",
  contactMobile: "",
  contactWhatsapp: "",
  shippingAddresses: [],
  status: "Active",
});

const fromItem = (c: CustomerItem): FormState => ({
  code: c.code,
  customerType: c.customerType || extractCustomerTypeFromCode(c.code) || "B2B",
  name: c.name,
  email: c.email || "",
  phone: c.phone || "",
  address: c.address || "",
  city: c.city || DEFAULT_CITY,
  province: c.province || "",
  postalCode: c.postalCode || "",
  npwp: c.npwp || "",
  nik: c.nik || "",
  contactPerson: c.contactPerson || "",
  contactPhone: c.contactPhone || "",
  contactMobile: c.contactMobile || "",
  contactWhatsapp: c.contactWhatsapp || "",
  shippingAddresses: c.shippingAddresses || [],
  status: c.status?.toLowerCase() === "inactive" ? "Inactive" : "Active",
});

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

export default function CustomersPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const { canManageMasterData, isSuperAdmin } = useRole();

  const [customers, setCustomers] = React.useState<CustomerItem[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [showAddressDetails, setShowAddressDetails] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const isB2B = form.customerType === "B2B";

  const fetchCustomers = React.useCallback(() => {
    customersApi
      .list({ perPage: 200 })
      .then((res) => setCustomers(res.data || []))
      .catch((err) => {
        console.error("Failed to load pelanggan", err);
        setLoadError("Gagal memuat data pelanggan dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowAddressDetails(false);
    setDialogOpen(true);
  };

  const openEdit = (c: CustomerItem) => {
    setEditingId(c.id);
    setForm(fromItem(c));
    setShowAddressDetails(Boolean(c.address || c.province || c.postalCode));
    setDialogOpen(true);
  };

  const setAddress = (i: number, patch: Partial<CustomerAddress>) =>
    setForm((f) => ({
      ...f,
      shippingAddresses: f.shippingAddresses.map((a, idx) => {
        if (idx === i) return { ...a, ...patch };
        return patch.isDefault ? { ...a, isDefault: false } : a;
      }),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isB2B && !form.contactPerson.trim()) {
      await alert({ title: "Data belum lengkap", message: "Pelanggan B2B wajib mengisi nama Contact Person.", variant: "destructive" });
      return;
    }
    if (isB2B && !(form.contactPhone.trim() || form.contactMobile.trim() || form.contactWhatsapp.trim())) {
      await alert({ title: "Data belum lengkap", message: "Isi minimal satu: No. Telp, No. HP, atau WhatsApp.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      customerType: form.customerType,
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city.trim() || DEFAULT_CITY,
      province: form.province,
      postalCode: form.postalCode,
      npwp: form.npwp,
      nik: form.nik,
      contactPerson: form.contactPerson,
      contactPhone: form.contactPhone,
      contactMobile: form.contactMobile,
      contactWhatsapp: form.contactWhatsapp,
      shippingAddresses: form.shippingAddresses.filter((a) => a.address.trim()),
    };
    try {
      if (editingId) {
        const res = await customersApi.update(editingId, {
          ...payload,
          code: form.code.trim() || undefined,
          ...(canManageMasterData ? { status: form.status } : {}),
        });
        setCustomers((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...res.data } : c)));
      } else {
        await customersApi.create({ ...payload, code: form.code.trim() || undefined });
        fetchCustomers();
      }
      setDialogOpen(false);
      setEditingId(null);
    } catch (err) {
      await alert({
        title: editingId ? "Gagal Memperbarui Pelanggan" : "Gagal Menambahkan Pelanggan",
        message: err instanceof Error ? err.message : "Kesalahan server",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (c: CustomerItem) => {
    const activating = c.status?.toLowerCase() !== "active";
    const ok = await confirm({
      title: activating ? "Aktifkan Pelanggan" : "Nonaktifkan Pelanggan",
      message: activating ? `Aktifkan kembali ${c.name}?` : `Nonaktifkan ${c.name}? Riwayat transaksi tetap tersimpan.`,
      confirmText: activating ? "Aktifkan" : "Nonaktifkan",
    });
    if (!ok) return;
    try {
      const res = await customersApi.setStatus(c.id, activating ? "Active" : "Inactive");
      setCustomers((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...res.data } : x)));
    } catch (err) {
      await alert({ title: "Gagal Mengubah Status", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    }
  };

  const handleDelete = async (c: CustomerItem) => {
    const ok = await confirm({
      title: "Hapus Pelanggan",
      message: `Hapus ${c.name} secara permanen? Gunakan Nonaktifkan bila pelanggan pernah bertransaksi.`,
      variant: "destructive",
      confirmText: "Hapus",
    });
    if (!ok) return;
    try {
      await customersApi.delete(c.id);
      setCustomers((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      await alert({ title: "Gagal Menghapus Pelanggan", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    }
  };

  const handleExport = () => {
    downloadCsv(
      "pelanggan.csv",
      ["Kode", "Tipe", "Nama", "Contact Person", "Email", "Telepon", "HP", "WhatsApp", "Kota", "Status"],
      customers.map((c) => [c.code, c.customerType, c.name, c.contactPerson ?? "", c.email, c.contactPhone ?? c.phone, c.contactMobile ?? "", c.contactWhatsapp ?? "", c.city ?? "", c.status])
    );
  };

  const columns: Column<CustomerItem>[] = [
    {
      key: "code",
      header: "Kode",
      sortable: true,
      render: (c) => <span className="font-mono text-xs font-bold text-brand-primary">{c.code}</span>,
    },
    {
      key: "name",
      header: "Nama Pelanggan",
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-semibold text-xs text-foreground">{c.name}</p>
          <span className="text-[11px] text-muted-foreground">
            {c.customerType === "B2C" ? "Perorangan (B2C)" : "Perusahaan (B2B)"}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Kontak",
      render: (c) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {c.contactPerson && <div className="font-medium text-foreground">{c.contactPerson}</div>}
          <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {c.email || "-"}</div>
          <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {c.contactMobile || c.contactPhone || c.phone || "-"}</div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Kota",
      render: (c) => <span className="text-xs text-muted-foreground">{c.city || DEFAULT_CITY}</span>,
    },
    {
      key: "shipping",
      header: "Alamat Kirim",
      render: (c) => <span className="text-xs text-muted-foreground">{c.shippingAddresses?.length ?? 0} alamat</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge status={c.status?.toLowerCase() === "active" ? "active" : "inactive"} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (c) => {
        const active = c.status?.toLowerCase() === "active";
        return (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="h-7 px-2 text-[11px] gap-1">
              <Pencil className="h-3 w-3" /> <span>Edit</span>
            </Button>
            {canManageMasterData && (
              <Button size="sm" variant="outline" onClick={() => handleToggleStatus(c)} className="h-7 px-2 text-[11px] gap-1">
                <Power className="h-3 w-3" /> <span>{active ? "Nonaktifkan" : "Aktifkan"}</span>
              </Button>
            )}
            {isSuperAdmin && (
              <Button size="sm" variant="outline" onClick={() => handleDelete(c)} className="h-7 px-2 text-[11px] gap-1 border-rose-200 text-rose-700 hover:bg-rose-50">
                <Trash2 className="h-3 w-3" /> <span>Hapus</span>
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Master Pelanggan" description="Kelola pelanggan B2B (perusahaan) dan B2C (perorangan), kontak, dan alamat pengiriman.">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Ekspor
        </Button>
        <Button onClick={openCreate} variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> Tambah Pelanggan
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
        <DataTable columns={columns} data={customers} isLoading={isLoading} searchKey="name" searchPlaceholder="Cari pelanggan berdasarkan nama atau kode..." />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipe Pelanggan *" hint="B2B-0001 / B2C-0001">
                <div className="flex gap-2">
                  {(["B2B", "B2C"] as CustomerType[]).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={form.customerType === t ? "gradient" : "outline"}
                      onClick={() => set({ customerType: t })}
                      className="flex-1"
                    >
                      {t === "B2B" ? "B2B · Perusahaan" : "B2C · Perorangan"}
                    </Button>
                  ))}
                </div>
              </Field>
              <Field label="Kode" hint={editingId ? "format B2B/B2C-NNNN" : "kosongkan = otomatis"}>
                <Input
                  value={form.code}
                  onChange={(e) => {
                    const nextCode = e.target.value.toUpperCase();
                    const derived = extractCustomerTypeFromCode(nextCode);
                    set({
                      code: nextCode,
                      ...(derived ? { customerType: derived } : {}),
                    });
                  }}
                  placeholder={`${form.customerType}-####`}
                  className="font-mono"
                  required={!!editingId}
                />
              </Field>
            </div>
            <Field label={isB2B ? "Nama Perusahaan *" : "Nama Lengkap *"}>
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} required />
            </Field>

            {isB2B && (
              <fieldset className="rounded-lg border border-border p-3 space-y-3">
                <legend className="px-1 font-semibold text-foreground">Contact Person (wajib B2B)</legend>
                <Field label="Nama CP *">
                  <Input value={form.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="No. Telp">
                    <Input value={form.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} inputMode="tel" />
                  </Field>
                  <Field label="No. HP">
                    <Input value={form.contactMobile} onChange={(e) => set({ contactMobile: e.target.value })} inputMode="tel" />
                  </Field>
                  <Field label="WhatsApp">
                    <Input value={form.contactWhatsapp} onChange={(e) => set({ contactWhatsapp: e.target.value })} inputMode="tel" />
                  </Field>
                </div>
                <p className="text-[10px] text-muted-foreground">Isi minimal satu nomor.</p>
              </fieldset>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </Field>
              {!isB2B && (
                <Field label="Telepon / HP">
                  <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" />
                </Field>
              )}
            </div>

            <Field label="Kota" hint="default Semarang">
              <Input value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder={DEFAULT_CITY} />
            </Field>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 space-y-2.5">
              <button
                type="button"
                onClick={() => setShowAddressDetails((v) => !v)}
                className="flex w-full items-center justify-between text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                <span>Tambah Alamat {isB2B ? "Kantor" : ""}, Provinsi &amp; Kode Pos (Opsional)</span>
                {showAddressDetails ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {showAddressDetails && (
                <div className="space-y-3 pt-1">
                  <Field label={isB2B ? "Alamat Kantor (Opsional)" : "Alamat (Opsional)"}>
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

            <fieldset className="rounded-lg border border-border p-3 space-y-3">
              <legend className="px-1 font-semibold text-foreground">Alamat Kirim (gudang / produksi)</legend>
              <p className="text-[10px] text-muted-foreground">
                Bila berbeda dari alamat kantor. Alamat ini muncul sebagai pilihan saat membuat Sales Order.
              </p>
              {form.shippingAddresses.map((a, i) => (
                <div key={i} className="rounded-md bg-muted/40 p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Label (cth: Gudang Cikarang)" value={a.label} onChange={(e) => setAddress(i, { label: e.target.value })} />
                    <label className="flex items-center gap-1 whitespace-nowrap">
                      <input type="checkbox" checked={a.isDefault} onChange={(e) => setAddress(i, { isDefault: e.target.checked })} /> Utama
                    </label>
                    <Button type="button" size="sm" variant="outline" aria-label="Hapus alamat" onClick={() => set({ shippingAddresses: form.shippingAddresses.filter((_, idx) => idx !== i) })}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input placeholder="Alamat lengkap" value={a.address} onChange={(e) => setAddress(i, { address: e.target.value })} />
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="Kota" value={a.city ?? ""} onChange={(e) => setAddress(i, { city: e.target.value })} />
                    <Input placeholder="Provinsi (opsional)" value={a.province ?? ""} onChange={(e) => setAddress(i, { province: e.target.value })} />
                    <Input placeholder="Kode Pos" value={a.postalCode ?? ""} inputMode="numeric" maxLength={10} onChange={(e) => setAddress(i, { postalCode: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Penerima" value={a.recipientName ?? ""} onChange={(e) => setAddress(i, { recipientName: e.target.value })} />
                    <Input placeholder="Telepon penerima" value={a.phone ?? ""} onChange={(e) => setAddress(i, { phone: e.target.value })} />
                  </div>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => set({ shippingAddresses: [...form.shippingAddresses, blankAddress()] })} className="gap-1">
                <Plus className="h-3 w-3" /> Tambah Alamat Kirim
              </Button>
            </fieldset>

            {editingId && canManageMasterData && (
              <Field label="Status Pelanggan" hint="khusus Manager / Admin">
                <select
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary shadow-xs"
                  value={form.status}
                  onChange={(e) => set({ status: e.target.value === "Inactive" ? "Inactive" : "Active" })}
                >
                  <option value="Active">Active (Aktif)</option>
                  <option value="Inactive">Inactive (Nonaktif)</option>
                </select>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="NPWP"><Input value={form.npwp} onChange={(e) => set({ npwp: e.target.value })} inputMode="numeric" placeholder="15 atau 16 digit" /></Field>
              <Field label="NIK"><Input value={form.nik} onChange={(e) => set({ nik: e.target.value })} inputMode="numeric" placeholder="16 digit" /></Field>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" variant="gradient" size="sm" className="font-semibold" disabled={saving}>
                {editingId ? "Simpan Perubahan" : "Simpan Pelanggan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
