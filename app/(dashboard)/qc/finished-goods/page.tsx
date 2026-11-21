"use client";

import * as React from "react";
import {
  PackageCheck,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Layers,
  Sparkles,
  Droplets,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  qcApi,
  FinishedGoodsInspectionItem,
  CreateFinishedGoodsInput,
} from "@/lib/api/qc";
import { exportFinishedGoodsToExcel } from "@/lib/utils/export-qc-excel";

export default function QCFinishedGoodsPage() {
  const [month, setMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [decisionFilter, setDecisionFilter] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Data states
  const [pjdLogs, setPjdLogs] = React.useState<FinishedGoodsInspectionItem[]>([]);

  // Dialog state
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  // Form state
  const [formData, setFormData] = React.useState<CreateFinishedGoodsInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    productName: "Gula Semut Kelapa Organik (Organic Coconut Sugar)",
    batchNo: "",
    rawMaterialCode: "RM-BRL-01",
    primaryPackaging: "Baik",
    secondaryPackaging: "Baik",
    netWeight: 25.0,
    grossWeight: 25.35,
    appearanceShape: "Serbuk/Butiran Kristal Homogen",
    aroma: "Khas Nira Gula Kelapa",
    colorScore: 2,
    colorDescription: "Normal",
    taste: "Manis Khas Alami",
    isFreeForeignMatter: true,
    foreignMatterNotes: "",
    moistureContent: 1.85,
    inspectionDecision: "lolos",
    notes: "",
    qcPersonnelName: "Staff QC",
    qaVerifiedBy: "Supervisor QA",
  });

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await qcApi.listFinishedGoodsLogs({
        month,
        decision: decisionFilter || undefined,
      });
      setPjdLogs(res.data || []);
    } catch (err) {
      console.error("Error fetching finished goods QC logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [month, decisionFilter]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit handler
  const handleSave = async () => {
    try {
      await qcApi.createFinishedGoodsLog(formData);
      setIsOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan pemeriksaan produk jadi: " + (err as Error).message);
    }
  };

  // Filtered logs by client-side search
  const filteredLogs = pjdLogs.filter(
    (log) =>
      log.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.documentNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pemeriksaan Kualitas Produk Jadi (PJD)"
        description="Pemeriksaan organoleptik, kemasan, batas kadar air ekspor (≤ 2.0%), dan penentuan kelulusan produk akhir (Form QC-004-PJD.05)"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportFinishedGoodsToExcel(filteredLogs)}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export Excel
          </Button>
          <Button
            size="sm"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 bg-primary"
          >
            <Plus className="h-4 w-4" />
            Pemeriksaan Produk Jadi Baru
          </Button>
        </div>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Bulan:</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setDecisionFilter("")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                decisionFilter === "" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua Keputusan
            </button>
            <button
              onClick={() => setDecisionFilter("lolos")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                decisionFilter === "lolos"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lolos
            </button>
            <button
              onClick={() => setDecisionFilter("ditolak")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                decisionFilter === "ditolak"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ditolak
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Cari produk / batch / dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 w-[260px]"
          />
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">No. Dokumen</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Nama Produk</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Kemasan (P/S)</th>
                  <th className="py-2.5 px-3 text-right">Netto / Bruto</th>
                  <th className="py-2.5 px-3">Warna / Rasa</th>
                  <th className="py-2.5 px-3 text-center">Bebas Benda Asing</th>
                  <th className="py-2.5 px-3 text-center">Kadar Air (%)</th>
                  <th className="py-2.5 px-3">Paraf QC</th>
                  <th className="py-2.5 px-3 text-center">Keputusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-muted-foreground">
                      Memuat data pemeriksaan produk jadi...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-muted-foreground">
                      Belum ada catatan pemeriksaan produk jadi untuk kriteria ini.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isPassed = log.inspectionDecision.toLowerCase() === "lolos";
                    return (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium">{log.documentNo}</td>
                        <td className="py-2.5 px-3">{log.checkDate}</td>
                        <td className="py-2.5 px-3 font-medium">{log.productName}</td>
                        <td className="py-2.5 px-3 font-mono">{log.batchNo}</td>
                        <td className="py-2.5 px-3">
                          {log.primaryPackaging} / {log.secondaryPackaging}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {log.netWeight.toFixed(2)} kg / {log.grossWeight.toFixed(2)} kg
                        </td>
                        <td className="py-2.5 px-3">
                          Skor {log.colorScore} ({log.colorDescription || "Normal"}) - {log.taste}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {log.isFreeForeignMatter ? (
                            <span className="text-emerald-600 font-bold">Bebas (Ya)</span>
                          ) : (
                            <span className="text-red-600 font-bold">Ada Temuan</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              log.isMoistureStandard
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            }`}
                          >
                            {log.moistureContent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{log.qcPersonnelName}</td>
                        <td className="py-2.5 px-3 text-center">
                          {isPassed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              LOLOS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                              <XCircle className="h-3 w-3" />
                              DITOLAK
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog: PJD Pemeriksaan Produk Jadi */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PackageCheck className="h-5 w-5 text-primary" />
              Catat Pemeriksaan Kualitas Produk Jadi (Form QC-004-PJD.05 Rev 05)
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 text-xs py-2">
            <div>
              <label className="font-semibold block mb-1">Tanggal Pemeriksaan</label>
              <Input
                type="date"
                value={formData.checkDate}
                onChange={(e) => setFormData({ ...formData, checkDate: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Nama Produk Jadi</label>
              <Input
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Batch Number</label>
              <Input
                value={formData.batchNo}
                onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                placeholder="BATCH-2026-XXXX"
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Kode Bahan Baku</label>
              <Input
                value={formData.rawMaterialCode || ""}
                onChange={(e) => setFormData({ ...formData, rawMaterialCode: e.target.value })}
                placeholder="RM-BRL-01"
                className="text-xs h-8"
              />
            </div>

            {/* Kemasan & Berat */}
            <div className="col-span-2 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Kemasan & Penimbangan</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Kemasan Primer</label>
              <select
                value={formData.primaryPackaging}
                onChange={(e) => setFormData({ ...formData, primaryPackaging: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="Baik">Baik & Rapat</option>
                <option value="Bocor">Bocor</option>
                <option value="Cacat">Cacat / Sobek</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Kemasan Sekunder</label>
              <select
                value={formData.secondaryPackaging}
                onChange={(e) => setFormData({ ...formData, secondaryPackaging: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="Baik">Baik & Bersih</option>
                <option value="Rusak">Rusak / Sobek</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Berat Bersih (Netto - kg)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.netWeight}
                onChange={(e) => setFormData({ ...formData, netWeight: parseFloat(e.target.value) || 0 })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Berat Kotor (Bruto - kg)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.grossWeight}
                onChange={(e) => setFormData({ ...formData, grossWeight: parseFloat(e.target.value) || 0 })}
                className="text-xs h-8"
              />
            </div>

            {/* Organoleptik & Mutu */}
            <div className="col-span-2 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Uji Organoleptik & Fisik</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Bentuk</label>
              <Input
                value={formData.appearanceShape || ""}
                onChange={(e) => setFormData({ ...formData, appearanceShape: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Aroma</label>
              <Input
                value={formData.aroma || ""}
                onChange={(e) => setFormData({ ...formData, aroma: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Warna* (Skor 1-3)</label>
              <select
                value={formData.colorScore}
                onChange={(e) => {
                  const score = parseInt(e.target.value) || 2;
                  const desc = score === 1 ? "Light Brown" : score === 2 ? "Normal" : "Dark Brown";
                  setFormData({ ...formData, colorScore: score, colorDescription: desc });
                }}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value={1}>1: Light Brown</option>
                <option value={2}>2: Normal</option>
                <option value={3}>3: Dark Brown</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Rasa</label>
              <Input
                value={formData.taste || ""}
                onChange={(e) => setFormData({ ...formData, taste: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            {/* Keamanan Pangan & Keputusan */}
            <div className="col-span-2 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">
                Keamanan Pangan & Keputusan Mutu
              </span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Kadar Air (% - Target &le; 2.0%)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.moistureContent}
                onChange={(e) => setFormData({ ...formData, moistureContent: parseFloat(e.target.value) || 0 })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Keputusan Akhir</label>
              <select
                value={formData.inspectionDecision}
                onChange={(e) => setFormData({ ...formData, inspectionDecision: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background font-bold text-primary"
              >
                <option value="lolos">LOLOS (Ready for Warehouse / LST)</option>
                <option value="ditolak">DITOLAK (Reject / Reproses)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold py-1">
                <input
                  type="checkbox"
                  checked={formData.isFreeForeignMatter}
                  onChange={(e) => setFormData({ ...formData, isFreeForeignMatter: e.target.checked })}
                  className="rounded text-primary"
                />
                Bebas Benda Asing (Tidak ada kerikil, serangga, logam, rambut, atau kotoran fisik)
              </label>
            </div>

            <div className="col-span-2 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Petugas & Verifikasi</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Nama Petugas QC</label>
              <Input
                value={formData.qcPersonnelName}
                onChange={(e) => setFormData({ ...formData, qcPersonnelName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Verifikasi QA</label>
              <Input
                value={formData.qaVerifiedBy || ""}
                onChange={(e) => setFormData({ ...formData, qaVerifiedBy: e.target.value })}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-primary">
              Simpan Pemeriksaan PJD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
