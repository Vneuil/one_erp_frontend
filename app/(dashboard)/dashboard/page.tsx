"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  Boxes,
  Truck,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  Check,
  X,
  Send,
  FileText,
  ExternalLink,
  ClipboardCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { formatNumber } from "@/lib/utils";
import { downloadCsv } from "@/lib/utils/csv";
import { salesApi, SalesOrderItem } from "@/lib/api/sales";
import { inventoryApi, StockLevelItem } from "@/lib/api/inventory";
import { financeApi, ReceivableItem } from "@/lib/api/finance";
import { reportsApi, SalesPerformance } from "@/lib/api/reports";
import { approvalApi, ApprovalRequest } from "@/lib/api/approval";
import { procurementApi, PurchaseOrderItem, PurchaseRequestItem } from "@/lib/api/procurement";
import { useConfirm, useAlert, usePrompt } from "@/components/shared/confirm-modal";
import { useAppStore } from "@/stores/app-store";

import { useNavigationAccess } from "@/providers/navigation-access";
import { fetchAllPages } from "@/lib/api/pagination";
import { useTranslation } from "@/lib/i18n/translations";

const dashboardCopy = {
  "id": {
    "text0": "Dashboard Operasional",
    "text1": "Ringkasan pesanan, persediaan, dan piutang dari seluruh data yang tersedia.",
    "text2": "Ekspor Pesanan",
    "text3": "Lihat Pesanan Penjualan",
    "text4": "Total Nilai Pesanan",
    "text5": "pesanan penjualan",
    "text6": "Pesanan Belum Selesai",
    "text7": "Pesanan",
    "text8": "Nilai:",
    "text9": "Peringatan Stok Rendah",
    "text10": "Posisi Stok",
    "text11": "Perlu pengadaan stok",
    "text12": "Semua stok dalam kondisi aman",
    "text13": "Piutang Belum Lunas",
    "text14": "tagihan menunggu pembayaran",
    "text15": "Nilai Pesanan per Status",
    "text16": "Nilai pesanan untuk seluruh status, termasuk draf dan pembatalan.",
    "text17": "Belum ada data penjualan untuk ditampilkan.",
    "text18": "Akses Cepat",
    "text19": "Akses ke daftar transaksi dan proses operasional",
    "text20": "Lihat Penawaran",
    "text21": "Kelola penawaran harga pelanggan",
    "text22": "Lihat Pesanan Pembelian",
    "text23": "Kelola pembelian dari pemasok",
    "text24": "Stock Opname",
    "text25": "Cocokkan stok fisik gudang",
    "text26": "Lihat Pengiriman",
    "text27": "Pantau pesanan keluar dan resi pengiriman",
    "text28": "Pesanan Penjualan Terbaru",
    "text29": "Pesanan pelanggan terbaru di tenant aktif",
    "text30": "Lihat Semua →",
    "text31": "Belum ada pesanan penjualan.",
    "text32": "Stok Kritis",
    "text33": "Stok pada atau di bawah batas minimum",
    "text34": "Persediaan →",
    "text35": "Semua stok dalam kondisi aman.",
    "text36": "Minimum:",
    "text37": "Memuat dashboard...",
    "errorOrders": "Gagal memuat data pesanan",
    "errorStock": "Gagal memuat status stok",
    "errorFinance": "Gagal memuat data piutang",
    "errorReports": "Gagal memuat performa penjualan",
    "retryBtn": "Coba lagi",
    "approvalTitle": "Approval",
    "approvalSubtitle": "Pusat persetujuan dokumen transaksi dan pengajuan draf.",
    "approvalPendingTab": "Persetujuan Tertunda",
    "approvalDraftTab": "Draf Belum Terkirim",
    "viewAllApprovals": "Pusat Persetujuan →",
    "docNumberCol": "Nomor Dokumen",
    "docTypeCol": "Tipe",
    "partyCol": "Pengaju / Pihak",
    "dateCol": "Tanggal",
    "amountCol": "Total Nilai",
    "statusCol": "Status",
    "actionCol": "Aksi",
    "statusPendingLevel": "Menunggu Level",
    "statusDraft": "Draf (Belum Terkirim)",
    "approveBtn": "Setujui",
    "rejectBtn": "Tolak",
    "submitDraftBtn": "Kirim Approval",
    "viewBtn": "Lihat",
    "noPendingApprovals": "Tidak ada dokumen yang menunggu persetujuan Anda.",
    "noPendingApprovalsDesc": "Semua dokumen telah diproses atau saat ini belum ada persetujuan yang ditugaskan ke akun Anda.",
    "noDrafts": "Tidak ada draf dokumen yang belum dikirim.",
    "noDraftsDesc": "Semua pesanan penjualan, pembelian, atau permintaan pembelian Anda telah diajukan.",
    "confirmApproveTitle": "Setujui Dokumen",
    "confirmApproveMsg": "Apakah Anda yakin ingin menyetujui dokumen ini?",
    "rejectPromptTitle": "Tolak Dokumen",
    "rejectPromptMsg": "Masukkan alasan penolakan:",
    "confirmSubmitTitle": "Kirim untuk Persetujuan",
    "confirmSubmitMsg": "Kirim dokumen untuk proses persetujuan (approval)?",
    "errorApprovalAction": "Gagal memproses persetujuan dokumen",
    "errorSubmit": "Gagal mengirim dokumen untuk approval"
  },
  "en": {
    "text0": "Operations Dashboard",
    "text1": "Overview of orders, inventory and receivables across all available records.",
    "text2": "Export Orders",
    "text3": "View Sales Orders",
    "text4": "Total Order Value",
    "text5": "total sales orders",
    "text6": "Open Sales Orders",
    "text7": "Orders",
    "text8": "Value:",
    "text9": "Low Stock Alerts",
    "text10": "Stock Positions",
    "text11": "Requires replenishment",
    "text12": "All stock levels healthy",
    "text13": "Unpaid Invoices (AR)",
    "text14": "invoices awaiting payment",
    "text15": "Order Value by Status",
    "text16": "Order value across all statuses, including drafts and cancellations.",
    "text17": "No sales data to display.",
    "text18": "Quick Operations",
    "text19": "Open transaction lists and operational workflows",
    "text20": "View Quotations",
    "text21": "Draft pricing proposal for client",
    "text22": "View Purchase Orders",
    "text23": "Procure materials from vendor",
    "text24": "Stock Opname Audit",
    "text25": "Reconcile physical warehouse stock",
    "text26": "View Shipments",
    "text27": "Track outbound orders and airway bills",
    "text28": "Recent Sales Orders",
    "text29": "Latest customer orders in the active tenant",
    "text30": "View All →",
    "text31": "No sales orders yet.",
    "text32": "Critical Stock Items",
    "text33": "Stock at or below its minimum level",
    "text34": "Inventory →",
    "text35": "All stock levels are healthy.",
    "text36": "Min:",
    "text37": "Loading dashboard…",
    "errorOrders": "Failed to load orders",
    "errorStock": "Failed to load stock levels",
    "errorFinance": "Failed to load receivables",
    "errorReports": "Failed to load sales performance",
    "retryBtn": "Retry",
    "approvalTitle": "Approval",
    "approvalSubtitle": "Transaction document approval center and draft submissions.",
    "approvalPendingTab": "Pending Approvals",
    "approvalDraftTab": "Unsubmitted Drafts",
    "viewAllApprovals": "Approval Center →",
    "docNumberCol": "Document No.",
    "docTypeCol": "Type",
    "partyCol": "Requester / Party",
    "dateCol": "Date",
    "amountCol": "Total Amount",
    "statusCol": "Status",
    "actionCol": "Actions",
    "statusPendingLevel": "Pending Level",
    "statusDraft": "Draft (Unsubmitted)",
    "approveBtn": "Approve",
    "rejectBtn": "Reject",
    "submitDraftBtn": "Submit Approval",
    "viewBtn": "View",
    "noPendingApprovals": "No documents awaiting your approval.",
    "noPendingApprovalsDesc": "All documents have been acted on or none are currently assigned to your account.",
    "noDrafts": "No unsubmitted draft documents.",
    "noDraftsDesc": "All of your sales orders, purchase orders, or purchase requests have been submitted.",
    "confirmApproveTitle": "Approve Document",
    "confirmApproveMsg": "Are you sure you want to approve this document?",
    "rejectPromptTitle": "Reject Document",
    "rejectPromptMsg": "Enter rejection reason:",
    "confirmSubmitTitle": "Submit for Approval",
    "confirmSubmitMsg": "Submit document for approval process?",
    "errorApprovalAction": "Failed to process approval",
    "errorSubmit": "Failed to submit document for approval"
  }
};

