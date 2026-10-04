"use client";

import * as React from "react";
import { Plus, Wallet, Download } from "lucide-react";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { financeApi } from "@/lib/api/finance";
import { downloadCsv } from "@/lib/utils/csv";

const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;

// Report category for revenue/expense accounts; drives the expense reports.
const CATEGORY_LABELS: Record<string, string> = {
  marketing: "Biaya Pemasaran",
  admin_general: "Biaya Administrasi & Umum",
  non_operating: "Di Luar Usaha",
  cogs: "Harga Pokok Penjualan",
};

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  category?: string;
  balance: number;
  currency: string;
  status: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<(typeof ACCOUNT_TYPES)[number]>("asset");
  const [category, setCategory] = React.useState("");

  React.useEffect(() => {
    financeApi
      .listAccounts()
      .then((res) => {
                  setAccounts(
            (res.data || []).map((a) => ({
              id: a.id,
              code: a.code,
              name: a.name,
              type: a.type,
              category: a.category,
              balance: a.balance,
              currency: a.currency,
              status: a.status,
            }))
          );
      })
      .catch((err) => {
        console.error("Failed to load chart of accounts", err);
        setLoadError("Gagal memuat daftar akun dari server.");
      });
  }, []);

  const handleExport = () => {
    downloadCsv(
      "chart-of-accounts.csv",
      ["Code", "Name", "Type", "Balance", "Currency", "Status"],
      accounts.map((a) => [a.code, a.name, a.type, a.balance, a.currency, a.status])
    );
  };

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await financeApi.createAccount({
        code, name, type, isActive: true,
        ...(type === "revenue" || type === "expense" ? { category } : {}),
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal membuat akun.");
      }
      const a = res.data;
      setAccounts([
        { id: a.id, code: a.code, name: a.name, type: a.type, category: a.category, balance: a.balance, currency: a.currency, status: a.status },
        ...accounts,
      ]);
      setIsAddOpen(false);
      setCode("");
      setName("");
      setType("asset");
      setCategory("");
      setNotice("Akun baru berhasil ditambahkan.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menambahkan akun. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Account>[] = [
    {
      key: "code",
      header: "Account Code",
      sortable: true,
      render: (a) => <span className="font-mono text-xs font-bold text-brand-primary">{a.code}</span>,
    },
    {
      key: "name",
      header: "Account Name",
      sortable: true,
      render: (a) => <span className="text-xs font-semibold text-foreground">{a.name}</span>,
    },
    {
      key: "type",
      header: "Account Classification",
      sortable: true,
      render: (a) => <span className="text-xs text-muted-foreground">{a.type}</span>,
    },
    {
      key: "category",
      header: "Report Category",
      render: (a) => <span className="text-xs text-muted-foreground">{a.category ? CATEGORY_LABELS[a.category] ?? a.category : "-"}</span>,
    },
    {
      key: "balance",
      header: "Current Ledger Balance",
      align: "right",
      sortable: true,
      render: (a) => <MoneyDisplay amount={a.balance} highlight className="text-xs font-bold" />,
    },
    {
      key: "status",
      header: "Status",
      render: (a) => <StatusBadge status={a.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts (COA)"
        description="Master ledger classifications, balance sheet accounts, and profit & loss structure."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export COA
        </Button>
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => {
            setFormError(null);
            setIsAddOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add Account
        </Button>
      </PageHeader>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {notice && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {notice}
        </div>
      )}

      <DataTable
        columns={columns}
        data={accounts}
        searchKey="name"
        searchPlaceholder="Search account code or name..."
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Add Chart of Accounts Entry</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddAccount} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Account Code *</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 1104" className="h-9 text-xs" required />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Account Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kas Kecil Cabang Bandung" className="h-9 text-xs" required />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Account Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as (typeof ACCOUNT_TYPES)[number])}
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {(type === "revenue" || type === "expense") && (
              <div className="space-y-1">
                <label className="font-bold text-foreground">Report Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="">Default (by account code)</option>
                  {Object.entries(CATEGORY_LABELS)
                    .filter(([k]) => type === "expense" || k === "non_operating")
                    .map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm">
                Save Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
