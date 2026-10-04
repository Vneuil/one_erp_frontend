"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { financeApi, ExpenseBreakdownReport, NonOperatingReport, AmountLine } from "@/lib/api/finance";
import { downloadCsv } from "@/lib/utils/csv";

type Tab = "operating" | "nonOperating";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const monthStart = () => today().slice(0, 8) + "01";
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function ExpenseReportsPage() {
  const [tab, setTab] = React.useState<Tab>("operating");
  const [from, setFrom] = React.useState(monthStart());
  const [to, setTo] = React.useState(today());
  // The result is tagged with the range that produced it, so "loading" is
  // derived (result is stale) instead of being set from inside the effect.
  const key = `${from}|${to}`;
  const [result, setResult] = React.useState<{ key: string; operating: ExpenseBreakdownReport | null; nonOp: NonOperatingReport | null; error: string | null } | null>(null);

  React.useEffect(() => {
    let alive = true;
    Promise.all([financeApi.expenseBreakdown(from, to), financeApi.nonOperating(from, to)])
      .then(([o, n]) => alive && setResult({ key, operating: o.data, nonOp: n.data, error: null }))
      .catch((e) => alive && setResult({ key, operating: null, nonOp: null, error: errText(e, "Gagal memuat laporan.") }));
    return () => {
      alive = false;
    };
  }, [key, from, to]);

  const current = result?.key === key ? result : null;
  const loading = current === null;
  const operating = current?.operating ?? null;
  const nonOp = current?.nonOp ?? null;
  const error = current?.error ?? null;

  const exportCsv = () => {
    if (tab === "operating" && operating) {
      const rows: (string | number)[][] = [];
      operating.groups.forEach((g) => {
        g.lines.forEach((l) => rows.push([g.label, l.accountCode, l.accountName, l.amount]));
        rows.push([g.label, "", "Subtotal", g.total]);
      });
      rows.push(["", "", "Total biaya usaha", operating.total]);
      downloadCsv(`rincian-biaya-usaha-${from}-${to}.csv`, ["Kelompok", "Kode", "Akun", "Jumlah"], rows);
    } else if (nonOp) {
      const rows: (string | number)[][] = [
        ...nonOp.income.map((l) => ["Pendapatan", l.accountCode, l.accountName, l.amount]),
        ["Pendapatan", "", "Total pendapatan di luar usaha", nonOp.totalIncome],
        ...nonOp.expenses.map((l) => ["Biaya", l.accountCode, l.accountName, l.amount]),
        ["Biaya", "", "Total biaya di luar usaha", nonOp.totalExpenses],
        ["", "", "Bersih", nonOp.net],
      ];
      downloadCsv(`luar-usaha-${from}-${to}.csv`, ["Jenis", "Kode", "Akun", "Jumlah"], rows);
    }
  };

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-1.5 text-xs";
  const lines = (rows: AmountLine[], empty: string) => (
    <>
      {rows.length === 0 && <tr><td className={td} colSpan={3}>{empty}</td></tr>}
      {rows.map((l) => (
        <tr key={l.accountCode} className="border-t border-border">
          <td className={`${td} font-mono`}>{l.accountCode}</td>
          <td className={td}>{l.accountName}</td>
          <td className={`${td} text-right tabular-nums`}><MoneyDisplay amount={l.amount} /></td>
        </tr>
      ))}
    </>
  );
  const total = (label: string, amount: number) => (
    <tr className="border-t-2 border-border font-bold bg-slate-50"><td className={td} colSpan={2}>{label}</td><td className={`${td} text-right tabular-nums`}><MoneyDisplay amount={amount} /></td></tr>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Rincian Biaya & Pendapatan Luar Usaha" description="Biaya usaha (pemasaran, administrasi & umum) dan pendapatan/biaya di luar usaha, diambil dari jurnal yang sudah diposting. Pengelompokan akun diatur di Chart of Accounts.">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>Cetak</Button>
      </PageHeader>

      <Card className="border-border shadow-2xs print:hidden">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold">Dari<Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Sampai<Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
          <div className="sm:col-span-2 flex gap-1.5">
            {([["operating", "Rincian Biaya Usaha"], ["nonOperating", "Luar Usaha"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 rounded text-xs font-semibold cursor-pointer ${tab === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {loading && <div className="py-10 text-center text-xs text-muted-foreground">Memuat laporan...</div>}

      {!loading && tab === "operating" && operating && (
        <div className="space-y-4">
          {operating.groups.map((g) => (
            <Card key={g.category} className="border-border shadow-2xs">
              <CardContent className="p-0 overflow-x-auto">
                <div className="px-3 py-2 border-b border-border bg-slate-50 text-sm font-bold">{g.label}</div>
                <table className="w-full">
                  <thead><tr><th className={th}>Kode</th><th className={th}>Akun</th><th className={`${th} text-right`}>Jumlah</th></tr></thead>
                  <tbody>{lines(g.lines, "Tidak ada biaya pada periode ini.")}{total(`Total ${g.label}`, g.total)}</tbody>
                </table>
              </CardContent>
            </Card>
          ))}
          <Card className="border-border shadow-2xs"><CardContent className="p-4 flex items-center justify-between"><span className="text-sm font-bold">Total biaya usaha</span><span className="text-lg font-black"><MoneyDisplay amount={operating.total} /></span></CardContent></Card>
        </div>
      )}

      {!loading && tab === "nonOperating" && nonOp && (
        <div className="space-y-4">
          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <div className="px-3 py-2 border-b border-border bg-slate-50 text-sm font-bold">Pendapatan di luar usaha</div>
              <table className="w-full"><thead><tr><th className={th}>Kode</th><th className={th}>Akun</th><th className={`${th} text-right`}>Jumlah</th></tr></thead>
                <tbody>{lines(nonOp.income, "Tidak ada pendapatan di luar usaha.")}{total("Total pendapatan", nonOp.totalIncome)}</tbody></table>
            </CardContent>
          </Card>
          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <div className="px-3 py-2 border-b border-border bg-slate-50 text-sm font-bold">Biaya di luar usaha</div>
              <table className="w-full"><thead><tr><th className={th}>Kode</th><th className={th}>Akun</th><th className={`${th} text-right`}>Jumlah</th></tr></thead>
                <tbody>{lines(nonOp.expenses, "Tidak ada biaya di luar usaha.")}{total("Total biaya", nonOp.totalExpenses)}</tbody></table>
            </CardContent>
          </Card>
          <Card className="border-border shadow-2xs"><CardContent className="p-4 flex items-center justify-between"><span className="text-sm font-bold">Pendapatan (biaya) bersih di luar usaha</span><span className="text-lg font-black"><MoneyDisplay amount={nonOp.net} /></span></CardContent></Card>
        </div>
      )}
    </div>
  );
}
