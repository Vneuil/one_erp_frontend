"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Sparkles, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

import { productsApi, ProductItem } from "@/lib/api/products";

export default function NewProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [baseProducts, setBaseProducts] = React.useState<ProductItem[]>([]);
  const [variantOf, setVariantOf] = React.useState("");
  const [variantLabel, setVariantLabel] = React.useState("");
  React.useEffect(() => {
    productsApi
      .list({ perPage: 500 })
      .then((res) => setBaseProducts((res.data || []).filter((p) => !p.variantOf)))
      .catch((err) => console.error("Failed to load products for the variant picker", err));
  }, []);
  const [formData, setFormData] = React.useState({
    sku: "PRD-RAW-",
    barcode: "",
    name: "",
    category: "Raw Material",
    unit: "Pcs",
    minStock: 10,
    costPrice: 0,
    sellingPrice: 0,
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await productsApi.create({
        sku: formData.sku,
        barcode: formData.barcode,
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        stock: formData.minStock,
        costPrice: formData.costPrice,
        sellingPrice: formData.sellingPrice,
        variantOf: variantOf || undefined,
        variantLabel: variantOf ? variantLabel : undefined,
      });
      router.push("/master-data/products");
    } catch (err) {
      alert("Gagal menambahkan produk: " + (err instanceof Error ? err.message : "Kesalahan server"));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/master-data/products">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Create New Product"
        description="Register a new item SKU into the central ERP catalog."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-primary" />
              General Information
            </CardTitle>
            <CardDescription>Basic identifiers and categorizations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">SKU / Item Code *</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. PRD-RAW-005"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Barcode / UPC</label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="e.g. 899123456789"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Varian dari produk (opsional)</label>
                <select value={variantOf} onChange={(e) => setVariantOf(e.target.value)} className="h-10 w-full rounded-lg border px-3 text-sm">
                  <option value="">Bukan varian</option>
                  {baseProducts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              {variantOf && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Label varian *</label>
                  <Input value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} placeholder="mis. Merah / L" required />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Product Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Aluminum Ingot Grade A 99.7%"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <option value="Raw Material">Raw Material</option>
                  <option value="Components">Components</option>
                  <option value="Finished Goods">Finished Goods</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Electronics">Electronics</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Unit of Measurement (UoM) *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <option value="Pcs">Pcs (Pieces)</option>
                  <option value="KG">KG (Kilogram)</option>
                  <option value="Roll">Roll</option>
                  <option value="Unit">Unit</option>
                  <option value="Box">Box</option>
                  <option value="Meter">Meter</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Pricing & Safety Inventory</CardTitle>
            <CardDescription>Default cost valuation and selling rate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Standard Cost Price (IDR)</label>
                <Input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Selling Price (IDR)</label>
                <Input
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Safety / Min Stock Alert</label>
                <Input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                  min={0}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button asChild variant="outline" type="button">
            <Link href="/master-data/products">Cancel</Link>
          </Button>
          <Button type="submit" variant="gradient" className="gap-2 font-semibold">
            <Save className="h-4 w-4" /> Save Product
          </Button>
        </div>
      </form>
    </div>
  );
}
