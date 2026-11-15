"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, Power, Download, ArrowLeft, Building2, Tag, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useConfirm, useAlert } from "@/components/shared/confirm-modal";
import {
  suppliersApi,
  supplierCodesApi,
  SupplierItem,
  SupplierCodeItem,
  VendorTypeOption,
} from "@/lib/api/suppliers";
import { downloadCsv } from "@/lib/utils/csv";

const FALLBACK_TYPES: VendorTypeOption[] = [
  { code: "PRD", label: "Produk / Bahan Baku" },
  { code: "PCK", label: "Kemasan (Packaging)" },
  { code: "ATK", label: "Alat Tulis Kantor" },
];

export default function SupplierCodesPage() {
  const confirm = useConfirm();
  const alert = useAlert();

  const [codes, setCodes] = React.useState<SupplierCodeItem[]>([]);
  const [suppliers, setSuppliers] = React.useState<SupplierItem[]>([]);
  const [vendorTypes, setVendorTypes] = React.useState<VendorTypeOption[]>(FALLBACK_TYPES);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [supplierFilter, setSupplierFilter] = React.useState<string>("all");

  // Create / Edit Dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<SupplierCodeItem | null>(null);
  const [formSupplierId, setFormSupplierId] = React.useState("");
  const [formVendorType, setFormVendorType] = React.useState("PRD");
  const [formCode, setFormCode] = React.useState("");
  const [formBatchCode, setFormBatchCode] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [codesRes, suppliersRes, typesRes] = await Promise.all([
        supplierCodesApi.list(),
        suppliersApi.list({ perPage: 500 }),
        suppliersApi.types().catch(() => ({ data: [] })),
      ]);
      setCodes(codesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      if (typesRes.data && typesRes.data.length > 0) {
        setVendorTypes(typesRes.data);
      }
    } catch (err) {
      console.error("Failed to load supplier codes", err);
      setLoadError("Gagal memuat master data kode vendor dari server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered rows
  const displayedCodes = React.useMemo(() => {
    return codes.filter((c) => {
      const matchType = typeFilter === "all" || (c.vendorType || "").toUpperCase() === typeFilter.toUpperCase();
      const matchSupplier = supplierFilter === "all" || c.supplierId === supplierFilter;
      return matchType && matchSupplier;
    });
  }, [codes, typeFilter, supplierFilter]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormSupplierId(suppliers[0]?.id || "");
    setFormVendorType(vendorTypes[0]?.code || "PRD");
    setFormCode("");
    setFormBatchCode("");
    setFormDescription("");
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (item: SupplierCodeItem) => {
    setEditingItem(item);
    setFormSupplierId(item.supplierId);
    setFormVendorType(item.vendorType || "PRD");
    setFormCode(item.code);
    setFormBatchCode(item.batchCode || "");
    setFormDescription(item.description || "");
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplierId) {
      setFormError("Pilih perusahaan vendor terlebih dahulu.");
      return;
    }
    if (!formVendorType) {
      setFormError("Pilih tipe vendor.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingItem) {
        await supplierCodesApi.update(editingItem.id, {
          code: formCode.trim() || undefined,
          vendorType: formVendorType,
          batchCode: formBatchCode.trim() || undefined,
          description: formDescription.trim() || undefined,
        });
      } else {
        await supplierCodesApi.create({
          supplierId: formSupplierId,
          code: formCode.trim() || undefined,
          vendorType: formVendorType,
          batchCode: formBatchCode.trim() || undefined,
          description: formDescription.trim() || undefined,
        });
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan kode vendor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (item: SupplierCodeItem) => {
    const isCurrentlyActive = item.status?.toLowerCase() === "active";
    const ok = await confirm({
      title: isCurrentlyActive ? "Nonaktifkan Kode Vendor" : "Aktifkan Kode Vendor",
      message: isCurrentlyActive
        ? `Nonaktifkan kode vendor "${item.code}"? Kode ini tidak akan muncul pada pilihan transaksi baru.`
        : `Aktifkan kembali kode vendor "${item.code}"?`,
      confirmText: isCurrentlyActive ? "Nonaktifkan" : "Aktifkan",
      variant: isCurrentlyActive ? "destructive" : "default",
    });
    if (!ok) return;

    try {
      await supplierCodesApi.setStatus(item.id, isCurrentlyActive ? "Inactive" : "Active");
      loadData();
    } catch (err) {
      await alert({
        title: "Gagal Mengubah Status",
        message: err instanceof Error ? err.message : "Kesalahan server",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: SupplierCodeItem) => {
    const ok = await confirm({
      title: "Hapus Kode Vendor",
      message: `Hapus kode vendor "${item.code}" (${item.supplierName || "Vendor"})?`,
      description: "Kode vendor yang dihapus tidak dapat dipulihkan.",
      confirmText: "Hapus",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      await supplierCodesApi.delete(item.id);
      loadData();
    } catch (err) {
      await alert({
        title: "Gagal Menghapus Kode Vendor",
        message: err instanceof Error ? err.message : "Kesalahan server",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    downloadCsv(
      "master-kode-vendor.csv",
      ["Kode Vendor", "Tipe", "Traceability (Batch Code)", "Perusahaan Vendor", "Keterangan", "Status"],
      codes.map((c) => [
        c.code,
        c.vendorType,
        c.batchCode || "-",
        c.supplierName || "-",
        c.description || "-",
        c.status,
      ])
    );
  };

  const columns: Column<SupplierCodeItem>[] = [
    {
      key: "code",
      header: "Kode Vendor",
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded border border-brand-primary/20">
          {item.code}
        </span>
      ),
    },
    {
      key: "vendorType",
      header: "Tipe Vendor",
      sortable: true,
      render: (item) => {
        const typeInfo = vendorTypes.find((t) => t.code === item.vendorType);
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            {item.vendorType} {typeInfo ? `— ${typeInfo.label}` : ""}
          </span>
        );
      },
    },
    {
      key: "batchCode",
      header: "Traceability",
      render: (item) =>
        item.batchCode ? (
          <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {item.batchCode}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "supplierName",
      header: "Perusahaan Vendor",
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-semibold text-xs text-foreground">{item.supplierName || "—"}</p>
          <span className="text-[10px] text-muted-foreground">ID: {item.supplierId}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Peruntukan / Keterangan",
      render: (item) => (
        <span className="text-xs text-muted-foreground">{item.description || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge
          status={item.status?.toLowerCase() === "active" ? "active" : "inactive"}
          label={item.status?.toLowerCase() === "active" ? "Aktif" : "Non-Aktif"}
        />
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      align: "right",
      render: (item) => {
        const active = item.status?.toLowerCase() === "active";
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditDialog(item)}
              className="h-7 px-2 text-[11px] gap-1"
            >
              <Pencil className="h-3 w-3" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleStatus(item)}
              className={`h-7 px-2 text-[11px] gap-1 ${
                active
                  ? "border-amber-200 text-amber-800 hover:bg-amber-50"
                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <Power className="h-3 w-3" /> {active ? "Nonaktifkan" : "Aktifkan"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(item)}
              className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/master-data/suppliers">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Profil Vendor
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Master Kode Vendor"
        description="Kelola seluruh kode vendor (VD-PRD, VD-PCK, VD-ATK) dan kode traceability yang terhubung dengan perusahaan vendor. Satu vendor dapat memiliki beberapa kode."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Ekspor Excel
        </Button>
        <Button onClick={openCreateDialog} variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> Tambah Kode Vendor
        </Button>
      </PageHeader>

      {/* Navigation Tabs (Profil Vendor vs Kode Vendor) */}
      <div className="flex items-center gap-1 border-b border-border pb-2">
        <Link
          href="/master-data/suppliers"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-all flex items-center gap-1.5"
        >
          <Building2 className="h-3.5 w-3.5" /> Profil Perusahaan Vendor
        </Link>
        <span className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" /> Kelola Kode Vendor ({codes.length})
        </span>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-border text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-700">Filter Tipe:</span>
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              typeFilter === "all"
                ? "bg-white text-brand-primary shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({codes.length})
          </button>
          {vendorTypes.map((t) => {
            const count = codes.filter((c) => (c.vendorType || "").toUpperCase() === t.code.toUpperCase()).length;
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => setTypeFilter(t.code)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  typeFilter === t.code
                    ? "bg-white text-brand-primary shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.code} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Perusahaan:</span>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="h-8 px-2 rounded-md border border-border bg-white text-xs font-medium"
          >
            <option value="all">Semua Perusahaan Vendor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      <DataTable
        columns={columns}
        data={displayedCodes}
        isLoading={isLoading}
        searchKey="code"
        searchKeys={["code", "vendorType", "batchCode", "supplierName", "description"]}
        searchPlaceholder="Cari berdasarkan kode vendor, traceability, atau nama perusahaan..."
      />

      {/* Modal Dialog: Tambah / Edit Kode Vendor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Kode Vendor" : "Tambah Kode Vendor Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 text-xs pt-1">
            {formError && (
              <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Perusahaan Vendor *</label>
              <select
                value={formSupplierId}
                onChange={(e) => setFormSupplierId(e.target.value)}
                disabled={!!editingItem}
                required
                className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-xs disabled:bg-slate-100"
              >
                <option value="">— Pilih Perusahaan Vendor —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category || "Vendor"})
                  </option>
                ))}
              </select>
              {formSupplierId && (
                <div className="rounded-md bg-slate-50 border border-border p-2 text-xs space-y-1 mt-1">
                  <span className="text-muted-foreground text-[10px] font-medium">
                    Kode vendor yang sudah dimiliki perusahaan ini:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {codes.filter((c) => c.supplierId === formSupplierId).length === 0 ? (
                      <span className="text-[10px] text-muted-foreground italic">Belum ada kode vendor</span>
                    ) : (
                      codes
                        .filter((c) => c.supplierId === formSupplierId)
                        .map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-brand-primary bg-white px-1.5 py-0.5 rounded border border-border"
                          >
                            {c.code}
                            {c.batchCode && (
                              <span className="text-[9px] text-emerald-800 bg-emerald-50 px-1 rounded border border-emerald-200">
                                {c.batchCode}
                              </span>
                            )}
                            <span className="text-[9px] text-muted-foreground font-normal">({c.vendorType})</span>
                          </span>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tipe Vendor *</label>
                <select
                  value={formVendorType}
                  onChange={(e) => setFormVendorType(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-xs"
                >
                  {vendorTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} — {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Kode Vendor</span>
                  <span className="text-[10px] text-brand-primary font-normal">kosongkan = otomatis</span>
                </label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder={`VD-${formVendorType || "PRD"}-###`}
                  maxLength={20}
                  className="h-9 font-mono uppercase font-bold text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>Kode Traceability Supplier</span>
                <span className="text-[10px] text-emerald-700 font-normal">2-4 huruf (cth: PW)</span>
              </label>
              <Input
                value={formBatchCode}
                onChange={(e) => setFormBatchCode(e.target.value.toUpperCase())}
                placeholder="e.g. PW"
                maxLength={4}
                className="h-9 font-mono uppercase font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Peruntukan / Keterangan</label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Contoh: Pasokan Bahan Baku Gula Kelapa Organik"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSaving}>
                {isSaving ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambah Kode"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}