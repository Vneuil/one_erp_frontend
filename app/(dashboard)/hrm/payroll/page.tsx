"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import {
  Wallet,
  Plus,
  Download,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Sparkles,
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
import { downloadCsv } from "@/lib/utils/csv";
import { payrollApi, PayrollEntry as ApiPayrollEntry, PayrollPolicy } from "@/lib/api/payroll";
import { hrmApi, EmployeeItem } from "@/lib/api/hrm";
import { useIsOwnDocument } from "@/lib/hooks/use-own-document";

interface PayrollEntry {
  id: string;
  nip: string;
  name: string;
  department: string;
  baseSalary: number;
  allowance: number; // Tunjangan Jabatan & Transport
  overtimePay: number; // Lembur
  deductionTax: number; // PPh 21
  deductionCoop: number; // Potongan Kasbon / Koperasi
  deductionAbsence: number; // Potongan cuti tanpa gaji
  deductionCanteen: number; // Potongan kantin
  deductionAdvance: number; // Cicilan kasbon
  deductionLate: number; // Denda keterlambatan
  unpaidDays: number;
  lateCount: number;
  takeHomePay: number; // Gaji Bersih
  status: "Draft" | "Calculated" | "Approved" | "Paid";
  paymentBank: string;
  bankAccount: string;
  taxMethod: "manual" | "auto";
  ptkpStatus?: string;
}

/** Current month (YYYY-MM) in Jakarta time. */
const currentPeriod = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);

/** "2026-09" -> "September 2026" */
const periodLabel = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
};

const toUiStatus = (status: string): PayrollEntry["status"] => {
  switch (status) {
    case "calculated":
      return "Calculated";
    case "approved":
      return "Approved";
    case "paid":
      return "Paid";
    default:
      return "Draft";
  }
};

const mapEntry = (e: ApiPayrollEntry): PayrollEntry => ({
  id: e.id,
  nip: e.nip,
  name: e.employeeName,
  department: e.department,
  baseSalary: e.baseSalary,
  allowance: e.allowance,
  overtimePay: e.overtimePay,
  deductionTax: e.deductionTax,
  deductionCoop: e.deductionCoop,
  deductionAbsence: e.deductionAbsence ?? 0,
  deductionCanteen: e.deductionCanteen ?? 0,
  deductionAdvance: e.deductionAdvance ?? 0,
  deductionLate: e.deductionLate ?? 0,
  unpaidDays: e.unpaidDays ?? 0,
  lateCount: e.lateCount ?? 0,
  takeHomePay: e.takeHomePay,
  status: toUiStatus(e.status),
  paymentBank: e.paymentBank,
  bankAccount: e.bankAccount,
  taxMethod: e.taxMethod === "auto" ? "auto" : "manual",
  ptkpStatus: e.ptkpStatus,
});

