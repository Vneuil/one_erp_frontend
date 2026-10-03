"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { hropsApi, HRDashboard } from "@/lib/api/hrops";

function Tile({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-[11px] text-muted-foreground font-semibold">{label}</div>
      <div className={`text-2xl font-black ${tone ?? ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </CardContent></Card>
  );
}

function Bars({ rows }: { rows: { name: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.name} className="text-xs">
          <div className="flex justify-between"><span>{r.name || "-"}</span><span className="font-mono">{r.count}</span></div>
          <div className="h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-brand-primary" style={{ width: `${(r.count / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function HRDashboardPage() {
  const [d, setD] = React.useState<HRDashboard | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    hropsApi.dashboard().then((r) => alive && setD(r.data)).catch((e) => alive && setError(e instanceof Error ? e.message : "Gagal memuat dasbor."));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-brand-dark flex items-center gap-2"><LayoutDashboard className="h-5 w-5" /> Dasbor Eksekutif HR</h1>
        <p className="text-xs text-muted-foreground">{d ? `Per ${d.asOf}. ` : ""}Gambaran tenaga kerja hari ini: kehadiran, permintaan yang menunggu, dan dokumen yang akan habis masa berlakunya.</p>
      </div>
      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Karyawan aktif" value={d.headcount} hint={`${d.newJoiners30d} bergabung 30 hari terakhir`} />
            <Tile label="Hadir hari ini" value={d.presentToday} hint={`${d.lateToday} terlambat · ${d.notClockedInYet} belum absen`} />
            <Tile label="Menunggu keputusan" value={d.pending.total} tone={d.pending.total > 0 ? "text-amber-600" : ""} hint={`${d.pending.leaves} cuti · ${d.pending.overtime} lembur · ${d.pending.advances} kasbon`} />
            <Tile label="Lembur bulan ini" value={`${d.overtimeHoursMonth} jam`} hint={`${d.lateIncidentsMonth} keterlambatan bulan ini`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card><CardContent className="p-4 space-y-2"><div className="text-xs font-bold">Per departemen</div><Bars rows={d.byDepartment} /></CardContent></Card>
            <Card><CardContent className="p-4 space-y-2"><div className="text-xs font-bold">Jenis kontrak</div><Bars rows={d.byContract} /></CardContent></Card>
            <Card><CardContent className="p-4 space-y-2"><div className="text-xs font-bold">Status</div><Bars rows={d.byStatus} /></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="text-xs font-bold">Dokumen kedaluwarsa ≤ 30 hari <Link href="/hrm/documents" className="ml-2 font-normal underline text-muted-foreground">Kelola dokumen</Link></div>
              {d.expiringDocuments.length === 0 ? <p className="text-xs text-muted-foreground">Tidak ada.</p> : (
                <ul className="text-xs divide-y">
                  {d.expiringDocuments.map((x) => (
                    <li key={x.documentId} className="py-1.5 flex justify-between">
                      <span><b>{x.employeeName}</b> — {x.title} <span className="text-muted-foreground">({x.docType})</span></span>
                      <span className={x.daysLeft < 0 ? "text-rose-600 font-bold" : "text-amber-700"}>{x.daysLeft < 0 ? `lewat ${-x.daysLeft} hari` : `${x.daysLeft} hari lagi`} · {x.expiresOn}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
