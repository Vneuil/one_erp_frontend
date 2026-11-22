"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Plus,
  Printer,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Layers,
  Trash2,
  Send,
  Droplets,
  Boxes,
  ArrowRight,
  Scale,
  FileSpreadsheet,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { errText, useReport } from "@/components/reports/report-ui";
import {
  manufacturingApi,
  MaterialRequisitionItem,
  CreateRequisitionInput,
  RequisitionType,
  MaterialRequisitionLineItem,
  LiquidSugarDispensingItem,
  LBBReportItem,
  CreateLBBReportInput,
  ProductionOrderItem,
} from "@/lib/api/manufacturing";
import { productsApi, ProductItem, isProductActive } from "@/lib/api/products";
import { rawMaterialStockApi, RawMaterialStockItem } from "@/lib/api/raw-material-stock";
import { printBPBDocument, printLBBDocument } from "@/lib/utils/print-bpb-lbb";
import { exportBPBExcel, exportLBBExcel } from "@/lib/utils/export-bpb-lbb-excel";

const selectCls =
  "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

type MainTab = "raw_material" | "lbb" | "packaging" | "liquid_sugar";

export default function RequisitionsPage() {
  const searchParams = useSearchParams();
  const sbbIdParam = searchParams.get("sbbId");

  const [reload, setReload] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<MainTab>("raw_material");

  // Load products for dropdown and lookup
  const { data: rawProducts } = useReport<ProductItem[]>("products-catalog-cached", () =>
    productsApi.list({ perPage: 500 }).then((r) => r.data || [])
  );
  const allProducts: ProductItem[] = rawProducts ?? [];
  const productMap = React.useMemo(() => new Map(allProducts.map((p) => [p.id, p])), [allProducts]);
  const products: ProductItem[] = React.useMemo(() => allProducts.filter(isProductActive), [allProducts]);

  // Load available SBB lots (Siap Produksi & saldo > 0)
  const { data: rawSbbLots } = useReport<RawMaterialStockItem[]>(
    `sbb-available-lots|${reload}`,
    () => rawMaterialStockApi.list({ status: "available" }).then((r) => r.data || [])
  );
  const availableSbbLots: RawMaterialStockItem[] = React.useMemo(() => {
    return (rawSbbLots || []).filter((l) => (l.qtyRemaining - (l.qtyReserved || 0)) > 0);
  }, [rawSbbLots]);

  // Load production orders for SPK link
  const { data: rawOrders } = useReport<ProductionOrderItem[]>(
    `prod-orders-list|${reload}`,
    () => manufacturingApi.listProductionOrders({ perPage: 100 }).then((r) => r.data || [])
  );
  const productionOrders: ProductionOrderItem[] = rawOrders ?? [];

  // Load requisitions (BPB, PBPK, LPC)
  const reqTypeParam = activeTab === "lbb" ? "raw_material" : activeTab;
  const { data: rawList, loading: loadingReqs } = useReport<MaterialRequisitionItem[]>(
    `mfg-reqs|${reload}|${reqTypeParam}`,
    () => manufacturingApi.listRequisitions({ type: reqTypeParam }).then((r) => r.data || [])
  );
  const requisitions: MaterialRequisitionItem[] = rawList ?? [];

  // Load LBB Reports
  const { data: rawLbbList, loading: loadingLbb } = useReport<LBBReportItem[]>(
    `mfg-lbb-list|${reload}`,
    () => manufacturingApi.listLBBReports().then((r) => r.data || [])
  );
  const lbbReports: LBBReportItem[] = rawLbbList ?? [];

  // Dialog state: BPB / PBPK / LPC Form
  const [isOpenBPB, setIsOpenBPB] = React.useState(false);
  const [isSubmittingBPB, setIsSubmittingBPB] = React.useState(false);
  const [formErrorBPB, setFormErrorBPB] = React.useState<string | null>(null);

  const [formDataBPB, setFormDataBPB] = React.useState<CreateRequisitionInput>({
    requisitionType: "raw_material",
    documentCode: "GDG-011-BPB",
    materialCategory: "GSKN",
    fairtradeStatus: "Fairtrade",
    requestDate: new Date().toISOString().slice(0, 10),
    department: "Produksi Ayak",
    requestedBy: "Produksi",
    orderNumber: "",
    notes: "",
    lines: [],
    dispensingItems: [],
  });

  // Dialog state: LBB Weighing Grid (1..300)
  const [isOpenLBB, setIsOpenLBB] = React.useState(false);
  const [isSubmittingLBB, setIsSubmittingLBB] = React.useState(false);
  const [formErrorLBB, setFormErrorLBB] = React.useState<string | null>(null);
  const [editingLbbId, setEditingLbbId] = React.useState<string | null>(null);

  const [formDataLBB, setFormDataLBB] = React.useState<CreateLBBReportInput>({
    reportDate: new Date().toISOString().slice(0, 10),
    variantType: "GSKN",
    fairtradeStatus: "Fairtrade",
    productId: "",
    materialCode: "",
    productName: "",
    supplierName: "",
    customerName: "",
    machineNo: "",
    meshSize: "Mesh 16",
    uom: "KG",
    plasticTarePerBag: 0.03,
    operatorRole: "Operator Ayak",
    preparedBy: "Operator Ayak",
    acknowledgedBy: "Admin Produksi",
    notes: "",
    bagEntries: [],
  });

  // LBB grid weights state: 300 entries array
  const [gridWeights, setGridWeights] = React.useState<(number | null)[]>(new Array(300).fill(null));
  const [activeColGroup, setActiveColGroup] = React.useState<number>(1); // 1..6
  const [quickBagCount, setQuickBagCount] = React.useState<number>(20);
  const [quickStandardWeight, setQuickStandardWeight] = React.useState<number>(25.0);

  // Dialog state: ACC Gudang
  const [accTarget, setAccTarget] = React.useState<MaterialRequisitionItem | null>(null);
  const [accApprover, setAccApprover] = React.useState<string>("Manager Gudang (Abel)");
  const [accNotes, setAccNotes] = React.useState<string>("");
  const [isSubmittingAcc, setIsSubmittingAcc] = React.useState<boolean>(false);

  // Dialog state: Masuk ke Produksi
  const [prodTarget, setProdTarget] = React.useState<MaterialRequisitionItem | null>(null);
  const [prodEnteredBy, setProdEnteredBy] = React.useState<string>("Operator Ayak / Produksi");
  const [prodNotes, setProdNotes] = React.useState<string>("");
  const [isSubmittingProd, setIsSubmittingProd] = React.useState<boolean>(false);

  // Dialog state: Reject Requisition
  const [rejectTarget, setRejectTarget] = React.useState<MaterialRequisitionItem | null>(null);
  const [rejectReason, setRejectReason] = React.useState<string>("");
  const [isSubmittingReject, setIsSubmittingReject] = React.useState<boolean>(false);

  // Auto-open BPB dialog if sbbId query param is provided
  React.useEffect(() => {
    if (sbbIdParam && availableSbbLots.length > 0) {
      const found = availableSbbLots.find((l) => l.id === sbbIdParam);
      if (found) {
        handleOpenCreateBPB(found);
      }
    }
  }, [sbbIdParam, availableSbbLots]);

  // Handle open Create BPB
  const handleOpenCreateBPB = (preselectedLot?: RawMaterialStockItem) => {
    let initialLines: MaterialRequisitionLineItem[] = [];

    if (preselectedLot) {
      const avail = preselectedLot.qtyRemaining - (preselectedLot.qtyReserved || 0);
      initialLines = [
        {
          rawMaterialStockId: preselectedLot.id,
          sbbEntryNo: preselectedLot.entryNo,
          productId: preselectedLot.productId,
          productSku: preselectedLot.productSku,
          productName: preselectedLot.productName,
          batchNo: preselectedLot.batchNo,
          supplierName: preselectedLot.supplierName,
          arrivalDateRef: preselectedLot.entryDate ? `Tgl. ${preselectedLot.entryDate}` : "",
          rackLocation: preselectedLot.rackLocation,
          palletNo: preselectedLot.palletNo,
          moistureContent: preselectedLot.moistureContent,
          quantityRequested: avail,
          quantityIssued: avail,
          quantityUsed: 0,
          quantityReject: 0,
          quantityReturned: 0,
          packageCountRequested: preselectedLot.remainingPackages || 0,
          packageCountIssued: preselectedLot.remainingPackages || 0,
          packageUnit: preselectedLot.packageUnit || "Sak",
          uom: preselectedLot.uom || "KG",
          notes: "",
        },
      ];
    } else if (availableSbbLots.length > 0) {
      const firstLot = availableSbbLots[0];
      const avail = firstLot.qtyRemaining - (firstLot.qtyReserved || 0);
      initialLines = [
        {
          rawMaterialStockId: firstLot.id,
          sbbEntryNo: firstLot.entryNo,
          productId: firstLot.productId,
          productSku: firstLot.productSku,
          productName: firstLot.productName,
          batchNo: firstLot.batchNo,
          supplierName: firstLot.supplierName,
          arrivalDateRef: firstLot.entryDate ? `Tgl. ${firstLot.entryDate}` : "",
          rackLocation: firstLot.rackLocation,
          palletNo: firstLot.palletNo,
          moistureContent: firstLot.moistureContent,
          quantityRequested: Math.min(500, avail),
          quantityIssued: Math.min(500, avail),
          quantityUsed: 0,
          quantityReject: 0,
          quantityReturned: 0,
          packageCountRequested: Math.min(20, firstLot.remainingPackages || 20),
          packageCountIssued: Math.min(20, firstLot.remainingPackages || 20),
          packageUnit: firstLot.packageUnit || "Sak",
          uom: firstLot.uom || "KG",
          notes: "",
        },
      ];
    }

    setFormDataBPB({
      requisitionType: activeTab === "packaging" ? "packaging" : activeTab === "liquid_sugar" ? "liquid_sugar" : "raw_material",
      documentCode: activeTab === "packaging" ? "GDG-012-BPK" : activeTab === "liquid_sugar" ? "GDG-008-LPC" : "GDG-011-BPB",
      materialCategory: "GSKN",
      fairtradeStatus: "Fairtrade",
      warehouseId: preselectedLot ? preselectedLot.warehouseId : availableSbbLots[0]?.warehouseId,
      requestDate: new Date().toISOString().slice(0, 10),
      department:
        activeTab === "liquid_sugar"
          ? "Produksi Gula Cair"
          : activeTab === "packaging"
          ? "Ruang Packing"
          : "Produksi Ayak",
      requestedBy: "Produksi",
      orderNumber: "",
      notes: "",
      lines: initialLines,
      dispensingItems: [],
    });
    setFormErrorBPB(null);
    setIsOpenBPB(true);
  };

  const handleLotSelect = (idx: number, lotId: string) => {
    const lot = availableSbbLots.find((l) => l.id === lotId);
    if (!lot) return;

    const avail = lot.qtyRemaining - (lot.qtyReserved || 0);
    setFormDataBPB((prev) => {
      const nextLines = [...(prev.lines || [])];
      nextLines[idx] = {
        ...nextLines[idx],
        rawMaterialStockId: lot.id,
        sbbEntryNo: lot.entryNo,
        productId: lot.productId,
        productSku: lot.productSku,
        productName: lot.productName,
        batchNo: lot.batchNo,
        supplierName: lot.supplierName,
        arrivalDateRef: lot.entryDate ? `Tgl. ${lot.entryDate}` : "",
        rackLocation: lot.rackLocation,
        palletNo: lot.palletNo,
        moistureContent: lot.moistureContent,
        quantityRequested: Math.min(500, avail),
        quantityIssued: Math.min(500, avail),
        packageCountRequested: Math.min(20, lot.remainingPackages || 20),
        packageCountIssued: Math.min(20, lot.remainingPackages || 20),
        packageUnit: lot.packageUnit || "Sak",
        uom: lot.uom || "KG",
      };
      return { ...prev, lines: nextLines };
    });
  };

  const addBPBLine = () => {
    const lot = availableSbbLots[0];
    setFormDataBPB((prev) => ({
      ...prev,
      lines: [
        ...(prev.lines || []),
        lot
          ? {
              rawMaterialStockId: lot.id,
              sbbEntryNo: lot.entryNo,
              productId: lot.productId,
              productSku: lot.productSku,
              productName: lot.productName,
              batchNo: lot.batchNo,
              supplierName: lot.supplierName,
              arrivalDateRef: lot.entryDate ? `Tgl. ${lot.entryDate}` : "",
              rackLocation: lot.rackLocation,
              palletNo: lot.palletNo,
              moistureContent: lot.moistureContent,
              quantityRequested: 100,
              quantityIssued: 100,
              quantityUsed: 0,
              quantityReject: 0,
              quantityReturned: 0,
              packageCountRequested: 4,
              packageCountIssued: 4,
              packageUnit: lot.packageUnit || "Sak",
              uom: lot.uom || "KG",
            }
          : {
              productId: products[0]?.id || "",
              productName: products[0]?.name || "Bahan Baku",
              batchNo: "",
              quantityRequested: 100,
              quantityIssued: 100,
              quantityUsed: 0,
              quantityReject: 0,
              quantityReturned: 0,
              uom: "KG",
            },
      ],
    }));
  };

  const removeBPBLine = (idx: number) => {
    setFormDataBPB((prev) => ({
      ...prev,
      lines: (prev.lines || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmitBPB = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBPB(true);
    setFormErrorBPB(null);
    try {
      await manufacturingApi.createRequisition(formDataBPB);
      setIsOpenBPB(false);
      setReload((v) => v + 1);
    } catch (err) {
      setFormErrorBPB(errText(err, "Gagal membuat formulir BPB"));
    } finally {
      setIsSubmittingBPB(false);
    }
  };

  // Open LBB Dialog from BPB or Standalone
  const handleOpenLBBForBPB = (bpb: MaterialRequisitionItem, line?: MaterialRequisitionLineItem) => {
    const targetLine = line || (bpb.lines && bpb.lines.length > 0 ? bpb.lines[0] : undefined);
    const isVCO = (bpb.materialCategory || "").toUpperCase() === "NVCO";
    const initialWeights = new Array(300).fill(null);

    // If an LBB already exists for this BPB, load its weights
    const existingLbb = (bpb.lbbReports && bpb.lbbReports.length > 0)
      ? bpb.lbbReports[0]
      : lbbReports.find((l) => l.requisitionId === bpb.id);

    if (existingLbb && existingLbb.bagEntries) {
      setEditingLbbId(existingLbb.id);
      existingLbb.bagEntries.forEach((entry) => {
        if (entry.rowNumber >= 1 && entry.rowNumber <= 300) {
          initialWeights[entry.rowNumber - 1] = entry.weightValue != null ? entry.weightValue : null;
        }
      });
      setFormDataLBB({
        requisitionId: bpb.id,
        requisitionLineId: targetLine?.id,
        bpbNo: bpb.requestNo,
        rawMaterialStockId: targetLine?.rawMaterialStockId,
        sbbEntryNo: targetLine?.sbbEntryNo,
        productionOrderId: bpb.productionOrderId,
        orderNumber: bpb.orderNumber,
        reportDate: existingLbb.reportDate,
        variantType: existingLbb.variantType,
        fairtradeStatus: existingLbb.fairtradeStatus,
        productId: existingLbb.productId,
        materialCode: existingLbb.materialCode,
        productName: existingLbb.productName,
        supplierName: existingLbb.supplierName,
        customerName: existingLbb.customerName || "",
        machineNo: existingLbb.machineNo || "",
        meshSize: existingLbb.meshSize || "Mesh 16",
        uom: existingLbb.uom,
        plasticTarePerBag: existingLbb.plasticTarePerBag,
        operatorRole: existingLbb.operatorRole,
        preparedBy: existingLbb.preparedBy || "Operator Ayak",
        acknowledgedBy: existingLbb.acknowledgedBy || "Admin Produksi",
        notes: existingLbb.notes || "",
      });
    } else {
      setEditingLbbId(null);
      setFormDataLBB({
        requisitionId: bpb.id,
        requisitionLineId: targetLine?.id,
        bpbNo: bpb.requestNo,
        rawMaterialStockId: targetLine?.rawMaterialStockId,
        sbbEntryNo: targetLine?.sbbEntryNo,
        productionOrderId: bpb.productionOrderId,
        orderNumber: bpb.orderNumber,
        reportDate: bpb.requestDate,
        variantType: isVCO ? "VCO" : "GSKN",
        fairtradeStatus: bpb.fairtradeStatus || "Fairtrade",
        productId: targetLine?.productId || "",
        materialCode: targetLine?.batchNo || "",
        productName: targetLine?.productName || "",
        supplierName: targetLine?.supplierName || "",
        customerName: "",
        machineNo: "",
        meshSize: "Mesh 16",
        uom: isVCO ? "L" : "KG",
        plasticTarePerBag: isVCO ? 0 : 0.03,
        operatorRole: isVCO ? "Operator Filling" : "Operator Ayak",
        preparedBy: isVCO ? "Operator Filling" : "Operator Ayak",
        acknowledgedBy: "Admin Produksi",
        notes: "",
      });
    }

    setGridWeights(initialWeights);
    setActiveColGroup(1);
    setFormErrorLBB(null);
    setIsOpenLBB(true);
  };

  const handleOpenEditLBB = (lbb: LBBReportItem) => {
    setEditingLbbId(lbb.id);
    const initialWeights = new Array(300).fill(null);
    (lbb.bagEntries || []).forEach((entry) => {
      if (entry.rowNumber >= 1 && entry.rowNumber <= 300) {
        initialWeights[entry.rowNumber - 1] = entry.weightValue != null ? entry.weightValue : null;
      }
    });

    setFormDataLBB({
      requisitionId: lbb.requisitionId,
      requisitionLineId: lbb.requisitionLineId,
      bpbNo: lbb.bpbNo,
      rawMaterialStockId: lbb.rawMaterialStockId,
      sbbEntryNo: lbb.sbbEntryNo,
      productionOrderId: lbb.productionOrderId,
      orderNumber: lbb.orderNumber,
      reportDate: lbb.reportDate,
      variantType: lbb.variantType,
      fairtradeStatus: lbb.fairtradeStatus,
      productId: lbb.productId,
      materialCode: lbb.materialCode,
      productName: lbb.productName,
      supplierName: lbb.supplierName,
      customerName: lbb.customerName || "",
      machineNo: lbb.machineNo || "",
      meshSize: lbb.meshSize || "Mesh 16",
      uom: lbb.uom,
      plasticTarePerBag: lbb.plasticTarePerBag,
      operatorRole: lbb.operatorRole,
      preparedBy: lbb.preparedBy || "",
      acknowledgedBy: lbb.acknowledgedBy || "",
      notes: lbb.notes || "",
    });

    setGridWeights(initialWeights);
    setActiveColGroup(1);
    setFormErrorLBB(null);
    setIsOpenLBB(true);
  };

  // Quick fill generator
  const handleQuickFill = () => {
    const nextWeights = [...gridWeights];
    const count = Math.min(300, Math.max(1, quickBagCount));
    for (let i = 0; i < 300; i++) {
      if (i < count) {
        nextWeights[i] = quickStandardWeight;
      } else {
        nextWeights[i] = null;
      }
    }
    setGridWeights(nextWeights);
  };

  const handleClearGrid = () => {
    setGridWeights(new Array(300).fill(null));
  };

  // LBB Realtime Calculations
  const calculatedLBB = React.useMemo(() => {
    let filledCount = 0;
    let totalGross = 0;
    const isVCO = (formDataLBB.variantType || "").toUpperCase() === "VCO";

    gridWeights.forEach((w) => {
      if (w != null && w > 0) {
        filledCount++;
        totalGross += w;
      }
    });

    const plasticTare = isVCO ? 0 : filledCount * (formDataLBB.plasticTarePerBag || 0);
    const totalNet = Math.max(0, totalGross - plasticTare);

    // Calculate subtotal for each column group (1..6)
    const colSubtotals = [0, 1, 2, 3, 4, 5].map((colIdx) => {
      let sub = 0;
      for (let r = 0; r < 50; r++) {
        const val = gridWeights[colIdx * 50 + r];
        if (val != null && val > 0) sub += val;
      }
      return sub;
    });

    return {
      filledCount,
      totalGross,
      plasticTare,
      totalNet,
      colSubtotals,
    };
  }, [gridWeights, formDataLBB.variantType, formDataLBB.plasticTarePerBag]);

  const handleSubmitLBB = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLBB(true);
    setFormErrorLBB(null);

    const bagEntriesPayload = gridWeights.map((w, idx) => ({
      rowNumber: idx + 1,
      columnGroup: Math.floor(idx / 50) + 1,
      lotCode: formDataLBB.materialCode,
      weightValue: w != null && w > 0 ? w : null,
    }));

    try {
      if (editingLbbId) {
        await manufacturingApi.updateLBBReport(editingLbbId, {
          ...formDataLBB,
          bagEntries: bagEntriesPayload,
        });
      } else {
        await manufacturingApi.createLBBReport({
          ...formDataLBB,
          bagEntries: bagEntriesPayload,
        });
      }
      setIsOpenLBB(false);
      setReload((v) => v + 1);
    } catch (err) {
      setFormErrorLBB(errText(err, "Gagal menyimpan Laporan Permintaan Bahan Baku (LBB)"));
    } finally {
      setIsSubmittingLBB(false);
    }
  };

  // ACC Gudang execution
  const handleConfirmAcc = async () => {
    if (!accTarget) return;
    setIsSubmittingAcc(true);
    try {
      await manufacturingApi.accGudangRequisition(accTarget.id, {
        warehouseApprovedBy: accApprover,
        notes: accNotes,
      });
      setAccTarget(null);
      setReload((v) => v + 1);
    } catch (err) {
      alert(errText(err, "Gagal memproses ACC Gudang"));
    } finally {
      setIsSubmittingAcc(false);
    }
  };

  // Masuk ke Produksi execution
  const handleConfirmProd = async () => {
    if (!prodTarget) return;
    setIsSubmittingProd(true);
    try {
      await manufacturingApi.enterProductionRequisition(prodTarget.id, {
        enteredProductionBy: prodEnteredBy,
        notes: prodNotes,
      });
      setProdTarget(null);
      setReload((v) => v + 1);
    } catch (err) {
      alert(errText(err, "Gagal memproses masuk ke lini produksi"));
    } finally {
      setIsSubmittingProd(false);
    }
  };

  // Rejection execution
  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    setIsSubmittingReject(true);
    try {
      await manufacturingApi.rejectRequisition(rejectTarget.id, rejectReason);
      setRejectTarget(null);
      setReload((v) => v + 1);
    } catch (err) {
      alert(errText(err, "Gagal menolak permohonan"));
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Delete LBB report
  const handleDeleteLBB = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus Laporan Permintaan Bahan Baku (LBB) ini?")) return;
    try {
      await manufacturingApi.deleteLBBReport(id);
      setReload((v) => v + 1);
    } catch (err) {
      alert(errText(err, "Gagal menghapus LBB"));
    }
  };

  // BPB Columns
  const bpbColumns: Column<MaterialRequisitionItem>[] = [
    {
      key: "requestNo",
      header: "No. BPB & Tanggal",
      render: (r: MaterialRequisitionItem) => (
        <div>
          <div className="font-mono font-bold text-foreground text-xs">{r.requestNo}</div>
          <div className="text-[11px] text-muted-foreground">{r.requestDate}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
              {r.materialCategory || "GSKN"}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              {r.fairtradeStatus || "Fairtrade"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Departemen / Order SPK",
      hiddenBelow: "md",
      render: (r: MaterialRequisitionItem) => (
        <div>
          <div className="font-semibold text-foreground text-xs">{r.department}</div>
          <div className="text-[11px] text-muted-foreground">Order: {r.orderNumber || "Tanpa Order SPK"}</div>
          <div className="text-[10px] text-slate-500">Peminta: {r.requestedBy}</div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Rincian Lot Bahan Baku",
      render: (r: MaterialRequisitionItem) => (
        <div className="space-y-1 text-xs">
          {(r.lines || []).map((l, i) => {
            const qty = l.quantityIssued > 0 ? l.quantityIssued : l.quantityRequested;
            const pkgs = (l.packageCountIssued && l.packageCountIssued > 0) ? l.packageCountIssued : l.packageCountRequested;
            return (
              <div key={i} className="border-l-2 border-primary/40 pl-2 py-0.5">
                <div className="font-medium text-foreground flex items-center justify-between gap-2">
                  <span>{l.productName}</span>
                  <span className="font-mono font-bold text-teal-800">
                    {qty.toLocaleString("id-ID", { maximumFractionDigits: 3 })} {l.uom}
                    {pkgs ? ` (${pkgs} ${l.packageUnit || "Sak"})` : ""}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                  <span>Lot: <strong className="font-mono text-slate-700">{l.batchNo || "-"}</strong></span>
                  {l.rackLocation && <span>Rak: {l.rackLocation}/{l.palletNo}</span>}
                  {l.moistureContent != null && (
                    <span className={l.moistureContent <= 2.0 ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"}>
                      KA: {l.moistureContent}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status Alur",
      render: (r: MaterialRequisitionItem) => {
        switch (r.status) {
          case "submitted":
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                1. Menunggu Timbang LBB
              </span>
            );
          case "lbb_recorded":
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                <Scale className="w-3.5 h-3.5 text-blue-600" />
                2. LBB Ditimbang (Siap ACC)
              </span>
            );
          case "warehouse_approved":
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                3. ACC Gudang (Stok Terpotong)
              </span>
            );
          case "in_production":
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                4. Masuk ke Lini Produksi
              </span>
            );
          case "completed":
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Selesai
              </span>
            );
          case "rejected":
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Ditolak
              </span>
            );
          default:
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800">
                {r.status}
              </span>
            );
        }
      },
    },
    {
      key: "action",
      header: "Aksi & Alur",
      align: "right",
      render: (r: MaterialRequisitionItem) => (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {/* Step 2: Isi / Edit LBB */}
          {(r.status === "submitted" || r.status === "lbb_recorded") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenLBBForBPB(r)}
              className="h-7 text-[11px] gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
              title="Isi / Edit Rincian Timbangan LBB (GDG-013-LBB)"
            >
              <Scale className="w-3.5 h-3.5" />
              {r.status === "lbb_recorded" ? "Edit LBB" : "Isi LBB"}
            </Button>
          )}

          {/* Step 3: ACC Gudang */}
          {(r.status === "submitted" || r.status === "lbb_recorded") && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setAccTarget(r);
                setAccApprover("Manager Gudang (Abel)");
                setAccNotes("");
              }}
              className="h-7 text-[11px] gap-1 bg-emerald-700 hover:bg-emerald-800 text-white"
              title="ACC Gudang: Potong Saldo Lot SBB dan Kartu Stok"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              ACC Gudang
            </Button>
          )}

          {/* Step 4: Masuk ke Produksi */}
          {r.status === "warehouse_approved" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setProdTarget(r);
                setProdEnteredBy("Operator Produksi Ayak");
                setProdNotes("");
              }}
              className="h-7 text-[11px] gap-1 bg-indigo-700 hover:bg-indigo-800 text-white"
              title="Masuk ke Produksi: Catat Genealogy & Cek Kadar Air BRL-01"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Masuk Produksi
            </Button>
          )}

          {/* Tolak Permintaan */}
          {(r.status === "submitted" || r.status === "lbb_recorded") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRejectTarget(r);
                setRejectReason("");
              }}
              className="h-7 text-[11px] gap-1 text-rose-600 hover:bg-rose-50"
              title="Tolak Permintaan Bahan Baku"
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Cetak & Export */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => printBPBDocument(r)}
            className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100"
            title="Cetak Formulir BPB (GDG-011-BPB)"
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportBPBExcel(r)}
            className="h-7 w-7 p-0 text-emerald-700 hover:bg-emerald-50"
            title="Export Excel BPB (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  // LBB Columns
  const lbbColumns: Column<LBBReportItem>[] = [
    {
      key: "reportNo",
      header: "No. LBB & Tanggal",
      render: (l: LBBReportItem) => (
        <div>
          <div className="font-mono font-bold text-foreground text-xs">{l.reportNo}</div>
          <div className="text-[11px] text-muted-foreground">{l.reportDate}</div>
          {l.bpbNo && (
            <div className="text-[10px] text-slate-600 font-mono">
              Ref BPB: <strong>{l.bpbNo}</strong>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "variant",
      header: "Varian / Sertifikasi",
      render: (l: LBBReportItem) => (
        <div>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-100 text-purple-800">
            {l.variantType} ({l.uom})
          </span>
          <div className="text-[11px] text-slate-600 mt-1">
            Mesh: <strong>{l.meshSize || "-"}</strong> • Mesin: <strong>{l.machineNo || "-"}</strong>
          </div>
          <div className="text-[10px] text-amber-700 font-medium">{l.fairtradeStatus}</div>
        </div>
      ),
    },
    {
      key: "material",
      header: "Bahan Baku & Lot",
      render: (l: LBBReportItem) => (
        <div>
          <div className="font-semibold text-foreground text-xs">{l.productName}</div>
          <div className="font-mono text-[11px] text-slate-700">Kode: {l.materialCode}</div>
          <div className="text-[10px] text-muted-foreground">Supplier: {l.supplierName || "-"}</div>
        </div>
      ),
    },
    {
      key: "weighing",
      header: "Hasil Penimbangan Sak/Jerigen",
      render: (l: LBBReportItem) => (
        <div className="text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Kemasan Terisi:</span>
            <strong className="text-foreground">{l.totalBags} Kemasan</strong>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span>Bruto: {l.totalGrossWeight.toLocaleString("id-ID", { maximumFractionDigits: 2 })} {l.uom}</span>
            {l.totalPlasticTare > 0 && (
              <span>(Tara: {l.totalPlasticTare.toFixed(2)} kg)</span>
            )}
          </div>
          <div className="text-[12px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
            ∑ Netto = {l.totalNetWeight.toLocaleString("id-ID", { maximumFractionDigits: 2 })} {l.uom}
          </div>
        </div>
      ),
    },
    {
      key: "pic",
      header: "Operator & Status",
      render: (l: LBBReportItem) => (
        <div className="text-[11px]">
          <div>Dibuat: <strong>{l.preparedBy || "-"}</strong> ({l.operatorRole})</div>
          <div>Diketahui: {l.acknowledgedBy || "-"}</div>
          <div className="mt-1">
            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
              l.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}>
              {l.status.toUpperCase()}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      align: "right",
      render: (l: LBBReportItem) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEditLBB(l)}
            className="h-7 text-[11px] gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
            title="Edit Timbangan 1..300"
          >
            <Scale className="w-3.5 h-3.5" />
            Timbangan
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => printLBBDocument(l)}
            className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100"
            title="Cetak Formulir LBB (GDG-013-LBB)"
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportLBBExcel(l)}
            className="h-7 w-7 p-0 text-emerald-700 hover:bg-emerald-50"
            title="Export Excel LBB (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </Button>

          {l.status === "draft" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteLBB(l.id)}
              className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
              title="Hapus LBB"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Permintaan & Pengeluaran Bahan Baku (BPB & LBB)"
        description="Ambil Lot Siap Produksi dari SBB (FEFO) → Buat Form BPB (GDG-011-BPB) → Isi Rincian Timbangan Sak/Jerigen LBB (GDG-013-LBB) → ACC Gudang (Potong Stok Lot SBB & Gudang) → Masuk ke Produksi (SPK & Evaluasi Oven BRL-01)."
      >
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "lbb" ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingLbbId(null);
                setFormDataLBB({
                  reportDate: new Date().toISOString().slice(0, 10),
                  variantType: "GSKN",
                  fairtradeStatus: "Fairtrade",
                  productId: products[0]?.id || "",
                  materialCode: availableSbbLots[0]?.batchNo || "",
                  productName: availableSbbLots[0]?.productName || products[0]?.name || "Bahan Baku",
                  supplierName: availableSbbLots[0]?.supplierName || "",
                  customerName: "",
                  machineNo: "",
                  meshSize: "Mesh 16",
                  uom: "KG",
                  plasticTarePerBag: 0.03,
                  operatorRole: "Operator Ayak",
                  preparedBy: "Operator Ayak",
                  acknowledgedBy: "Admin Produksi",
                  notes: "",
                });
                setGridWeights(new Array(300).fill(null));
                setActiveColGroup(1);
                setFormErrorLBB(null);
                setIsOpenLBB(true);
              }}
              className="h-9 gap-1.5 text-xs bg-purple-700 hover:bg-purple-800 text-white"
            >
              <Scale className="h-3.5 w-3.5" />
              + Buat Form LBB (Timbang Rinci)
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => handleOpenCreateBPB()}
              className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              + Buat {activeTab === "packaging" ? "PBPK" : activeTab === "liquid_sugar" ? "LPC" : "BPB"} Baru
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("raw_material")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "raw_material"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Boxes className="h-4 w-4" />
          BPB: Bon Permintaan Bahan Baku (GDG-011-BPB)
          <span className="text-[10px] ml-1 bg-white/20 px-1.5 py-0.2 rounded-full">
            {requisitions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lbb")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "lbb"
              ? "bg-purple-700 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Scale className="h-4 w-4" />
          LBB: Laporan Timbangan 1–300 Sak/Jerigen (GDG-013-LBB)
          <span className="text-[10px] ml-1 bg-white/20 px-1.5 py-0.2 rounded-full">
            {lbbReports.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("packaging")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "packaging"
              ? "bg-slate-700 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Package className="h-4 w-4" />
          PBPK: Barang Kemas (GDG-012-BPK)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("liquid_sugar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "liquid_sugar"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Droplets className="h-4 w-4" />
          LPC: Gula Cair Dispensing (GDG-008-LPC)
        </button>
      </div>

      {/* Main Tab Content */}
      <Card>
        <CardContent className="p-4">
          {activeTab === "lbb" ? (
            <DataTable
              data={lbbReports}
              columns={lbbColumns}
              isLoading={loadingLbb}
              searchPlaceholder="Cari nomor LBB, kode bahan, lot, supplier..."
            />
          ) : (
            <DataTable
              data={requisitions}
              columns={bpbColumns}
              isLoading={loadingReqs}
              searchPlaceholder="Cari nomor BPB, nama bahan, lot, order SPK..."
            />
          )}
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────────────────
          DIALOG: BUAT BPB (BON PERMINTAAN BAHAN BAKU)
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isOpenBPB} onOpenChange={setIsOpenBPB}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Boxes className="h-5 w-5 text-primary" />
              Buat {formDataBPB.requisitionType === "packaging" ? "PBPK" : formDataBPB.requisitionType === "liquid_sugar" ? "LPC" : "Bon Permintaan Bahan Baku (BPB)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitBPB} className="space-y-4">
            {formErrorBPB && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formErrorBPB}</span>
              </div>
            )}

            {/* Header Form Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Kategori Bahan
                </label>
                <select
                  value={formDataBPB.materialCategory}
                  onChange={(e) => setFormDataBPB({ ...formDataBPB, materialCategory: e.target.value })}
                  className={selectCls}
                >
                  <option value="GSKN">GSKN & GCKN (Gula Semut / Cair)</option>
                  <option value="NVCO">NVCO (Virgin Coconut Oil)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Klasifikasi Sertifikasi
                </label>
                <select
                  value={formDataBPB.fairtradeStatus}
                  onChange={(e) => setFormDataBPB({ ...formDataBPB, fairtradeStatus: e.target.value })}
                  className={selectCls}
                >
                  <option value="Fairtrade">Fairtrade</option>
                  <option value="Non-Fairtrade">Non-Fairtrade</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Tanggal Permintaan
                </label>
                <Input
                  type="date"
                  value={formDataBPB.requestDate}
                  onChange={(e) => setFormDataBPB({ ...formDataBPB, requestDate: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Order Produksi / SPK
                </label>
                <select
                  value={formDataBPB.productionOrderId || ""}
                  onChange={(e) => {
                    const picked = productionOrders.find((o) => o.id === e.target.value);
                    setFormDataBPB({
                      ...formDataBPB,
                      productionOrderId: picked ? picked.id : undefined,
                      orderNumber: picked ? picked.orderNumber : "",
                    });
                  }}
                  className={selectCls}
                >
                  <option value="">-- Pilih SPK (Opsional) --</option>
                  {productionOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} ({o.productName} • Qty: {o.quantityToProduce})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Departemen Peminta
                </label>
                <Input
                  value={formDataBPB.department}
                  onChange={(e) => setFormDataBPB({ ...formDataBPB, department: e.target.value })}
                  placeholder="mis. Produksi Ayak"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Dibuat Oleh (PIC Produksi)
                </label>
                <Input
                  value={formDataBPB.requestedBy}
                  onChange={(e) => setFormDataBPB({ ...formDataBPB, requestedBy: e.target.value })}
                  placeholder="mis. Mandor Produksi"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Catatan / Instruksi
                </label>
                <Input
                  value={formDataBPB.notes || ""}
                  onChange={(e) => setFormDataBPB({ ...formDataBPB, notes: e.target.value })}
                  placeholder="mis. Penarikan 20 sak untuk pesanan ekspor"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Line Items Table (Lot SBB Selector) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-primary" />
                  Daftar Lot Bahan Baku (Tarik dari Form Stok Gudang SBB - FEFO)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBPBLine}
                  className="h-7 text-xs gap-1 border-primary text-primary"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Lot
                </Button>
              </div>

              {(formDataBPB.lines || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  Belum ada lot yang dipilih. Klik tombol &quot;Tambah Lot&quot; di atas.
                </div>
              ) : (
                <div className="space-y-3">
                  {(formDataBPB.lines || []).map((line, idx) => {
                    const pickedLot = availableSbbLots.find((l) => l.id === line.rawMaterialStockId);
                    const avail = pickedLot ? pickedLot.qtyRemaining - (pickedLot.qtyReserved || 0) : 0;
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 shadow-xs"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                          <div className="md:col-span-6">
                            <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                              Pilih Lot SBB Tersedia (FEFO)
                            </label>
                            <select
                              value={line.rawMaterialStockId || ""}
                              onChange={(e) => handleLotSelect(idx, e.target.value)}
                              className={selectCls}
                              required
                            >
                              <option value="">-- Pilih Lot Bahan Baku dari Gudang --</option>
                              {availableSbbLots.map((l) => {
                                const sisa = l.qtyRemaining - (l.qtyReserved || 0);
                                return (
                                  <option key={l.id} value={l.id}>
                                    [{l.batchNo}] {l.productName} • Sisa: {sisa.toFixed(1)} {l.uom} ({l.remainingPackages} {l.packageUnit}) • Rak: {l.rackLocation || "-"} • KA: {l.moistureContent != null ? l.moistureContent + "%" : "-"}
                                  </option>
                                );
                              })}
                            </select>
                            {pickedLot && (
                              <div className="text-[10px] text-emerald-700 mt-1">
                                Saldo Tersedia: <strong>{avail.toFixed(2)} {pickedLot.uom}</strong> (Tersimpan di Rak: {pickedLot.rackLocation || "-"}/Pallet: {pickedLot.palletNo || "-"})
                              </div>
                            )}
                          </div>

                          <div className="md:col-span-3">
                            <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                              Jumlah Diminta ({line.uom || "KG"})
                            </label>
                            <Input
                              type="number"
                              step="any"
                              value={line.quantityRequested || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setFormDataBPB((prev) => {
                                  const nextLines = [...(prev.lines || [])];
                                  nextLines[idx] = {
                                    ...nextLines[idx],
                                    quantityRequested: val,
                                    quantityIssued: val,
                                  };
                                  return { ...prev, lines: nextLines };
                                });
                              }}
                              className="h-9 text-xs"
                              placeholder="0.00"
                              required
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                              Jumlah Kemasan ({line.packageUnit || "Sak"})
                            </label>
                            <Input
                              type="number"
                              value={line.packageCountRequested || ""}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setFormDataBPB((prev) => {
                                  const nextLines = [...(prev.lines || [])];
                                  nextLines[idx] = {
                                    ...nextLines[idx],
                                    packageCountRequested: val,
                                    packageCountIssued: val,
                                  };
                                  return { ...prev, lines: nextLines };
                                });
                              }}
                              className="h-9 text-xs"
                              placeholder="0"
                            />
                          </div>

                          <div className="md:col-span-1 pt-6 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBPBLine(idx)}
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Extra metadata preview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-slate-50 p-2 rounded border border-slate-100">
                          <div>Kode Batch: <strong className="font-mono">{line.batchNo || "-"}</strong></div>
                          <div>Supplier: <strong>{line.supplierName || "-"}</strong></div>
                          <div>Kadar Air: <strong>{line.moistureContent != null ? line.moistureContent + "%" : "-"}</strong></div>
                          <div>Ref Kedatangan: <strong>{line.arrivalDateRef || "-"}</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpenBPB(false)}
                disabled={isSubmittingBPB}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmittingBPB} className="gap-1.5 bg-primary text-white">
                <CheckCircle2 className="w-4 h-4" />
                {isSubmittingBPB ? "Menyimpan & Me-reserve..." : "Simpan Form BPB"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────────
          DIALOG: EDITOR LBB (LAPORAN PERMINTAAN BAHAN BAKU — 1..300 GRID WEIGHING)
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isOpenLBB} onOpenChange={setIsOpenLBB}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Scale className="h-5 w-5 text-purple-700" />
              Formulir Penimbangan LBB (GDG-013-LBB) — Kapasitas 1 s/d 300 Kemasan
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitLBB} className="space-y-4">
            {formErrorLBB && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formErrorLBB}</span>
              </div>
            )}

            {/* Header Metadata LBB */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-purple-50/50 p-3 rounded-lg border border-purple-200">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Varian Komoditas
                </label>
                <select
                  value={formDataLBB.variantType}
                  onChange={(e) => {
                    const v = e.target.value;
                    const isV = v === "VCO";
                    setFormDataLBB({
                      ...formDataLBB,
                      variantType: v,
                      uom: isV ? "L" : "KG",
                      plasticTarePerBag: isV ? 0 : 0.03,
                      operatorRole: isV ? "Operator Filling" : "Operator Ayak",
                      preparedBy: isV ? "Operator Filling" : "Operator Ayak",
                    });
                  }}
                  className={selectCls}
                >
                  <option value="GSKN">GSKN (Gula Semut - kg)</option>
                  <option value="VCO">VCO (Minyak Kelapa - L)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Tanggal LBB
                </label>
                <Input
                  type="date"
                  value={formDataLBB.reportDate}
                  onChange={(e) => setFormDataLBB({ ...formDataLBB, reportDate: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Kode Bahan / Batch
                </label>
                <Input
                  value={formDataLBB.materialCode}
                  onChange={(e) => setFormDataLBB({ ...formDataLBB, materialCode: e.target.value })}
                  placeholder="mis. 18O12KP"
                  className="h-9 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Nama Barang
                </label>
                <Input
                  value={formDataLBB.productName}
                  onChange={(e) => setFormDataLBB({ ...formDataLBB, productName: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  No. Mesin & Mesh
                </label>
                <div className="flex gap-1.5">
                  <Input
                    value={formDataLBB.machineNo || ""}
                    onChange={(e) => setFormDataLBB({ ...formDataLBB, machineNo: e.target.value })}
                    placeholder="Mesin 1"
                    className="h-9 text-xs"
                  />
                  <Input
                    value={formDataLBB.meshSize || ""}
                    onChange={(e) => setFormDataLBB({ ...formDataLBB, meshSize: e.target.value })}
                    placeholder="Mesh 16"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Suplier / Kelompok Tani
                </label>
                <Input
                  value={formDataLBB.supplierName || ""}
                  onChange={(e) => setFormDataLBB({ ...formDataLBB, supplierName: e.target.value })}
                  placeholder="Kelompok Tani..."
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Customer
                </label>
                <Input
                  value={formDataLBB.customerName || ""}
                  onChange={(e) => setFormDataLBB({ ...formDataLBB, customerName: e.target.value })}
                  placeholder="Ekspor / Lokal..."
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Tara Plastik per Kemasan ({formDataLBB.uom})
                </label>
                <Input
                  type="number"
                  step="any"
                  disabled={formDataLBB.variantType === "VCO"}
                  value={formDataLBB.plasticTarePerBag || 0}
                  onChange={(e) =>
                    setFormDataLBB({
                      ...formDataLBB,
                      plasticTarePerBag: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-9 text-xs font-mono"
                  placeholder="0.03"
                />
              </div>
            </div>

            {/* Quick Generator Toolbar */}
            <div className="bg-slate-100 p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Isi Cepat (Generator):</span>
                <span className="text-muted-foreground">Jml Kemasan:</span>
                <Input
                  type="number"
                  min="1"
                  max="300"
                  value={quickBagCount}
                  onChange={(e) => setQuickBagCount(parseInt(e.target.value) || 1)}
                  className="h-7 w-16 text-xs text-center"
                />
                <span className="text-muted-foreground">Berat Standar ({formDataLBB.uom}):</span>
                <Input
                  type="number"
                  step="any"
                  value={quickStandardWeight}
                  onChange={(e) => setQuickStandardWeight(parseFloat(e.target.value) || 0)}
                  className="h-7 w-20 text-xs text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleQuickFill}
                  className="h-7 text-xs bg-white hover:bg-slate-50"
                >
                  Generate 1..{quickBagCount}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearGrid}
                  className="h-7 text-xs text-rose-600 hover:bg-rose-50 gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Kosongkan Grid
                </Button>
              </div>
            </div>

            {/* Summary Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-muted-foreground">Kemasan Terisi</div>
                <div className="text-base font-bold text-slate-800">{calculatedLBB.filledCount} Sak</div>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-muted-foreground">Total Bruto</div>
                <div className="text-base font-bold text-slate-800">
                  {calculatedLBB.totalGross.toFixed(2)} {formDataLBB.uom}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-muted-foreground">Potongan Tara Plastik</div>
                <div className="text-base font-bold text-amber-700">
                  {calculatedLBB.plasticTare.toFixed(3)} {formDataLBB.uom}
                </div>
              </div>
              <div className="p-2 rounded bg-emerald-50 border border-emerald-300">
                <div className="text-[10px] text-emerald-800 font-semibold">∑ = Total Netto Masuk Produksi</div>
                <div className="text-base font-black text-emerald-700">
                  {calculatedLBB.totalNet.toFixed(2)} {formDataLBB.uom}
                </div>
              </div>
            </div>

            {/* 6 Parallel Column Groups Navigator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <span className="text-xs font-bold text-slate-700">
                  Pilih Grup Kolom Penimbangan (50 Baris per Grup):
                </span>
                <div className="flex gap-1">
                  {[
                    { grp: 1, range: "1–50" },
                    { grp: 2, range: "51–100" },
                    { grp: 3, range: "101–150" },
                    { grp: 4, range: "151–200" },
                    { grp: 5, range: "201–250" },
                    { grp: 6, range: "251–300" },
                  ].map((tab) => {
                    const sub = calculatedLBB.colSubtotals[tab.grp - 1];
                    return (
                      <button
                        key={tab.grp}
                        type="button"
                        onClick={() => setActiveColGroup(tab.grp)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                          activeColGroup === tab.grp
                            ? "bg-purple-700 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Kolom {tab.grp} ({tab.range})
                        {sub > 0 && <span className="ml-1 text-[10px] opacity-80">{sub.toFixed(0)}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid 50 Rows of the active column group */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-xs flex justify-between items-center">
                  <span>
                    Grup Kolom {activeColGroup} (Nomor {(activeColGroup - 1) * 50 + 1} s/d {activeColGroup * 50}) — Kode Lot: {formDataLBB.materialCode || "-"}
                  </span>
                  <span className="text-purple-800 font-mono">
                    Subtotal Kolom: {calculatedLBB.colSubtotals[activeColGroup - 1].toFixed(2)} {formDataLBB.uom}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-1.5 p-2.5 bg-white max-h-[350px] overflow-y-auto">
                  {Array.from({ length: 50 }).map((_, rIdx) => {
                    const bagIdx = (activeColGroup - 1) * 50 + rIdx;
                    const bagNum = bagIdx + 1;
                    const currentWeight = gridWeights[bagIdx];
                    return (
                      <div key={bagNum} className="flex flex-col border border-slate-200 rounded p-1 bg-slate-50/50">
                        <span className="text-[10px] font-bold text-slate-600 text-center">
                          #{bagNum}
                        </span>
                        <Input
                          type="number"
                          step="any"
                          value={currentWeight != null ? currentWeight : ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseFloat(e.target.value);
                            setGridWeights((prev) => {
                              const copy = [...prev];
                              copy[bagIdx] = val;
                              return copy;
                            });
                          }}
                          placeholder="-"
                          className="h-7 text-xs text-center font-mono p-0 bg-white"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Signoffs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Dibuat Oleh ({formDataLBB.operatorRole || "Operator Ayak"})
                </label>
                <Input
                  value={formDataLBB.preparedBy || ""}
                  onChange={(e) => setFormDataLBB({ ...formDataLBB, preparedBy: e.target.value })}
                  placeholder="Nama Operator..."
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Diketahui Oleh (Admin Produksi)
                </label>
                <Input
                  value={formDataLBB.acknowledgedBy || ""}
                  onChange={(e) => setFormDataLBB({ ...formDataLBB, acknowledgedBy: e.target.value })}
                  placeholder="Nama Admin Produksi..."
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpenLBB(false)}
                disabled={isSubmittingLBB}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmittingLBB} className="gap-1.5 bg-purple-700 hover:bg-purple-800 text-white">
                <CheckCircle2 className="w-4 h-4" />
                {isSubmittingLBB ? "Menyimpan Data Timbangan..." : "Simpan LBB & Sinkron ke BPB"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────────
          DIALOG: ACC GUDANG (MANAGER GUDANG)
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(accTarget)} onOpenChange={(open) => !open && setAccTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-800">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              ACC Gudang — Pengeluaran Bahan Baku
            </DialogTitle>
          </DialogHeader>

          {accTarget && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                <div className="font-bold text-emerald-950 text-sm">{accTarget.requestNo}</div>
                <div>Departemen: <strong>{accTarget.department}</strong> • Peminta: <strong>{accTarget.requestedBy}</strong></div>
                <div>Tanggal: {accTarget.requestDate}</div>
              </div>

              <div className="border rounded-lg p-2.5 space-y-1.5 bg-slate-50">
                <div className="font-semibold text-slate-700">Rincian Stok yang Akan Dipotong:</div>
                {(accTarget.lines || []).map((l, i) => {
                  const qty = l.quantityIssued > 0 ? l.quantityIssued : l.quantityRequested;
                  const pkgs = (l.packageCountIssued && l.packageCountIssued > 0) ? l.packageCountIssued : l.packageCountRequested;
                  return (
                    <div key={i} className="flex justify-between border-b pb-1 text-slate-800">
                      <span>
                        {l.productName} (Lot: <code>{l.batchNo}</code>)
                      </span>
                      <strong>
                        {qty.toLocaleString("id-ID")} {l.uom} {pkgs ? `(${pkgs} ${l.packageUnit || "Sak"})` : ""}
                      </strong>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Manager Gudang (PIC ACC)
                </label>
                <Input
                  value={accApprover}
                  onChange={(e) => setAccApprover(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Catatan Pengeluaran Gudang
                </label>
                <Input
                  value={accNotes}
                  onChange={(e) => setAccNotes(e.target.value)}
                  placeholder="mis. Diserahkan ke operator ayak pada jam 08:30"
                  className="h-9 text-xs"
                />
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                <strong>Perhatian:</strong> Saldo sisa pada lot SBB dan kartu stok gudang akan dipotong secara permanen dan status BPB menjadi <em>warehouse_approved</em>.
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAccTarget(null)}
              disabled={isSubmittingAcc}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAcc}
              disabled={isSubmittingAcc}
              className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmittingAcc ? "Memotong Stok..." : "Setujui & Potong Stok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────────
          DIALOG: MASUK KE PRODUKSI (PENYERAHAN & EVALUASI OVEN BRL-01)
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(prodTarget)} onOpenChange={(open) => !open && setProdTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-indigo-900">
              <ArrowRight className="w-5 h-5 text-indigo-700" />
              Masuk ke Lini Produksi & Ketertelusuran
            </DialogTitle>
          </DialogHeader>

          {prodTarget && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-1">
                <div className="font-bold text-indigo-950 text-sm">{prodTarget.requestNo}</div>
                <div>SPK Terhubung: <strong>{prodTarget.orderNumber || "Belum ada SPK terhubung"}</strong></div>
              </div>

              {/* Moisture Content Rule BRL-01 Check */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  Pemeriksaan Kadar Air (Aturan BRL-01):
                </div>
                {(prodTarget.lines || []).map((l, i) => (
                  <div key={i} className="text-[11px] flex items-center justify-between border-b pb-1">
                    <span>{l.productName} ({l.batchNo})</span>
                    {l.moistureContent != null ? (
                      <span className={`font-bold ${l.moistureContent <= 2.0 ? "text-emerald-700" : "text-amber-700"}`}>
                        KA: {l.moistureContent}% ({l.moistureContent <= 2.0 ? "≤ 2.0% • Skip Oven" : "> 2.0% • Wajib Oven LHO"})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Diterima di Produksi Oleh (PIC Produksi)
                </label>
                <Input
                  value={prodEnteredBy}
                  onChange={(e) => setProdEnteredBy(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Catatan Penyerahan ke Lini
                </label>
                <Input
                  value={prodNotes}
                  onChange={(e) => setProdNotes(e.target.value)}
                  placeholder="mis. Diterima di stasiun pengayakan 1"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setProdTarget(null)}
              disabled={isSubmittingProd}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmProd}
              disabled={isSubmittingProd}
              className="gap-1.5 bg-indigo-700 hover:bg-indigo-800 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmittingProd ? "Memproses..." : "Konfirmasi Masuk Produksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────────
          DIALOG: TOLAK PERMINTAAN (REJECT)
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-800">
              <XCircle className="w-5 h-5 text-rose-700" />
              Tolak Permintaan Bahan Baku
            </DialogTitle>
          </DialogHeader>

          {rejectTarget && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Apakah Anda yakin ingin menolak permohonan <strong>{rejectTarget.requestNo}</strong>?
                Stok lot SBB yang sebelumnya di-reserve akan dilepaskan kembali menjadi saldo siap produksi.
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Alasan Penolakan
                </label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="mis. Salah pilih nomor lot atau SPK dibatalkan"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={isSubmittingReject}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmReject}
              disabled={isSubmittingReject}
              className="gap-1.5 bg-rose-700 hover:bg-rose-800 text-white"
            >
              <XCircle className="w-4 h-4" />
              {isSubmittingReject ? "Menolak..." : "Tolak Permintaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
