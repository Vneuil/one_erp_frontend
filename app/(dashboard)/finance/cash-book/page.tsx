"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { financeApi, AccountItem, GeneralLedgerReport } from "@/lib/api/finance";
import { downloadCsv } from "@/lib/utils/csv";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function CashBookPage() {
  const [cashAccounts, setCashAccounts] = React.useState<AccountItem[]>([]);
  const [accountCode, setAccountCode] = React.useState("");
  const [from, setFrom] = React.useState(today());
  const [to, setTo] = React.useState(today());
  const [accountsError, setAccountsError] = React.useState<string | null>(null);
  // The result is tagged with the query that produced it, so "loading" is
  // derived (result is stale) instead of being set from inside the effect.
  const key = `${accountCode}|${from}|${to}`;
  const [result, setResult] = React.useState<{ key: string; data: GeneralLedgerReport | null; error: string | null } | null>(null);

  React.useEffect(() => {
    financeApi.listAccounts({ perPage: 500 })
      .then((r) => setCashAccounts((r.data || []).filter((a) => a.type === "asset" && /^10\d\d$/.test(a.code))))
      .catch((e) => setAccountsError(errText(e, "Gagal memuat daftar akun.")));
  }, []);

  React.useEffect(() => {
    let alive = true;
    financeApi.cashBook({ accountCode: accountCode || undefined, from, to })
      .then((res) => alive && setResult({ key, data: res.data, error: null }))
      .catch((e) => alive && setResult({ key, data: null, error: errText(e, "Gagal memuat laporan kas/bank.") }));
    return () => {
      alive = false;
    };
  }, [key, accountCode, from, to]);

  const current = result?.key === key ? result : null;
  const loading = current === null;
  const report = current?.data ?? null;
  const error = current?.error ?? accountsError;

  const exportCsv = () => {
    if (!report) return;
    const rows: (string | number)[][] = [];
    report.accounts.forEach((a) => a.lines.forEach((l) => rows.push([a.code, a.name, l.date, l.entryNumber, l.description || l.memo, l.debit, l.credit, l.balance])));
    downloadCsv(`kas-bank-${from}-${to}.csv`, ["Kode", "Akun", "Tanggal", "No. Jurnal", "Keterangan", "Masuk", "Keluar", "Saldo"], rows);
  };

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const thr = `${th} text-right`;
  const td = "px-3 py-1.5 text-xs";
  const tdr = `${td} text-right tabular-nums`;
  const totalOpening = report?.accounts.reduce((s, a) => s + a.openingBalance, 0) ?? 0;
  const totalClosing = report?.accounts.reduce((s, a) => s + a.closingBalance, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Kas / Bank Harian" description="Saldo awal, penerimaan, pengeluaran, dan saldo akhir akun kas dan bank per hari.">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" disabled={!report || report.accounts.length === 0} onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>Cetak</Button>
      </PageHeader>

      <Card className="border-border shadow-2xs print:hidden">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold sm:col-span-2">
            Akun kas / bank
            <select value={accountCode} onChange={(e) => setAccountCode(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
              <option value="">Semua kas dan bank</option>
              {cashAccounts.map((a) => <option key={a.id} value={a.code}>{a.code} - {a.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold">Dari<Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Sampai<Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        </CardContent>
      </Card>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {loading && <div className="py-10 text-center text-xs text-muted-foreground">Memuat laporan...</div>}

      {!loading && report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">Saldo awal ({from})</div><div className="text-xl font-black"><MoneyDisplay amount={totalOpening} /></div></CardContent></Card>
            <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">Saldo akhir ({to})</div><div className="text-xl font-black"><MoneyDisplay amount={totalClosing} /></div></CardContent></Card>
          </div>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <div className="px-3 py-2 border-b border-border bg-slate-50 text-sm font-bold">Ringkasan harian</div>
              <table className="w-full">
                <thead><tr><th className={th}>Tanggal</th><th className={thr}>Saldo awal</th><th className={thr}>Masuk</th><th className={thr}>Keluar</th><th className={thr}>Saldo akhir</th></tr></thead>
                <tbody>
                  {(report.days ?? []).length === 0 && <tr><td className={td} colSpan={5}>Tidak ada transaksi kas/bank pada periode ini.</td></tr>}
                  {(report.days ?? []).map((d) => (
                    <tr key={d.date} className="border-t border-border">
                      <td className={td}>{d.date}</td>
                      <td className={tdr}><MoneyDisplay amount={d.opening} /></td>
                      <td className={`${tdr} text-emerald-700`}><MoneyDisplay amount={d.in} /></td>
                      <td className={`${tdr} text-rose-700`}><MoneyDisplay amount={d.out} /></td>
                      <td className={`${tdr} font-bold`}><MoneyDisplay amount={d.closing} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {report.accounts.map((a) => (
            <Card key={a.accountId} className="border-border shadow-2xs">
              <CardContent className="p-0 overflow-x-auto">
                <div className="px-3 py-2 border-b border-border bg-slate-50 text-sm font-bold"><span className="font-mono text-brand-primary">{a.code}</span> {a.name}</div>
                <table className="w-full">
                  <thead><tr><th className={th}>Tanggal</th><th className={th}>No. Jurnal</th><th className={th}>Keterangan</th><th className={thr}>Masuk</th><th className={thr}>Keluar</th><th className={thr}>Saldo</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-border font-semibold"><td className={td} colSpan={5}>Saldo awal</td><td className={tdr}><MoneyDisplay amount={a.openingBalance} /></td></tr>
                    {a.lines.map((l, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className={td}>{l.date}</td>
                        <td className={`${td} font-mono`}>{l.entryNumber}</td>
                        <td className={td}>{l.description || l.memo || "-"}</td>
                        <td className={`${tdr} text-emerald-700`}>{l.debit ? <MoneyDisplay amount={l.debit} /> : ""}</td>
                        <td className={`${tdr} text-rose-700`}>{l.credit ? <MoneyDisplay amount={l.credit} /> : ""}</td>
                        <td className={tdr}><MoneyDisplay amount={l.balance} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
