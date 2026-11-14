"use client";

import { SHOW_PRICE_IN_PRODUCT_MASTER } from "@/lib/roles";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit, Warehouse, History, Award, Box, Coins, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  productsApi,
  productCategoriesApi,
  unitsOfMeasureApi,
  certificationsApi,
  CertificationItem,
} from "@/lib/api/products";
import { currencyApi, CurrencyItem } from "@/lib/api/currency";
import { inventoryApi } from "@/lib/api/inventory";
import { fetchAllPages } from "@/lib/api/pagination";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigationAccess } from "@/providers/navigation-access";

export default function ProductDetailPage() {
  const params = useParams();
  return (
    <React.Suspense fallback={<p>Memuat detail barang...</p>}>
      <ProductDetail key={String(params.id)} />
    </React.Suspense>
  );
}

function ProductDetail() {
  const { canViewPrices } = useNavigationAccess();
  const params = useParams();
  const productId = params.id as string;

  const queryClient = useQueryClient();
  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const response = await productsApi.getById(productId);
      if (!response.data) throw new Error("Barang tidak ditemukan.");
      return response.data;
    },
  });
  const stockQuery = useQuery({
    queryKey: ["product-stock", productId],
    queryFn: async () =>
      (await fetchAllPages(inventoryApi.listStockLevels)).filter((item) => item.productId === productId),
    enabled: !!productQuery.data,
  });
  const movementsQuery = useQuery({
    queryKey: ["product-movements", productId],
    queryFn: async () =>
      (await fetchAllPages(inventoryApi.listMovements))
        .filter((item) => item.productId === productId)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        .slice(0, 20),
    enabled: !!productQuery.data,
  });
  const categoriesQuery = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => (await productCategoriesApi.list()).data,
  });
  const unitsQuery = useQuery({
    queryKey: ["units-of-measure"],
    queryFn: async () => (await unitsOfMeasureApi.list()).data,
  });
  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => fetchAllPages(inventoryApi.listWarehouses),
  });
  const certsQuery = useQuery({
    queryKey: ["product-certifications"],
    queryFn: async () => (await certificationsApi.list()).data,
  });
  const currenciesQuery = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => (await currencyApi.list()).data,
  });

  const [editFields, setEditFields] = React.useState<
    Partial<{
      sku: string;
      barcode: string;
      category: string;
      unit: string;
      grade: string;
      currency: string;
      dimensionLength: number;
      dimensionWidth: number;
      dimensionHeight: number;
      packagingType: string;
      packagingSpec: string;
      remarks: string;
    }>
  >({});
  const [editGrade, setEditGrade] = React.useState("");
  const [editSelectedCerts, setEditSelectedCerts] = React.useState<string[]>([]);
  const [bufferWarehouse, setBufferWarehouse] = React.useState("");
  const [bufferMin, setBufferMin] = React.useState("");
  const [bufferMax, setBufferMax] = React.useState("");
  const [bufferSaving, setBufferSaving] = React.useState(false);
  const [bufferMessage, setBufferMessage] = React.useState("");

  const saveBuffer = async () => {
    const minStock = Number(bufferMin),
      maxStock = Number(bufferMax);
    if (
      !bufferWarehouse ||
      bufferMin === "" ||
      bufferMax === "" ||
      !Number.isSafeInteger(minStock) ||
      !Number.isSafeInteger(maxStock) ||
      minStock < 0 ||
      maxStock < 0 ||
      (maxStock > 0 && minStock > maxStock)
    ) {
      setBufferMessage("Pilih gudang dan isi batas stok bulat yang valid; maksimum 0 berarti tanpa batas.");
      return;
    }
    setBufferSaving(true);
    setBufferMessage("");
    try {
      await inventoryApi.setBufferStock({ productId, warehouseId: bufferWarehouse, minStock, maxStock });
      await stockQuery.refetch();
      setBufferMessage("Safety stock berhasil disimpan.");
    } catch (error) {
      setBufferMessage(error instanceof Error ? error.message : "Gagal menyimpan safety stock.");
    } finally {
      setBufferSaving(false);
    }
  };

  const product = productQuery.data;
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState<string | null>(null);
  const [editCostPrice, setEditCostPrice] = React.useState<string | null>(null);
  const [editSellingPrice, setEditSellingPrice] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const handleOpenEdit = React.useCallback(() => {
    if (!product) return;
    setEditFields({
      sku: product.sku,
      barcode: product.barcode || "",
      category: product.category,
      unit: product.unit,
      grade: product.grade || "",
      currency: product.currency || "IDR",
      dimensionLength: product.dimensionLength || 0,
      dimensionWidth: product.dimensionWidth || 0,
      dimensionHeight: product.dimensionHeight || 0,
      packagingType: product.packagingType || "Box",
      packagingSpec: product.packagingSpec || "",
      remarks: product.remarks || "",
    });
    setEditGrade(product.grade || "");
    const parsedCerts = (product.certifications || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    setEditSelectedCerts(parsedCerts);
    setBufferWarehouse("");
    setBufferMessage("");
    setEditName(product.name);
    setEditCostPrice(String(product.costPrice || 0));
    setEditSellingPrice(String(product.sellingPrice || 0));
    setSaveError(null);
    setIsEditOpen(true);
  }, [product]);

  const toggleEditCert = (code: string) => {
    setEditSelectedCerts((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const costPrice = Number(editCostPrice ?? product?.costPrice ?? 0);
    const sellingPrice = Number(editSellingPrice ?? product?.sellingPrice ?? 0);
    if (!(editName ?? product?.name ?? "").trim() || !Number.isFinite(costPrice) || costPrice < 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setSaveError("Isi nama barang dan harga yang valid.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const certificationsStr = editSelectedCerts.join(", ");
      const response = await productsApi.update(productId, {
        name: (editName ?? product?.name ?? "").trim(),
        costPrice,
        sellingPrice,
        grade: editGrade || undefined,
        certifications: certificationsStr || undefined,
        ...editFields,
      });
      queryClient.setQueryData(["product", productId], response.data);
      setIsEditOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan barang.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!product || productQuery.isError) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/master-data/products">Back to Products</Link>
        </Button>
        {productQuery.isError ? (
          <div role="alert">
            <p>{productQuery.error.message}</p>
            <Button onClick={() => productQuery.refetch()}>Retry</Button>
          </div>
        ) : (
          <p role="status">Memuat detail barang...</p>
        )}
      </div>
    );
  }

  const certList = (product.certifications || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const isPackagingCategory = (editFields.category || product.category) === "Packaging";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/master-data/products">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
          </Link>
        </Button>
      </div>

      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} • Barcode: ${product.barcode || "—"} • Kategori: ${product.category} • Satuan: ${product.unit}${
          product.grade ? ` • Grade: ${product.grade}` : ""
        }${product.currency ? ` • Mata Uang: ${product.currency}` : ""}`}
      >
        <StatusBadge status={product.status} />
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleOpenEdit}>
          <Edit className="h-3.5 w-3.5" /> Edit Product
        </Button>
      </PageHeader>

      {/* Metric Cards (Feedback 4: completely hide prices if no permission, never show '*** Rahasia') */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Total Stock</span>
            <p className="text-xl font-bold text-foreground mt-1">
              {formatNumber(product.stock)} {product.unit}
            </p>
          </CardContent>
        </Card>

        {SHOW_PRICE_IN_PRODUCT_MASTER && canViewPrices("products") && (
          <Card>
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Cost Price</span>
              <p className="text-xl font-bold text-foreground mt-1">
                {product.currency && product.currency !== "IDR" ? (
                  <span className="font-mono">
                    {product.currency} {formatNumber(product.costPrice)}
                  </span>
                ) : (
                  <MoneyDisplay amount={product.costPrice} />
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {SHOW_PRICE_IN_PRODUCT_MASTER && canViewPrices("products") && (
          <Card>
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Selling Price</span>
              <p className="text-xl font-bold text-brand-primary mt-1">
                {product.currency && product.currency !== "IDR" ? (
                  <span className="font-mono text-brand-primary">
                    {product.currency} {formatNumber(product.sellingPrice)}
                  </span>
                ) : (
                  <MoneyDisplay amount={product.sellingPrice} highlight />
                )}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Safety Stock</span>
            <p className="text-xl font-bold text-foreground mt-1">
              {product.safetyStock
                ? `${formatNumber(product.safetyStock)} ${product.unit}`
                : stockQuery.isError
                ? "Tidak tersedia"
                : stockQuery.isPending
                ? "Memuat..."
                : stockQuery.data.length
                ? `${formatNumber(stockQuery.data.reduce((sum, item) => sum + item.minStock, 0))} ${product.unit}`
                : "Belum diatur"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Specs Card (Certifications & Packaging Specs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Certifications Overview */}
        <Card>
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Award className="h-4 w-4 text-emerald-600" />
              Sertifikasi Produk
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {certList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Tanpa Sertifikasi (Non-Certified)</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {certList.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200"
                  >
                    <PackageCheck className="h-3 w-3 text-emerald-600" />
                    {c}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Packaging or Spec Overview */}
        <Card>
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Box className="h-4 w-4 text-amber-600" />
              Spesifikasi Kemasan / Dimensi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {product.dimensionLength || product.dimensionWidth || product.dimensionHeight ? (
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Ukuran Dimensi (PxLxT):</span>
                <span className="font-semibold text-foreground">
                  {product.dimensionLength || 0} × {product.dimensionWidth || 0} × {product.dimensionHeight || 0} cm
                </span>
              </div>
            ) : null}

            {product.packagingType && (
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Tipe Kemasan:</span>
                <span className="font-semibold text-foreground">{product.packagingType}</span>
              </div>
            )}

            {product.packagingSpec && (
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Spesifikasi Gelombang / Layer:</span>
                <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                  {product.packagingSpec}
                </span>
              </div>
            )}

            {product.remarks && (
              <div className="py-1">
                <span className="text-muted-foreground block">Catatan / Remark:</span>
                <p className="font-normal text-foreground mt-0.5">{product.remarks}</p>
              </div>
            )}

            {!product.packagingSpec && !product.dimensionLength && !product.remarks && (
              <p className="text-muted-foreground italic">Tidak ada spesifikasi kemasan khusus.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs View */}
      <Tabs defaultValue="warehouse">
        <TabsList>
          <TabsTrigger value="warehouse">Warehouse Breakdown</TabsTrigger>
          <TabsTrigger value="movements">Recent Stock Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="warehouse">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-brand-primary" /> Stock by Warehouse
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse Name</TableHead>
                    <TableHead className="text-right">Reserved Qty</TableHead>
                    <TableHead className="text-right">Available Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockQuery.isPending && (
                    <TableRow>
                      <TableCell colSpan={3}>Memuat stok gudang...</TableCell>
                    </TableRow>
                  )}
                  {stockQuery.isError && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <span role="alert">{stockQuery.error.message}</span>{" "}
                        <Button variant="outline" onClick={() => stockQuery.refetch()}>
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                  {stockQuery.isSuccess && !stockQuery.data.length && (
                    <TableRow>
                      <TableCell colSpan={3}>Belum ada stok gudang untuk barang ini.</TableCell>
                    </TableRow>
                  )}
                  {!stockQuery.isError &&
                    stockQuery.data?.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-semibold text-xs text-foreground">{w.warehouseName}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatNumber(w.reserved)} {product.unit}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs">
                          {formatNumber(w.available)} {product.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-brand-primary" /> Audit Trail & Movements
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Movement Type</TableHead>
                    <TableHead>Reference Document</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Logged By</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsQuery.isPending && (
                    <TableRow>
                      <TableCell colSpan={6}>Memuat mutasi stok...</TableCell>
                    </TableRow>
                  )}
                  {movementsQuery.isError && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <span role="alert">{movementsQuery.error.message}</span>{" "}
                        <Button variant="outline" onClick={() => movementsQuery.refetch()}>
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                  {movementsQuery.isSuccess && !movementsQuery.data.length && (
                    <TableRow>
                      <TableCell colSpan={6}>Belum ada mutasi stok untuk barang ini.</TableCell>
                    </TableRow>
                  )}
                  {!movementsQuery.isError &&
                    movementsQuery.data?.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.createdAt ? new Date(m.createdAt).toLocaleString("id-ID") : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground">{m.type}</TableCell>
                        <TableCell className="font-mono text-xs text-brand-indigo">{m.reference || "—"}</TableCell>
                        <TableCell className="text-xs">{m.warehouseName || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.createdBy || "—"}</TableCell>
                        <TableCell
                          className={`text-right font-bold text-xs ${
                            m.quantity >= 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {m.quantity > 0 ? "+" : ""}
                          {formatNumber(m.quantity)} {product.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!isSaving && !bufferSaving) setIsEditOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProduct} className="space-y-4">
            {saveError && (
              <p role="alert" className="text-sm text-rose-700">
                {saveError}
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama Produk *</label>
              <Input
                value={editName ?? product.name}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-medium">
                SKU *
                <Input
                  value={editFields.sku ?? product.sku}
                  onChange={(e) => setEditFields((current) => ({ ...current, sku: e.target.value }))}
                  maxLength={50}
                  required
                />
              </label>
              <label className="text-xs font-medium">
                Barcode
                <Input
                  value={editFields.barcode ?? product.barcode ?? ""}
                  onChange={(e) => setEditFields((current) => ({ ...current, barcode: e.target.value }))}
                  maxLength={100}
                />
              </label>
              <label className="text-xs font-medium">
                Kategori *
                <select
                  className="h-10 w-full rounded-lg border px-3 bg-white"
                  value={editFields.category ?? product.category}
                  onChange={(e) => setEditFields((current) => ({ ...current, category: e.target.value }))}
                  required
                  disabled={categoriesQuery.isPending || categoriesQuery.isError}
                >
                  <option value={product.category}>{product.category}</option>
                  {categoriesQuery.data
                    ?.filter((item) => item.name !== product.category)
                    .map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-xs font-medium">
                UoM / Satuan *
                <select
                  className="h-10 w-full rounded-lg border px-3 bg-white"
                  value={editFields.unit ?? product.unit}
                  onChange={(e) => setEditFields((current) => ({ ...current, unit: e.target.value }))}
                  required
                  disabled={unitsQuery.isPending || unitsQuery.isError}
                >
                  <option value={product.unit}>{product.unit}</option>
                  {unitsQuery.data
                    ?.filter((item) => (item.symbol || item.name) !== product.unit)
                    .map((item) => (
                      <option key={item.id} value={item.symbol || item.name}>
                        {item.name} ({item.symbol || item.name})
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-medium">
                Grade Mutu Gula Kelapa
                <select
                  className="h-10 w-full rounded-lg border px-3 bg-white"
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                >
                  <option value="">Tanpa Grade</option>
                  <option value="A">Grade A (Super/Premium)</option>
                  <option value="B">Grade B (Standar)</option>
                  <option value="C">Grade C (Off-grade/Lokal)</option>
                  <option value="Reject">Reject / Rework</option>
                </select>
              </label>

              <label className="text-xs font-medium">
                Mata Uang Acuan
                <select
                  className="h-10 w-full rounded-lg border px-3 bg-white"
                  value={editFields.currency ?? product.currency ?? "IDR"}
                  onChange={(e) => setEditFields((current) => ({ ...current, currency: e.target.value }))}
                >
                  {currenciesQuery.data?.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                  {!currenciesQuery.data?.some((c) => c.code === "IDR") && <option value="IDR">IDR</option>}
                  {!currenciesQuery.data?.some((c) => c.code === "USD") && <option value="USD">USD</option>}
                  {!currenciesQuery.data?.some((c) => c.code === "CNY") && <option value="CNY">CNY</option>}
                </select>
              </label>
            </div>

            {/* Sertifikasi Selection */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-emerald-600" />
                Sertifikasi Produk
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {certsQuery.data?.map((cert) => {
                  const isChecked = editSelectedCerts.includes(cert.code);
                  return (
                    <button
                      key={cert.id}
                      type="button"
                      onClick={() => toggleEditCert(cert.code)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-foreground border-border hover:border-emerald-500"
                      }`}
                    >
                      <span className="text-[10px]">{isChecked ? "✓" : "+"}</span>
                      {cert.name} ({cert.code})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Packaging Fields */}
            {isPackagingCategory && (
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Box className="h-3.5 w-3.5 text-amber-700" />
                  Spesifikasi Kemasan
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium">
                    Tipe Kemasan
                    <select
                      className="h-10 w-full rounded-lg border px-3 bg-white"
                      value={editFields.packagingType ?? product.packagingType ?? "Box"}
                      onChange={(e) => {
                        const type = e.target.value;
                        const spec = type === "Box" ? "1 Gelombang" : type === "Sak" ? "2 Layer" : "";
                        setEditFields((current) => ({ ...current, packagingType: type, packagingSpec: spec }));
                      }}
                    >
                      <option value="Box">Box / Karton</option>
                      <option value="Sak">Sak / Karung</option>
                      <option value="Jerigen">Jerigen</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium">
                    Spesifikasi Gelombang / Layer
                    {(editFields.packagingType ?? product.packagingType) === "Box" ? (
                      <select
                        className="h-10 w-full rounded-lg border px-3 bg-white"
                        value={editFields.packagingSpec ?? product.packagingSpec ?? "1 Gelombang"}
                        onChange={(e) => setEditFields((current) => ({ ...current, packagingSpec: e.target.value }))}
                      >
                        <option value="1 Gelombang">1 Gelombang (Single Wall)</option>
                        <option value="2 Gelombang">2 Gelombang (Double Wall)</option>
                      </select>
                    ) : (editFields.packagingType ?? product.packagingType) === "Sak" ? (
                      <select
                        className="h-10 w-full rounded-lg border px-3 bg-white"
                        value={editFields.packagingSpec ?? product.packagingSpec ?? "2 Layer"}
                        onChange={(e) => setEditFields((current) => ({ ...current, packagingSpec: e.target.value }))}
                      >
                        <option value="2 Layer">2 Layer (Kraft + PE)</option>
                        <option value="3 Layer">3 Layer (Kraft + Kraft + PE)</option>
                      </select>
                    ) : (
                      <Input
                        value={editFields.packagingSpec ?? product.packagingSpec ?? ""}
                        onChange={(e) => setEditFields((current) => ({ ...current, packagingSpec: e.target.value }))}
                      />
                    )}
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-xs font-medium">
                    Panjang (cm)
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      value={editFields.dimensionLength ?? product.dimensionLength ?? 0}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setEditFields((current) => ({ ...current, dimensionLength: Number(e.target.value) }))
                      }
                    />
                  </label>
                  <label className="text-xs font-medium">
                    Lebar (cm)
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      value={editFields.dimensionWidth ?? product.dimensionWidth ?? 0}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setEditFields((current) => ({ ...current, dimensionWidth: Number(e.target.value) }))
                      }
                    />
                  </label>
                  <label className="text-xs font-medium">
                    Tinggi (cm)
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      value={editFields.dimensionHeight ?? product.dimensionHeight ?? 0}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setEditFields((current) => ({ ...current, dimensionHeight: Number(e.target.value) }))
                      }
                    />
                  </label>
                </div>
                <label className="text-xs font-medium block">
                  Keterangan / Remark Kemasan
                  <Input
                    value={editFields.remarks ?? product.remarks ?? ""}
                    onChange={(e) => setEditFields((current) => ({ ...current, remarks: e.target.value }))}
                    placeholder="mis. Kraft coklat 150 GSM, printing logo"
                  />
                </label>
              </div>
            )}

            {/* Price Inputs (Only shown if authorized; no 'Rahasia' text shown to staff) */}
            {SHOW_PRICE_IN_PRODUCT_MASTER && canViewPrices("products") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Cost Price ({editFields.currency ?? product.currency ?? "IDR"})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={editCostPrice ?? String(product.costPrice)}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditCostPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Selling Price ({editFields.currency ?? product.currency ?? "IDR"})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={editSellingPrice ?? String(product.sellingPrice)}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditSellingPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving || bufferSaving}
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSaving || bufferSaving}>
                {isSaving ? "Menyimpan..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>

          <section className="border-t pt-4 space-y-3">
            <h3 className="font-semibold">Safety Stock per Gudang</h3>
            <p className="text-xs text-muted-foreground">
              Atur batas minimum dan maksimum per gudang. Pengaturan ini disimpan dengan tombol terpisah dan tidak
              mengubah stok fisik.
            </p>
            <fieldset
              disabled={
                bufferSaving ||
                stockQuery.isPending ||
                stockQuery.isError ||
                warehousesQuery.isPending ||
                warehousesQuery.isError
              }
              className="space-y-3"
            >
              <label className="text-xs font-medium">
                Gudang
                <select
                  className="h-10 w-full rounded-lg border px-3 bg-white"
                  value={bufferWarehouse}
                  onChange={(e) => {
                    setBufferWarehouse(e.target.value);
                    setBufferMessage("");
                    const level = stockQuery.data?.find((item) => item.warehouseId === e.target.value);
                    setBufferMin(String(level?.minStock ?? 0));
                    setBufferMax(String(level?.maxStock ?? 0));
                  }}
                >
                  <option value="">Pilih gudang</option>
                  {warehousesQuery.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium">
                  Safety Stock / Minimum
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={bufferMin}
                    onChange={(e) => setBufferMin(e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium">
                  Maximum (0 = tanpa batas)
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={bufferMax}
                    onChange={(e) => setBufferMax(e.target.value)}
                  />
                </label>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!bufferWarehouse || isSaving}
                onClick={saveBuffer}
              >
                {bufferSaving ? "Menyimpan..." : "Save Safety Stock"}
              </Button>
            </fieldset>
            {(stockQuery.isError || warehousesQuery.isError) && (
              <p role="alert" className="text-sm text-rose-700">
                Gagal memuat pengaturan gudang.{" "}
                <Button
                  variant="outline"
                  onClick={() => {
                    void stockQuery.refetch();
                    void warehousesQuery.refetch();
                  }}
                >
                  Retry
                </Button>
              </p>
            )}
            {warehousesQuery.isSuccess && !warehousesQuery.data.length && (
              <p className="text-sm">Tambahkan gudang di Inventory terlebih dahulu.</p>
            )}
            {bufferMessage && (
              <p role="status" className="text-sm text-emerald-600">
                {bufferMessage}
              </p>
            )}
          </section>
        </DialogContent>
      </Dialog>
    </div>
  );
}
