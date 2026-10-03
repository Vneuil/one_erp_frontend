"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { projectCostApi, ProfitReport } from "@/lib/api/projectcost";

export default function ProjectProfitabilityPage() {
  const [report, setReport] = React.useState<ProfitReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    projectCostApi
      .profitability()
      .then((r) => alive && setReport(r.data))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Gagal memuat laporan."));
    return () => {
      alive = false;
    };
  }, []);

  const tile = (label: string, amount: number, tone?: string) => (
    <Card><CardContent className="p-4"><div className="text-[11px] text-muted-foreground font-semibold">{label}</div><div className={`text-lg font-black ${tone ?? ""}`}><MoneyDisplay amount={amount} /></div></CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-brand-dark flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Laba Rugi per Proyek</h1>
        <p className="text-xs text-muted-foreground">
          Pendapatan = RAB. Pendapatan berjalan mengikuti progres proyek; laba berjalan = pendapatan berjalan dikurangi biaya aktual. Prakiraan laba mengasumsikan proyek selesai sebesar RAP (atau biaya aktual bila sudah melebihi RAP). Yang berpotensi rugi tampil paling atas.
        </p>
      </div>
      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tile("Total pendapatan (RAB)", report.revenue)}
            {tile("Biaya aktual", report.actualCost)}
            {tile("Laba berjalan", report.profitToDate, report.profitToDate < 0 ? "text-rose-600" : "text-emerald-700")}
            {tile("Prakiraan laba akhir", report.forecastProfit, report.forecastProfit < 0 ? "text-rose-600" : "text-emerald-700")}
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {report.rows.length === 0 ? <p className="p-4 text-xs text-muted-foreground">Belum ada proyek.</p> : (
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-muted-foreground border-b"><th className="p-3">Proyek</th><th className="p-3 text-right">Progres</th><th className="p-3 text-right">Pendapatan</th><th className="p-3 text-right">Biaya aktual</th><th className="p-3 text-right">Laba berjalan</th><th className="p-3 text-right">Prakiraan laba</th></tr></thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.projectId} className="border-b">
                        <td className="p-3"><Link href={`/projects/${r.projectId}/budget`} className="font-semibold hover:underline">{r.name}</Link><div className="text-[10px] text-muted-foreground">{r.code} · {r.customer}</div></td>
                        <td className="p-3 text-right font-mono">{r.progress}%</td>
                        <td className="p-3 text-right"><MoneyDisplay amount={r.revenue} /></td>
                        <td className="p-3 text-right"><MoneyDisplay amount={r.actualCost} /></td>
                        <td className={`p-3 text-right ${r.profitToDate < 0 ? "text-rose-600" : ""}`}><MoneyDisplay amount={r.profitToDate} /></td>
                        <td className={`p-3 text-right font-bold ${r.lossMaking ? "text-rose-600" : "text-emerald-700"}`}><MoneyDisplay amount={r.forecastProfit} /> <span className="font-mono text-[10px]">({r.forecastMarginPct}%)</span>{r.lossMaking && <span className="ml-1 text-[10px]">RUGI</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
