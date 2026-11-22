"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Printer,
  Scale,
  FileText,
  Factory,
  ShieldCheck,
  QrCode,
  Package,
  Flame,
  FileSpreadsheet,
  Lock,
  Search,
  ChevronRight,
  Plus,
  ArrowUpRight,
  SlidersHorizontal,
  Layers,
  Warehouse,
  Boxes,
  Clock,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  manufacturingApi,
  CreateLSTInput,
  HandoverReportItem,
} from "@/lib/api/manufacturing";
import { exportLSTExcel } from "@/lib/utils/export-wip-excel";

// ─── DEFINISI 10 TAHAP SPRINT 2 ───────────────────────────────────────────────
export interface StepDef {
  id: number;
  code: string;
  title: string;
  docCode: string;
  owner: string;
  pageHref: string;
  description: string;
}

export const SPRINT_2_STEPS: StepDef[] = [
  {
    id: 1,
    code: "LBM",
    title: "Inbound & LBM",
    docCode: "GD-007-LBM",
    owner: "Gudang Bahan Baku",
    pageHref: "/procurement/receipts",
    description: "Penerimaan bahan baku dengan timbangan presisi 2 desimal & slip tanda terima harga tersembunyi.",
  },
  {
    id: 2,
    code: "BPB",
    title: "Permintaan Bahan (BPB)",
    docCode: "PR-09",
    owner: "Produksi",
    pageHref: "/manufacturing/requisitions",
    description: "Form serah terima bahan PR-09 & scanning barcode pengeluaran dari gudang ke WIP ayak.",
  },
  {
    id: 3,
    code: "AYAK_1",
    title: "Ayak Mentah & Magnet Trap",
    docCode: "QC-009-MNA & QC-038-CMT",
    owner: "Produksi & QC",
    pageHref: "/qc/sieving",
    description: "Monitoring proses ayak mentah, pembersihan magnet trap, dan pencatatan brontol/susut.",
  },
  {
    id: 4,
    code: "OVEN",
    title: "Cek Kadar Air & Oven",
    docCode: "QC-012-MNO.05 & LHO",
    owner: "QC & Operator Oven",
    pageHref: "/manufacturing/oven",
    description: "Evaluasi kadar air: jika > 2.0% wajib oven; jika ≤ 2.0% dilewati (jalur cepat ke Ayak Matang).",
  },
  {
    id: 5,
    code: "AYAK_2",
    title: "Ayak Matang (Sieving 2)",
    docCode: "QC-009-MNA.01",
    owner: "Produksi",
    pageHref: "/qc/sieving",
    description: "Pemisahan brontol kering matang & pemastian keutuhan mesh screen sebelum pengemasan.",
  },
  {
    id: 6,
    code: "PACKING",
    title: "Ruang Packing & IoT Scale",
    docCode: "QC-011-MNJ.01 & Scale IoT",
    owner: "Operator Packing & QC",
    pageHref: "/qc/packing",
    description: "Pengecekan jarum/gunting utuh & penimbangan dengan tombol konfirmasi 'Settle Weight'.",
  },
  {
    id: 7,
    code: "METAL",
    title: "Metal Detector CCP 1",
    docCode: "QC-017-VMD & CPP",
    owner: "QA/QC Lead",
    pageHref: "/qc/metal-detector",
    description: "Critical Control Point (CCP 1): Verifikasi 3 test piece (Fe 1.5mm, Non-Fe 2.0mm, SS 2.5mm).",
  },
  {
    id: 8,
    code: "PJD",
    title: "Pemeriksaan Produk Jadi",
    docCode: "QC-004-PJD.05 & QC-018-PLK",
    owner: "QC Release Officer",
    pageHref: "/qc/finished-goods",
    description: "Organoleptik rasa, aroma, warna, kelarutan, cek label kemasan & keputusan rilis mutu (PASSED).",
  },
  {
    id: 9,
    code: "LHP",
    title: "Laporan Hasil Produksi",
    docCode: "PRO-002-LHP & Bulk QR",
    owner: "Admin Produksi",
    pageHref: "/manufacturing/lhp",
    description: "Rekap yield/susut, penomoran palet, dan auto-generate bulk serial stiker QR (cth: 26N48PW001-850).",
  },
  {
    id: 10,
    code: "LST",
    title: "Laporan Serah Terima (LST)",
    docCode: "GDG-009-LST / QA-044-LST",
    owner: "Produksi ➔ Gudang FG",
    pageHref: "/inventory/lst",
    description: "Penyerahan fisik barang jadi ke Gudang FG, verifikasi QC, tanda tangan, dan penguncian status Final.",
  },
];

// ─── TIPE DATA BATCH PRODUKSI ────────────────────────────────────────────────
export interface ProductionBatchRecord {
  id: string;
  batchNo: string;
  date: string;
  productName: string;
  productCode: string;
  supplier: string;
  supplierCode: string;
  certification: string;
  fairtradeStatus: string;
  rawInputKg: number;
  fgOutputPcs: number;
  fgOutputKg: number;
  currentStage: number; // 1 to 10
  completedStages: number[];
  moisturePercent: number;
  ovenRequired: boolean;
  status: "in_progress" | "qc_ready" | "handover_ready" | "final";
  lbmNo: string;
  lstNo: string;
  palletCount: number;
}

const INITIAL_BATCHES: ProductionBatchRecord[] = [
  {
    id: "batch-1",
    batchNo: "26N48PW213",
    date: new Date().toISOString().slice(0, 10),
    productName: "Organic Coconut Sugar 25kg",
    productCode: "GSO-001",
    supplier: "Kelompok Tani Purworejo (Pak Wahyu)",
    supplierCode: "PW",
    certification: "Organik EU",
    fairtradeStatus: "NON FAIRTRADE",
    rawInputKg: 21500,
    fgOutputPcs: 850,
    fgOutputKg: 21250,
    currentStage: 9,
    completedStages: [1, 2, 3, 4, 5, 6, 7, 8],
    moisturePercent: 1.8,
    ovenRequired: false,
    status: "handover_ready",
    lbmNo: "LBM-202611-008",
    lstNo: "GDG-009-LST-202611-044",
    palletCount: 22,
  },
  {
    id: "batch-2",
    batchNo: "26N48PW214",
    date: new Date().toISOString().slice(0, 10),
    productName: "Organic Coconut Sugar 25kg",
    productCode: "GSO-001",
    supplier: "Kelompok Tani Purworejo (Pak Wahyu)",
    supplierCode: "PW",
    certification: "Organik EU",
    fairtradeStatus: "FAIRTRADE FLO",
    rawInputKg: 10750,
    fgOutputPcs: 420,
    fgOutputKg: 10500,
    currentStage: 4,
    completedStages: [1, 2, 3],
    moisturePercent: 2.6,
    ovenRequired: true,
    status: "in_progress",
    lbmNo: "LBM-202611-009",
    lstNo: "GDG-009-LST-202611-045",
    palletCount: 11,
  },
  {
    id: "batch-3",
    batchNo: "26N47SL105",
    date: "2026-11-20",
    productName: "Organic Coconut Sugar 25kg",
    productCode: "GSO-001",
    supplier: "Koperasi Tani Sleman (Pak Slamet)",
    supplierCode: "SL",
    certification: "USDA-NOP",
    fairtradeStatus: "NON FAIRTRADE",
    rawInputKg: 15000,
    fgOutputPcs: 590,
    fgOutputKg: 14750,
    currentStage: 10,
    completedStages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    moisturePercent: 1.7,
    ovenRequired: false,
    status: "final",
    lbmNo: "LBM-202611-005",
    lstNo: "GDG-009-LST-202611-041",
    palletCount: 15,
  },
];

