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
  TableFooter,
} from "@/components/ui/table";
import {
  Scale,
  Package,
  Lock,
  Printer,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Building2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Database,
  ExternalLink,
} from "lucide-react";
import { ProductionBatchRecord, ScaleWeightRow } from "../_lib/production-flow-types";
import { procurementApi, PurchaseOrderItem } from "@/lib/api/procurement";
import { SupplierItem } from "@/lib/api/suppliers";
import { ProductItem } from "@/lib/api/products";

export interface Step1LBMInboundProps {
  batch: ProductionBatchRecord;
  purchaseOrders?: PurchaseOrderItem[];
  suppliers?: SupplierItem[];
  products?: ProductItem[];
  onUpdateBatch: (updates: Partial<ProductionBatchRecord>) => void;
  onNext: () => void;
  isCompleted: boolean;
}

export function Step1LBMInbound({
  batch,
  purchaseOrders = [],
  suppliers = [],
  products = [],
  onUpdateBatch,
  onNext,
  isCompleted,
}: Step1LBMInboundProps) {
  const [lbmNo, setLbmNo] = useState(batch.lbmNo || "");
  const [deliveryNoteNo, setDeliveryNoteNo] = useState(batch.deliveryNoteNo || "");
  const [packagingQty, setPackagingQty] = useState(
    batch.packagingQty || batch.fgOutputPcs || Math.max(1, Math.floor((batch.rawInputKg || 0) / 25))
  );

  // Toggle for re-selecting or changing linked PO
  const [isChangingPo, setIsChangingPo] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [dbSuccess, setDbSuccess] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  // Dynamic sample weights based on raw input weight or existing records
  const generateInitialWeights = (): ScaleWeightRow[] => {
    if (batch.scaleWeights && batch.scaleWeights.length > 0) {
      return batch.scaleWeights;
    }
    const avgNet = batch.rawInputKg && packagingQty ? Number((batch.rawInputKg / packagingQty).toFixed(2)) : 50.0;
    return [
      { gross: Number((avgNet + 0.15).toFixed(2)), tare: 0.15, net: avgNet },
      { gross: Number((avgNet + 0.13).toFixed(2)), tare: 0.15, net: Number((avgNet - 0.02).toFixed(2)) },
      { gross: Number((avgNet + 0.18).toFixed(2)), tare: 0.15, net: Number((avgNet + 0.03).toFixed(2)) },
    ];
  };

  const [scaleWeights, setScaleWeights] = useState<ScaleWeightRow[]>(generateInitialWeights);

  // Sync state if batch props change
  useEffect(() => {
    if (batch.lbmNo && !lbmNo) setLbmNo(batch.lbmNo);
    if (batch.deliveryNoteNo && !deliveryNoteNo) setDeliveryNoteNo(batch.deliveryNoteNo);
  }, [batch.lbmNo, batch.deliveryNoteNo, lbmNo, deliveryNoteNo]);

  // Load real GoodsReceipt details if lbmId is present
  useEffect(() => {
    let isMounted = true;
    async function fetchReceiptData() {
      if (!batch.lbmId) return;
      try {
        const res = await procurementApi.getGoodsReceiptById(batch.lbmId);
        if (!isMounted || !res?.data) return;
        const gr = res.data;
        if (gr.receiptNo) setLbmNo(gr.receiptNo);
        if (gr.deliveryNoteNo) setDeliveryNoteNo(gr.deliveryNoteNo);

        const firstLine = gr.lines?.[0];
        if (firstLine?.bagEntries && firstLine.bagEntries.length > 0) {
          const loadedRows: ScaleWeightRow[] = firstLine.bagEntries.slice(0, 5).map((entry: { weightActual: number | null }) => {
            const netW = entry.weightActual || 50.0;
            const tareW = gr.plasticTare || 0.15;
            return {
              gross: Number((netW + tareW).toFixed(2)),
              tare: tareW,
              net: netW,
            };
          });
          if (loadedRows.length > 0) {
            setScaleWeights(loadedRows);
          }
        }
      } catch {
        // Fallback silently to existing batch data
      }
    }
    fetchReceiptData();
    return () => {
      isMounted = false;
    };
  }, [batch.lbmId]);

  const totalSampleNet = scaleWeights.reduce((acc, curr) => acc + curr.net, 0);

  // Handler when selecting PO inside Step 1
  const handleSelectPO = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;

    // Match supplier code from master suppliers
    let suppCode = "VD";
    if (suppliers.length > 0) {
      const matched = suppliers.find((s) => s.id === po.supplierId || s.name === po.supplierName);
      if (matched) {
        suppCode = matched.batchCode || matched.code?.slice(-2)?.toUpperCase() || "VD";
      }
    } else if (po.supplierName) {
      suppCode = po.supplierName.slice(0, 2).toUpperCase();
    }

    // Match product & quantity from PO lines
    let prodId = "";
    let prodName = "Gula Kelapa Organik Granule";
    let prodCode = "GSO-001";
    let cert = "Organik Standar";
    let rawKg = batch.rawInputKg || 5000;

    if (po.lines && po.lines.length > 0) {
      const line = po.lines[0];
      prodId = line.productId;
      if (products.length > 0) {
        const matchedP = products.find((p) => p.id === line.productId);
        if (matchedP) {
          prodName = matchedP.name;
          prodCode = matchedP.sku;
          cert = matchedP.certifications || matchedP.organicType || "Organik Standar";
        }
      }
      if (line.quantity && line.quantity > 0) {
        rawKg = line.quantity;
      }
    }

    const currentBatchNo = batch.batchNo.includes(batch.supplierCode)
      ? batch.batchNo.replace(batch.supplierCode, suppCode)
      : `26N48${suppCode}001`;

    const datePart = new Date().toISOString().slice(0, 7).replace("-", "");
    const generatedLbm = lbmNo || `GD-007-LBM-${datePart}-001`;

    onUpdateBatch({
      poId: po.id,
      poNo: po.orderNo,
      supplierId: po.supplierId,
      supplier: po.supplierName,
      supplierCode: suppCode,
      productId: prodId,
      productName: prodName,
      productCode: prodCode,
      certification: cert,
      rawInputKg: rawKg,
      batchNo: currentBatchNo,
      lbmNo: generatedLbm,
    });

    if (!lbmNo) setLbmNo(generatedLbm);
    setIsChangingPo(false);
  };

  // Handler to create/sync goods receipt in the database
  const handleSaveLbmToDb = async () => {
    if (!batch.poId) {
      setDbError("Harap hubungkan batch ke Purchase Order (PO) terlebih dahulu sebelum menyimpan LBM ke database gudang.");
      return;
    }
    setIsSavingDb(true);
    setDbError(null);
    setDbSuccess(null);
    try {
      const res = await procurementApi.createGoodsReceipt({
        purchaseOrderId: batch.poId,
        deliveryNoteNo: deliveryNoteNo || `SJ-${batch.supplierCode || "SUP"}-${Date.now().toString().slice(-4)}`,
        receivedDate: batch.date || new Date().toISOString().slice(0, 10),
        notes: `Penerimaan LBM GD-007-LBM untuk Batch Produksi ${batch.batchNo} (${batch.productName})`,
        lines: [
          {
            productId: batch.productId || "",
            quantityReceived: packagingQty,
            weightNet: batch.rawInputKg,
            packageSize: 25,
          },
        ],
      });

      if (res?.data) {
        const newReceipt = res.data;
        onUpdateBatch({
          lbmId: newReceipt.id,
          lbmNo: newReceipt.receiptNo || lbmNo,
          deliveryNoteNo: newReceipt.deliveryNoteNo || deliveryNoteNo,
        });
        setLbmNo(newReceipt.receiptNo || lbmNo);
        setDbSuccess(`LBM berhasil dibuat di database Gudang! No Dokumen: ${newReceipt.receiptNo || lbmNo}`);
      } else {
        setDbSuccess("LBM berhasil disinkronkan secara lokal ke data batch operasional.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan LBM ke database";
      setDbError(msg);
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleAddSampleRow = () => {
    const avgNet = 50.0;
    setScaleWeights((prev) => [
      ...prev,
      { gross: Number((avgNet + 0.15).toFixed(2)), tare: 0.15, net: avgNet },
    ]);
  };

  const handleUpdateSampleRow = (index: number, gross: number, tare: number) => {
    setScaleWeights((prev) => {
      const next = [...prev];
      const net = Math.max(0, Number((gross - tare).toFixed(2)));
      next[index] = { gross, tare, net };
      return next;
    });
  };

  const handleRemoveSampleRow = (index: number) => {
    if (scaleWeights.length <= 1) return;
    setScaleWeights((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePrintLBM = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tanda Terima Supplier - ${lbmNo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 25px; color: #111; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 16px; font-weight: bold; margin: 0; }
          .badge { border: 1px solid #000; padding: 4px 8px; font-size: 12px; font-weight: bold; }
          .confidential { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 8px; font-size: 11px; margin-bottom: 15px; text-align: center; font-weight: bold; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f2f2f2; }
          .signatures { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; font-size: 12px; }
          .sig-box { width: 40%; }
          .sig-space { height: 60px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">CV. MANNA ANUGERAH SEJAHTERA</div>
            <div style="font-size: 12px; color: #555;">Gudang Bahan Baku & Penerimaan Inbound</div>
          </div>
          <div class="badge">FORM: GD-007-LBM</div>
        </div>
        <div class="confidential">
          DOKUMEN OPERASIONAL: INFORMASI HARGA PEMBELIAN DIRAHASIAKAN (CONFIDENTIAL PRICING)
        </div>
        <div class="meta-grid">
          <div><strong>Nomor Referensi PO:</strong> ${batch.poNo || "-"}</div>
          <div><strong>Nomor Dokumen LBM:</strong> ${lbmNo}</div>
          <div><strong>No Surat Jalan Supplier:</strong> ${deliveryNoteNo || "-"}</div>
          <div><strong>Nomor Batch / Lot:</strong> ${batch.batchNo}</div>
          <div><strong>Pemasok (Vendor):</strong> ${batch.supplier} (${batch.supplierCode})</div>
          <div><strong>Komoditas:</strong> ${batch.productName} (${batch.certification})</div>
          <div><strong>Tanggal Masuk Gudang:</strong> ${batch.date}</div>
          <div><strong>Total Penerimaan Real:</strong> ${batch.rawInputKg.toLocaleString()} Kg (${packagingQty} Sak Kraft)</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Sampel Kantong</th>
              <th>Bruto (Kg)</th>
              <th>Tara (Kg)</th>
              <th>Netto (Kg)</th>
              <th>Lot Barcode ID</th>
            </tr>
          </thead>
          <tbody>
            ${scaleWeights
              .map(
                (w, i) => `
              <tr>
                <td>Kantong #${i + 1}</td>
                <td>${w.gross.toFixed(2)}</td>
                <td>${w.tare.toFixed(2)}</td>
                <td><strong>${w.net.toFixed(2)}</strong></td>
                <td>LOT-${batch.date.replace(/-/g, "").slice(0, 6)}-${String(i + 1).padStart(3, "0")}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #fafafa;">
              <td colspan="3" style="text-align: right;">Total Sampel Ditimbang:</td>
              <td>${totalSampleNet.toFixed(2)} Kg</td>
              <td>Total Realisasi Penerimaan: ${batch.rawInputKg.toLocaleString()} Kg</td>
            </tr>
          </tfoot>
        </table>
        <div class="signatures">
          <div class="sig-box">
            <div>Pengemudi / Pemasok</div>
            <div class="sig-space"></div>
            <div>( .................................... )</div>
          </div>
          <div class="sig-box">
            <div>Penerima (Staf Gudang Bahan Baku)</div>
            <div class="sig-space"></div>
            <div>( .................................... )</div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  const handleSaveAndNext = () => {
    onUpdateBatch({
      lbmNo,
      deliveryNoteNo,
      packagingQty,
      scaleWeights,
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* ─── KARTU UTAMA: REFERENSI PURCHASE ORDER (PO) & VENDOR ─────────────── */}
      <Card className="border-2 border-blue-200 bg-blue-50/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-blue-700 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                  Referensi Purchase Order (PO) &amp; Pemasok
                  {batch.poNo ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] hover:bg-emerald-700">
                      PO Terhubung: {batch.poNo}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-400 text-amber-800 text-[10px]">
                      Belum Terhubung PO
                    </Badge>
                  )}
                </h4>
                <p className="text-xs text-blue-800/80">
                  Setiap penerimaan barang masuk Gudang (LBM) diawali dari referensi PO agar vendor, komoditas, dan estimasi kuantitas terpetakan otomatis.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {batch.poNo && !isChangingPo ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangingPo(true)}
                  className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Ganti Referensi PO
                </Button>
              ) : null}
            </div>
          </div>

          {/* PO Selector (Shown if no PO or changing PO) */}
          {(!batch.poNo || isChangingPo) ? (
            <div className="bg-white p-3 rounded-lg border border-blue-200 space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Pilih Purchase Order (PO) Pengadaan:</span>
                {isChangingPo && (
                  <button
                    onClick={() => setIsChangingPo(false)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline"
                  >
                    Batal Ganti
                  </button>
                )}
              </label>

              {purchaseOrders.length > 0 ? (
                <select
                  value={batch.poId || ""}
                  onChange={(e) => handleSelectPO(e.target.value)}
                  className="w-full border border-blue-300 rounded-md px-3 py-2 text-xs bg-background text-foreground font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Purchase Order dari Pengadaan --</option>
                  {purchaseOrders.map((po) => {
                    const lineQty = po.lines?.[0]?.quantity ? `${po.lines[0].quantity.toLocaleString()} Kg` : "Tanpa Line";
                    return (
                      <option key={po.id} value={po.id}>
                        [{po.orderNo}] {po.supplierName} — {lineQty} (Tgl: {po.orderDate || po.createdAt?.slice(0, 10)})
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    Belum ada data Purchase Order aktif di modul Pengadaan. Silakan buat PO baru di modul Pengadaan atau gunakan mode manual.
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Linked PO Summary Grid */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-white/80 p-3 rounded-lg border border-blue-100">
              <div>
                <span className="text-muted-foreground block text-[11px]">Nomor Purchase Order:</span>
                <span className="font-mono font-bold text-blue-900">{batch.poNo}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Pemasok (Vendor):</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-slate-500" />
                  {batch.supplier} ({batch.supplierCode})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Bahan Baku:</span>
                <span className="font-semibold text-foreground">
                  {batch.productName} ({batch.certification})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Kuantitas Dipesan:</span>
                <span className="font-mono font-bold text-foreground">
                  {batch.rawInputKg.toLocaleString()} Kg
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── DOKUMEN INBOUND & SURAT JALAN ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-foreground">
            Nomor Dokumen LBM <span className="text-red-500">*</span>
          </label>
          <Input
            value={lbmNo}
            onChange={(e) => setLbmNo(e.target.value)}
            className="font-mono text-sm mt-1 font-bold"
            placeholder="GD-007-LBM-202611-001"
          />
          <p className="text-[11px] text-muted-foreground mt-0.5">Format standar: GD-007-LBM-YYYYMM-XXX</p>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">
            Nomor Surat Jalan Supplier <span className="text-red-500">*</span>
          </label>
          <Input
            value={deliveryNoteNo}
            onChange={(e) => setDeliveryNoteNo(e.target.value)}
            className="font-mono text-sm mt-1"
            placeholder="Contoh: SJ-PW-8819"
          />
          <p className="text-[11px] text-muted-foreground mt-0.5">Dokumen fisik pengantar dari supir / vendor</p>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Pemasok Bahan (Vendor)</label>
          <Input
            value={`${batch.supplier || "-"} (${batch.supplierCode || "-"})`}
            disabled
            className="bg-muted text-sm mt-1 font-semibold text-foreground"
          />
          <p className="text-[11px] text-muted-foreground mt-0.5">Ditarik dari Purchase Order (PO)</p>
        </div>
      </div>

      {/* ─── TIMBANGAN PRESISI 2 DESIMAL (TABLE COMPONENT) ───────────────────── */}
      <Card className="border border-border">
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Pencatatan Timbangan Digital Presisi 2 Desimal (Inbound Bahan Baku)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Sesuai SOP Gudang CV. Manna Anugerah Sejahtera dengan potongan tara sak standar (0.15 Kg).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              GD-007-LBM
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddSampleRow}
              className="text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-3 w-3" /> Tambah Baris Kantong
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">No Kantong</TableHead>
                <TableHead className="w-36">Berat Bruto (Kg)</TableHead>
                <TableHead className="w-36">Tara Karung (Kg)</TableHead>
                <TableHead className="w-40">Netto Diterima (Kg)</TableHead>
                <TableHead>Auto Barcode ID</TableHead>
                <TableHead className="w-16 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scaleWeights.map((w, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-xs">Kantong #{i + 1}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={w.gross}
                      onChange={(e) => handleUpdateSampleRow(i, Number(e.target.value), w.tare)}
                      className="font-mono text-xs h-8 w-28"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={w.tare}
                      onChange={(e) => handleUpdateSampleRow(i, w.gross, Number(e.target.value))}
                      className="font-mono text-xs h-8 w-28"
                    />
                  </TableCell>
                  <TableCell className="font-mono font-bold text-emerald-700 text-xs">
                    {w.net.toFixed(2)} Kg
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    [LOT-{batch.date.replace(/-/g, "").slice(0, 6)}-{String(i + 1).padStart(3, "0")}] - {w.net.toFixed(2)} Kg
                  </TableCell>
                  <TableCell className="text-center">
                    {scaleWeights.length > 1 && (
                      <button
                        onClick={() => handleRemoveSampleRow(i)}
                        className="text-muted-foreground hover:text-red-600 p-1 rounded"
                        title="Hapus baris"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-bold text-xs">
                  Total Sampel Timbang:
                </TableCell>
                <TableCell className="font-mono font-bold text-emerald-700 text-xs">
                  {totalSampleNet.toFixed(2)} Kg
                </TableCell>
                <TableCell colSpan={2} className="text-muted-foreground text-xs font-semibold">
                  Total Realisasi Penerimaan: {batch.rawInputKg.toLocaleString()} Kg
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* ─── KEMASAN SAK, SINKRONISASI DATABASE & CETAK LBM ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kemasan Sak Kraft */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              <h5 className="text-xs font-bold text-foreground">
                Penerimaan Kemasan Sak Kraft (Bebas Timbang)
              </h5>
            </div>
            <p className="text-xs text-muted-foreground">
              Barang kemasan dihitung per lembar (Pcs) sak kraft 25 Kg tanpa mewajibkan timbangan.
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

        {/* Database & Slip Print Action */}
        <Card className="border border-slate-200">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-rose-600" />
                <h5 className="text-xs font-bold text-foreground">
                  Dokumen Operasional GD-007-LBM
                </h5>
              </div>
              <Badge variant="destructive" className="text-[10px]">Confidential Pricing</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Harga pembelian dirahasiakan dari dokumen supir dan staf timbang gudang.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintLBM}
                className="gap-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Slip Tanda Terima (GD-007-LBM)
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveLbmToDb}
                disabled={isSavingDb}
                className="gap-2 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              >
                <Database className="h-3.5 w-3.5" />
                {isSavingDb ? "Menyimpan ke Gudang..." : batch.lbmId ? "Perbarui di DB Gudang" : "Simpan LBM ke DB Gudang"}
              </Button>
            </div>

            {dbSuccess && (
              <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded flex items-center gap-1.5 mt-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>{dbSuccess}</span>
              </div>
            )}

            {dbError && (
              <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 p-2 rounded flex items-center gap-1.5 mt-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                <span>{dbError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── FOOTER NAVIGASI ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          {isCompleted && (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Tahap 1 Selesai &amp; Stok Masuk SBB
            </span>
          )}
        </div>
        <Button
          onClick={handleSaveAndNext}
          className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          <span>Simpan &amp; Lanjut ke Tahap 2 (BPB)</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
