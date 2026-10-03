"use client";

import { useIsOwnDocument } from "@/lib/hooks/use-own-document";
import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import {
  Banknote,
  Plus,
  Search,
  Download,
  Building,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { MoneyDisplay } from "@/components/shared/money-display";
import { financeApi, PettyCashTransactionItem } from "@/lib/api/finance";

interface PettyCashBranch {
  id: string;
  branchName: string;
  custodian: string;
  maxFloat: number;
  currentBalance: number;
  totalSpentThisMonth: number;
  lastReplenished: string;
  status: "Sufficient" | "Need Replenishment";
}

export default function PettyCashPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("finance");
  const isOwn = useIsOwnDocument();
  const [branches, setBranches] = React.useState<PettyCashBranch[]>([]);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [branchName, setBranchName] = React.useState("");
  const [custodian, setCustodian] = React.useState("");
  const [maxFloat, setMaxFloat] = React.useState(0);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [txTarget, setTxTarget] = React.useState<PettyCashBranch | null>(null);
  const [transactions, setTransactions] = React.useState<PettyCashTransactionItem[]>([]);
  const [isLoadingTx, setIsLoadingTx] = React.useState(false);
  const [actingTxId, setActingTxId] = React.useState<string | null>(null);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || maxFloat <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await financeApi.createPettyCashFund({ branchName, custodian, maxFloat });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal membuka kas cabang.");
      }
      const f = res.data;
      setBranches([
        {
          id: f.id,
          branchName: f.branchName,
          custodian: f.custodian,
          maxFloat: f.maxFloat,
          currentBalance: f.currentBalance,
          totalSpentThisMonth: f.totalSpentThisMonth,
          lastReplenished: f.lastReplenished || "-",
          status: f.status === "Sufficient" ? "Sufficient" : "Need Replenishment",
        },
        ...branches,
      ]);
      setIsNewOpen(false);
      setBranchName("");
      setCustodian("");
      setMaxFloat(0);
      setNotice("Kas kecil cabang baru berhasil didaftarkan.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mendaftarkan kas kecil cabang. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    financeApi
      .listPettyCashFunds()
      .then((res) => {
        setBranches(
          (res.data || []).map((f) => ({
            id: f.id,
            branchName: f.branchName,
            custodian: f.custodian,
            maxFloat: f.maxFloat,
            currentBalance: f.currentBalance,
            totalSpentThisMonth: f.totalSpentThisMonth,
            lastReplenished: f.lastReplenished || "-",
            status: f.status === "Sufficient" ? "Sufficient" : "Need Replenishment",
          }))
        );
      })
      .catch((err) => {
        setPageError(err instanceof Error ? err.message : "Gagal memuat daftar kas kecil.");
      });
  }, []);

  const handleReplenish = async (id: string) => {
    const branch = branches.find((b) => b.id === id);
    if (!branch) return;
    setPageError(null);
    setNotice(null);
    const topUp = branch.maxFloat - branch.currentBalance;
    try {
      const res = await financeApi.createPettyCashTransaction(id, {
        type: "in",
        amount: topUp,
        description: "Replenishment",
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal melakukan reimbursement.");
      }
      const fund = res.data;
      setBranches(
        branches.map((b) =>
          b.id === id
            ? {
                ...b,
                currentBalance: fund.currentBalance,
                totalSpentThisMonth: fund.totalSpentThisMonth,
                status: fund.status === "Sufficient" ? "Sufficient" : "Need Replenishment",
                lastReplenished: fund.lastReplenished || new Date().toISOString().split("T")[0],
              }
            : b
        )
      );
      setNotice(
        `Pengajuan penggantian dana kas kecil untuk ${branch.branchName} berhasil dibuat dan menunggu persetujuan.`
      );
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Gagal melakukan penggantian dana kas kecil. Silakan coba lagi.");
    }
  };

  const openTransactions = (branch: PettyCashBranch) => {
    setTxTarget(branch);
    setIsLoadingTx(true);
    financeApi
      .listPettyCashTransactions(branch.id)
      .then((res) => setTransactions(res.data || []))
      .catch((err) => {
        setPageError(err instanceof Error ? err.message : "Gagal memuat transaksi kas kecil.");
      })
      .finally(() => setIsLoadingTx(false));
  };

  const refreshFundFromResponse = (fund: { currentBalance: number; totalSpentThisMonth: number; status: string; lastReplenished?: string }, id: string) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              currentBalance: fund.currentBalance,
              totalSpentThisMonth: fund.totalSpentThisMonth,
              status: fund.status === "Sufficient" ? "Sufficient" : "Need Replenishment",
              lastReplenished: fund.lastReplenished || b.lastReplenished,
            }
          : b
      )
    );
  };

  const handleApproveTx = async (tx: PettyCashTransactionItem) => {
    if (!txTarget) return;
    setActingTxId(tx.id);
    setPageError(null);
    try {
      const res = await financeApi.approvePettyCashTransaction(txTarget.id, tx.id);
      if (!res.success || !res.data) throw new Error(res.message || "Gagal menyetujui transaksi.");
      refreshFundFromResponse(res.data, txTarget.id);
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, approvalStatus: "approved" } : t)));
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Gagal menyetujui transaksi.");
    } finally {
      setActingTxId(null);
    }
  };

  const handleRejectTx = async (tx: PettyCashTransactionItem) => {
    if (!txTarget) return;
    setActingTxId(tx.id);
    setPageError(null);
    try {
      const res = await financeApi.rejectPettyCashTransaction(txTarget.id, tx.id);
      if (!res.success || !res.data) throw new Error(res.message || "Gagal menolak transaksi.");
      refreshFundFromResponse(res.data, txTarget.id);
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, approvalStatus: "rejected" } : t)));
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Gagal menolak transaksi.");
    } finally {
      setActingTxId(null);
    }
  };

  const totalFloat = branches.reduce((acc, curr) => acc + curr.currentBalance, 0);

  const columns: Column<PettyCashBranch>[] = [
    {
      key: "branchName",
      header: "Nama Kas Kecil Cabang",
      render: (row) => (
        <div>
          <span className="font-bold text-foreground text-xs">{row.branchName}</span>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Building className="h-3 w-3 text-muted-foreground" />
            <span>Pemegang Kas: {row.custodian}</span>
          </div>
        </div>
      ),
    },
    {
      key: "maxFloat",
      header: "Plafon Maksimum (Imprest)",
      render: (row) => (
        <span className="font-semibold text-xs text-foreground">
          <MoneyDisplay amount={row.maxFloat} />
        </span>
      ),
    },
    {
      key: "currentBalance",
      header: "Sisa Saldo Fisik",
      render: (row) => (
        <span className="font-black text-xs text-brand-dark">
          <MoneyDisplay amount={row.currentBalance} />
        </span>
      ),
    },
    {
      key: "totalSpentThisMonth",
      header: "Pengeluaran Bulan Ini",
      render: (row) => (
        <div className="text-xs space-y-0.5 text-rose-700 font-bold">
          <div><MoneyDisplay amount={row.totalSpentThisMonth} /></div>
          <div className="text-[10px] text-muted-foreground font-normal">Reff Terakhir: {row.lastReplenished}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status Kas",
      render: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            row.status === "Sufficient"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
          }`}
        >
          {row.status === "Sufficient" ? "● Saldo Cukup" : "⏳ Perlu Pengisian"}
        </span>
      ),
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status === "Need Replenishment" && (
            <Button
              size="sm"
              variant="gradient"
              onClick={() => handleReplenish(row.id)}
              className="h-7 px-2 text-[11px] font-bold"
            >
              Isi Kembali Dana
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => openTransactions(row)}
            className="h-7 px-2 text-[11px] font-bold"
          >
            Transaksi
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Banknote className="h-6 w-6 text-brand-primary" />
            <span>Kas Kecil Cabang (Petty Cash Imprest Fund)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola dana kas kecil per cabang/gudang, monitoring pengeluaran darurat harian, dan pengajuan replenishment.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => {
            setFormError(null);
            setIsNewOpen(true);
          }}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Buka Kas Cabang Baru</span>
        </Button>
      </div>

      {pageError && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {pageError}
        </div>
      )}
      {notice && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {notice}
        </div>
      )}

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Buka Kas Kecil Cabang Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateBranch} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Nama Kas Kecil Cabang *</label>
              <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Kas Kecil Cabang Bandung" className="h-9 text-xs" required />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Pemegang Kas (Custodian)</label>
              <Input value={custodian} onChange={(e) => setCustodian(e.target.value)} placeholder="e.g. Nama PIC" className="h-9 text-xs" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Plafon Maksimum (Imprest) *</label>
              <Input
                type="number"
                value={maxFloat}
                onChange={(e) => setMaxFloat(Number(e.target.value))}
                className="h-9 text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm">
                Buka Kas Cabang
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Saldo Fisik Kas Kecil Seluruh Cabang</span>
            <div className="text-2xl font-black text-brand-dark">
              <MoneyDisplay amount={totalFloat} />
            </div>
            <span className="text-[11px] text-muted-foreground">Sistem Dana Tetap (Imprest System)</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Cabang Memerlukan Pengisian Ulang</span>
            <div className="text-2xl font-black text-amber-600">
              {branches.filter((b) => b.status === "Need Replenishment").length} Lokasi
            </div>
            <span className="text-[11px] text-muted-foreground">Gudang Utama Cikarang</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Kepatuhan Bukti Bon Fisik</span>
            <div className="text-2xl font-black text-emerald-600">100% Tercatat</div>
            <span className="text-[11px] text-muted-foreground">Zero Discrepancy</span>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <DataTable data={branches} columns={columns} />
      </div>

      <Dialog open={!!txTarget} onOpenChange={(open) => !open && setTxTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Transaksi Kas Kecil {txTarget ? `· ${txTarget.branchName}` : ""}
            </DialogTitle>
          </DialogHeader>
          {isLoadingTx ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Memuat transaksi...</div>
          ) : transactions.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Belum ada transaksi.</div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">
                      {tx.type === "in" ? "Setoran / Reimbursement" : "Pengeluaran"} · {tx.date}
                    </div>
                    <div className="text-muted-foreground truncate">{tx.description || "-"}</div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        tx.approvalStatus === "approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : tx.approvalStatus === "rejected"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {tx.approvalStatus === "approved"
                        ? "Disetujui"
                        : tx.approvalStatus === "rejected"
                        ? "Ditolak"
                        : "Menunggu Persetujuan"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <MoneyDisplay
                      amount={tx.amount}
                      className={`font-bold ${tx.type === "in" ? "text-emerald-600" : "text-rose-600"}`}
                    />
                    {tx.approvalStatus === "pending" && mayApprove && !isOwn(tx.createdByEmail) && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actingTxId === tx.id}
                          onClick={() => handleApproveTx(tx)}
                          className="h-7 px-2 text-[11px] font-bold text-emerald-700 border-emerald-200"
                        >
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actingTxId === tx.id}
                          onClick={() => handleRejectTx(tx)}
                          className="h-7 px-2 text-[11px] font-bold text-rose-700 border-rose-200"
                        >
                          Tolak
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setTxTarget(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
