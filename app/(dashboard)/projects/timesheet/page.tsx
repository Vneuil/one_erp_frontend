"use client";

import * as React from "react";
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Download,
  Calendar,
  UserCheck,
  Building,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/utils/csv";
import { projectsApi } from "@/lib/api/projects";
import { useAppStore } from "@/stores/app-store";
import { timeEntriesApi, TimeEntryItem as ApiTimeEntry } from "@/lib/api/projects";

interface TimesheetEntry {
  id: string;
  projectCode: string;
  projectName: string;
  taskTitle: string;
  workerName: string;
  date: string;
  durationMinutes: number;
  hourlyRate: number;
  isBillable: boolean;
}

const mapEntry = (e: ApiTimeEntry): TimesheetEntry => ({
  id: e.id,
  projectCode: e.projectCode,
  projectName: e.projectCode,
  taskTitle: e.taskTitle,
  workerName: e.workerName,
  date: e.date,
  durationMinutes: e.durationMinutes,
  hourlyRate: e.hourlyRate,
  isBillable: e.isBillable,
});

export default function TimesheetPage() {
  const { currentUser } = useAppStore();
  const [entries, setEntries] = React.useState<TimesheetEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [projectOptions, setProjectOptions] = React.useState<{ code: string; name: string }[]>([]);
  const [hourlyRate, setHourlyRate] = React.useState(0);

  React.useEffect(() => {
    timeEntriesApi
      .list()
      .then((res) => {
        setEntries((res.data || []).map(mapEntry));
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load time entries", err);
        setLoadError("Gagal memuat data timesheet dari server.");
      })
      .finally(() => setIsLoading(false));
    projectsApi
      .list()
      .then((res) => setProjectOptions((res.data || []).map((p) => ({ code: p.code, name: p.name }))))
      .catch((err) => console.error("Failed to load projects", err));
  }, []);

  const handleExportExcel = () => {
    downloadCsv(
      "timesheet-log.csv",
      ["Project Code", "Project Name", "Task", "Worker", "Date", "Duration (min)", "Hourly Rate", "Billable"],
      entries.map((e) => [
        e.projectCode,
        e.projectName,
        e.taskTitle,
        e.workerName,
        e.date,
        e.durationMinutes,
        e.hourlyRate,
        e.isBillable ? "Yes" : "No",
      ])
    );
  };

  // Live Timer State
  const [isRunning, setIsRunning] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [currentTask, setCurrentTask] = React.useState("");
  const [currentProject, setCurrentProject] = React.useState("");

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSaveTimer = async () => {
    if (seconds < 10) return;
    if (!currentProject || !currentTask.trim()) {
      setNotice("Pilih proyek dan isi deskripsi aktivitas sebelum menyimpan log.");
      return;
    }
    setNotice(null);
    const durationMins = Math.max(1, Math.round(seconds / 60));
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

    try {
      const res = await timeEntriesApi.create({
        projectCode: currentProject,
        taskTitle: currentTask.trim(),
        workerName: currentUser.name,
        date,
        durationMinutes: durationMins,
        // The rate feeds the project's actual cost, so it is entered, never assumed.
        hourlyRate: Number(hourlyRate) || 0,
        isBillable: true,
      });
      if (res.data) {
        setEntries((prev) => [mapEntry(res.data), ...prev]);
      }
      setIsRunning(false);
      setSeconds(0);
    } catch (err) {
      // Keep the timer running/paused with its elapsed time so nothing is lost.
      setNotice(err instanceof Error ? err.message : "Gagal menyimpan log waktu.");
    }
  };

  const totalMinutes = entries.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalBillableHours = (totalMinutes / 60).toFixed(1);
  const totalCost = entries.reduce((acc, curr) => acc + (curr.durationMinutes / 60) * curr.hourlyRate, 0);

  const columns: Column<TimesheetEntry>[] = [
    {
      key: "id",
      header: "ID & Tanggal",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.id}</span>
          <div className="text-[11px] text-muted-foreground">{row.date}</div>
        </div>
      ),
    },
    {
      key: "taskTitle",
      header: "Pekerjaan & Proyek",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.taskTitle}</div>
          <div className="text-[11px] text-brand-indigo font-medium">{row.projectCode} • {row.projectName}</div>
        </div>
      ),
    },
    {
      key: "workerName",
      header: "Personil",
      render: (row) => (
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-brand-primary" />
          {row.workerName}
        </span>
      ),
    },
    {
      key: "durationMinutes",
      header: "Durasi Waktu",
      render: (row) => {
        const h = Math.floor(row.durationMinutes / 60);
        const m = row.durationMinutes % 60;
        return (
          <span className="text-xs font-bold text-foreground font-mono bg-slate-100 px-2 py-0.5 rounded">
            {h > 0 ? `${h} jam ` : ""}{m} menit
          </span>
        );
      },
    },
    {
      key: "hourlyRate",
      header: "Kalkulasi Biaya Billing",
      render: (row) => {
        const total = (row.durationMinutes / 60) * row.hourlyRate;
        return (
          <div className="text-xs font-bold text-foreground">
            Rp {Math.round(total).toLocaleString("id-ID")}
            <div className="text-[10px] text-muted-foreground font-normal">
              @ Rp {row.hourlyRate.toLocaleString("id-ID")}/jam
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-brand-primary" />
            <span>Timesheet & Pencatatan Waktu Kerja</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Timer aktivitas pekerjaan proyek secara real-time, perhitungan jam kerja personil, dan billing report.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          className="h-9 gap-1.5 text-xs border-border"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Ekspor Timesheet</span>
        </Button>
      </div>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      {notice && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {notice}
        </div>
      )}
      {isLoading && <div className="py-6 text-center text-xs text-muted-foreground">Memuat data...</div>}

      {/* Live Timer Interactive Box */}
      <div className="bg-gradient-to-r from-brand-tint via-purple-50 to-white rounded-2xl border border-brand-indigo/30 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-dark flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${isRunning ? "bg-emerald-500 animate-ping" : "bg-slate-400"}`} />
              Live Activity Tracker
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              value={currentTask}
              onChange={(e) => setCurrentTask(e.target.value)}
              placeholder="Deskripsi aktivitas yang sedang dikerjakan..."
              className="h-9 text-xs bg-white"
            />
            <select
              value={currentProject}
              onChange={(e) => setCurrentProject(e.target.value)}
              className="h-9 px-2 rounded-lg border border-border bg-white text-xs"
            >
              <option value="">Pilih proyek...</option>
              {projectOptions.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={0}
              value={hourlyRate || ""}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              placeholder="Tarif per jam (Rp)"
              className="h-9 text-xs bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="font-mono text-3xl font-black text-foreground bg-white px-4 py-2 rounded-xl border border-border shadow-2xs">
            {formatTimer(seconds)}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isRunning ? (
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setIsRunning(true)}
                className="h-10 px-4 text-xs font-bold gap-1.5"
              >
                <Play className="h-4 w-4" /> Start Timer
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRunning(false)}
                className="h-10 px-4 text-xs font-bold gap-1.5 border-amber-300 text-amber-800 bg-amber-50"
              >
                <Pause className="h-4 w-4" /> Pause
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveTimer}
              disabled={seconds < 5}
              className="h-10 px-3 text-xs font-semibold"
            >
              Simpan Log
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Jam Kerja Terakumulasi</span>
            <div className="text-2xl font-black text-brand-dark">{totalBillableHours} Jam</div>
            <span className="text-[11px] text-muted-foreground">{entries.length} Sesi Tercatat</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Nilai Billing Jam Kerja</span>
            <div className="text-2xl font-black text-brand-indigo">
              Rp {Math.round(totalCost).toLocaleString("id-ID")}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">Siap Ditagihkan ke Klien</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Rata-Rata Efisiensi Billing</span>
            <div className="text-2xl font-black text-emerald-600">100% Billable</div>
            <span className="text-[11px] text-muted-foreground">Semua tercakup dalam kontrak RAB</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Timesheet Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <DataTable data={entries} columns={columns} />
      </div>
    </div>
  );
}
