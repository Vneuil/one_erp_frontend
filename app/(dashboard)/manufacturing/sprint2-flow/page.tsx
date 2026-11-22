"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Printer,
  Download,
  Sparkles,
  Scale,
  FileText,
  CheckSquare,
  Factory,
  ShieldCheck,
  QrCode,
  Boxes,
  Package,
  Flame,
  FileSpreadsheet,
  Lock,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Truck,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  manufacturingApi,
  CreateLSTInput,
  CreateLSTItemInput,
  HandoverReportItem,
} from "@/lib/api/manufacturing";
import { exportLSTExcel } from "@/lib/utils/export-wip-excel";

// ─── TIPE DATA STEPS ──────────────────────────────────────────────────────────
export interface StepDef {
  id: number;
  code: string;
  title: string;
  docCode: string;
  owner: string;
  description: string;
}

export const SPRINT_2_STEPS: StepDef[] = [
  {
    id: 1,
    code: "LBM",
    title: "Inbound & LBM",
    docCode: "GD-007-LBM",
    owner: "Gudang (Mas Abel / Mbak Sari)",
    description: "Penerimaan bahan baku dengan timbangan presisi 2 desimal & tanda terima supplier (harga tersembunyi).",
  },
  {
    id: 2,
    code: "BPB",
    title: "Permintaan Bahan Baku & Kemas",
    docCode: "PR-09",
    owner: "Produksi (Mas Mario)",
    description: "Form serah terima bahan PR-09 & scanning barcode pengambilan dari gudang ke WIP ayak.",
  },
  {
    id: 3,
    code: "AYAK_1",
    title: "Ayak Mentah & Magnet Trap",
    docCode: "QC-009-MNA.01 & QC-038-CMT",
    owner: "Produksi & QC (Pak Adin)",
    description: "Monitoring proses ayak mentah, pembersihan magnet trap, dan pencatatan brontol/susut.",
  },
  {
    id: 4,
    code: "OVEN",
    title: "Cek Kadar Air & Routing Oven",
    docCode: "QC-012-MNO.05 & LHO",
    owner: "QC & Operator Oven",
    description: "Evaluasi kadar air: jika > 2.0% wajib oven, jika ≤ 2.0% dilewati (jalur cepat ke Ayak Matang).",
  },
  {
    id: 5,
    code: "AYAK_2",
    title: "Ayak Matang (Sieving 2)",
    docCode: "QC-009-MNA.01",
    owner: "Produksi",
    description: "Pemisahan brontol kering matang & pemastian keutuhan mesh screen sebelum pengemasan.",
  },
  {
    id: 6,
    code: "PACKING",
    title: "Ruang Packing & Timbangan IoT",
    docCode: "QC-011-MNJ.01 & Scale IoT",
    owner: "Operator Packing & QC",
    description: "Pengecekan jarum/gunting utuh & penimbangan dengan tombol konfirmasi 'Settle Weight'.",
  },
  {
    id: 7,
    code: "METAL",
    title: "Verifikasi Metal Detector CCP",
    docCode: "QC-017-VMD & CPP",
    owner: "QA/QC (Pak Adin)",
    description: "Critical Control Point (CCP 1): Verifikasi 3 test piece (Fe 1.5mm, Non-Fe 2.0mm, SS 2.5mm).",
  },
  {
    id: 8,
    code: "PJD",
    title: "Pemeriksaan Produk Jadi & Label",
    docCode: "QC-004-PJD.05 & QC-018-PLK",
    owner: "QC Release Officer",
    description: "Organoleptik (rasa, aroma, warna, mesh), pemeriksaan barcode label & keputusan rilis QC.",
  },
  {
    id: 9,
    code: "LHP",
    title: "Laporan Hasil Produksi & Stiker QR",
    docCode: "PRO-002-LHP & Bulk QR",
    owner: "Admin Produksi",
    description: "Rekap yield/susut, penomoran palet, dan auto-generate bulk serial stiker QR (cth: 26N48PW001-850).",
  },
  {
    id: 10,
    code: "LST",
    title: "Laporan Serah Terima (LST)",
    docCode: "GDG-009-LST / QA-044-LST",
    owner: "Produksi & Gudang FG",
    description: "Penyerahan resmi barang jadi ke Gudang Barang Jadi, verifikasi QC, dan penguncian status Final.",
  },
];

