"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Download, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { CopyProductsDialog } from "@/components/shared/copy-products-dialog";
import { formatNumber } from "@/lib/utils";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  costPrice: number;
  sellingPrice: number;
  status: string;
  variantLabel?: string;
  marketplacePlatform?: string;
  marketplaceProductId?: string;
}

import { fetchAllPages } from "@/lib/api/pagination";
import { productsApi } from "@/lib/api/products";
import { downloadCsv } from "@/lib/utils/csv";

export default function ProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetchAllPages(productsApi.list)
      .then((res) => {
                  setProducts(res);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Gagal memuat daftar barang.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"?`)) return;
    try {
      await productsApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("Gagal menghapus produk: " + (err instanceof Error ? err.message : "Kesalahan server"));
    }
  };

  const handleExport = () => {
    downloadCsv(
      "products.csv",
      ["SKU", "Name", "Category", "Unit", "Stock", "Cost Price", "Selling Price", "Status"],
      products.map((p) => [p.sku, p.name, p.category, p.unit, p.stock, p.costPrice, p.sellingPrice, p.status])
    );
  };

  const columns: Column<Product>[] = [
    {
      key: "sku",
      header: "SKU / Code",
      sortable: true,
      render: (item) => (
        <Link
          href={`/master-data/products/${item.id}`}
          className="font-mono text-xs font-bold text-brand-primary hover:underline"
        >
          {item.sku}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Product Name",
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-semibold text-xs text-foreground">{item.name}{item.variantLabel && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-brand-tint text-brand-primary text-[10px] font-bold">{item.variantLabel}</span>}</p>
          <span className="text-[11px] text-muted-foreground">{item.category}</span>
          {item.marketplaceProductId && (
            <span className="block text-[10px] text-muted-foreground">
              TikTok Shop Product ID: {item.marketplaceProductId}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock Level",
      sortable: true,
      render: (item) => (
        <span className="text-xs font-medium">
          {formatNumber(item.stock)} {item.unit}
        </span>
      ),
    },
    {
      key: "costPrice",
      header: "Cost Price",
      align: "right",
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          <MoneyDisplay amount={item.costPrice} />
        </span>
      ),
    },
    {
      key: "sellingPrice",
      header: "Selling Price",
      align: "right",
      sortable: true,
      render: (item) => (
        <span className="text-xs font-semibold">
          <MoneyDisplay amount={item.sellingPrice} highlight />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-primary">
            <Link href={`/master-data/products/${item.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Link href={`/master-data/products/${item.id}?edit=true`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(item.id, item.name)}
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products Catalog"
        description="Manage master catalog of raw materials, assemblies, and finished products."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />
          Export Excel
        </Button>
        <CopyProductsDialog onCopied={copied => setProducts(current => [...copied, ...current.filter(item => !copied.some(copy => copy.id === item.id))])} />
        <Button asChild variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
          <Link href="/master-data/products/new">
            <Plus className="h-3.5 w-3.5" />
            Add New Product
          </Link>
        </Button>
      </PageHeader>

      {loadError && <p role="alert" className="text-sm text-rose-700">{loadError}</p>}
      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Search by name, category, or SKU..."
      />
    </div>
  );
}
