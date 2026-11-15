"use client";

import { SHOW_PRICE_IN_PRODUCT_MASTER } from "@/lib/roles";
import * as React from "react";
import Link from "next/link";
import { Plus, Download, Eye, Edit, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { CopyProductsDialog } from "@/components/shared/copy-products-dialog";
import { formatNumber } from "@/lib/utils";
import { useNavigationAccess } from "@/providers/navigation-access";
import { usePermission } from "@/lib/hooks/use-permission";
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
import { productsApi, isProductActive, productCategoriesApi, ProductCategoryItem } from "@/lib/api/products";
import { downloadCsv } from "@/lib/utils/csv";

export default function ProductsPage() {
  const { canViewPrices } = useNavigationAccess();
  const { canCreate: canCreateProduct, canDelete: canDeleteProduct, canEditPrices: canEditPricesProduct } = usePermission("product");
  const confirm = useConfirm();
  const alert = useAlert();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<ProductCategoryItem[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<"active" | "inactive" | "all">("active");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  React.useEffect(() => {
    Promise.all([
      fetchAllPages(productsApi.list),
      productCategoriesApi.list().catch(() => ({ data: [] })),
    ])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes);
        setCategories(catRes.data || []);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Gagal memuat daftar barang.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const activeCount = React.useMemo(() => products.filter(isProductActive).length, [products]);
  const inactiveCount = React.useMemo(() => products.filter((p) => !isProductActive(p)).length, [products]);

  const displayedProducts = React.useMemo(() => {
    let list = products;
    if (statusFilter === "active") list = list.filter(isProductActive);
    else if (statusFilter === "inactive") list = list.filter((p) => !isProductActive(p));

    if (categoryFilter !== "all") {
      list = list.filter((p) => (p.category || "").toLowerCase() === categoryFilter.toLowerCase());
    }
    return list;
  }, [products, statusFilter, categoryFilter]);

  const handleToggleStatus = async (item: Product) => {
    const active = isProductActive(item);
    const ok = await confirm({
      title: active ? "Nonaktifkan Produk" : "Aktifkan Produk",
      message: active
        ? `Nonaktifkan produk "${item.name}" (${item.sku})? Produk ini akan disembunyikan dari tabel katalog aktif dan seluruh pilihan transaksi (Quotation, PO Masuk, PI, SO, PR/PO). Riwayat transaksi tetap tersimpan.`
        : `Aktifkan kembali produk "${item.name}" (${item.sku})? Produk ini akan kembali muncul di tabel katalog dan pilihan transaksi.`,
      confirmText: active ? "Nonaktifkan" : "Aktifkan",
      variant: active ? "destructive" : "default",
    });
    if (!ok) return;

    const newStatus = active ? "Inactive" : "Active";
    try {
      await productsApi.setStatus(item.id, newStatus);
      setProducts((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      await alert({
        title: "Gagal Mengubah Status",
        message: "Gagal mengubah status produk: " + (err instanceof Error ? err.message : "Kesalahan server"),
        variant: "destructive",
      });
    }
  };

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
    const pricesAllowed = SHOW_PRICE_IN_PRODUCT_MASTER || canViewPrices("products");
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
      hiddenBelow: "sm",
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
    ...(((SHOW_PRICE_IN_PRODUCT_MASTER || canViewPrices("products"))
      ? [
          {
            key: "costPrice",
            header: "Cost Price",
            align: "right",
            hiddenBelow: "lg",
            render: (item: Product) => (
              <span className="text-xs text-muted-foreground">
                <MoneyDisplay amount={item.costPrice} currency={item.currency || "IDR"} />
              </span>
            ),
          },
          {
            key: "sellingPrice",
            header: "Selling Price",
            align: "right",
            sortable: true,
            hiddenBelow: "md",
            render: (item: Product) => (
              <span className="text-xs font-semibold">
                <MoneyDisplay amount={item.sellingPrice} currency={item.currency || "IDR"} highlight />
              </span>
            ),
          },
        ]
      : []) as Column<Product>[]),
    {
      key: "status",
      header: "Status",
      hiddenBelow: "sm",
      render: (item) => {
        const active = isProductActive(item);
        return (
          <StatusBadge
            status={active ? "active" : "inactive"}
            label={active ? "Aktif" : "Non-Aktif"}
          />
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => {
        const active = isProductActive(item);
        return (
          <div className="flex items-center justify-end gap-1">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-primary" title="Lihat Detail">
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
              onClick={() => handleToggleStatus(item)}
              title={active ? "Nonaktifkan Produk" : "Aktifkan Produk"}
              className={`h-8 w-8 ${active ? "text-muted-foreground hover:text-rose-600" : "text-emerald-600 hover:text-emerald-700 bg-emerald-50/60"}`}
            >
              <Power className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(item.id, item.name)}
              className="h-8 w-8 text-muted-foreground hover:text-red-600"
              title="Hapus Produk"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Produk"
        description="Kelola katalog bahan baku, kemasan, rakitan, dan produk jadi beserta harga acuan standar dan status keaktifan."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />
          Export Excel
        </Button>
        {canCreateProduct && (
          <>
            <CopyProductsDialog onCopied={copied => setProducts(current => [...copied, ...current.filter(item => !copied.some(copy => copy.id === item.id))])} />
            <Button asChild variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              <Link href="/master-data/products/new">
                <Plus className="h-3.5 w-3.5" />
                Add New Product
              </Link>
            </Button>
          </>
        )}
      </PageHeader>

      {/* Filter Keaktifan Produk & Filter Kategori */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === "active"
                  ? "bg-white text-emerald-800 shadow-xs border border-emerald-200"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Produk Aktif ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === "inactive"
                  ? "bg-white text-rose-800 shadow-xs border border-rose-200"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Non-Aktif ({inactiveCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-white text-brand-primary shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua ({products.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Kategori:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-border bg-white text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => {
                const count = products.filter((p) => (p.category || "").toLowerCase() === c.name.toLowerCase()).length;
                return (
                  <option key={c.id} value={c.name}>
                    {c.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {statusFilter === "active" && inactiveCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {inactiveCount} produk non-aktif disembunyikan dari tabel
          </span>
        )}
      </div>

      {loadError && <p role="alert" className="text-sm text-rose-700">{loadError}</p>}
      <DataTable
        columns={columns}
        data={displayedProducts}
        isLoading={isLoading}
        searchKey="name"
        searchKeys={["name", "sku", "category", "grade"]}
        searchPlaceholder="Search by name, category, or SKU..."
      />
    </div>
  );
}
