"use client";

import { SHOW_PRICE_IN_PRODUCT_MASTER } from "@/lib/roles";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Package, Award, Coins, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

import {
  productsApi,
  productCategoriesApi,
  unitsOfMeasureApi,
  certificationsApi,
  ProductItem,
  CertificationItem,
} from "@/lib/api/products";
import { currencyApi, CurrencyItem, ExchangeRateItem } from "@/lib/api/currency";
import { formatNumber } from "@/lib/utils";

export default function NewProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [baseProducts, setBaseProducts] = React.useState<ProductItem[]>([]);
  const [variantOf, setVariantOf] = React.useState("");
  const [variantLabel, setVariantLabel] = React.useState("");
  const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(true);
  const [availableUnits, setAvailableUnits] = React.useState<{ name: string; symbol: string }[]>([
    { name: "Kilogram", symbol: "KG" },
    { name: "Pieces", symbol: "Pcs" },
    { name: "Roll", symbol: "Roll" },
    { name: "Unit", symbol: "Unit" },
    { name: "Box", symbol: "Box" },
    { name: "Meter", symbol: "Meter" },
  ]);

  const [availableCertifications, setAvailableCertifications] = React.useState<CertificationItem[]>([]);
  const [selectedCertifications, setSelectedCertifications] = React.useState<string[]>([]);

  const [currencies, setCurrencies] = React.useState<CurrencyItem[]>([]);
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRateItem[]>([]);

  React.useEffect(() => {
    productsApi
      .list({ perPage: 500 })
      .then((res) => setBaseProducts((res.data || []).filter((p) => !p.variantOf)))
      .catch((err) => console.error("Failed to load products for the variant picker", err));

    productCategoriesApi
      .list()
      .then((res) => {
        const names = (res.data || []).map((c) => c.name);
        setAvailableCategories(names);
        if (names.length > 0) {
          setFormData((prev) => {
            const currentCatValid = names.includes(prev.category);
            const chosen = currentCatValid ? prev.category : names[0];
            let nextSku = prev.sku;
            if (prev.sku === "PRD-RAW-" || prev.sku === "PRD-") {
              const lower = chosen.toLowerCase();
              if (lower.includes("raw") || lower.includes("bahan")) nextSku = "PRD-RAW-";
              else if (lower.includes("finish") || lower.includes("jadi")) nextSku = "PRD-FG-";
              else if (lower.includes("pack") || lower.includes("kemas")) nextSku = "PRD-PKG-";
              else if (lower.includes("comp")) nextSku = "PRD-CMP-";
              else if (lower.includes("wip") || lower.includes("brontol")) nextSku = "PRD-WIP-";
              else nextSku = `PRD-${chosen.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase()}-`;
            }
            return {
              ...prev,
              category: chosen,
              sku: nextSku,
            };
          });
        }
      })
      .catch((err) => console.error("Failed to load product categories", err))
      .finally(() => setIsLoadingCategories(false));

    unitsOfMeasureApi
      .list()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const uoms = res.data.map((u) => ({ name: u.name, symbol: u.symbol || u.name }));
          setAvailableUnits(uoms);
          setFormData((prev) => {
            const hasUnit = uoms.some((u) => u.symbol === prev.unit);
            return hasUnit ? prev : { ...prev, unit: uoms[0].symbol };
          });
        }
      })
      .catch((err) => console.error("Failed to load units of measure", err));

    certificationsApi
      .list()
      .then((res) => {
        if (res.data) setAvailableCertifications(res.data);
      })
      .catch(console.error);

    Promise.all([currencyApi.list(), currencyApi.listRates()])
      .then(([curRes, rateRes]) => {
        setCurrencies(curRes.data || []);
        setExchangeRates(rateRes.data || []);
      })
      .catch(console.error);
  }, []);

  const [formData, setFormData] = React.useState({
    sku: "PRD-RAW-",
    barcode: "",
    name: "",
    grade: "",
    category: "",
    unit: "KG",
    minStock: "10",
    costPrice: "",
    sellingPrice: "",
    currency: "IDR",
    // Packaging fields
    dimensionLength: "",
    dimensionWidth: "",
    dimensionHeight: "",
    packagingType: "Box",
    packagingSpec: "1 Gelombang",
    remarks: "",
  });

  // When category changes, auto adjust defaults
  const handleCategoryChange = (cat: string) => {
    let nextSku = formData.sku;
    if (formData.sku.startsWith("PRD-")) {
      const lower = cat.toLowerCase();
      if (lower.includes("raw") || lower.includes("bahan")) nextSku = "PRD-RAW-";
      else if (lower.includes("finish") || lower.includes("jadi")) nextSku = "PRD-FG-";
      else if (lower.includes("pack") || lower.includes("kemas")) nextSku = "PRD-PKG-";
      else if (lower.includes("comp")) nextSku = "PRD-CMP-";
      else if (lower.includes("wip") || lower.includes("brontol")) nextSku = "PRD-WIP-";
      else nextSku = `PRD-${cat.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase()}-`;
    }

    // Default currency: IDR for Raw Material & Packaging
    const lower = cat.toLowerCase();
    const nextCurrency = (lower.includes("raw") || lower.includes("bahan") || lower.includes("pack") || lower.includes("kemas")) ? "IDR" : formData.currency;

    setFormData((prev) => ({
      ...prev,
      category: cat,
      sku: nextSku,
      currency: nextCurrency,
    }));
  };

  const toggleCertification = (code: string) => {
    setSelectedCertifications((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Find latest exchange rate for selected currency
  const baseCurrency = currencies.find((c) => c.isBase)?.code || "IDR";
  const activeRate = exchangeRates.find((r) => r.currencyCode === formData.currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const certificationsStr = selectedCertifications.join(", ");
      await productsApi.create({
        sku: formData.sku,
        barcode: formData.barcode,
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        stock: Number(formData.minStock) || 0,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        currency: formData.currency,
        status: "Active",
        grade: formData.grade || undefined,
        safetyStock: Number(formData.minStock) || 0,
        certifications: certificationsStr || undefined,
        // Packaging specs
        dimensionLength: formData.dimensionLength ? Number(formData.dimensionLength) : undefined,
        dimensionWidth: formData.dimensionWidth ? Number(formData.dimensionWidth) : undefined,
        dimensionHeight: formData.dimensionHeight ? Number(formData.dimensionHeight) : undefined,
        packagingType: isPackaging ? formData.packagingType : undefined,
        packagingSpec: isPackaging ? formData.packagingSpec : undefined,
        remarks: formData.remarks || undefined,
        variantOf: variantOf || undefined,
        variantLabel: variantOf ? variantLabel : undefined,
      });
      router.push("/master-data/products");
    } catch (err) {
      alert("Gagal menambahkan produk: " + (err instanceof Error ? err.message : "Kesalahan server"));
      setIsSubmitting(false);
    }
  };

  const isPackaging = formData.category.toLowerCase().includes("pack") || formData.category.toLowerCase().includes("kemas");

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/master-data/products">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Create New Product"
        description="Daftarkan item / SKU baru ke dalam katalog master produk ERP."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: General Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-primary" />
              Informasi Umum
            </CardTitle>
            <CardDescription>Kode SKU, nama produk, kategori, dan satuan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">SKU / Item Code *</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="mis. PRD-RAW-005 atau PRD-FG-001"
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
                <select
                  value={variantOf}
                  onChange={(e) => setVariantOf(e.target.value)}
                  className="h-10 w-full rounded-lg border px-3 text-sm bg-white"
                >
                  <option value="">Bukan varian</option>
                  {baseProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              {variantOf && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Label varian *</label>
                  <Input
                    value={variantLabel}
                    onChange={(e) => setVariantLabel(e.target.value)}
                    placeholder="mis. Merah / L"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Nama Produk *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="mis. Gula Semut Kelapa Organik (Organic Coconut Sugar) 25kg"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Kategori *</label>
                  <Link
                    href="/master-data/categories-units"
                    target="_blank"
                    className="text-[11px] text-brand-primary hover:underline"
                  >
                    + Kelola Kategori
                  </Link>
                </div>
                {isLoadingCategories ? (
                  <div className="h-10 flex items-center px-3 border rounded-lg text-xs text-muted-foreground bg-slate-50">
                    Memuat kategori dari Master Data...
                  </div>
                ) : availableCategories.length === 0 ? (
                  <div className="p-2 border border-amber-200 bg-amber-50 rounded-lg text-xs text-amber-800">
                    Belum ada kategori di Master Data. Silakan{" "}
                    <Link href="/master-data/categories-units" className="underline font-bold">
                      tambah kategori
                    </Link>{" "}
                    terlebih dahulu.
                  </div>
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    required
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Satuan / UoM *</label>
                  <Link
                    href="/master-data/categories-units"
                    target="_blank"
                    className="text-[11px] text-brand-primary hover:underline"
                  >
                    + Kelola Satuan
                  </Link>
                </div>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  {availableUnits.map((u) => (
                    <option key={u.symbol} value={u.symbol}>
                      {u.symbol} ({u.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Grade Mutu Gula Kelapa</label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <option value="">Tanpa Grade</option>
                <option value="A">Grade A (Super/Premium)</option>
                <option value="B">Grade B (Standar)</option>
                <option value="C">Grade C (Off-grade/Lokal)</option>
                <option value="Reject">Reject / Rework</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Sertifikasi Produk (Feedback 1 & 6) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  Sertifikasi Produk
                </CardTitle>
                <CardDescription>
                  Pilih sertifikasi yang dimiliki oleh produk ini. Jika tidak dicentang, produk tercatat sebagai Tanpa Sertifikasi.
                </CardDescription>
              </div>
              <Link
                href="/master-data/certifications"
                target="_blank"
                className="text-xs text-brand-primary hover:underline font-semibold"
              >
                + Master Sertifikasi
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2.5">
              {availableCertifications.map((cert) => {
                const isChecked = selectedCertifications.includes(cert.code);
                return (
                  <button
                    key={cert.id}
                    type="button"
                    onClick={() => toggleCertification(cert.code)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isChecked
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-foreground border-border hover:border-emerald-500 hover:bg-emerald-50/50"
                    }`}
                  >
                    <span
                      className={`h-4 w-4 rounded flex items-center justify-center text-[10px] font-bold ${
                        isChecked ? "bg-white text-emerald-700" : "border border-muted-foreground/40"
                      }`}
                    >
                      {isChecked ? "✓" : ""}
                    </span>
                    <span>{cert.name}</span>
                    <span className={`text-[10px] opacity-80 ${isChecked ? "text-emerald-100" : "text-muted-foreground"}`}>
                      ({cert.code})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Status Sertifikasi:</span>
              <span className="font-semibold text-foreground">
                {selectedCertifications.length === 0 ? (
                  <span className="text-slate-500 italic">Tanpa Sertifikasi (Non-Certified)</span>
                ) : (
                  <span className="text-emerald-700">
                    {selectedCertifications.join(", ")} ({selectedCertifications.length} sertifikasi terpilih)
                  </span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Spesifikasi Kemasan / Packaging (Feedback 5) */}
        {isPackaging && (
          <Card className="border-amber-200 bg-amber-50/20">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-900">
                <Box className="h-4 w-4 text-amber-600" />
                Spesifikasi Kemasan (Packaging)
              </CardTitle>
              <CardDescription>
                Ukuran dimensi, jenis gelombang untuk Box, atau lapisan layer untuk Sak
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Bentuk / Tipe Kemasan</label>
                  <select
                    value={formData.packagingType}
                    onChange={(e) => {
                      const type = e.target.value;
                      const spec = type === "Box" ? "1 Gelombang" : type === "Sak" ? "2 Layer" : "";
                      setFormData({ ...formData, packagingType: type, packagingSpec: spec });
                    }}
                    className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <option value="Box">Box / Karton (Corrugated Box)</option>
                    <option value="Sak">Sak / Karung Kraft (Paper Sack)</option>
                    <option value="Jerigen">Jerigen / Drum Plastik</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    {formData.packagingType === "Box"
                      ? "Tipe Gelombang (Flute/Wall) *"
                      : formData.packagingType === "Sak"
                      ? "Jumlah Lapisan (Layer/Ply) *"
                      : "Spesifikasi Kemasan"}
                  </label>
                  {formData.packagingType === "Box" ? (
                    <select
                      value={formData.packagingSpec}
                      onChange={(e) => setFormData({ ...formData, packagingSpec: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <option value="1 Gelombang">1 Gelombang (Single Wall)</option>
                      <option value="2 Gelombang">2 Gelombang (Double Wall - Ekspor)</option>
                    </select>
                  ) : formData.packagingType === "Sak" ? (
                    <select
                      value={formData.packagingSpec}
                      onChange={(e) => setFormData({ ...formData, packagingSpec: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <option value="2 Layer">2 Layer (Kraft + Inner Plastik PE)</option>
                      <option value="3 Layer">3 Layer (Kraft + Kraft + Inner Plastik PE)</option>
                    </select>
                  ) : (
                    <Input
                      value={formData.packagingSpec}
                      onChange={(e) => setFormData({ ...formData, packagingSpec: e.target.value })}
                      placeholder="mis. Ketebalan 0.8 mm, Food Grade"
                    />
                  )}
                </div>
              </div>

              {/* Dimensi P x L x T */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Ukuran Dimensi (Panjang × Lebar × Tinggi dalam cm)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Panjang (P) cm</span>
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      value={formData.dimensionLength}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormData({ ...formData, dimensionLength: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Lebar (L) cm</span>
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      value={formData.dimensionWidth}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormData({ ...formData, dimensionWidth: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Tinggi (T) cm</span>
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      value={formData.dimensionHeight}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormData({ ...formData, dimensionHeight: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Keterangan / Remark Spesifikasi</label>
                <Input
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="mis. Kraft coklat 150 GSM, cetak logo 2 warna, inner plastik tebal 50 micron"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 4: Mata Uang & Harga (Feedback 2, 3, 7) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Coins className="h-4 w-4 text-brand-primary" />
                  Mata Uang & Valuasi Harga
                </CardTitle>
                <CardDescription>
                  {isPackaging || formData.category === "Raw Material"
                    ? "Mata uang terkunci ke Rupiah (IDR) untuk pengadaan bahan baku dan kemasan lokal."
                    : "Pilih mata uang katalog (IDR, USD, CNY) untuk Finished Goods ekspor atau acuan standar."}
                </CardDescription>
              </div>
              <Link
                href="/master-data/currencies"
                target="_blank"
                className="text-xs text-brand-primary hover:underline font-semibold"
              >
                + Master Mata Uang
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Mata Uang *</label>
                <select
                  value={formData.currency}
                  disabled={formData.category === "Raw Material" || isPackaging}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:bg-slate-100 disabled:text-muted-foreground"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name} {c.isBase ? "(Mata Uang Dasar)" : ""}
                    </option>
                  ))}
                  {!currencies.some((c) => c.code === "IDR") && <option value="IDR">IDR — Indonesian Rupiah</option>}
                  {!currencies.some((c) => c.code === "USD") && <option value="USD">USD — US Dollar</option>}
                  {!currencies.some((c) => c.code === "CNY") && <option value="CNY">CNY — Chinese Yuan</option>}
                </select>
                {formData.currency !== baseCurrency && activeRate && (
                  <p className="text-[11px] text-brand-primary font-semibold">
                    Kurs acuan: 1 {formData.currency} = Rp {formatNumber(activeRate.rateToBase)}
                  </p>
                )}
              </div>

              {/* Standard Cost Price (Feedback 7: input tidak default terkunci di 0) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Standard Cost Price ({formData.currency})
                </label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={formData.costPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  placeholder="0"
                />
                {formData.currency !== baseCurrency && activeRate && formData.costPrice && (
                  <p className="text-[10px] text-muted-foreground">
                    ≈ Rp {formatNumber(Number(formData.costPrice) * activeRate.rateToBase)}
                  </p>
                )}
              </div>

              {/* Selling Price (Feedback 7: input tidak default terkunci di 0) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Standard Selling Price ({formData.currency})
                </label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={formData.sellingPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  placeholder="0"
                />
                {formData.currency !== baseCurrency && activeRate && formData.sellingPrice && (
                  <p className="text-[10px] text-muted-foreground">
                    ≈ Rp {formatNumber(Number(formData.sellingPrice) * activeRate.rateToBase)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 max-w-xs">
              <label className="text-xs font-semibold text-foreground">Safety / Min Stock Alert</label>
              <Input
                type="number"
                min={0}
                value={formData.minStock}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                placeholder="10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button asChild variant="outline" type="button" disabled={isSubmitting}>
            <Link href="/master-data/products">Batal</Link>
          </Button>
          <Button type="submit" variant="gradient" className="gap-2 font-semibold" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
          </Button>
        </div>
      </form>
    </div>
  );
}
