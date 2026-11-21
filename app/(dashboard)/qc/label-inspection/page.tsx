"use client";

import * as React from "react";
import {
  Tag,
  Plus,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  qcApi,
  PackagingLabelCheckItem,
  PackagingLabelCheckLineItem,
  CreatePackagingLabelCheckInput,
} from "@/lib/api/qc";
import { exportPLKExcel } from "@/lib/utils/export-wip-excel";

export default function QCLabelInspectionPage() {
  const [reports, setReports] = React.useState<PackagingLabelCheckItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [decisionFilter, setDecisionFilter] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Dialog state
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  // Form State
  const [checkDate, setCheckDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [fairtradeStatus, setFairtradeStatus] = React.useState<string>("NON FAIRTRADE");
  const [certification, setCertification] = React.useState<string>("ORGANIC EU, USDA, JAS");
  const [batchNo, setBatchNo] = React.useState<string>("BATCH-202611-001");
  const [qcInspectorName, setQcInspectorName] = React.useState<string>("Rudi Hartono (QC)");
  const [qcSupervisorName, setQcSupervisorName] = React.useState<string>("Steven (QA Lead)");
  const [notes, setNotes] = React.useState<string>("");

  const [items, setItems] = React.useState<PackagingLabelCheckLineItem[]>([
    {
      itemNo: 1,
      itemName: "Organic Coconut Sugar 25kg",
      itemCode: "GSO-001",
      batchNo: "BATCH-202611-001",
      buyerName: "Eco Organic BV",
      packagingType: "Sak Kertas Kraft 25kg",
      stickerNo: "STK-001 s/d STK-040",
      isBatchMatch: true,
      isExpiryMatch: true,
      isCertLogoMatch: true,
      isPrintQualityGood: true,
      isPositionAligned: true,
      inspectedQty: 40,
      passedQty: 40,
      rejectedQty: 0,
      itemDecision: "lolos",
      correctiveAction: "",
      notes: "Label stiker jelas & posisi presisi",
    },
  ]);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await qcApi.listPackagingLabelChecks({
        batchNo: searchQuery || undefined,
        decision: decisionFilter || undefined,
      });
      if (res.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat data PLK:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, decisionFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemNo: prev.length + 1,
        itemName: "Organic Coconut Sugar 25kg",
        itemCode: "GSO-001",
        batchNo: batchNo,
        buyerName: "",
        packagingType: "Sak Kertas Kraft 25kg",
        stickerNo: "",
        isBatchMatch: true,
        isExpiryMatch: true,
        isCertLogoMatch: true,
        isPrintQualityGood: true,
        isPositionAligned: true,
        inspectedQty: 1,
        passedQty: 1,
        rejectedQty: 0,
        itemDecision: "lolos",
        notes: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PackagingLabelCheckLineItem, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: val };

      if (field === "inspectedQty" || field === "rejectedQty" || field === "passedQty") {
        const inspected = field === "inspectedQty" ? Number(val) : target.inspectedQty;
        const rejected = field === "rejectedQty" ? Number(val) : target.rejectedQty;
        target.passedQty = Math.max(0, inspected - rejected);
      }

      // Auto update decision
      const hasIssue =
        target.rejectedQty > 0 ||
        !target.isBatchMatch ||
        !target.isExpiryMatch ||
        !target.isCertLogoMatch ||
        !target.isPrintQualityGood;
      target.itemDecision = hasIssue ? "ditolak" : "lolos";

      updated[index] = target;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: CreatePackagingLabelCheckInput = {
        checkDate,
        fairtradeStatus,
        certification,
        batchNo,
        qcInspectorName,
        qcSupervisorName,
        notes,
        items,
      };
      await qcApi.createPackagingLabelCheck(payload);
      setIsOpen(false);
      await loadData();
    } catch (err) {
      alert("Gagal menyimpan PLK: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const totalInspected = reports.reduce((acc, r) => {
    return acc + (r.items || []).reduce((s, it) => s + (it.inspectedQty || 0), 0);
  }, 0);
  const passedReports = reports.filter((r) => r.overallDecision === "lolos").length;
  const rejectedReports = reports.filter((r) => r.overallDecision === "ditolak").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pemeriksaan Label Kemasan QC (PLK)"
        description="Formulir QC-018-PLK verifikasi kesesuaian identitas label, nomor batch, masa kedaluwarsa, logo sertifikasi organik, dan kualitas cetakan kemasan"
      >
        <div className="flex gap-2">
          <Button onClick={() => setIsOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            Catat Pemeriksaan Label
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Dokumen PLK</p>
              <h3 className="text-2xl font-bold mt-1 text-indigo-700">{reports.length} <span className="text-sm font-normal">Form</span></h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
              <Tag className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Lolos QC Label</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-700">{passedReports} <span className="text-sm font-normal">Lolos</span></h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Ditolak / Perlu Revisi</p>
              <h3 className="text-2xl font-bold mt-1 text-red-700">{rejectedReports} <span className="text-sm font-normal">Reject</span></h3>
            </div>
            <div className="p-3 bg-red-50 rounded-full text-red-600">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Kemasan Diperiksa</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-700">{totalInspected.toLocaleString()} <span className="text-sm font-normal">Pcs</span></h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-full text-purple-600">
              <Package className="h-6 w-6" />
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
                  placeholder="Cari nomor batch atau dokumen..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="border rounded-md px-3 text-sm bg-background"
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value)}
              >
                <option value="">Semua Keputusan</option>
                <option value="lolos">Lolos</option>
                <option value="ditolak">Ditolak / Revisi</option>
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
                  <th className="py-3 px-4 text-left">No. Dokumen</th>
                  <th className="py-3 px-4 text-left">Tgl Periksa</th>
                  <th className="py-3 px-4 text-left">Sertifikasi & Batch</th>
                  <th className="py-3 px-4 text-left">Rincian Barang & Kemasan</th>
                  <th className="py-3 px-4 text-center">Verifikasi Label (Batch/Exp/Logo)</th>
                  <th className="py-3 px-4 text-right">Diperiksa / Lolos</th>
                  <th className="py-3 px-4 text-center">Keputusan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Memuat data PLK...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Belum ada formulir Pemeriksaan Label Kemasan (PLK) yang dicatat.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono font-medium text-indigo-700">
                        {r.documentNo}
                      </td>
                      <td className="py-3 px-4 font-medium">{r.checkDate}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {r.fairtradeStatus}
                        </span>
                        <div className="font-mono text-xs text-muted-foreground mt-0.5">
                          {r.batchNo || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {(r.items || []).map((it, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">{it.itemName}</span>{" "}
                            <span className="text-muted-foreground">({it.packagingType || "-"})</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(r.items || []).map((it, idx) => (
                          <div key={idx} className="flex items-center justify-center gap-1.5 text-xs">
                            <span className={it.isBatchMatch ? "text-emerald-600 font-medium" : "text-red-500 font-bold"}>
                              Batch: {it.isBatchMatch ? "✓" : "✗"}
                            </span>
                            <span>•</span>
                            <span className={it.isExpiryMatch ? "text-emerald-600 font-medium" : "text-red-500 font-bold"}>
                              Exp: {it.isExpiryMatch ? "✓" : "✗"}
                            </span>
                            <span>•</span>
                            <span className={it.isCertLogoMatch ? "text-emerald-600 font-medium" : "text-red-500 font-bold"}>
                              Logo: {it.isCertLogoMatch ? "✓" : "✗"}
                            </span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {(r.items || []).reduce((acc, it) => acc + it.inspectedQty, 0)} Pcs /{" "}
                        <span className="text-emerald-600 font-bold">
                          {(r.items || []).reduce((acc, it) => acc + it.passedQty, 0)} Lolos
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {r.overallDecision === "lolos" ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                            <CheckCircle2 className="h-3 w-3" /> LOLOS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold">
                            <XCircle className="h-3 w-3" /> DITOLAK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => exportPLKExcel(r)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Excel
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Input PLK */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-600" />
              Pemeriksaan Label Kemasan QC (PLK)
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
                <Input
                  className="mt-1"
                  value={certification}
                  onChange={(e) => setCertification(e.target.value)}
                  placeholder="ORGANIC EU, USDA, JAS"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Nomor Batch Utama</label>
                <Input
                  className="mt-1 font-mono"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium">Tanggal Pemeriksaan</label>
                <Input
                  type="date"
                  className="mt-1"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium">Pemeriksa QC (Inspector)</label>
                <Input
                  className="mt-1"
                  value={qcInspectorName}
                  onChange={(e) => setQcInspectorName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium">Supervisor QC / QA</label>
                <Input
                  className="mt-1"
                  value={qcSupervisorName}
                  onChange={(e) => setQcSupervisorName(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Items */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold">Daftar Barang & Parameter Verifikasi Label</h4>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-card space-y-3 relative">
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="text-xs font-bold text-muted-foreground">Barang #{idx + 1}</span>
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
                        <label className="text-xs">Nama Barang</label>
                        <Input
                          placeholder="Nama Barang..."
                          value={it.itemName}
                          onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Kode Barang</label>
                        <Input
                          placeholder="Kode Barang..."
                          value={it.itemCode}
                          onChange={(e) => handleItemChange(idx, "itemCode", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Kemasan</label>
                        <Input
                          placeholder="Sak Kraft 25kg..."
                          value={it.packagingType}
                          onChange={(e) => handleItemChange(idx, "packagingType", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs">No. Stiker / Roll</label>
                        <Input
                          placeholder="STK-001..."
                          value={it.stickerNo}
                          onChange={(e) => handleItemChange(idx, "stickerNo", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Checkbox Parameters */}
                    <div className="bg-muted/30 p-2.5 rounded border grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={it.isBatchMatch}
                          onChange={(e) => handleItemChange(idx, "isBatchMatch", e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Batch Sesuai</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={it.isExpiryMatch}
                          onChange={(e) => handleItemChange(idx, "isExpiryMatch", e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Exp Date Sesuai</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={it.isCertLogoMatch}
                          onChange={(e) => handleItemChange(idx, "isCertLogoMatch", e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Logo Sertifikasi</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={it.isPrintQualityGood}
                          onChange={(e) => handleItemChange(idx, "isPrintQualityGood", e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Cetak Jelas & Barcode</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={it.isPositionAligned}
                          onChange={(e) => handleItemChange(idx, "isPositionAligned", e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Posisi Rapi/Presisi</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs">Jumlah Diperiksa (Pcs)</label>
                        <Input
                          type="number"
                          value={it.inspectedQty}
                          onChange={(e) => handleItemChange(idx, "inspectedQty", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-emerald-600 font-bold">Jumlah Lolos (Pcs)</label>
                        <Input
                          type="number"
                          value={it.passedQty}
                          onChange={(e) => handleItemChange(idx, "passedQty", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-red-500 font-bold">Jumlah Reject (Pcs)</label>
                        <Input
                          type="number"
                          value={it.rejectedQty}
                          onChange={(e) => handleItemChange(idx, "rejectedQty", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold">Keputusan Item</label>
                        <div className="mt-1 font-bold text-xs uppercase px-3 py-2 rounded border bg-background flex items-center justify-between">
                          <span className={it.itemDecision === "lolos" ? "text-emerald-600" : "text-red-600"}>
                            {it.itemDecision}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Catatan / Evaluasi Pemeriksaan Label</label>
              <Input
                placeholder="Catatan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSubmitting ? "Menyimpan..." : "Simpan PLK (QC-018-PLK)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
