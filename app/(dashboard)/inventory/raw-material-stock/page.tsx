"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Warehouse as WarehouseIcon,
  Plus,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  ShieldCheck,
  Tag,
  Ban,
  PackageCheck,
  Leaf,
  Clock,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Layers,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { errText } from "@/components/reports/report-ui";
import { useNavigationAccess } from "@/providers/navigation-access";
import { useAppStore } from "@/stores/app-store";
import { inventoryApi, WarehouseItem } from "@/lib/api/inventory";
import { productsApi, ProductItem, isProductActive } from "@/lib/api/products";
import { procurementApi, GoodsReceiptItem } from "@/lib/api/procurement";
import {
  rawMaterialStockApi,
  RawMaterialStockItem,
  RawMaterialStockSummary,
  LBMInboundContext,
  CreateRawMaterialStockInput,
  RawStockSourceType,
} from "@/lib/api/raw-material-stock";
import { exportSBBToExcel } from "@/lib/utils/export-sbb-excel";
import { printSBBForm, printPalletTag } from "@/lib/utils/print-sbb-document";

const selectCls =
  "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

const STORAGE_ZONES = [
  "Zona Organik",
  "Zona Konvensional",
  "Zona Karantina",
  "Zona Cair / VCO",
  "Zona Bahan Kemas",
];

const PACKAGE_UNITS = ["Sak", "Karung", "Jerigen", "Drum", "Box", "Pcs"];
const QUALITY_GRADES = ["Grade A", "Grade B", "Standar", "Reject"];
const STORAGE_CONDITIONS = ["Suhu Ruang Kering", "Ruang Sejuk", "Karantina"];

