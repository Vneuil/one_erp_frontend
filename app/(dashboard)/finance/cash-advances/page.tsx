"use client";

import * as React from "react";
import {
  Wallet,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Clock,
  AlertCircle,
  ArrowRight,
  Eye,
  Edit3,
  Printer,
  Download,
  Trash2,
  Send,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useNavigationAccess } from "@/providers/navigation-access";
import {
  financeApi,
  AccountItem,
  CashAdvanceItem,
  CashAdvanceOutstandingReportItem,
  CashAdvanceDifferenceReportItem,
} from "@/lib/api/finance";

const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

type TabType = "all" | "outstanding" | "differences";
type FilterStatus = "all" | "cr_pending" | "form_pending" | "form_revision" | "ready_disburse" | "disbursed" | "pj_pending" | "pj_revision" | "settled" | "rejected";

export default function CashAdvancesPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("finance");

  const [activeTab, setActiveTab] = React.useState<TabType>("all");
  const [items, setItems] = React.useState<CashAdvanceItem[]>([]);
  const [outstandingItems, setOutstandingItems] = React.useState<CashAdvanceOutstandingReportItem[]>([]);
  const [diffItems, setDiffItems] = React.useState<CashAdvanceDifferenceReportItem[]>([]);
  const [accounts, setAccounts] = React.useState<AccountItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");

  // Modals state
  const [showCreateCR, setShowCreateCR] = React.useState(false);
  const [showApproveCR, setShowApproveCR] = React.useState<CashAdvanceItem | null>(null);
  const [showFillForm, setShowFillForm] = React.useState<CashAdvanceItem | null>(null);
  const [showApproveForm, setShowApproveForm] = React.useState<CashAdvanceItem | null>(null);
  const [showDisburse, setShowDisburse] = React.useState<CashAdvanceItem | null>(null);
  const [showFillPJ, setShowFillPJ] = React.useState<CashAdvanceItem | null>(null);
  const [showApprovePJ, setShowApprovePJ] = React.useState<CashAdvanceItem | null>(null);
  const [showDetail, setShowDetail] = React.useState<CashAdvanceItem | null>(null);

  // Form inputs: Create CR
  const [crEmployee, setCrEmployee] = React.useState("");
  const [crDept, setCrDept] = React.useState("");
  const [crPurpose, setCrPurpose] = React.useState("");
  const [crAmount, setCrAmount] = React.useState<number>(0);
  const [crDate, setCrDate] = React.useState(todayStr());

  // Form inputs: Fill Form KBS
  const [kbsDate, setKbsDate] = React.useState(todayStr());
  const [kbsDueDate, setKbsDueDate] = React.useState(todayStr());
  const [kbsAmount, setKbsAmount] = React.useState<number>(0);
  const [planLines, setPlanLines] = React.useState<{ description: string; estimatedAmount: number; targetAccountCode: string }[]>([
    { description: "", estimatedAmount: 0, targetAccountCode: "" },
  ]);

  // Form inputs: Disburse
  const [disburseDate, setDisburseDate] = React.useState(todayStr());
  const [disburseCashCode, setDisburseCashCode] = React.useState("1000");
  const [disburseMethod, setDisburseMethod] = React.useState("Tunai");

  // Form inputs: Submit Settlement (PJ)
  const [pjDate, setPjDate] = React.useState(todayStr());
  const [pjSettleCode, setPjSettleCode] = React.useState("1000");
  const [settleLines, setSettleLines] = React.useState<{
    description: string;
    accountCode: string;
    amount: number;
    receiptNo: string;
    receiptDate: string;
    attachmentUrl: string;
  }[]>([{ description: "", accountCode: "", amount: 0, receiptNo: "", receiptDate: todayStr(), attachmentUrl: "" }]);

  // Rejection reasons
  const [rejectReason, setRejectReason] = React.useState("");

  // Load data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [advancesRes, accountsRes, outRes, diffRes] = await Promise.all([
        financeApi.listCashAdvances(),
        financeApi.listAccounts({ perPage: 500 }),
        financeApi.getOutstandingCashAdvances(),
        financeApi.getCashAdvanceDifferences(),
      ]);
      setItems(advancesRes.data || []);
      setAccounts((accountsRes.data || []).filter((a) => a.isActive));
      setOutstandingItems(outRes.data || []);
      setDiffItems(diffRes.data || []);
    } catch (e) {
      setError(errText(e, "Gagal memuat data Kas Bon Sementara."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter accounts for cash/bank and expenses
  const cashAccounts = accounts.filter((a) => a.type === "asset" && (/^10\d\d$/.test(a.code) || a.name.toLowerCase().includes("kas") || a.name.toLowerCase().includes("bank")));
  const expenseAccounts = accounts.filter((a) => a.type === "expense" || a.code.startsWith("5"));

  // Computed Stats
  const crPendingCount = items.filter((x) => x.crStatus === "pending").length;
  const formPendingCount = items.filter((x) => x.crStatus === "approved" && (x.kbsStatus === "pending" || x.kbsStatus === "draft")).length;
  const disbursedWaitingPJ = items.filter((x) => x.disburseDate && (x.pjStatus === "none" || x.pjStatus === "revision")).length;
  const pjPendingCount = items.filter((x) => x.pjStatus === "pending").length;
  const totalOutstandingAmount = outstandingItems.reduce((acc, curr) => acc + (curr.kbsAmount || 0), 0);

  // Filtered Items
  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.crNumber.toLowerCase().includes(q) ||
      (item.kbsNumber && item.kbsNumber.toLowerCase().includes(q)) ||
      item.employeeName.toLowerCase().includes(q) ||
      item.purpose.toLowerCase().includes(q) ||
      (item.department && item.department.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (filterStatus === "cr_pending") return item.crStatus === "pending";
    if (filterStatus === "form_pending") return item.kbsStatus === "pending";
    if (filterStatus === "form_revision") return item.kbsStatus === "revision";
    if (filterStatus === "ready_disburse") return item.kbsStatus === "approved" && !item.disburseDate;
    if (filterStatus === "disbursed") return item.disburseDate && (item.pjStatus === "none" || item.pjStatus === "revision");
    if (filterStatus === "pj_pending") return item.pjStatus === "pending";
    if (filterStatus === "pj_revision") return item.pjStatus === "revision";
    if (filterStatus === "settled") return item.pjStatus === "settled";
    if (filterStatus === "rejected") return item.crStatus === "rejected";

    return true;
  });

  // Action Helpers
  const handleCreateCR = async () => {
    if (!crEmployee.trim()) return setError("Nama karyawan/pemohon wajib diisi");
    if (!crPurpose.trim()) return setError("Keperluan penggunaan dana wajib diisi");
    if (crAmount <= 0) return setError("Nominal permohonan harus lebih dari 0");

    setBusy(true);
    setError(null);
    try {
      await financeApi.createCashRequest({
        employeeName: crEmployee,
        department: crDept,
        purpose: crPurpose,
        crAmount: crAmount,
        crDate: crDate,
      });
      setShowCreateCR(false);
      setCrEmployee("");
      setCrDept("");
      setCrPurpose("");
      setCrAmount(0);
      setNotice("Cash Request berhasil dibuat dan menunggu persetujuan Finance.");
      await loadData();
    } catch (e) {
      setError(errText(e, "Gagal membuat Cash Request."));
    } finally {
      setBusy(false);
    }
  };

  const handleApproveCR = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await financeApi.approveCashRequest(id);
      setShowApproveCR(null);
      setNotice("Cash Request telah disetujui. Silakan pemohon mengisi Formulir Kas Bon.");
      await loadData();
    } catch (e) {
      setError(errText(e, "Gagal menyetujui Cash Request."));
    } finally {
      setBusy(false);
    }
  };

  const handleRejectCR = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await financeApi.rejectCashRequest(id, rejectReason);
      setShowApproveCR(null);
      setRejectReason("");
      setNotice("Cash Request telah ditolak.");
      await loadData();
    } catch (e) {
      setError(errText(e, "Gagal menolak Cash Request."));
    } finally {
      setBusy(false);
    }
  };

  const openFillForm = (item: CashAdvanceItem) => {
    setShowFillForm(item);
    setKbsDate(item.kbsDate || todayStr());
    setKbsDueDate(item.kbsDueDate || todayStr());
    setKbsAmount(item.kbsAmount || item.crAmount);
    if (item.planLines && item.planLines.length > 0) {
      setPlanLines(
        item.planLines.map((l) => ({
          description: l.description,
          estimatedAmount: l.estimatedAmount,
          targetAccountCode: l.targetAccountCode || "",
        }))
      );
    } else {
      setPlanLines([{ description: item.purpose, estimatedAmount: item.crAmount, targetAccountCode: "5000" }]);
    }
  };

  const handleFillForm = async (id: string) => {
    if (kbsAmount <= 0) return setError("Nominal Kas Bon harus lebih dari 0");
    if (planLines.some((l) => !l.description.trim() || l.estimatedAmount <= 0)) {
      return setError("Pastikan seluruh baris rincian biaya memiliki deskripsi dan nominal positif");
    }

    setBusy(true);
    setError(null);
    try {
      await financeApi.fillCashAdvanceForm(id, {
        kbsDate,
        kbsDueDate,
        kbsAmount,
        lines: planLines,
      });
      setShowFillForm(null);
      setNotice("Formulir Kas Bon berhasil disimpan dan dikirim untuk Approval Finance.");
      await loadData();
    } catch (e) {
      setError(errText(e, "Gagal menyimpan formulir Kas Bon."));
    } finally {
      setBusy(false);
    }
  };

  const handleApproveForm = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await financeApi.approveCashAdvanceForm(id);
      setShowApproveForm(null);
      setNotice("Formulir Kas Bon telah disetujui dan siap untuk dicairkan oleh Kasir/Finance.");
      await loadData();
    } catch (e) {
      setError(errText(e, "Gagal menyetujui Formulir Kas Bon."));
    } finally {
      setBusy(false);
    }
  };

  const handleRejectForm = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await financeApi.rejectCashAdvanceForm(id, rejectReason);
      setShowApproveForm(null);
      setRejectReason("");
      setNotice("Formulir Kas Bon ditolak untuk perbaikan oleh pemohon.");
      await loadData();
    } catch (e) {
      setError(errText(e, "Gagal menolak formulir Kas Bon."));
    } finally {
      setBusy(false);
    }
  };

  const openDisburse = (item: CashAdvanceItem) => {
    setShowDisburse(item);
    setDisburseDate(todayStr());
    setDisburseCashCode(cashAccounts[0]?.code || "1000");
    setDisburseMethod("Tunai");
  };

  const handleDisburse = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await financeApi.disburseCashAdvance(id, {
        date: disburseDate,
        cashAccountCode: disburseCashCode,
        paymentMethod: disburseMethod,
      });
      setShowDisburse(null);
      setNotice("Dana Kas Bon telah dicairkan dan jurnal Uang Muka Karyawan (1400) otomatis dibukukan.");
      await loadData();
    } catch (e) {
      setError(errText(e, "Gagal mencairkan dana Kas Bon."));
    } finally {
      setBusy(false);
    }
  };

  const openFillPJ = (item: CashAdvanceItem) => {
    setShowFillPJ(item);
    setPjDate(todayStr());
    setPjSettleCode(item.disburseCashAccountCode || "1000");
    if (item.settlementLines && item.settlementLines.length > 0) {
      setSettleLines(
        item.settlementLines.map((l) => ({
          description: l.description,
          accountCode: l.accountCode,
          amount: l.amount,
          receiptNo: l.receiptNo || "",
          receiptDate: l.receiptDate || todayStr(),
          attachmentUrl: l.attachmentUrl || "",
        }))
      );
    } else {
      setSettleLines([
        {
          description: item.purpose,
          accountCode: expenseAccounts[0]?.code || "5000",
          amount: item.kbsAmount || item.crAmount,
          receiptNo: "",
          receiptDate: todayStr(),
          attachmentUrl: "",
        },
      ]);
    }
  };

  const totalSettleAmount = settleLines.reduce((acc, l) => acc + (l.amount > 0 ? l.amount : 0), 0);
  const currentDiff = showFillPJ ? (showFillPJ.kbsAmount || 0) - totalSettleAmount : 0;

  const handleFillPJ = async (id: string) => {
    if (settleLines.length === 0) return setError("Minimal satu baris bukti transaksi diperlukan");
    if (settleLines.some((l) => !l.description.trim() || !l.accountCode || l.amount <= 0)) {
      return setError("Pastikan seluruh baris bukti memiliki deskripsi, akun beban yang valid, dan nominal positif");
    }

    setBusy(true);
    setError(null);
    try {
      await financeApi.submitSettlement(id, {
        pjDate,
        settlementAccountCode: pjSettleCode,
        lines: settleLines,
      });
      setShowFillPJ(null);
      setNotice("Pertanggungjawaban & Bukti Transaksi berhasil dikirim untuk Verifikasi Finance.");
      await loadData();
    } catch (e) {
      setError(errText(e, "Gagal mengirim pertanggungjawaban Kas Bon."));
    } finally {
      setBusy(false);
    }
  };

  const handleApprovePJ = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await financeApi.approveSettlement(id);
      setShowApprovePJ(null);
      setNotice("Pertanggungjawaban disetujui! Bukti Pengeluaran Kas (BKK) dan Jurnal Penutup otomatis dibukukan.");
      await loadData();
    } catch (e) {
      setError(errText(e, "Gagal menyetujui pertanggungjawaban."));
    } finally {
      setBusy(false);
    }
  };

  const handleRejectPJ = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await financeApi.rejectSettlement(id, rejectReason);
      setShowApprovePJ(null);
      setRejectReason("");
      setNotice("Pertanggungjawaban ditolak untuk perbaikan bukti transaksi oleh pemohon.");
      await loadData();
    } catch (e) {
      setError(errText(e, "Gagal menolak pertanggungjawaban."));
    } finally {
      setBusy(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (item: CashAdvanceItem) => {
    if (item.crStatus === "rejected") {
      return <Badge variant="destructive">CR Ditolak</Badge>;
    }
    if (item.crStatus === "pending") {
      return <Badge variant="warning">CR Menunggu Approval</Badge>;
    }
    if (item.crStatus === "approved" && item.kbsStatus === "draft") {
      return <Badge variant="secondary">CR Disetujui (Isi Form KBS)</Badge>;
    }
    if (item.kbsStatus === "pending") {
      return <Badge variant="warning">Form KBS Menunggu Approval</Badge>;
    }
    if (item.kbsStatus === "revision") {
      return <Badge variant="destructive">Form KBS Perlu Perbaikan</Badge>;
    }
    if (item.kbsStatus === "approved" && !item.disburseDate) {
      return <Badge variant="outline" className="border-emerald-500 text-emerald-600 font-medium">Siap Dicairkan (Disburse)</Badge>;
    }
    if (item.disburseDate && (item.pjStatus === "none" || !item.pjStatus)) {
      return <Badge variant="default" className="bg-blue-600">Dana Dicairkan (Menunggu PJ)</Badge>;
    }
    if (item.pjStatus === "pending") {
      return <Badge variant="warning">PJ Menunggu Verifikasi</Badge>;
    }
    if (item.pjStatus === "revision") {
      return <Badge variant="destructive">PJ Perlu Perbaikan Bukti</Badge>;
    }
    if (item.pjStatus === "settled") {
      return <Badge variant="success">Selesai (BKK Terbit)</Badge>;
    }
    return <Badge variant="secondary">{item.kbsStatus}</Badge>;
  };

  const exportCSV = (data: unknown[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0] as Record<string, unknown>).join(",");
    const rows = data.map((obj) =>
      Object.values(obj as Record<string, unknown>)
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([headers + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kas Bon Sementara (KBS)"
        description="Kelola siklus pengajuan dana operasional (Cash Request), approval form kas bon, pencairan dana, verifikasi bukti nota transaksi, hingga penerbitan Bukti Pengeluaran Kas (BKK) final."
      >
        <Button variant="outline" onClick={loadData} disabled={busy} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Segarkan
        </Button>
        <Button onClick={() => setShowCreateCR(true)} className="gap-2 bg-brand-primary text-white hover:bg-brand-primary/90">
          <Plus className="h-4 w-4" />
          Ajukan Cash Request
        </Button>
      </PageHeader>

      {/* Notice & Error banners */}
      {notice && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)} className="h-7 text-xs">
            Tutup
          </Button>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-7 text-xs">
            Tutup
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Cash Request Pending</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{crPendingCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Menunggu approval awal</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Form KBS Pending</p>
              <h3 className="text-2xl font-bold mt-1 text-indigo-600">{formPendingCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Verifikasi rincian biaya</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Dana Mengendap</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600">{disbursedWaitingPJ}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Dicairkan / Belum Selesai PJ</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Verifikasi Bukti PJ</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">{pjPendingCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Pemeriksaan nota transaksi</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Saldo Terbuka</p>
              <div className="mt-1">
                <MoneyDisplay amount={totalOutstandingAmount} className="text-lg font-bold text-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{outstandingItems.length} dokumen KBS aktif</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList className="grid grid-cols-3 max-w-xl">
          <TabsTrigger value="all" className="gap-2">
            <Wallet className="h-4 w-4" />
            Alur Operasional KBS
          </TabsTrigger>
          <TabsTrigger value="outstanding" className="gap-2">
            <Clock className="h-4 w-4" />
            Laporan KBS Terbuka ({outstandingItems.length})
          </TabsTrigger>
          <TabsTrigger value="differences" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Laporan Selisih Kas Bon ({diffItems.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL TRANSACTIONS & WORKFLOW */}
        <TabsContent value="all" className="space-y-4 pt-2">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari No. KBS, CR, nama pemohon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Semua Status</option>
                <option value="cr_pending">CR Menunggu Approval</option>
                <option value="form_pending">Form KBS Menunggu Approval</option>
                <option value="form_revision">Form KBS Perlu Perbaikan</option>
                <option value="ready_disburse">Siap Dicairkan</option>
                <option value="disbursed">Dicairkan (Menunggu PJ)</option>
                <option value="pj_pending">PJ Menunggu Verifikasi</option>
                <option value="pj_revision">PJ Perlu Perbaikan Bukti</option>
                <option value="settled">Selesai (BKK)</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
            <div className="text-xs text-muted-foreground">
              Menampilkan {filteredItems.length} dari {items.length} dokumen
            </div>
          </div>

          {/* Table */}
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium text-xs uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3">No. Dokumen</th>
                    <th className="px-4 py-3">Pemohon & Unit</th>
                    <th className="px-4 py-3">Keperluan</th>
                    <th className="px-4 py-3 text-right">Plafon CR</th>
                    <th className="px-4 py-3 text-right">Nilai KBS</th>
                    <th className="px-4 py-3 text-right">Realisasi PJ</th>
                    <th className="px-4 py-3 text-center">Status Tahapan</th>
                    <th className="px-4 py-3 text-center">Aksi Operasional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        Belum ada dokumen Kas Bon Sementara yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {item.kbsNumber || item.crNumber}
                          </div>
                          {item.kbsNumber && (
                            <div className="text-xs text-muted-foreground font-mono">
                              Ref: {item.crNumber}
                            </div>
                          )}
                          <div className="text-[11px] text-muted-foreground">
                            {item.kbsDate || item.crDate}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{item.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{item.department || "-"}</div>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate" title={item.purpose}>
                          {item.purpose}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          <MoneyDisplay amount={item.crAmount} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          {item.kbsAmount > 0 ? <MoneyDisplay amount={item.kbsAmount} /> : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.pjTotalRealized > 0 ? (
                            <div>
                              <MoneyDisplay amount={item.pjTotalRealized} />
                              {item.pjBalanceAmount !== 0 && (
                                <div className={`text-[11px] ${item.pjBalanceAmount > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                  {item.pjBalanceAmount > 0 ? "+ Sisa: " : "- Kurang: "}
                                  <MoneyDisplay amount={Math.abs(item.pjBalanceAmount)} />
                                </div>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {renderStatusBadge(item)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Action 1: CR Pending -> Review & Approve CR */}
                            {item.crStatus === "pending" && mayApprove && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                onClick={() => {
                                  setShowApproveCR(item);
                                  setRejectReason("");
                                }}
                              >
                                Review CR
                              </Button>
                            )}

                            {/* Action 2: CR Approved / KBS Draft -> Fill Form KBS */}
                            {item.crStatus === "approved" && item.kbsStatus === "draft" && (
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1 bg-brand-primary text-white"
                                onClick={() => openFillForm(item)}
                              >
                                Isi Form KBS
                              </Button>
                            )}

                            {/* Action 3: KBS Pending -> Review & Approve Form KBS */}
                            {item.kbsStatus === "pending" && mayApprove && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                                onClick={() => {
                                  setShowApproveForm(item);
                                  setRejectReason("");
                                }}
                              >
                                Review Form KBS
                              </Button>
                            )}

                            {/* Action 4: KBS Revision -> Perbaiki Form KBS */}
                            {item.kbsStatus === "revision" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs gap-1"
                                onClick={() => openFillForm(item)}
                              >
                                <Edit3 className="h-3 w-3" />
                                Perbaiki Form
                              </Button>
                            )}

                            {/* Action 5: KBS Approved & Not Disbursed -> Cairkan Dana */}
                            {item.kbsStatus === "approved" && !item.disburseDate && mayApprove && (
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openDisburse(item)}
                              >
                                <DollarSign className="h-3 w-3" />
                                Cairkan Dana
                              </Button>
                            )}

                            {/* Action 6: Disbursed & Not Settled -> Isi Pertanggungjawaban (PJ) */}
                            {item.disburseDate && (item.pjStatus === "none" || !item.pjStatus) && (
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => openFillPJ(item)}
                              >
                                <Send className="h-3 w-3" />
                                Isi PJ & Bukti
                              </Button>
                            )}

                            {/* Action 7: PJ Revision -> Perbaiki Bukti PJ */}
                            {item.pjStatus === "revision" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs gap-1"
                                onClick={() => openFillPJ(item)}
                              >
                                <Edit3 className="h-3 w-3" />
                                Perbaiki Bukti
                              </Button>
                            )}

                            {/* Action 8: PJ Pending -> Verifikasi & Approve PJ */}
                            {item.pjStatus === "pending" && mayApprove && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                                onClick={() => {
                                  setShowApprovePJ(item);
                                  setRejectReason("");
                                }}
                              >
                                Verifikasi PJ
                              </Button>
                            )}

                            {/* Action: Detail View */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              title="Lihat Rincian Dokumen"
                              onClick={() => setShowDetail(item)}
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: OUTSTANDING & AGING REPORT */}
        <TabsContent value="outstanding" className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Memantau seluruh permohonan Kas Bon Sementara yang belum selesai (belum dipertanggungjawabkan & dibukukan).
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(outstandingItems, `laporan_kbs_terbuka_${todayStr()}.csv`)}
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Laporan
              </Button>
            </div>
          </div>

          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium text-xs uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3">No. KBS / Ref</th>
                    <th className="px-4 py-3">Pemohon & Departemen</th>
                    <th className="px-4 py-3">Keperluan</th>
                    <th className="px-4 py-3">Tanggal Pencairan</th>
                    <th className="px-4 py-3">Jatuh Tempo</th>
                    <th className="px-4 py-3 text-center">Umur Kas Bon (Aging)</th>
                    <th className="px-4 py-3">Tahapan Progres</th>
                    <th className="px-4 py-3 text-right">Nilai Terbuka</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {outstandingItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        Tidak ada kas bon terbuka yang mengendap saat ini. Seluruh KBS telah selesai!
                      </td>
                    </tr>
                  ) : (
                    outstandingItems.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {o.kbsNumber || o.crNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{o.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{o.department || "-"}</div>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate">{o.purpose}</td>
                        <td className="px-4 py-3">{o.disburseDate || "-"}</td>
                        <td className="px-4 py-3">{o.kbsDueDate || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              o.agingDays > 14
                                ? "destructive"
                                : o.agingDays > 7
                                ? "warning"
                                : "outline"
                            }
                          >
                            {o.agingDays} Hari
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">{o.status}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          <MoneyDisplay amount={o.kbsAmount} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {outstandingItems.length > 0 && (
                  <tfoot className="bg-muted/40 font-bold border-t border-border">
                    <tr>
                      <td colSpan={7} className="px-4 py-3 text-right">
                        Total Dana Kas Bon Terbuka:
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">
                        <MoneyDisplay amount={totalOutstandingAmount} />
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: DIFFERENCES REPORT */}
        <TabsContent value="differences" className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Laporan analisa selisih antara dana kas bon yang dicairkan terhadap realisasi nota bukti pertanggungjawaban (Pengembalian Kas vs Penggantian Kekurangan).
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(diffItems, `laporan_selisih_kbs_${todayStr()}.csv`)}
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Laporan
              </Button>
            </div>
          </div>

          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium text-xs uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3">No. KBS & BKK</th>
                    <th className="px-4 py-3">Pemohon & Keperluan</th>
                    <th className="px-4 py-3 text-right">Dana Dicairkan</th>
                    <th className="px-4 py-3 text-right">Realisasi Riil</th>
                    <th className="px-4 py-3 text-right">Selisih</th>
                    <th className="px-4 py-3 text-center">Tindakan Selisih</th>
                    <th className="px-4 py-3">Akun Kas/Bank</th>
                    <th className="px-4 py-3 text-center">Status PJ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {diffItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        Belum ada data pertanggungjawaban kas bon yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    diffItems.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{d.kbsNumber}</div>
                          {d.bkkNumber && (
                            <div className="text-xs text-muted-foreground font-mono">
                              BKK: {d.bkkNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{d.employeeName}</div>
                          <div className="text-xs text-muted-foreground max-w-xs truncate">{d.purpose}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          <MoneyDisplay amount={d.kbsAmount} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          <MoneyDisplay amount={d.pjTotalRealized} />
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span
                            className={
                              d.balanceAmount > 0
                                ? "text-emerald-600"
                                : d.balanceAmount < 0
                                ? "text-amber-600"
                                : "text-muted-foreground"
                            }
                          >
                            {d.balanceAmount > 0 ? "+ " : d.balanceAmount < 0 ? "- " : ""}
                            <MoneyDisplay amount={Math.abs(d.balanceAmount)} />
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {d.settlementAction === "refund_to_company" && (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-600 gap-1">
                              <ArrowDownLeft className="h-3 w-3" />
                              Sisa Disetor ke Kas
                            </Badge>
                          )}
                          {d.settlementAction === "reimburse_to_employee" && (
                            <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1">
                              <ArrowUpRight className="h-3 w-3" />
                              Kekurangan Dibayar
                            </Badge>
                          )}
                          {d.settlementAction === "exact" && (
                            <Badge variant="secondary">Pas (Nol)</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">{d.settlementAccountCode || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={d.pjStatus === "settled" ? "success" : "warning"}>
                            {d.pjStatus === "settled" ? "Selesai" : "Menunggu Verifikasi"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: CREATE CASH REQUEST */}
      <Dialog open={showCreateCR} onOpenChange={setShowCreateCR}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Form Pengajuan Cash Request</DialogTitle>
            <DialogDescription>
              Tahap 1: Ajukan permohonan dana kas operasional awal untuk ditinjau oleh Finance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-foreground">Nama Karyawan / Pemohon *</label>
              <Input
                placeholder="Contoh: Budi Santoso"
                value={crEmployee}
                onChange={(e) => setCrEmployee(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Departemen / Divisi</label>
              <Input
                placeholder="Contoh: Operasional Lapangan"
                value={crDept}
                onChange={(e) => setCrDept(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Keperluan Penggunaan Kas *</label>
              <textarea
                rows={3}
                placeholder="Jelaskan kebutuhan pengeluaran dana secara rinci..."
                value={crPurpose}
                onChange={(e) => setCrPurpose(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Estimasi Dana (Rp) *</label>
                <Input
                  type="number"
                  min={1}
                  value={crAmount || ""}
                  onChange={(e) => setCrAmount(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Tanggal Pengajuan</label>
                <Input
                  type="date"
                  value={crDate}
                  onChange={(e) => setCrDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCR(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={handleCreateCR} disabled={busy} className="bg-brand-primary text-white">
              {busy ? "Menyimpan..." : "Kirim Cash Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: APPROVE / REJECT CASH REQUEST */}
      <Dialog open={!!showApproveCR} onOpenChange={() => setShowApproveCR(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Cash Request</DialogTitle>
            <DialogDescription>
              Tahap 2: Setujui permohonan dana untuk membuka form kas bon atau tolak jika tidak sesuai.
            </DialogDescription>
          </DialogHeader>
          {showApproveCR && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nomor CR:</span>
                  <span className="font-semibold text-foreground">{showApproveCR.crNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pemohon:</span>
                  <span className="font-medium text-foreground">{showApproveCR.employeeName} ({showApproveCR.department || "-"})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal:</span>
                  <span>{showApproveCR.crDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimasi Plafon:</span>
                  <MoneyDisplay amount={showApproveCR.crAmount} className="text-emerald-600 font-bold" />
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground block">Keperluan:</span>
                  <p className="text-xs text-foreground mt-0.5">{showApproveCR.purpose}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Catatan / Alasan (Wajib diisi jika menolak)</label>
                <textarea
                  rows={2}
                  placeholder="Berikan alasan jika menolak..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full mt-1 p-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between w-full">
            <Button
              variant="destructive"
              onClick={() => showApproveCR && handleRejectCR(showApproveCR.id)}
              disabled={busy}
            >
              Tolak CR
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowApproveCR(null)} disabled={busy}>
                Tutup
              </Button>
              <Button
                onClick={() => showApproveCR && handleApproveCR(showApproveCR.id)}
                disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Setujui (Approve)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: FILL / REVISE FORM KAS BON */}
      <Dialog open={!!showFillForm} onOpenChange={() => setShowFillForm(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Formulir Kas Bon Sementara (KBS)</DialogTitle>
            <DialogDescription>
              Tahap 3 & 4: Masukkan rincian pos kebutuhan biaya yang diajukan berdasarkan Cash Request yang disetujui.
            </DialogDescription>
          </DialogHeader>
          {showFillForm && (
            <div className="space-y-4 py-2">
              {showFillForm.kbsRejectReason && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs">
                  <strong>Catatan Perbaikan Sebelumnya:</strong> {showFillForm.kbsRejectReason}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Referensi Cash Request:</span>
                  <span className="font-semibold">{showFillForm.crNumber} (Plafon: <MoneyDisplay amount={showFillForm.crAmount} />)</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Penerima Dana (Payee):</span>
                  <span className="font-semibold">{showFillForm.employeeName}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Tanggal Kas Bon *</label>
                  <Input type="date" value={kbsDate} onChange={(e) => setKbsDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Batas Waktu PJ (Due Date) *</label>
                  <Input type="date" value={kbsDueDate} onChange={(e) => setKbsDueDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Nominal Diajukan (Rp) *</label>
                  <Input
                    type="number"
                    min={1}
                    value={kbsAmount || ""}
                    onChange={(e) => setKbsAmount(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Rencana Biaya Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Rincian Alokasi Rencana Biaya
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPlanLines([...planLines, { description: "", estimatedAmount: 0, targetAccountCode: "" }])
                    }
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" /> Tambah Baris
                  </Button>
                </div>
                <div className="space-y-2">
                  {planLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Deskripsi kebutuhan..."
                        value={line.description}
                        onChange={(e) => {
                          const copy = [...planLines];
                          copy[idx].description = e.target.value;
                          setPlanLines(copy);
                        }}
                        className="flex-1 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Nominal"
                        value={line.estimatedAmount || ""}
                        onChange={(e) => {
                          const copy = [...planLines];
                          copy[idx].estimatedAmount = Number(e.target.value);
                          setPlanLines(copy);
                        }}
                        className="w-36 text-xs text-right"
                      />
                      <select
                        value={line.targetAccountCode}
                        onChange={(e) => {
                          const copy = [...planLines];
                          copy[idx].targetAccountCode = e.target.value;
                          setPlanLines(copy);
                        }}
                        className="w-44 h-9 px-2 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="">-- Pos Akun --</option>
                        {expenseAccounts.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>
                      {planLines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPlanLines(planLines.filter((_, i) => i !== idx))}
                          className="h-8 w-8 p-0 text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFillForm(null)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={() => showFillForm && handleFillForm(showFillForm.id)} disabled={busy} className="bg-brand-primary text-white">
              {busy ? "Menyimpan..." : "Submit Formulir Kas Bon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: APPROVE / REJECT FORM KAS BON */}
      <Dialog open={!!showApproveForm} onOpenChange={() => setShowApproveForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verifikasi Kesesuaian Formulir Kas Bon</DialogTitle>
            <DialogDescription>
              Tahap 4: Cocokkan rincian Formulir Kas Bon terhadap Cash Request yang telah disetujui.
            </DialogDescription>
          </DialogHeader>
          {showApproveForm && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nomor KBS:</span>
                  <span className="font-semibold text-foreground">{showApproveForm.kbsNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plafon Cash Request:</span>
                  <MoneyDisplay amount={showApproveForm.crAmount} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal Diajukan di Form:</span>
                  <MoneyDisplay amount={showApproveForm.kbsAmount} className="text-foreground font-bold" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jatuh Tempo Penyelesaian:</span>
                  <span>{showApproveForm.kbsDueDate}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">
                  Rincian Rencana Biaya yang Diajukan:
                </span>
                <div className="max-h-40 overflow-y-auto rounded border border-border p-2 space-y-1 text-xs">
                  {showApproveForm.planLines?.map((pl, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                      <span>{pl.description}</span>
                      <span className="font-semibold"><MoneyDisplay amount={pl.estimatedAmount} /></span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Catatan / Alasan Perbaikan (Wajib jika menolak)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan perbaikan formulir untuk pemohon..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full mt-1 p-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between w-full">
            <Button
              variant="destructive"
              onClick={() => showApproveForm && handleRejectForm(showApproveForm.id)}
              disabled={busy}
            >
              Tolak untuk Perbaikan Form
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowApproveForm(null)} disabled={busy}>
                Tutup
              </Button>
              <Button
                onClick={() => showApproveForm && handleApproveForm(showApproveForm.id)}
                disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Setujui Form KBS
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: DISBURSE (PENCAIRAN DANA) */}
      <Dialog open={!!showDisburse} onOpenChange={() => setShowDisburse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pencairan Dana Kas Bon Sementara</DialogTitle>
            <DialogDescription>
              Tahap 5: Serahkan dana tunai/transfer ke pemohon. Sistem akan otomatis menjurnal Dr. Uang Muka Karyawan (1400) dan Cr. Kas/Bank.
            </DialogDescription>
          </DialogHeader>
          {showDisburse && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Penerima Dana:</span>
                  <span className="font-semibold text-foreground">{showDisburse.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal Dicairkan:</span>
                  <MoneyDisplay amount={showDisburse.kbsAmount} className="text-emerald-600 font-bold text-base" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Akun Sumber Kas / Bank *</label>
                <select
                  value={disburseCashCode}
                  onChange={(e) => setDisburseCashCode(e.target.value)}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Tanggal Pencairan *</label>
                  <Input type="date" value={disburseDate} onChange={(e) => setDisburseDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Metode Pembayaran</label>
                  <select
                    value={disburseMethod}
                    onChange={(e) => setDisburseMethod(e.target.value)}
                    className="w-full mt-1 h-9 px-2 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Cek / Giro">Cek / Giro</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded bg-muted/30 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Simulasi Jurnal Pencairan:</p>
                <p>• [Dr] 1400 - Employee Advances: <MoneyDisplay amount={showDisburse.kbsAmount} /></p>
                <p>• [Cr] {disburseCashCode} - Kas/Bank: <MoneyDisplay amount={showDisburse.kbsAmount} /></p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisburse(null)} disabled={busy}>
              Batal
            </Button>
            <Button
              onClick={() => showDisburse && handleDisburse(showDisburse.id)}
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {busy ? "Memproses..." : "Konfirmasi Pencairan Dana"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: FORM PERTANGGUNGJAWABAN (PJ) & BUKTI TRANSAKSI */}
      <Dialog open={!!showFillPJ} onOpenChange={() => setShowFillPJ(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Pertanggungjawaban Kas Bon (PJ)</DialogTitle>
            <DialogDescription>
              Tahap 6: Masukkan bukti transaksi fisik (Nomor Nota, Tanggal, Nominal, Pos Beban) yang telah direalisasikan.
            </DialogDescription>
          </DialogHeader>
          {showFillPJ && (
            <div className="space-y-4 py-2">
              {showFillPJ.pjRejectReason && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs">
                  <strong>Catatan Perbaikan Bukti Sebelumnya:</strong> {showFillPJ.pjRejectReason}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Kas Bon Diterima:</span>
                  <MoneyDisplay amount={showFillPJ.kbsAmount} className="text-foreground font-bold" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Total Realisasi Bukti:</span>
                  <MoneyDisplay amount={totalSettleAmount} className="text-foreground font-bold" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Selisih Realisasi:</span>
                  <span className={`font-bold ${currentDiff > 0 ? "text-emerald-600" : currentDiff < 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {currentDiff > 0 ? "+ Sisa Disetor: " : currentDiff < 0 ? "- Kekurangan Klaim: " : "Pas: "}
                    <MoneyDisplay amount={Math.abs(currentDiff)} />
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Tanggal Laporan Realisasi *</label>
                  <Input type="date" value={pjDate} onChange={(e) => setPjDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Akun Kas/Bank Penyelesaian Selisih</label>
                  <select
                    value={pjSettleCode}
                    onChange={(e) => setPjSettleCode(e.target.value)}
                    className="w-full mt-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {cashAccounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rincian Nota & Bukti Transaksi */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Daftar Bukti Transaksi / Nota Fisik
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSettleLines([
                        ...settleLines,
                        {
                          description: "",
                          accountCode: expenseAccounts[0]?.code || "5000",
                          amount: 0,
                          receiptNo: "",
                          receiptDate: todayStr(),
                          attachmentUrl: "",
                        },
                      ])
                    }
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" /> Tambah Bukti Nota
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {settleLines.map((line, idx) => (
                    <div key={idx} className="p-3 rounded-md border border-border bg-card space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <Input
                            placeholder="Deskripsi pengeluaran..."
                            value={line.description}
                            onChange={(e) => {
                              const copy = [...settleLines];
                              copy[idx].description = e.target.value;
                              setSettleLines(copy);
                            }}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="col-span-3">
                          <select
                            value={line.accountCode}
                            onChange={(e) => {
                              const copy = [...settleLines];
                              copy[idx].accountCode = e.target.value;
                              setSettleLines(copy);
                            }}
                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                          >
                            <option value="">-- Akun Beban --</option>
                            {expenseAccounts.map((a) => (
                              <option key={a.code} value={a.code}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Nominal"
                            value={line.amount || ""}
                            onChange={(e) => {
                              const copy = [...settleLines];
                              copy[idx].amount = Number(e.target.value);
                              setSettleLines(copy);
                            }}
                            className="text-xs h-8 text-right font-semibold"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder="No. Nota Fisik"
                            value={line.receiptNo}
                            onChange={(e) => {
                              const copy = [...settleLines];
                              copy[idx].receiptNo = e.target.value;
                              setSettleLines(copy);
                            }}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          {settleLines.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSettleLines(settleLines.filter((_, i) => i !== idx))}
                              className="h-7 w-7 p-0 text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-[11px] whitespace-nowrap">Tgl Nota:</span>
                          <Input
                            type="date"
                            value={line.receiptDate}
                            onChange={(e) => {
                              const copy = [...settleLines];
                              copy[idx].receiptDate = e.target.value;
                              setSettleLines(copy);
                            }}
                            className="text-xs h-7"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-[11px] whitespace-nowrap">Link / Bukti:</span>
                          <Input
                            placeholder="Link file bukti nota / drive..."
                            value={line.attachmentUrl}
                            onChange={(e) => {
                              const copy = [...settleLines];
                              copy[idx].attachmentUrl = e.target.value;
                              setSettleLines(copy);
                            }}
                            className="text-xs h-7"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFillPJ(null)} disabled={busy}>
              Batal
            </Button>
            <Button
              onClick={() => showFillPJ && handleFillPJ(showFillPJ.id)}
              disabled={busy}
              className="bg-brand-primary text-white"
            >
              {busy ? "Menyimpan..." : "Kirim Bukti Pertanggungjawaban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 7: APPROVE / REJECT PERTANGGUNGJAWABAN (PJ) */}
      <Dialog open={!!showApprovePJ} onOpenChange={() => setShowApprovePJ(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Verifikasi Pertanggungjawaban & Bukti Nota</DialogTitle>
            <DialogDescription>
              Tahap 7 & 8: Periksa keabsahan bukti pengeluaran. Jika disetujui, nomor Bukti Kas Keluar (BKK) dan jurnal penutup akan otomatis digenerate.
            </DialogDescription>
          </DialogHeader>
          {showApprovePJ && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kas Bon:</span>
                  <span className="font-semibold text-foreground">{showApprovePJ.kbsNumber} ({showApprovePJ.employeeName})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal Kas Bon:</span>
                  <MoneyDisplay amount={showApprovePJ.kbsAmount} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Nota Riil:</span>
                  <MoneyDisplay amount={showApprovePJ.pjTotalRealized} className="font-bold text-foreground" />
                </div>
                <div className="flex justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground">Status Selisih:</span>
                  <span className={`font-bold ${showApprovePJ.pjBalanceAmount > 0 ? "text-emerald-600" : showApprovePJ.pjBalanceAmount < 0 ? "text-amber-600" : "text-foreground"}`}>
                    {showApprovePJ.pjBalanceAmount > 0
                      ? `Sisa Uang Dikembalikan ke Kas: Rp ${showApprovePJ.pjBalanceAmount.toLocaleString("id-ID")}`
                      : showApprovePJ.pjBalanceAmount < 0
                      ? `Kekurangan Dibayarkan ke Karyawan: Rp ${Math.abs(showApprovePJ.pjBalanceAmount).toLocaleString("id-ID")}`
                      : "Jumlah Pas Sesuai Kas Bon"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">
                  Rincian Bukti Nota yang Diverifikasi:
                </span>
                <div className="max-h-48 overflow-y-auto rounded border border-border p-2 space-y-1.5 text-xs">
                  {showApprovePJ.settlementLines?.map((sl, idx) => (
                    <div key={idx} className="p-1.5 rounded bg-card flex justify-between items-center border border-border/40">
                      <div>
                        <div className="font-medium text-foreground">{sl.description}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Nota: {sl.receiptNo || "Tanpa No"} | Akun: {sl.accountCode}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold"><MoneyDisplay amount={sl.amount} /></div>
                        {sl.attachmentUrl && (
                          <a
                            href={sl.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-500 hover:underline"
                          >
                            Lihat Bukti
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Catatan Perbaikan Bukti (Wajib jika menolak)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan jika bukti nota belum lengkap atau ditolak..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full mt-1 p-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between w-full">
            <Button
              variant="destructive"
              onClick={() => showApprovePJ && handleRejectPJ(showApprovePJ.id)}
              disabled={busy}
            >
              Tolak untuk Perbaikan Bukti
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowApprovePJ(null)} disabled={busy}>
                Tutup
              </Button>
              <Button
                onClick={() => showApprovePJ && handleApprovePJ(showApprovePJ.id)}
                disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Approve & Terbitkan BKK
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 8: DETAIL DOKUMEN & CETAK BKK */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Dokumen Kas Bon Sementara</DialogTitle>
            <DialogDescription>
              Informasi lengkap riwayat transaksi permohonan hingga bukti pengeluaran kas final.
            </DialogDescription>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4 py-2 text-sm" id="printable-kbs-voucher">
              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <div>
                    <h4 className="font-bold text-base text-foreground">
                      {showDetail.kbsNumber || showDetail.crNumber}
                    </h4>
                    <span className="text-xs text-muted-foreground font-mono">Ref CR: {showDetail.crNumber}</span>
                  </div>
                  <div>{renderStatusBadge(showDetail)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Pemohon:</span>{" "}
                    <span className="font-medium">{showDetail.employeeName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Departemen:</span>{" "}
                    <span>{showDetail.department || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tanggal CR:</span>{" "}
                    <span>{showDetail.crDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tanggal Pencairan:</span>{" "}
                    <span>{showDetail.disburseDate || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Plafon Diminta:</span>{" "}
                    <MoneyDisplay amount={showDetail.crAmount} />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nominal Kas Bon:</span>{" "}
                    <MoneyDisplay amount={showDetail.kbsAmount || showDetail.crAmount} className="font-semibold" />
                  </div>
                  {showDetail.bkkNumber && (
                    <div className="col-span-2 pt-1 border-t border-border flex justify-between font-bold text-emerald-600">
                      <span>No. Bukti Kas Keluar (BKK):</span>
                      <span>{showDetail.bkkNumber}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border text-xs">
                  <span className="text-muted-foreground block mb-0.5">Keperluan:</span>
                  <p className="text-foreground">{showDetail.purpose}</p>
                </div>
              </div>

              {/* Rencana Biaya */}
              {showDetail.planLines && showDetail.planLines.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Rencana Pengeluaran Formulir:
                  </h5>
                  <div className="rounded border border-border p-2 space-y-1 text-xs">
                    {showDetail.planLines.map((pl, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-border/40 last:border-0">
                        <span>{pl.description}</span>
                        <span className="font-medium"><MoneyDisplay amount={pl.estimatedAmount} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bukti Transaksi Riil */}
              {showDetail.settlementLines && showDetail.settlementLines.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Realisasi Bukti Transaksi Riil (PJ):
                  </h5>
                  <div className="rounded border border-border p-2 space-y-1 text-xs">
                    {showDetail.settlementLines.map((sl, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-border/40 last:border-0">
                        <div>
                          <div className="font-medium">{sl.description}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Nota: {sl.receiptNo || "-"} | Akun: {sl.accountCode}
                          </div>
                        </div>
                        <span className="font-bold"><MoneyDisplay amount={sl.amount} /></span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-border font-bold">
                      <span>Total Realisasi:</span>
                      <MoneyDisplay amount={showDetail.pjTotalRealized} />
                    </div>
                    {showDetail.pjBalanceAmount !== 0 && (
                      <div className="flex justify-between text-xs font-semibold text-emerald-600">
                        <span>{showDetail.pjBalanceAmount > 0 ? "Pengembalian Sisa ke Kas:" : "Kekurangan Dibayarkan:"}</span>
                        <MoneyDisplay amount={Math.abs(showDetail.pjBalanceAmount)} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Cetak Bukti Dokumen
            </Button>
            <Button variant="outline" onClick={() => setShowDetail(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
