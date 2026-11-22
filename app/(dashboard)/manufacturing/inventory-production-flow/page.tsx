"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Factory,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";

import {
  ProductionBatchRecord,
  PRODUCTION_STEPS,
  INITIAL_BATCHES,
} from "./_lib/production-flow-types";
import { BatchKPICards } from "./_components/batch-kpi-cards";
import { BatchOverviewTable } from "./_components/batch-overview-table";
import { StepSidebar } from "./_components/step-sidebar";

import { Step1LBMInbound } from "./_components/step-1-lbm-inbound";
import { Step2BPBRequisition } from "./_components/step-2-bpb-requisition";
import { Step3SievingRaw } from "./_components/step-3-sieving-raw";
import { Step4MoistureOven } from "./_components/step-4-moisture-oven";
import { Step5SievingCooked } from "./_components/step-5-sieving-cooked";
import { Step6PackingScale } from "./_components/step-6-packing-scale";
import { Step7MetalDetector } from "./_components/step-7-metal-detector";
import { Step8QCFinished } from "./_components/step-8-qc-finished";
import { Step9LHPSerials } from "./_components/step-9-lhp-serials";
import { Step10LSTHandover } from "./_components/step-10-lst-handover";

import { manufacturingApi } from "@/lib/api/manufacturing";
import { procurementApi, GoodsReceiptItem, PurchaseOrderItem } from "@/lib/api/procurement";
import { suppliersApi, SupplierItem } from "@/lib/api/suppliers";
import { productsApi, ProductItem } from "@/lib/api/products";
import { customersApi, CustomerItem } from "@/lib/api/customers";
import { rawMaterialStockApi, RawMaterialStockItem } from "@/lib/api/raw-material-stock";

