"use client";

import * as React from "react";
import { Plus, Mail, Phone, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { salesmenApi, SalesmanItem } from "@/lib/api/salesmen";

export default function SalesmenPage() {
  const [salesmen, setSalesmen] = React.useState<SalesmanItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    territory: "",
    commissionRate: 0,
  });
  const [formError, setFormError] = React.useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    territory: "",
    commissionRate: 0,
  });
  const [editFormError, setEditFormError] = React.useState<string | null>(null);

  const fetchSalesmen = React.useCallback(() => {
    setIsLoading(true);
    salesmenApi
      .list()
      .then((res) => setSalesmen(res.data || []))
      .catch((err) => {
        console.error("Failed to load salesmen", err);
        setLoadError("Gagal memuat data salesman dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    fetchSalesmen();
  }, [fetchSalesmen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await salesmenApi.create(formData);
      setIsAddOpen(false);
      setFormData({ code: "", name: "", email: "", phone: "", territory: "", commissionRate: 0 });
      fetchSalesmen();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menambahkan salesman.");
    }
  };

  const openEditSalesman = (s: SalesmanItem) => {
    setEditingId(s.id);
    setEditFormError(null);
    setEditFormData({
      code: s.code,
      name: s.name,
      email: s.email || "",
      phone: s.phone || "",
      territory: s.territory || "",
      commissionRate: s.commissionRate || 0,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditFormError(null);
    try {
      const res = await salesmenApi.update(editingId, editFormData);
      const updated = res.data;
      setSalesmen((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, ...editFormData, ...updated } : s))
      );
      setIsEditOpen(false);
      setEditingId(null);
    } catch (err) {
      setEditFormError(err instanceof Error ? err.message : "Gagal memperbarui salesman.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus salesman ini?")) return;
    try {
      await salesmenApi.delete(id);
      setSalesmen((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert("Gagal menghapus salesman: " + (err instanceof Error ? err.message : "Kesalahan server"));
    }
  };

  const columns: Column<SalesmanItem>[] = [
    {
      key: "code",
      header: "Kode",
      sortable: true,
      render: (s) => <span className="font-mono text-xs font-bold text-brand-primary">{s.code}</span>,
    },
    {
      key: "name",
      header: "Nama",
      sortable: true,
      render: (s) => <span className="font-semibold text-xs text-foreground">{s.name}</span>,
    },
    {
      key: "email",
      header: "Kontak",
      render: (s) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {s.email || "-"}</div>
          <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {s.phone || "-"}</div>
        </div>
      ),
    },
    {
      key: "territory",
      header: "Wilayah",
      render: (s) => (
        <span className="text-xs text-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground" /> {s.territory || "-"}
        </span>
      ),
    },
    {
      key: "commissionRate",
      header: "Komisi",
      align: "right",
      render: (s) => <span className="text-xs font-semibold text-foreground">{s.commissionRate}%</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge status={s.status?.toLowerCase() || "active"} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (s) => (
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEditSalesman(s)}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <Pencil className="h-3 w-3" />
            <span>Edit</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(s.id)}
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
        title="Salesman Directory"
        description="Master data tenaga penjual: wilayah, kontak, dan persentase komisi."
      >
        <Button onClick={() => setIsAddOpen(true)} variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> Tambah Salesman
        </Button>
      </PageHeader>

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      <DataTable
        columns={columns}
        data={salesmen}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Cari salesman berdasarkan nama atau kode..."
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Salesman Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kode</label>
              <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="SLM-001" required />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Nama *</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Email</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Telepon</label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Wilayah</label>
                <Input value={formData.territory} onChange={(e) => setFormData({ ...formData, territory: e.target.value })} placeholder="Jabodetabek" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Komisi (%)</label>
                <Input type="number" step="0.1" value={formData.commissionRate} onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })} />
              </div>
            </div>
            {formError && <p className="text-rose-600 font-semibold">{formError}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="font-semibold">
                Simpan Salesman
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Salesman</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kode</label>
              <Input value={editFormData.code} onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Nama *</label>
              <Input value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Email</label>
                <Input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Telepon</label>
                <Input value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Wilayah</label>
                <Input value={editFormData.territory} onChange={(e) => setEditFormData({ ...editFormData, territory: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Komisi (%)</label>
                <Input type="number" step="0.1" value={editFormData.commissionRate} onChange={(e) => setEditFormData({ ...editFormData, commissionRate: Number(e.target.value) })} />
              </div>
            </div>
            {editFormError && <p className="text-rose-600 font-semibold">{editFormError}</p>}
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
