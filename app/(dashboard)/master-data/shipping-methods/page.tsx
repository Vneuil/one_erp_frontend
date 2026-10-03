"use client";

import * as React from "react";
import { Plus, Truck, Clock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { shippingMethodsApi, ShippingMethodItem } from "@/lib/api/shipping-methods";

export default function ShippingMethodsPage() {
  const [methods, setMethods] = React.useState<ShippingMethodItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    code: "",
    name: "",
    carrier: "",
    estimatedDays: 1,
    cost: 0,
  });
  const [formError, setFormError] = React.useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState({
    code: "",
    name: "",
    carrier: "",
    estimatedDays: 1,
    cost: 0,
  });
  const [editFormError, setEditFormError] = React.useState<string | null>(null);

  const fetchMethods = React.useCallback(() => {
    setIsLoading(true);
    shippingMethodsApi
      .list()
      .then((res) => setMethods(res.data || []))
      .catch((err) => {
        console.error("Failed to load shipping methods", err);
        setLoadError("Gagal memuat data metode pengiriman dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await shippingMethodsApi.create(formData);
      setIsAddOpen(false);
      setFormData({ code: "", name: "", carrier: "", estimatedDays: 1, cost: 0 });
      fetchMethods();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menambahkan metode pengiriman.");
    }
  };

  const openEditMethod = (m: ShippingMethodItem) => {
    setEditingId(m.id);
    setEditFormError(null);
    setEditFormData({
      code: m.code,
      name: m.name,
      carrier: m.carrier || "",
      estimatedDays: m.estimatedDays,
      cost: m.cost,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditFormError(null);
    try {
      const res = await shippingMethodsApi.update(editingId, editFormData);
      const updated = res.data;
      setMethods((prev) =>
        prev.map((m) => (m.id === editingId ? { ...m, ...editFormData, ...updated } : m))
      );
      setIsEditOpen(false);
      setEditingId(null);
    } catch (err) {
      setEditFormError(err instanceof Error ? err.message : "Gagal memperbarui metode pengiriman.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus metode pengiriman ini?")) return;
    try {
      await shippingMethodsApi.delete(id);
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert("Gagal menghapus metode pengiriman: " + (err instanceof Error ? err.message : "Kesalahan server"));
    }
  };

  const columns: Column<ShippingMethodItem>[] = [
    {
      key: "code",
      header: "Kode",
      sortable: true,
      render: (m) => <span className="font-mono text-xs font-bold text-brand-primary">{m.code}</span>,
    },
    {
      key: "name",
      header: "Nama Metode",
      sortable: true,
      render: (m) => <span className="font-semibold text-xs text-foreground">{m.name}</span>,
    },
    {
      key: "carrier",
      header: "Kurir",
      render: (m) => (
        <span className="text-xs text-foreground flex items-center gap-1">
          <Truck className="h-3 w-3 text-muted-foreground" /> {m.carrier || "-"}
        </span>
      ),
    },
    {
      key: "estimatedDays",
      header: "Estimasi",
      align: "right",
      render: (m) => (
        <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" /> {m.estimatedDays} hari
        </span>
      ),
    },
    {
      key: "cost",
      header: "Biaya",
      align: "right",
      sortable: true,
      render: (m) => <MoneyDisplay amount={m.cost} className="text-xs font-semibold" />,
    },
    {
      key: "status",
      header: "Status",
      render: (m) => <StatusBadge status={m.status?.toLowerCase() || "active"} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (m) => (
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEditMethod(m)}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <Pencil className="h-3 w-3" />
            <span>Edit</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(m.id)}
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
        title="Metode Pengiriman"
        description="Master data opsi pengiriman: kurir, estimasi waktu, dan biaya."
      >
        <Button onClick={() => setIsAddOpen(true)} variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> Tambah Metode
        </Button>
      </PageHeader>

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      <DataTable
        columns={columns}
        data={methods}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Cari metode pengiriman..."
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Metode Pengiriman</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kode</label>
              <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="REG" required />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Nama *</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Reguler" required />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kurir</label>
              <Input value={formData.carrier} onChange={(e) => setFormData({ ...formData, carrier: e.target.value })} placeholder="JNE" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Estimasi (hari)</label>
                <Input type="number" value={formData.estimatedDays} onChange={(e) => setFormData({ ...formData, estimatedDays: Number(e.target.value) })} min={0} />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Biaya</label>
                <Input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })} min={0} />
              </div>
            </div>
            {formError && <p className="text-rose-600 font-semibold">{formError}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="font-semibold">
                Simpan Metode
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Metode Pengiriman</DialogTitle>
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
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kurir</label>
              <Input value={editFormData.carrier} onChange={(e) => setEditFormData({ ...editFormData, carrier: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Estimasi (hari)</label>
                <Input type="number" value={editFormData.estimatedDays} onChange={(e) => setEditFormData({ ...editFormData, estimatedDays: Number(e.target.value) })} min={0} />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Biaya</label>
                <Input type="number" value={editFormData.cost} onChange={(e) => setEditFormData({ ...editFormData, cost: Number(e.target.value) })} min={0} />
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
