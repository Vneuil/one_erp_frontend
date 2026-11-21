"use client";

import * as React from "react";
import {
  PackageCheck,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Boxes,
  Weight,
  Sparkles,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  manufacturingApi,
  ProductionOutputReportItem,
  CreateLHPInput,
  CreateLHPItemInput,
} from "@/lib/api/manufacturing";
import { exportLHPExcel } from "@/lib/utils/export-wip-excel";

export default function ManufacturingLHPPage() {
  const [reports, setReports] = React.useState<ProductionOutputReportItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Dialog state
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [selectedReport, setSelectedReport] = React.useState<ProductionOutputReportItem | null>(null);

  // Form State
  const [fairtradeStatus, setFairtradeStatus] = React.useState<string>("NON FAIRTRADE");
  const [certifications, setCertifications] = React.useState<string>("ORGANIC EU, USDA, JAS");
  const [packingDate, setPackingDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [packingStartTime, setPackingStartTime] = React.useState<string>("08:00");
  const [packingEndTime, setPackingEndTime] = React.useState<string>("16:30");
  const [productionPic, setProductionPic] = React.useState<string>("Tim Produksi");
  const [adminPic, setAdminPic] = React.useState<string>("Sari Dwi A.");
  const [evaluationNotes, setEvaluationNotes] = React.useState<string>("");

  const [items, setItems] = React.useState<CreateLHPItemInput[]>([
    {
      itemNo: 1,
      rawMaterialCode: "RM-GSO-01",
      productName: "Organic Coconut Sugar 25kg",
      batchNo: "BATCH-202611-001",
      unitPcs: 40,
      primaryPackagingType: "Plastik PE Food Grade",
      primaryPackagingCode: "PE-25KG",
      secondaryPackagingType: "Sak Kertas Kraft",
      secondaryPackagingCode: "SAK-KRAFT-01",
      weightPerPackKg: 25.0,
      totalWeightKg: 1000.0,
      stickerNo: "STK-001 s/d STK-040",
      remainingStockKg: 12.5,
      buyerName: "Eco Organic BV",
      notes: "Kualitas baik, kadar air 1.8%",
    },
  ]);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await manufacturingApi.listLHP({
        batchNo: searchQuery || undefined,
        status: statusFilter || undefined,
      });
      if (res.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat daftar LHP:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemNo: prev.length + 1,
        rawMaterialCode: "",
        productName: "Organic Coconut Sugar 25kg",
        batchNo: "",
        unitPcs: 1,
        primaryPackagingType: "Plastik PE",
        secondaryPackagingType: "Sak Kertas",
        weightPerPackKg: 25.0,
        totalWeightKg: 25.0,
        stickerNo: "",
        remainingStockKg: 0,
        buyerName: "",
        notes: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof CreateLHPItemInput, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: val };
      if (field === "unitPcs" || field === "weightPerPackKg") {
        const pcs = field === "unitPcs" ? Number(val) : target.unitPcs;
        const weight = field === "weightPerPackKg" ? Number(val) : target.weightPerPackKg;
        target.totalWeightKg = pcs * weight;
      }
      updated[index] = target;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: CreateLHPInput = {
        fairtradeStatus,
        certifications,
        packingDate,
        packingStartTime,
        packingEndTime,
        productionPic,
        adminPic,
        evaluationNotes,
        items,
      };
      await manufacturingApi.createLHP(payload);
      setIsOpen(false);
      await loadData();
    } catch (err) {
      console.error("Gagal membuat LHP:", err);
      alert("Gagal menyimpan Laporan Hasil Produksi: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateLST = async (reportId: string) => {
    if (!confirm("Buat Laporan Serah Terima (LST) ke Gudang berdasarkan LHP ini?")) return;
    try {
      await manufacturingApi.generateLSTFromLHP(reportId);
      alert("LST berhasil dibuat! Silakan cek menu Laporan Serah Terima (LST) untuk serah terima ke Gudang.");
      await loadData();
    } catch (err) {
      alert("Gagal membuat LST: " + (err as Error).message);
    }
  };

  // Metrics
  const totalWeight = reports.reduce((acc, r) => acc + (r.totalWeightKg || 0), 0);
  const totalPcs = reports.reduce((acc, r) => acc + (r.totalQuantityPcs || 0), 0);
  const transferredCount = reports.filter((r) => r.status === "transferred").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Hasil Produksi (LHP)"
        description="Formulir resmi PRO-002-LHP pencatatan output riil proses packing dan persiapan serah terima ke Gudang WIP"
      >
        <div className="flex gap-2">
          <Button onClick={() => setIsOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Catat LHP Baru
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Output Riil</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-700">{totalWeight.toLocaleString()} <span className="text-sm font-normal">Kg</span></h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
              <Weight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Kemasan Selesai</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-700">{totalPcs.toLocaleString()} <span className="text-sm font-normal">Pcs</span></h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
              <Boxes className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Telah Diserahterimakan (LST)</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-700">{transferredCount} <span className="text-sm font-normal">LHP</span></h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-full text-purple-600">
              <ArrowRight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Dokumen LHP</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-700">{reports.length} <span className="text-sm font-normal">Dokumen</span></h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-full text-amber-600">
              <PackageCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex flex-1 gap-2 w-full md:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nomor batch atau produk..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="border rounded-md px-3 text-sm bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="completed">Completed (Siap LST)</option>
                <option value="transferred">Transferred ke LST</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4 text-left">No. LHP</th>
                  <th className="py-3 px-4 text-left">Tgl Packing</th>
                  <th className="py-3 px-4 text-left">Fairtrade / Sertifikasi</th>
                  <th className="py-3 px-4 text-left">Rincian Produk & Batch</th>
                  <th className="py-3 px-4 text-right">Kemasan</th>
                  <th className="py-3 px-4 text-right">Total Berat</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Memuat data LHP...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Belum ada Laporan Hasil Produksi (PRO-002-LHP) yang dicatat.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono font-medium text-emerald-700">
                        {r.reportNo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{r.packingDate}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.packingStartTime || "-"} s/d {r.packingEndTime || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {r.fairtradeStatus}
                        </span>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                          {r.certifications}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {(r.items || []).map((it, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">{it.productName}</span>{" "}
                            <span className="font-mono text-muted-foreground">({it.batchNo})</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {r.totalQuantityPcs} Pcs
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {r.totalWeightKg.toLocaleString()} Kg
                      </td>
                      <td className="py-3 px-4 text-center">
                        {r.status === "transferred" ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Transferred (LST)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                            <Sparkles className="h-3 w-3" /> Siap LST
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => exportLHPExcel(r)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Excel
                          </Button>
                          {r.status !== "transferred" && (
                            <Button
                              size="sm"
                              className="h-8 gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => handleGenerateLST(r.id)}
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                              Serah Terima (LST)
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Input LHP */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
              Laporan Hasil Produksi (PRO-002-LHP)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/20 p-3 rounded-lg border">
              <div>
                <label className="text-xs font-medium">Status Fairtrade</label>
                <select
                  className="w-full mt-1 border rounded px-3 py-1.5 text-sm bg-background"
                  value={fairtradeStatus}
                  onChange={(e) => setFairtradeStatus(e.target.value)}
                >
                  <option value="NON FAIRTRADE">NON FAIRTRADE</option>
                  <option value="FAIRTRADE">FAIRTRADE</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium">Sertifikasi Produk</label>
                <select
                  className="w-full mt-1 border rounded px-3 py-1.5 text-sm bg-background"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                >
                  <option value="NATURAL">NATURAL</option>
                  <option value="ORGANIC EU">ORGANIC EU</option>
                  <option value="ORGANIC USDA / COR-NOP">ORGANIC USDA / COR-NOP</option>
                  <option value="ORGANIC JAS">ORGANIC JAS</option>
                  <option value="ORGANIC EU, USDA, JAS">ORGANIC EU, USDA, JAS (Multi)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium">Tanggal Packing</label>
                <Input
                  type="date"
                  className="mt-1"
                  value={packingDate}
                  onChange={(e) => setPackingDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium">Jam Mulai</label>
                <Input
                  type="time"
                  className="mt-1"
                  value={packingStartTime}
                  onChange={(e) => setPackingStartTime(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium">Jam Selesai</label>
                <Input
                  type="time"
                  className="mt-1"
                  value={packingEndTime}
                  onChange={(e) => setPackingEndTime(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium">Admin Produksi</label>
                <Input
                  className="mt-1"
                  value={adminPic}
                  onChange={(e) => setAdminPic(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Items Table */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold">Daftar Hasil Packing Barang Jadi</h4>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-card space-y-3 relative">
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="text-xs font-bold text-muted-foreground">Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs">Kode Bahan Baku</label>
                        <Input
                          placeholder="RM-GSO-01"
                          value={it.rawMaterialCode}
                          onChange={(e) => handleItemChange(idx, "rawMaterialCode", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Nama Produk Jadi</label>
                        <Input
                          placeholder="Organic Coconut Sugar 25kg"
                          value={it.productName}
                          onChange={(e) => handleItemChange(idx, "productName", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Nomor Batch</label>
                        <Input
                          placeholder="BATCH-202611-001"
                          value={it.batchNo}
                          onChange={(e) => handleItemChange(idx, "batchNo", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Nama Buyer</label>
                        <Input
                          placeholder="Eco Organic BV"
                          value={it.buyerName}
                          onChange={(e) => handleItemChange(idx, "buyerName", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs">Kemasan Primer</label>
                        <Input
                          placeholder="Plastik PE 25kg"
                          value={it.primaryPackagingType}
                          onChange={(e) => handleItemChange(idx, "primaryPackagingType", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs">Kemasan Sekunder</label>
                        <Input
                          placeholder="Sak Kertas Kraft"
                          value={it.secondaryPackagingType}
                          onChange={(e) => handleItemChange(idx, "secondaryPackagingType", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs">Unit (Pcs)</label>
                        <Input
                          type="number"
                          value={it.unitPcs}
                          onChange={(e) => handleItemChange(idx, "unitPcs", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Berat/Kemasan (Kg)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={it.weightPerPackKg}
                          onChange={(e) => handleItemChange(idx, "weightPerPackKg", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs">Nomor Stiker / Roll</label>
                        <Input
                          placeholder="STK-001 s/d 040"
                          value={it.stickerNo}
                          onChange={(e) => handleItemChange(idx, "stickerNo", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs">Sisa Bahan (Kg)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={it.remainingStockKg}
                          onChange={(e) => handleItemChange(idx, "remainingStockKg", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-emerald-700">Total Berat: {it.totalWeightKg} Kg</label>
                        <Input
                          placeholder="Keterangan..."
                          value={it.notes}
                          onChange={(e) => handleItemChange(idx, "notes", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Evaluasi Realisasi Packing</label>
              <Input
                placeholder="Bila hasil realisasi kurang dari batas minimal maka catat evaluasinya..."
                value={evaluationNotes}
                onChange={(e) => setEvaluationNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? "Menyimpan..." : "Simpan LHP (PRO-002-LHP)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
