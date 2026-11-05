"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Tag, Ruler, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productCategoriesApi, unitsOfMeasureApi } from "@/lib/api/products";

export default function NewCategoryOrUnitPage() {
  const router = useRouter();

  // Category state
  const [categoryName, setCategoryName] = React.useState("");
  const [isCategorySubmitting, setIsCategorySubmitting] = React.useState(false);
  const [categoryError, setCategoryError] = React.useState<string | null>(null);

  // Unit state
  const [unitName, setUnitName] = React.useState("");
  const [unitSymbol, setUnitSymbol] = React.useState("");
  const [isUnitSubmitting, setIsUnitSubmitting] = React.useState(false);
  const [unitError, setUnitError] = React.useState<string | null>(null);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setIsCategorySubmitting(true);
    setCategoryError(null);
    try {
      await productCategoriesApi.create(categoryName.trim());
      router.push("/master-data/categories-units");
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Gagal menambahkan kategori.");
      setIsCategorySubmitting(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    setIsUnitSubmitting(true);
    setUnitError(null);
    try {
      await unitsOfMeasureApi.create(unitName.trim(), unitSymbol.trim());
      router.push("/master-data/categories-units");
    } catch (err) {
      setUnitError(err instanceof Error ? err.message : "Gagal menambahkan satuan ukuran.");
      setIsUnitSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/master-data/categories-units">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Kategori & Satuan
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Tambah Kategori / Satuan Ukuran"
        description="Buat master kategori barang atau satuan ukuran (UoM) baru untuk katalog produk dan persediaan."
      />

      <Tabs defaultValue="category" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="category" className="gap-2 text-xs">
            <Tag className="h-3.5 w-3.5" /> Kategori Barang Baru
          </TabsTrigger>
          <TabsTrigger value="unit" className="gap-2 text-xs">
            <Ruler className="h-3.5 w-3.5" /> Satuan Ukuran (UoM) Baru
          </TabsTrigger>
        </TabsList>

        <TabsContent value="category" className="mt-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-brand-primary" /> Formulir Kategori Barang Baru
              </CardTitle>
              <CardDescription className="text-xs">
                Kategori dipakai untuk mengelompokkan produk di seluruh katalog, transaksi, dan pelaporan stok.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                {categoryError && (
                  <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {categoryError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Nama Kategori <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Contoh: Bahan Baku, Kemasan, Gula Kelapa, Finished Goods"
                    required
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Gunakan nama kategori yang jelas dan deskriptif.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" type="button">
                    <Link href="/master-data/categories-units">Batal</Link>
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    size="sm"
                    className="gap-1.5 font-semibold"
                    disabled={isCategorySubmitting || !categoryName.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isCategorySubmitting ? "Menyimpan..." : "Simpan Kategori"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unit" className="mt-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Ruler className="h-4 w-4 text-brand-primary" /> Formulir Satuan Ukuran (UoM) Baru
              </CardTitle>
              <CardDescription className="text-xs">
                Satuan ukuran digunakan untuk menentukan kuantitas dalam pembelian, inventaris, dan penjualan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUnit} className="space-y-4">
                {unitError && (
                  <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {unitError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Nama Satuan <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      placeholder="Contoh: Kilogram, Pieces, Liter, Box"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Simbol / Singkatan
                    </label>
                    <Input
                      value={unitSymbol}
                      onChange={(e) => setUnitSymbol(e.target.value)}
                      placeholder="Contoh: KG, Pcs, L, Box"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Simbol akan ditampilkan pada kartu stok, invoice, dan Surat Jalan jika diisi.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" type="button">
                    <Link href="/master-data/categories-units">Batal</Link>
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    size="sm"
                    className="gap-1.5 font-semibold"
                    disabled={isUnitSubmitting || !unitName.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isUnitSubmitting ? "Menyimpan..." : "Simpan Satuan"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