const OPEN_ORDER_STATUSES = ["draft", "pending", "confirmed", "processing"];

const DOCUMENT_TYPE_LABELS: Record<
  string,
  { id: string; en: string; badge: string; badgeClass: string }
> = {
  sales_order: {
    id: "Pesanan Penjualan",
    en: "Sales Order",
    badge: "SO",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  purchase_order: {
    id: "Pesanan Pembelian",
    en: "Purchase Order",
    badge: "PO",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  purchase_request: {
    id: "Permintaan Pembelian",
    en: "Purchase Request",
    badge: "PR",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

interface UnifiedDraftDoc {
  id: string;
  documentType: "sales_order" | "purchase_order" | "purchase_request";
  documentNumber: string;
  partyName: string;
  amount?: number;
  itemCount?: number;
  date?: string;
  createdByEmail?: string;
  viewHref: string;
}

const TARGET_DOC_TYPES = ["sales_order", "purchase_order", "purchase_request"];

export default function DashboardPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const prompt = usePrompt();
  const { currentUser } = useAppStore();

  const { canView } = useNavigationAccess();
  const showSales = canView("/sales/sales-orders");
  const showStock = canView("/inventory/stock");
  const showFinance = canView("/finance/receivables");
  const showReports = canView("/reports");
  const { isIndonesian } = useTranslation();
  const copy = isIndonesian ? dashboardCopy.id : dashboardCopy.en;
  const [attempt, setAttempt] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<SalesOrderItem[]>([]);
  const [stockLevels, setStockLevels] = React.useState<StockLevelItem[]>([]);
  const [receivables, setReceivables] = React.useState<ReceivableItem[]>([]);
  const [performance, setPerformance] = React.useState<SalesPerformance | null>(null);

  const [pendingApprovals, setPendingApprovals] = React.useState<ApprovalRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrderItem[]>([]);
  const [purchaseRequests, setPurchaseRequests] = React.useState<PurchaseRequestItem[]>([]);
  const [actingApprovalId, setActingApprovalId] = React.useState<string | null>(null);
  const [actingDraftId, setActingDraftId] = React.useState<string | null>(null);
  const [selectedTab, setSelectedTab] = React.useState<"approvals" | "drafts" | null>(null);

  const [ordersError, setOrdersError] = React.useState(false);
  const [stockError, setStockError] = React.useState(false);
  const [financeError, setFinanceError] = React.useState(false);
  const [reportsError, setReportsError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setOrdersError(false);
      setStockError(false);
      setFinanceError(false);
      setReportsError(false);

      const [ordersRes, stockRes, finRes, repRes, appRes, poRes, prRes] = await Promise.allSettled([
        showSales ? fetchAllPages(salesApi.listOrders) : Promise.resolve([]),
        showStock ? fetchAllPages(inventoryApi.listStockLevels) : Promise.resolve([]),
        showFinance ? fetchAllPages(financeApi.listReceivables) : Promise.resolve([]),
        showReports ? reportsApi.getSalesPerformance().then((res) => {
          if (!res.success || !res.data) throw new Error(res.message);
          return res.data;
        }) : Promise.resolve(null),
        approvalApi.listMyPendingApprovals().then((res) => res.data || []).catch(() => []),
        fetchAllPages(procurementApi.listPurchaseOrders).catch(() => []),
        fetchAllPages(procurementApi.listPurchaseRequests).catch(() => []),
      ]);

      if (cancelled) return;
      if (ordersRes.status === "fulfilled") {
        setOrders(ordersRes.value);
      } else {
        setOrdersError(true);
      }

      if (stockRes.status === "fulfilled") {
        setStockLevels(stockRes.value);
      } else {
        setStockError(true);
      }

      if (finRes.status === "fulfilled") {
        setReceivables(finRes.value);
      } else {
        setFinanceError(true);
      }

      if (repRes.status === "fulfilled") {
        setPerformance(repRes.value);
      } else {
        setReportsError(true);
      }

      if (appRes.status === "fulfilled") {
        setPendingApprovals(appRes.value);
      }

      if (poRes.status === "fulfilled") {
        setPurchaseOrders(poRes.value);
      }

      if (prRes.status === "fulfilled") {
        setPurchaseRequests(prRes.value);
      }
      setLoading(false);
    };

    loadData();

    return () => { cancelled = true; };
  }, [attempt, showSales, showStock, showFinance, showReports]);

  const myPendingApprovals = React.useMemo(() => {
    return pendingApprovals
      .filter((req) => TARGET_DOC_TYPES.includes((req.documentType || "").toLowerCase()))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [pendingApprovals]);

  const allDraftDocs = React.useMemo<UnifiedDraftDoc[]>(() => {
    const draftSOs: UnifiedDraftDoc[] = orders
      .filter((o) => (o.status || "").toLowerCase() === "draft")
      .map((o) => ({
        id: o.id,
        documentType: "sales_order",
        documentNumber: o.orderNumber,
        partyName: o.customerName || "-",
        amount: o.totalAmount,
        itemCount: o.lines?.length,
        date: o.orderDate || o.createdAt,
        createdByEmail: o.createdByEmail,
        viewHref: "/sales/sales-orders",
      }));

    const draftPOs: UnifiedDraftDoc[] = purchaseOrders
      .filter((po) => (po.status || "").toLowerCase() === "draft")
      .map((po) => ({
        id: po.id,
        documentType: "purchase_order",
        documentNumber: po.orderNo,
        partyName: po.supplierName || "-",
        amount: po.totalAmount,
        itemCount: po.lines?.length,
        date: po.orderDate || po.createdAt,
        createdByEmail: po.createdByEmail,
        viewHref: "/procurement/purchase-orders",
      }));

    const draftPRs: UnifiedDraftDoc[] = purchaseRequests
      .filter((pr) => (pr.status || "").toLowerCase() === "draft")
      .map((pr) => ({
        id: pr.id,
        documentType: "purchase_request",
        documentNumber: pr.requestNo,
        partyName: pr.department || pr.requestedBy || "-",
        amount: undefined,
        itemCount: pr.lines?.length || 0,
        date: pr.neededByDate || pr.createdAt,
        createdByEmail: pr.requestedBy,
        viewHref: "/procurement/purchase-requests",
      }));

    return [...draftSOs, ...draftPOs, ...draftPRs];
  }, [orders, purchaseOrders, purchaseRequests]);

  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const userName = (currentUser?.name || "").toLowerCase().trim();

  const myDrafts = React.useMemo(() => {
    return allDraftDocs
      .filter((doc) => {
        const creator = (doc.createdByEmail || "").toLowerCase().trim();
        // If user info is not yet available, show all drafts
        if (!userEmail && !userName) return true;
        // If creator was not saved on the document (seed/legacy data), include it
        if (!creator) return true;
        // Match by current user email or name
        if (userEmail && creator === userEmail) return true;
        if (userName && creator === userName) return true;
        return false;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [allDraftDocs, userEmail, userName]);

  // Tab selection logic: No hardcoded role names!
  // If user has pending approvals, default to "approvals".
  // If user has 0 pending approvals, default to "drafts".
  const activeTab = selectedTab ?? (myPendingApprovals.length > 0 ? "approvals" : "drafts");

  const formatDocDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat(isIndonesian ? "id-ID" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleApprove = async (req: ApprovalRequest) => {
    const typeConfig = DOCUMENT_TYPE_LABELS[req.documentType] || {
      id: req.documentType,
      en: req.documentType,
      badge: req.documentType.toUpperCase(),
      badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    };
    const docLabel = isIndonesian ? typeConfig.id : typeConfig.en;
    const ok = await confirm({
      title: copy.confirmApproveTitle,
      message: `${copy.confirmApproveMsg} (${docLabel} ${req.documentNumber})`,
      confirmText: copy.approveBtn,
      variant: "default",
    });
    if (!ok) return;

    setActingApprovalId(req.id);
    try {
      const res = await approvalApi.approveStep(req.id);
      if (!res.success) throw new Error(res.message || "Failed to approve");
      setAttempt((n) => n + 1);
    } catch (err) {
      await alert({
        title: copy.confirmApproveTitle,
        message: err instanceof Error ? err.message : copy.errorApprovalAction,
        variant: "destructive",
      });
    } finally {
      setActingApprovalId(null);
    }
  };

  const handleReject = async (req: ApprovalRequest) => {
    const typeConfig = DOCUMENT_TYPE_LABELS[req.documentType] || {
      id: req.documentType,
      en: req.documentType,
      badge: req.documentType.toUpperCase(),
      badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    };
    const docLabel = isIndonesian ? typeConfig.id : typeConfig.en;
    const comments = await prompt({
      title: copy.rejectPromptTitle,
      message: `${copy.rejectPromptMsg} (${docLabel} ${req.documentNumber})`,
      placeholder: isIndonesian ? "Tuliskan alasan penolakan (opsional)..." : "Reason for rejection (optional)...",
      confirmText: copy.rejectBtn,
      cancelText: isIndonesian ? "Batal" : "Cancel",
      variant: "destructive",
      inputType: "textarea",
    });
    if (comments === null) return;

    setActingApprovalId(req.id);
    try {
      const res = await approvalApi.rejectStep(req.id, comments.trim());
      if (!res.success) throw new Error(res.message || "Failed to reject");
      setAttempt((n) => n + 1);
    } catch (err) {
      await alert({
        title: copy.rejectPromptTitle,
        message: err instanceof Error ? err.message : copy.errorApprovalAction,
        variant: "destructive",
      });
    } finally {
      setActingApprovalId(null);
    }
  };

  const handleSubmitDraft = async (doc: UnifiedDraftDoc) => {
    const typeConfig = DOCUMENT_TYPE_LABELS[doc.documentType] || {
      id: doc.documentType,
      en: doc.documentType,
      badge: doc.documentType.toUpperCase(),
      badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    };
    const docLabel = isIndonesian ? typeConfig.id : typeConfig.en;
    const ok = await confirm({
      title: copy.confirmSubmitTitle,
      message: `${copy.confirmSubmitMsg} (${docLabel} ${doc.documentNumber})`,
      confirmText: copy.submitDraftBtn,
      variant: "default",
    });
    if (!ok) return;

    setActingDraftId(doc.id);
    try {
      if (doc.documentType === "sales_order") {
        const res = await salesApi.submitOrder(doc.id);
        if (!res.success) throw new Error(res.message);
      } else if (doc.documentType === "purchase_order") {
        const res = await procurementApi.submitPurchaseOrder(doc.id);
        if (!res.success) throw new Error(res.message);
      } else if (doc.documentType === "purchase_request") {
        const res = await procurementApi.submitPurchaseRequest(doc.id);
        if (!res.success) throw new Error(res.message);
      }
      setAttempt((n) => n + 1);
    } catch (err) {
      await alert({
        title: copy.confirmSubmitTitle,
        message: err instanceof Error ? err.message : copy.errorSubmit,
        variant: "destructive",
      });
    } finally {
      setActingDraftId(null);
    }
  };

  const openOrders = orders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status?.toLowerCase()));
  const openOrdersValue = openOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const lowStockItems = stockLevels.filter((s) => s.available <= s.minStock);
  const unpaidReceivables = receivables.filter((r) => r.status?.toLowerCase() !== "paid");
  const unpaidTotal = unpaidReceivables.reduce((sum, r) => sum + r.outstanding, 0);
  const recentOrders = [...orders]
    .sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || ""))
    .slice(0, 5);
  const criticalStock = [...lowStockItems]
    .sort((a, b) => a.available - b.available)
    .slice(0, 5);

  const chartData = performance?.revenueByStatus?.map((s) => ({ name: s.status, revenue: s.revenue })) ?? [];

  const handleExportReport = () => {
    downloadCsv(
      "sales-orders.csv",
      isIndonesian ? ["Nomor Pesanan", "Pelanggan", "Tanggal", "Nilai", "Status"] : ["Order Number", "Customer", "Date", "Amount", "Status"],
      orders.map((o) => [o.orderNumber, o.customerName, o.orderDate, o.totalAmount, o.status])
    );
  };

  const allFailed = (
    (!showSales || ordersError) &&
    (!showStock || stockError) &&
    (!showFinance || financeError) &&
    (!showReports || reportsError)
  );

  if (allFailed && !loading) return (
    <div role="alert" className="space-y-3 p-6 border rounded-xl">
      <p>{isIndonesian ? "Dashboard belum dapat dimuat. Periksa koneksi atau izin akses Anda." : "Unable to load the dashboard. Check your connection or access permissions."}</p>
      <Button onClick={() => setAttempt((n) => n + 1)}>{copy.retryBtn}</Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />{copy.text37}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={copy.text0}
        description={copy.text1}
      >
        <Button disabled={!showSales || orders.length === 0} variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExportReport}>
          <Download className="h-3.5 w-3.5" />
          {copy.text2}
        </Button>
        {showSales && <Button asChild variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
          <Link href="/sales/sales-orders">
            <ShoppingCart className="h-3.5 w-3.5" />
            {copy.text3}
          </Link>
        </Button>}
      </PageHeader>

      {/* 4 Key Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        {showReports && <Card className="hover:border-brand-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {copy.text4}
              </span>
              <div className="h-9 w-9 rounded-lg bg-brand-tint text-brand-primary flex items-center justify-center shadow-xs">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              {reportsError ? (
                <div>
                  <h3 className="text-sm font-bold text-rose-600">{copy.errorReports}</h3>
                  <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline mt-1 cursor-pointer">
                    {copy.retryBtn}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-foreground">
                    <MoneyDisplay amount={performance?.totalRevenue ?? 0} />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {performance?.totalOrders ?? 0} {copy.text5}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Card 2: Open Sales Orders */}
        {showSales && <Card className="hover:border-brand-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {copy.text6}
              </span>
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center shadow-xs">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              {ordersError ? (
                <div>
                  <h3 className="text-sm font-bold text-rose-600">{copy.errorOrders}</h3>
                  <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline mt-1 cursor-pointer">
                    {copy.retryBtn}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-foreground">{openOrders.length} {copy.text7}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {copy.text8} <MoneyDisplay amount={openOrdersValue} className="font-semibold" />
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Card 3: Critical Inventory */}
        {showStock && <Card className="hover:border-brand-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {copy.text9}
              </span>
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              {stockError ? (
                <div>
                  <h3 className="text-sm font-bold text-rose-600">{copy.errorStock}</h3>
                  <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline mt-1 cursor-pointer">
                    {copy.retryBtn}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-foreground">{lowStockItems.length} {copy.text10}</h3>
                  <p className="text-xs text-amber-700 font-medium mt-1">
                    {lowStockItems.length > 0 ? copy.text11 : copy.text12}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Card 4: Pending Invoices */}
        {showFinance && <Card className="hover:border-brand-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {copy.text13}
              </span>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-brand-indigo flex items-center justify-center shadow-xs">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              {financeError ? (
                <div>
                  <h3 className="text-sm font-bold text-rose-600">{copy.errorFinance}</h3>
                  <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline mt-1 cursor-pointer">
                    {copy.retryBtn}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-foreground">
                    <MoneyDisplay amount={unpaidTotal} />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {unpaidReceivables.length} {copy.text14}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>}
      </div>

      {/* Analytics Chart & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Status Chart */}
        {showReports && <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">{copy.text15}</CardTitle>
              <CardDescription>{copy.text16}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  {copy.text17}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECE7F3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6C6680" }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#6C6680" }}
                      tickFormatter={(val: number) => (val >= 1_000_000 ? `${(val / 1_000_000).toFixed(0)}${isIndonesian ? "jt" : "M"}` : String(val))}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "0.75rem",
                        border: "1px solid #E1EEDD",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                        fontSize: "12px",
                      }}
                      formatter={(val) => [new Intl.NumberFormat(isIndonesian ? "id-ID" : "en-US", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val)), isIndonesian ? "Nilai Pesanan" : "Order Value"]}
                    />
                    <Bar dataKey="revenue" fill="#50B747" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Quick Operations Actions */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-bold">{copy.text18}</CardTitle>
            <CardDescription>{copy.text19}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-2.5">
            {canView("/sales/quotations") && <Link
              href="/sales/quotations"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-brand-primary/40 hover:bg-brand-tint/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-brand-indigo">
                    {copy.text20}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{copy.text21}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-indigo" />
            </Link>}

            {canView("/procurement/purchase-orders") && <Link
              href="/procurement/purchase-orders"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-brand-primary/40 hover:bg-brand-tint/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-brand-indigo flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-brand-indigo">
                    {copy.text22}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{copy.text23}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-indigo" />
            </Link>}

            {canView("/inventory/stock-opname") && <Link
              href="/inventory/stock-opname"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-brand-primary/40 hover:bg-brand-tint/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Boxes className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-brand-indigo">
                    {copy.text24}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{copy.text25}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-indigo" />
            </Link>}

            {canView("/warehouse/shipping") && <Link
              href="/warehouse/shipping"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-brand-primary/40 hover:bg-brand-tint/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-brand-indigo">
                    {copy.text26}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{copy.text27}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-indigo" />
            </Link>}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Approval Table (SO, PO, PR requiring user approval or unsubmitted drafts) */}
      <Card className="border-border shadow-2xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand-tint text-brand-primary flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span>{copy.approvalTitle}</span>
                  {activeTab === "approvals" ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {myPendingApprovals.length} {copy.approvalPendingTab}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {myDrafts.length} {copy.approvalDraftTab}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {copy.approvalSubtitle}
                </CardDescription>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            {/* View Switching Pills: Allows toggling between Pending Approvals and Unsubmitted Drafts */}
            <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setSelectedTab("approvals")}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                  activeTab === "approvals"
                    ? "bg-white text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{copy.approvalPendingTab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "approvals" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
                }`}>
                  {myPendingApprovals.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab("drafts")}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                  activeTab === "drafts"
                    ? "bg-white text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{copy.approvalDraftTab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "drafts" ? "bg-brand-tint text-brand-primary" : "bg-slate-200 text-slate-600"
                }`}>
                  {myDrafts.length}
                </span>
              </button>
            </div>

            <Button asChild variant="ghost" size="sm" className="text-xs text-brand-primary h-8">
              <Link href="/approvals">{copy.viewAllApprovals}</Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {activeTab === "approvals" ? (
              myPendingApprovals.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mx-auto" />
                  <p className="text-xs font-semibold text-foreground">{copy.noPendingApprovals}</p>
                  <p className="text-[11px] text-muted-foreground">{copy.noPendingApprovalsDesc}</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-y border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">{copy.docNumberCol}</th>
                      <th className="py-3 px-4">{copy.docTypeCol}</th>
                      <th className="py-3 px-4">{copy.partyCol}</th>
                      <th className="py-3 px-4">{copy.dateCol}</th>
                      <th className="py-3 px-4 text-right">{copy.amountCol}</th>
                      <th className="py-3 px-4 text-center">{copy.statusCol}</th>
                      <th className="py-3 px-4 text-right">{copy.actionCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {myPendingApprovals.map((req) => {
                      const typeConfig = DOCUMENT_TYPE_LABELS[req.documentType] || {
                        id: req.documentType,
                        en: req.documentType,
                        badge: req.documentType.toUpperCase(),
                        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
                      };
                      const currentStep = req.steps?.find((s) => s.levelOrder === req.currentLevel);
                      const viewHref =
                        req.documentType === "sales_order"
                          ? "/sales/sales-orders"
                          : req.documentType === "purchase_order"
                          ? "/procurement/purchase-orders"
                          : "/procurement/purchase-requests";

                      return (
                        <tr key={req.id} className="hover:bg-brand-tint/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            <Link href={viewHref} className="hover:text-brand-primary hover:underline">
                              {req.documentNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${typeConfig.badgeClass}`}>
                              {typeConfig.badge} · {isIndonesian ? typeConfig.id : typeConfig.en}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {req.requesterName || "-"}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                            {formatDocDate(req.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-foreground whitespace-nowrap">
                            <MoneyDisplay amount={req.amount} />
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="h-3 w-3" />
                              {copy.statusPendingLevel} {req.currentLevel}
                              {currentStep?.approverRole ? ` (${currentStep.approverRole})` : ""}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actingApprovalId === req.id}
                                onClick={() => handleReject(req)}
                                className="h-7 px-2.5 text-xs font-semibold border-rose-300 text-rose-700 hover:bg-rose-50 cursor-pointer"
                              >
                                <X className="h-3 w-3 mr-1" />
                                {copy.rejectBtn}
                              </Button>
                              <Button
                                size="sm"
                                variant="gradient"
                                disabled={actingApprovalId === req.id}
                                onClick={() => handleApprove(req)}
                                className="h-7 px-2.5 text-xs font-semibold cursor-pointer"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                {copy.approveBtn}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              myDrafts.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-semibold text-foreground">{copy.noDrafts}</p>
                  <p className="text-[11px] text-muted-foreground">{copy.noDraftsDesc}</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-y border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">{copy.docNumberCol}</th>
                      <th className="py-3 px-4">{copy.docTypeCol}</th>
                      <th className="py-3 px-4">{copy.partyCol}</th>
                      <th className="py-3 px-4">{copy.dateCol}</th>
                      <th className="py-3 px-4 text-right">{copy.amountCol}</th>
                      <th className="py-3 px-4 text-center">{copy.statusCol}</th>
                      <th className="py-3 px-4 text-right">{copy.actionCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {myDrafts.map((doc) => {
                      const typeConfig = DOCUMENT_TYPE_LABELS[doc.documentType] || {
                        id: doc.documentType,
                        en: doc.documentType,
                        badge: doc.documentType.toUpperCase(),
                        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
                      };

                      return (
                        <tr key={`${doc.documentType}-${doc.id}`} className="hover:bg-brand-tint/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            <Link href={doc.viewHref} className="hover:text-brand-primary hover:underline">
                              {doc.documentNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${typeConfig.badgeClass}`}>
                              {typeConfig.badge} · {isIndonesian ? typeConfig.id : typeConfig.en}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {doc.partyName}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                            {formatDocDate(doc.date)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-foreground whitespace-nowrap">
                            {doc.amount !== undefined ? (
                              <MoneyDisplay amount={doc.amount} />
                            ) : (
                              <span className="text-muted-foreground font-normal">{doc.itemCount ?? 0} item</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                              {copy.statusDraft}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs font-semibold cursor-pointer"
                              >
                                <Link href={doc.viewHref}>
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  {copy.viewBtn}
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="gradient"
                                disabled={actingDraftId === doc.id}
                                onClick={() => handleSubmitDraft(doc)}
                                className="h-7 px-2.5 text-xs font-semibold cursor-pointer"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                {copy.submitDraftBtn}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two Columns: Recent Sales Orders and Critical Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        {showSales && <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">{copy.text28}</CardTitle>
              <CardDescription>{copy.text29}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-brand-primary">
              <Link href="/sales/sales-orders">{copy.text30}</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {ordersError ? (
              <div className="p-4 text-xs text-rose-600 space-y-1">
                <p className="font-semibold">{copy.errorOrders}</p>
                <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline cursor-pointer">
                  {copy.retryBtn}
                </button>
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4">{copy.text31}</p>
            ) : (
              <div className="divide-y divide-border">
                {recentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between p-4 hover:bg-brand-tint/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">{ord.orderNumber}</span>
                        <StatusBadge status={ord.status} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{ord.customerName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-foreground">
                        <MoneyDisplay amount={ord.totalAmount} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Stock Alerts */}
        {showStock && <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">{copy.text32}</CardTitle>
              <CardDescription>{copy.text33}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-brand-primary">
              <Link href="/inventory/stock">{copy.text34}</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {stockError ? (
              <div className="p-4 text-xs text-rose-600 space-y-1">
                <p className="font-semibold">{copy.errorStock}</p>
                <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline cursor-pointer">
                  {copy.retryBtn}
                </button>
              </div>
            ) : criticalStock.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4">{copy.text35}</p>
            ) : (
              <div className="divide-y divide-border">
                {criticalStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 hover:bg-brand-tint/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-brand-indigo">
                          {item.productSku}
                        </span>
                        <StatusBadge status={item.available <= 0 ? "out_of_stock" : "low_stock"} />
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{item.productName}</p>
                      <p className="text-[11px] text-muted-foreground">{item.warehouseName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-rose-600">
                        {formatNumber(item.available)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {copy.text36} {item.minStock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>}
      </div>
    </div>
  );
}
