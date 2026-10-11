"use client";

import * as React from "react";
import {
  Smartphone,
  Plus,
  Search,
  Filter,
  Download,
  QrCode,
  Building,
  Calendar,
  Layers,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/utils/csv";
import { MoneyDisplay } from "@/components/shared/money-display";
import { assetsApi, AssetItem as ApiAssetItem, AssetFundingSource } from "@/lib/api/assets";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AssetRecord {
  id: string;
  assetCode: string;
  name: string;
  category: "Machinery & Equipment" | "Vehicles" | "IT & Computers" | "Furniture & Office";
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  usefulLifeYears: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  status: "In Use" | "Maintenance" | "Disposed";
  acquisitionPosted: boolean;
  disposedAt?: string;
  disposalGainLoss: number;
}

const FUNDING_LABELS: Record<AssetFundingSource, string> = {
  cash: "Kas / Bank (dibayar tunai)",
  payable: "Hutang Usaha (belum dibayar)",
  equity: "Modal Pemilik (saldo awal)",
};

const mapAsset = (a: ApiAssetItem): AssetRecord => ({
  id: a.id,
  assetCode: a.assetCode,
  name: a.name,
  category: a.category as AssetRecord["category"],
  location: a.location,
  purchaseDate: a.purchaseDate,
  purchasePrice: a.purchasePrice,
  usefulLifeYears: a.usefulLifeYears,
  accumulatedDepreciation: a.accumulatedDepreciation,
  currentBookValue: a.currentBookValue,
  status: a.status as AssetRecord["status"],
  acquisitionPosted: Boolean(a.acquisitionPosted),
  disposedAt: a.disposedAt,
  disposalGainLoss: a.disposalGainLoss ?? 0,
});

export default function AssetsPage() {
  const [assets, setAssets] = React.useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [selectedAsset, setSelectedAsset] = React.useState<AssetRecord | null>(null);
  const [isNewAssetOpen, setIsNewAssetOpen] = React.useState(false);
  const [actioningId, setActioningId] = React.useState<string | null>(null);

  // Form State
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<AssetRecord["category"]>("Machinery & Equipment");
  const [location, setLocation] = React.useState("");
  const [price, setPrice] = React.useState(0);
  const [life, setLife] = React.useState(5);
  const [funding, setFunding] = React.useState<AssetFundingSource | "">("cash");

  // Acquisition / disposal journal dialog
  const [journalAction, setJournalAction] = React.useState<{ kind: "acquire" | "dispose"; asset: AssetRecord } | null>(null);
  const [actionFunding, setActionFunding] = React.useState<AssetFundingSource>("equity");
  const [actionDate, setActionDate] = React.useState("");
  const [actionProceeds, setActionProceeds] = React.useState(0);
  const [actionNotes, setActionNotes] = React.useState("");
  const [onCredit, setOnCredit] = React.useState(false);
  const [buyerName, setBuyerName] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);

  const openJournalAction = (kind: "acquire" | "dispose", asset: AssetRecord) => {
    setJournalAction({ kind, asset });
    setActionFunding("equity");
    setActionDate("");
    setActionProceeds(0);
    setActionNotes("");
    setOnCredit(false);
    setBuyerName("");
    setDueDate("");
    setActionError(null);
  };

  const submitJournalAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalAction) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const { kind, asset } = journalAction;
      const res =
        kind === "acquire"
          ? await assetsApi.postAcquisition(asset.id, actionFunding, actionDate || undefined)
          : await assetsApi.disposeAsset(asset.id, { date: actionDate || undefined, proceeds: Number(actionProceeds) || 0, notes: actionNotes || undefined, receivedIn: onCredit ? "receivable" : "cash", buyerName: onCredit ? buyerName : undefined, dueDate: onCredit && dueDate ? dueDate : undefined });
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? mapAsset(res.data) : a)));
      setJournalAction(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal memproses jurnal aset.");
    } finally {
      setActionBusy(false);
    }
  };

  React.useEffect(() => {
    assetsApi
      .listAssets()
      .then((res) => {
        setAssets((res.data || []).map(mapAsset));
      })
      .catch((err) => {
        console.error("Failed to load aset", err);
        setLoadError("Gagal memuat data aset dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleRecalculate = async (id: string) => {
    setActioningId(id);
    try {
      const res = await assetsApi.recalculateDepreciation(id);
      setAssets((prev) => prev.map((a) => (a.id === id ? mapAsset(res.data) : a)));
    } catch (err) {
            setNotice(err instanceof Error ? err.message : "Gagal menghitung ulang penyusutan.");
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleMaintenance = async (id: string, current: AssetRecord["status"]) => {
    const nextStatus = current === "Maintenance" ? "In Use" : "Maintenance";
    setActioningId(id);
    try {
      const res = await assetsApi.updateAssetStatus(id, nextStatus);
      setAssets((prev) => prev.map((a) => (a.id === id ? mapAsset(res.data) : a)));
    } catch (err) {
            setNotice(err instanceof Error ? err.message : "Gagal mengubah status aset.");
    } finally {
      setActioningId(null);
    }
  };

  const filtered = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.assetCode.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setFormError(null);
    try {
      const res = await assetsApi.createAsset({
        name,
        category,
        location,
        purchasePrice: Number(price) || 0,
        usefulLifeYears: Number(life) || 5,
        fundingSource: funding || undefined,
      });
      if (res.data) {
        setAssets((prev) => [mapAsset(res.data), ...prev]);
      }
      setIsNewAssetOpen(false);
      setName("");
      setLocation("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan aset.");
    }
  };

  const totalAcquisition = assets.reduce((acc, curr) => acc + curr.purchasePrice, 0);
  const totalDepreciation = assets.reduce((acc, curr) => acc + curr.accumulatedDepreciation, 0);
  const totalBookValue = assets.reduce((acc, curr) => acc + curr.currentBookValue, 0);

  const columns: Column<AssetRecord>[] = [
    {
      key: "assetCode",
      header: "Kode & Nama Aset",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.assetCode}</span>
          <div className="font-bold text-foreground text-xs mt-0.5">{row.name}</div>
          <div className="text-[11px] text-muted-foreground">{row.category}</div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Lokasi Penempatan",
      render: (row) => (
        <span className="text-xs text-foreground flex items-center gap-1.5">
          <Building className="h-3.5 w-3.5 text-brand-primary" />
          {row.location}
        </span>
      ),
    },
    {
      key: "purchasePrice",
      header: "Nilai Perolehan",
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-foreground"><MoneyDisplay amount={row.purchasePrice} /></div>
          <div className="text-[10px] text-muted-foreground">Beli: {row.purchaseDate}</div>
        </div>
      ),
    },
    {
      key: "accumulatedDepreciation",
      header: "Akumulasi Penyusutan",
      render: (row) => (
        <div className="text-xs space-y-0.5 text-rose-700 font-semibold">
          <div><MoneyDisplay amount={row.accumulatedDepreciation} /></div>
          <div className="text-[10px] text-muted-foreground font-normal">Masa: {row.usefulLifeYears} Tahun</div>
        </div>
      ),
    },
    {
      key: "currentBookValue",
      header: "Nilai Buku Saat Ini",
      render: (row) => (
        <span className="font-black text-xs text-brand-dark">
          <MoneyDisplay amount={row.currentBookValue} />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const styles: Record<string, string> = {
          "In Use": "bg-emerald-50 text-emerald-700 border-emerald-200",
          Maintenance: "bg-amber-50 text-amber-700 border-amber-200",
          Disposed: "bg-slate-100 text-slate-700 border-slate-200",
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[row.status]}`}>
            {row.status}
            {row.status === "Disposed" && row.disposedAt ? ` · ${row.disposedAt}` : ""}
          </span>
        );
      },
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedAsset(row)}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <QrCode className="h-3 w-3 text-brand-primary" />
            <span>Label QR</span>
          </Button>
          {row.status !== "Disposed" && (
            <>
              {row.acquisitionPosted ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openJournalAction("dispose", row)}
                  className="h-7 px-2 text-[11px] gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  <span>Jual / Lepas</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openJournalAction("acquire", row)}
                  className="h-7 px-2 text-[11px] gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <span>Jurnal Perolehan</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={actioningId === row.id}
                onClick={() => handleRecalculate(row.id)}
                className="h-7 px-2 text-[11px] gap-1 border-brand-indigo/30 text-brand-indigo hover:bg-brand-indigo/5"
              >
                <Layers className="h-3 w-3" />
                <span>Hitung Ulang</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={actioningId === row.id}
                onClick={() => handleToggleMaintenance(row.id, row.status)}
                className="h-7 px-2 text-[11px] gap-1 border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <Wrench className="h-3 w-3" />
                <span>{row.status === "Maintenance" ? "Set In Use" : "Set Maintenance"}</span>
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-brand-primary" />
            <span>Manajemen Aset Perusahaan & Depresiasi</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Registri aktiva tetap, perhitungan penyusutan periodik (garis lurus), nilai buku, lokasi, dan label QR code fisik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                "fixed-asset-report.csv",
                ["Kode Aset", "Nama", "Kategori", "Lokasi", "Tanggal Beli", "Harga Beli", "Umur Manfaat (Thn)", "Akum. Penyusutan", "Nilai Buku", "Status"],
                assets.map((a) => [
                  a.assetCode,
                  a.name,
                  a.category,
                  a.location,
                  a.purchaseDate,
                  a.purchasePrice,
                  a.usefulLifeYears,
                  a.accumulatedDepreciation,
                  a.currentBookValue,
                  a.status,
                ])
              )
            }
            className="h-9 gap-1.5 text-xs border-border"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Ekspor Buku Aset</span>
          </Button>

          <Button
            variant="gradient"
            size="sm"
            onClick={() => setIsNewAssetOpen(true)}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Aset Baru</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Nilai Perolehan Aset</span>
            <div className="text-2xl font-black text-foreground">
              <MoneyDisplay amount={totalAcquisition} />
            </div>
            <span className="text-[11px] text-muted-foreground">{assets.length} Unit Aktiva Tetap</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Akumulasi Depresiasi</span>
            <div className="text-2xl font-black text-rose-600">
              <MoneyDisplay amount={totalDepreciation} />
            </div>
            <span className="text-[11px] text-muted-foreground">Diposting Otomatis ke Jurnal Finansial</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Nilai Buku Bersih (Net Book Value)</span>
            <div className="text-2xl font-black text-emerald-600">
              <MoneyDisplay amount={totalBookValue} />
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Tercatat pada Laporan Neraca
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex items-center gap-2 max-w-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari kode aset, nama, lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {loadError && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}
        {notice && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {notice}
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={filtered} columns={columns} />
        )}
      </div>

      {/* QR Code Modal */}
      {selectedAsset && (
        <Dialog open={Boolean(selectedAsset)} onOpenChange={() => setSelectedAsset(null)}>
          <DialogContent className="max-w-xs text-center">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center justify-center gap-1.5">
                <QrCode className="h-4 w-4 text-brand-primary" />
                <span>Label QR Code Aset Fisik</span>
              </DialogTitle>
            </DialogHeader>

            <div className="py-3 flex flex-col items-center space-y-3 bg-slate-50 p-4 rounded-xl border border-dashed border-border">
              <div className="p-3 bg-white rounded-lg border border-border shadow-xs">
                <QrCode className="h-32 w-32 text-brand-dark" />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-mono font-bold text-brand-dark">{selectedAsset.assetCode}</span>
                <p className="font-bold text-foreground">{selectedAsset.name}</p>
                <p className="text-[10px] text-muted-foreground">Lokasi: {selectedAsset.location}</p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="w-full text-xs h-8"
              >
                Cetak Label Fisik
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Tambah Aset */}
      <Dialog open={isNewAssetOpen} onOpenChange={setIsNewAssetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Registrasi Aset Tetap Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAsset} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Nama Aset / Alat *</label>
              <Input
                placeholder="Contoh: Mesin Strapping Band Otomatis"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Kategori Aset</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AssetRecord["category"])}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="Machinery & Equipment">Machinery & Equipment</option>
                  <option value="Vehicles">Vehicles & Transport</option>
                  <option value="IT & Computers">IT, Servers & Computers</option>
                  <option value="Furniture & Office">Furniture & Office Fixtures</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Lokasi Penempatan</label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Contoh: Pabrik Cikarang - Line A"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Harga Perolehan (IDR)</label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Masa Manfaat (Tahun)</label>
                <Input
                  type="number"
                  value={life}
                  onChange={(e) => setLife(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Pembayaran / Jurnal Perolehan</label>
              <select
                value={funding}
                onChange={(e) => setFunding(e.target.value as AssetFundingSource | "")}
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                {(Object.keys(FUNDING_LABELS) as AssetFundingSource[]).map((k) => (
                  <option key={k} value={k}>{FUNDING_LABELS[k]}</option>
                ))}
                <option value="">Jangan dijurnal dulu</option>
              </select>
              <p className="text-[10px] text-muted-foreground">Dijurnal: Debit Aktiva Tetap, Kredit sesuai pilihan. Aset tanpa jurnal perolehan tidak bisa dijual/dilepas.</p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewAssetOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Simpan Aset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Jurnal Perolehan / Penjualan Aset */}
      <Dialog open={Boolean(journalAction)} onOpenChange={(o) => !o && setJournalAction(null)}>
        <DialogContent className="max-w-md">
          {journalAction && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">
                  {journalAction.kind === "acquire" ? "Jurnal Perolehan Aset" : "Penjualan / Pelepasan Aset"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={submitJournalAction} className="space-y-3.5 text-xs text-left">
                {actionError && (
                  <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {actionError}
                  </div>
                )}
                <p className="text-muted-foreground">
                  <span className="font-mono font-bold text-brand-dark">{journalAction.asset.assetCode}</span> {journalAction.asset.name} · Perolehan{" "}
                  <MoneyDisplay amount={journalAction.asset.purchasePrice} />
                </p>
                {journalAction.kind === "acquire" ? (
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Sumber Dana</label>
                    <select
                      value={actionFunding}
                      onChange={(e) => setActionFunding(e.target.value as AssetFundingSource)}
                      className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                    >
                      {(Object.keys(FUNDING_LABELS) as AssetFundingSource[]).map((k) => (
                        <option key={k} value={k}>{FUNDING_LABELS[k]}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">Untuk aset lama yang sudah dimiliki, pilih Modal Pemilik (saldo awal).</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="font-bold text-foreground">Hasil Penjualan (IDR)</label>
                      <Input type="number" min={0} value={actionProceeds} onChange={(e) => setActionProceeds(Number(e.target.value))} className="h-9 text-xs" />
                      <p className="text-[10px] text-muted-foreground">Isi 0 untuk penghapusan tanpa hasil. Selisih terhadap nilai buku dijurnal sebagai laba/rugi pelepasan.</p>
                    </div>
                    <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={onCredit} onChange={(e) => setOnCredit(e.target.checked)} /> Dijual kredit (dicatat sebagai piutang)</label>
                    {onCredit && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1"><label className="font-bold text-foreground">Nama pembeli *</label><Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="h-9 text-xs" /></div>
                        <div className="space-y-1"><label className="font-bold text-foreground">Jatuh tempo (kosong = 30 hari)</label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-xs" /></div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="font-bold text-foreground">Keterangan</label>
                      <Input value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} className="h-9 text-xs" />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Tanggal (kosong = {journalAction.kind === "acquire" ? "tanggal beli" : "hari ini"})</label>
                  <Input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} className="h-9 text-xs" />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setJournalAction(null)} className="h-9 text-xs">Batal</Button>
                  <Button type="submit" variant="gradient" size="sm" disabled={actionBusy} className="h-9 text-xs font-bold">
                    {actionBusy ? "Memproses..." : journalAction.kind === "acquire" ? "Posting Jurnal" : "Jual / Lepas Aset"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
