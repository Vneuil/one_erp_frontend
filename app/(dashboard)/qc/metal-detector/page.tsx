"use client";

import * as React from "react";
import {
  ShieldAlert,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sparkles,
  Layers,
  Clock,
  Radio,
  Pencil,
  Trash2,
  Printer,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  qcApi,
  MetalCleaningItem,
  CreateMetalCleaningInput,
  MetalVerificationItem,
  CreateMetalVerificationInput,
} from "@/lib/api/qc";
import {
  exportCPPExcel,
  exportVMDExcel,
  cppSheetKey,
  cppLocationLabel,
  cppMonthLabel,
} from "@/lib/utils/export-qc-excel";

type CPPSheetKey = "MD" | "MD GC" | "X-Ray";
const CPP_SHEETS: { key: CPPSheetKey; label: string; equipment: string; location: string }[] = [
  { key: "MD", label: "Metal Detector – R. Packing", equipment: "Metal Detector", location: "R. Packing" },
  { key: "MD GC", label: "Metal Detector – R. Gula Cair", equipment: "Metal Detector", location: "R. Gula Cair" },
  { key: "X-Ray", label: "X-Ray – R. Packing", equipment: "X-Ray", location: "R. Packing" },
];

const emptyCleaningForm = (): CreateMetalCleaningInput => ({
  checkDate: new Date().toISOString().slice(0, 10),
  machineNo: "MD-01",
  location: "R. Packing",
  equipmentName: "Metal Detector",
  cleaningType: "post_operational",
  sensorCleanliness: "Bersih",
  beltCleanliness: "Bersih",
  rejectBinCleanliness: "Bersih & Kosong",
  physicalCondition: "Normal",
  productName: "",
  batchNo: "",
  customerName: "",
  quantity: "",
  startTime: "08:00",
  endTime: "16:00",
  finding: "",
  analysisResult: "",
  correctiveAction: "",
  cleaningStartTime: "16:00",
  cleaningEndTime: "16:15",
  operatorName: "",
  qcInspectorName: "",
  qaVerifiedDate: "",
  notes: "",
});

const escapeHtml = (s?: string | number) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtDate = (d?: string) => {
  if (!d || d.length < 10) return d || "";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
};

