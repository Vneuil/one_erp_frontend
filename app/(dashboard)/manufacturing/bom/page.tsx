"use client";

import * as React from "react";
import { Plus, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { manufacturingApi } from "@/lib/api/manufacturing";
import { productsApi, ProductItem } from "@/lib/api/products";

interface BOM {
  id: string;
  bomCode: string;
  productName: string;
  version: string;
  componentsCount: number;
  estimatedCost: number;
  status: string;
}

export default function BOMPage() {
  const [boms, setBoms] = React.useState<BOM[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [productId, setProductId] = React.useState("");
  const [componentProductId, setComponentProductId] = React.useState("");
  const [version, setVersion] = React.useState("v1.0");
  const [componentsCount, setComponentsCount] = React.useState(0);
  const [estimatedCost, setEstimatedCost] = React.useState(0);

  React.useEffect(() => {
    productsApi
      .list({ perPage: 200 })
      .then((res) => setProducts(res.data || []))
      .catch((err) => console.warn("Failed to load products", err));
  }, []);

  React.useEffect(() => {
    manufacturingApi
      .listBOMs()
      .then((res) => {
                  setBoms(
            (res.data || []).map((b) => ({
              id: b.id,
              bomCode: `BOM-${b.productSku || b.id.slice(0, 6).toUpperCase()}`,
              productName: b.productName || b.name,
              version: b.version,
              componentsCount: b.lines.length,
              estimatedCost: 0,
              status: b.isActive ? "active" : "draft",
            }))
          );
      })
      .catch((err) => {
        (console.error("Failed to load data", err), setLoadError("Gagal memuat data dari server."));
      });
  }, []);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === productId) || null;

  const handleCreateBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await manufacturingApi.createBOM({
        productId: selectedProduct.id,
        name: `${selectedProduct.name} Recipe`,
        version,
        lines: componentProductId
          ? [{ componentProductId, quantityRequired: Math.max(componentsCount, 1) }]
          : [],
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal membuat resep BOM.");
      }
      const b = res.data;
      setBoms([
        {
          id: b.id,
          bomCode: `BOM-${b.productSku || b.id.slice(0, 6).toUpperCase()}`,
          productName: b.productName || selectedProduct.name,
          version: b.version,
          componentsCount: b.lines ? b.lines.length : componentsCount,
          estimatedCost,
          status: b.isActive ? "active" : "draft",
        },
        ...boms,
      ]);
      setIsNewOpen(false);
      setProductId("");
      setComponentProductId("");
      setVersion("v1.0");
      setComponentsCount(0);
      setEstimatedCost(0);
      setNotice("Resep BOM berhasil dibuat.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat BOM. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<BOM>[] = [
    {
      key: "bomCode",
      header: "BOM Code",
      sortable: true,
      render: (b) => <span className="font-mono text-xs font-bold text-brand-primary">{b.bomCode}</span>,
    },
    {
      key: "productName",
      header: "Output Product",
      sortable: true,
      render: (b) => <span className="text-xs font-semibold text-foreground">{b.productName}</span>,
    },
    {
      key: "version",
      header: "Revision",
      render: (b) => <span className="font-mono text-xs text-muted-foreground">{b.version}</span>,
    },
    {
      key: "componentsCount",
      header: "Component Lines",
      align: "center",
      render: (b) => <span className="text-xs font-semibold">{b.componentsCount} Parts</span>,
    },
    {
      key: "estimatedCost",
      header: "Est. Unit Cost",
      align: "right",
      sortable: true,
      render: (b) => <MoneyDisplay amount={b.estimatedCost} className="text-xs font-bold" />,
    },
    {
      key: "status",
      header: "Status",
      render: (b) => <StatusBadge status={b.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bill of Materials (BOM) Recipes"
        description="Define production formulas, sub-assemblies, and raw material requirements for finished goods."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => {
            setFormError(null);
            setIsNewOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Create BOM
        </Button>
      </PageHeader>

      {notice && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {notice}
        </div>
      )}

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      <DataTable
        columns={columns}
        data={boms}
        searchKey="bomCode"
        searchPlaceholder="Search BOM code or product..."
      />

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New BOM</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBom} className="space-y-3">
            {formError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Output Product *</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih produk...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Component Product</label>
                <select
                  value={componentProductId}
                  onChange={(e) => setComponentProductId(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="">Pilih komponen (opsional)...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Revision</label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Component Lines</label>
                <Input
                  type="number"
                  value={componentsCount}
                  onChange={(e) => setComponentsCount(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Est. Unit Cost</label>
              <Input
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold" disabled={!selectedProduct || isSubmitting}>
                Create BOM
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
