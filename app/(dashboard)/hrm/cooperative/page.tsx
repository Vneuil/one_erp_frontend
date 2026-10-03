"use client";

import * as React from "react";
import {
  PiggyBank,
  Plus,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { MoneyDisplay } from "@/components/shared/money-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  cooperativeApi,
  CooperativeLoan as ApiCooperativeLoan,
} from "@/lib/api/cooperative";
import { hrmApi, EmployeeItem } from "@/lib/api/hrm";

interface CooperativeLoan {
  id: string;
  loanNo: string;
  employeeName: string;
  department: string;
  totalLoan: number;
  monthlyDeduction: number;
  remainingBalance: number;
  tenureMonths: number;
  monthsPaid: number;
  status: "Active" | "Completed" | "Pending Approval";
}

const toUiStatus = (status: string): CooperativeLoan["status"] => {
  if (status === "completed") return "Completed";
  if (status === "pending_approval") return "Pending Approval";
  return "Active";
};

const mapLoan = (l: ApiCooperativeLoan): CooperativeLoan => ({
  id: l.id,
  loanNo: l.loanNo,
  employeeName: l.employeeName,
  department: l.department,
  totalLoan: l.totalLoan,
  monthlyDeduction: l.monthlyDeduction,
  remainingBalance: l.remainingBalance,
  tenureMonths: l.tenureMonths,
  monthsPaid: l.monthsPaid,
  status: toUiStatus(l.status),
});

export default function EmployeeCooperativePage() {
  const [loans, setLoans] = React.useState<CooperativeLoan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isNewLoanOpen, setIsNewLoanOpen] = React.useState(false);
  const [payingId, setPayingId] = React.useState<string | null>(null);

  // Form State
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [employeeId, setEmployeeId] = React.useState("");
  const [loanAmount, setLoanAmount] = React.useState(3000000);
  const [tenure, setTenure] = React.useState(6);

  const selectedEmployee = employees.find((emp) => emp.id === employeeId);

  React.useEffect(() => {
    cooperativeApi
      .listLoans()
      .then((res) => {
        setLoans((res.data || []).map(mapLoan));
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load cooperative loans", err);
        setLoadError("Gagal memuat data pinjaman koperasi dari server.");
      })
      .finally(() => setIsLoading(false));

    hrmApi
      .listEmployees({ perPage: 200 })
      .then((res) => {
        const items = res.data || [];
        setEmployees(items);
        setEmployeeId((prev) => prev || items[0]?.id || "");
      })
      .catch((err) => {
        console.error("Failed to load employees", err);
      });
  }, []);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    setFormError(null);
    try {
      const res = await cooperativeApi.createLoan({
        employeeId,
        totalLoan: Number(loanAmount),
        tenureMonths: Number(tenure),
      });
      if (res.data) {
        setLoans((prev) => [mapLoan(res.data), ...prev]);
      }
      setIsNewLoanOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan pinjaman.");
    }
  };

  const handleRecordPayment = async (id: string) => {
    setPayingId(id);
    setNotice(null);
    try {
      const res = await cooperativeApi.recordPayment(id);
      setLoans((prev) => prev.map((l) => (l.id === id ? mapLoan(res.data) : l)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal mencatat cicilan.");
    } finally {
      setPayingId(null);
    }
  };

  const totalOutstanding = loans.filter((l) => l.status === "Active").reduce((acc, curr) => acc + curr.remainingBalance, 0);

  const columns: Column<CooperativeLoan>[] = [
    {
      key: "loanNo",
      header: "No. Pinjaman & Karyawan",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.loanNo}</span>
          <div className="font-bold text-foreground text-xs mt-0.5">{row.employeeName}</div>
          <div className="text-[11px] text-muted-foreground">{row.department}</div>
        </div>
      ),
    },
    {
      key: "totalLoan",
      header: "Plafon Pinjaman",
      render: (row) => (
        <span className="font-bold text-xs text-foreground">
          <MoneyDisplay amount={row.totalLoan} />
        </span>
      ),
    },
    {
      key: "monthlyDeduction",
      header: "Potongan Bulanan (Payroll)",
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-semibold text-rose-700">
            <MoneyDisplay amount={row.monthlyDeduction} /> / bln
          </div>
          <div className="text-[10px] text-muted-foreground">
            {row.monthsPaid} dari {row.tenureMonths} Bulan Terbayar
          </div>
        </div>
      ),
    },
    {
      key: "remainingBalance",
      header: "Sisa Saldo Pokok",
      render: (row) => (
        <span className="font-black text-xs text-brand-indigo">
          <MoneyDisplay amount={row.remainingBalance} />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status Pinjaman",
      render: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            row.status === "Active"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          {row.status === "Active" ? "Aktif Berjalan" : "Lunas"}
        </span>
      ),
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => {
        if (row.status !== "Active") {
          return <span className="text-[11px] text-muted-foreground">Selesai</span>;
        }
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={payingId === row.id}
            onClick={() => handleRecordPayment(row.id)}
            className="h-7 px-2.5 text-[11px] font-bold gap-1"
          >
            <CreditCard className="h-3 w-3" />
            {payingId === row.id ? "Memproses..." : "Catat Cicilan"}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-brand-primary" />
            <span>Koperasi Karyawan & Fasilitas Kasbon</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola tabungan simpanan, pengajuan pinjaman karyawan, tenor cicilan, dan pemotongan otomatis pada slip gaji.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewLoanOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Pengajuan Pinjaman Koperasi</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Pinjaman Aktif</span>
            <div className="text-2xl font-black text-brand-dark">{loans.filter((l) => l.status === "Active").length} Pinjaman</div>
            <span className="text-[11px] text-muted-foreground">Dari total {loans.length} pinjaman tercatat</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Piutang Pinjaman Aktif</span>
            <div className="text-2xl font-black text-brand-indigo">
              <MoneyDisplay amount={totalOutstanding} />
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Termasuk potongan payroll
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Pinjaman Lunas</span>
            <div className="text-2xl font-black text-emerald-600">{loans.filter((l) => l.status === "Completed").length} Pinjaman</div>
            <span className="text-[11px] text-muted-foreground">Saldo pokok sudah nol</span>
          </CardContent>
        </Card>
      </div>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      {notice && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {notice}
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={loans} columns={columns} />
        )}
      </div>

      {/* Modal Pinjaman Baru */}
      <Dialog open={isNewLoanOpen} onOpenChange={setIsNewLoanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Pengajuan Pinjaman Koperasi Karyawan</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLoan} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Nama Anggota Karyawan *</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih karyawan...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Nominal Pinjaman (IDR) *</label>
                <Input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Jangka Waktu (Tenor)</label>
                <select
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value={3}>3 Bulan</option>
                  <option value={6}>6 Bulan</option>
                  <option value={10}>10 Bulan</option>
                  <option value={12}>12 Bulan</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-border space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimasi Potongan Bulanan:</span>
                <span className="font-bold text-foreground">
                  <MoneyDisplay amount={Math.round(loanAmount / tenure)} /> / bulan
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Potongan akan otomatis masuk ke komponen deduction pada kalkulator payroll.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewLoanOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Simpan Pinjaman
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