function printCPPForm(groups: { key: CPPSheetKey; rows: MetalCleaningItem[] }[], month: string) {
  const pages = groups
    .map(({ key, rows }) => {
      const minRows = 12;
      const body = Array.from({ length: Math.max(minRows, rows.length) })
        .map((_, i) => {
          const it = rows[i];
          if (!it) return `<tr>${"<td>&nbsp;</td>".repeat(14)}</tr>`;
          return `<tr>
            <td>${i + 1}</td><td>${fmtDate(it.checkDate)}</td><td class="l">${escapeHtml(it.productName)}</td>
            <td>${escapeHtml(it.batchNo)}</td><td>${escapeHtml(it.customerName)}</td><td>${escapeHtml(it.quantity)}</td>
            <td>${escapeHtml(it.startTime)}</td><td>${escapeHtml(it.endTime)}</td>
            <td class="l">${escapeHtml(it.finding || "-")}</td><td class="l">${escapeHtml(it.analysisResult || "-")}</td>
            <td class="l">${escapeHtml(it.correctiveAction || "-")}</td>
            <td>${escapeHtml(it.cleaningStartTime)}</td><td>${escapeHtml(it.cleaningEndTime)}</td>
            <td>${escapeHtml(it.operatorName)}</td></tr>`;
        })
        .join("");
      const lastQA = [...rows].reverse().find((x) => x.qcInspectorName);
      return `<section class="page">
        <div class="hdr"><div>CV. Manna Anugerah Sejahtera<br/>CU 820674 D-11<br/>104464OC<br/>FLO-ID 43683</div>
          <div class="r">PRO-007-CPP<br/>FAIRTRADE / NON FAIRTRADE</div></div>
        <h1>Catatan Pemakaian dan Pembersihan Alat</h1><h1>(CPP)</h1>
        <table class="info">
          <tr><td>Lokasi</td><td>: ${cppLocationLabel(key)}</td></tr>
          <tr><td>Nama Alat</td><td>: ${key === "X-Ray" ? "X-Ray" : "Metal Detector"}</td></tr>
          <tr><td>Bulan/Tahun</td><td>: ${cppMonthLabel(month)}</td></tr>
        </table>
        <table class="grid">
          <colgroup>${[3.6, 12.4, 7.9, 15, 11.1, 5.1, 8, 8.4, 14.1, 22.9, 19, 8.4, 7.6, 5.3]
            .map((w) => `<col style="width:${w}%"/>`)
            .join("")}</colgroup>
          <thead>
            <tr><th rowspan="3">No</th><th rowspan="3">Tanggal</th><th rowspan="3">Nama Produk</th><th rowspan="3">No. Batch</th>
              <th rowspan="3">Customer</th><th rowspan="3">Jumlah</th><th colspan="5">Pemakaian</th><th colspan="2">Pembersihan</th><th rowspan="3">PIC</th></tr>
            <tr><th colspan="2">Jam (WIB)</th><th rowspan="2">Temuan</th><th rowspan="2">Hasil Analisa</th><th rowspan="2">Tindakan Perbaikan</th><th colspan="2">Jam (WIB)</th></tr>
            <tr><th>Mulai</th><th>Selesai</th><th>Mulai</th><th>Selesai</th></tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
        <div class="foot">
          <div class="notes"><b>Catatan :</b><br/> - Isi sebelum dan sesudah penggunaan alat<br/> - Bersihkan alat setiap selesai penggunaan<br/> - Jika ada temuan, catat hasil temuan, hasil analisa, dan tindakan yang dilakukan</div>
          <div class="sign"><div>Diketahui Oleh:</div><div class="sp">Tgl. ${escapeHtml(fmtDate(lastQA?.qaVerifiedDate))}<br/>${escapeHtml(lastQA?.qcInspectorName)}</div><div><b>QA</b></div></div>
        </div>
        <div class="rev">Revisi 01</div>
      </section>`;
    })
    .join("");

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>PRO-007-CPP ${month}</title><style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #000; }
    .page { page-break-after: always; position: relative; min-height: 180mm; }
    .page:last-child { page-break-after: auto; }
    .hdr { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 6px; }
    .hdr .r { text-align: right; }
    h1 { text-align: center; font-size: 16px; margin: 2px 0; }
    .info td { padding: 1px 8px 1px 0; font-size: 11px; }
    .info td:first-child { font-weight: bold; width: 90px; }
    table.grid { width: 100%; border-collapse: collapse; margin-top: 6px; table-layout: fixed; }
    .grid th, .grid td { border: 1px solid #000; padding: 2px 3px; text-align: center; vertical-align: middle; font-size: 9px; word-wrap: break-word; }
    .grid th { font-weight: bold; }
    .grid td { height: 18px; }
    .grid td.l { text-align: left; }
    .foot { display: flex; justify-content: space-between; margin-top: 8px; font-size: 9px; }
    .sign { width: 21%; text-align: center; }
    .sign .sp { height: 46px; padding-top: 4px; }
    .rev { text-align: center; font-size: 9px; margin-top: 8px; }
  </style></head><body>${pages}<script>window.onload=()=>{window.print();}</script></body></html>`);
  w.document.close();
}

export default function QCMetalDetectorPage() {
  const [activeTab, setActiveTab] = React.useState<"cpp" | "vmd">("vmd");
  const [productType, setProductType] = React.useState<"gula_semut" | "gula_cair">("gula_semut");
  const [month, setMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Data states
  const [cleaningLogs, setCleaningLogs] = React.useState<MetalCleaningItem[]>([]);
  const [verifLogs, setVerifLogs] = React.useState<MetalVerificationItem[]>([]);

  // Dialog states
  const [isCleaningOpen, setIsCleaningOpen] = React.useState<boolean>(false);
  const [isVerifOpen, setIsVerifOpen] = React.useState<boolean>(false);

  // Form states
  const [cppSheet, setCppSheet] = React.useState<"all" | CPPSheetKey>("all");
  const [editingCleaningId, setEditingCleaningId] = React.useState<string | null>(null);
  const [cleaningForm, setCleaningForm] = React.useState<CreateMetalCleaningInput>(emptyCleaningForm());

  const [verifForm, setVerifForm] = React.useState<CreateMetalVerificationInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    productType: "gula_semut",
    location: "Ruang Packing",
    packageCategory: "<= 12.5 kg",
    monitoringRound: 1,
    checkTime: "08:00",
    feTestPieceSize: "Fe >= 2.0mm",
    feAlarmTriggered: true,
    feConveyorStopped: true,
    nonFeTestPieceSize: "Non-Fe >= 2.0mm",
    nonFeAlarmTriggered: true,
    nonFeConveyorStopped: true,
    ssTestPieceSize: "SS >= 3.5mm",
    ssAlarmTriggered: true,
    ssConveyorStopped: true,
    correctiveAction: "",
    picName: "Operator CCP",
    qcVerifierName: "Staff QC",
    notes: "",
  });

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === "cpp") {
        const res = await qcApi.listMetalCleaningLogs({ month });
        setCleaningLogs(res.data || []);
      } else {
        const res = await qcApi.listMetalVerificationLogs({ month, productType });
        setVerifLogs(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching metal detector logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, month, productType]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit handlers
  const filteredCleaningLogs = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cleaningLogs
      .filter((l) => cppSheet === "all" || cppSheetKey(l) === cppSheet)
      .filter((l) =>
        !q ||
        [l.documentNo, l.productName, l.batchNo, l.customerName, l.finding, l.operatorName]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
      .sort((a, b) => `${a.checkDate} ${a.startTime}`.localeCompare(`${b.checkDate} ${b.startTime}`));
  }, [cleaningLogs, cppSheet, searchQuery]);

  const openCreateCleaning = () => {
    const sheet = CPP_SHEETS.find((s) => s.key === cppSheet) || CPP_SHEETS[0];
    setEditingCleaningId(null);
    setCleaningForm({ ...emptyCleaningForm(), equipmentName: sheet.equipment, location: sheet.location });
    setIsCleaningOpen(true);
  };

  const openEditCleaning = (log: MetalCleaningItem) => {
    setEditingCleaningId(log.id);
    setCleaningForm({
      ...emptyCleaningForm(),
      checkDate: log.checkDate,
      machineNo: log.machineNo,
      location: cppLocationLabel(cppSheetKey(log)),
      equipmentName: cppSheetKey(log) === "X-Ray" ? "X-Ray" : "Metal Detector",
      cleaningType: log.cleaningType,
      sensorCleanliness: log.sensorCleanliness,
      beltCleanliness: log.beltCleanliness,
      rejectBinCleanliness: log.rejectBinCleanliness,
      physicalCondition: log.physicalCondition,
      productName: log.productName || "",
      batchNo: log.batchNo || "",
      customerName: log.customerName || "",
      quantity: log.quantity || "",
      startTime: log.startTime,
      endTime: log.endTime,
      finding: log.finding || "",
      analysisResult: log.analysisResult || "",
      correctiveAction: log.correctiveAction || "",
      cleaningStartTime: log.cleaningStartTime || "",
      cleaningEndTime: log.cleaningEndTime || "",
      operatorName: log.operatorName,
      qcInspectorName: log.qcInspectorName || "",
      qaVerifiedDate: log.qaVerifiedDate || "",
      notes: log.notes || "",
    });
    setIsCleaningOpen(true);
  };

  const handleSaveCleaning = async () => {
    if (!cleaningForm.checkDate || !cleaningForm.startTime || !cleaningForm.endTime || !cleaningForm.operatorName?.trim()) {
      alert("Tanggal, jam pemakaian (mulai/selesai), dan PIC wajib diisi.");
      return;
    }
    try {
      if (editingCleaningId) {
        await qcApi.updateMetalCleaningLog(editingCleaningId, cleaningForm);
      } else {
        await qcApi.createMetalCleaningLog(cleaningForm);
      }
      setIsCleaningOpen(false);
      setEditingCleaningId(null);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan catatan CPP: " + (err as Error).message);
    }
  };

  const handleDeleteCleaning = async (log: MetalCleaningItem) => {
    if (!confirm(`Hapus catatan CPP ${log.documentNo}?`)) return;
    try {
      await qcApi.deleteMetalCleaningLog(log.id);
      fetchData();
    } catch (err) {
      alert("Gagal menghapus catatan CPP: " + (err as Error).message);
    }
  };

  const handlePrintCPP = () => {
    const keys: CPPSheetKey[] = cppSheet === "all" ? ["MD GC", "X-Ray", "MD"] : [cppSheet];
    const groups = keys
      .map((key) => ({ key, rows: filteredCleaningLogs.filter((l) => cppSheetKey(l) === key) }))
      .filter((g) => g.rows.length > 0 || cppSheet !== "all");
    printCPPForm(groups.length ? groups : [{ key: "MD", rows: [] }], month);
  };

  const cppStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      passed: { label: "Bersih / OK", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
      finding: { label: "Ada Temuan", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
      needs_cleaning: { label: "Perlu Dibersihkan", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
      maintenance: { label: "Perlu Perbaikan", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
    };
    const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.cls}`}>
        {status === "passed" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        {s.label}
      </span>
    );
  };

  const handleSaveVerif = async () => {
    try {
      await qcApi.createMetalVerificationLog({ ...verifForm, productType });
      setIsVerifOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan verifikasi metal detector: " + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metal Detector CCP Control"
        description="Catatan pemakaian & pembersihan alat (PRO-007-CPP) & verifikasi rutin test piece sensor (VMD) untuk Critical Control Point keamanan pangan"
      >
        <div className="flex items-center gap-2">
          {activeTab === "cpp" && (
            <Button variant="outline" size="sm" onClick={handlePrintCPP} className="flex items-center gap-1.5">
              <Printer className="h-4 w-4" />
              Cetak Form
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "cpp") exportCPPExcel(filteredCleaningLogs, month);
              else exportVMDExcel(verifLogs);
            }}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export Excel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (activeTab === "cpp") openCreateCleaning();
              else setIsVerifOpen(true);
            }}
            className="flex items-center gap-1.5 bg-primary"
          >
            <Plus className="h-4 w-4" />
            Catat {activeTab === "cpp" ? "Pemakaian & Pembersihan" : "Verifikasi CCP"} Baru
          </Button>
        </div>
      </PageHeader>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Tab */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("vmd")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "vmd"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              <Zap className="h-4 w-4 text-amber-400" />
              VMD: Verifikasi Sensor (CCP)
            </button>
            <button
              onClick={() => setActiveTab("cpp")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "cpp"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              <Sparkles className="h-4 w-4 text-cyan-400" />
              CPP: Pemakaian & Pembersihan (PRO-007)
            </button>
          </div>

          {/* Sub-toggle for CPP sheet (Alat + Lokasi) */}
          {activeTab === "cpp" && (
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              {([{ key: "all", label: "Semua" }, ...CPP_SHEETS.map((s) => ({ key: s.key, label: s.key }))] as {
                key: "all" | CPPSheetKey;
                label: string;
              }[]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setCppSheet(opt.key)}
                  title={CPP_SHEETS.find((s) => s.key === opt.key)?.label || "Semua alat & lokasi"}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    cppSheet === opt.key ? "bg-cyan-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Sub-toggle for VMD product type */}
          {activeTab === "vmd" && (
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              <button
                onClick={() => {
                  setProductType("gula_semut");
                  setVerifForm((f) => ({
                    ...f,
                    productType: "gula_semut",
                    location: "Ruang Packing",
                    packageCategory: "<= 12.5 kg",
                    feTestPieceSize: "Fe >= 2.0mm",
                    nonFeTestPieceSize: "Non-Fe >= 2.0mm",
                    ssTestPieceSize: "SS >= 3.5mm",
                  }));
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  productType === "gula_semut"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Gula Semut (QC-017 Rev 03)
              </button>
              <button
                onClick={() => {
                  setProductType("gula_cair");
                  setVerifForm((f) => ({
                    ...f,
                    productType: "gula_cair",
                    location: "Gula Cair",
                    packageCategory: "Gula Cair",
                    feTestPieceSize: "Fe >= 1.5mm",
                    nonFeTestPieceSize: "Non-Fe >= 1.5mm",
                    ssTestPieceSize: "SS >= 2.5mm",
                  }));
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  productType === "gula_cair"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Gula Cair (QC-017 Rev 01)
              </button>
            </div>
          )}
        </div>

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
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Cari log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 w-[180px]"
            />
          </div>
        </div>
      </div>

      {/* Content: VMD Verification */}
      {activeTab === "vmd" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">No. Dokumen</th>
                    <th className="py-2.5 px-3">Tanggal & Jam</th>
                    <th className="py-2.5 px-3">Round</th>
                    <th className="py-2.5 px-3">Kategori Kemasan</th>
                    <th className="py-2.5 px-3 text-center">Uji Fe (Alarm / Stop)</th>
                    <th className="py-2.5 px-3 text-center">Uji Non-Fe (Alarm / Stop)</th>
                    <th className="py-2.5 px-3 text-center">Uji SS (Alarm / Stop)</th>
                    <th className="py-2.5 px-3">PIC / QC</th>
                    <th className="py-2.5 px-3 text-center">Status CCP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        Memuat verifikasi metal detector...
                      </td>
                    </tr>
                  ) : verifLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        Belum ada data verifikasi metal detector untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    verifLogs.map((log) => {
                      const isFail = log.overallStatus === "failed";
                      return (
                        <tr key={log.id} className={`hover:bg-muted/30 ${isFail ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}>
                          <td className="py-2.5 px-3 font-mono font-medium">{log.documentNo}</td>
                          <td className="py-2.5 px-3">
                            {log.checkDate} <span className="text-muted-foreground">({log.checkTime})</span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold">Monitoring #{log.monitoringRound}</td>
                          <td className="py-2.5 px-3">{log.packageCategory}</td>

                          {/* Fe */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.fePassed
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {log.fePassed ? "PASS" : "FAIL"}
                            </span>
                          </td>

                          {/* Non-Fe */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.nonFePassed
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {log.nonFePassed ? "PASS" : "FAIL"}
                            </span>
                          </td>

                          {/* SS */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.ssPassed
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {log.ssPassed ? "PASS" : "FAIL"}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            {log.picName} / {log.qcVerifierName || "QC"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isFail ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                <AlertTriangle className="h-3 w-3" />
                                CCP Gagal
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Lolos CCP
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
      )}

      {/* Content: CPP Cleaning */}
      {activeTab === "cpp" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th rowSpan={2} className="py-2 px-2">No. Dokumen</th>
                    <th rowSpan={2} className="py-2 px-2">Tanggal</th>
                    <th rowSpan={2} className="py-2 px-2">Alat / Lokasi</th>
                    <th rowSpan={2} className="py-2 px-2">Nama Produk</th>
                    <th rowSpan={2} className="py-2 px-2">No. Batch</th>
                    <th rowSpan={2} className="py-2 px-2">Customer</th>
                    <th rowSpan={2} className="py-2 px-2 text-center">Jumlah</th>
                    <th colSpan={4} className="py-1 px-2 text-center border-l border-border">Pemakaian</th>
                    <th className="py-1 px-2 text-center border-l border-border">Pembersihan</th>
                    <th rowSpan={2} className="py-2 px-2 border-l border-border">PIC</th>
                    <th rowSpan={2} className="py-2 px-2 text-center">Status</th>
                    <th rowSpan={2} className="py-2 px-2 text-center">Aksi</th>
                  </tr>
                  <tr>
                    <th className="py-1 px-2 text-center border-l border-border">Jam (WIB)</th>
                    <th className="py-1 px-2">Temuan</th>
                    <th className="py-1 px-2">Hasil Analisa</th>
                    <th className="py-1 px-2">Tindakan Perbaikan</th>
                    <th className="py-1 px-2 text-center border-l border-border">Jam (WIB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={15} className="text-center py-8 text-muted-foreground">
                        Memuat catatan pemakaian & pembersihan alat...
                      </td>
                    </tr>
                  ) : filteredCleaningLogs.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="text-center py-8 text-muted-foreground">
                        Belum ada catatan CPP untuk periode / filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredCleaningLogs.map((log) => {
                      const key = cppSheetKey(log);
                      const hasIssue = log.overallStatus !== "passed";
                      return (
                        <tr key={log.id} className={`hover:bg-muted/30 ${hasIssue ? "bg-red-50/40 dark:bg-red-950/20" : ""}`}>
                          <td className="py-2 px-2 font-mono font-medium">{log.documentNo}</td>
                          <td className="py-2 px-2 whitespace-nowrap">{fmtDate(log.checkDate)}</td>
                          <td className="py-2 px-2">
                            <span className="font-medium">{key === "X-Ray" ? "X-Ray" : "Metal Detector"}</span>
                            <span className="block text-muted-foreground text-[10px]">{cppLocationLabel(key)}</span>
                          </td>
                          <td className="py-2 px-2">{log.productName || "-"}</td>
                          <td className="py-2 px-2 font-mono">{log.batchNo || "-"}</td>
                          <td className="py-2 px-2">{log.customerName || "-"}</td>
                          <td className="py-2 px-2 text-center">{log.quantity || "-"}</td>
                          <td className="py-2 px-2 text-center whitespace-nowrap border-l border-border">
                            {log.startTime} - {log.endTime}
                          </td>
                          <td className="py-2 px-2 max-w-[160px]">{log.finding || "-"}</td>
                          <td className="py-2 px-2 max-w-[160px]">{log.analysisResult || "-"}</td>
                          <td className="py-2 px-2 max-w-[160px]">{log.correctiveAction || "-"}</td>
                          <td className="py-2 px-2 text-center whitespace-nowrap border-l border-border">
                            {log.cleaningStartTime || log.cleaningEndTime
                              ? `${log.cleaningStartTime || "?"} - ${log.cleaningEndTime || "?"}`
                              : "-"}
                          </td>
                          <td className="py-2 px-2 border-l border-border">
                            {log.operatorName}
                            {log.qcInspectorName && (
                              <span className="block text-muted-foreground text-[10px]">QA: {log.qcInspectorName}</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">{cppStatusBadge(log.overallStatus)}</td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <button
                              onClick={() => openEditCleaning(log)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCleaning(log)}
                              className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
      )}

      {/* Modal Dialog: VMD Verifikasi CCP */}
      <Dialog open={isVerifOpen} onOpenChange={setIsVerifOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-amber-500" />
              Catat Verifikasi Metal Detector CCP (Form QC-017-VMD)
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 text-xs py-2">
            <div>
              <label className="font-semibold block mb-1">Tanggal</label>
              <Input
                type="date"
                value={verifForm.checkDate}
                onChange={(e) => setVerifForm({ ...verifForm, checkDate: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Jam Cek</label>
              <Input
                type="time"
                value={verifForm.checkTime}
                onChange={(e) => setVerifForm({ ...verifForm, checkTime: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Monitoring Ke</label>
              <Input
                type="number"
                value={verifForm.monitoringRound}
                onChange={(e) => setVerifForm({ ...verifForm, monitoringRound: parseInt(e.target.value) || 1 })}
                className="text-xs h-8"
              />
            </div>

            <div className="col-span-3">
              {productType === "gula_cair" ? (
                <div className="p-2 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  Test Piece Gula Cair (QC-017 Rev 01): <strong>Fe ≥ 1.5 mm</strong>, <strong>Non-Fe ≥ 1.5 mm</strong>, <strong>SS ≥ 2.5 mm</strong> (Lokasi: Gula Cair).
                </div>
              ) : (
                <>
                  <label className="font-semibold block mb-1">Ukuran Kemasan</label>
                  <select
                    value={verifForm.packageCategory}
                    onChange={(e) => setVerifForm({ ...verifForm, packageCategory: e.target.value })}
                    className="w-full text-xs h-8 border rounded-md px-2 bg-background"
                  >
                    <option value="<= 12.5 kg">Kemasan &le; 12.5 kg (Fe &ge;2mm, Non-Fe &ge;2mm, SS &ge;3.5mm)</option>
                    <option value="> 12.5 kg">Kemasan &gt; 12.5 kg (Fe &ge;2.5mm, Non-Fe &ge;3mm, SS &ge;3.5mm)</option>
                  </select>
                </>
              )}
            </div>

            {/* Test Piece 1: Fe */}
            <div className="col-span-3 border-t pt-2 mt-1">
              <span className="font-bold text-amber-700 dark:text-amber-400 uppercase text-[10px]">
                1. Test Piece: Fe (Ferrous)
              </span>
            </div>
            <div className="col-span-3 flex items-center gap-4 bg-muted/30 p-2 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.feAlarmTriggered}
                  onChange={(e) => setVerifForm({ ...verifForm, feAlarmTriggered: e.target.checked })}
                  className="rounded text-primary"
                />
                Alarm Bunyi
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.feConveyorStopped}
                  onChange={(e) => setVerifForm({ ...verifForm, feConveyorStopped: e.target.checked })}
                  className="rounded text-primary"
                />
                Konveyor Berhenti
              </label>
            </div>

            {/* Test Piece 2: Non-Fe */}
            <div className="col-span-3 border-t pt-2 mt-1">
              <span className="font-bold text-cyan-700 dark:text-cyan-400 uppercase text-[10px]">
                2. Test Piece: Non-Fe (Non-Ferrous)
              </span>
            </div>
            <div className="col-span-3 flex items-center gap-4 bg-muted/30 p-2 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.nonFeAlarmTriggered}
                  onChange={(e) => setVerifForm({ ...verifForm, nonFeAlarmTriggered: e.target.checked })}
                  className="rounded text-primary"
                />
                Alarm Bunyi
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.nonFeConveyorStopped}
                  onChange={(e) => setVerifForm({ ...verifForm, nonFeConveyorStopped: e.target.checked })}
                  className="rounded text-primary"
                />
                Konveyor Berhenti
              </label>
            </div>

            {/* Test Piece 3: SS */}
            <div className="col-span-3 border-t pt-2 mt-1">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-[10px]">
                3. Test Piece: SS (Stainless Steel)
              </span>
            </div>
            <div className="col-span-3 flex items-center gap-4 bg-muted/30 p-2 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.ssAlarmTriggered}
                  onChange={(e) => setVerifForm({ ...verifForm, ssAlarmTriggered: e.target.checked })}
                  className="rounded text-primary"
                />
                Alarm Bunyi
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.ssConveyorStopped}
                  onChange={(e) => setVerifForm({ ...verifForm, ssConveyorStopped: e.target.checked })}
                  className="rounded text-primary"
                />
                Konveyor Berhenti
              </label>
            </div>

            <div className="col-span-3 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">PIC & Tindakan Perbaikan</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Nama PIC</label>
              <Input
                value={verifForm.picName}
                onChange={(e) => setVerifForm({ ...verifForm, picName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Verifikator QC</label>
              <Input
                value={verifForm.qcVerifierName || ""}
                onChange={(e) => setVerifForm({ ...verifForm, qcVerifierName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Tindakan Perbaikan (Bila Gagal)</label>
              <Input
                value={verifForm.correctiveAction || ""}
                onChange={(e) => setVerifForm({ ...verifForm, correctiveAction: e.target.value })}
                placeholder="Reset sensor / re-adjust"
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsVerifOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveVerif} className="bg-primary">
              Simpan Verifikasi CCP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: CPP Pembersihan */}
      <Dialog open={isCleaningOpen} onOpenChange={setIsCleaningOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-cyan-500" />
              {editingCleaningId ? "Edit" : "Catat"} Pemakaian & Pembersihan Alat (Form PRO-007-CPP Rev. 01)
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-3 text-xs py-2">
            {/* Header form */}
            <div className="col-span-4">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Identitas Alat</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Nama Alat</label>
              <select
                value={cleaningForm.equipmentName}
                onChange={(e) => {
                  const equipmentName = e.target.value;
                  setCleaningForm({
                    ...cleaningForm,
                    equipmentName,
                    location: equipmentName === "X-Ray" ? "R. Packing" : cleaningForm.location,
                  });
                }}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="Metal Detector">Metal Detector</option>
                <option value="X-Ray">X-Ray</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Lokasi</label>
              <select
                value={cleaningForm.location}
                onChange={(e) => setCleaningForm({ ...cleaningForm, location: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="R. Packing">R. Packing</option>
                {cleaningForm.equipmentName !== "X-Ray" && <option value="R. Gula Cair">R. Gula Cair</option>}
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">No Mesin</label>
              <Input
                value={cleaningForm.machineNo || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, machineNo: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Tanggal *</label>
              <Input
                type="date"
                value={cleaningForm.checkDate}
                onChange={(e) => setCleaningForm({ ...cleaningForm, checkDate: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            {/* Produk */}
            <div className="col-span-4 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Produk</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Nama Produk</label>
              <Input
                value={cleaningForm.productName || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, productName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">No. Batch</label>
              <Input
                value={cleaningForm.batchNo || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, batchNo: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Customer</label>
              <Input
                value={cleaningForm.customerName || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, customerName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Jumlah</label>
              <Input
                value={cleaningForm.quantity || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, quantity: e.target.value })}
                placeholder="mis. 40 sak"
                className="text-xs h-8"
              />
            </div>

            {/* Pemakaian */}
            <div className="col-span-4 border-t pt-2 mt-1">
              <span className="font-bold text-amber-700 dark:text-amber-400 uppercase text-[10px]">Pemakaian</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Jam Mulai (WIB) *</label>
              <Input
                type="time"
                value={cleaningForm.startTime}
                onChange={(e) => setCleaningForm({ ...cleaningForm, startTime: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Jam Selesai (WIB) *</label>
              <Input
                type="time"
                value={cleaningForm.endTime}
                onChange={(e) => setCleaningForm({ ...cleaningForm, endTime: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div className="col-span-2">
              <label className="font-semibold block mb-1">Temuan</label>
              <Input
                value={cleaningForm.finding || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, finding: e.target.value })}
                placeholder="Kosongkan / '-' bila tidak ada temuan"
                className="text-xs h-8"
              />
            </div>
            <div className="col-span-2">
              <label className="font-semibold block mb-1">Hasil Analisa</label>
              <Input
                value={cleaningForm.analysisResult || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, analysisResult: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div className="col-span-2">
              <label className="font-semibold block mb-1">Tindakan Perbaikan</label>
              <Input
                value={cleaningForm.correctiveAction || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, correctiveAction: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            {/* Pembersihan */}
            <div className="col-span-4 border-t pt-2 mt-1">
              <span className="font-bold text-cyan-700 dark:text-cyan-400 uppercase text-[10px]">Pembersihan</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Jam Mulai (WIB)</label>
              <Input
                type="time"
                value={cleaningForm.cleaningStartTime || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, cleaningStartTime: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Jam Selesai (WIB)</label>
              <Input
                type="time"
                value={cleaningForm.cleaningEndTime || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, cleaningEndTime: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Kebersihan Sensor</label>
              <select
                value={cleaningForm.sensorCleanliness}
                onChange={(e) => setCleaningForm({ ...cleaningForm, sensorCleanliness: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="Bersih">Bersih</option>
                <option value="Perlu Dibersihkan">Perlu Dibersihkan</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Kondisi Fisik</label>
              <select
                value={cleaningForm.physicalCondition}
                onChange={(e) => setCleaningForm({ ...cleaningForm, physicalCondition: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="Normal">Normal</option>
                <option value="Cacat">Cacat</option>
                <option value="Kabel Terbuka">Kabel Terbuka</option>
              </select>
            </div>

            {/* PIC & QA */}
            <div className="col-span-4 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">PIC & Diketahui Oleh QA</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">PIC *</label>
              <Input
                value={cleaningForm.operatorName}
                onChange={(e) => setCleaningForm({ ...cleaningForm, operatorName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">QA</label>
              <Input
                value={cleaningForm.qcInspectorName || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, qcInspectorName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Tgl. Diketahui QA</label>
              <Input
                type="date"
                value={cleaningForm.qaVerifiedDate || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, qaVerifiedDate: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Catatan</label>
              <Input
                value={cleaningForm.notes || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, notes: e.target.value })}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCleaningOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveCleaning} className="bg-primary">
              {editingCleaningId ? "Simpan Perubahan" : "Simpan Data CPP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
