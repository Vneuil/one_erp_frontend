"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { assetsApi, DepreciationReport } from "@/lib/api/assets";
import { downloadCsv } from "@/lib/utils/csv";

const currentPeriod = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()).slice(0, 7);
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function DepreciationPage() {
  const [period, setPeriod] = React.useState(currentPeriod());
  const [catchUp, setCatchUp] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  // Bumped after posting to refetch. The result is tagged with the query that
  // produced it, so "loading" is derived instead of set from inside the effect.
  const [reloadTick, setReloadTick] = React.useState(0);
  const key = `${period}|${reloadTick}`;
  const [result, setResult] = React.useState<{ key: string; data: DepreciationReport | null; error: string | null } | null>(null);

  React.useEffect(() => {
    let alive = true;
    assetsApi.depreciationReport(period)
      .then((res) => alive && setResult({ key, data: res.data, error: null }))
      .catch((e) => alive && setResult({ key, data: null, error: errText(e, "Gagal memuat laporan penyusutan.") }));
    return () => {
      alive = false;
    };
  }, [key, period]);

  const current = result?.key === key ? result : null;
  const loading = current === null;
  const report = current?.data ?? null;
  const error = actionError ?? current?.error ?? null;

  const unposted = report?.lines.reduce((s, l) => s + l.unpostedMonths, 0) ?? 0;

  const post = async () => {
    const scope = catchUp ? `semua bulan yang belum diposting sampai ${period}` : `bulan ${period}`;
    if (!window.confirm(`Posting penyusutan ${scope} ke buku besar? Jurnal yang sudah terposting tidak bisa diposting ulang.`)) return;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const res = await assetsApi.postDepreciation(period, catchUp);
      const r = res.data;
      setNotice(r.postedCount === 0
        ? `Tidak ada penyusutan baru untuk diposting (${r.alreadyPosted} sudah terposting sebelumnya).`
        : `${r.postedCount} jurnal penyusutan diposting, total Rp ${r.totalAmount.toLocaleString("id-ID")}.`);
    } catch (e) {
      setActionError(errText(e, "Gagal memposting penyusutan."));
    } finally {
      setBusy(false);
      setReloadTick((t) => t + 1);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    downloadCsv(`penyusutan-aktiva-${period}.csv`,
      ["Kode", "Aset", "Kategori", "Tgl Perolehan", "Harga Perolehan", "Umur (th)", "Penyusutan/bulan", "Periode ini", "Akumulasi", "Nilai Buku", "Bulan belum diposting"],
      report.lines.map((l) => [l.assetCode, l.name, l.category, l.purchaseDate, l.cost, l.usefulLifeYears, l.monthlyDepreciation, l.postedInPeriod, l.accumulatedPosted, l.bookValue, l.unpostedMonths]));
  };

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const thr = `${th} text-right`;
  const td = "px-3 py-2 text-xs";
  const tdr = `${td} text-right tabular-nums`;

  return (
    <div className="space-y-6">
      <PageHeader title="Penyusutan Aktiva" description="Laporan dan posting penyusutan garis lurus bulanan ke buku besar (Beban Penyusutan 5400 / Akumulasi Penyusutan 1590). Penyusutan dimulai di bulan perolehan.">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" disabled={!report} onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>Cetak</Button>
      </PageHeader>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <Card className="border-border shadow-2xs print:hidden">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold">Periode<Input type="month" max={currentPeriod()} value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} /></label>
          <label className="flex items-center gap-2 text-xs font-semibold h-9">
            <input type="checkbox" checked={catchUp} onChange={(e) => setCatchUp(e.target.checked)} />
            Susulkan bulan sebelumnya yang belum diposting
          </label>
          <div className="sm:col-span-2 flex items-center justify-end gap-3">
            {unposted > 0 && <span className="text-[11px] text-amber-700 font-semibold">{unposted} bulan-aset belum terposting sampai periode ini</span>}
            <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || loading} onClick={post}>{busy ? "Memposting..." : "Posting ke buku besar"}</Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([["Harga perolehan", report.totalCost], ["Penyusutan periode ini", report.totalPostedInPeriod], ["Akumulasi penyusutan", report.totalAccumulated], ["Nilai buku", report.totalBookValue]] as const).map(([l, v]) => (
            <Card key={l} className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">{l}</div><div className="text-lg font-black"><MoneyDisplay amount={v} /></div></CardContent></Card>
          ))}
        </div>
      )}

      <Card className="border-border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className={th}>Kode</th><th className={th}>Aset</th><th className={th}>Kategori</th><th className={th}>Perolehan</th><th className={thr}>Harga perolehan</th><th className={thr}>Per bulan</th><th className={thr}>Periode ini</th><th className={thr}>Akumulasi</th><th className={thr}>Nilai buku</th><th className={thr}>Belum diposting</th></tr></thead>
            <tbody>
              {loading && <tr><td className={td} colSpan={10}>Memuat laporan...</td></tr>}
              {!loading && report?.lines.length === 0 && <tr><td className={td} colSpan={10}>Belum ada aset.</td></tr>}
              {!loading && report?.lines.map((l) => (
                <tr key={l.assetId} className="border-t border-border">
                  <td className={`${td} font-mono`}>{l.assetCode}</td>
                  <td className={`${td} font-semibold`}>{l.name}{l.status === "Disposed" ? " (dilepas)" : ""}</td>
                  <td className={td}>{l.category}</td>
                  <td className={td}>{l.purchaseDate}</td>
                  <td className={tdr}><MoneyDisplay amount={l.cost} /></td>
                  <td className={tdr}><MoneyDisplay amount={l.monthlyDepreciation} /></td>
                  <td className={tdr}><MoneyDisplay amount={l.postedInPeriod} /></td>
                  <td className={tdr}><MoneyDisplay amount={l.accumulatedPosted} /></td>
                  <td className={`${tdr} font-bold`}><MoneyDisplay amount={l.bookValue} /></td>
                  <td className={`${tdr} ${l.unpostedMonths > 0 ? "text-amber-700 font-bold" : ""}`}>{l.unpostedMonths} bln</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
