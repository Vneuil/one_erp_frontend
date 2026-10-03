"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { hrmApi, EmployeeItem } from "@/lib/api/hrm";
import { hropsApi, ShiftItem, ShiftAssignmentItem } from "@/lib/api/hrops";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/** Every date from..to (inclusive, YYYY-MM-DD), optionally skipping Saturday/Sunday. */
function datesBetween(from: string, to: string, weekdaysOnly: boolean): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  for (let d = start; d <= end && out.length < 366; d = new Date(d.getTime() + 86_400_000)) {
    const wd = d.getUTCDay();
    if (weekdaysOnly && (wd === 0 || wd === 6)) continue;
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const daysInMonth = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return y && m ? new Date(y, m, 0).getDate() : 30;
};

export default function ShiftSchedulePage() {
  const [period, setPeriod] = React.useState(today().slice(0, 7));
  const [shifts, setShifts] = React.useState<ShiftItem[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [schedule, setSchedule] = React.useState<ShiftAssignmentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [name, setName] = React.useState("");
  const [start, setStart] = React.useState("08:00");
  const [end, setEnd] = React.useState("16:00");

  const [shiftId, setShiftId] = React.useState("");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [from, setFrom] = React.useState(today());
  const [to, setTo] = React.useState(today());
  const [weekdaysOnly, setWeekdaysOnly] = React.useState(true);

  const loadAll = React.useCallback(
    () => Promise.all([hropsApi.shifts(), hrmApi.listEmployees({ perPage: 500 }), hropsApi.schedule(period)]),
    [period]
  );

  React.useEffect(() => {
    let alive = true;
    loadAll()
      .then(([s, e, sc]) => {
        if (!alive) return;
        setShifts(s.data || []);
        setEmployees(e.data || []);
        setSchedule(sc.data || []);
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat jadwal.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [loadAll]);

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      const [s, , sc] = await loadAll();
      setShifts(s.data || []);
      setSchedule(sc.data || []);
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const shiftById = (id: string) => shifts.find((s) => s.id === id);
  const cell = (nip: string, day: number) => {
    const date = `${period}-${String(day).padStart(2, "0")}`;
    const a = schedule.find((x) => x.nip === nip && x.date === date);
    return a ? shiftById(a.shiftId) : undefined;
  };
  const dates = datesBetween(from, to, weekdaysOnly);
  const togglePick = (nip: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(nip)) next.delete(nip);
      else next.add(nip);
      return next;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <CalendarClock className="h-6 w-6 text-brand-primary" />
          <span>Jadwal Shift Bulanan</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Buat shift, tetapkan karyawan ke shift per tanggal, dan lihat jadwal sebulan. Jam mulai shift dipakai untuk menilai keterlambatan pada koreksi absensi.
        </p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="text-xs font-bold">Shift baru</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <label className="space-y-1 text-xs font-semibold">Nama<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pagi, Siang, Malam" /></label>
            <label className="space-y-1 text-xs font-semibold">Mulai<Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="space-y-1 text-xs font-semibold">Selesai<Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
            <Button
              size="sm"
              disabled={busy || !name.trim()}
              onClick={() => run(async () => { await hropsApi.createShift({ name, startTime: start, endTime: end }); setName(""); }, "Shift dibuat.")}
              className="h-9 text-xs font-bold"
            >
              Tambah Shift
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {shifts.map((s) => (
              <span key={s.id} className="px-2 py-1 rounded bg-slate-100 text-[11px] font-semibold">{s.name} · {s.startTime}–{s.endTime}</span>
            ))}
            {!loading && shifts.length === 0 && <span className="text-xs text-muted-foreground">Belum ada shift.</span>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="text-xs font-bold">Tetapkan jadwal</div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <label className="space-y-1 text-xs font-semibold">
              Shift
              <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                <option value="">Pilih shift…</option>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">Dari<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="space-y-1 text-xs font-semibold">Sampai<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            <label className="flex items-center gap-2 text-xs font-semibold pb-2">
              <input type="checkbox" checked={weekdaysOnly} onChange={(e) => setWeekdaysOnly(e.target.checked)} /> Hanya Senin–Jumat
            </label>
            <Button
              size="sm"
              disabled={busy || !shiftId || picked.size === 0 || dates.length === 0}
              onClick={() =>
                run(async () => {
                  const r = await hropsApi.assignShifts({ shiftId, nips: [...picked], dates });
                  setNotice(`${r.data.assigned} jadwal ditetapkan.`);
                }, "Jadwal ditetapkan.")
              }
              className="h-9 text-xs font-bold"
            >
              Tetapkan ({picked.size} karyawan × {dates.length} hari)
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 max-h-32 overflow-y-auto">
            {employees.map((e) => (
              <label key={e.id} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={picked.has(e.nip)} onChange={() => togglePick(e.nip)} />
                {e.name} <span className="text-muted-foreground">({e.nip})</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <div className="flex items-center gap-3 px-3 pt-3">
            <span className="text-xs font-bold">Jadwal</span>
            <Input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="h-8 w-40 text-xs" aria-label="Periode jadwal" />
          </div>
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Memuat...</div>
          ) : (
            <table className="text-[11px] mt-2">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white text-left px-3 py-1.5">Karyawan</th>
                  {Array.from({ length: daysInMonth(period) }, (_, i) => (
                    <th key={i} className="px-1.5 py-1.5 font-semibold text-muted-foreground">{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="sticky left-0 bg-white px-3 py-1.5 whitespace-nowrap font-medium">{e.name}</td>
                    {Array.from({ length: daysInMonth(period) }, (_, i) => {
                      const sh = cell(e.nip, i + 1);
                      return (
                        <td key={i} className="px-1 py-1 text-center" title={sh ? `${sh.name} ${sh.startTime}–${sh.endTime}` : undefined}>
                          {sh ? <span className="inline-block rounded bg-brand-tint text-brand-primary px-1 font-bold">{sh.name.slice(0, 1).toUpperCase()}</span> : <span className="text-slate-300">·</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
