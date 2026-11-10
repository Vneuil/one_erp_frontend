"use client";

import * as React from "react";
import { Plus, Eye, Edit, Send, Check, X, Printer, Sparkles, AlertCircle, CheckCircle2, RotateCcw, PackageCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { procurementApi, PurchaseRequestLineInput } from "@/lib/api/procurement";
import { salesApi, SalesOrderItem as ApiSO } from "@/lib/api/sales";
import { productsApi, ProductItem } from "@/lib/api/products";
import { inventoryApi, StockLevelItem } from "@/lib/api/inventory";
import { hrmApi } from "@/lib/api/hrm";
import { approvalApi, ApprovalRequest } from "@/lib/api/approval";
import { useAppStore } from "@/stores/app-store";
import { useConfirm, useAlert, usePrompt } from "@/components/shared/confirm-modal";
import { ApprovalTimeline, canUserApprove } from "@/components/shared/approval-timeline";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useNavigationAccess } from "@/providers/navigation-access";

interface PurchaseRequest {
  id: string;
  prNumber: string;
  department: string;
  requestedBy: string;
  requestDate: string;
  requiredDate: string;
  itemCount: number;
  status: string;
  category?: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  supervisorApprovedBy?: string;
  ownerApprovedBy?: string;
  rejectionReason?: string;
  lines?: PurchaseRequestLineInput[];
}

function PRStatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s === "draft") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
        Draft
      </span>
    );
  }
  if (
    s === "pending_approval" ||
    s === "pending" ||
    s === "submitted" ||
    s === "pending_supervisor" ||
    s === "pending_owner"
  ) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
        Menunggu Approval
      </span>
    );
  }
  if (s === "approved" || s === "approve") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        Disetujui
      </span>
    );
  }
  if (s === "rejected") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
        Ditolak
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
      {status}
    </span>
  );
}

function PRCategoryBadge({ category }: { category?: string }) {
  const cat = category?.toLowerCase();
  if (cat === "non_inventory") {
    return <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">Non-Inventory</span>;
  }
  if (cat === "fixed_asset") {
    return <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">Fixed Asset</span>;
  }
  return <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">Inventory</span>;
}

