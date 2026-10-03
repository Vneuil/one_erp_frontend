"use client";

import * as React from "react";
import {
  Clock,
  MapPin,
  Calendar,
  Download,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/utils/csv";
import { hrmApi, AttendanceItem as ApiAtt, EmployeeItem, AttendanceLocationItem } from "@/lib/api/hrm";
import { hropsApi } from "@/lib/api/hrops";
import { useAppStore } from "@/stores/app-store";

interface AttendanceRecord {
  id: string;
  nip: string;
  name: string;
  department: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  location: string;
  method: string;
  status: string;
  workMinutes: number;
}

/** Today's date (YYYY-MM-DD) in Jakarta time, matching how the backend dates attendance. */
function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function formatWorkTime(minutes: number): string {
  if (minutes <= 0) return "-";
  return `${Math.floor(minutes / 60)} j ${minutes % 60} m`;
}

/** Device coordinates, or null when unavailable/denied (the backend then decides whether that is acceptable). */
function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function SmartAttendancePage() {
  const { currentUser } = useAppStore();
  const [records, setRecords] = React.useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [locations, setLocations] = React.useState<AttendanceLocationItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBusy, setIsBusy] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = React.useCallback(
    () =>
      Promise.all([
        hrmApi.listAttendance({ perPage: 200 }),
        hrmApi.listEmployees({ perPage: 500 }),
        hrmApi.listAttendanceLocations(),
      ])
        .then(([attRes, empRes, locRes]) => {
          const emps = empRes.data || [];
          const deptByNip = new Map(emps.map((e) => [e.nip, e.department]));
          setEmployees(emps);
          setLocations((locRes.data || []).filter((l) => l.isActive));
          setRecords(
            (attRes.data || []).map((a: ApiAtt) => ({
              id: a.id,
              nip: a.nip,
              name: a.employeeName,
              department: deptByNip.get(a.nip) || "-",
              date: a.date,
              clockIn: a.clockIn,
              clockOut: a.clockOut && a.clockOut !== "--:--" ? a.clockOut : null,
              location: a.location,
              method: a.method || "GPS Mobile",
              status: a.status || "On Time",
              workMinutes: a.workMinutes ?? 0,
            }))
          );
          setLoadError(null);
        })
        .catch((err) => {
          console.error("Failed to load attendance", err);
          setLoadError("Gagal memuat data absensi dari server.");
        })
        .finally(() => setIsLoading(false)),
    []
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const today = todayInJakarta();
  const me = employees.find((e) => e.email && e.email.toLowerCase() === (currentUser.email || "").toLowerCase());
  const myToday = me ? records.find((r) => r.nip === me.nip && r.date === today) : undefined;
  const canClockIn = !!me && !myToday;
  const canClockOut = !!myToday && !myToday.clockOut;

  const todays = records.filter((r) => r.date === today);
  const activeEmployees = employees.filter((e) => e.status === "Active").length;
  const lateToday = todays.filter((r) => r.status === "Late").length;
  const clockedOutToday = todays.filter((r) => r.clockOut).length;
  const attendanceRate = activeEmployees > 0 ? Math.round((todays.length / activeEmployees) * 1000) / 10 : 0;

  const handleClock = async () => {
    if (!me || isBusy) return;
    setIsBusy(true);
    setNotice(null);
    try {
      const pos = await getPosition();
      const coords = pos ? { latitude: pos.lat, longitude: pos.lng } : {};
      if (canClockIn) {
        const res = await hrmApi.clockIn({ employeeName: me.name, nip: me.nip, method: "GPS Mobile", ...coords });
        setNotice({ kind: "success", text: `Clock In tercatat pukul ${res.data?.clockIn ?? ""}.` });
      } else if (canClockOut) {
        const res = await hrmApi.clockOut({ nip: me.nip, ...coords });
        setNotice({ kind: "success", text: `Clock Out tercatat pukul ${res.data?.clockOut ?? ""}.` });
      }
      await load();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Gagal mencatat presensi." });
    } finally {
      setIsBusy(false);
    }
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      key: "name",
      header: "Nama & NIP",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.name}</div>
          <div className="text-[11px] text-muted-foreground font-mono">{row.nip} • {row.department}</div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Tanggal & Jam Presensi",
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-semibold text-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{row.date}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Masuk: <strong className="text-emerald-700">{row.clockIn}</strong> | Pulang: <strong>{row.clockOut || "--:--"}</strong>{row.workMinutes > 0 ? <> | Durasi: <strong>{formatWorkTime(row.workMinutes)}</strong></> : null}
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Lokasi & Geofence",
      render: (row) => (
        <div className="text-xs flex items-center gap-1.5 text-slate-700">
          <MapPin className="h-3.5 w-3.5 text-brand-primary shrink-0" />
          <span>{row.location}</span>
        </div>
      ),
    },
    {
      key: "method",
      header: "Metode Terminal",
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
          {row.method}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status Kehadiran",
      render: (row) => {
        const styles: Record<string, string> = {
          "On Time": "bg-emerald-50 text-emerald-700 border-emerald-200",
          Late: "bg-rose-50 text-rose-700 border-rose-200",
          Overtime: "bg-purple-50 text-brand-indigo border-purple-200",
          Leave: "bg-amber-50 text-amber-700 border-amber-200",
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[row.status] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>
            {row.status}
          </span>
        );
      },
    },
  ];

  const handleSummaryExport = async () => {
    const period = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()).slice(0, 7);
    setNotice(null);
    try {
      const res = await hropsApi.downloadAttendanceSummary(period);
      if (!("blob" in res)) throw new Error("Server tidak mengirim file CSV.");
      const url = URL.createObjectURL(res.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename || `attendance-summary-${period}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Gagal mengekspor ringkasan." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-brand-primary" />
            <span>Smart Attendance & Lokasi Presensi GPS</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Presensi digital berbasis Geofence GPS, integrasi terminal NFC/Face, jam shift kerja, dan validasi lembur.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "attendance-monthly-recap.csv",
              ["NIP", "Nama", "Departemen", "Tanggal", "Clock In", "Clock Out", "Lokasi", "Metode", "Status"],
              records.map((r) => [r.nip, r.name, r.department, r.date, r.clockIn, r.clockOut || "-", r.location, r.method, r.status])
            )
          }
          className="h-9 gap-1.5 text-xs border-border"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Ekspor Rekap Absensi</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleSummaryExport} className="h-9 gap-1.5 text-xs border-border">
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Ringkasan Bulan Ini (CSV)</span>
        </Button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {/* Clock In / Out Live Widget */}
      <div className="bg-gradient-to-r from-brand-tint via-purple-50 to-white rounded-2xl border border-brand-indigo/30 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-brand-dark flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-emerald-600" />
            <span>
              {locations.length > 0
                ? `Area presensi: ${locations.map((l) => `${l.name} (radius ${l.radiusMeters} m)`).join(", ")}`
                : "Area presensi belum dikonfigurasi — lokasi tidak divalidasi"}
            </span>
          </span>
          <p className="text-xs text-muted-foreground">
            {!me && !isLoading
              ? "Akun Anda belum terhubung ke data karyawan (email tidak cocok), jadi presensi tidak bisa dicatat."
              : myToday
                ? myToday.clockOut
                  ? `Presensi hari ini selesai: masuk ${myToday.clockIn}, pulang ${myToday.clockOut}.`
                  : `Sudah Clock In pukul ${myToday.clockIn} (${myToday.status}).`
                : "Belum Clock In hari ini. Jam masuk 09:00 WIB."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={canClockOut ? "outline" : "gradient"}
            size="lg"
            onClick={handleClock}
            disabled={isBusy || (!canClockIn && !canClockOut)}
            className={`h-11 px-6 text-xs font-bold gap-2 ${
              canClockOut
                ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                : "shadow-md shadow-purple-500/20"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>
              {isBusy
                ? "Memproses..."
                : canClockOut
                  ? "Clock Out (Pulang Kantor)"
                  : myToday
                    ? "Presensi Selesai"
                    : "Clock In Sekarang"}
            </span>
          </Button>
        </div>
      </div>

      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`px-3 py-2 rounded-lg border text-xs font-medium ${
            notice.kind === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Tingkat Kehadiran Hari Ini</span>
            <div className="text-2xl font-black text-emerald-600">{attendanceRate}%</div>
            <span className="text-[11px] text-muted-foreground">
              {todays.length} dari {activeEmployees} karyawan aktif hadir
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Keterlambatan (Late)</span>
            <div className="text-2xl font-black text-amber-600">{lateToday} Orang</div>
            <span className="text-[11px] text-muted-foreground">Clock In pukul 09:00 WIB atau lebih</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Sudah Clock Out</span>
            <div className="text-2xl font-black text-foreground">{clockedOutToday} Orang</div>
            <span className="text-[11px] text-muted-foreground">{todays.length - clockedOutToday} masih bekerja</span>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={records} columns={columns} />
        )}
      </div>
    </div>
  );
}
