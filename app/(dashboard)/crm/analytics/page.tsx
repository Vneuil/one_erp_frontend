"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { crmPlusApi, CrmAnalytics } from "@/lib/api/crmplus";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function CrmAnalyticsPage() {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [data, setData] = React.useState<CrmAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    crmPlusApi
      .analytics({ from: from || undefined, to: to || undefined })
      .then((r) => {
        if (!alive) return;
        setData(r.data);
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat analitik.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [from, to]);

  const maxFunnel = Math.max(1, ...(data?.funnel.map((f) => f.count) ?? [1]));
  const maxReason = Math.max(1, ...(data?.lostReasons.map((r) => r.count) ?? [1]));
  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";
  const stat = (label: string, value: React.ReactNode, hint?: string) => (
    <Card className="border-border shadow-2xs">
      <CardContent className="p-4 space-y-1">
        <div className="text-xs text-muted-foreground font-semibold">{label}</div>
        <div className="text-xl font-black">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand-primary" />
            <span>CRM Intelligence</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Corong penjualan, tingkat menang, alasan deal kalah, performa per sales, sumber prospek, dan deal yang lama tidak disentuh. Deal terbuka selalu dihitung penuh; deal menang/kalah dibatasi periode tutupnya.
          </p>
        </div>
        <div className="flex items-end gap-2 text-xs font-semibold">
          <label className="space-y-1">Dari<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-xs" /></label>
          <label className="space-y-1">Sampai<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-xs" /></label>
        </div>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {loading && <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stat("Pipeline terbuka", <MoneyDisplay amount={data.totals.openValue} />, `${data.totals.open} deal · terbobot `)}
            {stat("Forecast terbobot", <MoneyDisplay amount={data.totals.weightedPipeline} />, "nilai × probabilitas tahap")}
            {stat("Tingkat menang", pct(data.totals.winRate), `${data.totals.won} menang · ${data.totals.lost} kalah`)}
            {stat("Rata-rata siklus", `${data.totals.avgCycleDays} hari`, `nilai rata-rata menang `)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-2">
                <div className="text-xs font-bold">Corong penjualan</div>
                {data.funnel.map((f) => (
                  <div key={f.key} className="space-y-0.5">
                    <div className="flex justify-between text-[11px]"><span className="font-semibold">{f.name}</span><span className="text-muted-foreground">{f.count} deal · <MoneyDisplay amount={f.value} /></span></div>
                    <div className="h-2 rounded bg-slate-100"><div className={`h-2 rounded ${f.kind === "won" ? "bg-emerald-500" : f.kind === "lost" ? "bg-rose-400" : "bg-brand-primary"}`} style={{ width: `${(f.count / maxFunnel) * 100}%` }} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-2">
                <div className="text-xs font-bold">Alasan deal kalah</div>
                {data.lostReasons.length === 0 && <p className="text-xs text-muted-foreground">Belum ada deal kalah pada periode ini.</p>}
                {data.lostReasons.map((r) => (
                  <div key={r.reason} className="space-y-0.5">
                    <div className="flex justify-between text-[11px]"><span className="font-semibold">{r.reason}</span><span className="text-muted-foreground">{r.count}× · <MoneyDisplay amount={r.value} /></span></div>
                    <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-rose-400" style={{ width: `${(r.count / maxReason) * 100}%` }} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <div className="px-3 pt-3 text-xs font-bold">Performa per sales</div>
              <table className="w-full">
                <thead><tr>{["Sales", "Deal terbuka", "Nilai terbuka", "Menang", "Nilai menang", "Kalah", "Tingkat menang"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.owners.length === 0 && <tr><td className={td} colSpan={7}>Belum ada data.</td></tr>}
                  {data.owners.map((o) => (
                    <tr key={o.owner} className="border-t border-border">
                      <td className={`${td} font-semibold`}>{o.owner}</td><td className={td}>{o.open}</td><td className={td}><MoneyDisplay amount={o.openValue} /></td>
                      <td className={td}>{o.won}</td><td className={td}><MoneyDisplay amount={o.wonValue} /></td><td className={td}>{o.lost}</td><td className={td}>{pct(o.winRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border shadow-2xs">
              <CardContent className="p-0 overflow-x-auto">
                <div className="px-3 pt-3 text-xs font-bold">Sumber prospek</div>
                <table className="w-full">
                  <thead><tr>{["Sumber", "Prospek", "Estimasi nilai"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.leadSources.length === 0 && <tr><td className={td} colSpan={3}>Belum ada prospek.</td></tr>}
                    {data.leadSources.map((s) => <tr key={s.source} className="border-t border-border"><td className={td}>{s.source}</td><td className={td}>{s.leads}</td><td className={td}><MoneyDisplay amount={s.estimatedValue} /></td></tr>)}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-border shadow-2xs">
              <CardContent className="p-0 overflow-x-auto">
                <div className="px-3 pt-3 text-xs font-bold">Deal tanpa aktivitas ≥ 14 hari <span className="font-normal text-muted-foreground">· tugas terlambat: {data.tasks.overdue}, hari ini: {data.tasks.dueToday}</span></div>
                <table className="w-full">
                  <thead><tr>{["Deal", "Sales", "Nilai", "Diam"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.staleDeals.length === 0 && <tr><td className={td} colSpan={4}>Semua deal terbuka aktif dalam 14 hari terakhir.</td></tr>}
                    {data.staleDeals.map((d) => <tr key={d.id} className="border-t border-border"><td className={td}>{d.title}<div className="text-[10px] text-muted-foreground">{d.customer}</div></td><td className={td}>{d.owner || "-"}</td><td className={td}><MoneyDisplay amount={d.value} /></td><td className={`${td} font-bold text-rose-600`}>{d.daysIdle} hari</td></tr>)}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
