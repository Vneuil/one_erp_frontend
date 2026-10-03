"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useNavigationAccess } from "@/providers/navigation-access";
import { useIsOwnDocument } from "@/lib/hooks/use-own-document";
import {
  hropsApi,
  CorrectionItem,
  OvertimeItem,
  ShiftChangeItem,
  ShiftItem,
} from "@/lib/api/hrops";

type Tab = "corrections" | "overtime" | "shifts";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const currentPeriod = () => today().slice(0, 7);
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const hours = (m: number) => `${Math.floor(m / 60)}j ${m % 60}m`;

interface Data {
  corrections: CorrectionItem[];
  overtime: OvertimeItem[];
  shiftChanges: ShiftChangeItem[];
  shifts: ShiftItem[];
  pendingCorrections: CorrectionItem[];
  pendingOvertime: OvertimeItem[];
  pendingShiftChanges: ShiftChangeItem[];
}

const empty: Data = {
  corrections: [],
  overtime: [],
  shiftChanges: [],
  shifts: [],
  pendingCorrections: [],
  pendingOvertime: [],
  pendingShiftChanges: [],
};

export default function EmployeeRequestsPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("hrm");
  const isOwn = useIsOwnDocument();

  const [tab, setTab] = React.useState<Tab>("corrections");
  const [data, setData] = React.useState<Data>(empty);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // forms
  const [cDate, setCDate] = React.useState(today());
  const [cIn, setCIn] = React.useState("08:00");
  const [cOut, setCOut] = React.useState("17:00");
  const [cReason, setCReason] = React.useState("");
  const [oDate, setODate] = React.useState(today());
  const [oMinutes, setOMinutes] = React.useState(60);
  const [oReason, setOReason] = React.useState("");
  const [sDate, setSDate] = React.useState(today());
  const [sShift, setSShift] = React.useState("");
  const [sReason, setSReason] = React.useState("");

  const load = React.useCallback(async (): Promise<Data> => {
    const [c, o, sc, sh] = await Promise.all([
      hropsApi.myCorrections(),
      hropsApi.myOvertime(),
      hropsApi.myShiftChanges(),
      hropsApi.shifts(),
    ]);
    let pc: CorrectionItem[] = [];
    let po: OvertimeItem[] = [];
    let psc: ShiftChangeItem[] = [];
    if (mayApprove) {
      const [a, b, d] = await Promise.all([
        hropsApi.corrections("pending"),
        hropsApi.overtime({ status: "pending" }),
        hropsApi.shiftChanges("pending"),
      ]);
      pc = a.data || [];
      po = b.data || [];
      psc = d.data || [];
    }
    return {
      corrections: c.data || [],
      overtime: o.data || [],
      shiftChanges: sc.data || [],
      shifts: sh.data || [],
      pendingCorrections: pc,
      pendingOvertime: po,
      pendingShiftChanges: psc,
    };
  }, [mayApprove]);

  React.useEffect(() => {
    let alive = true;
    load()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat permintaan.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load]);

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await action();
      setData(await load());
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const shiftName = (id: string) => data.shifts.find((s) => s.id === id)?.name ?? "-";

  const decideButtons = (own: boolean, onDecide: (approve: boolean) => void) =>
    mayApprove && !own ? (
      <div className="flex gap-1.5">
        <Button size="sm" variant="gradient" disabled={busy} onClick={() => onDecide(true)} className="h-7 px-2 text-[11px] font-bold">
          Setujui
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecide(false)} className="h-7 px-2 text-[11px] text-rose-600 border-rose-200">
          Tolak
        </Button>
      </div>
    ) : (
      <span className="text-[11px] text-muted-foreground">{mayApprove ? "Pengajuan Anda sendiri" : "-"}</span>
    );

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs align-top";

  const tabs: { key: Tab; label: string; pending: number }[] = [
    { key: "corrections", label: "Koreksi Absensi", pending: data.pendingCorrections.length },
    { key: "overtime", label: "Lembur", pending: data.pendingOvertime.length },
    { key: "shifts", label: "Ganti Shift", pending: data.pendingShiftChanges.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-brand-primary" />
          <span>Permintaan Karyawan</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Koreksi absensi (backdate), klaim lembur, dan permintaan ganti shift. Persetujuan hanya oleh atasan yang berhak, bukan pemohon sendiri.
        </p>
      </div>

      {error && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
              tab === t.key ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {mayApprove && t.pending > 0 ? ` (${t.pending})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <>
          {tab === "corrections" && (
            <div className="space-y-4">
              <Card className="border-border shadow-2xs">
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                  <label className="space-y-1 text-xs font-semibold">
                    Tanggal
                    <Input type="date" max={today()} value={cDate} onChange={(e) => setCDate(e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-semibold">
                    Jam masuk
                    <Input type="time" value={cIn} onChange={(e) => setCIn(e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-semibold">
                    Jam pulang
                    <Input type="time" value={cOut} onChange={(e) => setCOut(e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-semibold sm:col-span-2">
                    Alasan
                    <Input value={cReason} onChange={(e) => setCReason(e.target.value)} placeholder="Lupa absen, jaringan error..." />
                  </label>
                  <Button
                    size="sm"
                    disabled={busy || !cReason.trim()}
                    onClick={() =>
                      run(async () => {
                        await hropsApi.requestCorrection({ date: cDate, clockIn: cIn, clockOut: cOut || undefined, reason: cReason });
                        setCReason("");
                      }, "Permintaan koreksi terkirim.")
                    }
                    className="h-9 text-xs font-bold"
                  >
                    Ajukan Koreksi
                  </Button>
                </CardContent>
              </Card>

              {mayApprove && (
                <Card className="border-border shadow-2xs">
                  <CardContent className="p-0 overflow-x-auto">
                    <div className="px-3 pt-3 text-xs font-bold">Menunggu persetujuan</div>
                    <table className="w-full">
                      <thead>
                        <tr><th className={th}>Karyawan</th><th className={th}>Tanggal</th><th className={th}>Jam</th><th className={th}>Alasan</th><th className={th}>Aksi</th></tr>
                      </thead>
                      <tbody>
                        {data.pendingCorrections.length === 0 && (
                          <tr><td className={td} colSpan={5}>Tidak ada permintaan.</td></tr>
                        )}
                        {data.pendingCorrections.map((r) => (
                          <tr key={r.id} className="border-t border-border">
                            <td className={td}>{r.employeeName} <span className="text-muted-foreground">({r.nip})</span></td>
                            <td className={td}>{r.date}</td>
                            <td className={td}>{r.clockIn} – {r.clockOut || "--:--"}</td>
                            <td className={td}>{r.reason}</td>
                            <td className={td}>
                              {decideButtons(isOwn(r.requestedByEmail), (a) =>
                                run(() => hropsApi.decideCorrection(r.id, a), a ? "Koreksi disetujui dan absensi diperbarui." : "Koreksi ditolak.")
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border shadow-2xs">
                <CardContent className="p-0 overflow-x-auto">
                  <div className="px-3 pt-3 text-xs font-bold">Pengajuan saya</div>
                  <table className="w-full">
                    <thead>
                      <tr><th className={th}>Tanggal</th><th className={th}>Jam</th><th className={th}>Alasan</th><th className={th}>Status</th></tr>
                    </thead>
                    <tbody>
                      {data.corrections.length === 0 && <tr><td className={td} colSpan={4}>Belum ada pengajuan.</td></tr>}
                      {data.corrections.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className={td}>{r.date}</td>
                          <td className={td}>{r.clockIn} – {r.clockOut || "--:--"}</td>
                          <td className={td}>{r.reason}</td>
                          <td className={td}><StatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "overtime" && (
            <div className="space-y-4">
              <Card className="border-border shadow-2xs">
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                  <label className="space-y-1 text-xs font-semibold">
                    Tanggal
                    <Input type="date" max={today()} value={oDate} onChange={(e) => setODate(e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-semibold">
                    Durasi (menit)
                    <Input type="number" min={1} max={720} value={oMinutes} onChange={(e) => setOMinutes(Number(e.target.value))} />
                  </label>
                  <label className="space-y-1 text-xs font-semibold sm:col-span-2">
                    Keterangan
                    <Input value={oReason} onChange={(e) => setOReason(e.target.value)} placeholder="Pekerjaan yang diselesaikan" />
                  </label>
                  <Button
                    size="sm"
                    disabled={busy || oMinutes <= 0}
                    onClick={() =>
                      run(async () => {
                        await hropsApi.requestOvertime({ date: oDate, minutes: oMinutes, reason: oReason });
                        setOReason("");
                      }, "Lembur diajukan.")
                    }
                    className="h-9 text-xs font-bold"
                  >
                    Ajukan Lembur
                  </Button>
                </CardContent>
              </Card>

              {mayApprove && (
                <Card className="border-border shadow-2xs">
                  <CardContent className="p-0 overflow-x-auto">
                    <div className="flex items-center justify-between px-3 pt-3">
                      <span className="text-xs font-bold">Menunggu persetujuan</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const r = await hropsApi.detectOvertime(currentPeriod());
                            setNotice(`${r.data.created} lembur baru terdeteksi dari absensi bulan ini.`);
                          }, "Deteksi lembur selesai.")
                        }
                        className="h-7 text-[11px] font-bold"
                      >
                        Deteksi dari Absensi (bulan ini)
                      </Button>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr><th className={th}>Karyawan</th><th className={th}>Tanggal</th><th className={th}>Durasi</th><th className={th}>Sumber</th><th className={th}>Aksi</th></tr>
                      </thead>
                      <tbody>
                        {data.pendingOvertime.length === 0 && <tr><td className={td} colSpan={5}>Tidak ada lembur menunggu.</td></tr>}
                        {data.pendingOvertime.map((r) => (
                          <tr key={r.id} className="border-t border-border">
                            <td className={td}>{r.employeeName} <span className="text-muted-foreground">({r.nip})</span></td>
                            <td className={td}>{r.date}</td>
                            <td className={td}>{hours(r.minutes)}</td>
                            <td className={td}>{r.source === "auto" ? "Terdeteksi" : "Klaim"}</td>
                            <td className={td}>
                              {decideButtons(isOwn(r.requestedByEmail), (a) =>
                                run(() => hropsApi.decideOvertime(r.id, a), a ? "Lembur disetujui; masuk perhitungan payroll." : "Lembur ditolak.")
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border shadow-2xs">
                <CardContent className="p-0 overflow-x-auto">
                  <div className="px-3 pt-3 text-xs font-bold">Lembur saya</div>
                  <table className="w-full">
                    <thead>
                      <tr><th className={th}>Tanggal</th><th className={th}>Durasi</th><th className={th}>Sumber</th><th className={th}>Status</th></tr>
                    </thead>
                    <tbody>
                      {data.overtime.length === 0 && <tr><td className={td} colSpan={4}>Belum ada catatan lembur.</td></tr>}
                      {data.overtime.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className={td}>{r.date}</td>
                          <td className={td}>{hours(r.minutes)}</td>
                          <td className={td}>{r.source === "auto" ? "Terdeteksi" : "Klaim"}</td>
                          <td className={td}><StatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "shifts" && (
            <div className="space-y-4">
              <Card className="border-border shadow-2xs">
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                  <label className="space-y-1 text-xs font-semibold">
                    Tanggal
                    <Input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-semibold">
                    Pindah ke shift
                    <select
                      value={sShift}
                      onChange={(e) => setSShift(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Pilih shift…</option>
                      {data.shifts.filter((s) => s.isActive).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.startTime}–{s.endTime})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-semibold sm:col-span-2">
                    Alasan
                    <Input value={sReason} onChange={(e) => setSReason(e.target.value)} />
                  </label>
                  <Button
                    size="sm"
                    disabled={busy || !sShift}
                    onClick={() =>
                      run(async () => {
                        await hropsApi.requestShiftChange({ date: sDate, toShiftId: sShift, reason: sReason });
                        setSReason("");
                      }, "Permintaan ganti shift terkirim.")
                    }
                    className="h-9 text-xs font-bold"
                  >
                    Ajukan
                  </Button>
                </CardContent>
              </Card>
              {data.shifts.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada shift. HR membuatnya di halaman Jadwal Shift.</p>
              )}

              {mayApprove && (
                <Card className="border-border shadow-2xs">
                  <CardContent className="p-0 overflow-x-auto">
                    <div className="px-3 pt-3 text-xs font-bold">Menunggu persetujuan</div>
                    <table className="w-full">
                      <thead>
                        <tr><th className={th}>Karyawan</th><th className={th}>Tanggal</th><th className={th}>Shift tujuan</th><th className={th}>Alasan</th><th className={th}>Aksi</th></tr>
                      </thead>
                      <tbody>
                        {data.pendingShiftChanges.length === 0 && <tr><td className={td} colSpan={5}>Tidak ada permintaan.</td></tr>}
                        {data.pendingShiftChanges.map((r) => (
                          <tr key={r.id} className="border-t border-border">
                            <td className={td}>{r.employeeName} <span className="text-muted-foreground">({r.nip})</span></td>
                            <td className={td}>{r.date}</td>
                            <td className={td}>{shiftName(r.toShiftId)}</td>
                            <td className={td}>{r.reason}</td>
                            <td className={td}>
                              {decideButtons(isOwn(r.requestedByEmail), (a) =>
                                run(() => hropsApi.decideShiftChange(r.id, a), a ? "Perubahan shift disetujui dan jadwal diperbarui." : "Permintaan ditolak.")
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border shadow-2xs">
                <CardContent className="p-0 overflow-x-auto">
                  <div className="px-3 pt-3 text-xs font-bold">Permintaan saya</div>
                  <table className="w-full">
                    <thead>
                      <tr><th className={th}>Tanggal</th><th className={th}>Shift tujuan</th><th className={th}>Alasan</th><th className={th}>Status</th></tr>
                    </thead>
                    <tbody>
                      {data.shiftChanges.length === 0 && <tr><td className={td} colSpan={4}>Belum ada permintaan.</td></tr>}
                      {data.shiftChanges.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className={td}>{r.date}</td>
                          <td className={td}>{shiftName(r.toShiftId)}</td>
                          <td className={td}>{r.reason}</td>
                          <td className={td}><StatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
