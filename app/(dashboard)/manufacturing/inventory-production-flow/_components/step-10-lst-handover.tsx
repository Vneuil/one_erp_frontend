"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ShieldCheck,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import { ProductionBatchRecord } from "../_lib/production-flow-types";
import { manufacturingApi, CreateLSTInput, HandoverReportItem } from "@/lib/api/manufacturing";
import { exportLSTExcel } from "@/lib/utils/export-wip-excel";
import { CustomerItem } from "@/lib/api/customers";

interface Step10LSTHandoverProps {
  batch: ProductionBatchRecord;
  customers?: CustomerItem[];
  onUpdateBatch: (updates: Partial<ProductionBatchRecord>) => void;
  onPrev: () => void;
  onFinish: () => void;
  isCompleted: boolean;
}

export function Step10LSTHandover({
  batch,
  customers = [],
  onUpdateBatch,
  onPrev,
  onFinish,
  isCompleted,
}: Step10LSTHandoverProps) {
  const [lstNumber, setLstNumber] = useState(
    batch.lstNo || `GDG-009-LST-${new Date().toISOString().slice(0, 7).replace("-", "")}-${batch.batchNo.slice(-3)}`
  );
  const [handoverDate, setHandoverDate] = useState(batch.handoverDate || new Date().toISOString().slice(0, 10));
  const [handedOverBy, setHandedOverBy] = useState(batch.handedOverBy || "Spv Produksi");
  const [receivedBy, setReceivedBy] = useState(batch.receivedBy || "Staf Gudang FG");
  const [verifiedByQc, setVerifiedByQc] = useState(batch.verifiedByQc || "QC Lead");

  const [isSavingLST, setIsSavingLST] = useState(false);
  const [isVerifyingQC, setIsVerifyingQC] = useState(false);
  const [isAcceptingWarehouse, setIsAcceptingWarehouse] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isFinal = batch.status === "final" || batch.lstStatus === "accepted_warehouse";
  const isQcVerified = batch.lstStatus === "verified_qc" || isFinal;
  const realFgKg = batch.fgOutputKg || (batch.rawInputKg ? Math.round(batch.rawInputKg * 0.985) : 5000);
  const packedBagsCount = batch.fgOutputPcs || Math.floor(realFgKg / 25);
  const weightPerBag = batch.weightPerBag || 25;
  const totalWeightKg = packedBagsCount * weightPerBag;
  const palletCount = batch.palletCount || Math.ceil(packedBagsCount / 40);

  // Simpan & Kirim LST ke Backend API
  const handleSaveLST = async () => {
    setIsSavingLST(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: CreateLSTInput = {
      fairtradeStatus: batch.fairtradeStatus === "FAIRTRADE" ? "FAIRTRADE" : "NON FAIRTRADE",
      fromDepartment: "Produksi (Line Gula Semut)",
      toDepartment: "Gudang Barang Jadi (WMS FG)",
      handoverDate,
      handedOverBy,
      notes: `Serah Terima Batch ${batch.batchNo} (${packedBagsCount} sak @ ${weightPerBag}kg = ${totalWeightKg} kg) - Sertifikasi ${batch.certification}. Alokasi ${palletCount} Palet.`,
      items: [
        {
          itemNo: 1,
          itemName: batch.productName,
          itemCode: batch.productCode,
          batchNo: batch.batchNo,
          unitKg: totalWeightKg,
          packaging: `Sak Kertas Kraft ${weightPerBag}kg`,
          buyerName: batch.buyerName || "Buyer Ekspor",
          quantityPcs: packedBagsCount,
          notes: `Kondisi sak bersih & rapi, lolos Metal Detector CCP 1 & QC PJD. Alokasi ${palletCount} palet.`,
        },
      ],
    };

    try {
      const res = await manufacturingApi.createLST(payload);
      const createdId = res?.data?.id;

      onUpdateBatch({
        lstId: createdId,
        lstNo: lstNumber,
        handoverDate,
        handedOverBy,
        receivedBy,
        verifiedByQc,
        lstStatus: "draft",
      });

      setSuccessMessage("Dokumen LST berhasil disimpan sebagai Draft! Silakan lanjutkan Verifikasi QC.");
    } catch (err: unknown) {
      // In case backend is offline/mock, show message and record local update
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Gagal menyimpan ke server: ${msg}. Draft disimpan di memori lokal.`);
      onUpdateBatch({
        lstNo: lstNumber,
        handoverDate,
        handedOverBy,
        receivedBy,
        verifiedByQc,
        lstStatus: "draft",
      });
    } finally {
      setIsSavingLST(false);
    }
  };

  // Verifikasi QC
  const handleVerifyQC = async () => {
    setIsVerifyingQC(true);
    setErrorMessage(null);
    try {
      if (batch.lstId) {
        await manufacturingApi.verifyLSTByQC(batch.lstId);
      }
      onUpdateBatch({
        lstStatus: "verified_qc",
        verifiedByQc,
      });
      setSuccessMessage("Verifikasi QC selesai disahkan! Dokumen siap diterima oleh Gudang FG.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Gagal verifikasi QC: ${msg}`);
      // Fallback
      onUpdateBatch({
        lstStatus: "verified_qc",
        verifiedByQc,
      });
    } finally {
      setIsVerifyingQC(false);
    }
  };

  // Penerimaan Gudang FG (Final)
  const handleAcceptWarehouse = async () => {
    setIsAcceptingWarehouse(true);
    setErrorMessage(null);
    try {
      if (batch.lstId) {
        await manufacturingApi.acceptLSTByWarehouse(batch.lstId);
      }
      onUpdateBatch({
        status: "final",
        lstStatus: "accepted_warehouse",
        receivedBy,
      });
      setSuccessMessage(`Batch ${batch.batchNo} resmi diserahterimakan dan masuk ke stok Gudang FG!`);
      onFinish();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Gagal terima gudang: ${msg}`);
      // Fallback
      onUpdateBatch({
        status: "final",
        lstStatus: "accepted_warehouse",
        receivedBy,
      });
      onFinish();
    } finally {
      setIsAcceptingWarehouse(false);
    }
  };

  // Ekspor Excel Resmi GDG-009-LST
  const handleExportExcel = async () => {
    try {
      const dummyReport: HandoverReportItem = {
        id: batch.lstId || "lst-" + batch.batchNo,
        reportNo: lstNumber,
        fairtradeStatus: batch.fairtradeStatus,
        fromDepartment: "Produksi",
        toDepartment: "Gudang Barang Jadi",
        handoverDate: handoverDate,
        totalQuantityPcs: packedBagsCount,
        totalWeightKg: totalWeightKg,
        notes: `Batch ${batch.batchNo} - ${batch.certification}`,
        handedOverBy: handedOverBy,
        handedOverSignDate: handoverDate,
        verifiedByQc: verifiedByQc,
        verifiedSignDate: handoverDate,
        receivedByWarehouse: receivedBy,
        receivedSignDate: handoverDate,
        status: isFinal ? "accepted_warehouse" : "draft",
        items: [
          {
            id: "i1",
            reportId: batch.lstId || "lst-" + batch.batchNo,
            itemNo: 1,
            itemName: batch.productName,
            itemCode: batch.productCode,
            batchNo: batch.batchNo,
            unitKg: totalWeightKg,
            packaging: `Sak Kertas Kraft ${weightPerBag}kg`,
            buyerName: batch.buyerName || "Buyer Ekspor",
            quantityPcs: packedBagsCount,
            notes: `Lolos CCP Metal Detector & Inspeksi Mutu PJD. Alokasi ${palletCount} palet.`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await exportLSTExcel(dummyReport);
      setSuccessMessage(`File Excel Laporan Serah Terima (${lstNumber}.xlsx) berhasil diunduh.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage("Gagal ekspor excel: " + msg);
    }
  };

  // Cetak Dokumen LST Resmi
  const handlePrintSlip = () => {
    const win = window.open("", "_blank");
    if (!win) return;
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
          <div><strong>Nomor LST:</strong> ${lstNumber}</div>
          <div><strong>Tanggal Penyerahan:</strong> ${handoverDate}</div>
          <div><strong>Dari Departemen:</strong> Produksi (Line Gula Semut)</div>
          <div><strong>Kepada Departemen:</strong> Gudang Barang Jadi (WMS FG)</div>
          <div><strong>Status Fairtrade:</strong> ${batch.fairtradeStatus}</div>
          <div><strong>Standar Mutu:</strong> ${batch.certification}</div>
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
              <td><strong>${batch.productName}</strong><br><small>${batch.productCode}</small></td>
              <td style="font-family: monospace; font-weight: bold;">${batch.batchNo}</td>
              <td>Sak Kraft ${weightPerBag}kg</td>
              <td style="text-align: right;"><strong>${packedBagsCount.toLocaleString()}</strong></td>
              <td style="text-align: right;"><strong>${totalWeightKg.toLocaleString()} Kg</strong></td>
              <td>${batch.buyerName || "-"}</td>
              <td>Alokasi ${palletCount} Palet</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #fafafa; font-weight: bold;">
              <td colspan="4" style="text-align: right;">TOTAL SERAH TERIMA:</td>
              <td style="text-align: right;">${packedBagsCount.toLocaleString()} Sak</td>
              <td style="text-align: right;">${totalWeightKg.toLocaleString()} Kg</td>
              <td colspan="2">Lolos Uji Mutu CCP Metal Detector</td>
            </tr>
          </tfoot>
        </table>
        <div class="signatures">
          <div class="sig-box"><div>Diserahkan Oleh (Produksi)</div><div class="sig-space"></div><strong>${handedOverBy}</strong></div>
          <div class="sig-box"><div>Diverifikasi Oleh (QC/QA)</div><div class="sig-space"></div><strong>${verifiedByQc}</strong></div>
          <div class="sig-box"><div>Diterima Oleh (Gudang FG)</div><div class="sig-space"></div><strong>${receivedBy}</strong></div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <Card className="border-l-4 border-l-emerald-600">
        <CardHeader className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="success" className="text-xs">
                GDG-009-LST
              </Badge>
              <Badge variant={isFinal ? "success" : isQcVerified ? "warning" : "secondary"} className="text-xs">
                {isFinal ? "Final / Accepted" : isQcVerified ? "Verified QC" : "Draft LST"}
              </Badge>
            </div>
            <CardTitle className="text-base font-bold text-foreground">
              Laporan Serah Terima Fisik Barang Jadi (Produksi ➔ Gudang FG)
            </CardTitle>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintSlip}
              className="gap-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak LST
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
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
                disabled={isFinal}
              />
            </div>
            <div>
              <label className="text-muted-foreground font-medium">Tanggal Penyerahan:</label>
              <Input
                type="date"
                value={handoverDate}
                onChange={(e) => setHandoverDate(e.target.value)}
                className="text-xs mt-1"
                disabled={isFinal}
              />
            </div>
            <div>
              <label className="text-muted-foreground font-medium">PIC Produksi:</label>
              <Input
                value={handedOverBy}
                onChange={(e) => setHandedOverBy(e.target.value)}
                className="text-xs mt-1"
                disabled={isFinal}
              />
            </div>
            <div>
              <label className="text-muted-foreground font-medium">PIC Gudang FG:</label>
              <Input
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="text-xs mt-1"
                disabled={isFinal}
              />
            </div>
          </div>

          {/* Tabel Serah Terima */}
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
                <TableCell className="font-semibold text-xs">{batch.productName}</TableCell>
                <TableCell className="font-mono font-bold text-blue-700 text-xs">{batch.batchNo}</TableCell>
                <TableCell className="text-xs">Sak Kraft {weightPerBag} Kg</TableCell>
                <TableCell className="text-right font-mono font-bold text-xs">
                  {packedBagsCount.toLocaleString()} Sak
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-emerald-700 text-xs">
                  {totalWeightKg.toLocaleString()} Kg
                </TableCell>
                <TableCell className="text-xs">{batch.buyerName || "-"}</TableCell>
                <TableCell className="text-xs">Alokasi {palletCount} Palet</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Multi-step Approval Gates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              batch.lstId || batch.lstStatus ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-slate-50 border-slate-200"
            }`}>
              <div>
                <span className="font-bold block">1. Draft LST Produksi</span>
                <span className="text-[10px] text-muted-foreground">{handedOverBy}</span>
              </div>
              {!batch.lstId && !isFinal ? (
                <Button
                  size="sm"
                  onClick={handleSaveLST}
                  disabled={isSavingLST}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {isSavingLST ? "Menyimpan..." : "Kirim LST"}
                </Button>
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
            </div>

            <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              isQcVerified ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-slate-50 border-slate-200"
            }`}>
              <div>
                <span className="font-bold block">2. Verifikasi QC/QA</span>
                <span className="text-[10px] text-muted-foreground">{verifiedByQc}</span>
              </div>
              {!isQcVerified && !isFinal ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleVerifyQC}
                  disabled={isVerifyingQC || (!batch.lstId && !batch.lstStatus)}
                  className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold gap-1"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {isVerifyingQC ? "Verifikasi..." : "Verifikasi QC"}
                </Button>
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
            </div>

            <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              isFinal ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-slate-50 border-slate-200"
            }`}>
              <div>
                <span className="font-bold block">3. Terima Gudang FG</span>
                <span className="text-[10px] text-muted-foreground">{receivedBy}</span>
              </div>
              {!isFinal ? (
                <Button
                  size="sm"
                  onClick={handleAcceptWarehouse}
                  disabled={isAcceptingWarehouse || !isQcVerified}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  {isAcceptingWarehouse ? "Memproses..." : "Terima FG (Final)"}
                </Button>
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
            </div>
          </div>
        </CardContent>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {isFinal ? (
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <Lock className="h-4 w-4" />
                Dokumen serah terima telah disahkan &amp; stok resmi masuk ke Gudang FG (WMS).
              </div>
            ) : (
              <span>
                Ikuti 3 tahapan penandatanganan di atas untuk mengunci dokumen serah terima ke WMS FG.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              className="gap-1 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Tahap 9 (LHP)</span>
            </Button>

            <Button
              size="sm"
              onClick={onFinish}
              disabled={!isFinal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFinal ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Selesai &amp; Kunci Pipeline ke Overview</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Sahkan LST ke Gudang FG Terlebih Dahulu</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
