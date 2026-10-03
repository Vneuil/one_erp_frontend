"use client";

import * as React from "react";
import { Plus, Trash2, Pencil, Tag, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
  productCategoriesApi,
  unitsOfMeasureApi,
  ProductCategoryItem,
  UnitOfMeasureItem,
} from "@/lib/api/products";

export default function CategoriesUnitsPage() {
  const [categories, setCategories] = React.useState<ProductCategoryItem[]>([]);
  const [units, setUnits] = React.useState<UnitOfMeasureItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [newCategory, setNewCategory] = React.useState("");
  const [newUnitName, setNewUnitName] = React.useState("");
  const [newUnitSymbol, setNewUnitSymbol] = React.useState("");

  const [editingCategory, setEditingCategory] = React.useState<ProductCategoryItem | null>(null);
  const [editCategoryName, setEditCategoryName] = React.useState("");
  const [editCategoryError, setEditCategoryError] = React.useState<string | null>(null);
  const [isEditCategorySubmitting, setIsEditCategorySubmitting] = React.useState(false);

  const [editingUnit, setEditingUnit] = React.useState<UnitOfMeasureItem | null>(null);
  const [editUnitName, setEditUnitName] = React.useState("");
  const [editUnitSymbol, setEditUnitSymbol] = React.useState("");
  const [editUnitError, setEditUnitError] = React.useState<string | null>(null);
  const [isEditUnitSubmitting, setIsEditUnitSubmitting] = React.useState(false);

  const loadData = React.useCallback(() => {
    setIsLoading(true);
    Promise.all([productCategoriesApi.list(), unitsOfMeasureApi.list()])
      .then(([catRes, unitRes]) => {
        setCategories(catRes.data || []);
        setUnits(unitRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to load categories/units", err);
        setLoadError("Gagal memuat kategori & satuan dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await productCategoriesApi.create(newCategory.trim());
      setNewCategory("");
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menambah kategori.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus kategori ini?")) return;
    try {
      await productCategoriesApi.remove(id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus kategori.");
    }
  };

  const openEditCategory = (c: ProductCategoryItem) => {
    setEditingCategory(c);
    setEditCategoryName(c.name);
    setEditCategoryError(null);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;
    setIsEditCategorySubmitting(true);
    setEditCategoryError(null);
    try {
      await productCategoriesApi.update(editingCategory.id, editCategoryName.trim());
      setCategories((prev) =>
        prev.map((c) => (c.id === editingCategory.id ? { ...c, name: editCategoryName.trim() } : c))
      );
      setEditingCategory(null);
    } catch (err) {
      setEditCategoryError(err instanceof Error ? err.message : "Gagal memperbarui kategori.");
    } finally {
      setIsEditCategorySubmitting(false);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    try {
      await unitsOfMeasureApi.create(newUnitName.trim(), newUnitSymbol.trim());
      setNewUnitName("");
      setNewUnitSymbol("");
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menambah satuan.");
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus satuan ini?")) return;
    try {
      await unitsOfMeasureApi.remove(id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus satuan.");
    }
  };

  const openEditUnit = (u: UnitOfMeasureItem) => {
    setEditingUnit(u);
    setEditUnitName(u.name);
    setEditUnitSymbol(u.symbol || "");
    setEditUnitError(null);
  };

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit || !editUnitName.trim()) return;
    setIsEditUnitSubmitting(true);
    setEditUnitError(null);
    try {
      await unitsOfMeasureApi.update(editingUnit.id, editUnitName.trim(), editUnitSymbol.trim());
      setUnits((prev) =>
        prev.map((u) =>
          u.id === editingUnit.id ? { ...u, name: editUnitName.trim(), symbol: editUnitSymbol.trim() } : u
        )
      );
      setEditingUnit(null);
    } catch (err) {
      setEditUnitError(err instanceof Error ? err.message : "Gagal memperbarui satuan.");
    } finally {
      setIsEditUnitSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategori Barang & Satuan Ukuran"
        description="Kelola daftar master kategori produk dan satuan ukuran (UoM) yang dipakai di seluruh katalog barang."
      />

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Tag className="h-3.5 w-3.5 text-brand-primary" />
                <span>Kategori Barang</span>
              </div>
              <form onSubmit={handleAddCategory} className="flex items-center gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nama kategori baru..."
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" variant="gradient" className="h-8 gap-1 text-xs font-bold shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </Button>
              </form>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">Belum ada kategori.</p>
                )}
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-slate-50/40 text-xs"
                  >
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => openEditCategory(c)}
                        className="text-muted-foreground hover:text-brand-primary cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="text-muted-foreground hover:text-rose-600 cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Ruler className="h-3.5 w-3.5 text-brand-primary" />
                <span>Satuan Ukuran (UoM)</span>
              </div>
              <form onSubmit={handleAddUnit} className="flex items-center gap-2">
                <Input
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Nama satuan (mis. Kilogram)"
                  className="h-8 text-xs flex-1"
                />
                <Input
                  value={newUnitSymbol}
                  onChange={(e) => setNewUnitSymbol(e.target.value)}
                  placeholder="Simbol (KG)"
                  className="h-8 text-xs w-24 shrink-0"
                />
                <Button type="submit" size="sm" variant="gradient" className="h-8 gap-1 text-xs font-bold shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </Button>
              </form>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {units.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">Belum ada satuan.</p>
                )}
                {units.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-slate-50/40 text-xs"
                  >
                    <span className="font-semibold text-foreground">
                      {u.name} {u.symbol && <span className="text-muted-foreground font-normal">({u.symbol})</span>}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => openEditUnit(u)}
                        className="text-muted-foreground hover:text-brand-primary cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(u.id)}
                        className="text-muted-foreground hover:text-rose-600 cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={Boolean(editingCategory)} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Kategori</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCategory} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama *</label>
              <Input value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} required />
            </div>
            {editCategoryError && <p className="text-rose-600 font-semibold">{editCategoryError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingCategory(null)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isEditCategorySubmitting}>
                {isEditCategorySubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingUnit)} onOpenChange={(open) => !open && setEditingUnit(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Satuan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUnit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama *</label>
              <Input value={editUnitName} onChange={(e) => setEditUnitName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Simbol</label>
              <Input value={editUnitSymbol} onChange={(e) => setEditUnitSymbol(e.target.value)} />
            </div>
            {editUnitError && <p className="text-rose-600 font-semibold">{editUnitError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingUnit(null)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isEditUnitSubmitting}>
                {isEditUnitSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
