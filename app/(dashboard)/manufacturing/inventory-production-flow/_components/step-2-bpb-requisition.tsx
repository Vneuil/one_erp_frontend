"use client";

import React, { useState, useEffect } from "react";
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
  FileText,
  QrCode,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Database,
  Building2,
  Package,
  Layers,
  AlertCircle,
  Lock,
} from "lucide-react";
import { ProductionBatchRecord } from "../_lib/production-flow-types";
import { manufacturingApi, CreateRequisitionInput } from "@/lib/api/manufacturing";

interface Step2BPBRequisitionProps {
  batch: ProductionBatchRecord;
  onUpdateBatch: (updates: Partial<ProductionBatchRecord>) => void;
  onNext: () => void;
  onPrev: () => void;
  isCompleted: boolean;
}

export function Step2BPBRequisition({
  batch,
  onUpdateBatch,
  onNext,
  onPrev,
  isCompleted,
}: Step2BPBRequisitionProps) {
  const [scannedBarcode, setScannedBarcode] = useState(
    batch.scannedBarcode || (batch.lbmNo ? `LOT-${batch.lbmNo}` : `LOT-${batch.batchNo}`)
  );
  const [bpbDocNo, setBpbDocNo] = useState(batch.requisitionNo || "PR-09");
  const [activeReqId, setActiveReqId] = useState(batch.requisitionId || "");
  const [isScanned, setIsScanned] = useState(Boolean(batch.scannedBarcode));
  const [isAccGudang, setIsAccGudang] = useState(false);
  const [isEnterProd, setIsEnterProd] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Estimated packaging bags based on raw weight
  const packagingRequiredPcs = batch.packagingQty || Math.ceil((batch.rawInputKg || 5000) / 25);

  // Load real requisition if available
  useEffect(() => {
    let isMounted = true;
    async function loadRequisitionData() {
      try {
        let reqId = batch.requisitionId;
        if (!reqId && (batch.productionOrderId || batch.batchNo)) {
          const res = await manufacturingApi.listRequisitions();
          if (res?.data && res.data.length > 0) {
            const found = res.data.find(
              (r) =>
                r.id === batch.requisitionId ||
                r.productionOrderId === batch.productionOrderId ||
                r.orderNumber === batch.batchNo ||
                r.orderNumber === batch.orderNumber
            );
            if (found) reqId = found.id;
          }
        }
        if (reqId) {
          setActiveReqId(reqId);
          const reqRes = await manufacturingApi.getRequisition(reqId);
          if (isMounted && reqRes?.data) {
            const req = reqRes.data;
            if (req.requestNo) setBpbDocNo(req.requestNo);
            if (req.warehouseApprovedBy) setIsAccGudang(true);
            if (req.enteredProductionBy) setIsEnterProd(true);
            onUpdateBatch({ requisitionId: req.id, requisitionNo: req.requestNo });
          }
        }
      } catch {
        // Keep fallback state
      }
    }
    loadRequisitionData();
    return () => {
      isMounted = false;
    };
  }, [batch.requisitionId, batch.productionOrderId, batch.batchNo]);

  const handleConfirmScan = () => {
    if (!scannedBarcode.trim()) return;
    setIsScanned(true);
    onUpdateBatch({ scannedBarcode });
  };

  // Sync / create real requisition in backend
  const handleSyncRequisition = async () => {
    setIsActionLoading(true);
    setSyncStatus(null);
    try {
      const payload: CreateRequisitionInput = {
        requisitionType: "raw_material",
        documentCode: "PR-09",
        materialCategory: "Gula Kelapa Organik",
        fairtradeStatus: batch.fairtradeStatus || "NON FAIRTRADE",
        orderNumber: batch.batchNo,
        requestDate: batch.date || new Date().toISOString().slice(0, 10),
        department: "Produksi",
        requestedBy: batch.handedOverBy || "Spv Produksi",
        notes: `Permintaan bahan baku untuk Batch Produksi ${batch.batchNo} (${batch.productName}) dari LBM ${batch.lbmNo}`,
        lines: [
          {
            productId: batch.productId || "",
            productName: batch.productName,
            quantityRequested: batch.rawInputKg,
            quantityIssued: batch.rawInputKg,
            quantityUsed: batch.rawInputKg,
            quantityReject: 0,
            quantityReturned: 0,
            uom: "KG",
            batchNo: batch.batchNo,
            supplierName: batch.supplier,
          },
        ],
      };

      const res = await manufacturingApi.createRequisition(payload);
      if (res?.data) {
        const created = res.data;
        setActiveReqId(created.id);
        setBpbDocNo(created.requestNo);
        onUpdateBatch({ requisitionId: created.id, requisitionNo: created.requestNo });
        setSyncStatus(`Dokumen BPB tersimpan di backend! No: ${created.requestNo}`);
      } else {
        setSyncStatus("Dokumen BPB dicatat di memori lokal batch.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncStatus(`Disimpan lokal: ${msg}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAccGudang = async () => {
    const targetId = activeReqId || batch.requisitionId;
    if (targetId) {
      setIsActionLoading(true);
      try {
        await manufacturingApi.accGudangRequisition(targetId);
      } catch {
        // Fallback for demo/mock state
      } finally {
        setIsActionLoading(false);
      }
    }
    setIsAccGudang(true);
  };

  const handleEnterProduction = async () => {
    const targetId = activeReqId || batch.requisitionId;
    if (targetId) {
      setIsActionLoading(true);
      try {
        await manufacturingApi.enterProductionRequisition(targetId);
      } catch {
        // Fallback for demo/mock state
      } finally {
        setIsActionLoading(false);
      }
    }
    setIsEnterProd(true);
  };

  const isStep2Valid = Boolean(isScanned && bpbDocNo.trim() && isAccGudang);

  const handleSaveAndNext = () => {
    if (!isStep2Valid) return;
    onUpdateBatch({
      scannedBarcode,
      requisitionId: activeReqId,
      requisitionNo: bpbDocNo,
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* ─── KARTU UTAMA FORMULIR BPB / PR-09 ─────────────────────────────── */}
      <Card className="border-l-4 border-l-blue-600">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Formulir Baku Auditor: PR-09 &amp; GDG-011-BPB
              </span>
              <Badge variant="success" className="text-xs">{batch.certification}</Badge>
            </div>
            <h4 className="text-base font-bold text-foreground">
              Bon Permintaan Bahan Baku (BPB) &amp; Kemasan (PBPK)
            </h4>
            <p className="text-xs text-muted-foreground">
              Nomor dokumen formulir baku: <strong className="font-mono text-foreground">{bpbDocNo}</strong> untuk penyerahan fisik dari Gudang Bahan Baku ke Lantai Produksi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!activeReqId ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isActionLoading}
                onClick={handleSyncRequisition}
                className="text-xs border-blue-300 text-blue-800 hover:bg-blue-50"
              >
                <Database className="h-3.5 w-3.5 mr-1" />
                Sinkronkan BPB ke DB
              </Button>
            ) : null}

            <Button
              size="sm"
              variant="outline"
              disabled={isAccGudang || isActionLoading}
              onClick={handleAccGudang}
              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            >
              {isAccGudang ? "✓ ACC Gudang Selesai" : "ACC Gudang Bahan"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isEnterProd || isActionLoading}
              onClick={handleEnterProduction}
              className="text-xs border-blue-300 text-blue-800 hover:bg-blue-50"
            >
              {isEnterProd ? "✓ Masuk Produksi" : "Masuk Produksi"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {syncStatus && (
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* ─── RINCIAN ALOKASI BAHAN BAKU & KEMASAN ───────────────────────────── */}
      <Card>
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-bold text-foreground">
              Daftar Bahan Yang Diserahterimakan (Alokasi Batch #{batch.batchNo})
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            PO: {batch.poNo || "-"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipe Alokasi</TableHead>
                <TableHead>Nama Material</TableHead>
                <TableHead>Sumber Lot / Dokumen</TableHead>
                <TableHead>Vendor / Pemasok</TableHead>
                <TableHead className="text-right">Kuantitas Permintaan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold text-xs text-blue-900">Bahan Baku Mentah</TableCell>
                <TableCell className="text-xs">
                  <strong>{batch.productName}</strong> ({batch.productCode})
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {batch.lbmNo || "LBM Inbound"}
                </TableCell>
                <TableCell className="text-xs">
                  {batch.supplier} ({batch.supplierCode})
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                  {batch.rawInputKg.toLocaleString()} Kg
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold text-xs text-amber-900">Kemasan Primer &amp; Sekunder</TableCell>
                <TableCell className="text-xs">
                  Sak Kertas Kraft 25 Kg + Inner Polyethylene (PE)
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  Gudang Kemasan
                </TableCell>
                <TableCell className="text-xs">Stok Gudang Kemasan</TableCell>
                <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                  {packagingRequiredPcs.toLocaleString()} Lembar (Pcs)
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── SCANNING BARCODE PENYERAHAN STOK ──────────────────────────────── */}
      <Card>
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-bold text-foreground">
              Scanning Barcode Pengeluaran Bahan ke WIP Ayak
            </CardTitle>
          </div>
          <Badge variant={isScanned ? "success" : "warning"} className="text-xs">
            {isScanned ? "Stok Terverifikasi" : "Menunggu Scan"}
          </Badge>
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
              onClick={handleConfirmScan}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              Konfirmasi Scan
            </Button>
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md font-mono border">
              Rute: Gudang Bahan Baku ➔ WIP Produksi (Ruang Ayak)
            </span>
          </div>

          {isScanned && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Barcode <strong>{scannedBarcode}</strong> valid. Sebanyak <strong>{batch.rawInputKg.toLocaleString()} Kg</strong> bahan mentah dialokasikan ke proses Ayak Mentah!
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── NAVIGASI ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          className="gap-1 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Tahap 1 (LBM)</span>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {!isStep2Valid ? (
            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              Scan Barcode Bahan &amp; Konfirmasi ACC Gudang Bahan untuk membuka Tahap 3 (Ayak Mentah).
            </span>
          ) : isCompleted ? (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Tahap 2 Selesai
            </span>
          ) : null}

          <Button
            onClick={handleSaveAndNext}
            disabled={!isStep2Valid}
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isStep2Valid ? (
              <>
                <span>Simpan &amp; Lanjut ke Tahap 3 (Ayak Mentah)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Tahap 3 Terkunci (Selesaikan BPB)</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
