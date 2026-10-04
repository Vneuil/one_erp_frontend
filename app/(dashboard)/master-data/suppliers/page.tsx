"use client";

import * as React from "react";
import { Plus, Download, Mail, Phone, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";

interface Supplier {
  id: string;
  code: string;
  name: string;
  category: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  npwp: string;
  nik: string;
  paymentTerms: string;
  status: string;
}

import { suppliersApi, SupplierItem } from "@/lib/api/suppliers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/utils/csv";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    code: "",
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    category: "Raw Materials",
    city: "Cikarang",
    npwp: "",
    nik: "",
  });

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState({
    code: "",
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    category: "",
    city: "",
    npwp: "",
    nik: "",
  });

  const fetchSuppliers = () => {
    suppliersApi
      .list()
      .then((res) => {
                  const mapped: Supplier[] = (res.data || []).map((s: SupplierItem) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            contactPerson: s.contactPerson || "-",
            email: s.email || "-",
            phone: s.phone || "-",
            category: s.category || "-",
            paymentTerms: "-",
            city: s.address || "-",
            npwp: s.npwp || "",
            nik: s.nik || "",
            status: s.status?.toLowerCase() === "active" ? "active" : "inactive",
          }));
          setSuppliers(mapped);
      })
      .catch((err) => {
        console.error("Failed to load supplier", err);
        setLoadError("Gagal memuat data supplier dari server.");
      })
      .finally(() => setIsLoading(false));
  };

  React.useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await suppliersApi.create({
        code: formData.code,
        name: formData.name,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        address: formData.city,
        npwp: formData.npwp,
        nik: formData.nik,
        category: formData.category,
      });
      setIsAddOpen(false);
      fetchSuppliers();
    } catch (err) {
      alert("Gagal menambahkan supplier: " + (err instanceof Error ? err.message : "Kesalahan server"));
    }
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingId(s.id);
    setEditFormData({
      code: s.code,
      name: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      category: s.category,
      city: s.city,
      npwp: s.npwp,
      nik: s.nik,
    });
    setIsEditOpen(true);
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      const res = await suppliersApi.update(editingId, {
        code: editFormData.code,
        name: editFormData.name,
        contactPerson: editFormData.contactPerson,
        email: editFormData.email,
        phone: editFormData.phone,
        address: editFormData.city,
        npwp: editFormData.npwp,
        nik: editFormData.nik,
        category: editFormData.category,
      });
      const updated = res.data;
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                code: updated?.code ?? editFormData.code,
                name: updated?.name ?? editFormData.name,
                contactPerson: updated?.contactPerson ?? editFormData.contactPerson,
                email: updated?.email ?? editFormData.email,
                phone: updated?.phone ?? editFormData.phone,
                category: updated?.category ?? editFormData.category,
                city: updated?.address ?? editFormData.city,
                npwp: updated?.npwp ?? editFormData.npwp,
                nik: updated?.nik ?? editFormData.nik,
              }
            : s
        )
      );
      setIsEditOpen(false);
      setEditingId(null);
    } catch (err) {
      alert("Gagal memperbarui supplier: " + (err instanceof Error ? err.message : "Kesalahan server"));
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus supplier ini?")) return;
    try {
      await suppliersApi.delete(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert("Gagal menghapus supplier: " + (err instanceof Error ? err.message : "Kesalahan server"));
    }
  };

  const handleExport = () => {
    downloadCsv(
      "suppliers.csv",
      ["Code", "Name", "Category", "Contact Person", "Email", "Phone", "City", "Payment Terms", "Status"],
      suppliers.map((s) => [s.code, s.name, s.category, s.contactPerson, s.email, s.phone, s.city, s.paymentTerms, s.status])
    );
  };

  const columns: Column<Supplier>[] = [
    {
      key: "code",
      header: "Vendor Code",
      sortable: true,
      render: (s) => <span className="font-mono text-xs font-bold text-brand-primary">{s.code}</span>,
    },
    {
      key: "name",
      header: "Vendor / Supplier Name",
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
      header: "Contact Details",
      render: (s) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {s.email}</div>
          <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {s.phone}</div>
        </div>
      ),
    },
    {
      key: "paymentTerms",
      header: "Payment Terms",
      render: (s) => <span className="text-xs font-medium text-foreground">{s.paymentTerms}</span>,
    },
    {
      key: "city",
      header: "City",
      render: (s) => <span className="text-xs text-muted-foreground">{s.city}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (s) => (
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEditSupplier(s)}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <Pencil className="h-3 w-3" />
            <span>Edit</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteSupplier(s.id)}
            className="h-7 px-2 text-[11px] gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="h-3 w-3" />
            <span>Hapus</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier & Vendor Directory"
        description="Manage approved suppliers, procurement contracts, and accounts payable terms."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <Button
          onClick={() => setIsAddOpen(true)}
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Add Vendor
        </Button>
      </PageHeader>

      {loadError && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}
        {notice && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {notice}
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
        searchPlaceholder="Search vendor by name or category..."
      />
        )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pemasok (Vendor) Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kode Vendor</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Kosongkan untuk dibuat otomatis"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Nama Vendor / Perusahaan *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. PT Indo Steel Perkasa"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Contact Person</label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Ir. Bambang"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Kategori</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Raw Materials"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="order@vendor.com"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Telepon</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+62 21 8899 0011"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kota / Lokasi</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cilegon"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">NPWP</label>
                <Input
                  value={formData.npwp}
                  onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                  placeholder="15 atau 16 digit"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">NIK</label>
                <Input
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  placeholder="16 digit (jika tanpa NPWP)"
                  inputMode="numeric"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="font-semibold">
                Simpan Vendor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pemasok (Vendor)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSupplier} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kode Vendor</label>
              <Input
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Nama Vendor / Perusahaan *</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Contact Person</label>
                <Input
                  value={editFormData.contactPerson}
                  onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Kategori</label>
                <Input
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Email</label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Telepon</label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kota / Lokasi</label>
              <Input
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">NPWP</label>
                <Input
                  value={editFormData.npwp}
                  onChange={(e) => setEditFormData({ ...editFormData, npwp: e.target.value })}
                  placeholder="15 atau 16 digit"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">NIK</label>
                <Input
                  value={editFormData.nik}
                  onChange={(e) => setEditFormData({ ...editFormData, nik: e.target.value })}
                  placeholder="16 digit (jika tanpa NPWP)"
                  inputMode="numeric"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="font-semibold">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