export default function InventoryProductionFlowPage() {
  const [batches, setBatches] = useState<ProductionBatchRecord[]>(INITIAL_BATCHES);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"overview" | "wizard">("overview");
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Master data state from real backend APIs
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptItem[]>([]);
  const [rawStocks, setRawStocks] = useState<RawMaterialStockItem[]>([]);

  // Load real batches & master data dynamically from backend
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      try {
        const [
          ordersRes,
          lstRes,
          reqRes,
          suppliersRes,
          productsRes,
          customersRes,
          receiptsRes,
          rawStockRes,
          posRes,
        ] = await Promise.allSettled([
          manufacturingApi.listProductionOrders(),
          manufacturingApi.listLST(),
          manufacturingApi.listRequisitions(),
          suppliersApi.list({ perPage: 100 }),
          productsApi.list({ perPage: 100 }),
          customersApi.list({ perPage: 100 }),
          procurementApi.listGoodsReceipts({ perPage: 100 }),
          rawMaterialStockApi.list(),
          procurementApi.listPurchaseOrders({ perPage: 100 }),
        ]);

        if (!isMounted) return;

        const loadedOrders = ordersRes.status === "fulfilled" && ordersRes.value?.data ? ordersRes.value.data : [];
        const loadedLST = lstRes.status === "fulfilled" && lstRes.value?.data ? lstRes.value.data : [];
        const loadedReqs = reqRes.status === "fulfilled" && reqRes.value?.data ? reqRes.value.data : [];
        const loadedSuppliers = suppliersRes.status === "fulfilled" && suppliersRes.value?.data ? suppliersRes.value.data : [];
        const loadedProducts = productsRes.status === "fulfilled" && productsRes.value?.data ? productsRes.value.data : [];
        const loadedCustomers = customersRes.status === "fulfilled" && customersRes.value?.data ? customersRes.value.data : [];
        const loadedReceipts = receiptsRes.status === "fulfilled" && receiptsRes.value?.data ? receiptsRes.value.data : [];
        const loadedRawStocks = rawStockRes.status === "fulfilled" && rawStockRes.value?.data ? rawStockRes.value.data : [];
        const loadedPOs = posRes.status === "fulfilled" && posRes.value?.data ? posRes.value.data : [];

        setPurchaseOrders(loadedPOs);
        setSuppliers(loadedSuppliers);
        setProducts(loadedProducts);
        setCustomers(loadedCustomers);
        setGoodsReceipts(loadedReceipts);
        setRawStocks(loadedRawStocks);

        const mappedBatches: ProductionBatchRecord[] = [];

        // 1. Map from existing production orders
        if (loadedOrders.length > 0) {
          loadedOrders.forEach((o, idx) => {
            const relatedLST = loadedLST.find((l) =>
              l.items?.some((it) => it.batchNo === o.orderNumber)
            );
            const relatedReq = loadedReqs.find((r) =>
              r.productionOrderId === o.id || r.orderNumber === o.orderNumber
            );

            // Match product
            const matchedProduct = loadedProducts.find(
              (p) => p.id === o.productId || p.sku === o.productSku
            );
            const prodName = matchedProduct?.name || o.productName || "Gula Semut Organik";
            const prodSku = matchedProduct?.sku || o.productSku || "SKU-001";
            const cert =
              matchedProduct?.certifications ||
              matchedProduct?.organicType ||
              "Organik Standar";

            // Match stock and supplier
            const matchedStock = loadedRawStocks.find(
              (s: RawMaterialStockItem) => s.productId === o.productId
            );
            const matchedReceipt = loadedReceipts.find(
              (r) =>
                r.id === matchedStock?.goodsReceiptId ||
                r.lines?.some((l) => l.productId === o.productId)
            );
            const matchedPO = loadedPOs.find(
              (po) =>
                po.id === matchedReceipt?.purchaseOrderId ||
                po.orderNo === matchedStock?.poNo ||
                po.orderNo === o.orderNumber
            );
            const matchedSupplier = loadedSuppliers.find(
              (s) =>
                s.id === matchedStock?.supplierId ||
                s.name === matchedStock?.supplierName ||
                s.name === matchedPO?.supplierName
            );

            const suppName =
              matchedStock?.supplierName ||
              matchedPO?.supplierName ||
              matchedSupplier?.name ||
              (loadedSuppliers[0]?.name ?? "Pemasok Terdaftar");
            const suppCode =
              matchedSupplier?.batchCode ||
              matchedSupplier?.code?.slice(-2)?.toUpperCase() ||
              (loadedSuppliers[0]?.batchCode ?? "VD");

            const buyer =
              loadedCustomers.find((c) => c.customerType === "B2B") ||
              loadedCustomers[0];
            const buyerName = buyer?.name || "Buyer Ekspor";

            const completedCount =
              o.steps?.filter((s) => s.status === "done").length || 0;
            const completedStages = Array.from(
              { length: completedCount },
              (_, i) => i + 1
            );
            const currentStage = Math.min(10, Math.max(1, completedCount + 1));

            mappedBatches.push({
              id: o.id,
              productionOrderId: o.id,
              orderNumber: o.orderNumber,
              batchNo: o.orderNumber || `26N48${suppCode}${String(idx + 1).padStart(3, "0")}`,
              date: o.plannedDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              productId: matchedProduct?.id || o.productId,
              productName: prodName,
              productCode: prodSku,
              supplierId: matchedSupplier?.id,
              supplier: suppName,
              supplierCode: suppCode,
              poId: matchedPO?.id,
              poNo: matchedPO?.orderNo,
              buyerId: buyer?.id,
              buyerName: buyerName,
              certification: cert,
              fairtradeStatus: "FAIRTRADE",
              rawInputKg: matchedStock?.qtyReceived || o.quantityToProduce * 25.2,
              fgOutputPcs: o.quantityToProduce,
              fgOutputKg: o.quantityToProduce * 25,
              currentStage,
              completedStages,
              moisturePercent: 1.8,
              ovenRequired: false,
              status:
                relatedLST?.status === "accepted_warehouse"
                  ? "final"
                  : o.status === "completed"
                  ? "handover_ready"
                  : "in_progress",
              lbmId: matchedReceipt?.id || matchedStock?.goodsReceiptId,
              lbmNo: matchedStock?.lbmNo || matchedReceipt?.receiptNo || `LBM-${String(idx + 1).padStart(3, "0")}`,
              deliveryNoteNo: matchedStock?.deliveryNoteNo || matchedReceipt?.deliveryNoteNo,
              requisitionId: relatedReq?.id,
              requisitionNo: relatedReq?.requestNo,
              lstId: relatedLST?.id,
              lstNo: relatedLST?.reportNo || "",
              lstStatus: (relatedLST?.status as ProductionBatchRecord["lstStatus"]) || "draft",
              palletCount: Math.ceil(o.quantityToProduce / 40),
            });
          });
        } else if (loadedReceipts.length > 0) {
          // 2. Inbound Goods Receipts (LBM) waiting for production
          loadedReceipts.forEach((gr, idx) => {
            const firstLine = gr.lines?.[0];
            const matchedProduct = loadedProducts.find(
              (p) => p.id === firstLine?.productId
            );
            const matchedPO = loadedPOs.find((p) => p.id === gr.purchaseOrderId);
            const matchedSupplier = loadedSuppliers.find(
              (s) => s.id === gr.purchaseOrderId || s.name === matchedPO?.supplierName
            );
            const suppName = matchedPO?.supplierName || (gr.deliveryNoteNo ? `Pemasok (${gr.deliveryNoteNo})` : (matchedSupplier?.name || "Pemasok Inbound"));
            const suppCode = matchedSupplier?.batchCode || "VD";
            const rawKg =
              firstLine?.weightNet ||
              (firstLine?.quantityReceived ? firstLine.quantityReceived * 50 : 20000);
            const plannedSak = Math.floor(rawKg / 25);
            const buyer = loadedCustomers[0];

            mappedBatches.push({
              id: gr.id,
              poId: gr.purchaseOrderId,
              poNo: matchedPO?.orderNo,
              lbmId: gr.id,
              lbmNo: gr.receiptNo,
              deliveryNoteNo: gr.deliveryNoteNo,
              batchNo: `26N48${suppCode}${String(idx + 1).padStart(3, "0")}`,
              date: gr.receivedDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              productId: matchedProduct?.id,
              productName: matchedProduct?.name || "Gula Kelapa Inbound",
              productCode: matchedProduct?.sku || "SKU-001",
              supplierId: matchedSupplier?.id,
              supplier: suppName,
              supplierCode: suppCode,
              buyerId: buyer?.id,
              buyerName: buyer?.name || "Buyer Ekspor",
              certification: matchedProduct?.certifications || "Organik Standar",
              fairtradeStatus: "FAIRTRADE",
              rawInputKg: rawKg,
              fgOutputPcs: plannedSak,
              fgOutputKg: plannedSak * 25,
              currentStage: 1,
              completedStages: [],
              moisturePercent: 1.8,
              ovenRequired: false,
              status: "in_progress",
              lstNo: "",
              palletCount: Math.ceil(plannedSak / 40),
            });
          });
        }

        if (mappedBatches.length > 0) {
          setBatches(mappedBatches);
          setSelectedBatchId(mappedBatches[0].id);
        }
      } catch {
        // Fallback gracefully
      }
    }

    loadBackendData();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeBatch =
    batches.find((b) => b.id === selectedBatchId) || batches[0] || null;

  const handleUpdateActiveBatch = (updates: Partial<ProductionBatchRecord>) => {
    if (!activeBatch) return;
    setBatches((prev) =>
      prev.map((b) => (b.id === activeBatch.id ? { ...b, ...updates } : b))
    );
  };

  const handleOpenWizard = (batchId: string, stageNum?: number) => {
    const target = batches.find((b) => b.id === batchId);
    if (target) {
      setSelectedBatchId(target.id);
      setCurrentStep(stageNum || target.currentStage || 1);
    }
    setViewMode("wizard");
  };

  const handleCreateBatch = async (newBatchData: Partial<ProductionBatchRecord>) => {
    const nextNum = batches.length + 1;
    const newId = `batch-${Date.now()}`;
    const defaultSupp = suppliers[0];
    const defaultProd = products[0];
    const defaultCust = customers[0];
    const suppCode = newBatchData.supplierCode || defaultSupp?.batchCode || "VD";

    const newBatch: ProductionBatchRecord = {
      id: newId,
      batchNo: newBatchData.batchNo || `26N48${suppCode}${String(nextNum).padStart(3, "0")}`,
      date: new Date().toISOString().slice(0, 10),
      productId: newBatchData.productId || defaultProd?.id,
      productName: newBatchData.productName || defaultProd?.name || "Gula Semut Organik",
      productCode: newBatchData.productCode || defaultProd?.sku || "SKU-001",
      supplierId: newBatchData.supplierId || defaultSupp?.id,
      supplier: newBatchData.supplier || defaultSupp?.name || "Pemasok Terdaftar",
      supplierCode: suppCode,
      buyerId: newBatchData.buyerId || defaultCust?.id,
      buyerName: newBatchData.buyerName || defaultCust?.name || "Buyer Ekspor",
      certification: newBatchData.certification || defaultProd?.certifications || "Organik Standar",
      fairtradeStatus: newBatchData.fairtradeStatus || "FAIRTRADE",
      rawInputKg: newBatchData.rawInputKg || 20000,
      fgOutputPcs: newBatchData.fgOutputPcs || Math.floor((newBatchData.rawInputKg || 20000) / 25),
      fgOutputKg: newBatchData.fgOutputKg || Math.floor((newBatchData.rawInputKg || 20000) / 25) * 25,
      currentStage: 1,
      completedStages: [],
      moisturePercent: 1.8,
      ovenRequired: false,
      status: "in_progress",
      lbmId: newBatchData.lbmId,
      poId: newBatchData.poId,
      poNo: newBatchData.poNo,
      lbmNo:
        newBatchData.lbmNo ||
        `LBM-${new Date().toISOString().slice(0, 7).replace("-", "")}-${String(nextNum).padStart(3, "0")}`,
      deliveryNoteNo: newBatchData.deliveryNoteNo || "",
      lstNo: newBatchData.lstNo || "",
      palletCount: newBatchData.palletCount || Math.ceil((newBatchData.fgOutputPcs || 800) / 40),
      ...newBatchData,
    };

    setBatches((prev) => [newBatch, ...prev]);
    setSelectedBatchId(newId);
    setCurrentStep(1);
    setViewMode("wizard");

    setNotification({
      type: "success",
      text: `Batch baru ${newBatch.batchNo} berhasil dibuat. Mulai dari Tahap 1 (Inbound & LBM).`,
    });
  };

  const handleNextStep = () => {
    if (!activeBatch) return;
    const next = Math.min(10, currentStep + 1);
    const newCompleted = activeBatch.completedStages.includes(currentStep)
      ? activeBatch.completedStages
      : [...activeBatch.completedStages, currentStep];

    handleUpdateActiveBatch({
      completedStages: newCompleted,
      currentStage: Math.max(activeBatch.currentStage, next),
      status: next === 10 ? "handover_ready" : activeBatch.status,
    });

    setCurrentStep(next);
    setNotification({
      type: "success",
      text: `Tahap ${currentStep} (${PRODUCTION_STEPS[currentStep - 1].title}) berhasil diselesaikan. Berlanjut ke Tahap ${next}.`,
    });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinishWizard = () => {
    if (!activeBatch) return;
    const newCompleted = activeBatch.completedStages.includes(10)
      ? activeBatch.completedStages
      : [...activeBatch.completedStages, 10];

    handleUpdateActiveBatch({
      completedStages: newCompleted,
      status: "final",
    });

    setViewMode("overview");
    setNotification({
      type: "success",
      text: `Batch ${activeBatch.batchNo} selesai dan dokumen LST resmi disahkan!`,
    });
  };

  const currentStepDef =
    PRODUCTION_STEPS.find((s) => s.id === currentStep) || PRODUCTION_STEPS[0];
  const progressPct = activeBatch
    ? Math.round((activeBatch.completedStages.length / PRODUCTION_STEPS.length) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-16">
      {/* ─── HEADER UTAMA & TABS MODE ──────────────────────────────────────── */}
      <PageHeader
        title="Inventory & Production End to End"
        description="Alur operasional terpadu: Dari Penerimaan Bahan Masuk Gudang (GD-007-LBM) hingga Serah Terima Barang Jadi (GDG-009-LST)"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "overview" | "wizard")}
            className="space-y-0"
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="overview" className="gap-1.5 text-xs font-medium">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Ringkasan Pipeline (Overview)
              </TabsTrigger>
              <TabsTrigger value="wizard" className="gap-1.5 text-xs font-medium">
                <Layers className="h-3.5 w-3.5" />
                Form Kendali 10 Tahap (Wizard)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            onClick={() => handleCreateBatch({})}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            Mulai Batch Baru
          </Button>
        </div>
      </PageHeader>

      {/* ─── NOTIFIKASI TOAST BANNER ──────────────────────────────────────── */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium shadow-xs ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-blue-50 border-blue-200 text-blue-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[11px] text-slate-500 hover:text-slate-800 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── VIEW MODE 1: OVERVIEW PIPELINE ───────────────────────────────── */}
      {viewMode === "overview" && (
        <div className="space-y-6">
          <BatchKPICards batches={batches} />
          <BatchOverviewTable
            batches={batches}
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
            products={products}
            customers={customers}
            goodsReceipts={goodsReceipts}
            onOpenWizard={handleOpenWizard}
            onCreateBatch={handleCreateBatch}
          />
        </div>
      )}

      {/* ─── VIEW MODE 2: WIZARD FORM KENDALI 10 TAHAP ─────────────────────── */}
      {viewMode === "wizard" && (
        <div className="space-y-6">
          {!activeBatch ? (
            <Card className="border border-border p-12 text-center space-y-4 bg-white">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                <Layers className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Belum Ada Batch Produksi</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Pilih batch dari daftar ringkasan atau inisiasi batch baru untuk membuka formulir kendali 10 tahap dari LBM ke LST.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewMode("overview")}
                  className="text-xs"
                >
                  Kembali ke Overview
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCreateBatch({})}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Mulai Batch Baru
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Header Batch Aktif */}
              <Card className="border border-border shadow-xs bg-white">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Batch Produksi Aktif:
                        </span>

                        <select
                          value={selectedBatchId}
                          onChange={(e) => {
                            setSelectedBatchId(e.target.value);
                            const b = batches.find((item) => item.id === e.target.value);
                            if (b) setCurrentStep(b.currentStage || 1);
                          }}
                          aria-label="Pilih Batch Produksi"
                          className="bg-background text-foreground font-mono text-xs font-bold px-2.5 py-1.5 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-blue-500"
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

                      <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Factory className="h-5 w-5 text-blue-600 shrink-0" />
                        <span>{activeBatch.productName}</span>
                        <span className="text-xs font-normal text-muted-foreground font-mono">
                          ({activeBatch.productCode})
                        </span>
                      </h2>

                      <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        <span>
                          Pemasok: <strong className="text-foreground">{activeBatch.supplier}</strong> (
                          {activeBatch.supplierCode})
                        </span>
                        {activeBatch.buyerName && (
                          <>
                            <span>•</span>
                            <span>
                              Buyer: <strong className="text-foreground">{activeBatch.buyerName}</strong>
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          Realisasi FG:{" "}
                          <strong className="text-foreground">
                            {activeBatch.fgOutputPcs.toLocaleString()} Sak
                          </strong>{" "}
                          ({activeBatch.fgOutputKg.toLocaleString()} Kg)
                        </span>
                      </p>
                    </div>

                    {/* Progress Mini Bar & Status */}
                    <div className="lg:w-72 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-medium">Progres Alur Batch:</span>
                        <span className="font-bold text-blue-700 font-mono">
                          {activeBatch.completedStages.length} / 10 ({progressPct}%)
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300 rounded-full"
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

          {/* Master-Detail 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Navigasi Vertikal 10 Tahap */}
            <div className="lg:col-span-4 xl:col-span-3">
              <StepSidebar
                activeBatch={activeBatch}
                currentStep={currentStep}
                completedSteps={activeBatch.completedStages}
                onSelectStep={setCurrentStep}
                onBackToOverview={() => setViewMode("overview")}
              />
            </div>

            {/* Konten Tahap Aktif */}
            <div className="lg:col-span-8 xl:col-span-9">
              <Card className="border border-border shadow-xs bg-white">
                <CardHeader className="p-4 border-b border-border bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-bold text-blue-700 font-mono">
                        TAHAP {currentStepDef.id} DARI 10
                      </span>
                      <span className="text-slate-300">|</span>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {currentStepDef.docCode}
                      </Badge>
                      <span className="text-slate-300">|</span>
                      <span className="text-[11px] text-muted-foreground">{currentStepDef.owner}</span>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground">
                      {currentStepDef.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      {currentStepDef.description}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevStep}
                      disabled={currentStep === 1}
                      className="text-xs"
                    >
                      <ArrowLeft className="h-3 w-3 mr-1" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextStep}
                      disabled={currentStep === 10}
                      className="text-xs"
                    >
                      Next <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {currentStep === 1 && (
                    <Step1LBMInbound
                      batch={activeBatch}
                      purchaseOrders={purchaseOrders}
                      suppliers={suppliers}
                      products={products}
                      onUpdateBatch={handleUpdateActiveBatch}
                      onNext={handleNextStep}
                      isCompleted={activeBatch.completedStages.includes(1)}
                    />
                  )}

                  {currentStep === 2 && (
                    <Step2BPBRequisition
                      batch={activeBatch}
                      onUpdateBatch={handleUpdateActiveBatch}
                      onNext={handleNextStep}
                      onPrev={handlePrevStep}
                      isCompleted={activeBatch.completedStages.includes(2)}
                    />
                  )}

                  {currentStep === 3 && (
                    <Step3SievingRaw
                      batch={activeBatch}
                      onUpdateBatch={handleUpdateActiveBatch}
                      onNext={handleNextStep}
                      onPrev={handlePrevStep}
                      isCompleted={activeBatch.completedStages.includes(3)}
                    />
                  )}

                  {currentStep === 4 && (
                    <Step4MoistureOven
                      batch={activeBatch}
                      onUpdateBatch={handleUpdateActiveBatch}
                      onNext={handleNextStep}
                      onPrev={handlePrevStep}
                      isCompleted={activeBatch.completedStages.includes(4)}
                    />
                  )}

                  {currentStep === 5 && (
                    <Step5SievingCooked
                      batch={activeBatch}
                      onUpdateBatch={handleUpdateActiveBatch}
                      onNext={handleNextStep}
                      onPrev={handlePrevStep}
                      isCompleted={activeBatch.completedStages.includes(5)}
                    />
                  )}

                  {currentStep === 6 && (
                    <Step6PackingScale
                      batch={activeBatch}
                      onUpdateBatch={handleUpdateActiveBatch}
                      onNext={handleNextStep}
                      onPrev={handlePrevStep}
                      isCompleted={activeBatch.completedStages.includes(6)}
                    />
                  )}

                  {currentStep === 7 && (
                    <Step7MetalDetector
                      batch={activeBatch}
                      onUpdateBatch={handleUpdateActiveBatch}
                      onNext={handleNextStep}
                      onPrev={handlePrevStep}
                      isCompleted={activeBatch.completedStages.includes(7)}
                    />
                  )}

                  {currentStep === 8 && (
                    <Step8QCFinished
                      batch={activeBatch}
                      onUpdateBatch={handleUpdateActiveBatch}
                      onNext={handleNextStep}
                      onPrev={handlePrevStep}
                      isCompleted={activeBatch.completedStages.includes(8)}
                    />
                  )}

                  {currentStep === 9 && (
                    <Step9LHPSerials
                      batch={activeBatch}
                      customers={customers}
                      onUpdateBatch={handleUpdateActiveBatch}
                      onNext={handleNextStep}
                      onPrev={handlePrevStep}
                      isCompleted={activeBatch.completedStages.includes(9)}
                    />
                  )}

                  {currentStep === 10 && (
                    <Step10LSTHandover
                      batch={activeBatch}
                      customers={customers}
                      onUpdateBatch={handleUpdateActiveBatch}
                      onPrev={handlePrevStep}
                      onFinish={handleFinishWizard}
                      isCompleted={activeBatch.completedStages.includes(10)}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
