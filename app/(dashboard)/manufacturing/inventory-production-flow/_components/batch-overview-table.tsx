"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, ArrowRight, CheckCircle2, Clock, AlertCircle, Building2, Package, Users } from "lucide-react";
import { ProductionBatchRecord, PRODUCTION_STEPS } from "../_lib/production-flow-types";
import { SupplierItem } from "@/lib/api/suppliers";
import { ProductItem } from "@/lib/api/products";
import { CustomerItem } from "@/lib/api/customers";
import { GoodsReceiptItem, PurchaseOrderItem } from "@/lib/api/procurement";

interface BatchOverviewTableProps {
  batches: ProductionBatchRecord[];
  purchaseOrders?: PurchaseOrderItem[];
  suppliers?: SupplierItem[];
  products?: ProductItem[];
  customers?: CustomerItem[];
  goodsReceipts?: GoodsReceiptItem[];
  onOpenWizard: (batchId: string, stageNum?: number) => void;
  onCreateBatch: (newBatch: Partial<ProductionBatchRecord>) => void;
}

export function BatchOverviewTable({
  batches,
  purchaseOrders = [],
  suppliers = [],
  products = [],
  customers = [],
  goodsReceipts = [],
  onOpenWizard,
  onCreateBatch,
}: BatchOverviewTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Mode inisiasi: PO (default), LBM, atau manual
  const [initiationMode, setInitiationMode] = useState<"po" | "lbm" | "manual">("po");

  // Form state for creating batch
  const [formPoId, setFormPoId] = useState("");
  const [formPoNo, setFormPoNo] = useState("");
  const [formBatchNo, setFormBatchNo] = useState("");
  const [formSupplierId, setFormSupplierId] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formSupplierCode, setFormSupplierCode] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formProductName, setFormProductName] = useState("");
  const [formProductCode, setFormProductCode] = useState("");
  const [formBuyerId, setFormBuyerId] = useState("");
  const [formBuyerName, setFormBuyerName] = useState("");
  const [formLbmId, setFormLbmId] = useState("");
  const [formLbmNo, setFormLbmNo] = useState("");
  const [formDeliveryNoteNo, setFormDeliveryNoteNo] = useState("");
  const [formCertification, setFormCertification] = useState("Organik Standar");
  const [formFairtrade, setFormFairtrade] = useState("FAIRTRADE");
  const [formRawKg, setFormRawKg] = useState(20000);

  const handlePurchaseOrderSelect = (poId: string) => {
    setFormPoId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      setFormPoNo(po.orderNo);
      setFormSupplierId(po.supplierId);
      setFormSupplier(po.supplierName);

      // Match supplier code from suppliers master
      const supp = suppliers.find((s) => s.id === po.supplierId || s.name === po.supplierName);
      const code = supp?.batchCode || supp?.code?.slice(-2)?.toUpperCase() || "VD";
      setFormSupplierCode(code);
      const seq = String(batches.length + 1).padStart(3, "0");
      setFormBatchNo(`26N48${code}${seq}`);

      // Auto-populate from PO line item
      if (po.lines && po.lines.length > 0) {
        const line = po.lines[0];
        setFormProductId(line.productId);
        const prod = products.find((p) => p.id === line.productId);
        if (prod) {
          setFormProductName(prod.name);
          setFormProductCode(prod.sku);
          setFormCertification(prod.certifications || prod.organicType || "Organik Standar");
        }
        if (line.quantity && line.quantity > 0) {
          setFormRawKg(line.quantity);
        }
      }

      // Generate suggested LBM number based on date and seq
      const datePart = new Date().toISOString().slice(0, 7).replace("-", "");
      setFormLbmNo(`GD-007-LBM-${datePart}-${seq}`);
    }
  };

  // Initialize form defaults when opening modal or when master data arrives
  useEffect(() => {
    if (isCreateModalOpen) {
      if (purchaseOrders.length > 0) {
        setInitiationMode("po");
        handlePurchaseOrderSelect(purchaseOrders[0].id);
      } else {
        const defaultSupplier = suppliers[0];
        const defaultProduct = products[0];
        const defaultCustomer = customers[0];

        const suppCode = defaultSupplier?.batchCode || defaultSupplier?.code?.slice(-2)?.toUpperCase() || "VD";
        const suppName = defaultSupplier?.name || "";
        const prodName = defaultProduct?.name || "";
        const prodCode = defaultProduct?.sku || "";
        const cert = defaultProduct?.certifications || defaultProduct?.organicType || "Organik Standar";
        const buyer = defaultCustomer?.name || "";

        setFormSupplierId(defaultSupplier?.id || "");
        setFormSupplier(suppName);
        setFormSupplierCode(suppCode);
        setFormProductId(defaultProduct?.id || "");
        setFormProductName(prodName);
        setFormProductCode(prodCode);
        setFormCertification(cert);
        setFormBuyerId(defaultCustomer?.id || "");
        setFormBuyerName(buyer);

        const seq = String(batches.length + 1).padStart(3, "0");
        setFormBatchNo(`26N48${suppCode}${seq}`);
        setFormLbmNo(`GD-007-LBM-${new Date().toISOString().slice(0, 7).replace("-", "")}-${seq}`);
      }
    }
  }, [isCreateModalOpen, purchaseOrders, suppliers, products, customers, batches.length]);

  const handleSupplierSelect = (supplierId: string) => {
    setFormSupplierId(supplierId);
    const found = suppliers.find((s) => s.id === supplierId);
    if (found) {
      const code = found.batchCode || found.code?.slice(-2)?.toUpperCase() || "VD";
      setFormSupplier(found.name);
      setFormSupplierCode(code);
      const seq = String(batches.length + 1).padStart(3, "0");
      setFormBatchNo(`26N48${code}${seq}`);
    }
  };

  const handleProductSelect = (productId: string) => {
    setFormProductId(productId);
    const found = products.find((p) => p.id === productId);
    if (found) {
      setFormProductName(found.name);
      setFormProductCode(found.sku);
      if (found.certifications || found.organicType) {
        setFormCertification(found.certifications || found.organicType || "Organik Standar");
      }
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    setFormBuyerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setFormBuyerName(found.name);
    }
  };

  const handleGoodsReceiptSelect = (receiptId: string) => {
    setFormLbmId(receiptId);
    const found = goodsReceipts.find((r) => r.id === receiptId);
    if (found) {
      setFormLbmNo(found.receiptNo);
      if (found.deliveryNoteNo) {
        setFormDeliveryNoteNo(found.deliveryNoteNo);
      }
      if (found.lines && found.lines.length > 0) {
        const line = found.lines[0];
        const lineProd = products.find((p) => p.id === line.productId);
        if (lineProd) {
          handleProductSelect(lineProd.id);
        }
        if (line.weightNet && line.weightNet > 0) {
          setFormRawKg(line.weightNet);
        }
      }
    }
  };

  const filteredBatches = batches.filter((b) => {
    const matchSearch =
      b.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.lbmNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const plannedSak = Math.floor(formRawKg / 25);
    const plannedFGKg = plannedSak * 25;

    onCreateBatch({
      batchNo: formBatchNo,
      poId: formPoId,
      poNo: formPoNo,
      supplierId: formSupplierId,
      supplier: formSupplier,
      supplierCode: formSupplierCode,
      productId: formProductId,
      productName: formProductName,
      productCode: formProductCode,
      buyerId: formBuyerId,
      buyerName: formBuyerName,
      lbmId: formLbmId,
      lbmNo: formLbmNo || `LBM-${new Date().toISOString().slice(0, 7).replace("-", "")}-${String(batches.length + 1).padStart(3, "0")}`,
      deliveryNoteNo: formDeliveryNoteNo,
      certification: formCertification,
      fairtradeStatus: formFairtrade,
      rawInputKg: formRawKg,
      fgOutputPcs: plannedSak,
      fgOutputKg: plannedFGKg,
      palletCount: Math.ceil(plannedSak / 40),
      currentStage: 1,
      completedStages: [],
      status: "in_progress",
    });

    setIsCreateModalOpen(false);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "final":
        return (
          <Badge variant="success" className="gap-1 text-[11px] font-semibold">
            <CheckCircle2 className="h-3 w-3" /> LST Final (FG)
          </Badge>
        );
      case "handover_ready":
        return (
          <Badge variant="warning" className="gap-1 text-[11px] font-semibold">
            <Clock className="h-3 w-3" /> Siap Serah Terima
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border-blue-200">
            <AlertCircle className="h-3 w-3" /> Sedang Diproses
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className="border border-border shadow-xs">
        <CardHeader className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Pipeline Kendali Batch (LBM ➔ LST)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Pantau siklus lengkap setiap lot mulai dari timbang terima gudang, kendali proses QC, hingga serah terima WMS FG.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Cari Batch, Produk, Supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs w-60"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter status batch"
              className="text-xs border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground"
            >
              <option value="all">Semua Status</option>
              <option value="in_progress">Sedang Diproses</option>
              <option value="handover_ready">Siap Serah Terima</option>
              <option value="final">Final / Selesai</option>
            </select>

            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Buat Batch Baru
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-36">Nomor Batch</TableHead>
                <TableHead>Produk & Standar</TableHead>
                <TableHead>Pemasok Bahan</TableHead>
                <TableHead className="text-right">Bahan Masuk</TableHead>
                <TableHead className="text-right">Hasil Jadi (FG)</TableHead>
                <TableHead className="text-center w-48">Tahap Berjalan</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                    Tidak ada batch yang sesuai dengan kriteria pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBatches.map((batch) => {
                  const currentDef = PRODUCTION_STEPS.find((s) => s.id === batch.currentStage) || PRODUCTION_STEPS[0];
                  return (
                    <TableRow key={batch.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-blue-900 text-xs">
                        {batch.batchNo}
                        <div className="flex flex-wrap items-center gap-1 mt-0.5 font-normal">
                          {batch.poNo ? (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono text-blue-800 bg-blue-50 border-blue-200">
                              PO: {batch.poNo}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 text-slate-500">
                              Non-PO
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{batch.lbmNo}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <span className="font-semibold text-foreground block">{batch.productName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {batch.certification}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {batch.fairtradeStatus}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{batch.supplier}</span>
                        <span className="text-[10px] block font-mono">Kode: {batch.supplierCode} | {batch.lbmNo}</span>
                      </TableCell>

                      <TableCell className="text-xs text-right font-mono font-semibold">
                        {batch.rawInputKg.toLocaleString()} Kg
                      </TableCell>

                      <TableCell className="text-xs text-right font-mono">
                        <span className="font-bold text-emerald-700 block">
                          {batch.fgOutputKg.toLocaleString()} Kg
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {batch.fgOutputPcs} Sak (@ 25kg)
                        </span>
                      </TableCell>

                      <TableCell className="text-center text-xs">
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-2 py-1 rounded-md text-[11px] font-semibold">
                          <span>Tahap {batch.currentStage}/10:</span>
                          <span className="truncate max-w-[120px]">{currentDef.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                          {currentDef.docCode}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        {renderStatusBadge(batch.status)}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenWizard(batch.id, batch.currentStage)}
                          className="gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
                        >
                          <span>Buka Kendali</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL BUAT BATCH BARU */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Inisiasi Batch Produksi Baru</DialogTitle>
            <DialogDescription className="text-xs">
              Buat batch baru yang terhubung ke dokumen penerimaan bahan LBM (GD-007-LBM).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2 text-xs">
            {/* Tab Pilihan Mode Inisiasi */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground block">Metode Referensi Inisiasi Batch:</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setInitiationMode("po")}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                    initiationMode === "po"
                      ? "bg-white text-blue-900 shadow-xs border border-blue-200"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  1. Purchase Order (PO)
                </button>
                <button
                  type="button"
                  onClick={() => setInitiationMode("lbm")}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                    initiationMode === "lbm"
                      ? "bg-white text-blue-900 shadow-xs border border-blue-200"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  2. Dokumen LBM
                </button>
                <button
                  type="button"
                  onClick={() => setInitiationMode("manual")}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                    initiationMode === "manual"
                      ? "bg-white text-blue-900 shadow-xs border border-blue-200"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  3. Non-PO / Manual
                </button>
              </div>
            </div>

            {/* MODE 1: DARI PURCHASE ORDER (PO) */}
            {initiationMode === "po" && (
              <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                    <Building2 className="h-4 w-4 text-blue-700" />
                    Pilih Dokumen Purchase Order (PO) Bahan Baku <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-semibold">{purchaseOrders.length} PO Terdaftar</span>
                </div>
                {purchaseOrders.length > 0 ? (
                  <select
                    value={formPoId}
                    onChange={(e) => handlePurchaseOrderSelect(e.target.value)}
                    className="w-full border-2 border-blue-300 focus:border-blue-600 rounded-md px-2.5 py-2 text-xs bg-white text-foreground font-semibold"
                    required
                  >
                    <option value="">-- Pilih Purchase Order Aktif --</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.orderNo} — {po.supplierName} ({po.lines?.reduce((a, b) => a + (b.quantity || 0), 0).toLocaleString()} Kg) [{po.status.toUpperCase()}]
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    Belum ada Purchase Order aktif di modul Procurement. Silakan buat PO di menu Procurement atau pilih mode Manual.
                  </div>
                )}
                <p className="text-[11px] text-blue-800">
                  Memilih PO akan otomatis menentukan <strong>Pemasok (Vendor)</strong>, <strong>Kode Pemasok</strong>, <strong>Komoditas</strong>, dan <strong>Target Berat Masuk</strong>.
                </p>
              </div>
            )}

            {/* MODE 2: DARI DOKUMEN LBM YANG SUDAH DITERIMA DI GUDANG */}
            {initiationMode === "lbm" && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2">
                <label className="font-bold text-foreground block text-xs">
                  Pilih Dokumen LBM Inbound Gudang (GD-007-LBM)
                </label>
                {goodsReceipts.length > 0 ? (
                  <select
                    value={formLbmId}
                    onChange={(e) => handleGoodsReceiptSelect(e.target.value)}
                    className="w-full border border-input rounded-md px-2.5 py-2 text-xs bg-white text-foreground"
                  >
                    <option value="">-- Pilih dari Penerimaan LBM Gudang --</option>
                    {goodsReceipts.map((gr) => (
                      <option key={gr.id} value={gr.id}>
                        {gr.receiptNo} {gr.deliveryNoteNo ? `(SJ: ${gr.deliveryNoteNo})` : ""} - {gr.receivedDate?.slice(0, 10)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Belum ada penerimaan LBM di sistem.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">Nomor Dokumen LBM</label>
                <Input
                  value={formLbmNo}
                  onChange={(e) => setFormLbmNo(e.target.value)}
                  className="font-mono text-xs font-bold"
                  placeholder="GD-007-LBM-202611-001"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Nomor Surat Jalan Supplier</label>
                <Input
                  value={formDeliveryNoteNo}
                  onChange={(e) => setFormDeliveryNoteNo(e.target.value)}
                  className="font-mono text-xs"
                  placeholder="Contoh: SJ-PW-8819"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">Nomor Batch (Lot Produksi)</label>
                <Input
                  value={formBatchNo}
                  onChange={(e) => setFormBatchNo(e.target.value)}
                  className="font-mono text-xs font-bold"
                  placeholder="Contoh: 26N48PW001"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Kode Pemasok (2 Huruf Prefix)</label>
                <Input
                  value={formSupplierCode}
                  onChange={(e) => {
                    const c = e.target.value.toUpperCase();
                    setFormSupplierCode(c);
                    const seq = String(batches.length + 1).padStart(3, "0");
                    setFormBatchNo(`26N48${c}${seq}`);
                  }}
                  maxLength={4}
                  className="font-mono text-xs uppercase"
                  placeholder="PW"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Pemasok Bahan Baku</label>
              {suppliers.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={formSupplierId}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                    className="w-full border border-input rounded-md px-2.5 py-1.5 text-xs bg-background text-foreground"
                  >
                    <option value="">-- Pilih Pemasok Terdaftar --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.batchCode || s.code})
                      </option>
                    ))}
                  </select>
                  <Input
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="Nama Pemasok"
                    className="text-xs"
                    required
                  />
                </div>
              ) : (
                <Input
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  placeholder="Nama Pemasok / Kelompok Tani"
                  className="text-xs"
                  required
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">Produk Jadi (FG)</label>
                {products.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={formProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full border border-input rounded-md px-2.5 py-1.5 text-xs bg-background text-foreground"
                    >
                      <option value="">-- Pilih Produk Master --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                    <Input
                      value={formProductName}
                      onChange={(e) => setFormProductName(e.target.value)}
                      placeholder="Nama Produk"
                      className="text-xs"
                      required
                    />
                  </div>
                ) : (
                  <Input
                    value={formProductName}
                    onChange={(e) => setFormProductName(e.target.value)}
                    placeholder="Nama Produk Jadi"
                    className="text-xs"
                    required
                  />
                )}
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Kode SKU Produk</label>
                <Input
                  value={formProductCode}
                  onChange={(e) => setFormProductCode(e.target.value)}
                  className="font-mono text-xs"
                  placeholder="SKU-001"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Buyer / Pelanggan (Tujuan Ekspor / LST)</label>
              {customers.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={formBuyerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full border border-input rounded-md px-2.5 py-1.5 text-xs bg-background text-foreground"
                  >
                    <option value="">-- Pilih Buyer / Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code} - {c.customerType})
                      </option>
                    ))}
                  </select>
                  <Input
                    value={formBuyerName}
                    onChange={(e) => setFormBuyerName(e.target.value)}
                    placeholder="Nama Buyer / Pembeli"
                    className="text-xs"
                  />
                </div>
              ) : (
                <Input
                  value={formBuyerName}
                  onChange={(e) => setFormBuyerName(e.target.value)}
                  placeholder="Nama Buyer / Kontrak Pembelian"
                  className="text-xs"
                />
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">Input Bahan Baku (Kg)</label>
                <Input
                  type="number"
                  value={formRawKg}
                  onChange={(e) => setFormRawKg(Number(e.target.value))}
                  className="font-mono text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Sertifikasi Mutu</label>
                <Input
                  value={formCertification}
                  onChange={(e) => setFormCertification(e.target.value)}
                  className="text-xs"
                  placeholder="Contoh: Organik EU & USDA"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Status Fairtrade</label>
                <select
                  value={formFairtrade}
                  onChange={(e) => setFormFairtrade(e.target.value)}
                  aria-label="Status Fairtrade"
                  className="w-full border border-input rounded-md px-2 py-1.5 text-xs bg-background"
                >
                  <option value="FAIRTRADE">FAIRTRADE</option>
                  <option value="NON FAIRTRADE">NON FAIRTRADE</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Buat &amp; Buka Wizard
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