export default function PayrollPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("hrm");
  const isOwn = useIsOwnDocument();
  // NIPs whose owner is the signed-in user: nobody approves or pays their own salary.
  const [ownNips, setOwnNips] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    hrmApi
      .listEmployees({ perPage: 200 })
      .then((res) => setOwnNips(new Set((res.data || []).filter((e) => isOwn(e.email)).map((e) => e.nip))))
      .catch(() => setOwnNips(new Set()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [period, setPeriod] = React.useState(currentPeriod);
  const [payrollData, setPayrollData] = React.useState<PayrollEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [taxMethod, setTaxMethod] = React.useState<"auto" | "manual">("auto");
  const [selectedSlip, setSelectedSlip] = React.useState<PayrollEntry | null>(null);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [policy, setPolicy] = React.useState<PayrollPolicy | null>(null);
  const [showPolicy, setShowPolicy] = React.useState(false);
  const [savingPolicy, setSavingPolicy] = React.useState(false);

  React.useEffect(() => {
    payrollApi
      .getPolicy()
      .then((res) => setPolicy(res.data))
      .catch((err) => console.error("Failed to load payroll policy", err));
  }, []);

  const handleSavePolicy = async () => {
    if (!policy) return;
    setSavingPolicy(true);
    setNotice(null);
    try {
      const res = await payrollApi.updatePolicy(policy);
      setPolicy(res.data);
      setShowPolicy(false);
      setNotice({ kind: "success", text: "Kebijakan payroll disimpan. Berlaku pada perhitungan periode berikutnya." });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Gagal menyimpan kebijakan payroll." });
    } finally {
      setSavingPolicy(false);
    }
  };

  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [employeeId, setEmployeeId] = React.useState("");
  const [baseSalary, setBaseSalary] = React.useState(0);
  const [allowance, setAllowance] = React.useState(0);
  const [overtimePay, setOvertimePay] = React.useState(0);
  const [deductionTax, setDeductionTax] = React.useState(0);
  const [deductionCoop, setDeductionCoop] = React.useState(0);

  const selectedEmployee = employees.find((emp) => emp.id === employeeId);

  React.useEffect(() => {
    let active = true;
    payrollApi
      .listEntries({ period, perPage: 200 })
      .then((res) => {
        if (!active) return;
        setPayrollData((res.data || []).map(mapEntry));
        setLoadError(null);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load payroll", err);
        setLoadError("Gagal memuat data payroll dari server.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  React.useEffect(() => {
    hrmApi
      .listEmployees({ perPage: 200 })
      .then((res) => setEmployees(res.data || []))
      .catch((err) => console.error("Failed to load employees", err));
  }, []);

  const totalTakeHome = payrollData.reduce((acc, curr) => acc + curr.takeHomePay, 0);
  const totalTaxPPh21 = payrollData.reduce((acc, curr) => acc + curr.deductionTax, 0);

  const handleExportBcaFile = () => {
    const bcaEntries = payrollData.filter((p) => p.paymentBank === "BCA");
    downloadCsv(
      "payroll-bca-transfer.csv",
      ["Account Number", "Account Name", "Amount", "Reference"],
      bcaEntries.map((p) => [p.bankAccount, p.name, p.takeHomePay, p.id])
    );
  };

  const handleRunPayrollCalc = async () => {
    setIsCalculating(true);
    setNotice(null);
    try {
      const res = await payrollApi.calculatePeriod(period);
      const calculated = res.data || [];
      const byId = new Map(calculated.map((e) => [e.id, mapEntry(e)]));
      setPayrollData((prev) => prev.map((p) => byId.get(p.id) ?? p));
      setNotice({
        kind: "success",
        text: calculated.length
          ? `${calculated.length} entri payroll ${periodLabel(period)} dihitung.`
          : `Tidak ada entri Draft untuk dihitung pada ${periodLabel(period)}.`,
      });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Gagal menghitung payroll." });
    } finally {
      setIsCalculating(false);
    }
  };

  const NEXT_STATUS: Record<string, { to: string; label: string; confirm: string } | undefined> = {
    Calculated: { to: "approved", label: "Setujui", confirm: "Setujui entri ini? Jurnal beban gaji akan dibukukan otomatis." },
    Approved: { to: "paid", label: "Tandai Dibayar", confirm: "Tandai sudah dibayar? Jurnal pembayaran kas akan dibukukan otomatis." },
  };

  const handleAdvance = async (row: PayrollEntry) => {
    const next = NEXT_STATUS[row.status];
    if (!next || busyId) return;
    if (!window.confirm(`${next.confirm}\n\n${row.name} — ${periodLabel(period)}`)) return;
    setBusyId(row.id);
    setNotice(null);
    try {
      const res = await payrollApi.updateEntryStatus(row.id, next.to);
      if (res.data) {
        const updated = mapEntry(res.data);
        setPayrollData((prev) => prev.map((p) => (p.id === row.id ? updated : p)));
      }
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Gagal mengubah status." });
    } finally {
      setBusyId(null);
    }
  };

  const resetForm = () => {
    setEmployeeId("");
    setBaseSalary(0);
    setAllowance(0);
    setOvertimePay(0);
    setDeductionTax(0);
    setDeductionCoop(0);
    setTaxMethod("auto");
    setFormError(null);
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    setFormError(null);
    try {
      const res = await payrollApi.createEntry({
        period,
        employeeId,
        baseSalary,
        allowance,
        overtimePay,
        deductionTax: taxMethod === "manual" ? deductionTax : 0,
        deductionCoop,
        taxMethod,
      });
      if (res.data) {
        setPayrollData((prev) => [mapEntry(res.data), ...prev]);
      }
      setIsNewOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan entri payroll.");
    }
  };

  const columns: Column<PayrollEntry>[] = [
    {
      key: "nip",
      header: "Karyawan & NIP",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.name}</div>
          <div className="text-[11px] text-muted-foreground font-mono">{row.nip} • {row.department}</div>
        </div>
      ),
    },
    {
      key: "baseSalary",
      header: "Gaji Pokok & Tunjangan",
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-semibold text-foreground"><MoneyDisplay amount={row.baseSalary} /></div>
          <div className="text-[10px] text-emerald-700 font-medium">
            + Tunjangan: <MoneyDisplay amount={row.allowance} />
          </div>
        </div>
      ),
    },
    {
      key: "overtimePay",
      header: "Lembur / Bonus",
      render: (row) => (
        <span className="text-xs font-semibold text-foreground">
          <MoneyDisplay amount={row.overtimePay} />
        </span>
      ),
    },
    {
      key: "deductionTax",
      header: "PPh 21 & Potongan",
      render: (row) => (
        <div className="text-xs space-y-0.5 text-rose-700">
          <div>PPh21: <MoneyDisplay amount={row.deductionTax} /></div>
          <div className="text-[10px] text-muted-foreground">
            {row.taxMethod === "auto" ? `Otomatis${row.ptkpStatus ? ` (${row.ptkpStatus})` : ""}` : "Manual"}
          </div>
          {row.deductionCoop > 0 && (
            <div className="text-[10px] text-muted-foreground">
              Kasbon: <MoneyDisplay amount={row.deductionCoop} />
            </div>
          )}
          {row.deductionAbsence > 0 && (
            <div className="text-[10px] text-muted-foreground">
              Cuti tanpa gaji ({row.unpaidDays} hari): <MoneyDisplay amount={row.deductionAbsence} />
            </div>
          )}
          {row.deductionCanteen > 0 && (
            <div className="text-[10px] text-muted-foreground">
              Kantin: <MoneyDisplay amount={row.deductionCanteen} />
            </div>
          )}
          {row.deductionAdvance > 0 && (
            <div className="text-[10px] text-muted-foreground">
              Kasbon: <MoneyDisplay amount={row.deductionAdvance} />
            </div>
          )}
          {row.deductionLate > 0 && (
            <div className="text-[10px] text-muted-foreground">
              Terlambat ({row.lateCount}x): <MoneyDisplay amount={row.deductionLate} />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "takeHomePay",
      header: "Take Home Pay",
      render: (row) => (
        <span className="text-xs font-black text-brand-dark">
          <MoneyDisplay amount={row.takeHomePay} />
        </span>
      ),
    },
    {
      key: "paymentBank",
      header: "Rekening Payroll",
      render: (row) => (
        <div className="text-xs">
          <span className="font-bold text-foreground">{row.paymentBank}</span>
          <div className="text-[10px] font-mono text-muted-foreground">{row.bankAccount}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const next = NEXT_STATUS[row.status];
        return (
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-foreground">{row.status}</span>
            {next && mayApprove && !ownNips.has(row.nip) && (
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === row.id}
                onClick={() => handleAdvance(row)}
                className="h-7 px-2 text-[11px] block border-border"
              >
                {busyId === row.id ? "..." : next.label}
              </Button>
            )}
          </div>
        );
      },
    },
    {
      key: "id",
      header: "Slip Gaji",
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedSlip(row)}
          className="h-7 px-2 text-[11px] gap-1 border-border"
        >
          <Printer className="h-3 w-3" />
          <span>Lihat Slip</span>
        </Button>
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
            <span>Mesin Penggajian & PPh 21 (Payroll Engine)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Perhitungan otomatis gaji pokok, tunjangan, lembur, estimasi PPh 21 otomatis, kasbon koperasi, slip gaji digital, dan export bank.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPolicy((v) => !v)} className="h-9 text-xs font-bold">
            Kebijakan Payroll
          </Button>
          <Input
            type="month"
            value={period}
            onChange={(e) => e.target.value && setPeriod(e.target.value)}
            aria-label="Periode payroll"
            className="h-9 w-40 text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewOpen(true)}
            className="h-9 gap-1.5 text-xs font-bold border-border"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Entri Payroll</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBcaFile}
            className="h-9 gap-1.5 text-xs font-bold border-blue-300 text-blue-900 bg-blue-50/50 hover:bg-blue-100"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-700" />
            <span>Export Bank BCA Payroll</span>
          </Button>

          {mayApprove && <Button
            variant="gradient"
            size="sm"
            onClick={handleRunPayrollCalc}
            disabled={isCalculating}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isCalculating ? "Memproses..." : "Hitung Payroll Periode Ini"}</span>
          </Button>}
        </div>
      </div>

      {showPolicy && policy && (
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <label className="space-y-1 text-xs font-semibold">
              Hari kerja per bulan
              <Input
                type="number"
                min={1}
                max={31}
                value={policy.workDaysPerMonth}
                onChange={(e) => setPolicy({ ...policy, workDaysPerMonth: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Denda per keterlambatan (Rp)
              <Input
                type="number"
                min={0}
                value={policy.latePenaltyPerIncident}
                onChange={(e) => setPolicy({ ...policy, latePenaltyPerIncident: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold pb-2">
              <input
                type="checkbox"
                checked={policy.deductUnpaidLeave}
                onChange={(e) => setPolicy({ ...policy, deductUnpaidLeave: e.target.checked })}
              />
              Potong gaji untuk cuti tanpa gaji
            </label>
            <Button size="sm" onClick={handleSavePolicy} disabled={savingPolicy} className="h-9 text-xs font-bold">
              {savingPolicy ? "Menyimpan..." : "Simpan Kebijakan"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Pengeluaran Gaji Bersih (THP)</span>
            <div className="text-2xl font-black text-brand-dark">
              <MoneyDisplay amount={totalTakeHome} />
            </div>
            <span className="text-[11px] text-muted-foreground">Periode {periodLabel(period)}</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total PPh 21 Masa Dipotong</span>
            <div className="text-2xl font-black text-brand-indigo">
              <MoneyDisplay amount={totalTaxPPh21} />
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Estimasi metode progresif tahunan
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Jumlah Personil Terproses</span>
            <div className="text-2xl font-black text-emerald-600">{payrollData.length} Karyawan</div>
            <span className="text-[11px] text-muted-foreground">Lembur dan tunjangan diinput manual</span>
          </CardContent>
        </Card>
      </div>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`px-3 py-2 rounded-lg border text-xs font-medium ${
            notice.kind === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={payrollData} columns={columns} />
        )}
      </div>

      {/* New Payroll Entry Modal */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Entri Payroll</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEntry} className="space-y-3">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Karyawan</label>
              <select
                value={employeeId}
                onChange={(e) => {
                  // Auto-fill base salary from the HRM record (still editable below).
                  setEmployeeId(e.target.value);
                  setBaseSalary(employees.find((emp) => emp.id === e.target.value)?.baseSalary || 0);
                }}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih karyawan...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.nip}) — {emp.department}
                  </option>
                ))}
              </select>
              {selectedEmployee && (
                <p className="text-[11px] text-muted-foreground">
                  Gaji pokok &amp; potongan koperasi diisi otomatis dari data HRM/Koperasi karyawan ini (dapat diubah manual).
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Gaji Pokok</label>
                <Input type="number" value={baseSalary} onChange={(e) => setBaseSalary(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Tunjangan</label>
                <Input type="number" value={allowance} onChange={(e) => setAllowance(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Lembur</label>
                <Input type="number" value={overtimePay} onChange={(e) => setOvertimePay(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">PPh 21</label>
                <select
                  value={taxMethod}
                  onChange={(e) => setTaxMethod(e.target.value as "auto" | "manual")}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="auto">Hitung otomatis (estimasi)</option>
                  <option value="manual">Input manual</option>
                </select>
              </div>
            </div>
            {taxMethod === "manual" ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nominal PPh 21 (manual)</label>
                <Input type="number" value={deductionTax} onChange={(e) => setDeductionTax(Number(e.target.value))} />
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                PPh 21 diestimasi dari penghasilan bruto, status PTKP{selectedEmployee?.ptkpStatus ? ` (${selectedEmployee.ptkpStatus})` : ""}, dan
                status NPWP karyawan. Metode progresif tahunan (Pasal 17) — bukan tabel TER; konfirmasikan dengan konsultan pajak.
              </p>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Potongan Kasbon/Koperasi</label>
              <Input type="number" value={deductionCoop} onChange={(e) => setDeductionCoop(Number(e.target.value))} />
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold">
                Simpan Entri Payroll
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Digital Payslip Modal */}
      {selectedSlip && (
        <Dialog open={Boolean(selectedSlip)} onOpenChange={() => setSelectedSlip(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Printer className="h-4 w-4 text-brand-primary" />
                <span>Slip Gaji Elektronik (Digital Payslip)</span>
              </DialogTitle>
            </DialogHeader>

            <div className="bg-slate-50 p-4 rounded-xl border border-border text-xs space-y-3">
              {/* Slip Header */}
              <div className="text-center pb-2 border-b border-border space-y-0.5">
                <h3 className="font-bold text-sm text-foreground">PT SENTOSA MANDIRI SOLUSINDO</h3>
                <p className="text-[11px] text-muted-foreground">SLIP GAJI BULAN {periodLabel(period).toUpperCase()}</p>
                <div className="pt-1 text-[11px] text-foreground font-medium">
                  {selectedSlip.name} ({selectedSlip.nip}) • {selectedSlip.department}
                </div>
              </div>

              {/* Earnings */}
              <div className="space-y-1.5">
                <span className="font-bold text-[11px] text-muted-foreground uppercase">1. Penghasilan (Earnings)</span>
                <div className="flex justify-between pl-2">
                  <span>Gaji Pokok:</span>
                  <span className="font-semibold"><MoneyDisplay amount={selectedSlip.baseSalary} /></span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>Tunjangan Jabatan & Operasional:</span>
                  <span className="font-semibold"><MoneyDisplay amount={selectedSlip.allowance} /></span>
                </div>
                {selectedSlip.overtimePay > 0 && (
                  <div className="flex justify-between pl-2">
                    <span>Upah Lembur & Insentif:</span>
                    <span className="font-semibold"><MoneyDisplay amount={selectedSlip.overtimePay} /></span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-border/80">
                  <span>Total Penghasilan Kotor:</span>
                  <span className="text-brand-dark">
                    <MoneyDisplay amount={selectedSlip.baseSalary + selectedSlip.allowance + selectedSlip.overtimePay} />
                  </span>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-1.5 pt-1">
                <span className="font-bold text-[11px] text-muted-foreground uppercase">2. Potongan (Deductions)</span>
                <div className="flex justify-between pl-2 text-rose-700">
                  <span>Pajak Penghasilan (PPh 21):</span>
                  <span><MoneyDisplay amount={selectedSlip.deductionTax} /></span>
                </div>
                {selectedSlip.deductionAbsence > 0 && (
                  <div className="flex justify-between pl-2 text-rose-700">
                    <span>Cuti Tanpa Gaji ({selectedSlip.unpaidDays} hari):</span>
                    <span><MoneyDisplay amount={selectedSlip.deductionAbsence} /></span>
                  </div>
                )}
                {selectedSlip.deductionCanteen > 0 && (
                  <div className="flex justify-between pl-2 text-rose-700">
                    <span>Kantin Karyawan:</span>
                    <span><MoneyDisplay amount={selectedSlip.deductionCanteen} /></span>
                  </div>
                )}
                {selectedSlip.deductionAdvance > 0 && (
                  <div className="flex justify-between pl-2 text-rose-700">
                    <span>Cicilan Kasbon:</span>
                    <span><MoneyDisplay amount={selectedSlip.deductionAdvance} /></span>
                  </div>
                )}
                {selectedSlip.deductionLate > 0 && (
                  <div className="flex justify-between pl-2 text-rose-700">
                    <span>Denda Terlambat ({selectedSlip.lateCount}x):</span>
                    <span><MoneyDisplay amount={selectedSlip.deductionLate} /></span>
                  </div>
                )}
                {selectedSlip.deductionCoop > 0 && (
                  <div className="flex justify-between pl-2 text-rose-700">
                    <span>Cicilan Kasbon / Koperasi:</span>
                    <span><MoneyDisplay amount={selectedSlip.deductionCoop} /></span>
                  </div>
                )}
              </div>

              {/* Net Take Home Pay */}
              <div className="p-3 bg-brand-tint/60 rounded-lg border border-brand-indigo/30 flex justify-between items-center text-xs font-black text-brand-dark">
                <span>GAJI BERSIH (TAKE HOME PAY):</span>
                <span className="text-sm"><MoneyDisplay amount={selectedSlip.takeHomePay} /></span>
              </div>

              <div className="text-[10px] text-muted-foreground text-center pt-1">
                Ditransfer ke Rekening {selectedSlip.paymentBank} No. {selectedSlip.bankAccount}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs h-8 gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh PDF</span>
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setSelectedSlip(null)}
                className="text-xs h-8 font-bold"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
