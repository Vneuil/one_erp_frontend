"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Info,
  Truck,
  PackageCheck,
  ClipboardCheck,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  procurementApi,
  GoodsReceiptItem,
  GoodsReceiptLineItem,
  BagEntryItem,
  PurchaseOrderItem,
} from "@/lib/api/procurement";
import { productsApi, ProductItem } from "@/lib/api/products";
import { inventoryApi, WarehouseItem } from "@/lib/api/inventory";
import { rawMaterialStockApi, LBMInboundContext } from "@/lib/api/raw-material-stock";
import { exportLBMToExcel } from "@/lib/utils/export-lbm-excel";

const PAGE_SIZE = 25;

interface LineUIState {
  lineId: string;
  productId: string;
  productName: string;
  quantityOrderedRef: number;
  weightGross: number;
  weightTare: number;
  weightNet: number;
  packageSize: number;
  bagCount: number;
  entries: BagEntryItem[];
  currentPage: number;
}

export default function GoodsReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = (Array.isArray(params?.id) ? params.id[0] : params?.id) as string;

  const [receipt, setReceipt] = React.useState<GoodsReceiptItem | null>(null);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrderItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [productMap, setProductMap] = React.useState<Record<string, ProductItem>>({});
  const [lines, setLines] = React.useState<LineUIState[]>([]);
  const [lbmCtx, setLbmCtx] = React.useState<LBMInboundContext | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isExportingExcel, setIsExportingExcel] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Load GR and reference data
  const loadData = React.useCallback(async () => {
    if (!receiptId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [grRes, poRes, whRes, prodRes, ctxRes] = await Promise.all([
        procurementApi.getGoodsReceiptById(receiptId),
        procurementApi.listPurchaseOrders({ perPage: 100 }),
        inventoryApi.listWarehouses({ perPage: 50 }),
        productsApi.list({ perPage: 200 }),
        rawMaterialStockApi.getLbmContext(receiptId).catch(() => ({ success: false, data: null })),
      ]);

      if (!grRes.success || !grRes.data) {
        throw new Error(grRes.message || "Gagal memuat detail LBM.");
      }

      const pMap: Record<string, ProductItem> = {};
      for (const p of prodRes.data || []) {
        pMap[p.id] = p;
      }
      setProductMap(pMap);
      setPurchaseOrders(poRes.data || []);
      setWarehouses(whRes.data || []);
      setReceipt(grRes.data);
      if (ctxRes.success && ctxRes.data) {
        setLbmCtx(ctxRes.data);
      }

      // Initialize line states
      const initialLines: LineUIState[] = (grRes.data.lines || []).map((l: GoodsReceiptLineItem) => {
        const prod = pMap[l.productId];
        const net = l.weightNet ?? l.quantityReceived ?? 0;
        const pSize = l.packageSize && l.packageSize > 0 ? l.packageSize : 10;
        const existingEntries = l.bagEntries || [];
        const bagCount = existingEntries.length > 0 ? existingEntries.length : (pSize > 0 ? Math.ceil(net / pSize) : 0);

        return {
          lineId: l.id,
          productId: l.productId,
          productName: prod?.name || `Produk #${l.productId.slice(0, 8)}`,
          quantityOrderedRef: l.quantityOrderedReference || net,
          weightGross: l.weightGross ?? net,
          weightTare: l.weightTare ?? 0,
          weightNet: net,
          packageSize: pSize,
          bagCount,
          entries: existingEntries,
          currentPage: 1,
        };
      });

      setLines(initialLines);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, [receiptId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived references
  const referencedPo = purchaseOrders.find((p) => p.id === receipt?.purchaseOrderId);
  const referencedWh = warehouses.find((w) => w.id === receipt?.warehouseId);

  // Handle change in Package Size
  const handlePackageSizeChange = (lineId: string, size: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.lineId !== lineId) return l;
        const count = size > 0 && l.weightNet > 0 ? Math.ceil(l.weightNet / size) : 0;
        return {
          ...l,
          packageSize: size,
          bagCount: count,
        };
      })
    );
  };

  // Generate / Reset Bag Entries
  const handleGenerateBagEntries = async (lineId: string) => {
    const line = lines.find((l) => l.lineId === lineId);
    if (!line || line.packageSize <= 0) {
      setErrorMsg("Masukkan ukuran per kemasan (kg) yang valid (lebih dari 0).");
      return;
    }
    const count = Math.ceil(line.weightNet / line.packageSize);
    if (count <= 0) {
      setErrorMsg("Netto aktual harus lebih dari 0 kg untuk membuat baris kemasan.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await procurementApi.generateBagEntries(receiptId, {
        lineId,
        packageSize: line.packageSize,
        totalCount: count,
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal membuat daftar kemasan.");
      }

      setLines((prev) =>
        prev.map((l) =>
          l.lineId === lineId
            ? { ...l, bagCount: count, entries: res.data || [], currentPage: 1 }
            : l
        )
      );
      setSuccessMsg(`Tabel ${count} kemasan berhasil dibuat.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal membuat daftar kemasan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Update entry weight manually in the table
  const handleWeightChange = (lineId: string, rowNumber: number, valueStr: string) => {
    const parsed = parseFloat(valueStr);
    const weight = isNaN(parsed) || valueStr.trim() === "" ? null : parsed;

    setLines((prev) =>
      prev.map((l) => {
        if (l.lineId !== lineId) return l;
        return {
          ...l,
          entries: l.entries.map((e) =>
            e.rowNumber === rowNumber ? { ...e, weightActual: weight } : e
          ),
        };
      })
    );
  };

  // Save current entries as draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      for (const line of lines) {
        if (line.entries.length === 0) continue;
        const res = await procurementApi.saveBagEntries(receiptId, {
          lineId: line.lineId,
          entries: line.entries.map((e) => ({
            rowNumber: e.rowNumber,
            weightActual: e.weightActual,
          })),
        });
        if (!res.success) {
          throw new Error(res.message || `Gagal menyimpan timbangan untuk ${line.productName}`);
        }
      }
      setSuccessMsg("Draft timbangan per kemasan berhasil disimpan.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan draft timbangan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm / Terbitkan LBM
  const handleConfirm = async () => {
    // Check if there are unfilled entries
    const hasUnfilled = lines.some((l) =>
      l.entries.length > 0 && l.entries.some((e) => e.weightActual === null)
    );
    if (hasUnfilled) {
      const confirmContinue = window.confirm(
        "Masih ada kemasan yang berat aktualnya belum diisi. Apakah Anda yakin ingin menerbitkan LBM sekarang?"
      );
      if (!confirmContinue) return;
    }

    setIsConfirming(true);
    setErrorMsg(null);
    try {
      // First save draft entries
      for (const line of lines) {
        if (line.entries.length > 0) {
          await procurementApi.saveBagEntries(receiptId, {
            lineId: line.lineId,
            entries: line.entries.map((e) => ({
              rowNumber: e.rowNumber,
              weightActual: e.weightActual,
            })),
          });
        }
      }

      // Then confirm
      const res = await procurementApi.confirmGoodsReceipt(receiptId);
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal menerbitkan LBM.");
      }

      setReceipt(res.data);
      setSuccessMsg("Laporan Barang Masuk (LBM) berhasil diterbitkan dan stok telah dibukukan!");
      setTimeout(() => setSuccessMsg(null), 4000);
      loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menerbitkan LBM.");
    } finally {
      setIsConfirming(false);
    }
  };

  // Export Excel (.xlsx) sesuai template LAPORAN BARANG MASUK (LBM).xlsx
  const handleExportExcel = async () => {
    if (!receipt) return;
    setIsExportingExcel(true);
    setErrorMsg(null);
    try {
      await exportLBMToExcel({
        receipt,
        lines,
        vendorName: referencedPo?.supplierName || "-",
        warehouseName: referencedWh?.name || "-",
      });
      setSuccessMsg("Berkas Excel LBM (.xlsx) berhasil dibuat dan diunduh.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal mengekspor berkas Excel LBM.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Cetak Dokumen Resmi GDG-001-LBM (Sesuai format Excel referensi)
  const handlePrintLBM = () => {
    if (!receipt) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan popup browser untuk mencetak laporan.");
      return;
    }

    const COLS = 6; // 6 kolom kemasan paralel
    const plasticTare = receipt.plasticTare ?? 0.03;

    let tablesHtml = "";
    lines.forEach((line) => {
      const entries = line.entries;
      const count = entries.length;
      if (count === 0) return;

      const rowsPerCol = Math.max(1, Math.ceil(count / COLS));
      const colGroups: BagEntryItem[][] = Array.from({ length: COLS }, (_, ci) =>
        entries.slice(ci * rowsPerCol, (ci + 1) * rowsPerCol)
      );

      // Header row: No & Berat (kg) 6x
      let headerThs = "";
      for (let c = 0; c < COLS; c++) {
        headerThs += `
          <th style="border: 1px solid #000; padding: 3px 4px; text-align: center; width: 26px; font-size: 8pt; background: #f1f5f9;">No</th>
          <th style="border: 1px solid #000; padding: 3px 6px; text-align: center; width: 55px; font-size: 8pt; background: #f1f5f9;">Berat (kg)</th>
        `;
        if (c < COLS - 1) {
          headerThs += `<th style="width: 6px; border: none;"></th>`;
        }
      }

      // Data rows
      let dataRows = "";
      for (let r = 0; r < rowsPerCol; r++) {
        let row = "<tr>";
        for (let c = 0; c < COLS; c++) {
          const item = colGroups[c][r];
          if (item) {
            row += `
              <td style="border: 1px solid #000; padding: 2px 3px; text-align: center; font-size: 8pt; font-family: monospace;">${item.rowNumber}</td>
              <td style="border: 1px solid #000; padding: 2px 4px; text-align: right; font-size: 8pt; font-family: monospace; font-weight: ${item.weightActual !== null ? "bold" : "normal"};">
                ${item.weightActual !== null ? item.weightActual.toFixed(2) : ""}
              </td>
            `;
          } else {
            row += `<td style="border: 1px solid #ccc;"></td><td style="border: 1px solid #ccc;"></td>`;
          }
          if (c < COLS - 1) {
            row += `<td style="border: none; width: 6px;"></td>`;
          }
        }
        row += "</tr>";
        dataRows += row;
      }

      // Subtotals per column
      let subtotalRow = "<tr style='font-weight: bold; background: #fafafa;'>";
      for (let c = 0; c < COLS; c++) {
        const colSum = colGroups[c].reduce((s, e) => s + (e.weightActual ?? 0), 0);
        subtotalRow += `
          <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 8pt;" colspan="2">
            ${colSum > 0 ? colSum.toFixed(2) : "-"}
          </td>
        `;
        if (c < COLS - 1) {
          subtotalRow += `<td style="border: none;"></td>`;
        }
      }
      subtotalRow += "</tr>";

      tablesHtml += `
        <div style="margin-top: 12px; page-break-inside: avoid;">
          <div style="font-weight: bold; font-size: 9pt; margin-bottom: 4px; color: #0f766e;">
            Rincian Karung: ${line.productName} (Target: ${line.packageSize} kg/karung, Total ${count} Kemasan)
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
            <thead><tr>${headerThs}</tr></thead>
            <tbody>${dataRows}${subtotalRow}</tbody>
          </table>
        </div>
      `;
    });

    const allEntries = lines.flatMap((l) => l.entries);
    const grandTotal = allEntries.reduce((s, e) => s + (e.weightActual ?? 0), 0);
    const totalBags = allEntries.length;
    const netAfterPlastic = Math.max(0, grandTotal - plasticTare * totalBags);
    const sjTotal = lines.reduce((s, l) => s + l.weightNet, 0);
    const diffSj = Math.abs(netAfterPlastic - sjTotal);
    const isSesuai = sjTotal > 0 && diffSj / sjTotal <= 0.01;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LAPORAN BARANG MASUK (LBM) - ${receipt.receiptNo}</title>
        <style>
          @page { size: A4 portrait; margin: 0.8cm; }
          body { font-family: Arial, sans-serif; font-size: 9pt; color: #1e293b; line-height: 1.3; }
          .kop { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 8px; }
          .kop-left { font-size: 8pt; }
          .kop-left strong { font-size: 11pt; color: #000; }
          .kop-right { text-align: right; font-size: 8pt; font-weight: bold; }
          .lbm-title { text-align: center; font-size: 12pt; font-weight: bold; border: 2px solid #000; padding: 6px; margin: 8px 0; background: #f8fafc; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8.5pt; }
          .meta-table td { padding: 2px 4px; vertical-align: top; }
          .meta-label { font-weight: bold; width: 120px; }
          .footer-box { border: 1px solid #000; padding: 6px 10px; margin-top: 10px; background: #f8fafc; font-size: 8.5pt; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 35px; text-align: center; font-size: 8.5pt; page-break-inside: avoid; }
          .sig-box { border-top: 1px solid #000; padding-top: 4px; margin-top: 45px; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="kop">
          <div class="kop-left">
            <strong>CV. Manna Anugerah Sejahtera</strong><br/>
            CU 820674 D-11 &bull; 104464OC &bull; FLO-ID 43683
          </div>
          <div class="kop-right">
            GDG-001-LBM<br/>
            Revisi 00
          </div>
        </div>

        <div class="lbm-title">
          LAPORAN RINCI BARANG MASUK / DETAIL INCOMING GOODS REPORT<br/>
          <span style="font-size: 10pt; font-weight: normal;">(LBM)</span>
        </div>

        <table class="meta-table">
          <tr>
            <td class="meta-label">Asal Bahan Baku:</td>
            <td>${referencedPo?.supplierName || "-"}</td>
            <td class="meta-label">Jenis Gula:</td>
            <td>${lines[0]?.productName || "-"}</td>
          </tr>
          <tr>
            <td class="meta-label">Kondisi Gula:</td>
            <td>${receipt.sugarCondition || "Kering, Bersih, Sesuai Standar"}</td>
            <td class="meta-label">Kondisi Kemasan:</td>
            <td>${receipt.packageCondition || "Utuh, Tidak Rusak"}</td>
          </tr>
          <tr>
            <td class="meta-label">Tanggal:</td>
            <td>${receipt.receivedDate || "-"}</td>
            <td class="meta-label">No. Surat Jalan:</td>
            <td style="font-weight: bold;">${receipt.deliveryNoteNo || "-"}</td>
          </tr>
          <tr>
            <td class="meta-label">No. LBM:</td>
            <td style="font-family: monospace; font-weight: bold;">${receipt.receiptNo}</td>
            <td class="meta-label">Berat Plastik:</td>
            <td>${plasticTare.toFixed(3)} kg/karung</td>
          </tr>
          <tr>
            <td class="meta-label">Gudang Tujuan:</td>
            <td>${referencedWh?.name || "-"}</td>
            <td class="meta-label">Ref. PO:</td>
            <td style="font-family: monospace;">${referencedPo?.orderNo || "-"}</td>
          </tr>
        </table>

        ${tablesHtml}

        <div class="footer-box">
          <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
            <tr>
              <td style="width: 25%;"><strong>Grand Total Bruto Timbang:</strong></td>
              <td style="width: 25%; font-family: monospace; font-weight: bold;">${grandTotal.toFixed(2)} kg</td>
              <td style="width: 25%;"><strong>Netto Setelah Berat Plastik:</strong></td>
              <td style="width: 25%; font-family: monospace; font-weight: bold; color: #0f766e;">${netAfterPlastic.toFixed(2)} kg</td>
            </tr>
            <tr>
              <td><strong>Qty Surat Jalan Supplier:</strong></td>
              <td style="font-family: monospace;">${sjTotal.toFixed(2)} kg</td>
              <td><strong>Bandingkan Surat Jalan:</strong></td>
              <td style="font-weight: bold; color: ${isSesuai ? "#16a34a" : "#dc2626"};">
                ${isSesuai ? "SESUAI" : "TIDAK SESUAI (SELISIH " + diffSj.toFixed(2) + " kg)"}
              </td>
            </tr>
          </table>
        </div>

        <div class="signatures">
          <div>
            <div>Diserahkan Oleh (Supir / Vendor)</div>
            <div class="sig-box">( ${referencedPo?.supplierName || "Supir / Vendor"} )</div>
          </div>
          <div>
            <div>Diperiksa Oleh (QC Inbound)</div>
            <div class="sig-box">( Staff QC )</div>
          </div>
          <div>
            <div>Dibuat Oleh (Admin Gudang)</div>
            <div class="sig-box">( ${receipt.receivedBy || "Admin Gudang"} )</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
        Memuat detail LBM...
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-sm text-rose-600">Laporan Barang Masuk tidak ditemukan.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/procurement/receipts")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/procurement/receipts")}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Detail LBM: {receipt.receiptNo}
              </h1>
              <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold border">
                {receipt.documentCode || "GDG-001-LBM"}
              </span>
              <StatusBadge status={receipt.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Pencatatan rincian timbangan per kemasan sak untuk penerimaan bahan baku.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            title="Download Berkas Excel LBM (.xlsx) Format GDG-001"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            {isExportingExcel ? "Mengunduh Excel..." : "Export Excel (.xlsx)"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
            onClick={handlePrintLBM}
            title="Cetak Laporan Format GDG-001-LBM"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" /> Cetak LBM (GD-001)
          </Button>

          {receipt.status === "draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Menyimpan..." : "Simpan Draft"}
              </Button>

              <Button
                variant="gradient"
                size="sm"
                className="h-8 text-xs gap-1.5 font-semibold"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                <Check className="h-3.5 w-3.5" />
                {isConfirming ? "Memproses..." : "Terbitkan LBM & Simpan Stok"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
        <div>
          <span className="text-[11px] text-muted-foreground block">Referensi PO:</span>
          <span className="font-semibold text-slate-900 font-mono">
            {referencedPo?.orderNo || receipt.purchaseOrderId}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-1">Vendor:</span>
          <span className="font-semibold text-slate-900">{referencedPo?.supplierName || "-"}</span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground block">Surat Jalan Supplier:</span>
          <span className="font-semibold text-slate-900">{receipt.deliveryNoteNo || "-"}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Tgl Kedatangan:</span>
          <span className="font-semibold text-slate-900">{receipt.receivedDate || "-"}</span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground block">Gudang Tujuan:</span>
          <span className="font-semibold text-slate-900">{referencedWh?.name || "-"}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Penerima (Staff):</span>
          <span className="font-semibold text-slate-900">{receipt.receivedBy || "-"}</span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground block">Kondisi QC:</span>
          <span className="text-slate-800 block">
            Gula: <strong>{receipt.sugarCondition || "Dari QC"}</strong>
          </span>
          <span className="text-slate-800 block mt-0.5">
            Kemasan: <strong>{receipt.packageCondition || "Dari QC"}</strong>
          </span>
          <span className="text-slate-600 block mt-0.5 font-mono">
            Plastik: {receipt.plasticTare ?? 0.03} kg/karung
          </span>
        </div>
      </div>

      {/* QC Internal Forms & Warehouse Put-Away Workflow Banner (CAS, PBK, PBD -> Form SBB) */}
      <div className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-sky-50/50 to-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-xs text-indigo-950 uppercase tracking-wider">
              Alur QC Internal &amp; Masuk Gudang Bahan Baku
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded border border-indigo-200">
              Sprint 2
            </span>
            {lbmCtx && lbmCtx.existingEntries.length > 0 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                Tercatat di Gudang: {lbmCtx.existingEntries.map((x) => x.entryNo).join(", ")}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600">
            Lengkapi 3 formulir QC (CAS, PBD, PBK), lalu lanjutkan ke pencatatan <strong>Form Stok Gudang Bahan Baku (GDG-002-SBB)</strong> sebelum pembuatan BPB &amp; LBB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 bg-white font-medium"
            onClick={() =>
              router.push(
                `/qc/armada?lbmNo=${encodeURIComponent(receipt.receiptNo)}&goodsReceiptId=${encodeURIComponent(receipt.id)}`
              )
            }
          >
            <Truck className="h-3.5 w-3.5 text-indigo-600" />
            Check Armada (CAS)
            {lbmCtx && lbmCtx.casStatus !== "missing" && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {lbmCtx.casStatus}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 bg-white font-medium"
            onClick={() =>
              router.push(
                `/qc/packaging?lbmNo=${encodeURIComponent(receipt.receiptNo)}&goodsReceiptId=${encodeURIComponent(receipt.id)}`
              )
            }
          >
            <PackageCheck className="h-3.5 w-3.5 text-indigo-600" />
            Bahan Kemas (PBK)
            {lbmCtx && lbmCtx.pbkStatus !== "missing" && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {lbmCtx.pbkStatus}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 bg-white font-medium"
            onClick={() =>
              router.push(
                `/qc/incoming?lbmNo=${encodeURIComponent(receipt.receiptNo)}&goodsReceiptId=${encodeURIComponent(receipt.id)}`
              )
            }
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-indigo-600" />
            Bahan Datang (PBD)
            {lbmCtx && lbmCtx.pbdStatus !== "missing" && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {lbmCtx.pbdStatus}
              </span>
            )}
          </Button>

          <Button
            variant="gradient"
            size="sm"
            className="h-8 text-xs gap-1.5 font-semibold"
            onClick={() =>
              router.push(
                `/inventory/raw-material-stock?lbmNo=${encodeURIComponent(receipt.receiptNo)}&goodsReceiptId=${encodeURIComponent(receipt.id)}`
              )
            }
          >
            <Warehouse className="h-3.5 w-3.5" />
            {lbmCtx && lbmCtx.existingEntries.length > 0
              ? "Lihat / Tambah Form SBB"
              : "Masuk Gudang (Form SBB)"}
          </Button>
        </div>
      </div>

      {/* Product Lines & Bag Weighing Tables */}
      <div className="space-y-6">
        {lines.map((line) => {
          const totalPages = Math.max(1, Math.ceil(line.entries.length / PAGE_SIZE));
          const pageEntries = line.entries.slice(
            (line.currentPage - 1) * PAGE_SIZE,
            line.currentPage * PAGE_SIZE
          );
          const filledCount = line.entries.filter((e) => e.weightActual !== null).length;
          const sumWeighed = line.entries.reduce((sum, e) => sum + (e.weightActual ?? 0), 0);
          const diffTarget = sumWeighed > 0 ? sumWeighed - line.weightNet : 0;

          return (
            <div
              key={line.lineId}
              className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-4"
            >
              {/* Product Header & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-brand-primary" />
                    {line.productName}
                  </h3>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                    <span>
                      PO Reference: <strong>{line.quantityOrderedRef.toLocaleString("id-ID")} kg</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Bruto: <strong>{line.weightGross.toLocaleString("id-ID")} kg</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Tara: <strong>{line.weightTare.toLocaleString("id-ID")} kg</strong>
                    </span>
                    <span>&bull;</span>
                    <span className="text-brand-primary font-semibold">
                      Netto Aktual: {line.weightNet.toLocaleString("id-ID")} kg
                    </span>
                  </div>
                </div>

                {line.entries.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Progress Timbang
                      </div>
                      <div className="font-mono text-xs font-bold text-emerald-700">
                        {filledCount} / {line.entries.length} Kemasan
                      </div>
                    </div>
                    <div className="text-right pl-3 border-l">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Subtotal Netto
                      </div>
                      <div className="font-mono text-xs font-bold text-slate-800">
                        {sumWeighed.toFixed(2)} kg
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Package Division Setup */}
              <div className="flex flex-wrap items-end gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Target Kemasan (kg/karung)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.5"
                      min="0.1"
                      disabled={receipt.status === "completed"}
                      value={line.packageSize || ""}
                      onChange={(e) =>
                        handlePackageSizeChange(line.lineId, parseFloat(e.target.value) || 0)
                      }
                      placeholder="Contoh: 10"
                      className="h-8 text-xs font-mono w-28 bg-white"
                    />
                    <span className="text-xs text-muted-foreground font-semibold">kg</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Jumlah Kemasan (Otomatis)</label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="text"
                      disabled
                      readOnly
                      value={
                        line.packageSize > 0
                          ? `${Math.ceil(line.weightNet / line.packageSize)} kemasan`
                          : "0 kemasan"
                      }
                      className="h-8 text-xs font-mono w-32 bg-slate-100 font-bold text-slate-800"
                    />
                  </div>
                </div>

                {receipt.status === "draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 text-slate-700 border-slate-300 hover:bg-white"
                    onClick={() => handleGenerateBagEntries(line.lineId)}
                    disabled={isSaving}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {line.entries.length > 0 ? "Generate Ulang Tabel" : "Buat Tabel Kemasan"}
                  </Button>
                )}

                {/* Direct to Single-Entry Weighing Mode */}
                {line.entries.length > 0 && (
                  <Button
                    variant="gradient"
                    size="sm"
                    className="h-8 text-xs gap-1.5 ml-auto font-semibold"
                    onClick={() =>
                      router.push(
                        `/procurement/receipts/${receiptId}/weighing?lineId=${line.lineId}`
                      )
                    }
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Mode Input Karung (Satu per Satu)
                  </Button>
                )}
              </div>

              {/* Bag Entries Table */}
              {line.entries.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-lg text-xs text-muted-foreground space-y-2">
                  <Scale className="h-8 w-8 text-slate-400 mx-auto" />
                  <p>
                    Tabel rincian kemasan belum dibuat. Masukkan berat per kemasan (contoh: 10 kg)
                    lalu klik <strong>Buat Tabel Kemasan</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left w-20 font-semibold">No. Sak</th>
                          <th className="px-3 py-2 text-left w-48 font-semibold">
                            Berat Aktual Timbang (kg)
                          </th>
                          <th className="px-3 py-2 text-left w-40 font-semibold">
                            Selisih Target ({line.packageSize} kg)
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">Keterangan / Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pageEntries.map((entry) => {
                          const diff =
                            entry.weightActual !== null
                              ? parseFloat((entry.weightActual - line.packageSize).toFixed(3))
                              : null;

                          return (
                            <tr key={entry.rowNumber} className="hover:bg-slate-50/50">
                              <td className="px-3 py-1.5 font-mono text-slate-600 font-bold">
                                #{entry.rowNumber}
                              </td>
                              <td className="px-3 py-1.5">
                                <Input
                                  type="number"
                                  step="0.001"
                                  disabled={receipt.status === "completed"}
                                  value={entry.weightActual !== null ? entry.weightActual : ""}
                                  onChange={(e) =>
                                    handleWeightChange(line.lineId, entry.rowNumber, e.target.value)
                                  }
                                  placeholder={line.packageSize ? `≈ ${line.packageSize}` : "0.000"}
                                  className="h-7 text-xs font-mono w-36 font-semibold"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === "Tab") {
                                      e.preventDefault();
                                      const nextInput = document.querySelector(
                                        `input[data-bag="${line.lineId}-${entry.rowNumber + 1}"]`
                                      ) as HTMLInputElement;
                                      if (nextInput) nextInput.focus();
                                    }
                                  }}
                                  data-bag={`${line.lineId}-${entry.rowNumber}`}
                                />
                              </td>
                              <td className="px-3 py-1.5 font-mono text-xs">
                                {diff === null ? (
                                  <span className="text-slate-400">—</span>
                                ) : (
                                  <span
                                    className={`font-semibold ${
                                      Math.abs(diff) < 0.001
                                        ? "text-emerald-600"
                                        : diff > 0
                                        ? "text-amber-600"
                                        : "text-rose-600"
                                    }`}
                                  >
                                    {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)} kg
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground">
                                {entry.weightActual !== null ? (
                                  <span className="inline-flex items-center text-emerald-600 gap-1 text-[11px] font-medium">
                                    <Check className="h-3 w-3" /> Terdata
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Belum ditimbang</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                      <div>
                        Menampilkan kemasan{" "}
                        <span className="font-semibold">
                          {(line.currentPage - 1) * PAGE_SIZE + 1}
                        </span>{" "}
                        -{" "}
                        <span className="font-semibold">
                          {Math.min(line.currentPage * PAGE_SIZE, line.entries.length)}
                        </span>{" "}
                        dari <span className="font-semibold">{line.entries.length}</span> kemasan
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={line.currentPage === 1}
                          onClick={() =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.lineId === line.lineId
                                  ? { ...l, currentPage: l.currentPage - 1 }
                                  : l
                              )
                            )
                          }
                        >
                          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                        </Button>

                        <span className="px-2 text-xs font-semibold">
                          Hal {line.currentPage} / {totalPages}
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={line.currentPage >= totalPages}
                          onClick={() =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.lineId === line.lineId
                                  ? { ...l, currentPage: l.currentPage + 1 }
                                  : l
                              )
                            )
                          }
                        >
                          Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Line Summary */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border text-xs">
                    <div>
                      Total terisi: <strong>{filledCount}</strong> dari{" "}
                      <strong>{line.entries.length}</strong> kemasan &bull; Rata-rata:{" "}
                      <strong>
                        {filledCount > 0 ? (sumWeighed / filledCount).toFixed(3) : "0.000"} kg/sak
                      </strong>
                    </div>
                    <div>
                      Subtotal aktual:{" "}
                      <span className="font-mono font-bold text-slate-900">
                        {sumWeighed.toFixed(2)} kg
                      </span>{" "}
                      {diffTarget !== 0 && (
                        <span
                          className={`ml-1 text-[11px] font-mono font-semibold ${
                            diffTarget > 0 ? "text-amber-600" : "text-rose-600"
                          }`}
                        >
                          ({diffTarget > 0 ? `+${diffTarget.toFixed(2)}` : diffTarget.toFixed(2)} kg)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
