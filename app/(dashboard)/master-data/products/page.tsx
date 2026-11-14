"use client";

import { SHOW_PRICE_IN_PRODUCT_MASTER } from "@/lib/roles";
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
import { useNavigationAccess } from "@/providers/navigation-access";
import { useConfirm, useAlert } from "@/components/shared/confirm-modal";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  costPrice: number;
  sellingPrice: number;
  currency?: string;
  status: string;
  variantLabel?: string;
  marketplacePlatform?: string;
  marketplaceProductId?: string;
  grade?: string;
  safetyStock?: number;
  organicType?: string;
  certifications?: string;
  dimensionLength?: number;
  dimensionWidth?: number;
  dimensionHeight?: number;
  packagingType?: string;
  packagingSpec?: string;
  remarks?: string;
  isBelowSafetyStock?: boolean;
}

import { fetchAllPages } from "@/lib/api/pagination";
import { productsApi } from "@/lib/api/products";
import { downloadCsv } from "@/lib/utils/csv";

export default function ProductsPage() {
  const { canViewPrices } = useNavigationAccess();
  const confirm = useConfirm();
  const alert = useAlert();
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
    const ok = await confirm({
      title: "Hapus Produk",
      message: `Hapus produk "${name}"?`,
      description: "Data produk yang dihapus tidak dapat dikembalikan dari sistem.",
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      await productsApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      await alert({
        title: "Gagal Menghapus",
        message: "Gagal menghapus produk: " + (err instanceof Error ? err.message : "Kesalahan server"),
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const pricesAllowed = canViewPrices("products");
    downloadCsv(
      "products.csv",
      ["SKU", "Name", "Grade", "Organic", "Category", "Unit", "Stock", "Safety Stock", ...(SHOW_PRICE_IN_PRODUCT_MASTER ? ["Cost Price", "Selling Price"] : []), "Status"],
      products.map((p) => [
        p.sku,
        p.name,
        p.grade || "-",
        p.organicType || "-",
        p.category,
        p.unit,
        p.stock,
        p.safetyStock ?? "-",
        ...(SHOW_PRICE_IN_PRODUCT_MASTER ? [pricesAllowed ? p.costPrice : "***", pricesAllowed ? p.sellingPrice : "***"] : []),
        p.status,
      ])
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-xs text-foreground">{item.name}</p>
            {item.grade && (
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                Grade {item.grade}
              </span>
            )}
            {item.certifications ? (
              item.certifications.split(",").map((c) => c.trim()).filter(Boolean).map((cert) => (
                <span key={cert} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase border border-emerald-200">
                  {cert}
                </span>
              ))
            ) : item.organicType ? (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
                {item.organicType}
              </span>
            ) : null}
            {item.packagingSpec && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium border border-amber-200">
                {item.packagingType ? `${item.packagingType}: ` : ""}{item.packagingSpec}
              </span>
            )}
            {item.variantLabel && (
              <span className="px-1.5 py-0.5 rounded bg-brand-tint text-brand-primary text-[10px] font-bold">
                {item.variantLabel}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">{item.category}</span>
          {item.dimensionLength || item.dimensionWidth || item.dimensionHeight ? (
            <span className="text-[10px] text-muted-foreground ml-2">
              ({item.dimensionLength || 0}×{item.dimensionWidth || 0}×{item.dimensionHeight || 0} cm)
            </span>
          ) : null}
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
        <div>
          <span className="text-xs font-medium">
            {formatNumber(item.stock)} {item.unit}
          </span>
          {(item.isBelowSafetyStock || (item.safetyStock !== undefined && item.safetyStock > 0 && item.stock < item.safetyStock)) && (
            <span className="block text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded mt-0.5 border border-rose-200">
              Di Bawah Safety Stock ({formatNumber(item.safetyStock || 0)} {item.unit})
            </span>
          )}
        </div>
      ),
    },
    ...((SHOW_PRICE_IN_PRODUCT_MASTER && canViewPrices("products")
      ? [
          {
            key: "costPrice",
            header: "Cost Price",
            align: "right",
            render: (item: Product) => (
              <span className="text-xs text-muted-foreground">
                {item.currency && item.currency !== "IDR" ? (
                  <span className="font-mono">{item.currency} {formatNumber(item.costPrice)}</span>
                ) : (
                  <MoneyDisplay amount={item.costPrice} />
                )}
              </span>
            ),
          },
          {
            key: "sellingPrice",
            header: "Selling Price",
            align: "right",
            sortable: true,
            render: (item: Product) => (
              <span className="text-xs font-semibold">
                {item.currency && item.currency !== "IDR" ? (
                  <span className="font-mono text-brand-primary">{item.currency} {formatNumber(item.sellingPrice)}</span>
                ) : (
                  <MoneyDisplay amount={item.sellingPrice} highlight />
                )}
              </span>
            ),
          },
        ]
      : []) as Column<Product>[]),
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
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Lihat & Edit Detail">
            <Link href={`/master-data/products/${item.id}`}>
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
        title="Master Produk"
        description="Kelola katalog bahan baku, rakitan, dan produk jadi. Harga tidak diinput di sini, melainkan langsung di Pesanan Penjualan."
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
