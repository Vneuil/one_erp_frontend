"use client";

import * as React from "react";
import { Plus, BookOpen } from "lucide-react";
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
import { financeApi, AccountItem } from "@/lib/api/finance";
import { describeSource } from "@/lib/utils/finance-source";

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  memo: string;
  sourceDoc: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
}

export default function JournalEntriesPage() {
  const [journals, setJournals] = React.useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = React.useState<AccountItem[]>([]);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [memo, setMemo] = React.useState("");
  const [debitAccountId, setDebitAccountId] = React.useState("");
  const [creditAccountId, setCreditAccountId] = React.useState("");
  const [amount, setAmount] = React.useState(0);

  React.useEffect(() => {
    financeApi
      .listJournalEntries()
      .then((res) => {
        setJournals(
          (res.data || []).map((j) => ({
            id: j.id,
            entryNumber: j.entryNumber,
            date: j.date,
            memo: j.memo,
            sourceDoc: j.sourceDoc,
            totalDebit: j.totalDebit,
            totalCredit: j.totalCredit,
            status: j.status,
          }))
        );
      })
      .catch((err) => {
        console.error("Failed to load journal entries", err);
      });

    financeApi
      .listAccounts()
      .then((res) => {
        setAccounts(res.data || []);
        if (res.data && res.data.length >= 2) {
          setDebitAccountId(res.data[0].id);
          setCreditAccountId(res.data[1].id);
        }
      })
      .catch((err) => console.warn("Accounts unavailable for journal voucher form", err));
  }, []);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memo || amount <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await financeApi.createJournalEntry({
        date: new Date().toISOString().split("T")[0],
        memo,
        lines: [
          { accountId: debitAccountId, debit: amount, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: amount },
        ],
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal memposting voucher jurnal.");
      }
      const j = res.data;
      setJournals([
        {
          id: j.id,
          entryNumber: j.entryNumber,
          date: j.date,
          memo: j.memo,
          sourceDoc: j.sourceDoc || "Manual",
          totalDebit: j.totalDebit,
          totalCredit: j.totalCredit,
          status: j.status,
        },
        ...journals,
      ]);
      setIsNewOpen(false);
      setMemo("");
      setAmount(0);
      setNotice("Voucher jurnal umum berhasil diposting ke buku besar.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal memposting jurnal. Periksa koneksi atau akun yang dipilih.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<JournalEntry>[] = [
    {
      key: "entryNumber",
      header: "Voucher No.",
      sortable: true,
      render: (j) => <span className="font-mono text-xs font-bold text-brand-primary">{j.entryNumber}</span>,
    },
    {
      key: "date",
      header: "Posting Date",
      sortable: true,
      render: (j) => <span className="text-xs text-muted-foreground">{j.date}</span>,
    },
    {
      key: "memo",
      header: "Journal Memo / Narrative",
      render: (j) => (
        <div>
          <p className="text-xs font-semibold text-foreground">{j.memo}</p>
          <span className="text-[11px] text-muted-foreground">
            {describeSource(j.sourceDoc).auto ? (
              <span className="mr-1.5 rounded bg-brand-primary/10 px-1.5 py-0.5 font-semibold text-brand-primary">Auto</span>
            ) : null}
            Source: {describeSource(j.sourceDoc).label}
          </span>
        </div>
      ),
    },
    {
      key: "totalDebit",
      header: "Total Balanced Amount",
      align: "right",
      sortable: true,
      render: (j) => <MoneyDisplay amount={j.totalDebit} className="text-xs font-bold" />,
    },
    {
      key: "status",
      header: "Audit State",
      render: (j) => <StatusBadge status={j.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Ledger Journal Entries"
        description="Double-entry transaction vouchers automatically posted from sub-ledgers and manual adjustments."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => {
            setFormError(null);
            setIsNewOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Manual Journal Voucher
        </Button>
      </PageHeader>

      {notice && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {notice}
        </div>
      )}

      <DataTable
        columns={columns}
        data={journals}
        searchKey="entryNumber"
        searchPlaceholder="Search journal entry or memo..."
      />

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-primary" />
              <span>Manual Journal Voucher</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddJournal} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Memo / Narrative *</label>
              <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="e.g. Manual adjustment for..." className="h-9 text-xs" required />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Debit Account *</label>
              <select
                value={debitAccountId}
                onChange={(e) => setDebitAccountId(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Credit Account *</label>
              <select
                value={creditAccountId}
                onChange={(e) => setCreditAccountId(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Amount (Balanced Debit = Credit) *</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-9 text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm">
                Post Voucher
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