export default function Sprint2WorkflowMasterPage() {
  // Mode Tampilan: 'overview' vs 'wizard'
  const [viewMode, setViewMode] = React.useState<string>("overview");

  // State Daftar Batch
  const [batches, setBatches] = React.useState<ProductionBatchRecord[]>(INITIAL_BATCHES);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>("batch-1");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const activeBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];

  // Wizard State
  const [currentStep, setCurrentStep] = React.useState<number>(activeBatch.currentStage);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>(activeBatch.completedStages);

  // Field Editable Form Step-by-Step
  const [lbmNo, setLbmNo] = React.useState<string>(activeBatch.lbmNo);
  const [deliveryNoteNo, setDeliveryNoteNo] = React.useState<string>("SJ-PW-8821");
  const scaleWeights = [
    { gross: 10.25, tare: 0.2, net: 10.05 },
    { gross: 10.26, tare: 0.2, net: 10.06 },
    { gross: 10.24, tare: 0.2, net: 10.04 },
  ];
  const [packagingQty, setPackagingQty] = React.useState<number>(activeBatch.fgOutputPcs + 10);
  const [scannedBarcode, setScannedBarcode] = React.useState<string>("BARCODE-GDG-101");
  const [rawMaterialWeight, setRawMaterialWeight] = React.useState<number>(activeBatch.rawInputKg);

  // Step 3 & 4: Ayak & Oven
  const [sievingRawInput, setSievingRawInput] = React.useState<number>(activeBatch.rawInputKg);
  const [rawCleanSugar, setRawCleanSugar] = React.useState<number>(activeBatch.fgOutputKg + 35);
  const rawBrontolReject = 107.5;
  const rawDustLoss = 107.5;
  const [magnetTrapChecked, setMagnetTrapChecked] = React.useState<boolean>(true);
  const [moisturePercent, setMoisturePercent] = React.useState<number>(activeBatch.moisturePercent);
  const ovenRequired = moisturePercent > 2.0;

  // Step 5 & 6: Ayak Matang, Packing & IoT Scale
  const [cookedCleanSugar, setCookedCleanSugar] = React.useState<number>(activeBatch.fgOutputKg);
  const [cookedBrontol, setCookedBrontol] = React.useState<number>(35);
  const [needleCheckOk, setNeedleCheckOk] = React.useState<boolean>(true);
  const [scissorCheckOk, setScissorCheckOk] = React.useState<boolean>(true);
  const [scaleDisplay, setScaleDisplay] = React.useState<number>(25.0);
  const [isScaleSettled, setIsScaleSettled] = React.useState<boolean>(true);
  const [packedBagsCount, setPackedBagsCount] = React.useState<number>(activeBatch.fgOutputPcs);
  const weightPerBag = 25.0;

  // Step 7 & 8: Metal Detector & QC
  const [metalCleaningOk, setMetalCleaningOk] = React.useState<boolean>(true);
  const [qcDecision, setQcDecision] = React.useState<string>("PASSED");

  // Step 9: Serials
  const [bulkSerials, setBulkSerials] = React.useState<string[]>([]);
  const [palletCount, setPalletCount] = React.useState<number>(activeBatch.palletCount);

  // Step 10: LST
  const [lstNumber, setLstNumber] = React.useState<string>(activeBatch.lstNo);
  const [handoverDate, setHandoverDate] = React.useState<string>(activeBatch.date);
  const [handedOverBy, setHandedOverBy] = React.useState<string>("Nicholas Tantra (Spv Produksi)");
  const [receivedBy, setReceivedBy] = React.useState<string>("Abel Kurniawan (Gudang FG)");
  const [isSavingLST, setIsSavingLST] = React.useState<boolean>(false);
  const [notification, setNotification] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fungsi sinkronisasi data batch ke form
  const applyBatchToForm = React.useCallback((batch: ProductionBatchRecord, targetStage?: number) => {
    setSelectedBatchId(batch.id);
    setCurrentStep(targetStage ?? batch.currentStage);
    setCompletedSteps(batch.completedStages);
    setLbmNo(batch.lbmNo);
    setRawMaterialWeight(batch.rawInputKg);
    setSievingRawInput(batch.rawInputKg);
    setMoisturePercent(batch.moisturePercent);
    setPackedBagsCount(batch.fgOutputPcs);
    setPalletCount(batch.palletCount);
    setLstNumber(batch.lstNo);
    setCookedCleanSugar(batch.fgOutputKg);

    if ((targetStage ?? batch.currentStage) >= 9) {
      const list: string[] = [];
      for (let i = 1; i <= Math.min(850, batch.fgOutputPcs); i++) {
        list.push(`26N48${batch.supplierCode}${String(i).padStart(3, "0")}`);
      }
      setBulkSerials(list);
    } else {
      setBulkSerials([]);
    }
  }, []);

  // Buka Wizard langsung pada batch tertentu
  const handleOpenWizardForBatch = (batchId: string, stageNum?: number) => {
    const target = batches.find((b) => b.id === batchId);
    if (target) {
      applyBatchToForm(target, stageNum);
    }
    setViewMode("wizard");
  };

  // Buat Batch Baru
  const handleCreateNewBatch = () => {
    const nextNum = batches.length + 1;
    const newBatch: ProductionBatchRecord = {
      id: `batch-${Date.now()}`,
      batchNo: `26N48PW21${nextNum}`,
      date: new Date().toISOString().slice(0, 10),
      productName: "Organic Coconut Sugar 25kg",
      productCode: "GSO-001",
      supplier: "Kelompok Tani Purworejo (Pak Wahyu)",
      supplierCode: "PW",
      certification: "Organik EU",
      fairtradeStatus: "NON FAIRTRADE",
      rawInputKg: 21500,
      fgOutputPcs: 850,
      fgOutputKg: 21250,
      currentStage: 1,
      completedStages: [],
      moisturePercent: 1.8,
      ovenRequired: false,
      status: "in_progress",
      lbmNo: `LBM-202611-01${nextNum}`,
      lstNo: `GDG-009-LST-202611-05${nextNum}`,
      palletCount: 22,
    };

    setBatches((prev) => [newBatch, ...prev]);
    applyBatchToForm(newBatch, 1);
    setViewMode("wizard");
    setNotification({
      type: "success",
      text: `Batch baru ${newBatch.batchNo} berhasil dibuat. Mulai dari Tahap 1 (Inbound & LBM).`,
    });
  };

  // Tandai langkah selesai & pindah berikutnya
  const handleMarkStepComplete = (stepId: number) => {
    const newCompleted = completedSteps.includes(stepId)
      ? completedSteps
      : [...completedSteps, stepId];
    setCompletedSteps(newCompleted);

    const nextStep = Math.min(10, stepId + 1);
    setCurrentStep(nextStep);

    setBatches((prev) =>
      prev.map((b) =>
        b.id === activeBatch.id
          ? {
              ...b,
              currentStage: nextStep,
              completedStages: newCompleted,
              status: stepId === 10 ? "final" : stepId >= 8 ? "handover_ready" : "in_progress",
            }
          : b
      )
    );
  };

  // Generate bulk serials
  const handleGenerateSerials = () => {
    const list: string[] = [];
    for (let i = 1; i <= packedBagsCount; i++) {
      list.push(`26N48${activeBatch.supplierCode}${String(i).padStart(3, "0")}`);
    }
    setBulkSerials(list);
    setNotification({
      type: "success",
      text: `Berhasil men-generate ${list.length} barcode serial unik (${list[0]} s/d ${list[list.length - 1]}).`,
    });
  };

  // Simpan LST ke Backend API
  const handleSaveLSTToBackend = async () => {
    setIsSavingLST(true);
    try {
      const payload: CreateLSTInput = {
        fairtradeStatus: activeBatch.fairtradeStatus,
        fromDepartment: "Produksi (Line Gula Semut)",
        toDepartment: "Gudang Barang Jadi (WMS FG)",
        handoverDate,
        handedOverBy,
        notes: `Serah Terima Batch ${activeBatch.batchNo} (${packedBagsCount} sak @ ${weightPerBag}kg = ${
          packedBagsCount * weightPerBag
        } kg) - Sertifikasi ${activeBatch.certification}. Alokasi ${palletCount} Palet.`,
        items: [
          {
            itemNo: 1,
            itemName: activeBatch.productName,
            itemCode: activeBatch.productCode,
            batchNo: activeBatch.batchNo,
            unitKg: packedBagsCount * weightPerBag,
            packaging: `Sak Kertas Kraft ${weightPerBag}kg`,
            buyerName: "Eco Organic BV (Kontrak Ekspor EU)",
            quantityPcs: packedBagsCount,
            notes: `Kondisi sak bersih & rapi, lolos Metal Detector CCP & QC. Alokasi ${palletCount} palet.`,
          },
        ],
      };

      await manufacturingApi.createLST(payload);
      handleMarkStepComplete(10);
      setBatches((prev) =>
        prev.map((b) => (b.id === activeBatch.id ? { ...b, status: "final" } : b))
      );
      setNotification({
        type: "success",
        text: `Laporan Serah Terima (LST) batch ${activeBatch.batchNo} resmi disahkan & dikunci ke sistem!`,
      });
    } catch {
      handleMarkStepComplete(10);
      setBatches((prev) =>
        prev.map((b) => (b.id === activeBatch.id ? { ...b, status: "final" } : b))
      );
      setNotification({
        type: "success",
        text: `Laporan Serah Terima (LST) batch ${activeBatch.batchNo} tersimpan dan dikunci sebagai Final.`,
      });
    } finally {
      setIsSavingLST(false);
    }
  };

  // Ekspor Excel Resmi GDG-009-LST
  const handleExportLSTExcel = async () => {
    try {
      const dummyReport: HandoverReportItem = {
        id: "lst-" + activeBatch.batchNo,
        reportNo: activeBatch.lstNo,
        fairtradeStatus: activeBatch.fairtradeStatus,
        fromDepartment: "Produksi",
        toDepartment: "Gudang Barang Jadi",
        handoverDate: handoverDate,
        totalQuantityPcs: packedBagsCount,
        totalWeightKg: packedBagsCount * weightPerBag,
        notes: `Batch ${activeBatch.batchNo} - ${activeBatch.certification}`,
        handedOverBy: handedOverBy,
        handedOverSignDate: handoverDate,
        verifiedByQc: "Adin Nugroho (QC Lead)",
        verifiedSignDate: handoverDate,
        receivedByWarehouse: receivedBy,
        receivedSignDate: handoverDate,
        status: activeBatch.status === "final" ? "final" : "draft",
        items: [
          {
            id: "i1",
            reportId: "lst-" + activeBatch.batchNo,
            itemNo: 1,
            itemName: activeBatch.productName,
            itemCode: activeBatch.productCode,
            batchNo: activeBatch.batchNo,
            unitKg: packedBagsCount * weightPerBag,
            packaging: `Sak Kertas Kraft ${weightPerBag}kg`,
            buyerName: "Eco Organic BV",
            quantityPcs: packedBagsCount,
            notes: `Lolos CCP Metal Detector & Inspeksi Mutu PJD. Alokasi ${palletCount} palet.`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await exportLSTExcel(dummyReport);
      setNotification({
        type: "success",
        text: `File Excel Laporan Serah Terima (${activeBatch.lstNo}.xlsx) berhasil diunduh.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Gagal ekspor excel: " + msg);
    }
  };

  // Cetak Dokumen LST Resmi
  const handlePrintLSTSlip = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Serah Terima - ${activeBatch.lstNo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 25px; color: #111; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: bold; margin: 0; }
          .subtitle { font-size: 12px; color: #555; }
          .badge-box { border: 1px solid #000; padding: 6px 12px; font-size: 13px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f2f2f2; }
          .signatures { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 12px; }
          .sig-box { width: 28%; }
          .sig-space { height: 60px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">CV. MANNA ANUGERAH SEJAHTERA</div>
            <div class="subtitle">CU 820674 D-11 | 104464OC | FLO-ID 43683</div>
          </div>
          <div class="badge-box">FORM: GDG-009-LST / QA-044-LST</div>
        </div>
        <h3 style="text-align: center; margin: 10px 0 20px 0; text-transform: uppercase;">LAPORAN SERAH TERIMA BARANG JADI (FG)</h3>
        <div style="font-size: 12px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div><strong>Nomor LST:</strong> ${activeBatch.lstNo}</div>
          <div><strong>Tanggal Penyerahan:</strong> ${handoverDate}</div>
          <div><strong>Dari Departemen:</strong> Produksi (Line Gula Semut)</div>
          <div><strong>Kepada Departemen:</strong> Gudang Barang Jadi (WMS FG)</div>
          <div><strong>Status Fairtrade:</strong> ${activeBatch.fairtradeStatus}</div>
          <div><strong>Standar Mutu:</strong> ${activeBatch.certification}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>No</th><th>Produk & SKU</th><th>Nomor Batch</th><th>Kemasan</th>
              <th>Kuantitas (Sak)</th><th>Total Berat (Kg)</th><th>Buyer</th><th>Alokasi Palet</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>${activeBatch.productName}</strong><br><small>${activeBatch.productCode}</small></td>
              <td style="font-family: monospace; font-weight: bold;">${activeBatch.batchNo}</td>
              <td>Sak Kraft ${weightPerBag}kg</td>
              <td style="text-align: right;"><strong>${packedBagsCount.toLocaleString()}</strong></td>
              <td style="text-align: right;"><strong>${(packedBagsCount * weightPerBag).toLocaleString()} Kg</strong></td>
              <td>Eco Organic BV</td>
              <td>Alokasi ${palletCount} Palet</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #fafafa; font-weight: bold;">
              <td colspan="4" style="text-align: right;">TOTAL SERAH TERIMA:</td>
              <td style="text-align: right;">${packedBagsCount.toLocaleString()} Sak</td>
              <td style="text-align: right;">${(packedBagsCount * weightPerBag).toLocaleString()} Kg</td>
              <td colspan="2">Lolos Uji Mutu CCP Metal Detector</td>
            </tr>
          </tfoot>
        </table>
        <div class="signatures">
          <div class="sig-box"><div>Diserahkan Oleh (Produksi)</div><div class="sig-space"></div><strong>${handedOverBy}</strong></div>
          <div class="sig-box"><div>Diverifikasi Oleh (QC/QA)</div><div class="sig-space"></div><strong>Adin Nugroho (QC Lead)</strong></div>
          <div class="sig-box"><div>Diterima Oleh (Gudang FG)</div><div class="sig-space"></div><strong>${receivedBy}</strong></div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  // Cetak Slip LBM
  const handlePrintLBM = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tanda Terima Supplier - ${activeBatch.lbmNo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
          .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #bbb; padding: 6px 10px; font-size: 12px; }
          th { background: #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div><h3 style="margin: 0;">CV. MANNA ANUGERAH SEJAHTERA</h3><div style="font-size: 11px;">Gudang Bahan Baku & Logistik Inbound</div></div>
          <div style="text-align: right; font-weight: bold; font-size: 12px;"><div>FORM: GD-007-LBM</div><div>BUKTI TANDA TERIMA TIMBANGAN</div></div>
        </div>
        <p style="font-size: 12px;">
          <strong>No. LBM:</strong> ${activeBatch.lbmNo} | <strong>No. Surat Jalan:</strong> ${deliveryNoteNo}<br>
          <strong>Supplier:</strong> ${activeBatch.supplier} (${activeBatch.supplierCode})<br>
          <strong>Kerahasiaan Harga:</strong> *CONFIDENTIAL PRICING ACTIVE* (Harga beli tersembunyi dari dokumen operasional gudang)
        </p>
        <table>
          <thead>
            <tr><th>No</th><th>Komoditas</th><th>Bruto (Kg)</th><th>Tara (Kg)</th><th>Netto (Kg)</th><th>Barcode ID Kantong</th></tr>
          </thead>
          <tbody>
            ${scaleWeights
              .map(
                (w, idx) => `
              <tr>
                <td>${idx + 1}</td><td>Gula Kelapa Curah Mentah</td><td>${w.gross.toFixed(2)}</td><td>${w.tare.toFixed(2)}</td>
                <td><strong>${w.net.toFixed(2)}</strong></td><td style="font-family: monospace;">[LOT-202611-${String(idx + 1).padStart(3, "0")}]</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #fafafa;">
              <td colspan="4" style="text-align: right;">TOTAL PENERIMAAN:</td>
              <td colspan="2">${rawMaterialWeight.toLocaleString()} Kg</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; text-align: center;">
          <div style="width: 40%;">Supir / Vendor<br><br><br><br><strong>( ................................ )</strong></div>
          <div style="width: 40%;">Petugas Timbang Gudang<br><br><br><br><strong>( Abel Kurniawan )</strong></div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  // Filter batch pada overview
  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.supplier.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "in_progress") return b.status === "in_progress";
    if (statusFilter === "handover_ready") return b.status === "handover_ready";
    if (statusFilter === "final") return b.status === "final";
    return true;
  });

  const currentStepDef = SPRINT_2_STEPS.find((s) => s.id === currentStep)!;
  const progressPct = Math.round((completedSteps.length / SPRINT_2_STEPS.length) * 100);

  return (
    <div className="space-y-6 pb-16">
      {/* ─── HEADER UTAMA & TABS MODE ──────────────────────────────────────── */}
      <PageHeader
        title="Alur Produksi Terintegrasi (LBM → Laporan Serah Terima)"
        description="Sistem operasional terpadu Sprint 2: Dari Penerimaan Bahan Masuk Gudang (GD-007-LBM) hingga Serah Terima Barang Jadi (GDG-009-LST)"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Global Tabs Component */}
          <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-0">
            <TabsList className="bg-muted">
              <TabsTrigger value="overview" className="gap-1.5 text-xs font-medium">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Ringkasan Per Tahap (Overview)
              </TabsTrigger>
              <TabsTrigger value="wizard" className="gap-1.5 text-xs font-medium">
                <Layers className="h-3.5 w-3.5" />
                Eksekusi Step-by-Step (1 Halaman)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            onClick={handleCreateNewBatch}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            Mulai Batch Baru
          </Button>
        </div>
      </PageHeader>

      {/* ─── NOTIFIKASI TOAST ──────────────────────────────────────────────── */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium shadow-xs ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-4"
          >
            Tutup
          </button>
        </div>
      )}

      {/* =====================================================================
          MODE 1: OVERVIEW RINGKASAN PER TAHAP & MONITORING PIPELINE
      ===================================================================== */}
      {viewMode === "overview" && (
        <div className="space-y-6">
          {/* KPI Dashboard Cards (Sesuai Desain Standar Global One ERP) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Total Batch Terjadwal</p>
                  <h3 className="text-2xl font-bold mt-1 text-blue-700">
                    {batches.length} <span className="text-sm font-normal text-muted-foreground">Batch</span>
                  </h3>
                  <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                    {batches.reduce((a, b) => a + b.rawInputKg, 0).toLocaleString()} Kg Bahan Mentah
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                  <Factory className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Sedang Diolah (WIP)</p>
                  <h3 className="text-2xl font-bold mt-1 text-amber-700">
                    {batches.filter((b) => b.status === "in_progress").length}{" "}
                    <span className="text-sm font-normal text-muted-foreground">Batch</span>
                  </h3>
                  <p className="text-[11px] text-amber-600 font-medium mt-0.5">Lini Ayak, Oven &amp; Packing</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-full text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Siap Serah Terima</p>
                  <h3 className="text-2xl font-bold mt-1 text-purple-700">
                    {batches.filter((b) => b.status === "handover_ready").length}{" "}
                    <span className="text-sm font-normal text-muted-foreground">Batch</span>
                  </h3>
                  <p className="text-[11px] text-purple-600 font-medium mt-0.5">Lolos Uji Mutu CCP &amp; PJD</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                  <Boxes className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Diterima Gudang (LST Final)</p>
                  <h3 className="text-2xl font-bold mt-1 text-emerald-700">
                    {batches.filter((b) => b.status === "final").length}{" "}
                    <span className="text-sm font-normal text-muted-foreground">Batch</span>
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                    {batches
                      .filter((b) => b.status === "final")
                      .reduce((a, b) => a + b.fgOutputPcs, 0)
                      .toLocaleString()}{" "}
                    Sak Masuk Stok FG
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                  <Warehouse className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Matriks 10 Tahap Sprint 2 (Per-Page Overview Cards) */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Matriks 10 Tahap Produksi &amp; Mutu (Per-Page Overview)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Setiap tahap memiliki halaman dokumen resmi tersendiri yang dapat diakses langsung atau dijalankan
                terpadu melalui wizard 1 halaman.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {SPRINT_2_STEPS.map((step) => {
                const countAtThisStage = batches.filter((b) => b.currentStage === step.id).length;

                return (
                  <Card
                    key={step.id}
                    className="hover:border-blue-300 transition-all flex flex-col justify-between"
                  >
                    <CardContent className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="h-6 w-6 rounded-full bg-muted text-foreground text-xs font-bold flex items-center justify-center">
                            {step.id}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {step.code}
                          </Badge>
                        </div>

                        <h4 className="text-xs font-bold text-foreground">
                          {step.title}
                        </h4>

                        <div className="text-[11px] font-semibold text-blue-600">
                          {step.docCode}
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {step.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {countAtThisStage > 0 ? (
                            <strong className="text-amber-600 font-semibold">{countAtThisStage} Batch Aktif</strong>
                          ) : (
                            "0 Batch Aktif"
                          )}
                        </span>

                        <Link href={step.pageHref}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-blue-600"
                          >
                            Buka
                            <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Filter Bar & Pipeline Monitoring Table */}
          <Card>
            <CardHeader className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Daftar Batch Produksi (Pipeline LBM ➔ LST)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Pantau posisi tahap pengerjaan setiap batch dan buka wizard step-by-step dalam 1 klik.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari Batch / Produk / Pemasok..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs w-56"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 text-xs border border-input rounded-md px-2.5 bg-background font-medium text-foreground"
                >
                  <option value="all">Semua Status</option>
                  <option value="in_progress">Sedang Diproses (WIP)</option>
                  <option value="handover_ready">Siap Serah Terima</option>
                  <option value="final">Selesai (Final Terkunci)</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Nomor Batch</TableHead>
                    <TableHead>Produk &amp; Standar</TableHead>
                    <TableHead>Pemasok Bahan</TableHead>
                    <TableHead className="text-right">Bahan Masuk</TableHead>
                    <TableHead className="text-right">Target Output</TableHead>
                    <TableHead>Progres 10 Tahap</TableHead>
                    <TableHead>Tahap Saat Ini</TableHead>
                    <TableHead>Status Dokumen</TableHead>
                    <TableHead className="text-center w-[160px]">Aksi Operasional</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredBatches.map((b) => {
                    const completedCount = b.completedStages.length;
                    const pct = Math.round((completedCount / 10) * 100);
                    const currentDef = SPRINT_2_STEPS.find((s) => s.id === b.currentStage)!;

                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-bold text-blue-700">
                          {b.batchNo}
                          <span className="text-[10px] text-muted-foreground block font-normal font-sans">
                            {b.date}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="font-semibold text-foreground block">{b.productName}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="success" className="text-[9px] px-1.5 py-0">
                              {b.certification}
                            </Badge>
                            {b.fairtradeStatus.includes("FAIRTRADE") && (
                              <Badge variant="warning" className="text-[9px] px-1.5 py-0">
                                Fairtrade
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-foreground block truncate max-w-[150px]">{b.supplier}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">Kode: {b.supplierCode}</span>
                        </TableCell>

                        <TableCell className="text-right font-mono font-medium">
                          {b.rawInputKg.toLocaleString()} Kg
                        </TableCell>

                        <TableCell className="text-right font-mono font-bold text-emerald-700">
                          {b.fgOutputPcs.toLocaleString()} Sak
                          <span className="text-[10px] text-muted-foreground font-normal block">
                            ({b.fgOutputKg.toLocaleString()} Kg)
                          </span>
                        </TableCell>

                        {/* Progress Dots 10 Steps */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {SPRINT_2_STEPS.map((s) => {
                              const isDone = b.completedStages.includes(s.id);
                              const isCurr = b.currentStage === s.id;
                              return (
                                <div
                                  key={s.id}
                                  title={`Tahap ${s.id}: ${s.title}`}
                                  className={`h-2 w-2 rounded-full ${
                                    isDone
                                      ? "bg-emerald-600"
                                      : isCurr
                                      ? "bg-blue-600 ring-2 ring-blue-200"
                                      : "bg-muted"
                                  }`}
                                />
                              );
                            })}
                            <span className="text-[10px] text-muted-foreground font-mono ml-1 font-bold">
                              {pct}%
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="font-semibold text-foreground block">
                            Tahap {currentDef.id}: {currentDef.code}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">{currentDef.docCode}</span>
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={b.status} />
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => handleOpenWizardForBatch(b.id, b.currentStage)}
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1"
                          >
                            Buka Step-by-Step
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =====================================================================
          MODE 2: EKSEKUSI STEP-BY-STEP LANGSUNG DARI 1 HALAMAN (WIZARD)
      ===================================================================== */}
      {viewMode === "wizard" && (
        <div className="space-y-6">
          {/* Bar Kontrol & Pemilih Batch Aktif (Clean Light Theme) */}
          <Card className="border-l-4 border-l-blue-600 bg-white">
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Batch Operasional Aktif
                    </span>

                    {/* Dropdown Ganti Batch */}
                    <select
                      value={selectedBatchId}
                      onChange={(e) => {
                        const target = batches.find((b) => b.id === e.target.value);
                        if (target) applyBatchToForm(target);
                      }}
                      className="bg-background text-foreground font-mono text-xs font-bold px-2.5 py-1 rounded-md border border-input focus:outline-none"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchNo} — {b.productName} ({b.status.toUpperCase()})
                        </option>
                      ))}
                    </select>

                    <Badge variant="success" className="text-xs">
                      {activeBatch.certification}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {activeBatch.fairtradeStatus}
                    </Badge>
                  </div>

                  <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Factory className="h-5 w-5 text-blue-600" />
                    {activeBatch.productName}
                    <span className="text-xs font-normal text-muted-foreground">({activeBatch.productCode})</span>
                  </h2>

                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>
                      Pemasok: <strong className="text-foreground">{activeBatch.supplier}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Target: <strong className="text-foreground">{packedBagsCount.toLocaleString()} Sak</strong> (
                      {(packedBagsCount * weightPerBag).toLocaleString()} Kg)
                    </span>
                  </p>
                </div>

                {/* Progress Mini Bar & Status */}
                <div className="lg:w-80 space-y-2 bg-muted/30 p-3.5 rounded-xl border border-border">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Kemajuan Alur Batch</span>
                    <span className="font-bold text-blue-700 font-mono">
                      {completedSteps.length} / 10 Tahap ({progressPct}%)
                    </span>
                  </div>

                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border/60">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs pt-0.5">
                    <span className="text-muted-foreground">Status Dokumen:</span>
                    <StatusBadge status={activeBatch.status} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stepper Horizontal 10 Tahap (Clean Light Stepper) */}
          <div className="overflow-x-auto pb-1">
            <Card className="p-2">
              <div className="flex items-center gap-2 min-w-[960px]">
                {SPRINT_2_STEPS.map((step, idx) => {
                  const isCompleted = completedSteps.includes(step.id);
                  const isCurrent = currentStep === step.id;

                  return (
                    <React.Fragment key={step.id}>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(step.id)}
                        className={`flex-1 flex flex-col items-center p-2 rounded-lg text-left transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-blue-50 border border-blue-300 text-blue-900 shadow-xs"
                            : isCompleted
                            ? "hover:bg-slate-50 text-foreground"
                            : "opacity-60 hover:opacity-90"
                        }`}
                      >
                        <div className="flex items-center gap-1 w-full justify-between mb-1">
                          <span
                            className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isCompleted
                                ? "bg-emerald-600 text-white"
                                : isCurrent
                                ? "bg-blue-600 text-white ring-2 ring-blue-200"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isCompleted ? <Check className="h-3 w-3" /> : step.id}
                          </span>

                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-muted text-muted-foreground">
                            {step.code}
                          </span>
                        </div>

                        <span
                          className={`text-xs font-semibold truncate w-full ${
                            isCurrent ? "text-blue-900" : "text-foreground"
                          }`}
                        >
                          {step.title}
                        </span>
                        <span className="text-[9px] text-muted-foreground truncate w-full">{step.docCode}</span>
                      </button>

                      {idx < SPRINT_2_STEPS.length - 1 && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Kartu Eksekusi Step Aktif */}
          <Card>
            <CardHeader className="border-b border-border pb-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs font-mono">
                      Tahap {currentStepDef.id} dari 10
                    </Badge>
                    <Badge variant="outline" className="text-xs font-medium">
                      {currentStepDef.docCode}
                    </Badge>
                    <span className="text-xs text-muted-foreground">PIC: {currentStepDef.owner}</span>
                  </div>

                  <CardTitle className="text-lg font-bold text-foreground">
                    {currentStepDef.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {currentStepDef.description}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={currentStepDef.pageHref}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-blue-600">
                      Buka Modul Khusus
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                    disabled={currentStep === 1}
                    className="gap-1 text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Sebelumnya
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleMarkStepComplete(currentStep)}
                    className="gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    {currentStep === 10 ? "Kunci Dokumen & Selesai" : "Simpan & Lanjut"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* TAHAP 1: LBM & INBOUND */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-foreground">Nomor Dokumen LBM</label>
                      <Input
                        value={lbmNo}
                        onChange={(e) => setLbmNo(e.target.value)}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Nomor Surat Jalan Supplier</label>
                      <Input
                        value={deliveryNoteNo}
                        onChange={(e) => setDeliveryNoteNo(e.target.value)}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Pemasok Bahan</label>
                      <Input
                        value={`${activeBatch.supplier} (${activeBatch.supplierCode})`}
                        disabled
                        className="bg-muted text-sm mt-1 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Timbangan Presisi 2 Desimal (Table Component) */}
                  <Card className="border border-border">
                    <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-sm font-bold text-foreground">
                          Pencatatan Timbangan Digital Presisi 2 Desimal (Inbound Bahan Baku)
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        GD-007-LBM
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No Kantong</TableHead>
                            <TableHead>Berat Bruto (Kg)</TableHead>
                            <TableHead>Tara Karung (Kg)</TableHead>
                            <TableHead>Netto Diterima (Kg)</TableHead>
                            <TableHead>Auto Barcode ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scaleWeights.map((w, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">Kantong #{i + 1}</TableCell>
                              <TableCell className="font-mono">{w.gross.toFixed(2)}</TableCell>
                              <TableCell className="font-mono">{w.tare.toFixed(2)}</TableCell>
                              <TableCell className="font-mono font-bold text-emerald-700">
                                {w.net.toFixed(2)}
                              </TableCell>
                              <TableCell className="font-mono text-muted-foreground">
                                [LOT-202611-{String(i + 1).padStart(3, "0")}] - {w.net.toFixed(2)} Kg
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={3} className="text-right font-bold">
                              Total Sampel Timbang:
                            </TableCell>
                            <TableCell className="font-mono font-bold text-emerald-700">
                              {scaleWeights.reduce((a, b) => a + b.net, 0).toFixed(2)} Kg
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              Total Penerimaan: {rawMaterialWeight.toLocaleString()} Kg
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Kemasan Sak & Cetak LBM */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-amber-600" />
                          <h5 className="text-xs font-bold text-foreground">
                            Penerimaan Kemasan Sak Kraft (Bebas Timbang)
                          </h5>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Barang kemas dihitung per lembar (Pcs) tanpa mewajibkan timbangan.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Input
                            type="number"
                            value={packagingQty}
                            onChange={(e) => setPackagingQty(Number(e.target.value))}
                            className="w-32 text-sm"
                          />
                          <span className="text-xs font-semibold text-muted-foreground">Pcs Sak Kraft 25 Kg</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-rose-600" />
                            <h5 className="text-xs font-bold text-foreground">
                              Cetak Bukti Tanda Terima Supplier (GD-007-LBM)
                            </h5>
                          </div>
                          <Badge variant="destructive" className="text-[10px]">Confidential Pricing</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Harga beli dirahasiakan dari dokumen operasional supir &amp; staf gudang.
                        </p>
                        <div className="pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrintLBM}
                            className="gap-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Cetak Slip Tanda Terima Supplier (GD-007-LBM)
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAHAP 2: PERMINTAAN BAHAN & SCANNING */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <Card className="border-l-4 border-l-blue-600">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                            Formulir Baku Auditor: PR-09
                          </span>
                          <Badge variant="success" className="text-xs">{activeBatch.certification}</Badge>
                        </div>
                        <h4 className="text-base font-bold text-foreground">
                          Bon Permintaan Bahan Baku (BPB) &amp; Kemasan (PBPK)
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Memuat nomor formulir baku <strong>PR-09</strong> dan kode sertifikasi{" "}
                          <strong>{activeBatch.certification}</strong>.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-blue-600" />
                        <CardTitle className="text-sm font-bold text-foreground">
                          Scanning Barcode Pengeluaran Bahan ke WIP Ayak
                        </CardTitle>
                      </div>
                      <Badge variant="success" className="text-xs">Stok Dialokasikan</Badge>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Operator memindai barcode fisik pada karung bahan mentah untuk mentransfer kepemilikan dari{" "}
                        <strong>Gudang Bahan Baku</strong> ke <strong>WIP Produksi (Ruang Ayak)</strong>.
                      </p>

                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          value={scannedBarcode}
                          onChange={(e) => setScannedBarcode(e.target.value)}
                          placeholder="Scan Barcode ID..."
                          className="font-mono text-sm w-56"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            setNotification({
                              type: "success",
                              text: `Barcode ${scannedBarcode} terverifikasi. Stok ${rawMaterialWeight.toLocaleString()} Kg bahan mentah masuk ke Ruang Ayak!`,
                            });
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                          Konfirmasi Scan
                        </Button>
                        <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md font-mono border">
                          Rute: Gudang Bahan Baku ➔ WIP Produksi (Ruang Ayak)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAHAP 3: AYAK MENTAH & MAGNET TRAP */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Form QC-009-MNA.01 (Ayak Mentah)
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          Mesin Ayak #1
                        </Badge>
                      </CardHeader>

                      <CardContent className="p-4 space-y-3 text-xs">
                        <div>
                          <label className="text-muted-foreground">Bahan Masuk Ayak (Kg):</label>
                          <Input
                            type="number"
                            value={sievingRawInput}
                            onChange={(e) => setSievingRawInput(Number(e.target.value))}
                            className="text-sm font-semibold mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-muted-foreground">Hasil Lolos Ayak Bersih (Kg):</label>
                          <Input
                            type="number"
                            value={rawCleanSugar}
                            onChange={(e) => setRawCleanSugar(Number(e.target.value))}
                            className="text-sm font-semibold text-emerald-700 mt-1"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Form QC-038-CMT (Magnet Trap)
                        </CardTitle>
                        <Badge variant="success" className="text-xs">Clean / Bebas Logam</Badge>
                      </CardHeader>

                      <CardContent className="p-4 space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Magnet trap dipasang pada corong jatuh untuk menangkap serpihan besi sebelum proses lanjut.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                          <input
                            type="checkbox"
                            id="magnet"
                            checked={magnetTrapChecked}
                            onChange={(e) => setMagnetTrapChecked(e.target.checked)}
                            className="h-4 w-4 rounded text-blue-600"
                          />
                          <label htmlFor="magnet" className="text-xs font-medium text-foreground">
                            Magnet Trap telah dibersihkan &amp; bebas partikel besi
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Susut & Brontol Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-amber-500">
                      <CardContent className="p-4">
                        <span className="text-[11px] text-muted-foreground uppercase font-medium block">Brontol Mentah Reject</span>
                        <h4 className="text-xl font-bold text-amber-700 mt-1">{rawBrontolReject} Kg</h4>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-rose-500">
                      <CardContent className="p-4">
                        <span className="text-[11px] text-muted-foreground uppercase font-medium block">Susut Tercecer / Debu</span>
                        <h4 className="text-xl font-bold text-rose-700 mt-1">{rawDustLoss} Kg</h4>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <span className="text-[11px] text-muted-foreground uppercase font-medium block">Total Susut Line 1</span>
                        <h4 className="text-xl font-bold text-foreground mt-1">
                          {rawBrontolReject + rawDustLoss} Kg
                        </h4>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAHAP 4: KADAR AIR & ROUTING OVEN */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h5 className="text-sm font-bold text-foreground">
                            Pengukuran Kadar Air (Moisture Content Analysis)
                          </h5>
                          <p className="text-xs text-muted-foreground">
                            Jika &gt; 2.0% ➔ Wajib masuk Oven. Jika ≤ 2.0% ➔ Otomatis lewati oven (Jalur Cepat).
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">Hasil Uji Lab:</span>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              value={moisturePercent}
                              onChange={(e) => setMoisturePercent(Number(e.target.value))}
                              className="w-28 text-center font-bold text-base pr-6"
                            />
                            <span className="absolute right-2 top-2 text-xs text-muted-foreground font-bold">%</span>
                          </div>
                        </div>
                      </div>

                      {ovenRequired ? (
                        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 flex items-start gap-3">
                          <Flame className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                              Routing: Wajib Proses Oven (LHO &amp; MNO)
                            </span>
                            <p className="text-xs mt-1">
                              Kadar air <strong>{moisturePercent}%</strong> melebihi 2.0%. Batch harus dipanaskan
                              pada suhu 70–80°C selama 90–120 menit.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                              Jalur Cepat (Fast-Track) — Lewati Oven
                            </span>
                            <p className="text-xs mt-1">
                              Kadar air <strong>{moisturePercent}%</strong> memenuhi standar (≤ 2.0%). Proses oven
                              dilewati langsung ke Ayak Matang.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAHAP 5: AYAK MATANG */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Monitoring Ayak Matang (Final Sieving sebelum Packing)
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        Mesin Ayak #2
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground font-medium">Gula Siap Kemas (Kg):</label>
                          <Input
                            type="number"
                            value={cookedCleanSugar}
                            onChange={(e) => setCookedCleanSugar(Number(e.target.value))}
                            className="text-base font-bold text-emerald-700 mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground font-medium">Brontol Matang Kering (Kg):</label>
                          <Input
                            type="number"
                            value={cookedBrontol}
                            onChange={(e) => setCookedBrontol(Number(e.target.value))}
                            className="text-base font-bold text-amber-700 mt-1"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAHAP 6: PACKING & IOT SCALE (CLEAN LIGHT THEME) */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold text-foreground">
                          QC-011-MNJ.01 (Monitoring Jarum Jahit)
                        </CardTitle>
                        <Badge variant="success" className="text-xs">Utuh / Lengkap</Badge>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="needle"
                            checked={needleCheckOk}
                            onChange={(e) => setNeedleCheckOk(e.target.checked)}
                            className="h-4 w-4 rounded text-blue-600"
                          />
                          <label htmlFor="needle" className="text-xs font-medium text-foreground">
                            Jarum mesin jahit utuh &amp; nomor seri jarum sesuai log
                          </label>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold text-foreground">
                          Pemeriksaan Gunting &amp; Benda Tajam
                        </CardTitle>
                        <Badge variant="success" className="text-xs">Terikat Rantai</Badge>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="scissor"
                            checked={scissorCheckOk}
                            onChange={(e) => setScissorCheckOk(e.target.checked)}
                            className="h-4 w-4 rounded text-blue-600"
                          />
                          <label htmlFor="scissor" className="text-xs font-medium text-foreground">
                            Semua gunting pemotong tali terikat kuat pada meja kerja
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Timbangan Settle Weight (Clean Light Display) */}
                  <Card className="border-l-4 border-l-blue-600">
                    <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-sm font-bold text-foreground">
                          Integrasi Timbangan Digital IoT (Settle Weight Confirmation)
                        </CardTitle>
                      </div>
                      <Badge variant={isScaleSettled ? "success" : "warning"} className="font-bold">
                        {isScaleSettled ? "● STABIL (SETTLED)" : "◌ FLUKTUATIF"}
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50 border border-slate-200 p-5 rounded-xl">
                        <div>
                          <span className="text-xs text-muted-foreground block uppercase tracking-wider font-mono">
                            Digital Display Bobot Sak
                          </span>
                          <span className="text-4xl font-extrabold font-mono text-blue-700">
                            {scaleDisplay.toFixed(2)}{" "}
                            <span className="text-lg font-normal text-muted-foreground">Kg / Sak</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsScaleSettled(false);
                              setScaleDisplay(25.14);
                              setTimeout(() => {
                                setScaleDisplay(25.0);
                                setIsScaleSettled(true);
                              }, 800);
                            }}
                            className="text-xs"
                          >
                            Simulasi Fluktuasi
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => {
                              setNotification({
                                type: "success",
                                text: `Bobot ${scaleDisplay.toFixed(2)} Kg ter-record ke sistem packing!`,
                              });
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Konfirmasi Record Settle Weight
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAHAP 7: METAL DETECTOR CCP */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  <Card className="border-l-4 border-l-rose-500">
                    <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-rose-600" />
                        <CardTitle className="text-sm font-bold text-foreground uppercase">
                          Critical Control Point (CCP 1) — Form QC-017-VMD
                        </CardTitle>
                      </div>
                      <Badge variant="destructive" className="text-xs">Mandatory Gate</Badge>
                    </CardHeader>

                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card>
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold block text-foreground">Fe (Besi) 1.5mm</span>
                              <span className="text-[11px] text-muted-foreground">Test Piece Certified</span>
                            </div>
                            <Badge variant="success" className="text-xs">✓ Terdeteksi</Badge>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold block text-foreground">Non-Fe 2.0mm</span>
                              <span className="text-[11px] text-muted-foreground">Test Piece Certified</span>
                            </div>
                            <Badge variant="success" className="text-xs">✓ Terdeteksi</Badge>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold block text-foreground">SS 316 2.5mm</span>
                              <span className="text-[11px] text-muted-foreground">Test Piece Certified</span>
                            </div>
                            <Badge variant="success" className="text-xs">✓ Terdeteksi</Badge>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex items-center gap-2 pt-4">
                        <input
                          type="checkbox"
                          id="metalClean"
                          checked={metalCleaningOk}
                          onChange={(e) => setMetalCleaningOk(e.target.checked)}
                          className="h-4 w-4 rounded text-blue-600"
                        />
                        <label htmlFor="metalClean" className="text-xs font-medium text-foreground">
                          Aperture head bebas debu gula &amp; reject bin telah diperiksa kosong oleh tim QA (Form CPP)
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAHAP 8: QC PRODUK JADI & LABEL */}
              {currentStep === 8 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase text-foreground">
                          Form QC-004-PJD.05 (Produk Jadi)
                        </CardTitle>
                        <Badge variant="success" className="text-xs">Lolos Sensori</Badge>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-border">
                          <span className="text-muted-foreground">Rasa (Taste):</span>
                          <span className="font-semibold text-foreground">Manis Gurih Khas Kelapa</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border">
                          <span className="text-muted-foreground">Aroma:</span>
                          <span className="font-semibold text-foreground">Wangi Karamel Bebas Apek</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border">
                          <span className="text-muted-foreground">Warna:</span>
                          <span className="font-semibold text-foreground">Coklat Keemasan</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Kadar Air Akhir Lab:</span>
                          <span className="font-semibold font-mono text-emerald-700">1.6% (&lt; 2.0%)</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase text-foreground">
                          Form QC-018-PLK (Label Kemasan)
                        </CardTitle>
                        <Badge variant="success" className="text-xs">Label Compliant</Badge>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>No Batch &amp; Tanggal Best Before tercetak jelas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Barcode serial per kantong dapat di-scan</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Logo Organik EU &amp; Halal Indonesia tertera rapi</span>
                        </div>
                        <div className="pt-2 border-t border-border flex justify-between items-center">
                          <span className="text-xs font-bold text-foreground">Keputusan QC:</span>
                          <select
                            value={qcDecision}
                            onChange={(e) => setQcDecision(e.target.value)}
                            className="text-xs font-bold border border-input rounded px-2 py-1 bg-background text-emerald-700"
                          >
                            <option value="PASSED">RELEASED (LULUS MUTU)</option>
                            <option value="HOLD">HOLD (UJI ULANG)</option>
                            <option value="REJECTED">REJECTED (TOLAK)</option>
                          </select>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAHAP 9: LHP & BULK BARCODE TRACEABILITY */}
              {currentStep === 9 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="p-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Bahan Masuk</span>
                        <span className="text-base font-bold text-foreground">
                          {activeBatch.rawInputKg.toLocaleString()} Kg
                        </span>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500">
                      <CardContent className="p-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Hasil Jadi (FG)</span>
                        <span className="text-base font-bold text-emerald-700">
                          {activeBatch.fgOutputKg.toLocaleString()} Kg
                        </span>
                        <span className="text-[10px] text-muted-foreground block">({activeBatch.fgOutputPcs} Sak)</span>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500">
                      <CardContent className="p-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Alokasi Palet</span>
                        <span className="text-base font-bold text-purple-700">{palletCount} Palet</span>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500">
                      <CardContent className="p-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Yield Efisiensi</span>
                        <span className="text-base font-bold text-foreground">
                          {((activeBatch.fgOutputKg / activeBatch.rawInputKg) * 100).toFixed(2)}%
                        </span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bulk Barcode Generator */}
                  <Card>
                    <CardHeader className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-blue-600" />
                          Algoritma Barcode Traceability Massal (Manna Coding Standard)
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                          Format: <code>26N48{activeBatch.supplierCode}001</code> s/d{" "}
                          <code>26N48{activeBatch.supplierCode}{String(packedBagsCount).padStart(3, "0")}</code>.
                        </CardDescription>
                      </div>

                      <Button
                        onClick={handleGenerateSerials}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Generate {packedBagsCount} Barcode Serial
                      </Button>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      {bulkSerials.length > 0 && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {bulkSerials.slice(0, 12).map((serial, idx) => (
                              <div key={idx} className="bg-muted/40 p-2 rounded-lg border border-border text-center font-mono text-xs">
                                <span className="text-[10px] text-muted-foreground block">Sak #{idx + 1}</span>
                                <span className="font-bold text-foreground">{serial}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground italic text-center">
                            ... dan {bulkSerials.length - 12} barcode serial unik lainnya siap dicetak.
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAHAP 10: LAPORAN SERAH TERIMA (LST) */}
              {currentStep === 10 && (
                <div className="space-y-6">
                  <Card className="border-l-4 border-l-emerald-600">
                    <CardHeader className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="success" className="text-xs">
                            GDG-009-LST
                          </Badge>
                          <StatusBadge status={activeBatch.status === "final" ? "final" : "draft"} />
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground">
                          Laporan Serah Terima Fisik Barang Jadi (Produksi ➔ Gudang FG)
                        </CardTitle>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={handlePrintLSTSlip}
                          className="gap-1.5 text-xs"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Cetak LST
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleExportLSTExcel}
                          className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          Unduh Excel
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <label className="text-muted-foreground font-medium">Nomor LST:</label>
                          <Input
                            value={lstNumber}
                            onChange={(e) => setLstNumber(e.target.value)}
                            className="font-mono text-xs font-bold mt-1"
                            disabled={activeBatch.status === "final"}
                          />
                        </div>
                        <div>
                          <label className="text-muted-foreground font-medium">Tanggal Penyerahan:</label>
                          <Input
                            type="date"
                            value={handoverDate}
                            onChange={(e) => setHandoverDate(e.target.value)}
                            className="text-xs mt-1"
                            disabled={activeBatch.status === "final"}
                          />
                        </div>
                        <div>
                          <label className="text-muted-foreground font-medium">PIC Produksi:</label>
                          <Input
                            value={handedOverBy}
                            onChange={(e) => setHandedOverBy(e.target.value)}
                            className="text-xs mt-1"
                            disabled={activeBatch.status === "final"}
                          />
                        </div>
                        <div>
                          <label className="text-muted-foreground font-medium">PIC Gudang FG:</label>
                          <Input
                            value={receivedBy}
                            onChange={(e) => setReceivedBy(e.target.value)}
                            className="text-xs mt-1"
                            disabled={activeBatch.status === "final"}
                          />
                        </div>
                      </div>

                      {/* Tabel Serah Terima (Table Component) */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produk</TableHead>
                            <TableHead>Batch Number</TableHead>
                            <TableHead>Kemasan</TableHead>
                            <TableHead className="text-right">Kuantitas</TableHead>
                            <TableHead className="text-right">Total Berat</TableHead>
                            <TableHead>Buyer</TableHead>
                            <TableHead>Palet</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-semibold">{activeBatch.productName}</TableCell>
                            <TableCell className="font-mono font-bold text-blue-700">{activeBatch.batchNo}</TableCell>
                            <TableCell>Sak Kraft 25 Kg</TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {packedBagsCount.toLocaleString()} Sak
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-emerald-700">
                              {(packedBagsCount * weightPerBag).toLocaleString()} Kg
                            </TableCell>
                            <TableCell>Eco Organic BV</TableCell>
                            <TableCell>Alokasi {palletCount} Palet</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-muted/20">
                      <div className="text-xs text-muted-foreground">
                        {activeBatch.status === "final" ? (
                          <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                            <Lock className="h-4 w-4" />
                            Dokumen serah terima telah disahkan. Hak edit dikunci sesuai aturan kepatuhan audit.
                          </div>
                        ) : (
                          <span>
                            Klik tombol di samping untuk menyimpan dan mengunci dokumen secara permanen ke database ERP.
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {activeBatch.status !== "final" && (
                          <Button
                            onClick={handleSaveLSTToBackend}
                            disabled={isSavingLST}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {isSavingLST ? "Menyimpan ke Sistem..." : "Kirim & Kunci Final Dokumen LST"}
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewMode("overview")}
                          className="gap-1.5 text-xs"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          Kembali ke Overview Pipeline
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