const STATUS_BADGE_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  available: { label: "Siap Produksi", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  quarantine: { label: "Karantina", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  depleted: { label: "Habis Terpakai", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  rejected: { label: "Ditolak", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  voided: { label: "Void", cls: "bg-slate-100 text-slate-500 border-slate-200 line-through" },
};

const QC_PILL_STYLE: Record<string, { label: string; cls: string }> = {
  cleared: { label: "Lolos", cls: "bg-emerald-100 text-emerald-800" },
  passed: { label: "Lolos", cls: "bg-emerald-100 text-emerald-800" },
  flagged: { label: "Catatan", cls: "bg-amber-100 text-amber-800" },
  conditional: { label: "Syarat", cls: "bg-amber-100 text-amber-800" },
  partial: { label: "Sebagian", cls: "bg-amber-100 text-amber-800" },
  rejected: { label: "Reject", cls: "bg-rose-100 text-rose-800" },
  failed: { label: "Gagal", cls: "bg-rose-100 text-rose-800" },
  missing: { label: "Belum", cls: "bg-slate-100 text-slate-500" },
  not_applicable: { label: "N/A", cls: "bg-slate-50 text-slate-400" },
};

const EVENT_LABELS: Record<string, string> = {
  putaway: "Masuk Gudang (Put-Away)",
  qc_reject: "Reject QC",
  quarantine_release: "Rilis Karantina",
  location_update: "Pindah Lokasi Rak/Pallet",
  bpb_reserve: "Alokasi BPB",
  bpb_issue: "Diambil Produksi (BPB/LBB)",
  production_return: "Retur Produksi",
  void: "Pembatalan (Void)",
};

function RawMaterialStockContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser } = useAppStore();
  const { canCreate, canEdit, canDelete, canApprove } = useNavigationAccess();

  const initialGrId = searchParams.get("goodsReceiptId") || "";
  const initialLbmNo = searchParams.get("lbmNo") || "";

  const allowCreate = canCreate("inventory");
  const allowEdit = canEdit("inventory");
  const allowDelete = canDelete("inventory");
  const allowApprove = canApprove("inventory");

  // Master & list state
  const [entries, setEntries] = React.useState<RawMaterialStockItem[]>([]);
  const [summary, setSummary] = React.useState<RawMaterialStockSummary | null>(null);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [receipts, setReceipts] = React.useState<GoodsReceiptItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = React.useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterWarehouse, setFilterWarehouse] = React.useState<string>("");
  const [filterZone, setFilterZone] = React.useState<string>("all");
  const [filterOrganic, setFilterOrganic] = React.useState<string>("all");
  const [searchText, setSearchText] = React.useState<string>(initialLbmNo);

  // Create / Edit modal state
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<RawMaterialStockItem | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // LBM context state inside Create modal
  const [selectedGrId, setSelectedGrId] = React.useState<string>("");
  const [selectedLineIdx, setSelectedLineIdx] = React.useState<number>(0);
  const [lbmContext, setLbmContext] = React.useState<LBMInboundContext | null>(null);
  const [loadingLbmCtx, setLoadingLbmCtx] = React.useState(false);

  // Detail & Kartu Mutasi modal
  const [detailItem, setDetailItem] = React.useState<RawMaterialStockItem | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  // Release Quarantine modal
  const [releaseTarget, setReleaseTarget] = React.useState<RawMaterialStockItem | null>(null);
  const [releaseDecision, setReleaseDecision] = React.useState<"available" | "rejected">("available");
  const [releaseNotes, setReleaseNotes] = React.useState("");
  const [isReleasing, setIsReleasing] = React.useState(false);

  // Void modal
  const [voidTarget, setVoidTarget] = React.useState<RawMaterialStockItem | null>(null);
  const [voidReason, setVoidReason] = React.useState("");
  const [isVoiding, setIsVoiding] = React.useState(false);

  const defaultFormState = React.useCallback(
    (): CreateRawMaterialStockInput => ({
      entryDate: new Date().toISOString().slice(0, 10),
      sourceType: "lbm",
      goodsReceiptId: undefined,
      lbmNo: "",
      poNo: "",
      deliveryNoteNo: "",
      supplierName: "",
      productId: products[0]?.id || "",
      productSku: products[0]?.sku || "",
      productName: products[0]?.name || "",
      batchNo: "",
      casStatus: "missing",
      pbdStatus: "missing",
      pbkStatus: "missing",
      moistureContent: undefined,
      brixValue: undefined,
      meshSize: "",
      qcRecommendation: "",
      organicStatus: "Organik",
      halalStatus: "Halal",
      kosherStatus: "Kosher",
      certifications: "",
      qualityGrade: "Standar",
      uom: "KG",
      packageUnit: "Sak",
      qtyLbm: 0,
      qtyReceived: 0,
      qtyRejected: 0,
      totalPackages: 0,
      warehouseId: warehouses[0]?.id || "",
      storageZone: "Zona Organik",
      rackLocation: "",
      palletNo: "",
      productionDate: "",
      expiryDate: "",
      storageCondition: "Suhu Ruang Kering",
      handedOverBy: "",
      receivedBy: currentUser?.name || currentUser?.email || "",
      notes: "",
      postImmediately: true,
      targetStatus: "available",
    }),
    [products, warehouses, currentUser]
  );

  const [formData, setFormData] = React.useState<CreateRawMaterialStockInput>(defaultFormState);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [listRes, sumRes] = await Promise.all([
        rawMaterialStockApi.list({
          status: filterStatus !== "all" ? filterStatus : undefined,
          warehouseId: filterWarehouse || undefined,
          storageZone: filterZone !== "all" ? filterZone : undefined,
          organicStatus: filterOrganic !== "all" ? filterOrganic : undefined,
        }),
        rawMaterialStockApi.getSummary(filterWarehouse || undefined),
      ]);
      setEntries(listRes.data || []);
      setSummary(sumRes.data || null);
    } catch (err) {
      setErrorMsg(errText(err, "Gagal memuat data Stok Gudang Bahan Baku."));
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterWarehouse, filterZone, filterOrganic]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Load reference master data once
  React.useEffect(() => {
    Promise.all([
      inventoryApi.listWarehouses({ perPage: 100 }).catch(() => ({ data: [] })),
      productsApi.list({ perPage: 500 }).catch(() => ({ data: [] })),
      procurementApi.listGoodsReceipts({ perPage: 100 }).catch(() => ({ data: [] })),
    ]).then(([whRes, prodRes, grRes]) => {
      setWarehouses(whRes.data || []);
      setProducts((prodRes.data || []).filter(isProductActive));
      setReceipts(grRes.data || []);
    });
  }, []);

  // Apply selected LBM line into form state
  const applyLbmContextToForm = React.useCallback(
    (ctx: LBMInboundContext, lineIndex: number) => {
      const line = ctx.lines[lineIndex] || ctx.lines[0];
      const pbd = ctx.pbd;
      const orgRaw = (line?.organicType || "").toLowerCase();
      const organicStatus = orgRaw.includes("konven") || orgRaw.includes("natural")
        ? "Konvensional"
        : orgRaw.includes("transisi")
        ? "Transisi"
        : "Organik";
      const defaultZone =
        ctx.recommendedStatus === "quarantine" || ctx.recommendedStatus === "rejected"
          ? "Zona Karantina"
          : organicStatus === "Organik"
          ? "Zona Organik"
          : "Zona Konvensional";

      const lbmNet = line?.weightNet || pbd?.netWeight || 0;
      const acceptedQty = pbd && pbd.acceptedWeight > 0 ? pbd.acceptedWeight : lbmNet;
      const rejectedQty = pbd?.rejectedWeight || 0;
      const pkgCount =
        line && line.bagCount > 0
          ? line.bagCount
          : pbd && pbd.totalBags > 0
          ? pbd.totalBags
          : line && line.packageSize > 0
          ? Math.ceil(acceptedQty / line.packageSize)
          : 0;

      const uom = line?.uom || "KG";
      const pkgUnit = uom.toUpperCase() === "L" || uom.toUpperCase() === "LITER" ? "Jerigen" : "Sak";

      setFormData((prev) => ({
        ...prev,
        sourceType: "lbm",
        goodsReceiptId: ctx.goodsReceiptId,
        lbmNo: ctx.lbmNo,
        poNo: ctx.poNo || "",
        deliveryNoteNo: ctx.deliveryNoteNo || "",
        supplierId: ctx.supplierId,
        supplierName: ctx.supplierName || "",
        productId: line?.productId || prev.productId,
        productSku: line?.productSku || "",
        productName: line?.productName || pbd?.productName || "",
        batchNo: line?.lotNumber || pbd?.batchNo || prev.batchNo,
        casCheckId: ctx.cas?.id,
        casStatus: ctx.casStatus,
        pbdCheckId: ctx.pbd?.id,
        pbdStatus: ctx.pbdStatus,
        pbkCheckId: ctx.pbk?.id,
        pbkStatus: ctx.pbkStatus,
        moistureContent: pbd?.moistureContent,
        brixValue: pbd?.brixValue,
        meshSize: pbd?.meshSize || "",
        qcRecommendation: pbd?.recommendedAction || "",
        organicStatus,
        certifications: line?.certifications || prev.certifications,
        uom,
        packageUnit: pkgUnit,
        qtyLbm: lbmNet,
        qtyReceived: acceptedQty,
        qtyRejected: rejectedQty,
        totalPackages: pkgCount,
        warehouseId: ctx.warehouseId || prev.warehouseId,
        storageZone: defaultZone,
        handedOverBy: pbd?.qcName || ctx.cas?.qcName || prev.handedOverBy,
        targetStatus:
          ctx.recommendedStatus === "available"
            ? "available"
            : ctx.recommendedStatus === "rejected"
            ? "rejected"
            : "quarantine",
      }));
    },
    []
  );

  // Fetch LBM context whenever user selects an LBM
  const fetchAndApplyLbmContext = React.useCallback(
    async (grId: string) => {
      if (!grId) {
        setLbmContext(null);
        return;
      }
      setLoadingLbmCtx(true);
      setFormError(null);
      try {
        const res = await rawMaterialStockApi.getLbmContext(grId);
        if (res.data) {
          setLbmContext(res.data);
          setSelectedLineIdx(0);
          applyLbmContextToForm(res.data, 0);
        }
      } catch (err) {
        setFormError(errText(err, "Gagal mengambil konteks LBM & 3 Form QC."));
      } finally {
        setLoadingLbmCtx(false);
      }
    },
    [applyLbmContextToForm]
  );

  // Auto-open form when arriving from Detail LBM (?goodsReceiptId=...)
  const autoOpenedRef = React.useRef(false);
  React.useEffect(() => {
    if (initialGrId && !autoOpenedRef.current && allowCreate) {
      autoOpenedRef.current = true;
      setEditTarget(null);
      setFormData(defaultFormState());
      setSelectedGrId(initialGrId);
      setIsFormOpen(true);
      fetchAndApplyLbmContext(initialGrId);
    }
  }, [initialGrId, allowCreate, defaultFormState, fetchAndApplyLbmContext]);

  const handleOpenCreate = () => {
    setEditTarget(null);
    setLbmContext(null);
    setSelectedGrId("");
    setSelectedLineIdx(0);
    setFormData(defaultFormState());
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: RawMaterialStockItem) => {
    setEditTarget(item);
    setLbmContext(null);
    setSelectedGrId(item.goodsReceiptId || "");
    setFormData({
      entryDate: item.entryDate,
      sourceType: item.sourceType,
      goodsReceiptId: item.goodsReceiptId,
      lbmNo: item.lbmNo || "",
      poNo: item.poNo || "",
      deliveryNoteNo: item.deliveryNoteNo || "",
      supplierId: item.supplierId,
      supplierName: item.supplierName || "",
      productId: item.productId,
      productSku: item.productSku,
      productName: item.productName,
      batchNo: item.batchNo,
      casCheckId: item.casCheckId,
      casStatus: item.casStatus,
      pbdCheckId: item.pbdCheckId,
      pbdStatus: item.pbdStatus,
      pbkCheckId: item.pbkCheckId,
      pbkStatus: item.pbkStatus,
      moistureContent: item.moistureContent,
      brixValue: item.brixValue,
      meshSize: item.meshSize || "",
      qcRecommendation: item.qcRecommendation || "",
      organicStatus: item.organicStatus,
      halalStatus: item.halalStatus,
      kosherStatus: item.kosherStatus,
      certifications: item.certifications || "",
      qualityGrade: item.qualityGrade,
      uom: item.uom,
      packageUnit: item.packageUnit,
      qtyLbm: item.qtyLbm,
      qtyReceived: item.qtyReceived,
      qtyRejected: item.qtyRejected,
      totalPackages: item.totalPackages,
      warehouseId: item.warehouseId,
      storageZone: item.storageZone,
      rackLocation: item.rackLocation || "",
      palletNo: item.palletNo || "",
      productionDate: item.productionDate || "",
      expiryDate: item.expiryDate || "",
      storageCondition: item.storageCondition,
      handedOverBy: item.handedOverBy || "",
      receivedBy: item.receivedBy || "",
      notes: item.notes || "",
      postImmediately: false,
      targetStatus: "available",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (item: RawMaterialStockItem) => {
    setDetailItem(item);
    setLoadingDetail(true);
    try {
      const res = await rawMaterialStockApi.getById(item.id);
      if (res.data) setDetailItem(res.data);
    } catch {
      // keep shallow item
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmitForm = async (postNow: boolean) => {
    if (!formData.productId) {
      setFormError("Produk bahan baku wajib dipilih.");
      return;
    }
    if (!formData.warehouseId) {
      setFormError("Gudang tujuan wajib dipilih.");
      return;
    }
    if (!formData.batchNo.trim()) {
      setFormError("Kode Bahan Baku / Nomor Lot (Batch) wajib diisi.");
      return;
    }
    if ((formData.qtyReceived || 0) <= 0 && (formData.qtyRejected || 0) <= 0) {
      setFormError("Qty diterima atau ditolak harus lebih dari 0.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editTarget) {
        await rawMaterialStockApi.update(editTarget.id, {
          entryDate: formData.entryDate,
          batchNo: formData.batchNo,
          pbkStatus: formData.pbkStatus,
          moistureContent: formData.moistureContent,
          brixValue: formData.brixValue,
          meshSize: formData.meshSize,
          qcRecommendation: formData.qcRecommendation,
          organicStatus: formData.organicStatus,
          halalStatus: formData.halalStatus,
          kosherStatus: formData.kosherStatus,
          certifications: formData.certifications,
          qualityGrade: formData.qualityGrade,
          uom: formData.uom,
          packageUnit: formData.packageUnit,
          qtyLbm: formData.qtyLbm,
          qtyReceived: formData.qtyReceived,
          qtyRejected: formData.qtyRejected,
          totalPackages: formData.totalPackages,
          warehouseId: formData.warehouseId,
          storageZone: formData.storageZone,
          rackLocation: formData.rackLocation,
          palletNo: formData.palletNo,
          productionDate: formData.productionDate,
          expiryDate: formData.expiryDate,
          storageCondition: formData.storageCondition,
          handedOverBy: formData.handedOverBy,
          receivedBy: formData.receivedBy,
          notes: formData.notes,
        });
        if (postNow && editTarget.status === "draft") {
          await rawMaterialStockApi.post(editTarget.id, {
            targetStatus: formData.targetStatus,
            approvedBy: currentUser?.name || currentUser?.email || "",
            notes: formData.notes,
          });
          setNoticeMsg(`Form ${editTarget.entryNo} berhasil diperbarui & diposting ke gudang.`);
        } else {
          setNoticeMsg(`Form ${editTarget.entryNo} berhasil diperbarui.`);
        }
      } else {
        const res = await rawMaterialStockApi.create({
          ...formData,
          postImmediately: postNow,
        });
        setNoticeMsg(
          postNow
            ? `Form ${res.data?.entryNo || "SBB"} berhasil dibuat & diposting ke Stok Gudang Bahan Baku!`
            : `Draft Form ${res.data?.entryNo || "SBB"} berhasil disimpan.`
        );
      }
      setIsFormOpen(false);
      await loadData();
    } catch (err) {
      setFormError(errText(err, "Gagal menyimpan Form Stok Gudang Bahan Baku."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPost = async (item: RawMaterialStockItem) => {
    const rec =
      item.sourceType === "lbm" &&
      (item.pbdStatus === "rejected" || item.casStatus === "rejected")
        ? "rejected"
        : item.sourceType === "lbm" &&
          (item.pbdStatus === "missing" ||
            item.casStatus === "missing" ||
            item.pbdStatus === "conditional" ||
            item.casStatus === "flagged" ||
            item.pbkStatus === "failed")
        ? "quarantine"
        : "available";

    const ok = window.confirm(
      `Posting dokumen ${item.entryNo} (${item.batchNo}) ke gudang dengan status "${STATUS_BADGE_MAP[rec]?.label || rec}"?`
    );
    if (!ok) return;

    setErrorMsg(null);
    try {
      await rawMaterialStockApi.post(item.id, {
        targetStatus: rec as "available" | "quarantine" | "rejected",
        approvedBy: currentUser?.name || currentUser?.email || "",
      });
      setNoticeMsg(`Dokumen ${item.entryNo} berhasil diposting ke status ${STATUS_BADGE_MAP[rec]?.label}.`);
      await loadData();
    } catch (err) {
      setErrorMsg(errText(err, "Gagal memposting dokumen SBB."));
    }
  };

  const handleDeleteDraft = async (item: RawMaterialStockItem) => {
    if (!window.confirm(`Hapus draft ${item.entryNo}?`)) return;
    try {
      await rawMaterialStockApi.delete(item.id);
      setNoticeMsg(`Draft ${item.entryNo} dihapus.`);
      await loadData();
    } catch (err) {
      setErrorMsg(errText(err, "Gagal menghapus draft."));
    }
  };

  const handleConfirmRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseTarget || !releaseNotes.trim()) return;
    setIsReleasing(true);
    try {
      await rawMaterialStockApi.releaseQuarantine(releaseTarget.id, {
        decision: releaseDecision,
        approvedBy: currentUser?.name || currentUser?.email || "",
        notes: releaseNotes.trim(),
      });
      setNoticeMsg(
        `Lot ${releaseTarget.batchNo} berhasil dirilis dari karantina -> ${
          releaseDecision === "available" ? "Siap Produksi" : "Ditolak"
        }.`
      );
      setReleaseTarget(null);
      setReleaseNotes("");
      await loadData();
    } catch (err) {
      setErrorMsg(errText(err, "Gagal memproses rilis karantina."));
    } finally {
      setIsReleasing(false);
    }
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget || !voidReason.trim()) return;
    setIsVoiding(true);
    try {
      await rawMaterialStockApi.void(voidTarget.id, voidReason.trim());
      setNoticeMsg(`Dokumen ${voidTarget.entryNo} berhasil di-void.`);
      setVoidTarget(null);
      setVoidReason("");
      await loadData();
    } catch (err) {
      setErrorMsg(errText(err, "Gagal membatalkan (void) dokumen."));
    } finally {
      setIsVoiding(false);
    }
  };

  // Client-side search filter
  const filteredEntries = React.useMemo(() => {
    if (!searchText.trim()) return entries;
    const q = searchText.toLowerCase();
    return entries.filter(
      (e) =>
        e.entryNo.toLowerCase().includes(q) ||
        e.batchNo.toLowerCase().includes(q) ||
        e.productName.toLowerCase().includes(q) ||
        (e.productSku && e.productSku.toLowerCase().includes(q)) ||
        (e.lbmNo && e.lbmNo.toLowerCase().includes(q)) ||
        (e.supplierName && e.supplierName.toLowerCase().includes(q)) ||
        (e.rackLocation && e.rackLocation.toLowerCase().includes(q)) ||
        (e.palletNo && e.palletNo.toLowerCase().includes(q))
    );
  }, [entries, searchText]);

  const renderQcPill = (code: string, status: string) => {
    const info = QC_PILL_STYLE[status] || QC_PILL_STYLE.missing;
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${info.cls}`}
        title={`${code}: ${info.label}`}
      >
        {code}: {info.label}
      </span>
    );
  };

  const columns: Column<RawMaterialStockItem>[] = [
    {
      key: "entryNo",
      header: "No. SBB / Tgl",
      sortable: true,
      render: (e) => (
        <div>
          <div className="font-mono text-xs font-bold text-brand-primary">{e.entryNo}</div>
          <div className="text-[11px] text-muted-foreground">{e.entryDate}</div>
        </div>
      ),
    },
    {
      key: "productName",
      header: "Bahan Baku & Lot",
      sortable: true,
      render: (e) => (
        <div>
          <div className="text-xs font-semibold text-foreground">{e.productName}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[10px] font-bold bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200">
              {e.batchNo}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                e.organicStatus === "Organik"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {e.organicStatus}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "lbmNo",
      header: "Ref. LBM & Supplier",
      hiddenBelow: "md",
      render: (e) => (
        <div className="text-xs">
          <div className="font-mono font-semibold text-slate-800">{e.lbmNo || e.sourceType}</div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[170px]" title={e.supplierName}>
            {e.supplierName || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "pbdStatus",
      header: "Verifikasi 3 Form QC",
      hiddenBelow: "lg",
      render: (e) => (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            {renderQcPill("CAS", e.casStatus)}
            {renderQcPill("PBD", e.pbdStatus)}
            {renderQcPill("PBK", e.pbkStatus)}
          </div>
          {e.moistureContent !== undefined && e.moistureContent !== null && (
            <div className="text-[10px] text-muted-foreground">
              Kadar Air: <strong>{e.moistureContent}%</strong>
              {e.meshSize ? ` • ${e.meshSize}` : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "storageZone",
      header: "Lokasi Put-Away",
      hiddenBelow: "md",
      render: (e) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800">{e.storageZone}</div>
          <div className="text-[11px] text-muted-foreground font-mono">
            {e.rackLocation || "-"} / {e.palletNo || "-"}
          </div>
          {e.expiryDate && (
            <div
              className={`text-[10px] mt-0.5 font-medium ${
                e.expiryStatus === "expired"
                  ? "text-rose-600"
                  : e.expiryStatus === "expiring_soon"
                  ? "text-amber-700"
                  : "text-slate-500"
              }`}
            >
              Exp: {e.expiryDate}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "qtyRemaining",
      header: "Sisa / Masuk",
      align: "right",
      sortable: true,
      render: (e) => (
        <div className="text-right">
          <div className="font-mono text-xs font-bold text-slate-900">
            {e.qtyRemaining.toLocaleString("id-ID")} / {e.qtyReceived.toLocaleString("id-ID")} {e.uom}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {e.remainingPackages} / {e.totalPackages} {e.packageUnit}
            {e.qtyRejected > 0 && (
              <span className="text-rose-600 ml-1">(Rej: {e.qtyRejected})</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (e) => {
        const badge = STATUS_BADGE_MAP[e.status] || {
          label: e.status,
          cls: "bg-slate-100 text-slate-700",
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: "id",
      header: "Aksi",
      render: (e) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleOpenDetail(e)}
            className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            title="Detail & Kartu Mutasi Lot"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          {allowEdit && (e.status === "draft" || e.status === "available" || e.status === "quarantine") && (
            <button
              type="button"
              onClick={() => handleOpenEdit(e)}
              className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 cursor-pointer"
              title={e.status === "draft" ? "Edit Draft" : "Ubah Lokasi Rak/Pallet & Expiry"}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}

          {allowCreate && e.status === "draft" && (
            <button
              type="button"
              onClick={() => handleQuickPost(e)}
              className="p-1.5 rounded text-emerald-700 hover:bg-emerald-50 cursor-pointer"
              title="Post & Simpan ke Gudang"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}

          {allowApprove && e.status === "quarantine" && (
            <button
              type="button"
              onClick={() => {
                setReleaseTarget(e);
                setReleaseDecision("available");
                setReleaseNotes("");
              }}
              className="p-1.5 rounded text-amber-700 hover:bg-amber-50 cursor-pointer"
              title="Rilis / Keputusan Karantina"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => printSBBForm(e)}
            className="p-1.5 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
            title="Cetak Formulir GDG-002-SBB"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => printPalletTag(e)}
            className="p-1.5 rounded text-teal-700 hover:bg-teal-50 cursor-pointer"
            title="Cetak Label Identitas Pallet/Lot"
          >
            <Tag className="h-3.5 w-3.5" />
          </button>

          {e.status === "available" && e.qtyRemaining > 0 && (
            <Link
              href={`/manufacturing/requisitions?sbbId=${e.id}`}
              className="p-1.5 rounded text-blue-700 hover:bg-blue-50 cursor-pointer flex items-center"
              title="Buat BPB (Bon Permintaan Bahan Baku)"
            >
              <FileText className="h-3.5 w-3.5" />
            </Link>
          )}

          {allowDelete && e.status === "draft" && (
            <button
              type="button"
              onClick={() => handleDeleteDraft(e)}
              className="p-1.5 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
              title="Hapus Draft"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {allowApprove &&
            (e.status === "available" || e.status === "quarantine") &&
            e.qtyIssued === 0 &&
            e.qtyReserved === 0 && (
              <button
                type="button"
                onClick={() => {
                  setVoidTarget(e);
                  setVoidReason("");
                }}
                className="p-1.5 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                title="Void Dokumen"
              >
                <Ban className="h-3.5 w-3.5" />
              </button>
            )}
        </div>
      ),
    },
  ];

  const isEditingPosted = Boolean(editTarget && editTarget.status !== "draft");

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Form Stok Gudang Bahan Baku (GDG-002-SBB)"
        description="Penerimaan masuk gudang, verifikasi gate 3 form QC (CAS, PBD, PBK), penempatan rak/pallet (put-away), segregasi organik, dan saldo lot siap diambil via BPB & LBB."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            onClick={() => exportSBBToExcel(filteredEntries)}
            disabled={filteredEntries.length === 0}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel (.xlsx)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => loadData()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          {allowCreate && (
            <Button
              variant="gradient"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold"
              onClick={handleOpenCreate}
            >
              <Plus className="h-4 w-4" />
              Catat Masuk Gudang (SBB)
            </Button>
          )}
        </div>
      </PageHeader>

      {errorMsg && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" className="text-rose-600 underline text-[11px]" onClick={() => setErrorMsg(null)}>
            Tutup
          </button>
        </div>
      )}
      {noticeMsg && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{noticeMsg}</span>
          </div>
          <button type="button" className="text-emerald-700 underline text-[11px]" onClick={() => setNoticeMsg(null)}>
            Tutup
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Stok Siap Produksi</span>
              <PackageCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {(summary?.totalAvailableQty ?? 0).toLocaleString("id-ID")} <span className="text-xs font-semibold text-muted-foreground">kg/L</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {summary?.availableCount ?? 0} lot aktif &bull; {summary?.totalAvailablePackages ?? 0} kemasan
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Lot Karantina / Hold</span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-700 mt-1">
              {summary?.quarantineCount ?? 0} <span className="text-xs font-semibold">Lot</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {(summary?.totalQuarantineQty ?? 0).toLocaleString("id-ID")} kg/L tertahan
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Stok Organik</span>
              <Leaf className="h-4 w-4 text-teal-600" />
            </div>
            <div className="text-xl font-black text-teal-700 mt-1">
              {(summary?.organicAvailableQty ?? 0).toLocaleString("id-ID")} <span className="text-xs font-semibold">kg/L</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Konvensional: {(summary?.conventionalAvailableQty ?? 0).toLocaleString("id-ID")} kg/L
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Alert FEFO (≤ 30 hr)</span>
              <Clock className="h-4 w-4 text-rose-600" />
            </div>
            <div className="text-xl font-black text-rose-700 mt-1">
              {(summary?.expiringSoonCount ?? 0) + (summary?.expiredCount ?? 0)} <span className="text-xs font-semibold">Lot</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Segera exp: {summary?.expiringSoonCount ?? 0} &bull; Exp: {summary?.expiredCount ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Draft &amp; Arsip</span>
              <Layers className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-slate-800 mt-1">
              {summary?.draftCount ?? 0} <span className="text-xs font-semibold">Draft</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Habis: {summary?.depletedCount ?? 0} &bull; Reject: {summary?.rejectedCount ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Cari No. SBB, Lot, LBM, Produk, Supplier, Rak..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="h-9 text-xs"
          />
          <select
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className={selectCls}
          >
            <option value="">Semua Gudang</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className={selectCls}
          >
            <option value="all">Semua Zona Penyimpanan</option>
            {STORAGE_ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <select
            value={filterOrganic}
            onChange={(e) => setFilterOrganic(e.target.value)}
            className={selectCls}
          >
            <option value="all">Semua Sertifikasi Organik</option>
            <option value="Organik">Organik</option>
            <option value="Konvensional">Konvensional</option>
            <option value="Transisi">Transisi</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={selectCls}
          >
            <option value="all">Semua Status Lot</option>
            <option value="available">Siap Produksi (Available)</option>
            <option value="quarantine">Karantina (Quarantine)</option>
            <option value="draft">Draft</option>
            <option value="depleted">Habis Terpakai</option>
            <option value="rejected">Ditolak (Rejected)</option>
            <option value="voided">Void</option>
          </select>
        </CardContent>
      </Card>

      {/* Main DataTable */}
      <DataTable
        data={filteredEntries}
        columns={columns}
        isLoading={loading}
      />

      {/* CREATE / EDIT MODAL — 6 BLOK FORM STOK GUDANG BAHAN BAKU */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <WarehouseIcon className="h-5 w-5 text-brand-primary" />
              {editTarget
                ? isEditingPosted
                  ? `Ubah Lokasi / Expiry Lot: ${editTarget.entryNo}`
                  : `Edit Draft Form Stok Bahan Baku: ${editTarget.entryNo}`
                : "Form Stok Gudang Bahan Baku (GDG-002-SBB)"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {formError && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {isEditingPosted && (
              <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-xs">
                Dokumen ini sudah diposting (<strong>{STATUS_BADGE_MAP[editTarget!.status]?.label}</strong>). Anda dapat memperbarui lokasi <strong>Zona / Rak / Pallet</strong>, tanggal <strong>Best Before</strong>, dan catatan gudang.
              </div>
            )}

            {/* BLOK 1: SUMBER & IDENTITAS MASUK */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/40">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>1. Identitas &amp; Referensi Masuk (LBM / Saldo Awal)</span>
                {!editTarget && (
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border">
                    {(
                      [
                        { v: "lbm", label: "Dari LBM" },
                        { v: "opening_balance", label: "Saldo Awal / Manual" },
                        { v: "return_production", label: "Retur Produksi" },
                      ] as { v: RawStockSourceType; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => {
                          setFormData((p) => ({
                            ...p,
                            sourceType: opt.v,
                            goodsReceiptId: opt.v === "lbm" ? p.goodsReceiptId : undefined,
                            lbmNo: opt.v === "lbm" ? p.lbmNo : "",
                            casStatus: opt.v === "lbm" ? p.casStatus : "not_applicable",
                            pbdStatus: opt.v === "lbm" ? p.pbdStatus : "not_applicable",
                            pbkStatus: opt.v === "lbm" ? p.pbkStatus : "not_applicable",
                            targetStatus: opt.v === "lbm" ? p.targetStatus : "available",
                          }));
                          if (opt.v !== "lbm") {
                            setSelectedGrId("");
                            setLbmContext(null);
                          }
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          formData.sourceType === opt.v
                            ? "bg-brand-primary text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {formData.sourceType === "lbm" && !editTarget && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1 text-xs font-semibold">
                    Pilih Laporan Barang Masuk (LBM)
                    <select
                      value={selectedGrId}
                      onChange={(e) => {
                        setSelectedGrId(e.target.value);
                        fetchAndApplyLbmContext(e.target.value);
                      }}
                      className={selectCls}
                    >
                      <option value="">-- Pilih Nomor LBM --</option>
                      {receipts.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.receiptNo} ({r.receivedDate}) — Status: {r.status}
                        </option>
                      ))}
                    </select>
                  </label>

                  {lbmContext && lbmContext.lines.length > 1 && (
                    <label className="space-y-1 text-xs font-semibold">
                      Baris Komoditas LBM
                      <select
                        value={selectedLineIdx}
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          setSelectedLineIdx(idx);
                          applyLbmContextToForm(lbmContext, idx);
                        }}
                        className={selectCls}
                      >
                        {lbmContext.lines.map((l, idx) => (
                          <option key={l.lineId} value={idx}>
                            {l.productName} — Lot {l.lotNumber} ({l.weightNet} {l.uom})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}

              {loadingLbmCtx && (
                <div className="text-xs text-indigo-700 animate-pulse">
                  Memuat data LBM dan status 3 Form QC (CAS, PBD, PBK)...
                </div>
              )}

              {lbmContext && lbmContext.existingEntries.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <strong>Info:</strong> LBM {lbmContext.lbmNo} sudah memiliki {lbmContext.existingEntries.length} catatan SBB:{" "}
                  {lbmContext.existingEntries.map((x) => `${x.entryNo} (${x.batchNo})`).join(", ")}.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-1 text-xs font-semibold">
                  Tanggal Masuk Gudang
                  <Input
                    type="date"
                    disabled={isEditingPosted}
                    value={formData.entryDate}
                    onChange={(e) => setFormData((p) => ({ ...p, entryDate: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </label>

                <label className="space-y-1 text-xs font-semibold">
                  Komoditas Bahan Baku *
                  <select
                    disabled={isEditingPosted}
                    value={formData.productId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const prod = products.find((x) => x.id === pid);
                      setFormData((p) => ({
                        ...p,
                        productId: pid,
                        productSku: prod?.sku || "",
                        productName: prod?.name || "",
                        uom: prod?.unit || p.uom,
                        certifications: prod?.certifications || p.certifications,
                      }));
                    }}
                    className={selectCls}
                  >
                    <option value="">Pilih Bahan Baku...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs font-semibold">
                  Kode Bahan Baku / No. Lot *
                  <Input
                    disabled={isEditingPosted}
                    value={formData.batchNo}
                    onChange={(e) => setFormData((p) => ({ ...p, batchNo: e.target.value.toUpperCase() }))}
                    placeholder="Contoh: LOT-2611-001"
                    className="h-9 text-xs font-mono"
                  />
                </label>

                <label className="space-y-1 text-xs font-semibold">
                  Supplier / Asal Bahan
                  <Input
                    disabled={isEditingPosted}
                    value={formData.supplierName || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, supplierName: e.target.value }))}
                    placeholder="Nama vendor / koperasi"
                    className="h-9 text-xs"
                  />
                </label>

                <label className="space-y-1 text-xs font-semibold">
                  Ref. No. LBM / PO
                  <Input
                    disabled={isEditingPosted}
                    value={formData.lbmNo || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, lbmNo: e.target.value }))}
                    placeholder="LBM-001-1126"
                    className="h-9 text-xs font-mono"
                  />
                </label>

                <label className="space-y-1 text-xs font-semibold">
                  No. Surat Jalan
                  <Input
                    disabled={isEditingPosted}
                    value={formData.deliveryNoteNo || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, deliveryNoteNo: e.target.value }))}
                    placeholder="SJ-XXXX"
                    className="h-9 text-xs"
                  />
                </label>
              </div>
            </div>

            {/* BLOK 2: GATE VERIFIKASI 3 FORM QC */}
            {formData.sourceType === "lbm" && (
              <div className="rounded-xl border border-indigo-200 p-4 space-y-3 bg-indigo-50/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                    2. Gate Verifikasi 3 Form QC (CAS · PBD · PBK)
                  </span>
                  {formData.goodsReceiptId && (
                    <span className="text-[11px] text-indigo-700 font-medium">
                      Terhubung otomatis ke {formData.lbmNo}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* CAS */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">QC-007-CAS (Armada)</span>
                      {renderQcPill("CAS", formData.casStatus || "missing")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {lbmContext?.cas
                        ? `${lbmContext.cas.driverName} • ${lbmContext.cas.licensePlate || "-"}`
                        : formData.casStatus === "missing"
                        ? "Belum diisi tim QC"
                        : "Tersinkronisasi"}
                    </div>
                    {formData.casStatus === "missing" && formData.goodsReceiptId && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/qc/armada?lbmNo=${encodeURIComponent(formData.lbmNo || "")}&goodsReceiptId=${encodeURIComponent(formData.goodsReceiptId || "")}`
                          )
                        }
                        className="text-[11px] text-indigo-700 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Isi Form CAS <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* PBD */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">QC-002-PBD (Barang Datang)</span>
                      {renderQcPill("PBD", formData.pbdStatus || "missing")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {lbmContext?.pbd
                        ? `Air: ${lbmContext.pbd.moistureContent ?? "-"}% • Terima: ${lbmContext.pbd.acceptedWeight} kg`
                        : formData.pbdStatus === "missing"
                        ? "Belum diisi tim QC"
                        : `Air: ${formData.moistureContent ?? "-"}%`}
                    </div>
                    {formData.pbdStatus === "missing" && formData.goodsReceiptId && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/qc/incoming?lbmNo=${encodeURIComponent(formData.lbmNo || "")}&goodsReceiptId=${encodeURIComponent(formData.goodsReceiptId || "")}`
                          )
                        }
                        className="text-[11px] text-indigo-700 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Isi Form PBD <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* PBK */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">QC-003-PBK (Kemas)</span>
                      {renderQcPill("PBK", formData.pbkStatus || "missing")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {lbmContext?.pbk
                        ? `${lbmContext.pbk.itemName} (${lbmContext.pbk.passedQty}/${lbmContext.pbk.totalQty})`
                        : formData.pbkStatus === "not_applicable"
                        ? "Ditandai N/A (Non-kemas)"
                        : "Belum diisi (opsional jika curah)"}
                    </div>
                    {!isEditingPosted && formData.pbkStatus === "missing" && (
                      <div className="flex items-center gap-2">
                        {formData.goodsReceiptId && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/qc/packaging?lbmNo=${encodeURIComponent(formData.lbmNo || "")}&goodsReceiptId=${encodeURIComponent(formData.goodsReceiptId || "")}`
                              )
                            }
                            className="text-[11px] text-indigo-700 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            Isi PBK <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, pbkStatus: "not_applicable" }))}
                          className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                        >
                          Tandai N/A
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <label className="space-y-1 text-xs font-semibold">
                    Kadar Air (%)
                    <Input
                      type="number"
                      step="0.01"
                      disabled={isEditingPosted}
                      value={formData.moistureContent ?? ""}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          moistureContent: e.target.value === "" ? undefined : Number(e.target.value),
                        }))
                      }
                      placeholder="≤ 2.0%"
                      className="h-9 text-xs"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-semibold">
                    Brix (°Bx)
                    <Input
                      type="number"
                      step="0.1"
                      disabled={isEditingPosted}
                      value={formData.brixValue ?? ""}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          brixValue: e.target.value === "" ? undefined : Number(e.target.value),
                        }))
                      }
                      placeholder="Opsional (cair)"
                      className="h-9 text-xs"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-semibold">
                    Mesh Size
                    <Input
                      disabled={isEditingPosted}
                      value={formData.meshSize || ""}
                      onChange={(e) => setFormData((p) => ({ ...p, meshSize: e.target.value }))}
                      placeholder="Mesh 16 - 18"
                      className="h-9 text-xs"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-semibold">
                    Rekomendasi Alur QC
                    <Input
                      disabled={isEditingPosted}
                      value={formData.qcRecommendation || ""}
                      onChange={(e) => setFormData((p) => ({ ...p, qcRecommendation: e.target.value }))}
                      placeholder="Bypass Oven / Wajib Oven"
                      className="h-9 text-xs"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* BLOK 3: SERTIFIKASI & KLASIFIKASI MUTU */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Klasifikasi Mutu &amp; Sertifikasi Audit (Organik · Halal · Kosher)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <label className="space-y-1 text-xs font-semibold">
                  Status Organik
                  <select
                    disabled={isEditingPosted}
                    value={formData.organicStatus || "Organik"}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        organicStatus: e.target.value,
                        storageZone:
                          e.target.value === "Organik"
                            ? "Zona Organik"
                            : e.target.value === "Konvensional"
                            ? "Zona Konvensional"
                            : p.storageZone,
                      }))
                    }
                    className={selectCls}
                  >
                    <option value="Organik">Organik</option>
                    <option value="Konvensional">Konvensional</option>
                    <option value="Transisi">Transisi</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs font-semibold">
                  Halal
                  <select
                    disabled={isEditingPosted}
                    value={formData.halalStatus || "Halal"}
                    onChange={(e) => setFormData((p) => ({ ...p, halalStatus: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="Halal">Halal</option>
                    <option value="Non-Halal">Non-Halal</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs font-semibold">
                  Kosher
                  <select
                    disabled={isEditingPosted}
                    value={formData.kosherStatus || "Kosher"}
                    onChange={(e) => setFormData((p) => ({ ...p, kosherStatus: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="Kosher">Kosher</option>
                    <option value="Non-Kosher">Non-Kosher</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs font-semibold">
                  Grade Mutu
                  <select
                    disabled={isEditingPosted}
                    value={formData.qualityGrade || "Standar"}
                    onChange={(e) => setFormData((p) => ({ ...p, qualityGrade: e.target.value }))}
                    className={selectCls}
                  >
                    {QUALITY_GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs font-semibold col-span-2 sm:col-span-1">
                  Skema Sertifikasi
                  <Input
                    disabled={isEditingPosted}
                    value={formData.certifications || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, certifications: e.target.value }))}
                    placeholder="EU, USDA, FLO-ID"
                    className="h-9 text-xs"
                  />
                </label>
              </div>
            </div>

            {/* BLOK 4: KUANTITAS FISIK & KEMASAN */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Kuantitas Fisik Masuk Gudang Bahan Baku
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <label className="space-y-1 text-xs font-semibold">
                  Qty Netto LBM
                  <Input
                    type="number"
                    step="0.01"
                    disabled={isEditingPosted}
                    value={formData.qtyLbm ?? 0}
                    onChange={(e) => setFormData((p) => ({ ...p, qtyLbm: Number(e.target.value) }))}
                    className="h-9 text-xs font-mono"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Qty Diterima Gudang *
                  <Input
                    type="number"
                    step="0.01"
                    disabled={isEditingPosted}
                    value={formData.qtyReceived}
                    onChange={(e) => setFormData((p) => ({ ...p, qtyReceived: Number(e.target.value) }))}
                    className="h-9 text-xs font-mono font-bold text-emerald-700"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Qty Reject / Susut
                  <Input
                    type="number"
                    step="0.01"
                    disabled={isEditingPosted}
                    value={formData.qtyRejected ?? 0}
                    onChange={(e) => setFormData((p) => ({ ...p, qtyRejected: Number(e.target.value) }))}
                    className="h-9 text-xs font-mono text-rose-700"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Satuan (UoM)
                  <Input
                    disabled={isEditingPosted}
                    value={formData.uom || "KG"}
                    onChange={(e) => setFormData((p) => ({ ...p, uom: e.target.value.toUpperCase() }))}
                    className="h-9 text-xs"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Jumlah Kemasan
                  <Input
                    type="number"
                    min={0}
                    disabled={isEditingPosted}
                    value={formData.totalPackages ?? 0}
                    onChange={(e) => setFormData((p) => ({ ...p, totalPackages: Number(e.target.value) }))}
                    className="h-9 text-xs font-mono"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Jenis Kemasan
                  <select
                    disabled={isEditingPosted}
                    value={formData.packageUnit || "Sak"}
                    onChange={(e) => setFormData((p) => ({ ...p, packageUnit: e.target.value }))}
                    className={selectCls}
                  >
                    {PACKAGE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {(formData.totalPackages || 0) > 0 && (formData.qtyReceived || 0) > 0 && (
                <div className="text-[11px] text-muted-foreground">
                  Rata-rata berat per {formData.packageUnit || "kemasan"}:{" "}
                  <strong className="font-mono text-slate-800">
                    {((formData.qtyReceived || 0) / (formData.totalPackages || 1)).toFixed(2)} {formData.uom}
                  </strong>
                </div>
              )}
            </div>

            {/* BLOK 5: LOKASI PUT-AWAY & FEFO */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand-primary" />
                5. Lokasi Penyimpanan Fisik (Put-Away) &amp; FEFO
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-1 text-xs font-semibold">
                  Gudang Tujuan *
                  <select
                    disabled={isEditingPosted}
                    value={formData.warehouseId}
                    onChange={(e) => setFormData((p) => ({ ...p, warehouseId: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">Pilih Gudang...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} — {w.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Zona Penyimpanan *
                  <select
                    value={formData.storageZone || "Zona Organik"}
                    onChange={(e) => setFormData((p) => ({ ...p, storageZone: e.target.value }))}
                    className={selectCls}
                  >
                    {STORAGE_ZONES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Kondisi Penyimpanan
                  <select
                    value={formData.storageCondition || "Suhu Ruang Kering"}
                    onChange={(e) => setFormData((p) => ({ ...p, storageCondition: e.target.value }))}
                    className={selectCls}
                  >
                    {STORAGE_CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Kode Rak / Blok
                  <Input
                    value={formData.rackLocation || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, rackLocation: e.target.value.toUpperCase() }))}
                    placeholder="Contoh: RAK-A1 / BLOK-ORG-02"
                    className="h-9 text-xs font-mono"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Nomor Pallet / Tumpukan
                  <Input
                    value={formData.palletNo || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, palletNo: e.target.value.toUpperCase() }))}
                    placeholder="Contoh: PLT-014"
                    className="h-9 text-xs font-mono"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Best Before / Kedaluwarsa (FEFO)
                  <Input
                    type="date"
                    value={formData.expiryDate || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, expiryDate: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </label>
              </div>
            </div>

            {/* BLOK 6: STATUS POSTING, PIC & CATATAN */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                6. Verifikasi PIC &amp; Status Penempatan
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {!isEditingPosted && (
                  <label className="space-y-1 text-xs font-semibold">
                    Status Target Saat Posting
                    <select
                      value={formData.targetStatus || "available"}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          targetStatus: e.target.value as "available" | "quarantine" | "rejected",
                        }))
                      }
                      className={selectCls}
                    >
                      <option value="available">Siap Produksi (Available)</option>
                      <option value="quarantine">Karantina (Quarantine / Hold)</option>
                      <option value="rejected">Ditolak (Rejected)</option>
                    </select>
                  </label>
                )}
                <label className="space-y-1 text-xs font-semibold">
                  Diserahkan Oleh (QC / Inbound)
                  <Input
                    disabled={isEditingPosted}
                    value={formData.handedOverBy || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, handedOverBy: e.target.value }))}
                    placeholder="Nama petugas QC"
                    className="h-9 text-xs"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold">
                  Diterima Oleh (Admin Gudang)
                  <Input
                    disabled={isEditingPosted}
                    value={formData.receivedBy || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, receivedBy: e.target.value }))}
                    placeholder="Nama admin gudang"
                    className="h-9 text-xs"
                  />
                </label>
              </div>
              <label className="space-y-1 text-xs font-semibold block">
                Catatan Gudang
                <Input
                  value={formData.notes || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Catatan tambahan kondisi tumpukan, karantina, atau instruksi khusus..."
                  className="h-9 text-xs"
                />
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            {isEditingPosted ? (
              <Button
                variant="gradient"
                size="sm"
                onClick={() => handleSubmitForm(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan Lokasi"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmitForm(false)}
                  disabled={isSubmitting}
                >
                  Simpan Draft
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={() => handleSubmitForm(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Memproses..." : "Post & Simpan ke Gudang"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL & KARTU MUTASI LOT MODAL */}
      <Dialog open={Boolean(detailItem)} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                  <span className="font-mono text-brand-primary">{detailItem.entryNo}</span>
                  <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded border">
                    {detailItem.documentCode}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                      STATUS_BADGE_MAP[detailItem.status]?.cls || ""
                    }`}
                  >
                    {STATUS_BADGE_MAP[detailItem.status]?.label || detailItem.status}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Bahan Baku</div>
                    <div className="font-bold text-slate-900">{detailItem.productName}</div>
                    <div className="font-mono text-[11px] text-teal-700 font-bold mt-0.5">
                      Lot: {detailItem.batchNo}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Ref. LBM / Supplier</div>
                    <div className="font-mono font-semibold">{detailItem.lbmNo || detailItem.sourceType}</div>
                    <div className="text-[11px] text-slate-600">{detailItem.supplierName || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Lokasi Gudang (Put-Away)</div>
                    <div className="font-semibold">{detailItem.warehouseName}</div>
                    <div className="text-[11px] font-mono text-slate-700">
                      {detailItem.storageZone} • {detailItem.rackLocation || "-"} / {detailItem.palletNo || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Verifikasi 3 Form QC</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {renderQcPill("CAS", detailItem.casStatus)}
                      {renderQcPill("PBD", detailItem.pbdStatus)}
                      {renderQcPill("PBK", detailItem.pbkStatus)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Sertifikasi &amp; Mutu</div>
                    <div className="font-semibold">
                      {detailItem.organicStatus} • {detailItem.halalStatus} • {detailItem.kosherStatus}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Air: {detailItem.moistureContent ?? "-"}% • {detailItem.qcRecommendation || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Saldo Lot Aktif</div>
                    <div className="font-mono font-black text-emerald-700 text-sm">
                      {detailItem.qtyRemaining.toLocaleString("id-ID")} / {detailItem.qtyReceived.toLocaleString("id-ID")} {detailItem.uom}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {detailItem.remainingPackages} / {detailItem.totalPackages} {detailItem.packageUnit}
                    </div>
                  </div>
                </div>

                {/* Mini Kartu Stok Lot */}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                    Kartu Mutasi Lot (KSB Mini)
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Tanggal</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Aktivitas</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">No. Ref</th>
                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Delta</th>
                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Saldo</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">PIC &amp; Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingDetail && (
                          <tr>
                            <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                              Memuat riwayat mutasi...
                            </td>
                          </tr>
                        )}
                        {!loadingDetail && (!detailItem.logs || detailItem.logs.length === 0) && (
                          <tr>
                            <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                              Belum ada riwayat mutasi tercatat.
                            </td>
                          </tr>
                        )}
                        {!loadingDetail &&
                          (detailItem.logs || []).map((l) => (
                            <tr key={l.id} className="border-t">
                              <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]">
                                {l.occurredAt?.slice(0, 10)}
                              </td>
                              <td className="px-3 py-2 font-semibold">
                                {EVENT_LABELS[l.eventType] || l.eventType}
                              </td>
                              <td className="px-3 py-2 font-mono text-[11px]">{l.refDocumentNo || "-"}</td>
                              <td
                                className={`px-3 py-2 text-right font-mono font-bold ${
                                  l.qtyDelta > 0
                                    ? "text-emerald-700"
                                    : l.qtyDelta < 0
                                    ? "text-rose-700"
                                    : "text-slate-500"
                                }`}
                              >
                                {l.qtyDelta > 0 ? `+${l.qtyDelta}` : l.qtyDelta} {detailItem.uom}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold">
                                {l.balanceAfter.toLocaleString("id-ID")} {detailItem.uom}
                              </td>
                              <td className="px-3 py-2 text-[11px] text-slate-600">
                                <strong>{l.actorName || "-"}</strong>
                                {l.notes ? ` — ${l.notes}` : ""}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Next Step Hint to BPB & LBB */}
                {detailItem.status === "available" && detailItem.qtyRemaining > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                    <div className="text-emerald-900">
                      <strong>Lot Siap Produksi!</strong> Bahan baku ini siap diambil melalui tahap berikutnya: <strong>BPB &amp; LBB</strong>.
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] border-emerald-300 text-emerald-800 bg-white gap-1"
                      onClick={() => router.push("/manufacturing/requisitions")}
                    >
                      Ke Permintaan Bahan <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => printPalletTag(detailItem)}>
                  <Tag className="h-3.5 w-3.5" /> Cetak Label Pallet
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => printSBBForm(detailItem)}>
                  <Printer className="h-3.5 w-3.5" /> Cetak Form GDG-002-SBB
                </Button>
                <Button size="sm" onClick={() => setDetailItem(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* RELEASE QUARANTINE MODAL */}
      <Dialog open={Boolean(releaseTarget)} onOpenChange={(open) => !open && setReleaseTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              Keputusan Rilis Karantina
            </DialogTitle>
          </DialogHeader>
          {releaseTarget && (
            <form onSubmit={handleConfirmRelease} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                Lot <strong className="font-mono">{releaseTarget.batchNo}</strong> ({releaseTarget.productName}) —{" "}
                <strong>
                  {releaseTarget.qtyRemaining.toLocaleString("id-ID")} {releaseTarget.uom}
                </strong>
              </div>
              <label className="space-y-1 font-semibold block">
                Keputusan QA / Kepala Gudang
                <select
                  value={releaseDecision}
                  onChange={(e) => setReleaseDecision(e.target.value as "available" | "rejected")}
                  className={selectCls}
                >
                  <option value="available">Rilis ke Siap Produksi (Available)</option>
                  <option value="rejected">Tolak / Reject (Kurangi dari Stok)</option>
                </select>
              </label>
              <label className="space-y-1 font-semibold block">
                Alasan / Hasil Verifikasi *
                <Input
                  required
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="Contoh: Hasil uji ulang kadar air 1.9%, lolos standar."
                  className="h-9 text-xs"
                />
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setReleaseTarget(null)}>
                  Batal
                </Button>
                <Button type="submit" variant="gradient" size="sm" disabled={isReleasing}>
                  {isReleasing ? "Memproses..." : "Simpan Keputusan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* VOID MODAL */}
      <Dialog open={Boolean(voidTarget)} onOpenChange={(open) => !open && setVoidTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-rose-700">
              <Ban className="h-5 w-5" />
              Void Dokumen {voidTarget?.entryNo}
            </DialogTitle>
          </DialogHeader>
          {voidTarget && (
            <form onSubmit={handleConfirmVoid} className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                Dokumen yang di-void tidak akan dihapus dari riwayat audit. Saldo lot ini akan dikosongkan.
              </p>
              <label className="space-y-1 font-semibold block">
                Alasan Pembatalan (Void) *
                <Input
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Tuliskan alasan pembatalan..."
                  className="h-9 text-xs"
                />
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setVoidTarget(null)}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                  disabled={isVoiding}
                >
                  {isVoiding ? "Memproses..." : "Konfirmasi Void"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RawMaterialStockPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
          Memuat Form Stok Gudang Bahan Baku...
        </div>
      }
    >
      <RawMaterialStockContent />
    </React.Suspense>
  );
}
