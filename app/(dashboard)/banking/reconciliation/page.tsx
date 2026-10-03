"use client";

import * as React from "react";
import {
  Upload,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/data-table/data-table";
import { MoneyDisplay } from "@/components/shared/money-display";
import { bankingApi } from "@/lib/api/banking";

interface BankMutation {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "CR" | "DB";
  matchedLedgerNo?: string;
  status: "Matched" | "Unmatched";
}

export default function BankReconciliationPage() {
  const [mutations, setMutations] = React.useState<BankMutation[]>([]);
  const [bankAccountId, setBankAccountId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    bankingApi
      .listBankAccounts()
      .then(async (res) => {
        const account = res.data?.[0];
        if (!account) return;
        setBankAccountId(account.id);
        const linesRes = await bankingApi.listStatementLines(account.id);
        setMutations(
          (linesRes.data || []).map((l) => ({
            id: l.id,
            date: l.transactionDate,
            description: l.description,
            amount: Math.abs(l.amount),
            type: l.amount >= 0 ? "CR" : "DB",
            matchedLedgerNo: l.matchedJournalLineId || undefined,
            status: l.isReconciled ? "Matched" : "Unmatched",
          }))
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Gagal memuat rekening bank.");
      });
  }, []);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || busy) return;
    setError("");
    setNotice("");
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Gunakan berkas CSV dengan kolom tanggal, deskripsi, jumlah."); return; }

    if (bankAccountId) {
      setBusy(true);
      try {
        const text = await file.text();
        const rows = text
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean)
          .slice(1); // assume header row
        const parsed = rows
          .map((row) => {
            const [date, description, amount] = row.split(",");
            return {
              transactionDate: date?.trim() || new Date().toISOString().slice(0, 10),
              description: description?.trim() || `IMPORTED FROM ${file.name.toUpperCase()}`,
              amount: Number(amount) || 0,
            };
          })
          .filter((l) => l.amount !== 0);

        if (parsed.length > 0) {
          const res = await bankingApi.importStatementLines(bankAccountId, parsed);
          if (!res.success) throw new Error(res.message);
          setMutations([
            ...res.data.map((l) => ({
              id: l.id,
              date: l.transactionDate,
              description: l.description,
              amount: Math.abs(l.amount),
              type: (l.amount >= 0 ? "CR" : "DB") as "CR" | "DB",
              matchedLedgerNo: l.matchedJournalLineId || undefined,
              status: (l.isReconciled ? "Matched" : "Unmatched") as "Matched" | "Unmatched",
            })),
            ...mutations,
          ]);
        } else {
          throw new Error("No valid rows parsed from file");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impor gagal. Silakan coba lagi.");
        return;
      } finally {
        setBusy(false);
      }
    } else {
      setError("Rekening bank belum tersedia. Tambahkan rekening terlebih dahulu.");
      return;
    }

    e.target.value = "";
    setNotice(`Berkas ${file.name} berhasil diunggah dan menunggu rekonsiliasi.`);
  };

  const handleAutoReconcile = async () => {
    if (busy || !bankAccountId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await bankingApi.autoReconcile(bankAccountId);
      if (!result.success) throw new Error(result.message);
      setNotice(`Rekonsiliasi tersimpan: ${result.data.matchedCount} cocok, ${result.data.unreconciledCount} belum cocok.`);
      const linesRes = await bankingApi.listStatementLines(bankAccountId);
      if (!linesRes.success) throw new Error("Rekonsiliasi tersimpan, tetapi daftar gagal diperbarui. Muat ulang halaman.");
      setMutations(linesRes.data.map((l) => ({
        id: l.id, date: l.transactionDate, description: l.description,
        amount: Math.abs(l.amount), type: l.amount >= 0 ? "CR" : "DB",
        matchedLedgerNo: l.matchedJournalLineId || undefined,
        status: l.isReconciled ? "Matched" : "Unmatched",
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rekonsiliasi gagal. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<BankMutation>[] = [
    {
      key: "date",
      header: "Tanggal & ID",
      render: (row) => (
        <div>
          <span className="font-bold text-foreground text-xs">{row.date}</span>
          <div className="text-[11px] font-mono text-muted-foreground">{row.id}</div>
        </div>
      ),
    },
    {
      key: "description",
      header: "Uraian Mutasi Bank Statement",
      render: (row) => (
        <span className="text-xs font-mono text-foreground font-semibold">{row.description}</span>
      ),
    },
    {
      key: "amount",
      header: "Nominal (Debit/Kredit)",
      render: (row) => (
        <span
          className={`text-xs font-bold ${
            row.type === "CR" ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {row.type === "CR" ? "+ " : "- "}
          <MoneyDisplay amount={row.amount} />
        </span>
      ),
    },
    {
      key: "matchedLedgerNo",
      header: "Pencocokan Jurnal Buku Besar",
      render: (row) => (
        <span className="text-xs text-brand-dark font-medium">
          {row.matchedLedgerNo || <span className="text-muted-foreground italic">Belum dicocokkan</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status Rekonsiliasi",
      render: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            row.status === "Matched"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {row.status === "Matched" ? "Cocok (Matched)" : "Perlu Tindakan"}
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
            <ArrowRightLeft className="h-6 w-6 text-brand-primary" />
            <span>Rekonsiliasi Bank & Pencocokan Mutasi Otomatis</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Unggah CSV dengan kolom tanggal (YYYY-MM-DD), deskripsi, jumlah; gunakan jumlah negatif untuk debit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelected} />
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !bankAccountId}
            onClick={() => fileInputRef.current?.click()}
            className="h-9 gap-1.5 text-xs border-border"
          >
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Unggah Rekening Koran</span>
          </Button>

          <Button
            variant="gradient"
            size="sm"
            disabled={busy || !bankAccountId}
            onClick={handleAutoReconcile}
            className="h-9 gap-1.5 text-xs font-bold shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Rekonsiliasi Otomatis</span>
          </Button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {!bankAccountId && !error && <p className="text-sm text-muted-foreground">Rekening bank belum tersedia.</p>}

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <DataTable data={mutations} columns={columns} />
      </div>
    </div>
  );
}
