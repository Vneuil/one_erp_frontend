"use client";

import * as React from "react";
import {
  Building,
  Plus,
  Search,
  Download,
  CreditCard,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
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
import { bankingApi } from "@/lib/api/banking";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  currency: "IDR" | "USD";
  currentBalance: number;
  unreconciledCount: number;
  branch: string;
  status: "Active" | "Inactive";
}

export default function BankAccountsPage() {
  const [banks, setBanks] = React.useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [bankName, setBankName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [accountHolder, setAccountHolder] = React.useState("");
  const [branch, setBranch] = React.useState("");

  React.useEffect(() => {
    bankingApi
      .listBankAccounts()
      .then((res) => {
                  setBanks(
            (res.data || []).map((a) => ({
              id: a.id,
              bankName: a.bankName,
              accountNumber: a.accountNumber,
              accountHolder: a.accountHolder,
              currency: (a.currency as "IDR" | "USD") || "IDR",
              currentBalance: a.currentBalance,
              unreconciledCount: a.unreconciledCount,
              branch: a.branch,
              status: a.status === "active" ? "Active" : "Inactive",
            }))
          );
      })
      .catch((err) => {
        console.error("Failed to load rekening bank", err);
        setLoadError("Gagal memuat data rekening bank dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleRegisterBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await bankingApi.createBankAccount({ bankName, accountNumber, accountHolder, branch });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal mendaftarkan rekening bank.");
      }
      const a = res.data;
      setBanks([
        {
          id: a.id,
          bankName: a.bankName,
          accountNumber: a.accountNumber,
          accountHolder: a.accountHolder,
          currency: (a.currency as "IDR" | "USD") || "IDR",
          currentBalance: a.currentBalance,
          unreconciledCount: a.unreconciledCount,
          branch: a.branch,
          status: a.status === "active" ? "Active" : "Inactive",
        },
        ...banks,
      ]);
      setIsNewOpen(false);
      setBankName("");
      setAccountNumber("");
      setBranch("");
      setNotice("Rekening bank baru berhasil didaftarkan.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mendaftarkan rekening bank. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCash = banks.reduce((acc, curr) => acc + curr.currentBalance, 0);

  const columns: Column<BankAccount>[] = [
    {
      key: "bankName",
      header: "Nama Bank & Rekening",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.bankName}</div>
          <div className="text-[11px] font-mono text-muted-foreground">{row.accountNumber} • {row.branch}</div>
        </div>
      ),
    },
    {
      key: "accountHolder",
      header: "Atas Nama",
      render: (row) => <span className="text-xs font-semibold">{row.accountHolder}</span>,
    },
    {
      key: "currentBalance",
      header: "Saldo Rekening",
      render: (row) => (
        <span className="font-black text-xs text-brand-dark">
          <MoneyDisplay amount={row.currentBalance} />
        </span>
      ),
    },
    {
      key: "unreconciledCount",
      header: "Mutasi Belum Cocok",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            row.unreconciledCount === 0
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {row.unreconciledCount === 0 ? "Rekonsiliasi Lengkap" : `${row.unreconciledCount} Mutasi`}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ● {row.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Building className="h-6 w-6 text-brand-primary" />
            <span>Rekening Bank & Perbendaharaan (Treasury)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola seluruh rekening operasional perusahaan, pantau saldo likuiditas kas, dan sinkronisasi mutasi.
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
          <span>Tambah Rekening Baru</span>
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
              <span>Daftarkan Rekening Bank Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegisterBank} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Nama Bank *</label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Bank CIMB Niaga" className="h-9 text-xs" required />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Nomor Rekening *</label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g. 7900112233" className="h-9 text-xs" required />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Atas Nama</label>
              <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Cabang</label>
              <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. KC Jakarta Sudirman" className="h-9 text-xs" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm">
                Daftarkan Rekening
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Likuiditas Kas Bank Terkonsolidasi</span>
            <div className="text-2xl font-black text-brand-dark">
              <MoneyDisplay amount={totalCash} />
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Posisi Kas Sehat & Likuid
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Jumlah Rekening Terdaftar</span>
            <div className="text-2xl font-black text-brand-indigo">{banks.length} Rekening</div>
            <span className="text-[11px] text-muted-foreground">BCA, Mandiri, BRI</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Integrasi Direct Banking</span>
            <div className="text-2xl font-black text-emerald-600">Aktif</div>
            <span className="text-[11px] text-muted-foreground">KlikBCA Bisnis & Mandiri MCM</span>
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
          <DataTable data={banks} columns={columns} />
        )}
      </div>
    </div>
  );
}