export default function PurchaseRequestsPage() {
  const { canViewPrices } = useNavigationAccess();
  const pricesAllowed = canViewPrices("procurement");
  const { currentUser, currentCompany } = useAppStore();
  const confirm = useConfirm();
  const alert = useAlert();
  const prompt = usePrompt();
  const [prs, setPrs] = React.useState<PurchaseRequest[]>([]);
  const [category, setCategory] = React.useState("inventory");
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // Print Preview state
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = React.useState(false);

  // Create Modal state
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [salesOrders, setSalesOrders] = React.useState<ApiSO[]>([]);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = React.useState<string>("");
  const [stockLevels, setStockLevels] = React.useState<StockLevelItem[]>([]);
  const [isAnalyzingSo, setIsAnalyzingSo] = React.useState(false);
  const [soAnalysis, setSoAnalysis] = React.useState<{
    salesOrder: ApiSO;
    items: {
      productId: string;
      productName: string;
      productSku: string;
      unit: string;
      orderedQty: number;
      availableStock: number;
      shortage: number;
      status: "shortage" | "sufficient";
    }[];
    totalShortageItems: number;
  } | null>(null);
  const [department, setDepartment] = React.useState("");
  const [requiredDate, setRequiredDate] = React.useState("");
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [prLines, setPrLines] = React.useState<PurchaseRequestLineInput[]>([]);
  const [lineProductId, setLineProductId] = React.useState("");
  const [lineQty, setLineQty] = React.useState("1");
  const [lineNotes, setLineNotes] = React.useState("");

  // Edit Modal state (Draft only)
  const [editingPr, setEditingPr] = React.useState<PurchaseRequest | null>(null);
  const [editCategory, setEditCategory] = React.useState("inventory");
  const [editRequiredDate, setEditRequiredDate] = React.useState("");
  const [editLines, setEditLines] = React.useState<PurchaseRequestLineInput[]>([]);
  const [editLineProductId, setEditLineProductId] = React.useState("");
  const [editLineQty, setEditLineQty] = React.useState("1");
  const [editLineNotes, setEditLineNotes] = React.useState("");
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);

  // Detail Modal state (All statuses with Timeline)
  const [selectedPr, setSelectedPr] = React.useState<PurchaseRequest | null>(null);

  // Active approvals map by PR id
  const [activeApprovals, setActiveApprovals] = React.useState<Record<string, ApprovalRequest>>({});

  // Estimated nominal calculations
  const selectedPrTotalNominal = React.useMemo(() => {
    if (!selectedPr || !selectedPr.lines) return 0;
    return selectedPr.lines.reduce((sum, l) => {
      const product = products.find((p) => p.id === l.productId);
      return sum + l.quantity * (product?.costPrice || 0);
    }, 0);
  }, [selectedPr, products]);

  const createPrTotalNominal = React.useMemo(() => {
    return prLines.reduce((sum, l) => {
      const product = products.find((p) => p.id === l.productId);
      return sum + l.quantity * (product?.costPrice || 0);
    }, 0);
  }, [prLines, products]);

  const editPrTotalNominal = React.useMemo(() => {
    return editLines.reduce((sum, l) => {
      const product = products.find((p) => p.id === l.productId);
      return sum + l.quantity * (product?.costPrice || 0);
    }, 0);
  }, [editLines, products]);

  const fetchPRs = React.useCallback(() => {
    setIsLoading(true);
    procurementApi
      .listPurchaseRequests()
      .then((res) => {
        setPrs(
          (res.data || []).map((pr) => ({
            id: pr.id,
            prNumber: pr.requestNo,
            department: pr.department,
            requestedBy: pr.requestedBy,
            requestDate: pr.createdAt ? pr.createdAt.slice(0, 10) : "-",
            requiredDate: pr.neededByDate,
            itemCount: pr.lines?.length || 0,
            status: pr.status,
            category: pr.category,
            salesOrderId: pr.salesOrderId,
            salesOrderNo: pr.salesOrderNo,
            supervisorApprovedBy: pr.supervisorApprovedBy,
            ownerApprovedBy: pr.ownerApprovedBy,
            rejectionReason: pr.rejectionReason,
            lines: (pr.lines || []).map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              notes: l.notes,
            })),
          }))
        );
      })
      .catch((err) => {
        console.error("Failed to load purchase request", err);
        setLoadError("Gagal memuat data purchase request dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Fetch approvals for matching
  const fetchApprovals = React.useCallback(() => {
    approvalApi
      .listRequests({ documentType: "purchase_request", perPage: 100 })
      .then((res) => {
        const map: Record<string, ApprovalRequest> = {};
        (res.data || []).forEach((r) => {
          if (r.documentId && (!map[r.documentId] || r.status === "pending")) {
            map[r.documentId] = r;
          }
        });
        setActiveApprovals(map);
      })
      .catch((err) => console.warn("Failed to load approval requests for PRs", err));
  }, []);

  React.useEffect(() => {
    fetchPRs();
    fetchApprovals();
  }, [fetchPRs, fetchApprovals]);

  React.useEffect(() => {
    productsApi
      .list({ perPage: 200 })
      .then((res) => setProducts(res.data || []))
      .catch((err) => console.warn("Failed to load products for PR line items", err));

    salesApi
      .listOrders({ perPage: 100 })
      .then((res) => setSalesOrders(res.data || []))
      .catch((err) => console.warn("Failed to load sales orders for PR reference", err));

    inventoryApi
      .listStockLevels({ perPage: 500 })
      .then((res) => setStockLevels(res.data || []))
      .catch((err) => console.warn("Failed to load stock levels for PR shortage calculation", err));

    hrmApi
      .listEmployees({ perPage: 500 })
      .then((res) => {
        const match = (res.data || []).find(
          (e) => e.email.toLowerCase() === currentUser.email.toLowerCase()
        );
        setDepartment(match?.department || "");
      })
      .catch((err) => console.warn("Failed to load employee record for department autofill", err));
  }, [currentUser.email]);

  const handleSelectSalesOrder = React.useCallback(async (soId: string) => {
    setSelectedSalesOrderId(soId);
    if (!soId) {
      setSoAnalysis(null);
      return;
    }

    setIsAnalyzingSo(true);
    try {
      let so = salesOrders.find((s) => s.id === soId);
      if (!so || !so.lines || so.lines.length === 0) {
        const res = await salesApi.getOrder(soId);
        if (res.data) so = res.data;
      }

      if (!so || !so.lines || so.lines.length === 0) {
        setSoAnalysis(null);
        return;
      }

      const isApproved = so.status?.toLowerCase() === "confirmed" || so.status?.toLowerCase() === "approved";
      const hasInvoiceDoc = Boolean(so.invoiceDocAttachment || so.customerPoAttachment);
      if (!isApproved) {
        await alert({
          title: "Sales Order Belum Disetujui",
          message: `Sales Order ${so.orderNumber} masih berstatus "${so.status}" dan memerlukan persetujuan (Approval) manajerial terlebih dahulu sebelum dapat dibuatkan Purchase Requisition.`,
          variant: "destructive",
        });
        setSelectedSalesOrderId("");
        setSoAnalysis(null);
        return;
      }
      if (!hasInvoiceDoc) {
        await alert({
          title: "Dokumen CI / PI Belum Diunggah",
          message: `Sales Order ${so.orderNumber} telah disetujui, namun belum memiliki dokumen Commercial Invoice (CI) atau Proforma Invoice (PI). Silakan unggah dokumen terlebih dahulu di menu Sales Order.`,
          variant: "destructive",
        });
        setSelectedSalesOrderId("");
        setSoAnalysis(null);
        return;
      }

      const analysisItems = so.lines.map((line) => {
        const product = products.find((p) => p.id === line.productId);
        let available = 0;
        if (so?.warehouseId) {
          const whStock = stockLevels.find(
            (sl) => sl.productId === line.productId && sl.warehouseId === so?.warehouseId
          );
          available = whStock ? whStock.available : (product?.stock ?? 0);
        } else {
          const matchingStock = stockLevels.filter((sl) => sl.productId === line.productId);
          if (matchingStock.length > 0) {
            available = matchingStock.reduce((sum, s) => sum + (s.available || 0), 0);
          } else {
            available = product?.stock ?? 0;
          }
        }

        const shortage = Math.max(0, line.quantity - available);
        return {
          productId: line.productId,
          productName: product?.name || line.productId,
          productSku: product?.sku || "-",
          unit: product?.unit || "Unit",
          orderedQty: line.quantity,
          availableStock: Math.max(0, available),
          shortage,
          status: shortage > 0 ? ("shortage" as const) : ("sufficient" as const),
        };
      });

      const totalShortage = analysisItems.filter((item) => item.shortage > 0).length;

      setSoAnalysis({
        salesOrder: so,
        items: analysisItems,
        totalShortageItems: totalShortage,
      });

      // Auto-suggest: populate prLines with items that have a shortage!
      const suggestedLines: PurchaseRequestLineInput[] = analysisItems
        .filter((item) => item.shortage > 0)
        .map((item) => ({
          productId: item.productId,
          quantity: item.shortage,
          notes: `Kekurangan ${so?.orderNumber} (Butuh ${item.orderedQty.toLocaleString("id-ID")}, Stok ${item.availableStock.toLocaleString("id-ID")})`,
        }));

      if (suggestedLines.length > 0) {
        setPrLines(suggestedLines);
      } else {
        setPrLines([]);
      }
    } catch (err) {
      console.warn("Failed to analyze SO shortage", err);
    } finally {
      setIsAnalyzingSo(false);
    }
  }, [salesOrders, products, stockLevels]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fromSoId = params.get("fromSoId");
      if (fromSoId && salesOrders.length > 0 && products.length > 0 && stockLevels.length >= 0) {
        setIsNewOpen(true);
        void handleSelectSalesOrder(fromSoId);
      }
    }
  }, [salesOrders, products, stockLevels, handleSelectSalesOrder]);

  const handleAddLine = () => {
    if (!lineProductId) return;
    const qty = Number(lineQty) || 1;
    setPrLines((prev) => {
      const existing = prev.find((l) => l.productId === lineProductId);
      if (existing) {
        return prev.map((l) =>
          l.productId === lineProductId ? { ...l, quantity: l.quantity + qty, notes: lineNotes || l.notes } : l
        );
      }
      return [...prev, { productId: lineProductId, quantity: qty, notes: lineNotes }];
    });
    setLineProductId("");
    setLineQty("1");
    setLineNotes("");
  };

  const handleRemoveLine = (productId: string) => {
    setPrLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  // Create PR - Stays in DRAFT!
  const handleSubmitPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) {
      await alert({
        title: "Departemen Tidak Ditemukan",
        message: "Department tidak ditemukan di data karyawan HRM untuk akun Anda. Hubungi admin untuk menautkan akun ini ke data karyawan sebelum mengajukan Purchase Request.",
        variant: "destructive",
      });
      return;
    }
    if (!requiredDate) {
      await alert({
        title: "Validasi Form",
        message: "Isi Required Date terlebih dahulu.",
        variant: "warning",
      });
      return;
    }
    if (prLines.length === 0) {
      await alert({
        title: "Item Kosong",
        message: "Tambahkan minimal 1 item barang ke Purchase Request.",
        variant: "warning",
      });
      return;
    }

    const linkedSo = salesOrders.find((s) => s.id === selectedSalesOrderId);
    try {
      const created = await procurementApi.createPurchaseRequest({
        department,
        neededByDate: requiredDate,
        category,
        salesOrderId: linkedSo ? linkedSo.id : undefined,
        salesOrderNo: linkedSo ? linkedSo.orderNumber : undefined,
        lines: prLines,
      });
      const pr = created.data;
      setPrs((prev) => [
        {
          id: pr.id,
          prNumber: pr.requestNo,
          department: pr.department,
          requestedBy: pr.requestedBy || currentUser.name,
          requestDate: pr.createdAt ? pr.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          requiredDate: pr.neededByDate,
          itemCount: pr.lines?.length || prLines.length,
          status: pr.status || "draft",
          category: pr.category,
          salesOrderId: pr.salesOrderId || (linkedSo ? linkedSo.id : undefined),
          salesOrderNo: pr.salesOrderNo || (linkedSo ? linkedSo.orderNumber : undefined),
          lines: prLines,
        },
        ...prev,
      ]);
      if (pr.status === "approved") {
        setNotice("Purchase Request berhasil dibuat dan langsung disetujui (tidak membutuhkan approval).");
      } else if (pr.status === "pending_approval") {
        setNotice("Purchase Request berhasil dibuat dan menunggu persetujuan (approval).");
      } else {
        setNotice("Draft Purchase Request berhasil dibuat.");
      }
    } catch (err) {
      console.warn("Failed to create purchase request via API", err);
      await alert({
        title: "Gagal Membuat PR",
        message: (err as Error).message || "Gagal membuat Purchase Request. Coba lagi.",
        variant: "destructive",
      });
      return;
    }

    setIsNewOpen(false);
    setSelectedSalesOrderId("");
    setSoAnalysis(null);
    setRequiredDate("");
    setPrLines([]);
  };

  // Send for approval (Draft -> Pending Approval)
  const handleSendForApproval = async (id: string, prNumber?: string) => {
    const ok = await confirm({
      title: "Kirim untuk Approval",
      message: `Kirim Purchase Request ${prNumber ? `"${prNumber}"` : "ini"} untuk diproses dan disetujui sesuai hirarki approval atasan?`,
      confirmText: "Kirim Sekarang",
      cancelText: "Batal",
      variant: "default",
    });
    if (!ok) return;

    try {
      const res = await procurementApi.submitPurchaseRequest(id);
      const updatedStatus = res.data?.status || "approved";
      setPrs((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: updatedStatus } : item
        )
      );
      if (selectedPr && selectedPr.id === id) {
        setSelectedPr((prev) => (prev ? { ...prev, status: updatedStatus } : null));
      }
      fetchApprovals();
      if (updatedStatus === "approved") {
        setNotice("Purchase Request tidak membutuhkan approval dan langsung disetujui.");
      } else {
        setNotice("Purchase Request berhasil dikirim untuk approval atasan.");
      }
    } catch (err) {
      await alert({
        title: "Gagal Mengirim PR",
        message: "Gagal mengirim Purchase Request: " + (err instanceof Error ? err.message : "Kesalahan server"),
        variant: "destructive",
      });
    }
  };

  // Open Edit Dialog (Draft only)
  const handleOpenEdit = (pr: PurchaseRequest) => {
    setEditingPr(pr);
    setEditCategory(pr.category || "inventory");
    setEditRequiredDate(pr.requiredDate || "");
    setEditLines(pr.lines || []);
    setEditLineProductId("");
    setEditLineQty("1");
    setEditLineNotes("");
  };

  const handleEditAddLine = () => {
    if (!editLineProductId) return;
    const qty = Number(editLineQty) || 1;
    setEditLines((prev) => {
      const existing = prev.find((l) => l.productId === editLineProductId);
      if (existing) {
        return prev.map((l) =>
          l.productId === editLineProductId
            ? { ...l, quantity: l.quantity + qty, notes: editLineNotes || l.notes }
            : l
        );
      }
      return [...prev, { productId: editLineProductId, quantity: qty, notes: editLineNotes }];
    });
    setEditLineProductId("");
    setEditLineQty("1");
    setEditLineNotes("");
  };

  const handleEditRemoveLine = (productId: string) => {
    setEditLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPr) return;
    if (editLines.length === 0) {
      await alert({
        title: "Item Kosong",
        message: "Tambahkan minimal 1 item barang ke Purchase Request.",
        variant: "warning",
      });
      return;
    }
    setIsEditSubmitting(true);
    try {
      const res = await procurementApi.updatePurchaseRequest(editingPr.id, {
        department: editingPr.department,
        neededByDate: editRequiredDate,
        category: editCategory,
        lines: editLines,
      });
      const updated = res.data;
      setPrs((prev) =>
        prev.map((item) =>
          item.id === editingPr.id
            ? {
                ...item,
                requiredDate: updated.neededByDate,
                category: updated.category,
                itemCount: updated.lines?.length || editLines.length,
                lines: editLines,
              }
            : item
        )
      );
      if (selectedPr && selectedPr.id === editingPr.id) {
        setSelectedPr((prev) =>
          prev
            ? {
                ...prev,
                requiredDate: updated.neededByDate,
                category: updated.category,
                itemCount: updated.lines?.length || editLines.length,
                lines: editLines,
              }
            : null
        );
      }
      setEditingPr(null);
      setNotice("Purchase Request berhasil diperbarui.");
    } catch (err) {
      await alert({
        title: "Gagal Memperbarui PR",
        message: err instanceof Error ? err.message : "Gagal menyimpan perubahan PR.",
        variant: "destructive",
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Approve
  const handleApprovePR = async (id: string, prNumber?: string) => {
    const ok = await confirm({
      title: "Setujui Purchase Request",
      message: `Apakah Anda yakin ingin menyetujui Purchase Request ${prNumber ? `"${prNumber}"` : "ini"}?`,
      confirmText: "Setujui",
      cancelText: "Batal",
      variant: "default",
    });
    if (!ok) return;

    try {
      const res = await procurementApi.approvePurchaseRequest(id);
      setPrs((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: res.data.status, supervisorApprovedBy: res.data.supervisorApprovedBy, ownerApprovedBy: res.data.ownerApprovedBy }
            : item
        )
      );
      if (selectedPr && selectedPr.id === id) {
        setSelectedPr((prev) => (prev ? { ...prev, status: res.data.status } : null));
      }
      fetchApprovals();
      setNotice(`Purchase Request berhasil disetujui. Status saat ini: ${res.data.status}.`);
    } catch (err) {
      await alert({
        title: "Gagal Menyetujui PR",
        message: "Gagal menyetujui Purchase Request: " + (err instanceof Error ? err.message : "Kesalahan server"),
        variant: "destructive",
      });
    }
  };

  // Reject
  const handleRejectPR = async (id: string, prNumber?: string) => {
    const reason = await prompt({
      title: "Tolak Purchase Request",
      message: `Masukkan alasan penolakan Purchase Request ${prNumber ? `"${prNumber}"` : "ini"}:`,
      placeholder: "Tulis alasan penolakan (opsional)...",
      confirmText: "Tolak PR",
      cancelText: "Batal",
      variant: "destructive",
      inputType: "textarea",
    });
    if (reason === null) return;
    try {
      await procurementApi.rejectPurchaseRequest(id, reason.trim() || undefined);
      setPrs((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "rejected", rejectionReason: reason.trim() || undefined } : item
        )
      );
      if (selectedPr && selectedPr.id === id) {
        setSelectedPr((prev) =>
          prev ? { ...prev, status: "rejected", rejectionReason: reason.trim() || undefined } : null
        );
      }
      fetchApprovals();
      setNotice("Purchase Request telah ditolak.");
    } catch (err) {
      await alert({
        title: "Gagal Menolak PR",
        message: "Gagal menolak Purchase Request: " + (err instanceof Error ? err.message : "Kesalahan server"),
        variant: "destructive",
      });
    }
  };

  const handlePrintDocument = () => {
    if (!selectedPr) return;
    const printContent = document.getElementById("pr-printable-document");
    if (!printContent) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Request - ${selectedPr.prNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #111827;
              margin: 0;
              padding: 0;
              font-size: 10pt;
              line-height: 1.4;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
              margin-bottom: 14px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .company-name {
              font-size: 14pt;
              font-weight: bold;
              text-transform: uppercase;
              color: #0f172a;
            }
            .company-sub {
              font-size: 8pt;
              color: #64748b;
              margin-top: 2px;
            }
            .doc-title {
              text-align: right;
            }
            .doc-title h1 {
              font-size: 14pt;
              margin: 0;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
            }
            .doc-badge {
              display: inline-block;
              font-size: 8.5pt;
              font-weight: bold;
              padding: 2px 8px;
              border: 1px solid #94a3b8;
              border-radius: 4px;
              margin-top: 4px;
              text-transform: uppercase;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 16px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 16px;
              font-size: 9.5pt;
            }
            .meta-row {
              display: flex;
              margin-bottom: 3px;
            }
            .meta-label {
              width: 140px;
              color: #64748b;
              font-weight: 500;
            }
            .meta-val {
              font-weight: 600;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 18px;
              font-size: 9.5pt;
            }
            th {
              background-color: #f1f5f9;
              border: 1px solid #cbd5e1;
              padding: 7px 10px;
              text-align: left;
              font-weight: bold;
              color: #334155;
            }
            td {
              border: 1px solid #cbd5e1;
              padding: 7px 10px;
              vertical-align: top;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .total-row {
              font-weight: bold;
              background-color: #f8fafc;
            }
            .signatures {
              margin-top: 30px;
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 16px;
              page-break-inside: avoid;
            }
            .sig-box {
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 10px;
              text-align: center;
              height: 110px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .sig-title {
              font-size: 8.5pt;
              font-weight: 600;
              color: #475569;
              text-transform: uppercase;
            }
            .sig-name {
              font-size: 9pt;
              font-weight: bold;
              border-top: 1px dotted #94a3b8;
              padding-top: 4px;
            }
            .footer-note {
              margin-top: 20px;
              font-size: 8pt;
              color: #94a3b8;
              text-align: center;
              border-top: 1px solid #e2e8f0;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  };

  const columns: Column<PurchaseRequest>[] = [
    {
      key: "prNumber",
      header: "PR Number",
      sortable: true,
      render: (pr) => (
        <div className="flex flex-col items-start gap-0.5">
          <button
            type="button"
            onClick={() => setSelectedPr(pr)}
            className="font-mono text-xs font-bold text-brand-primary hover:underline cursor-pointer text-left"
          >
            {pr.prNumber}
          </button>
          {pr.salesOrderNo ? (
            <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-mono border border-blue-200">
              SO: {pr.salesOrderNo}
            </span>
          ) : (
            <span className="text-[9px] text-muted-foreground">Stok / Internal</span>
          )}
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      render: (pr) => <span className="text-xs font-semibold text-foreground">{pr.department}</span>,
    },
    {
      key: "requestedBy",
      header: "Requested By",
      render: (pr) => <span className="text-xs text-muted-foreground">{pr.requestedBy}</span>,
    },
    {
      key: "requestDate",
      header: "Date Requested",
      render: (pr) => <span className="text-xs text-muted-foreground">{pr.requestDate}</span>,
    },
    {
      key: "itemCount",
      header: "Items",
      align: "center",
      render: (pr) => <span className="text-xs font-semibold">{pr.itemCount} SKUs</span>,
    },
    ...(pricesAllowed
      ? [
          {
            key: "estimatedTotal" as const,
            header: "Est. Total",
            align: "right" as const,
            render: (pr: PurchaseRequest) => {
              const total = (pr.lines || []).reduce((sum, l) => {
                const prod = products.find((p) => p.id === l.productId);
                return sum + l.quantity * (prod?.costPrice || 0);
              }, 0);
              return (
                <span className="text-xs font-bold text-foreground">
                  <MoneyDisplay amount={total} />
                </span>
              );
            },
          },
        ]
      : []),
    {
      key: "category",
      header: "Category",
      render: (pr) => <PRCategoryBadge category={pr.category} />,
    },
    {
      key: "status",
      header: "Status",
      render: (pr) => <PRStatusBadge status={pr.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (pr) => {
        const isDraft = (pr.status || "").toLowerCase() === "draft";
        const isPending =
          (pr.status || "").toLowerCase() === "pending_approval" ||
          (pr.status || "").toLowerCase() === "pending" ||
          (pr.status || "").toLowerCase() === "submitted" ||
          (pr.status || "").toLowerCase() === "pending_supervisor" ||
          (pr.status || "").toLowerCase() === "pending_owner";

        const canApprove =
          isPending &&
          canUserApprove(
            currentUser.role,
            currentUser.email,
            pr.requestedBy,
            activeApprovals[pr.id],
            pr.status
          );

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Detail Button - Always Available */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-brand-primary"
              title="Lihat Detail & Timeline"
              onClick={() => setSelectedPr(pr)}
            >
              <Eye className="h-4 w-4" />
            </Button>

            {/* Print Preview Button - Always Available */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-slate-900"
              title="Preview & Cetak PR"
              onClick={() => {
                setSelectedPr(pr);
                setIsPrintPreviewOpen(true);
              }}
            >
              <Printer className="h-4 w-4" />
            </Button>

            {/* Draft Actions: Edit & Kirim untuk Approval */}
            {isDraft && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Edit Draft PR"
                  onClick={() => handleOpenEdit(pr)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[11px] font-semibold text-brand-primary border-brand-primary/30 hover:bg-brand-tint"
                  title="Kirim untuk Approval Atasan"
                  onClick={() => handleSendForApproval(pr.id, pr.prNumber)}
                >
                  <Send className="h-3 w-3" /> Kirim
                </Button>
              </>
            )}

            {/* Approval Actions: Only when Pending and user is authorized approver */}
            {canApprove && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[11px] font-bold border-rose-300 text-rose-700 hover:bg-rose-50"
                  onClick={() => handleRejectPR(pr.id, pr.prNumber)}
                >
                  <X className="h-3 w-3" /> Tolak
                </Button>
                <Button
                  size="sm"
                  variant="gradient"
                  className="h-7 gap-1 text-[11px] font-bold"
                  onClick={() => handleApprovePR(pr.id, pr.prNumber)}
                >
                  <Check className="h-3 w-3" /> Setujui
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Purchase Requests (PR)"
        description="Internal requisition tickets submitted by production, maintenance, or warehouse teams."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => {
            setSelectedSalesOrderId("");
            setSoAnalysis(null);
            setPrLines([]);
            setIsNewOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Submit Purchase Request
        </Button>
      </PageHeader>

      {loadError && (
        <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      {notice && (
        <div role="status" className="m-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-950">×</button>
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <DataTable
          columns={columns}
          data={prs}
          searchKey="prNumber"
          searchPlaceholder="Search PR number..."
          onRowClick={(item) => setSelectedPr(item)}
        />
      )}

      {/* New PR Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Submit Purchase Request (Draft)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPR} className="min-w-0 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Kategori Pengadaan</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <option value="inventory">Inventory (Bahan Baku & Kemasan)</option>
                <option value="non_inventory">Non-Inventory (ATK, Consumables, Maintenance)</option>
                <option value="fixed_asset">Fixed Asset (Mesin, Peralatan, Sarana)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Dokumen akan disimpan sebagai Draft terlebih dahulu sebelum dikirim untuk persetujuan.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Sumber Sales Order (Opsional)</span>
                {isAnalyzingSo && (
                  <span className="text-[11px] text-brand-primary flex items-center gap-1 font-normal">
                    <Loader2 className="h-3 w-3 animate-spin" /> Menghitung kekurangan stok...
                  </span>
                )}
              </label>
              <select
                value={selectedSalesOrderId}
                onChange={(e) => void handleSelectSalesOrder(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <option value="">-- Tanpa Sales Order (Stok Gudang / Kebutuhan Internal) --</option>
                {salesOrders.map((so) => {
                  const isApproved = so.status?.toLowerCase() === "confirmed" || so.status?.toLowerCase() === "approved";
                  const hasInvoiceDoc = Boolean(so.invoiceDocAttachment || so.customerPoAttachment);
                  const isEligible = isApproved && hasInvoiceDoc;

                  let statusTag = "";
                  if (!isApproved) {
                    statusTag = " [Terkunci: Menunggu Approval]";
                  } else if (!hasInvoiceDoc) {
                    statusTag = " [Terkunci: Belum Upload CI/PI]";
                  } else {
                    statusTag = ` [Siap Pengadaan - ${so.invoiceDocType || "CI/PI"}]`;
                  }

                  return (
                    <option key={so.id} value={so.id} disabled={!isEligible}>
                      {so.orderNumber} — {so.customerName}{statusTag}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Pilih SO jika pengadaan ini dibuat untuk memenuhi pesanan pelanggan tertentu (sistem akan otomatis menghitung kekurangan stok), atau kosongkan jika untuk stok gudang.
              </p>
            </div>

            {/* SO Shortage Analysis Card */}
            {soAnalysis && (
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-indigo-50/50 p-3.5 space-y-2.5 text-xs shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-950">
                    <Sparkles className="h-4 w-4 text-brand-primary" />
                    Analisis Kebutuhan dari {soAnalysis.salesOrder.orderNumber}
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-800">
                    Pelanggan: {soAnalysis.salesOrder.customerName}
                  </span>
                </div>

                <div className="rounded-lg border border-blue-200/80 bg-white overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-blue-50/70 text-[11px] font-semibold text-blue-900 border-b border-blue-200/70">
                      <tr>
                        <th className="py-2 px-3">Item Barang</th>
                        <th className="py-2 px-3 text-center whitespace-nowrap">Kebutuhan SO</th>
                        <th className="py-2 px-3 text-center whitespace-nowrap">Stok Gudang</th>
                        <th className="py-2 px-3 text-center whitespace-nowrap">Kekurangan</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Status Rekomendasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {soAnalysis.items.map((item) => (
                        <tr key={item.productId} className={item.shortage > 0 ? "bg-amber-50/40" : "bg-emerald-50/30"}>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-foreground">{item.productName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{item.productSku}</div>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-medium whitespace-nowrap">
                            {item.orderedQty.toLocaleString("id-ID")} {item.unit}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-muted-foreground whitespace-nowrap">
                            {item.availableStock.toLocaleString("id-ID")} {item.unit}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold whitespace-nowrap">
                            {item.shortage > 0 ? (
                              <span className="text-amber-700">-{item.shortage.toLocaleString("id-ID")} {item.unit}</span>
                            ) : (
                              <span className="text-emerald-700">0</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            {item.shortage > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertCircle className="h-3 w-3" /> Kurang {item.shortage.toLocaleString("id-ID")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="h-3 w-3" /> Stok Cukup
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="text-[11px] text-blue-900 font-medium">
                    {soAnalysis.totalShortageItems > 0 ? (
                      <span className="flex items-center gap-1 text-amber-900">
                        ⚡ Terdeteksi <strong>{soAnalysis.totalShortageItems} item</strong> kekurangan stok yang otomatis dimasukkan ke daftar pengadaan di bawah.
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Semua item pada SO ini stoknya telah mencukupi di gudang.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const lines = soAnalysis.items
                          .filter((i) => i.shortage > 0)
                          .map((i) => ({
                            productId: i.productId,
                            quantity: i.shortage,
                            notes: `Kekurangan ${soAnalysis.salesOrder.orderNumber} (Butuh ${i.orderedQty.toLocaleString("id-ID")}, Stok ${i.availableStock.toLocaleString("id-ID")})`,
                          }));
                        setPrLines(lines);
                      }}
                      className="h-7 text-[11px] bg-white border-blue-200 text-blue-800 hover:bg-blue-50"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Muat Kekurangan
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const lines = soAnalysis.items.map((i) => ({
                          productId: i.productId,
                          quantity: i.orderedQty,
                          notes: `Seluruh kebutuhan ${soAnalysis.salesOrder.orderNumber}`,
                        }));
                        setPrLines(lines);
                      }}
                      className="h-7 text-[11px] bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      Muat Semua Qty SO
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setPrLines([])}
                      className="h-7 text-[11px] text-rose-600 hover:bg-rose-50"
                    >
                      Kosongkan
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Department</label>
              <Input
                value={department || "Tidak ditemukan di data karyawan HRM"}
                disabled
                readOnly
                aria-invalid={!department}
                className={!department ? "border-rose-300 text-rose-700" : undefined}
              />
              {!department && (
                <p className="text-[11px] text-rose-600">
                  Akun Anda belum tertaut ke data karyawan HRM, sehingga Purchase Request tidak dapat diajukan. Hubungi admin.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Requested By</label>
              <Input value={currentUser.name} disabled readOnly />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Required Date</label>
              <Input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Item Barang</label>

              <div className="rounded-lg border border-border bg-slate-50/60 p-3 space-y-3">
                {prLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Belum ada item. Pilih produk di bawah lalu klik &quot;Tambah&quot; atau pilih Sumber SO untuk auto-suggest kekurangan barang.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border bg-white overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-border">
                        {prLines.map((l) => {
                          const product = products.find((p) => p.id === l.productId);
                          const subtotal = l.quantity * (product?.costPrice || 0);
                          return (
                            <tr key={l.productId}>
                              <td className="py-2 px-3">
                                <div className="font-medium text-foreground">{product?.name || l.productId}</div>
                                {l.notes && <div className="text-[10px] text-muted-foreground">{l.notes}</div>}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <Input
                                    type="number"
                                    min={1}
                                    value={l.quantity}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      if (val >= 1) {
                                        setPrLines((prev) =>
                                          prev.map((item) => (item.productId === l.productId ? { ...item, quantity: val } : item))
                                        );
                                      }
                                    }}
                                    className="h-7 w-20 text-center text-xs bg-white font-medium"
                                  />
                                  <span className="text-[11px] text-muted-foreground">{product?.unit || "Unit"}</span>
                                </div>
                              </td>
                              {pricesAllowed && (
                                <td className="py-2 px-3 text-right whitespace-nowrap text-muted-foreground">
                                  <MoneyDisplay amount={subtotal} />
                                </td>
                              )}
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(l.productId)}
                                  className="text-rose-600 hover:underline text-[11px] font-medium"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {pricesAllowed && prLines.length > 0 && (
                        <tfoot className="bg-slate-50 border-t border-border font-bold">
                          <tr>
                            <td colSpan={2} className="py-1.5 px-3 text-right text-muted-foreground text-[11px]">
                              Total Estimasi:
                            </td>
                            <td className="py-1.5 px-3 text-right text-brand-primary text-xs">
                              <MoneyDisplay amount={createPrTotalNominal} />
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 sm:flex">
                    <select
                      value={lineProductId}
                      onChange={(e) => setLineProductId(e.target.value)}
                      className="col-span-2 flex h-10 w-full flex-1 min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
                    >
                      <option value="">Pilih produk...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}){pricesAllowed ? ` — Rp ${(p.costPrice || 0).toLocaleString("id-ID")}` : ""}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={1}
                      value={lineQty}
                      onChange={(e) => setLineQty(e.target.value)}
                      className="w-16 shrink-0 bg-white"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddLine} className="h-10 text-xs shrink-0 bg-white">
                      Tambah
                    </Button>
                  </div>
                  <Input
                    placeholder="Catatan item (opsional)"
                    value={lineNotes}
                    onChange={(e) => setLineNotes(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold">
                Simpan Sebagai Draft
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit PR Dialog (Draft Only) */}
      <Dialog open={!!editingPr} onOpenChange={(open) => !open && setEditingPr(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Edit Purchase Request ({editingPr?.prNumber})</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="min-w-0 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Kategori Pengadaan</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <option value="inventory">Inventory (Bahan Baku & Kemasan)</option>
                <option value="non_inventory">Non-Inventory (ATK, Consumables, Maintenance)</option>
                <option value="fixed_asset">Fixed Asset (Mesin, Peralatan, Sarana)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Department</label>
              <Input value={editingPr?.department || ""} disabled readOnly />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Required Date</label>
              <Input
                type="date"
                value={editRequiredDate}
                onChange={(e) => setEditRequiredDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Item Barang</label>

              <div className="rounded-lg border border-border bg-slate-50/60 p-3 space-y-3">
                {editLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Belum ada item. Pilih produk di bawah lalu klik &quot;Tambah&quot;.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border bg-white overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-border">
                        {editLines.map((l) => {
                          const product = products.find((p) => p.id === l.productId);
                          const subtotal = l.quantity * (product?.costPrice || 0);
                          return (
                            <tr key={l.productId}>
                              <td className="py-2 px-3">
                                <div className="font-medium text-foreground">{product?.name || l.productId}</div>
                                {l.notes && <div className="text-[10px] text-muted-foreground">{l.notes}</div>}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">{l.quantity}x</td>
                              {pricesAllowed && (
                                <td className="py-2 px-3 text-right whitespace-nowrap text-muted-foreground">
                                  <MoneyDisplay amount={subtotal} />
                                </td>
                              )}
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleEditRemoveLine(l.productId)}
                                  className="text-rose-600 hover:underline text-[11px] font-medium"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {pricesAllowed && editLines.length > 0 && (
                        <tfoot className="bg-slate-50 border-t border-border font-bold">
                          <tr>
                            <td colSpan={2} className="py-1.5 px-3 text-right text-muted-foreground text-[11px]">
                              Total Estimasi:
                            </td>
                            <td className="py-1.5 px-3 text-right text-brand-primary text-xs">
                              <MoneyDisplay amount={editPrTotalNominal} />
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 sm:flex">
                    <select
                      value={editLineProductId}
                      onChange={(e) => setEditLineProductId(e.target.value)}
                      className="col-span-2 flex h-10 w-full flex-1 min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
                    >
                      <option value="">Pilih produk...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}){pricesAllowed ? ` — Rp ${(p.costPrice || 0).toLocaleString("id-ID")}` : ""}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={1}
                      value={editLineQty}
                      onChange={(e) => setEditLineQty(e.target.value)}
                      className="w-16 shrink-0 bg-white"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleEditAddLine} className="h-10 text-xs shrink-0 bg-white">
                      Tambah
                    </Button>
                  </div>
                  <Input
                    placeholder="Catatan item (opsional)"
                    value={editLineNotes}
                    onChange={(e) => setEditLineNotes(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingPr(null)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" disabled={isEditSubmitting} className="text-xs font-semibold">
                {isEditSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog with Full Information & Approval Timeline */}
      <Dialog open={!!selectedPr} onOpenChange={(open) => !open && setSelectedPr(null)}>
        {selectedPr && (
          <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 space-y-4">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-6">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <span>{selectedPr.prNumber}</span>
                    <PRStatusBadge status={selectedPr.status} />
                    <PRCategoryBadge category={selectedPr.category} />
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground pt-0.5">
                    Tanggal Pengajuan: {selectedPr.requestDate} • Diajukan oleh: {selectedPr.requestedBy}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground block font-medium">Estimasi Total Nilai</span>
                  {pricesAllowed ? (
                    <MoneyDisplay amount={selectedPrTotalNominal} highlight className="text-base font-bold text-foreground" />
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">*** (Rahasia)</span>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* General Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-border">
              <div>
                <span className="text-muted-foreground text-[11px] block">Departemen</span>
                <span className="font-semibold text-foreground">{selectedPr.department}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Target Kebutuhan</span>
                <span className="font-semibold text-foreground">{selectedPr.requiredDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Jumlah Item</span>
                <span className="font-semibold text-foreground">{selectedPr.itemCount} SKU</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Estimasi Nominal</span>
                <span className="font-semibold text-foreground">
                  {pricesAllowed ? <MoneyDisplay amount={selectedPrTotalNominal} /> : "***"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Sumber Sales Order</span>
                {selectedPr.salesOrderNo ? (
                  <span className="font-mono font-semibold text-brand-primary">{selectedPr.salesOrderNo}</span>
                ) : (
                  <span className="text-muted-foreground">Stok / Internal</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Status Dokumen</span>
                <span className="font-semibold capitalize text-foreground">{selectedPr.status}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-foreground">Rincian Item Barang yang Diminta</h4>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-3 text-left font-semibold">Nama Produk</th>
                      <th className="py-2 px-3 text-center font-semibold">Qty</th>
                      {pricesAllowed && (
                        <>
                          <th className="py-2 px-3 text-right font-semibold">Harga Satuan (Est.)</th>
                          <th className="py-2 px-3 text-right font-semibold">Subtotal (Est.)</th>
                        </>
                      )}
                      <th className="py-2 px-3 text-left font-semibold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedPr.lines && selectedPr.lines.length > 0 ? (
                      selectedPr.lines.map((l, idx) => {
                        const product = products.find((p) => p.id === l.productId);
                        const unitPrice = product?.costPrice || 0;
                        const subtotal = l.quantity * unitPrice;
                        return (
                          <tr key={idx}>
                            <td className="py-2 px-3">
                              <span className="font-medium text-foreground">{product?.name || l.productId}</span>
                              {product?.sku && (
                                <span className="block text-[10px] text-muted-foreground font-mono">{product.sku}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-semibold">{l.quantity}x</td>
                            {pricesAllowed && (
                              <>
                                <td className="py-2 px-3 text-right text-muted-foreground">
                                  <MoneyDisplay amount={unitPrice} />
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-foreground">
                                  <MoneyDisplay amount={subtotal} />
                                </td>
                              </>
                            )}
                            <td className="py-2 px-3 text-muted-foreground">{l.notes || "—"}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={pricesAllowed ? 5 : 3} className="py-3 text-center text-muted-foreground">
                          {selectedPr.itemCount} items terlampir
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {pricesAllowed && selectedPr.lines && selectedPr.lines.length > 0 && (
                    <tfoot className="bg-slate-50 border-t border-border font-bold">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right text-muted-foreground text-xs">
                          Total Estimasi Nilai PR:
                        </td>
                        <td className="py-2.5 px-3 text-right text-brand-primary text-xs font-bold">
                          <MoneyDisplay amount={selectedPrTotalNominal} />
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Interactive Timeline & Hierarchy Status */}
            <ApprovalTimeline
              documentType="purchase_request"
              documentId={selectedPr.id}
              creatorName={selectedPr.requestedBy}
              createdAt={selectedPr.requestDate}
              currentStatus={selectedPr.status}
              rejectionReason={selectedPr.rejectionReason}
            />

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedPr(null)}>
                  Tutup
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-300"
                  onClick={() => setIsPrintPreviewOpen(true)}
                >
                  <Printer className="h-3.5 w-3.5 text-brand-primary" /> Cetak / Print
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {/* Draft Actions */}
                {(selectedPr.status || "").toLowerCase() === "draft" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs font-semibold"
                      onClick={() => {
                        const toEdit = selectedPr;
                        setSelectedPr(null);
                        handleOpenEdit(toEdit);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit Draft
                    </Button>
                    <Button
                      variant="gradient"
                      size="sm"
                      className="gap-1.5 text-xs font-semibold"
                      onClick={() => handleSendForApproval(selectedPr.id, selectedPr.prNumber)}
                    >
                      <Send className="h-3.5 w-3.5" /> Kirim untuk Approval
                    </Button>
                  </>
                )}

                {/* Approval Actions in Detail */}
                {(
                  (selectedPr.status || "").toLowerCase() === "pending_approval" ||
                  (selectedPr.status || "").toLowerCase() === "pending" ||
                  (selectedPr.status || "").toLowerCase() === "submitted" ||
                  (selectedPr.status || "").toLowerCase() === "pending_supervisor" ||
                  (selectedPr.status || "").toLowerCase() === "pending_owner"
                ) &&
                  canUserApprove(
                    currentUser.role,
                    currentUser.email,
                    selectedPr.requestedBy,
                    activeApprovals[selectedPr.id],
                    selectedPr.status
                  ) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                        onClick={() => handleRejectPR(selectedPr.id, selectedPr.prNumber)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Tolak
                      </Button>
                      <Button
                        variant="gradient"
                        size="sm"
                        className="text-xs font-bold"
                        onClick={() => handleApprovePR(selectedPr.id, selectedPr.prNumber)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Setujui
                      </Button>
                    </>
                  )}
                {(selectedPr.status || "").toLowerCase() === "approved" && (
                  <Button
                    variant="gradient"
                    size="sm"
                    className="gap-1.5 text-xs font-semibold"
                    onClick={() => {
                      window.location.href = `/procurement/purchase-orders?fromPrId=${selectedPr.id}`;
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Terbitkan PO ke Supplier
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Print Preview Dialog */}
      <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        {selectedPr && (
          <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 space-y-4">
            <DialogHeader className="pb-2 border-b border-border">
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Printer className="h-4 w-4 text-brand-primary" />
                    <span>Preview Cetak Purchase Request</span>
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground pt-0.5">
                    Tampilan dokumen cetak A4 resmi untuk nomor {selectedPr.prNumber}.
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Document Preview Sheet (Simulates A4 Paper) */}
            <div className="bg-slate-100/80 p-3 sm:p-6 rounded-xl border border-slate-200 overflow-x-auto flex justify-center">
              <div
                id="pr-printable-document"
                className="bg-white text-slate-900 shadow-md border border-slate-300 rounded-sm p-6 sm:p-10 w-full max-w-[210mm] text-xs space-y-5"
              >
                {/* Header / Kop */}
                <div className="header border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                  <div>
                    <h2 className="company-name text-lg font-black tracking-wider uppercase text-slate-950">
                      {currentCompany?.name || "PT SENTOSA MANDIRI SOLUSINDO"}
                    </h2>
                    <p className="company-sub text-[11px] text-slate-500 font-medium">
                      One ERP Requisition & Procurement System • Dokumen Resmi
                    </p>
                  </div>
                  <div className="doc-title text-right">
                    <h1 className="text-base font-black uppercase tracking-wide text-slate-900">PURCHASE REQUEST</h1>
                    <div className="doc-badge inline-block text-[10px] font-bold px-2 py-0.5 rounded border border-slate-400 mt-1 uppercase">
                      {selectedPr.status}
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="meta-grid grid grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 border border-slate-200 rounded p-3 text-[11px]">
                  <div className="meta-row flex">
                    <span className="meta-label w-36 text-slate-500 font-medium">No. Dokumen:</span>
                    <span className="meta-val font-bold text-slate-900 font-mono">{selectedPr.prNumber}</span>
                  </div>
                  <div className="meta-row flex">
                    <span className="meta-label w-36 text-slate-500 font-medium">Tanggal Pengajuan:</span>
                    <span className="meta-val font-semibold text-slate-900">{selectedPr.requestDate}</span>
                  </div>
                  <div className="meta-row flex">
                    <span className="meta-label w-36 text-slate-500 font-medium">Departemen:</span>
                    <span className="meta-val font-semibold text-slate-900">{selectedPr.department}</span>
                  </div>
                  <div className="meta-row flex">
                    <span className="meta-label w-36 text-slate-500 font-medium">Target Kebutuhan:</span>
                    <span className="meta-val font-semibold text-slate-900">{selectedPr.requiredDate}</span>
                  </div>
                  <div className="meta-row flex">
                    <span className="meta-label w-36 text-slate-500 font-medium">Diajukan Oleh:</span>
                    <span className="meta-val font-semibold text-slate-900">{selectedPr.requestedBy}</span>
                  </div>
                  <div className="meta-row flex">
                    <span className="meta-label w-36 text-slate-500 font-medium">Kategori Pengadaan:</span>
                    <span className="meta-val font-semibold text-slate-900 capitalize">{selectedPr.category || "Inventory"}</span>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 py-2 px-2.5 text-center w-10 font-bold">No</th>
                      <th className="border border-slate-300 py-2 px-2.5 text-left font-bold">Kode / SKU</th>
                      <th className="border border-slate-300 py-2 px-2.5 text-left font-bold">Deskripsi Barang</th>
                      <th className="border border-slate-300 py-2 px-2.5 text-center w-16 font-bold">Qty</th>
                      {pricesAllowed && (
                        <>
                          <th className="border border-slate-300 py-2 px-2.5 text-right w-28 font-bold">Harga Satuan (Est.)</th>
                          <th className="border border-slate-300 py-2 px-2.5 text-right w-28 font-bold">Subtotal (Est.)</th>
                        </>
                      )}
                      <th className="border border-slate-300 py-2 px-2.5 text-left font-bold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPr.lines && selectedPr.lines.length > 0 ? (
                      selectedPr.lines.map((l, idx) => {
                        const product = products.find((p) => p.id === l.productId);
                        const unitPrice = product?.costPrice || 0;
                        const subtotal = l.quantity * unitPrice;
                        return (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="border border-slate-300 py-2 px-2.5 text-center text-slate-500">{idx + 1}</td>
                            <td className="border border-slate-300 py-2 px-2.5 font-mono text-[10px] text-slate-600">
                              {product?.sku || "—"}
                            </td>
                            <td className="border border-slate-300 py-2 px-2.5 font-medium text-slate-900">
                              {product?.name || l.productId}
                            </td>
                            <td className="border border-slate-300 py-2 px-2.5 text-center font-bold text-slate-900">
                              {l.quantity}
                            </td>
                            {pricesAllowed && (
                              <>
                                <td className="border border-slate-300 py-2 px-2.5 text-right text-slate-600">
                                  Rp {unitPrice.toLocaleString("id-ID")}
                                </td>
                                <td className="border border-slate-300 py-2 px-2.5 text-right font-bold text-slate-900">
                                  Rp {subtotal.toLocaleString("id-ID")}
                                </td>
                              </>
                            )}
                            <td className="border border-slate-300 py-2 px-2.5 text-slate-600 text-[10.5px]">
                              {l.notes || "—"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={pricesAllowed ? 7 : 5} className="py-4 text-center text-slate-400">
                          {selectedPr.itemCount} items
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {pricesAllowed && selectedPr.lines && selectedPr.lines.length > 0 && (
                    <tfoot>
                      <tr className="total-row bg-slate-50 font-bold border-t-2 border-slate-400">
                        <td colSpan={5} className="border border-slate-300 py-2.5 px-3 text-right text-slate-700">
                          Total Estimasi Nilai PR:
                        </td>
                        <td className="border border-slate-300 py-2.5 px-3 text-right text-slate-950 font-bold">
                          Rp {selectedPrTotalNominal.toLocaleString("id-ID")}
                        </td>
                        <td className="border border-slate-300"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* Signatures / Persetujuan */}
                <div className="signatures grid grid-cols-3 gap-4 pt-4">
                  <div className="sig-box border border-slate-300 rounded p-2.5 text-center h-28 flex flex-col justify-between">
                    <span className="sig-title text-[10px] font-bold text-slate-600 uppercase">Diajukan Oleh</span>
                    <div className="space-y-0.5">
                      <span className="sig-name block font-bold text-slate-900 text-xs border-t border-slate-400 pt-1">
                        {selectedPr.requestedBy || "Pemohon"}
                      </span>
                      <span className="text-[9px] text-slate-500 block">Tgl: {selectedPr.requestDate}</span>
                    </div>
                  </div>

                  <div className="sig-box border border-slate-300 rounded p-2.5 text-center h-28 flex flex-col justify-between">
                    <span className="sig-title text-[10px] font-bold text-slate-600 uppercase">Diperiksa Supervisor</span>
                    <div className="space-y-0.5">
                      <span className="sig-name block font-bold text-slate-900 text-xs border-t border-slate-400 pt-1">
                        {selectedPr.supervisorApprovedBy || "(Belum Disetujui)"}
                      </span>
                      <span className="text-[9px] text-slate-500 block">Supervisor Dept.</span>
                    </div>
                  </div>

                  <div className="sig-box border border-slate-300 rounded p-2.5 text-center h-28 flex flex-col justify-between">
                    <span className="sig-title text-[10px] font-bold text-slate-600 uppercase">Disetujui Owner / Management</span>
                    <div className="space-y-0.5">
                      <span className="sig-name block font-bold text-slate-900 text-xs border-t border-slate-400 pt-1">
                        {selectedPr.ownerApprovedBy || "(Belum Disetujui)"}
                      </span>
                      <span className="text-[9px] text-slate-500 block">General Manager / Owner</span>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="footer-note border-t border-slate-200 pt-2 text-[9px] text-slate-400 text-center">
                  Dokumen ini dicetak otomatis dari sistem One ERP pada {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}. Dokumen sah tanpa cap basah jika telah disetujui secara digital.
                </div>
              </div>
            </div>

            {/* Dialog Action Buttons */}
            <DialogFooter className="pt-2 border-t border-border flex items-center justify-between sm:justify-between">
              <Button variant="outline" size="sm" onClick={() => setIsPrintPreviewOpen(false)}>
                Tutup Preview
              </Button>
              <Button
                variant="gradient"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                onClick={handlePrintDocument}
              >
                <Printer className="h-4 w-4" /> Cetak Sekarang
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
