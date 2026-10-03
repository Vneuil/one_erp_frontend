"use client";

import * as React from "react";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { hropsApi, TeamKind, TeamRequests } from "@/lib/api/hrops";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

interface Row {
  kind: TeamKind;
  id: string;
  who: string;
  label: string;
  detail: string;
}

const toRows = (t: TeamRequests): Row[] => [
  ...t.leaves.map((l): Row => ({ kind: "leave", id: l.id, who: l.employeeName, label: "Cuti", detail: `${l.type}, ${l.startDate} s/d ${l.endDate} (${l.totalDays} hari)${l.reason ? ` — ${l.reason}` : ""}` })),
  ...t.overtime.map((o): Row => ({ kind: "overtime", id: o.id, who: o.employeeName, label: "Lembur", detail: `${o.date}, ${o.minutes} menit${o.reason ? ` — ${o.reason}` : ""}` })),
  ...t.corrections.map((c): Row => ({ kind: "correction", id: c.id, who: c.employeeName, label: "Koreksi absensi", detail: `${c.date}, ${c.clockIn || "-"} – ${c.clockOut || "-"}${c.reason ? ` — ${c.reason}` : ""}` })),
  ...t.shiftChanges.map((s): Row => ({ kind: "shift-change", id: s.id, who: s.employeeName, label: "Tukar shift", detail: `${s.date}${s.reason ? ` — ${s.reason}` : ""}` })),
  ...t.advances.map((a): Row => ({ kind: "cash-advance", id: a.id, who: a.employeeName, label: "Kasbon", detail: `${a.installments}× cicilan mulai ${a.startPeriod}${a.reason ? ` — ${a.reason}` : ""}` })),
];

export default function TeamApprovalsPage() {
  const [data, setData] = React.useState<TeamRequests | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    hropsApi.teamRequests().then((r) => alive && setData(r.data)).catch((e) => alive && setError(errText(e, "Gagal memuat permintaan tim.")));
    return () => {
      alive = false;
    };
  }, []);

  const decide = async (row: Row, approve: boolean) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await hropsApi.decideTeam(row.kind, row.id, approve);
      setData((await hropsApi.teamRequests()).data);
      setNotice(approve ? "Permintaan disetujui." : "Permintaan ditolak.");
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const rows = data ? toRows(data) : [];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-brand-dark flex items-center gap-2"><UsersRound className="h-5 w-5" /> Persetujuan Tim</h1>
        <p className="text-xs text-muted-foreground">Permintaan dari anggota tim Anda (bawahan langsung dan di bawahnya). Anda tidak dapat memutuskan permintaan Anda sendiri. Atasan ditetapkan di Karyawan → Ubah.</p>
      </div>
      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}
      <Card>
        <CardContent className="p-0">
          {!data ? <p className="p-4 text-xs text-muted-foreground">Memuat…</p> : rows.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">Tidak ada permintaan yang menunggu keputusan Anda.</p>
          ) : (
            <ul>
              {rows.map((r) => (
                <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-3 p-3 border-b last:border-0 text-xs">
                  <div>
                    <div className="font-bold">{r.who} <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold">{r.label}</span></div>
                    <div className="text-muted-foreground">{r.detail}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" disabled={busy} onClick={() => decide(r, true)} className="h-7 px-2 text-[11px] font-bold">Setujui</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(r, false)} className="h-7 px-2 text-[11px]">Tolak</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {data && data.advances.length > 0 && <p className="text-[10px] text-muted-foreground">Kasbon yang disetujui akan dicairkan dan dijurnal otomatis (<MoneyDisplay amount={data.advances.reduce((s, a) => s + a.amount, 0)} /> menunggu).</p>}
    </div>
  );
}
