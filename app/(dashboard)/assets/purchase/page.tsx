"use client";

import * as React from "react";
import { Plus, ArrowDownRight, ArrowUpRight, Search, Building2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { assetsApi, AssetItem, CreateAssetInput, AssetFundingSource } from "@/lib/api/assets";

export default function AssetPurchasePage() {
  const [assets, setAssets] = React.useState<AssetItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Modal Pembelian (Acquisition)
  const [isBuyOpen, setIsBuyOpen] = React.useState(false);
  const [buySubmitting, setBuySubmitting] = React.useState(false);
  const [buyForm, setBuyForm] = React.useState<CreateAssetInput>({
    assetCode: "",
    name: "",
    category: "Peralatan",
    location: "Kantor Pusat",
    purchaseDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()),
    purchasePrice: 0,
    usefulLifeYears: 4,
    fundingSource: "cash" as AssetFundingSource,
  });

  // Modal Penjualan/Pelepasan (Disposal)
  const [isSellOpen, setIsSellOpen] = React.useState(false);
  const [sellSubmitting, setSellSubmitting] = React.useState(false);
  const [selectedAsset, setSelectedAsset] = React.useState<AssetItem | null>(null);
  const [sellForm, setSellForm] = React.useState({
    proceeds: 0,
    receivedIn: "cash" as "cash" | "receivable",
    buyerName: "",
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()),
    notes: "",
  });

  const fetchAssets = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assetsApi.listAssets({ search: search || undefined });
      setAssets(res.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat transaksi aktiva");
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyForm.name || buyForm.purchasePrice <= 0 || buyForm.usefulLifeYears <= 0) {
      alert("Mohon lengkapi formulir pembelian aktiva dengan benar.");
      return;
    }
    try {
      setBuySubmitting(true);
      await assetsApi.createAsset(buyForm);
      setIsBuyOpen(false);
      setBuyForm({
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
      alert(e instanceof Error ? e.message : "Gagal mencatat pembelian aktiva");
    } finally {
      setBuySubmitting(false);
    }
  };

  const handleOpenSell = (asset: AssetItem) => {
    setSelectedAsset(asset);
    setSellForm({
      proceeds: Number(asset.currentBookValue) || 0,
      receivedIn: "cash",
      buyerName: "",
      date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()),
      notes: "",
    });
    setIsSellOpen(true);
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      setSellSubmitting(true);
      await assetsApi.disposeAsset(selectedAsset.id, {
        proceeds: Number(sellForm.proceeds),
        receivedIn: sellForm.receivedIn,
        buyerName: sellForm.buyerName || undefined,
        date: sellForm.date || undefined,
        notes: sellForm.notes || undefined,
      });
      setIsSellOpen(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal memproses pelepasan/penjualan aktiva");
    } finally {
      setSellSubmitting(false);
    }
  };

  // Metrics
  const activeAssets = assets.filter((a) => a.status === "active");
  const disposedAssets = assets.filter((a) => a.status === "disposed");
  const totalPurchaseValue = assets.reduce((sum, a) => sum + (Number(a.purchasePrice) || 0), 0);
  const totalDisposalProceeds = disposedAssets.reduce((sum, a) => sum + (Number(a.disposalProceeds) || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembelian & Penjualan Aktiva"
        description="Pencatatan perolehan aset baru dan pelepasan atau penjualan aktiva tetap"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="gradient" size="sm" onClick={() => setIsBuyOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Beli / Catat Aktiva Baru
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Transaksi Aktiva</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{assets.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Aktiva Aktif</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeAssets.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Nilai Perolehan</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              <MoneyDisplay amount={totalPurchaseValue} />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Hasil Penjualan Aktiva</div>
            <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              <MoneyDisplay amount={totalDisposalProceeds} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search */}
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

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama Aktiva</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Tgl Perolehan</th>
                <th className="px-4 py-3 text-right">Harga Beli</th>
                <th className="px-4 py-3 text-right">Nilai Buku</th>
                <th className="px-4 py-3 text-center">Status Transaksi</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat data...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    Belum ada riwayat transaksi aktiva.
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
                      {item.purchaseDate ? item.purchaseDate.slice(0, 10) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      <MoneyDisplay amount={item.purchasePrice} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      <MoneyDisplay amount={item.currentBookValue} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.status === "disposed" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                          <ArrowDownRight className="h-3 w-3" />
                          Terjual ({item.disposedAt?.slice(0, 10)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <ArrowUpRight className="h-3 w-3" />
                          Aktif Digunakan
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          onClick={() => handleOpenSell(item)}
                        >
                          Jual / Lepas
                        </Button>
                      )}
                      {item.status === "disposed" && (
                        <span className="text-xs text-slate-400">
                          Hasil: <MoneyDisplay amount={item.disposalProceeds || 0} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Beli Aktiva Baru */}
      {isBuyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Pencatatan Pembelian Aktiva Baru
            </h3>
            <form onSubmit={handleBuy} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Kode Aktiva (Opsional)</label>
                <Input
                  placeholder="Contoh: AST-2025-001"
                  value={buyForm.assetCode}
                  onChange={(e) => setBuyForm({ ...buyForm, assetCode: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Nama Aktiva *</label>
                <Input
                  placeholder="Contoh: Mesin Produksi Laser"
                  value={buyForm.name}
                  onChange={(e) => setBuyForm({ ...buyForm, name: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Kategori</label>
                  <Input
                    placeholder="Contoh: Mesin & Peralatan"
                    value={buyForm.category}
                    onChange={(e) => setBuyForm({ ...buyForm, category: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Lokasi</label>
                  <Input
                    placeholder="Contoh: Pabrik Utama"
                    value={buyForm.location}
                    onChange={(e) => setBuyForm({ ...buyForm, location: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Tanggal Pembelian</label>
                  <Input
                    type="date"
                    value={buyForm.purchaseDate}
                    onChange={(e) => setBuyForm({ ...buyForm, purchaseDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Masa Manfaat (Tahun)</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={buyForm.usefulLifeYears}
                    onChange={(e) => setBuyForm({ ...buyForm, usefulLifeYears: Number(e.target.value) })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Harga Beli / Perolehan (Rp) *</label>
                  <Input
                    type="number"
                    min="0"
                    value={buyForm.purchasePrice || ""}
                    onChange={(e) => setBuyForm({ ...buyForm, purchasePrice: Number(e.target.value) })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Sumber Pembiayaan</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    value={buyForm.fundingSource}
                    onChange={(e) => setBuyForm({ ...buyForm, fundingSource: e.target.value as AssetFundingSource })}
                  >
                    <option value="cash">Kas / Bank Langsung</option>
                    <option value="payable">Hutang Usaha (Kredit)</option>
                    <option value="equity">Setoran Modal / Ekuitas</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsBuyOpen(false)} disabled={buySubmitting}>
                  Batal
                </Button>
                <Button type="submit" variant="gradient" disabled={buySubmitting}>
                  {buySubmitting ? "Menyimpan..." : "Posting Pembelian"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Jual / Lepas Aktiva */}
      {isSellOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Jual / Lepas Aktiva
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {selectedAsset.name} ({selectedAsset.assetCode || "Tanpa Kode"}) — Nilai Buku Saat Ini: Rp {Number(selectedAsset.currentBookValue).toLocaleString("id-ID")}
            </p>
            <form onSubmit={handleSell} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Harga Jual / Nilai Pelepasan (Rp) *</label>
                <Input
                  type="number"
                  min="0"
                  value={sellForm.proceeds || ""}
                  onChange={(e) => setSellForm({ ...sellForm, proceeds: Number(e.target.value) })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Metode Penerimaan</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  value={sellForm.receivedIn}
                  onChange={(e) => setSellForm({ ...sellForm, receivedIn: e.target.value as "cash" | "receivable" })}
                >
                  <option value="cash">Kas / Bank Tunai</option>
                  <option value="receivable">Piutang Usaha</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Nama Pembeli (Opsional)</label>
                <Input
                  placeholder="Contoh: PT Pembeli Utama"
                  value={sellForm.buyerName}
                  onChange={(e) => setSellForm({ ...sellForm, buyerName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Tanggal Pelepasan</label>
                <Input
                  type="date"
                  value={sellForm.date}
                  onChange={(e) => setSellForm({ ...sellForm, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Keterangan / Alasan</label>
                <Input
                  placeholder="Contoh: Dijual karena peremajaan unit"
                  value={sellForm.notes}
                  onChange={(e) => setSellForm({ ...sellForm, notes: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsSellOpen(false)} disabled={sellSubmitting}>
                  Batal
                </Button>
                <Button type="submit" variant="destructive" disabled={sellSubmitting}>
                  {sellSubmitting ? "Memproses..." : "Konfirmasi Jual / Lepas"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
