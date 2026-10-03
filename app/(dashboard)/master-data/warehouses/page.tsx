"use client";

import * as React from "react";
import { Plus, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { inventoryApi, WarehouseItem } from "@/lib/api/inventory";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editCode, setEditCode] = React.useState("");
  const [editName, setEditName] = React.useState("");
  const [editAddress, setEditAddress] = React.useState("");
  const [editIsActive, setEditIsActive] = React.useState(true);
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);
  const [editFormError, setEditFormError] = React.useState<string | null>(null);

  const fetchWarehouses = React.useCallback(() => {
    inventoryApi
      .listWarehouses({ perPage: 100 })
      .then((res) => setWarehouses(res.data || []))
      .catch((err) => console.warn("Backend inventory API unavailable", err));
  }, []);

  React.useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await inventoryApi.createWarehouse({ code, name, address, isActive: true });
      fetchWarehouses();
      setIsAddOpen(false);
      setCode("");
      setName("");
      setAddress("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menambahkan gudang");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditWarehouse = (wh: WarehouseItem) => {
    setEditingId(wh.id);
    setEditFormError(null);
    setEditCode(wh.code);
    setEditName(wh.name);
    setEditAddress(wh.address || "");
    setEditIsActive(wh.isActive);
    setIsEditOpen(true);
  };

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName) return;
    setIsEditSubmitting(true);
    setEditFormError(null);
    try {
      const res = await inventoryApi.updateWarehouse(editingId, {
        code: editCode,
        name: editName,
        address: editAddress,
        isActive: editIsActive,
      });
      const updated = res.data;
      setWarehouses((prev) =>
        prev.map((wh) =>
          wh.id === editingId
            ? { ...wh, ...updated, code: updated?.code ?? editCode, name: updated?.name ?? editName, address: updated?.address ?? editAddress, isActive: updated?.isActive ?? editIsActive }
            : wh
        )
      );
      setIsEditOpen(false);
      setEditingId(null);
    } catch (err) {
      setEditFormError(err instanceof Error ? err.message : "Gagal memperbarui gudang");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus gudang ini?")) return;
    try {
      await inventoryApi.deleteWarehouse(id);
      setWarehouses((prev) => prev.filter((wh) => wh.id !== id));
    } catch (err) {
      alert("Gagal menghapus gudang: " + (err instanceof Error ? err.message : "Kesalahan server"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses & Locations"
        description="Configure physical storage facilities and distribution centers."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Add Warehouse
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {warehouses.map((wh) => (
          <Card key={wh.id} className="hover:border-brand-primary/40 transition-all flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-brand-primary bg-brand-tint px-2 py-0.5 rounded">
                  {wh.code}
                </span>
                <StatusBadge status={wh.isActive ? "active" : "inactive"} />
              </div>
              <CardTitle className="text-base font-bold mt-2">{wh.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground flex-1 flex flex-col">
              <div className="flex items-start gap-2 flex-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="line-clamp-2">{wh.address || "-"}</span>
              </div>
              <div className="flex gap-1.5 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditWarehouse(wh)}
                  className="h-7 px-2 text-[11px] gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteWarehouse(wh.id)}
                  className="h-7 px-2 text-[11px] gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Hapus</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {warehouses.length === 0 && (
          <div className="col-span-full p-8 text-center text-xs text-muted-foreground/60 border border-dashed border-border rounded-lg">
            Belum ada gudang. Klik "Add Warehouse" untuk membuat yang pertama.
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Warehouse</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWarehouse} className="space-y-4 text-xs">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Code *</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WH-JKT" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jakarta Distribution Hub" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat gudang" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Add Warehouse"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Warehouse</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateWarehouse} className="space-y-4 text-xs">
            {editFormError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                {editFormError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Code *</label>
              <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Name *</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Address</label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="edit-warehouse-active"
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <label htmlFor="edit-warehouse-active" className="text-xs font-medium text-foreground">
                Active
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isEditSubmitting}>
                {isEditSubmitting ? "Menyimpan..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
