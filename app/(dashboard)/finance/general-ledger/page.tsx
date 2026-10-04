"use client";

import * as React from "react";
import { BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { financeApi, AccountItem, GeneralLedgerReport } from "@/lib/api/finance";
import { downloadCsv } from "@/lib/utils/csv";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const monthStart = () => today().slice(0, 8) + "01";
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function GeneralLedgerPage() {
  const [accounts, setAccounts] = React.useState<AccountItem[]>([]);
  const [accountId, setAccountId] = React.useState("");
  const [from, setFrom] = React.useState(monthStart());
  const [to, setTo] = React.useState(today());
  const [accountsError, setAccountsError] = React.useState<string | null>(null);
  // The result is tagged with the query that produced it, so "loading" is
  // derived (result is stale) instead of being set from inside the effect.
  const key = `${accountId}|${from}|${to}`;
  const [result, setResult] = React.useState<{ key: string; data: GeneralLedgerReport | null; error: string | null } | null>(null);

  React.useEffect(() => {
    financeApi.listAccounts({ perPage: 500 }).then((r) => setAccounts(r.data || [])).catch((e) => setAccountsError(errText(e, "Gagal memuat daftar akun.")));
  }, []);

  React.useEffect(() => {
    let alive = true;
    financeApi.generalLedger({ accountId: accountId || undefined, from, to })
      .then((res) => alive && setResult({ key, data: res.data, error: null }))
      .catch((e) => alive && setResult({ key, data: null, error: errText(e, "Gagal memuat buku besar.") }));
    return () => {
      alive = false;
    };
  }, [key, accountId, from, to]);

  const current = result?.key === key ? result : null;
  const loading = current === null;
  const report = current?.data ?? null;
  const error = current?.error ?? accountsError;

  const exportCsv = () => {
    if (!report) return;
    const rows: (string | number)[][] = [];
    report.accounts.forEach((a) => {
      rows.push([a.code, a.name, "", "Saldo awal", "", "", a.openingBalance]);
      a.lines.forEach((l) => rows.push([a.code, a.name, l.date, l.entryNumber, l.description || l.memo, l.debit, l.credit, l.balance].slice(0, 8)));
      rows.push([a.code, a.name, "", "Saldo akhir", "", a.totalDebit, a.totalCredit, a.closingBalance]);
    });
    downloadCsv(`buku-besar-${from}-${to}.csv`, ["Kode", "Akun", "Tanggal", "No. Jurnal", "Keterangan", "Debit", "Kredit", "Saldo"], rows);
  };

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const thr = `${th} text-right`;
  const td = "px-3 py-1.5 text-xs";
  const tdr = `${td} text-right tabular-nums`;

  return (
    <div className="space-y-6">
      <PageHeader title="Buku Besar" description="Mutasi per akun dari jurnal yang sudah diposting, lengkap dengan saldo awal dan saldo berjalan.">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" disabled={!report || report.accounts.length === 0} onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>Cetak</Button>
      </PageHeader>

      <Card className="border-border shadow-2xs print:hidden">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold sm:col-span-2">
            Akun
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
              <option value="">Semua akun yang bergerak</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold">Dari<Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Sampai<Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        </CardContent>
      </Card>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {loading && <div className="py-10 text-center text-xs text-muted-foreground">Memuat buku besar...</div>}
      {!loading && report && report.accounts.length === 0 && (
        <div className="py-10 text-center text-xs text-muted-foreground flex flex-col items-center gap-2"><BookOpen className="h-6 w-6" />Tidak ada mutasi pada periode ini.</div>
      )}

      {!loading && report?.accounts.map((a) => (
        <Card key={a.accountId} className="border-border shadow-2xs">
          <CardContent className="p-0 overflow-x-auto">
            <div className="px-3 py-2 border-b border-border bg-slate-50 flex items-baseline justify-between">
              <div className="text-sm font-bold"><span className="font-mono text-brand-primary">{a.code}</span> {a.name}</div>
              <div className="text-[11px] text-muted-foreground">{a.type}</div>
            </div>
            <table className="w-full">
              <thead><tr><th className={th}>Tanggal</th><th className={th}>No. Jurnal</th><th className={th}>Keterangan</th><th className={thr}>Debit</th><th className={thr}>Kredit</th><th className={thr}>Saldo</th></tr></thead>
              <tbody>
                <tr className="border-t border-border font-semibold"><td className={td} colSpan={5}>Saldo awal</td><td className={tdr}><MoneyDisplay amount={a.openingBalance} /></td></tr>
                {a.lines.map((l, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className={td}>{l.date}</td>
                    <td className={`${td} font-mono`}>{l.entryNumber}</td>
                    <td className={td}>{l.description || l.memo || "-"}</td>
                    <td className={tdr}>{l.debit ? <MoneyDisplay amount={l.debit} /> : ""}</td>
                    <td className={tdr}>{l.credit ? <MoneyDisplay amount={l.credit} /> : ""}</td>
                    <td className={tdr}><MoneyDisplay amount={l.balance} /></td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold bg-slate-50">
                  <td className={td} colSpan={3}>Total / Saldo akhir</td>
                  <td className={tdr}><MoneyDisplay amount={a.totalDebit} /></td>
                  <td className={tdr}><MoneyDisplay amount={a.totalCredit} /></td>
                  <td className={tdr}><MoneyDisplay amount={a.closingBalance} /></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