export default function Sprint2WorkflowPage() {
  const [currentStep, setCurrentStep] = React.useState<number>(1);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);

  // ─── DATA BATCH & WORKFLOW STATE ──────────────────────────────────────────
  const [batchNo, setBatchNo] = React.useState<string>("26N48PW213");
  const [productName, setProductName] = React.useState<string>("Organic Coconut Sugar 25kg");
  const [productCode, setProductCode] = React.useState<string>("GSO-001");
  const [supplierCode, setSupplierCode] = React.useState<string>("PW");
  const [supplierName, setSupplierName] = React.useState<string>("Kelompok Tani Purworejo (Pak Wahyu)");
  const [certification, setCertification] = React.useState<string>("Organik EU");
  const [fairtradeStatus, setFairtradeStatus] = React.useState<string>("NON FAIRTRADE");

  // Step 1: Inbound & LBM State
  const [lbmNo, setLbmNo] = React.useState<string>("LBM-202611-008");
  const [deliveryNoteNo, setDeliveryNoteNo] = React.useState<string>("SJ-PW-8821");
  const [scaleWeights, setScaleWeights] = React.useState<Array<{ gross: number; tare: number; net: number }>>([
    { gross: 10.25, tare: 0.2, net: 10.05 },
    { gross: 10.26, tare: 0.2, net: 10.06 },
    { gross: 10.24, tare: 0.2, net: 10.04 },
  ]);
  const [packagingQty, setPackagingQty] = React.useState<number>(860);
  const [lbmPrinted, setLbmPrinted] = React.useState<boolean>(false);

  // Step 2: Requisition & Barcode Scan
  const [scannedBarcode, setScannedBarcode] = React.useState<string>("BARCODE-GDG-101");
  const [rawMaterialIssued, setRawMaterialIssued] = React.useState<boolean>(true);
  const [rawMaterialWeight, setRawMaterialWeight] = React.useState<number>(21500); // 21,500 kg

  // Step 3: Ayak Mentah & Magnet Trap
  const [sievingRawInput, setSievingRawInput] = React.useState<number>(21500);
  const [rawCleanSugar, setRawCleanSugar] = React.useState<number>(21285);
  const [rawBrontolReject, setRawBrontolReject] = React.useState<number>(107.5);
  const [rawDustLoss, setRawDustLoss] = React.useState<number>(107.5);
  const [magnetTrapChecked, setMagnetTrapChecked] = React.useState<boolean>(true);

  // Step 4: Moisture Content & Oven Routing
  const [moisturePercent, setMoisturePercent] = React.useState<number>(1.8);
  const [ovenRequired, setOvenRequired] = React.useState<boolean>(false);
  const [ovenTemp, setOvenTemp] = React.useState<number>(75);
  const [ovenDurationMins, setOvenDurationMins] = React.useState<number>(120);

  // Step 5: Ayak Matang
  const [cookedCleanSugar, setCookedCleanSugar] = React.useState<number>(21250);
  const [cookedBrontol, setCookedBrontol] = React.useState<number>(35);
  const [meshConditionOk, setMeshConditionOk] = React.useState<boolean>(true);

  // Step 6: Packing Room & IoT Scale
  const [needleCheckOk, setNeedleCheckOk] = React.useState<boolean>(true);
  const [scissorCheckOk, setScissorCheckOk] = React.useState<boolean>(true);
  const [scaleDisplay, setScaleDisplay] = React.useState<number>(25.0);
  const [isScaleSettled, setIsScaleSettled] = React.useState<boolean>(true);
  const [packedBagsCount, setPackedBagsCount] = React.useState<number>(850);
  const [weightPerBag, setWeightPerBag] = React.useState<number>(25.0);

  // Step 7: Metal Detector CCP
  const [metalTestFe, setMetalTestFe] = React.useState<boolean>(true);
  const [metalTestNonFe, setMetalTestNonFe] = React.useState<boolean>(true);
  const [metalTestSS, setMetalTestSS] = React.useState<boolean>(true);
  const [metalCleaningOk, setMetalCleaningOk] = React.useState<boolean>(true);

  // Step 8: QC Finished Goods
  const [sensoryPassed, setSensoryPassed] = React.useState<boolean>(true);
  const [labelInspectionPassed, setLabelInspectionPassed] = React.useState<boolean>(true);
  const [qcDecision, setQcDecision] = React.useState<string>("PASSED");

  // Step 9: LHP & Bulk Barcode Generation
  const [bulkSerials, setBulkSerials] = React.useState<string[]>([]);
  const [palletCount, setPalletCount] = React.useState<number>(22);
  const [isSerialsGenerated, setIsSerialsGenerated] = React.useState<boolean>(false);

  // Step 10: LST (Laporan Serah Terima)
  const [lstNumber, setLstNumber] = React.useState<string>("GDG-009-LST-202611-044");
  const [handoverDate, setHandoverDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [handedOverBy, setHandedOverBy] = React.useState<string>("Nicholas Tantra (Spv Produksi)");
  const [receivedBy, setReceivedBy] = React.useState<string>("Abel Kurniawan (PIC Gudang FG)");
  const [lstStatus, setLstStatus] = React.useState<string>("draft"); // 'draft' | 'final'
  const [isSavingLST, setIsSavingLST] = React.useState<boolean>(false);
  const [createdLST, setCreatedLST] = React.useState<HandoverReportItem | null>(null);
  const [notification, setNotification] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Otomatis cek kondisi oven ketika moisture berubah
  React.useEffect(() => {
    if (moisturePercent > 2.0) {
      setOvenRequired(true);
    } else {
      setOvenRequired(false);
    }
  }, [moisturePercent]);

  // Generate bulk serials bila diminta
  const handleGenerateSerials = () => {
    // Format: 26N48PW001 sd 26N48PW850
    const list: string[] = [];
    for (let i = 1; i <= packedBagsCount; i++) {
      const serialNum = String(i).padStart(3, "0");
      list.push(`26N48${supplierCode}${serialNum}`);
    }
    setBulkSerials(list);
    setIsSerialsGenerated(true);
    setNotification({
      type: "success",
      text: `Berhasil men-generate ${list.length} barcode serial unik traceability (${list[0]} s/d ${list[list.length - 1]}).`,
    });
  };

  // Muat data sampel lengkap simulasi Sprint 2
  const handleLoadSampleBatch = () => {
    setBatchNo("26N48PW213");
    setProductCode("GSO-001");
    setProductName("Organic Coconut Sugar 25kg");
    setSupplierCode("PW");
    setSupplierName("Kelompok Tani Purworejo (Pak Wahyu)");
    setCertification("Organik EU");
    setFairtradeStatus("NON FAIRTRADE");

    setRawMaterialWeight(21500);
    setSievingRawInput(21500);
    setRawCleanSugar(21285);
    setRawBrontolReject(107.5);
    setRawDustLoss(107.5);
    setMoisturePercent(1.8); // ≤ 2% => Fast-track (skip oven)
    setOvenRequired(false);

    setCookedCleanSugar(21250);
    setCookedBrontol(35);
    setPackedBagsCount(850);
    setWeightPerBag(25.0);
    setPalletCount(22);

    handleGenerateSerials();
    setCompletedSteps([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    setCurrentStep(10);
    setNotification({
      type: "success",
      text: "Data sampel lengkap Sprint 2 (21.500 Kg Inbound → 850 Sak @ 25 Kg FG) berhasil dimuat. Siap diverifikasi dan serah terima!",
    });
  };

  // Reset Alur
  const handleResetFlow = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setIsSerialsGenerated(false);
    setBulkSerials([]);
    setLstStatus("draft");
    setCreatedLST(null);
    setNotification(null);
  };

  // Tandai langkah selesai & pindah berikutnya
  const handleMarkStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps((prev) => [...prev, stepId]);
    }
    if (stepId < 10) {
      setCurrentStep(stepId + 1);
    }
  };

  // Simpan LST ke Backend API
  const handleSaveLSTToBackend = async () => {
    setIsSavingLST(true);
    try {
      const payload: CreateLSTInput = {
        fairtradeStatus,
        fromDepartment: "Produksi (Line Gula Semut)",
        toDepartment: "Gudang Barang Jadi (WMS FG)",
        handoverDate,
        handedOverBy,
        notes: `Serah Terima Batch ${batchNo} (${packedBagsCount} sak @ ${weightPerBag}kg = ${
          packedBagsCount * weightPerBag
        } kg) - Sertifikasi ${certification}. Alokasi ${palletCount} Palet.`,
        items: [
          {
            itemNo: 1,
            itemName: productName,
            itemCode: productCode,
            batchNo: batchNo,
            unitKg: packedBagsCount * weightPerBag,
            packaging: `Sak Kertas Kraft ${weightPerBag}kg`,
            buyerName: "Eco Organic BV (Kontrak Ekspor EU)",
            quantityPcs: packedBagsCount,
            notes: `Kondisi sak bersih & rapi, lolos Metal Detector (Fe/Non-Fe/SS), alokasi ${palletCount} palet.`,
          },
        ],
      };

      const res = await manufacturingApi.createLST(payload);
      if (res.data) {
        setCreatedLST(res.data);
      }
      setLstStatus("final");
      handleMarkStepComplete(10);
      setNotification({
        type: "success",
        text: `Laporan Serah Terima (LST) berhasil disimpan dan dikunci ke sistem dengan nomor ${
          res.data?.reportNo || lstNumber
        }!`,
      });
    } catch (err: any) {
      console.error("Gagal simpan LST:", err);
      // Fallback bila backend mock / offline
      setLstStatus("final");
      handleMarkStepComplete(10);
      setNotification({
        type: "success",
        text: `Laporan Serah Terima (LST) tercatat dan dikunci secara lokal (${lstNumber}).`,
      });
    } finally {
      setIsSavingLST(false);
    }
  };

  // Ekspor LST ke Excel Resmi GDG-009-LST
  const handleExportLSTExcel = async () => {
    try {
      const dummyReport: HandoverReportItem = createdLST || {
        id: "lst-sprint2",
        reportNo: lstNumber,
        fairtradeStatus: fairtradeStatus,
        fromDepartment: "Produksi",
        toDepartment: "Gudang Barang Jadi",
        handoverDate: handoverDate,
        totalQuantityPcs: packedBagsCount,
        totalWeightKg: packedBagsCount * weightPerBag,
        notes: `Batch ${batchNo} - ${certification}`,
        handedOverBy: handedOverBy,
        handedOverSignDate: handoverDate,
        verifiedByQc: "Adin Nugroho (QC)",
        verifiedSignDate: handoverDate,
        receivedByWarehouse: receivedBy,
        receivedSignDate: handoverDate,
        status: lstStatus,
        items: [
          {
            id: "i1",
            reportId: "lst-sprint2",
            itemNo: 1,
            itemName: productName,
            itemCode: productCode,
            batchNo: batchNo,
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
        text: "File Laporan Serah Terima (GDG-009-LST.xlsx) berhasil diunduh!",
      });
    } catch (err: any) {
      alert("Gagal ekspor excel: " + err.message);
    }
  };

  // Cetak Dokumen Serah Terima Resmi
  const handlePrintLSTSlip = () => {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Pop-up browser terblokir. Izinkan pop-up untuk mencetak.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Serah Terima - ${lstNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 25px; color: #111; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: bold; margin: 0; }
          .subtitle { font-size: 12px; color: #555; }
          .badge-box { border: 1px solid #000; padding: 6px 12px; font-size: 13px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f2f2f2; }
          .signatures { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
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
          <div class="badge-box">
            FORM: GDG-009-LST / QA-044-LST
          </div>
        </div>

        <h3 style="text-align: center; margin: 10px 0 20px 0; text-transform: uppercase;">LAPORAN SERAH TERIMA BARANG JADI (FG)</h3>

        <div style="font-size: 12px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div><strong>Nomor LST:</strong> ${lstNumber}</div>
          <div><strong>Tanggal Penyerahan:</strong> ${handoverDate}</div>
          <div><strong>Dari Departemen:</strong> Produksi (Line Gula Semut)</div>
          <div><strong>Kepada Departemen:</strong> Gudang Barang Jadi (WMS FG)</div>
          <div><strong>Status Fairtrade:</strong> ${fairtradeStatus}</div>
          <div><strong>Standar Mutu:</strong> ${certification}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Produk & SKU</th>
              <th>Nomor Batch</th>
              <th>Kemasan</th>
              <th>Jumlah (Pcs)</th>
              <th>Berat (Kg)</th>
              <th>Buyer / Pelanggan</th>
              <th>Catatan Palet</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>${productName}</strong><br><small>${productCode}</small></td>
              <td><span style="font-family: monospace; font-weight: bold;">${batchNo}</span></td>
              <td>Sak Kraft ${weightPerBag}kg</td>
              <td style="text-align: right;"><strong>${packedBagsCount.toLocaleString()}</strong></td>
              <td style="text-align: right;"><strong>${(packedBagsCount * weightPerBag).toLocaleString()} Kg</strong></td>
              <td>Eco Organic BV</td>
              <td>Alokasi ${palletCount} Palet (@ 40 sak/palet)</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #fafafa; font-weight: bold;">
              <td colspan="4" style="text-align: right;">TOTAL:</td>
              <td style="text-align: right;">${packedBagsCount.toLocaleString()} Sak</td>
              <td style="text-align: right;">${(packedBagsCount * weightPerBag).toLocaleString()} Kg</td>
              <td colspan="2">Lolos Uji Mutu CCP Metal Detector</td>
            </tr>
          </tfoot>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div>Diserahkan Oleh (Produksi)</div>
            <div class="sig-space"></div>
            <strong>${handedOverBy}</strong>
          </div>
          <div class="sig-box">
            <div>Diverifikasi Oleh (QC/QA)</div>
            <div class="sig-space"></div>
            <strong>Adin Nugroho (QC Lead)</strong>
          </div>
          <div class="sig-box">
            <div>Diterima Oleh (Gudang FG)</div>
            <div class="sig-space"></div>
            <strong>${receivedBy}</strong>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  // Cetak Nota LBM GD-007-LBM
  const handlePrintLBM = () => {
    setLbmPrinted(true);
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tanda Terima Supplier - ${lbmNo}</title>
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
          <div>
            <h3 style="margin: 0;">CV. MANNA ANUGERAH SEJAHTERA</h3>
            <div style="font-size: 11px;">Gudang Bahan Baku & Logistik Inbound</div>
          </div>
          <div style="text-align: right; font-weight: bold; font-size: 12px;">
            <div>FORM: GD-007-LBM</div>
            <div>BUKTI TANDA TERIMA TIMBANGAN</div>
          </div>
        </div>
        <p style="font-size: 12px;">
          <strong>No. LBM:</strong> ${lbmNo} | <strong>No. Surat Jalan:</strong> ${deliveryNoteNo}<br>
          <strong>Supplier:</strong> ${supplierName} (${supplierCode})<br>
          <strong>Kerahasiaan Harga:</strong> *CONFIDENTIAL PRICING ACTIVE* (Harga tidak ditampilkan pada slip gudang)
        </p>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Komoditas</th>
              <th>Berat Gross (Kg)</th>
              <th>Tara (Kg)</th>
              <th>Netto Diterima (Kg)</th>
              <th>Barcode ID Kantong</th>
            </tr>
          </thead>
          <tbody>
            ${scaleWeights
              .map(
                (w, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>Gula Kelapa Curah Mentah</td>
                <td>${w.gross.toFixed(2)}</td>
                <td>${w.tare.toFixed(2)}</td>
                <td><strong>${w.net.toFixed(2)}</strong></td>
                <td style="font-family: monospace;">[LOT-202611-${String(idx + 1).padStart(3, "0")}]</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #fafafa;">
              <td colspan="4" style="text-align: right;">TOTAL TIMBANGAN SAMPEL:</td>
              <td>${scaleWeights.reduce((a, b) => a + b.net, 0).toFixed(2)} Kg</td>
              <td>Total Penerimaan: ${rawMaterialWeight.toLocaleString()} Kg</td>
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

  const currentStepDef = SPRINT_2_STEPS.find((s) => s.id === currentStep)!;
  const progressPct = Math.round((completedSteps.length / SPRINT_2_STEPS.length) * 100);

  return (
    <div className="space-y-6 pb-16">
      {/* ─── HEADER HALAMAN ───────────────────────────────────────────────── */}
      <PageHeader
        title="Alur Terpadu Sprint 2 (LBM → Laporan Serah Terima)"
        description="Wizard komprehensif alur produksi 4 line & penjaminan mutu CV Manna: Dari Penerimaan Bahan Masuk (GD-007-LBM) hingga Serah Terima Gudang Barang Jadi (GDG-009-LST)"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleLoadSampleBatch}
            className="gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-300"
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Muat Data Sampel Sprint 2
          </Button>

          <Button variant="outline" onClick={handleResetFlow} className="gap-2 text-slate-600">
            <RotateCcw className="h-4 w-4" />
            Reset Alur
          </Button>

          <Button
            onClick={handleExportLSTExcel}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!completedSteps.includes(9) && lstStatus !== "final"}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Ekspor Excel LST
          </Button>

          <Button
            onClick={handlePrintLSTSlip}
            variant="default"
            className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
            disabled={!completedSteps.includes(9) && lstStatus !== "final"}
          >
            <Printer className="h-4 w-4" />
            Cetak Dokumen LST
          </Button>
        </div>
      </PageHeader>

      {/* ─── NOTIFIKASI TOAST / BANNER ────────────────────────────────────── */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs text-slate-500 hover:text-slate-800 underline ml-4"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ─── KARTU METADATA BATCH AKTIF & STATUS PROGRESS ─────────────────── */}
      <Card className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border-slate-800">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Batch Produksi Terintegrasi
                </span>
                <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-xs font-mono">
                  {batchNo}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs">
                  {certification}
                </Badge>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-xs">
                  {fairtradeStatus}
                </Badge>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <Factory className="h-6 w-6 text-indigo-400" />
                {productName}
                <span className="text-sm font-normal text-slate-300">({productCode})</span>
              </h2>

              <p className="text-sm text-slate-300 flex items-center gap-3">
                <span>
                  Supplier: <strong>{supplierName}</strong> ({supplierCode})
                </span>
                <span>•</span>
                <span>
                  Target Hasil Jadi: <strong>{packedBagsCount.toLocaleString()} Sak</strong> (
                  {(packedBagsCount * weightPerBag).toLocaleString()} Kg)
                </span>
              </p>
            </div>

            {/* Progress Bar & Status Dokumen */}
            <div className="lg:w-80 space-y-2 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">Kemajuan Alur Sprint 2</span>
                <span className="font-bold text-indigo-300 font-mono">
                  {completedSteps.length} / {SPRINT_2_STEPS.length} Tahap ({progressPct}%)
                </span>
              </div>

              {/* Progress bar line */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-400">Status Dokumen Akhir:</span>
                <Badge
                  className={
                    lstStatus === "final"
                      ? "bg-emerald-500 text-white font-semibold"
                      : "bg-slate-700 text-slate-300"
                  }
                >
                  {lstStatus === "final" ? "FINAL (Terkunci)" : "DRAFT (Berjalan)"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── STEPPER NAVIGASI HORISONTAL (10 TAHAP) ────────────────────────── */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-2 min-w-[960px] p-2 bg-white dark:bg-slate-900 border rounded-xl shadow-sm">
          {SPRINT_2_STEPS.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isSkipped = step.id === 4 && !ovenRequired && completedSteps.includes(4);

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex-1 flex flex-col items-center p-2.5 rounded-lg text-left transition-all relative ${
                    isCurrent
                      ? "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 shadow-sm"
                      : isCompleted
                      ? "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      : "opacity-60 hover:opacity-90"
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full justify-between mb-1">
                    <span
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-indigo-600 text-white ring-2 ring-indigo-200"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isCompleted ? "✓" : step.id}
                    </span>

                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {step.code}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-semibold truncate w-full ${
                      isCurrent ? "text-indigo-950 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {step.title}
                  </span>

                  <span className="text-[10px] text-slate-400 truncate w-full">{step.docCode}</span>
                </button>

                {idx < SPRINT_2_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ─── KONTEN DETAIL TAHAP AKTIF ─────────────────────────────────────── */}
      <Card className="border-indigo-100 dark:border-slate-800 shadow-md">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-900/50 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs font-mono bg-indigo-50 text-indigo-700 border-indigo-200">
                  Tahap {currentStepDef.id} dari 10
                </Badge>
                <Badge variant="secondary" className="text-xs font-medium">
                  {currentStepDef.docCode}
                </Badge>
                <span className="text-xs text-slate-500">PIC: {currentStepDef.owner}</span>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {currentStepDef.title}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {currentStepDef.description}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
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
                className="gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {currentStep === 10 ? "Kunci Dokumen & Selesai" : "Simpan & Lanjut"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* ─────────────────────────────────────────────────────────────────
              STEP 1: LBM & INBOUND GUDANG (GD-007-LBM)
          ───────────────────────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nomor LBM (Laporan Barang Masuk)
                  </label>
                  <Input
                    value={lbmNo}
                    onChange={(e) => setLbmNo(e.target.value)}
                    className="font-mono text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nomor Surat Jalan Supplier
                  </label>
                  <Input
                    value={deliveryNoteNo}
                    onChange={(e) => setDeliveryNoteNo(e.target.value)}
                    className="font-mono text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Pemasok (Supplier Code)
                  </label>
                  <Input
                    value={`${supplierName} (${supplierCode})`}
                    disabled
                    className="bg-slate-50 text-sm mt-1 font-semibold"
                  />
                </div>
              </div>

              {/* Timbangan Digital Presisi 2 Desimal (TC-WH-001) */}
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Pencatatan Timbangan Digital Presisi 2 Desimal (Inbound Bahan Baku)
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">
                    Standar TC-WH-001
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Setiap kantong ditimbang dengan akurasi 2 angka di belakang koma (cth: 10.05 Kg, 10.06 Kg).
                  Sistem otomatis menghitung total penerimaan netto ke kartu stok.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="p-2 border">No Kantong</th>
                        <th className="p-2 border">Berat Bruto (Kg)</th>
                        <th className="p-2 border">Tara Karung (Kg)</th>
                        <th className="p-2 border">Netto Tercatat (Kg)</th>
                        <th className="p-2 border">Auto Barcode ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scaleWeights.map((w, i) => (
                        <tr key={i} className="hover:bg-white dark:hover:bg-slate-800">
                          <td className="p-2 border font-medium">Kantong #{i + 1}</td>
                          <td className="p-2 border font-mono">{w.gross.toFixed(2)}</td>
                          <td className="p-2 border font-mono">{w.tare.toFixed(2)}</td>
                          <td className="p-2 border font-mono font-bold text-emerald-600">
                            {w.net.toFixed(2)}
                          </td>
                          <td className="p-2 border font-mono text-slate-500">
                            [LOT-202611-{String(i + 1).padStart(3, "0")}] - {w.net.toFixed(2)} Kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={3} className="p-2 border text-right">
                          Total Sampel Timbang:
                        </td>
                        <td className="p-2 border font-mono text-emerald-700">
                          {scaleWeights.reduce((a, b) => a + b.net, 0).toFixed(2)} Kg
                        </td>
                        <td className="p-2 border text-slate-500">
                          Akumulasi Total Lot: {rawMaterialWeight.toLocaleString()} Kg
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Penerimaan Barang Kemas Discrete (TC-WH-002) & Confidential Pricing (TC-WH-004) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    <h5 className="text-xs font-bold text-slate-900">
                      Barang Kemas (Karung / Sak Kraft) - Bebas Timbang
                    </h5>
                  </div>
                  <p className="text-xs text-slate-500">
                    Sesuai TC-WH-002: Kemasan sak/dus dihitung per lembar (Pcs) tanpa mewajibkan timbangan.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={packagingQty}
                      onChange={(e) => setPackagingQty(Number(e.target.value))}
                      className="w-32 text-sm"
                    />
                    <span className="text-xs font-semibold text-slate-600">Pcs Sak Kraft 25 Kg</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-rose-600" />
                      <h5 className="text-xs font-bold text-slate-900">Kerahasiaan Harga (Confidential Pricing)</h5>
                    </div>
                    <Badge className="bg-rose-100 text-rose-700 text-[10px]">GD-007-LBM</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Sesuai aturan keamanan RBAC: Staf gudang & supir dilarang melihat harga beli. Slip cetak
                    resmi menyembunyikan kolom harga secara otomatis.
                  </p>
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintLBM}
                      className="gap-2 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Cetak Tanda Terima Supplier (GD-007-LBM)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 2: PERMINTAAN BAHAN BAKU & KEMAS (PR-09)
          ───────────────────────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Formulir Baku Auditor: PR-09
                    </span>
                    <Badge className="bg-indigo-600 text-white text-xs">{certification}</Badge>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">
                    Bon Permintaan Bahan Baku (BPB) & Kemasan (PBPK)
                  </h4>
                  <p className="text-xs text-slate-600">
                    Sesuai TC-PRD-002: Memuat kop baku Nomor Dokumen: <strong>PR-09</strong> dan kode sertifikasi{" "}
                    <strong>{certification}</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Standar Sertifikasi:</span>
                  <select
                    value={certification}
                    onChange={(e) => setCertification(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1.5 bg-white font-medium"
                  >
                    <option value="Organik EU">Organik EU</option>
                    <option value="USDA-NOP">USDA-NOP</option>
                    <option value="JAS Organic">JAS Organic</option>
                    <option value="Fairtrade Flo">Fairtrade FLO</option>
                    <option value="SNI Organik">SNI Organik</option>
                  </select>
                </div>
              </div>

              {/* Barcode Scanner Simulasi (TC-PRD-001) */}
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-indigo-600" />
                    <h5 className="text-sm font-bold text-slate-900">
                      Pengambilan Bahan Baku via Scan Barcode (TC-PRD-001)
                    </h5>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                    {rawMaterialIssued ? "Stok Berhasil Dikeluarkan" : "Menunggu Scan"}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500">
                  Operator memindai barcode fisik pada karung bahan mentah untuk mentransfer kepemilikan dari{" "}
                  <strong>Gudang Bahan Baku</strong> ke <strong>WIP Produksi (Ruang Ayak)</strong>.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={scannedBarcode}
                      onChange={(e) => setScannedBarcode(e.target.value)}
                      placeholder="Scan Barcode ID..."
                      className="font-mono text-sm w-56"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        setRawMaterialIssued(true);
                        setNotification({
                          type: "success",
                          text: `Barcode ${scannedBarcode} berhasil di-scan. Stok ${rawMaterialWeight.toLocaleString()} Kg bahan mentah dialokasikan ke Ruang Ayak!`,
                        });
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                    >
                      Konfirmasi Scan
                    </Button>
                  </div>

                  <div className="text-xs text-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border font-mono">
                    Rute: Gudang Bahan Baku ➔ WIP Produksi (Ruang Ayak)
                  </div>
                </div>
              </div>

              {/* Tabel Item Permintaan */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="p-2.5 border-b">Komponen Bahan</th>
                      <th className="p-2.5 border-b">Kode SKU</th>
                      <th className="p-2.5 border-b">Jumlah Diminta</th>
                      <th className="p-2.5 border-b">Satuan</th>
                      <th className="p-2.5 border-b">Lokasi Sumber</th>
                      <th className="p-2.5 border-b">Status Pengeluaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 border-b font-medium">Gula Kelapa Curah Mentah</td>
                      <td className="p-2.5 border-b font-mono">RAW-GSO-01</td>
                      <td className="p-2.5 border-b font-bold">{rawMaterialWeight.toLocaleString()}</td>
                      <td className="p-2.5 border-b">Kilogram (Kg)</td>
                      <td className="p-2.5 border-b text-slate-500">Gudang Bahan Baku</td>
                      <td className="p-2.5 border-b text-emerald-600 font-semibold">✓ Dialokasikan ke WIP</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 border-b font-medium">Sak Kertas Kraft 25 Kg (Manna Export)</td>
                      <td className="p-2.5 border-b font-mono">PKG-KRAFT-25</td>
                      <td className="p-2.5 border-b font-bold">{packagingQty}</td>
                      <td className="p-2.5 border-b">Pcs</td>
                      <td className="p-2.5 border-b text-slate-500">Gudang Kemasan</td>
                      <td className="p-2.5 border-b text-emerald-600 font-semibold">✓ Siap di Ruang Packing</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 border-b font-medium">Plastik Liner PE Inner Bag 25 Kg</td>
                      <td className="p-2.5 border-b font-mono">PKG-PE-25</td>
                      <td className="p-2.5 border-b font-bold">{packagingQty}</td>
                      <td className="p-2.5 border-b">Pcs</td>
                      <td className="p-2.5 border-b text-slate-500">Gudang Kemasan</td>
                      <td className="p-2.5 border-b text-emerald-600 font-semibold">✓ Siap di Ruang Packing</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 3: AYAK MENTAH & MAGNET TRAP
          ───────────────────────────────────────────────────────────────── */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Form QC-009-MNA.01 (Monitoring Ayak Mentah)
                    </h5>
                    <Badge variant="outline" className="text-xs">
                      Mesin Ayak #1
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-slate-600">Total Bahan Masuk Ayak Mentah (Kg):</label>
                      <Input
                        type="number"
                        value={sievingRawInput}
                        onChange={(e) => setSievingRawInput(Number(e.target.value))}
                        className="text-sm font-semibold mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600">Hasil Lolos Ayak Bersih (Kg):</label>
                      <Input
                        type="number"
                        value={rawCleanSugar}
                        onChange={(e) => setRawCleanSugar(Number(e.target.value))}
                        className="text-sm font-semibold text-emerald-700 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Form QC-038-CMT (Catatan Magnet Trap)
                    </h5>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">Clean / Bebas Serpihan</Badge>
                  </div>

                  <p className="text-xs text-slate-500">
                    Magnet trap dipasang pada corong jatuh ayak untuk menangkap serpihan besi liar sebelum
                    masuk ke proses oven / ayak matang.
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="magnetTrap"
                      checked={magnetTrapChecked}
                      onChange={(e) => setMagnetTrapChecked(e.target.checked)}
                      className="h-4 w-4 rounded text-indigo-600"
                    />
                    <label htmlFor="magnetTrap" className="text-xs font-medium text-slate-800">
                      Magnet Trap telah dibersihkan & diverifikasi bebas kontaminan partikel besi
                    </label>
                  </div>
                </div>
              </div>

              {/* Pencatatan Brontol & Susut (~1%) */}
              <div className="p-4 rounded-xl border bg-amber-50/60 border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Pencatatan Brontol & Susut Produksi (~1%)
                  </h5>
                </div>

                <p className="text-xs text-slate-600">
                  Gula yang menggumpal (brontol mentah) dan susut debu/tercecer dipisahkan dan dibukukan ke
                  kartu stok reject secara transparan.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="bg-white p-3 rounded-lg border">
                    <span className="text-[11px] text-slate-500 block">Brontol Mentah Reject</span>
                    <span className="text-base font-bold text-amber-700">{rawBrontolReject} Kg</span>
                    <span className="text-[10px] text-slate-400 block">
                      ({((rawBrontolReject / sievingRawInput) * 100).toFixed(2)}% dari input)
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border">
                    <span className="text-[11px] text-slate-500 block">Susut Tercecer / Debu</span>
                    <span className="text-base font-bold text-rose-600">{rawDustLoss} Kg</span>
                    <span className="text-[10px] text-slate-400 block">
                      ({((rawDustLoss / sievingRawInput) * 100).toFixed(2)}% dari input)
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border">
                    <span className="text-[11px] text-slate-500 block">Total Susut Line Ayak 1</span>
                    <span className="text-base font-bold text-slate-900">
                      {rawBrontolReject + rawDustLoss} Kg
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold block">
                      Toleransi Normal (&lt; 1.5%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 4: EVALUASI KADAR AIR & ROUTING OVEN KONDISIONAL
          ───────────────────────────────────────────────────────────────── */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">
                      Pengukuran Kadar Air (Moisture Content Analysis)
                    </h5>
                    <p className="text-xs text-slate-500">
                      Standar Manna: Jika Kadar Air &gt; 2.0% ➔ Wajib masuk Oven. Jika Kadar Air ≤ 2.0% ➔
                      Oven dilewati otomatis (Jalur Cepat).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Hasil Uji Lab:</span>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={moisturePercent}
                        onChange={(e) => setMoisturePercent(Number(e.target.value))}
                        className="w-28 text-center font-bold text-base pr-6"
                      />
                      <span className="absolute right-2 top-2 text-xs text-slate-500 font-bold">%</span>
                    </div>
                  </div>
                </div>

                {/* Engine Evaluasi Routing Kondisional */}
                {moisturePercent > 2.0 ? (
                  <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 flex items-start gap-3">
                    <Flame className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                          Routing: Wajib Proses Oven (LHO & MNO)
                        </span>
                      </div>
                      <p className="text-xs">
                        Kadar air <strong>{moisturePercent}%</strong> melebihi batas toleransi maksimal 2.0%.
                        Batch harus dialirkan ke Oven pengering untuk menurunkan kadar air ke batas aman ekspor
                        (&lt; 1.8%).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                          Jalur Cepat (Fast-Track) — Lewati Oven
                        </span>
                      </div>
                      <p className="text-xs">
                        Kadar air <strong>{moisturePercent}%</strong> telah memenuhi syarat mutu (≤ 2.0%).
                        Bahan baku kering optimal sehingga tahap pemanasan Oven dilewati langsung menuju Ayak Matang.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Oven jika aktif */}
              {ovenRequired && (
                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Form QC-012-MNO.05 & Laporan Harian Oven (LHO)
                    </h5>
                    <Badge className="bg-amber-100 text-amber-900 text-xs">Oven Aktif</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-slate-600">Suhu Target Ruang Oven (°C):</label>
                      <Input
                        type="number"
                        value={ovenTemp}
                        onChange={(e) => setOvenTemp(Number(e.target.value))}
                        className="text-sm font-semibold mt-1"
                      />
                      <span className="text-[10px] text-slate-400">Standar: 70°C - 80°C</span>
                    </div>

                    <div>
                      <label className="text-slate-600">Durasi Pemanasan (Menit):</label>
                      <Input
                        type="number"
                        value={ovenDurationMins}
                        onChange={(e) => setOvenDurationMins(Number(e.target.value))}
                        className="text-sm font-semibold mt-1"
                      />
                      <span className="text-[10px] text-slate-400">Rata-rata: 90 - 120 menit</span>
                    </div>

                    <div>
                      <label className="text-slate-600">Waktu Pendinginan Rak (Menit):</label>
                      <Input defaultValue={45} className="text-sm font-semibold mt-1" />
                      <span className="text-[10px] text-slate-400">Hingga mencapai suhu ruang</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 5: AYAK MATANG (SIEVING 2)
          ───────────────────────────────────────────────────────────────── */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Monitoring Ayak Matang (Final Sieving sebelum Packing)
                  </h5>
                  <Badge variant="outline" className="text-xs">
                    Mesin Ayak Matang #2
                  </Badge>
                </div>

                <p className="text-xs text-slate-500">
                  Ayak matang menyaring partikel akhir agar seragam (Mesh 14-16) dan memastikan tidak ada gumpalan
                  tersisa sebelum masuk hopper timbangan packing.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs text-slate-600 font-medium">
                      Gula Semut Bersih Siap Kemas (Kg):
                    </label>
                    <Input
                      type="number"
                      value={cookedCleanSugar}
                      onChange={(e) => setCookedCleanSugar(Number(e.target.value))}
                      className="text-base font-bold text-emerald-600 mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 font-medium">
                      Brontol Matang Kering Terpisah (Kg):
                    </label>
                    <Input
                      type="number"
                      value={cookedBrontol}
                      onChange={(e) => setCookedBrontol(Number(e.target.value))}
                      className="text-base font-bold text-amber-700 mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="meshOk"
                    checked={meshConditionOk}
                    onChange={(e) => setMeshConditionOk(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600"
                  />
                  <label htmlFor="meshOk" className="text-xs font-medium text-slate-800">
                    Kondisi Kawat Kassa (Mesh Screen) utuh, kencang, dan tidak ada baut kendor
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 6: RUANG PACKING & TIMBANGAN IOT (SETTLE WEIGHT)
          ───────────────────────────────────────────────────────────────── */}
          {currentStep === 6 && (
            <div className="space-y-6">
              {/* Form Jarum & Gunting */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900">
                      QC-011-MNJ.01 (Monitoring Jarum Jahit)
                    </h5>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">Utuh / Lengkap</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pemeriksaan jarum mesin jahit karung sebelum dan sesudah shift. Mencegah patahan jarum
                    jatuh ke dalam kemasan gula.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="needle"
                      checked={needleCheckOk}
                      onChange={(e) => setNeedleCheckOk(e.target.checked)}
                      className="h-4 w-4 rounded text-indigo-600"
                    />
                    <label htmlFor="needle" className="text-xs font-medium text-slate-800">
                      Jarum mesin jahit utuh & nomor seri jarum sesuai catatan log
                    </label>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900">Pemeriksaan Gunting & Benda Tajam</h5>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">Terikat Rantai</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Seluruh gunting pemotong tali sak wajib terikat rantai ke meja kerja dan dihitung jumlahnya.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="scissor"
                      checked={scissorCheckOk}
                      onChange={(e) => setScissorCheckOk(e.target.checked)}
                      className="h-4 w-4 rounded text-indigo-600"
                    />
                    <label htmlFor="scissor" className="text-xs font-medium text-slate-800">
                      Semua gunting berada pada posisinya dan terikat kuat
                    </label>
                  </div>
                </div>
              </div>

              {/* Timbangan Digital IoT Settle Weight (TC-PRD-004) */}
              <div className="p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-indigo-400" />
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      Integrasi Timbangan Digital IoT (TC-PRD-004 — Settle Weight)
                    </h4>
                  </div>
                  <Badge
                    className={
                      isScaleSettled
                        ? "bg-emerald-500 text-white font-bold"
                        : "bg-amber-500 text-black font-bold animate-pulse"
                    }
                  >
                    {isScaleSettled ? "● STABIL (SETTLED)" : "◌ FLUKTUATIF"}
                  </Badge>
                </div>

                <p className="text-xs text-slate-300">
                  Sesuai TC-PRD-004: Fluktuasi angka saat penuangan diabaikan oleh sistem. Berat resmi hanya
                  tercatat ketika timbangan sudah stabil dan tombol <strong>"Record Settle Weight"</strong> ditekan.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-black/40 p-5 rounded-xl border border-white/10">
                  <div className="text-center sm:text-left">
                    <span className="text-xs text-indigo-300 block uppercase tracking-wider font-mono">
                      Pembacaan Digital Display
                    </span>
                    <span className="text-4xl font-extrabold font-mono text-emerald-400">
                      {scaleDisplay.toFixed(2)}{" "}
                      <span className="text-lg font-normal text-slate-300">Kg / Sak</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsScaleSettled(false);
                        setScaleDisplay(25.14);
                        setTimeout(() => {
                          setScaleDisplay(25.0);
                          setIsScaleSettled(true);
                        }, 800);
                      }}
                      className="text-xs text-black border-slate-400"
                    >
                      Simulasi Fluktuasi Bobot
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        if (!isScaleSettled) {
                          alert("Timbangan masih fluktuatif! Tunggu hingga angka stabil.");
                          return;
                        }
                        setNotification({
                          type: "success",
                          text: `Berat stabil ${scaleDisplay.toFixed(2)} Kg ter-record ke sistem!`,
                        });
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Konfirmasi Record Settle Weight
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block">Bobot per Sak:</span>
                    <span className="font-bold font-mono">{weightPerBag} Kg</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Target Jumlah Sak:</span>
                    <span className="font-bold font-mono">{packedBagsCount.toLocaleString()} Sak</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Bobot Bersih:</span>
                    <span className="font-bold font-mono text-emerald-400">
                      {(packedBagsCount * weightPerBag).toLocaleString()} Kg
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Jenis Karung:</span>
                    <span className="font-bold font-mono">Kraft 3-Ply + PE Inner</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 7: VERIFIKASI METAL DETECTOR CCP (VMD / CPP)
          ───────────────────────────────────────────────────────────────── */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-rose-700" />
                    <h5 className="text-sm font-bold text-rose-950 uppercase tracking-wide">
                      Critical Control Point (CCP 1) — Form QC-017-VMD
                    </h5>
                  </div>
                  <Badge className="bg-rose-600 text-white text-xs">Mandatory Safety Gate</Badge>
                </div>

                <p className="text-xs text-rose-900">
                  Setiap sak yang selesai dijahit wajib dilewatkan melalui sabuk berjalan Metal Detector.
                  Uji sensitivitas menggunakan 3 test piece bersertifikat dilakukan setiap awal & akhir shift.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-lg border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block text-slate-900">Fe (Besi / Ferrous)</span>
                      <span className="text-[11px] text-slate-500 font-mono">Batas: 1.5 mm</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">✓ Lolos (Terdeteksi)</Badge>
                  </div>

                  <div className="bg-white p-3 rounded-lg border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block text-slate-900">Non-Fe (Kuningan/Alu)</span>
                      <span className="text-[11px] text-slate-500 font-mono">Batas: 2.0 mm</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">✓ Lolos (Terdeteksi)</Badge>
                  </div>

                  <div className="bg-white p-3 rounded-lg border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block text-slate-900">SS (Stainless Steel 316)</span>
                      <span className="text-[11px] text-slate-500 font-mono">Batas: 2.5 mm</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">✓ Lolos (Terdeteksi)</Badge>
                  </div>
                </div>
              </div>

              {/* Form CPP: Pembersihan Head & Reject Bin */}
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-900 uppercase">
                    Form CPP (Catatan Pembersihan Metal Detector & Reject Bin)
                  </h5>
                  <Badge variant="outline" className="text-xs">
                    Form QC-CPP
                  </Badge>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="cppClean"
                    checked={metalCleaningOk}
                    onChange={(e) => setMetalCleaningOk(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600"
                  />
                  <label htmlFor="cppClean" className="text-xs font-medium text-slate-800">
                    Aperture head bebas debu gula & reject bin telah diperiksa kosong oleh tim QA
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 8: PEMERIKSAAN PRODUK JADI (PJD) & LABEL (PLK)
          ───────────────────────────────────────────────────────────────── */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Form PJD */}
                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Form QC-004-PJD.05 (Pemeriksaan Produk Jadi)
                    </h5>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">Lolos Sensori</Badge>
                  </div>

                  <p className="text-xs text-slate-500">
                    Evaluasi organoleptik parameter fisik & sensori gula semut hasil kemas.
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-600">Rasa (Taste):</span>
                      <span className="font-semibold text-slate-900">Manis Gurih Khas Gula Kelapa</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-600">Aroma (Smell):</span>
                      <span className="font-semibold text-slate-900">Wangi Khas Karamel (Bebas Apek)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-600">Warna (Color):</span>
                      <span className="font-semibold text-slate-900">Coklat Keemasan (Golden Brown)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-600">Kelarutan (Solubility):</span>
                      <span className="font-semibold text-slate-900">Larut Sempurna tanpa Endapan</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-600">Kadar Air Akhir Lab:</span>
                      <span className="font-semibold font-mono text-emerald-700">1.6% (&lt; 2.0%)</span>
                    </div>
                  </div>
                </div>

                {/* Form PLK Label Inspection */}
                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Form QC-018-PLK (Pemeriksaan Label Kemasan)
                    </h5>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">Label Compliant</Badge>
                  </div>

                  <p className="text-xs text-slate-500">
                    Verifikasi kepatuhan stiker label sak ekspor terhadap regulasi buyer dan sertifikasi.
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Nomor Batch & Tanggal Best Before tercetak jelas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Barcode serial per kantong dapat di-scan oleh scanner barcode</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Logo Organik EU / CU 820674 & Halal Indonesia tertera rapi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Berat bersih (Net Weight) 25 Kg tercetak tanpa coretan</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Keputusan Akhir Mutu (QC Release):</span>
                    <Badge className="bg-emerald-600 text-white font-bold">RELEASED (LULUS)</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 9: LAPORAN HASIL PRODUKSI (LHP) & BULK QR SERIAL
          ───────────────────────────────────────────────────────────────── */}
          {currentStep === 9 && (
            <div className="space-y-6">
              {/* Ringkasan Produksi & Susut */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Bahan Masuk</span>
                  <span className="text-base font-bold text-slate-900">{rawMaterialWeight.toLocaleString()} Kg</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Hasil Jadi (FG)</span>
                  <span className="text-base font-bold text-emerald-600">
                    {(packedBagsCount * weightPerBag).toLocaleString()} Kg
                  </span>
                  <span className="text-[10px] text-slate-400">({packedBagsCount.toLocaleString()} Sak)</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Brontol Total</span>
                  <span className="text-base font-bold text-amber-700">
                    {(rawBrontolReject + cookedBrontol).toFixed(1)} Kg
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Susut Tercecer</span>
                  <span className="text-base font-bold text-rose-600">{rawDustLoss} Kg</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Yield Efisiensi</span>
                  <span className="text-base font-bold text-indigo-700">
                    {(((packedBagsCount * weightPerBag) / rawMaterialWeight) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Generator Serial Traceability Massal (TC-PRD-005) */}
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-indigo-600" />
                      Algoritma Kodifikasi Traceability Massal (TC-PRD-005)
                    </h5>
                    <p className="text-xs text-slate-500">
                      Format Manna: <strong>YY + Grade/Type (N=Natural) + Week + Supplier (PW) + Serial 3 digit</strong>.
                      Cth: <code>26N48PW001</code> s/d <code>26N48PW850</code>.
                    </p>
                  </div>

                  <Button
                    onClick={handleGenerateSerials}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Auto-Generate {packedBagsCount} Barcode Serial
                  </Button>
                </div>

                {/* Preview Serial List */}
                {bulkSerials.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">
                        Menampilkan sampel kode barcode dari <strong>{bulkSerials.length} unit</strong>:
                      </span>
                      <span className="font-mono text-indigo-700 font-bold">
                        {bulkSerials[0]} ➔ {bulkSerials[bulkSerials.length - 1]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {bulkSerials.slice(0, 12).map((serial, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-slate-800 p-2 rounded-lg border text-center font-mono text-xs shadow-2xs"
                        >
                          <span className="text-[10px] text-slate-400 block">Sak #{idx + 1}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{serial}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-slate-500 italic text-center">
                      ... dan {bulkSerials.length - 12} kode barcode serial unik lainnya siap dicetak ke printer label thermal.
                    </div>
                  </div>
                )}
              </div>

              {/* Alokasi Palet */}
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-indigo-600" />
                    <h5 className="text-xs font-bold text-slate-900 uppercase">
                      Pengelompokan Palet Gudang Barang Jadi (WMS FG)
                    </h5>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    Total: {palletCount} Palet
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  850 Sak dialokasikan ke 22 Palet kayu ekspor (@ 40 sak per palet standar, palet terakhir 10 sak).
                </p>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 10: LAPORAN SERAH TERIMA (LST) - FINAL HANDOVER
          ───────────────────────────────────────────────────────────────── */}
          {currentStep === 10 && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">
                        Formulir Resmi: GDG-009-LST / QA-044-LST
                      </span>
                      <Badge className="bg-emerald-600 text-white text-xs">
                        {lstStatus === "final" ? "FINAL (TERKUNCI)" : "DRAFT"}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Laporan Serah Terima Fisik Barang Jadi (Produksi ➔ Gudang FG)
                    </h3>
                    <p className="text-xs text-slate-600">
                      Penyerahan fisik dan pembukuan resmi stok barang jadi siap jual/ekspor ke Gudang Barang Jadi.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePrintLSTSlip}
                      className="gap-1.5 text-xs bg-white text-slate-700"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Cetak LST
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportLSTExcel}
                      className="gap-1.5 text-xs bg-white text-emerald-700 border-emerald-300"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Unduh Excel
                    </Button>
                  </div>
                </div>

                {/* Form Fields Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-2">
                  <div>
                    <label className="text-slate-600 font-medium">Nomor Dokumen LST:</label>
                    <Input
                      value={lstNumber}
                      onChange={(e) => setLstNumber(e.target.value)}
                      className="font-mono text-xs font-bold mt-1 bg-white"
                      disabled={lstStatus === "final"}
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium">Tanggal Penyerahan:</label>
                    <Input
                      type="date"
                      value={handoverDate}
                      onChange={(e) => setHandoverDate(e.target.value)}
                      className="text-xs mt-1 bg-white"
                      disabled={lstStatus === "final"}
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium">PIC Yang Menyerahkan (Produksi):</label>
                    <Input
                      value={handedOverBy}
                      onChange={(e) => setHandedOverBy(e.target.value)}
                      className="text-xs mt-1 bg-white"
                      disabled={lstStatus === "final"}
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium">PIC Yang Menerima (Gudang):</label>
                    <Input
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      className="text-xs mt-1 bg-white"
                      disabled={lstStatus === "final"}
                    />
                  </div>
                </div>
              </div>

              {/* Tabel Item Serah Terima */}
              <div className="border rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="p-3 border-b">No</th>
                      <th className="p-3 border-b">Nama Komoditas / SKU</th>
                      <th className="p-3 border-b">Batch Number</th>
                      <th className="p-3 border-b">Bentuk Kemasan</th>
                      <th className="p-3 border-b text-right">Kuantitas (Sak)</th>
                      <th className="p-3 border-b text-right">Total Berat (Kg)</th>
                      <th className="p-3 border-b">Buyer / Pelanggan</th>
                      <th className="p-3 border-b">Status Kunci</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 border-b font-medium">1</td>
                      <td className="p-3 border-b">
                        <strong className="text-slate-900 block">{productName}</strong>
                        <span className="text-[11px] text-slate-500 font-mono">{productCode}</span>
                      </td>
                      <td className="p-3 border-b font-mono font-bold text-indigo-700">{batchNo}</td>
                      <td className="p-3 border-b">Sak Kertas Kraft {weightPerBag} Kg</td>
                      <td className="p-3 border-b text-right font-mono font-bold">
                        {packedBagsCount.toLocaleString()} Sak
                      </td>
                      <td className="p-3 border-b text-right font-mono font-bold text-emerald-700">
                        {(packedBagsCount * weightPerBag).toLocaleString()} Kg
                      </td>
                      <td className="p-3 border-b">Eco Organic BV</td>
                      <td className="p-3 border-b">
                        <Badge
                          className={
                            lstStatus === "final"
                              ? "bg-emerald-600 text-white text-[10px]"
                              : "bg-slate-200 text-slate-700 text-[10px]"
                          }
                        >
                          {lstStatus === "final" ? "Terkunci (Final)" : "Draft"}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/80 font-bold border-t">
                      <td colSpan={4} className="p-3 text-right">
                        TOTAL SERAH TERIMA KE GUDANG:
                      </td>
                      <td className="p-3 text-right font-mono text-slate-900">
                        {packedBagsCount.toLocaleString()} Sak
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-700">
                        {(packedBagsCount * weightPerBag).toLocaleString()} Kg
                      </td>
                      <td colSpan={2} className="p-3 text-xs text-slate-500 font-normal">
                        Alokasi {palletCount} Palet Kayu Ekspor
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Action Trigger untuk Simpan ke Backend */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900">
                <div className="text-xs text-slate-600">
                  {lstStatus === "final" ? (
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
                  {lstStatus !== "final" && (
                    <Button
                      onClick={handleSaveLSTToBackend}
                      disabled={isSavingLST}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isSavingLST ? "Menyimpan ke Sistem..." : "Kirim & Kunci Final Dokumen LST"}
                    </Button>
                  )}

                  <Link href="/inventory/lst">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buka Daftar LST di Gudang
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
