"use client";

import * as React from "react";
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Building,
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
import { financeApi, AccountItem } from "@/lib/api/finance";

interface BudgetItem {
  id: string;
  department: string;
  accountCategory: string;
  period?: string;
  allocatedBudget: number;
  actualSpent: number;
  variance: number;
  utilizationRate: number;
  status: "Safe" | "Warning (Near Limit)" | "Exceeded";
}

export default function BudgetControlPage() {
  const [budgets, setBudgets] = React.useState<BudgetItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [department, setDepartment] = React.useState("");
  const [accountCategory, setAccountCategory] = React.useState("");
  const [period, setPeriod] = React.useState(new Date().toISOString().slice(0, 7));
  const [accounts, setAccounts] = React.useState<AccountItem[]>([]);
  const [accountId, setAccountId] = React.useState("");
  const [allocatedBudget, setAllocatedBudget] = React.useState(0);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department || !accountCategory || allocatedBudget <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await financeApi.createBudget({ department, accountCategory, period, allocatedBudget, accountId: accountId || null });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal membuat anggaran.");
      }
      const b = res.data;
      setBudgets([
        {
          id: b.id,
          department: b.department,
          accountCategory: b.accountCategory,
          period: b.period,
          allocatedBudget: b.allocatedBudget,
          actualSpent: b.actualSpent,
          variance: b.variance,
          utilizationRate: b.utilizationRate,
          status: (b.status as BudgetItem["status"]) || "Safe",
        },
        ...budgets,
      ]);
      setIsNewOpen(false);
      setDepartment("");
      setAccountCategory("");
      setAllocatedBudget(0);
      setNotice("Pagu anggaran divisi baru berhasil disimpan.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan anggaran divisi. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    financeApi
      .listBudgets()
      .then((res) => {
                  setBudgets(
            (res.data || []).map((b) => ({
              id: b.id,
              department: b.department,
              accountCategory: b.accountCategory,
              period: b.period,
              allocatedBudget: b.allocatedBudget,
              actualSpent: b.actualSpent,
              variance: b.variance,
              utilizationRate: b.utilizationRate,
              status: (b.status as BudgetItem["status"]) || "Safe",
            }))
          );
      })
      .catch((err) => {
        console.error("Failed to load anggaran", err);
        setLoadError("Gagal memuat data anggaran dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    // Only expense accounts can be budgeted; the account is what makes "actual spent" real.
    financeApi
      .listAccounts({ perPage: 500 })
      .then((res) => setAccounts((res.data || []).filter((a) => a.type === "expense" && a.isActive)))
      .catch(() => setAccounts([]));
  }, []);

  const handleEditAmount = async (row: BudgetItem) => {
    const raw = window.prompt(`Pagu baru untuk ${row.department} — ${row.accountCategory} (Rp):`, String(row.allocatedBudget));
    if (raw === null) return;
    const value = Number(raw.replace(/[^0-9.]/g, ""));
    if (!(value > 0)) {
      setNotice("Pagu harus berupa angka positif.");
      return;
    }
    setNotice(null);
    try {
      const res = await financeApi.updateBudget(row.id, { allocatedBudget: value });
      setBudgets((prev) => prev.map((b) => (b.id === row.id ? { ...b, allocatedBudget: res.data.allocatedBudget, variance: res.data.variance, utilizationRate: res.data.utilizationRate, status: (res.data.status as BudgetItem["status"]) || b.status } : b)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal mengubah anggaran.");
    }
  };

  const handleDelete = async (row: BudgetItem) => {
    if (!window.confirm(`Hapus anggaran ${row.department} — ${row.accountCategory}?`)) return;
    setNotice(null);
    try {
      await financeApi.deleteBudget(row.id);
      setBudgets((prev) => prev.filter((b) => b.id !== row.id));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menghapus anggaran.");
    }
  };

  const totalAllocated = budgets.reduce((acc, curr) => acc + curr.allocatedBudget, 0);
  const totalSpent = budgets.reduce((acc, curr) => acc + curr.actualSpent, 0);
  const totalVariance = totalAllocated - totalSpent;

  const columns: Column<BudgetItem>[] = [
    {
      key: "department",
      header: "Departemen / Divisi",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.department}</div>
          <div className="text-[11px] text-brand-indigo font-semibold">{row.accountCategory}</div>
        </div>
      ),
    },
    {
      key: "allocatedBudget",
      header: "Pagu Anggaran (Budget)",
      render: (row) => (
        <span className="font-bold text-xs text-foreground">
          <MoneyDisplay amount={row.allocatedBudget} />
        </span>
      ),
    },
    {
      key: "actualSpent",
      header: "Realisasi Pengeluaran",
      render: (row) => (
        <div className="space-y-1">
          <div className="font-black text-xs text-brand-dark">
            <MoneyDisplay amount={row.actualSpent} />
          </div>
          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                row.utilizationRate > 85 ? "bg-amber-500" : "bg-brand-primary"
              }`}
              style={{ width: `${Math.min(100, row.utilizationRate)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "variance",
      header: "Sisa Pagu (Variance)",
      render: (row) => (
        <div className="text-xs space-y-0.5 text-emerald-700 font-bold">
          <div><MoneyDisplay amount={row.variance} /></div>
          <div className="text-[10px] text-muted-foreground font-normal">Sisa {100 - Math.round(row.utilizationRate)}%</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status Kontrol",
      render: (row) => {
        const styles: Record<string, string> = {
          Safe: "bg-emerald-50 text-emerald-700 border-emerald-200",
          "Warning (Near Limit)": "bg-amber-50 text-amber-700 border-amber-200",
          Exceeded: "bg-rose-50 text-rose-700 border-rose-200",
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[row.status]}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: "id",
      header: "",
      render: (row) => (
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => handleEditAmount(row)} className="h-7 px-2 text-[11px]">Ubah pagu</Button>
          <Button size="sm" variant="outline" aria-label={`Hapus ${row.department}`} onClick={() => handleDelete(row)} className="h-7 px-2 text-[11px] text-rose-600 border-rose-200">Hapus</Button>
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
            <Wallet className="h-6 w-6 text-brand-primary" />
            <span>Perencanaan Anggaran & Kontrol Limit (Budget Planner)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Alokasi pagu biaya per divisi, monitoring realisasi aktual vs anggaran, dan proteksi peringatan batas over-budget.
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
          <span>Tetapkan Anggaran Baru</span>
        </Button>
      </div>

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
              <span>Tetapkan Anggaran Divisi Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateBudget} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Divisi / Departemen *</label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Warehouse & Logistics" className="h-9 text-xs" required />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Kategori Akun / Biaya *</label>
              <Input value={accountCategory} onChange={(e) => setAccountCategory(e.target.value)} placeholder="e.g. Biaya Pengiriman & Ekspedisi" className="h-9 text-xs" required />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Periode</label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Akun biaya (untuk menghitung realisasi)</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                <option value="">Tanpa akun — realisasi tidak dihitung</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Pagu Anggaran (Rp) *</label>
              <Input
                type="number"
                value={allocatedBudget}
                onChange={(e) => setAllocatedBudget(Number(e.target.value))}
                className="h-9 text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm">
                Simpan Anggaran
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Pagu Anggaran Operasional</span>
            <div className="text-2xl font-black text-brand-dark">
              <MoneyDisplay amount={totalAllocated} />
            </div>
            <span className="text-[11px] text-muted-foreground">Periode Tahun Berjalan 2026</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Realisasi Pengeluaran Aktual</span>
            <div className="text-2xl font-black text-brand-indigo">
              <MoneyDisplay amount={totalSpent} />
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Utilisasi Rata-rata 66.5%
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Sisa Efisiensi Anggaran (Surplus)</span>
            <div className="text-2xl font-black text-emerald-600">
              <MoneyDisplay amount={totalVariance} />
            </div>
            <span className="text-[11px] text-muted-foreground">Tersedia untuk alokasi cadangan</span>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        {loadError && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}
        {notice && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {notice}
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={budgets} columns={columns} />
        )}
      </div>
    </div>
  );
}
