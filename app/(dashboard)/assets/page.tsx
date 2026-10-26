"use client";

import * as React from "react";
import { Plus, RefreshCw, Search, Building2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { assetsApi, AssetItem, CreateAssetInput, AssetFundingSource } from "@/lib/api/assets";

export default function AssetsPage() {
  const [assets, setAssets] = React.useState<AssetItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState<CreateAssetInput>({
    assetCode: "",
    name: "",
    category: "Peralatan",
    location: "Kantor Pusat",
    purchaseDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()),
    purchasePrice: 0,
    usefulLifeYears: 4,
    fundingSource: "cash" as AssetFundingSource,
  });

  const fetchAssets = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assetsApi.listAssets({ search: search || undefined });
      setAssets(res.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat daftar aktiva");
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.purchasePrice <= 0 || formData.usefulLifeYears <= 0) {
      alert("Mohon lengkapi data aktiva dengan benar.");
      return;
    }
    try {
      setSubmitting(true);
      await assetsApi.createAsset(formData);
      setIsCreateOpen(false);
      setFormData({
        assetCode: "",
        name: "",
        category: "Peralatan",
        location: "Kantor Pusat",
        purchaseDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()),
        purchasePrice: 0,
        usefulLifeYears: 4,
        fundingSource: "cash",
      });
      fetchAssets();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal menambahkan aktiva");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculateAll = async () => {
    if (!window.confirm("Hitung ulang depresiasi untuk semua aktiva tetap?")) return;
    try {
      setLoading(true);
      await assetsApi.recalculateAllDepreciation();
      fetchAssets();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal menghitung ulang depresiasi");
      setLoading(false);
    }
  };

  // Metrics summary
  const totalAssets = assets.length;
  const totalCost = assets.reduce((sum, a) => sum + (Number(a.purchasePrice) || 0), 0);
  const totalBookValue = assets.reduce((sum, a) => sum + (Number(a.currentBookValue) || 0), 0);
  const totalAccumDepr = assets.reduce((sum, a) => sum + (Number(a.accumulatedDepreciation) || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Aktiva Tetap"
        description="Kelola aset tetap, nilai buku, dan inventaris aktiva perusahaan"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRecalculateAll} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Hitung Depresiasi
          </Button>
          <Button variant="gradient" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Aktiva
          </Button>
        </div>
      </PageHeader>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Aktiva</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{totalAssets}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Harga Perolehan</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              <MoneyDisplay amount={totalCost} />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Akumulasi Penyusutan</div>
            <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              <MoneyDisplay amount={totalAccumDepr} />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Nilai Buku</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              <MoneyDisplay amount={totalBookValue} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari kode atau nama aktiva..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table List */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama Aktiva</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Tgl Perolehan</th>
                <th className="px-4 py-3 text-right">Harga Beli</th>
                <th className="px-4 py-3 text-right">Akumulasi Depr.</th>
                <th className="px-4 py-3 text-right">Nilai Buku</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Memuat data aktiva...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Building2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    Belum ada data aktiva tetap.
                  </td>
                </tr>
              ) : (
                assets.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {item.assetCode || "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {item.location || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {item.purchaseDate ? item.purchaseDate.slice(0, 10) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      <MoneyDisplay amount={item.purchasePrice} />
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                      <MoneyDisplay amount={item.accumulatedDepreciation} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      <MoneyDisplay amount={item.currentBookValue} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === "active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : item.status === "disposed"
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {item.status === "active" ? "Aktif" : item.status === "disposed" ? "Dijual/Dilepas" : item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Dialog Form Tambah Aktiva */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Tambah Aktiva Tetap Baru
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Kode Aktiva (Opsional)</label>
                <Input
                  placeholder="Contoh: AST-2025-001"
                  value={formData.assetCode}
                  onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Nama Aktiva *</label>
                <Input
                  placeholder="Contoh: Laptop Macbook Pro M3"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Kategori</label>
                  <Input
                    placeholder="Contoh: Peralatan Kantor"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Lokasi</label>
                  <Input
                    placeholder="Contoh: Kantor Pusat"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Tanggal Perolehan</label>
                  <Input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Masa Manfaat (Tahun)</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.usefulLifeYears}
                    onChange={(e) => setFormData({ ...formData, usefulLifeYears: Number(e.target.value) })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Harga Perolehan (Rp) *</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.purchasePrice || ""}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Sumber Dana</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    value={formData.fundingSource}
                    onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value as AssetFundingSource })}
                  >
                    <option value="cash">Kas / Bank</option>
                    <option value="payable">Hutang Usaha</option>
                    <option value="equity">Modal / Ekuitas</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
                  Batal
                </Button>
                <Button type="submit" variant="gradient" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan Aktiva"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
