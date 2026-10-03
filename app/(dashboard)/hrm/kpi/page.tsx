"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import {
  Award,
  Plus,
  Download,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { downloadCsv } from "@/lib/utils/csv";
import { kpiApi, KpiReviewItem as ApiKpiReviewItem } from "@/lib/api/kpi";
import { hrmApi, EmployeeItem } from "@/lib/api/hrm";

interface KpiReviewItem {
  id: string;
  name: string;
  department: string;
  period: string;
  targetScore: number;
  actualScore: number;
  weightFormula: string;
  grade: "A" | "B" | "C" | "D";
  status: "Finalized" | "In Review" | "Draft";
  evaluator: string;
}

const gradeLabels: Record<KpiReviewItem["grade"], string> = {
  A: "A (Outstanding)",
  B: "B (Exceeds Target)",
  C: "C (Meets Target)",
  D: "D (Needs Improvement)",
};

const toUiStatus = (status: string): KpiReviewItem["status"] => {
  if (status === "finalized") return "Finalized";
  if (status === "in_review") return "In Review";
  return "Draft";
};

const toBackendStatus = (status: KpiReviewItem["status"]): string => {
  if (status === "Finalized") return "finalized";
  if (status === "In Review") return "in_review";
  return "draft";
};

const nextStatus: Record<KpiReviewItem["status"], KpiReviewItem["status"] | null> = {
  Draft: "In Review",
  "In Review": "Finalized",
  Finalized: null,
};

const mapKpi = (k: ApiKpiReviewItem): KpiReviewItem => ({
  id: k.id,
  name: k.employeeName,
  department: k.department,
  period: k.period,
  targetScore: k.targetScore,
  actualScore: k.actualScore,
  weightFormula: k.weightFormula,
  grade: (["A", "B", "C", "D"].includes(k.grade) ? k.grade : "D") as KpiReviewItem["grade"],
  status: toUiStatus(k.status),
  evaluator: k.evaluator,
});

export default function KpiReviewsPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("hrm");
  const [data, setData] = React.useState<KpiReviewItem[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [period, setPeriod] = React.useState("");
  const [targetScore, setTargetScore] = React.useState(85);
  const [actualScore, setActualScore] = React.useState(0);
  const [weightFormula, setWeightFormula] = React.useState("");
  const [evaluator, setEvaluator] = React.useState("");
  const [actioningId, setActioningId] = React.useState<string | null>(null);

  React.useEffect(() => {
    kpiApi
      .listKpiReviews()
      .then((res) => {
        setData((res.data || []).map(mapKpi));
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load KPI reviews", err);
        setLoadError("Gagal memuat data KPI dari server.");
      })
      .finally(() => setIsLoading(false));

    hrmApi
      .listEmployees({ perPage: 200 })
      .then((res) => setEmployees(res.data || []))
      .catch((err) => console.error("Failed to load employees", err));
  }, []);

  const handleCreateKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !period) return;
    setFormError(null);

    try {
      const res = await kpiApi.createKpiReview({
        employeeName: name,
        department,
        period,
        targetScore: Number(targetScore) || 0,
        actualScore: Number(actualScore) || 0,
        weightFormula,
        evaluator,
      });
      setData((prev) => [mapKpi(res.data), ...prev]);
      setIsNewOpen(false);
      setName("");
      setDepartment("");
      setPeriod("");
      setTargetScore(85);
      setActualScore(0);
      setWeightFormula("");
      setEvaluator("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat KPI review.");
    }
  };

  const handleAdvanceStatus = async (row: KpiReviewItem) => {
    const target = nextStatus[row.status];
    if (!target) return;

    setActioningId(row.id);
    setNotice(null);
    try {
      const res = await kpiApi.updateKpiStatus(row.id, { status: toBackendStatus(target) });
      setData((prev) => prev.map((d) => (d.id === row.id ? mapKpi(res.data) : d)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal mengubah status KPI.");
    } finally {
      setActioningId(null);
    }
  };

  const finalized = data.filter((d) => d.status === "Finalized");

  const columns: Column<KpiReviewItem>[] = [
    {
      key: "name",
      header: "Karyawan & Divisi",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.name}</div>
          <div className="text-[11px] text-muted-foreground">{row.department}</div>
        </div>
      ),
    },
    {
      key: "period",
      header: "Periode Review",
      render: (row) => (
        <span className="font-semibold text-xs text-foreground font-mono">{row.period}</span>
      ),
    },
    {
      key: "weightFormula",
      header: "Bobot & Indikator Penilaian",
      render: (row) => (
        <span className="text-xs text-muted-foreground max-w-sm truncate block">
          {row.weightFormula}
        </span>
      ),
    },
    {
      key: "actualScore",
      header: "Skor Capaian",
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-black text-brand-dark">{row.actualScore} / 100</div>
          <div className="text-[10px] text-muted-foreground">Target: {row.targetScore}</div>
        </div>
      ),
    },
    {
      key: "grade",
      header: "Predikat Kinerja",
      render: (row) => {
        const styles: Record<KpiReviewItem["grade"], string> = {
          A: "bg-emerald-50 text-emerald-700 border-emerald-200",
          B: "bg-blue-50 text-blue-700 border-blue-200",
          C: "bg-purple-50 text-brand-indigo border-purple-200",
          D: "bg-amber-50 text-amber-700 border-amber-200",
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[row.grade]}`}>
            {gradeLabels[row.grade]}
          </span>
        );
      },
    },
    {
      key: "evaluator",
      header: "Penilai (Evaluator)",
      render: (row) => (
        <span className="text-xs font-medium text-foreground">{row.evaluator}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const styles: Record<KpiReviewItem["status"], string> = {
          Draft: "bg-slate-50 text-slate-600 border-slate-200",
          "In Review": "bg-amber-50 text-amber-700 border-amber-200",
          Finalized: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
        const target = nextStatus[row.status];
        return (
          <div className="flex items-center gap-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[row.status]}`}>
              {row.status}
            </span>
            {target && mayApprove && (
              <Button
                size="sm"
                variant="outline"
                disabled={actioningId === row.id}
                onClick={() => handleAdvanceStatus(row)}
                className="h-7 px-2 text-[11px] font-bold"
              >
                {target === "In Review" ? "Mulai Review" : "Finalisasi"}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-brand-primary" />
            <span>Evaluasi Kinerja 360° & Target KPI/OKR</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Template KPI individual, bobot formula capaian target, penilaian kinerja multi-level, dan bonus insentif.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setIsNewOpen(true)}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Buat KPI Review Baru</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                "kpi-evaluation-recap.csv",
                ["ID", "Nama", "Departemen", "Periode", "Target", "Aktual", "Grade", "Status", "Evaluator"],
                data.map((d) => [d.id, d.name, d.department, d.period, d.targetScore, d.actualScore, d.grade, d.status, d.evaluator])
              )
            }
            className="h-9 gap-1.5 text-xs border-border"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Ekspor Rapor KPI</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards (computed from the reviews below) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Rata-Rata Skor Kinerja (Finalized)</span>
            <div className="text-2xl font-black text-brand-dark">
              {finalized.length ? (finalized.reduce((s, d) => s + d.actualScore, 0) / finalized.length).toFixed(1) : "-"} / 100
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Dari {finalized.length} review yang sudah final
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Predikat Outstanding (A)</span>
            <div className="text-2xl font-black text-emerald-600">
              {finalized.filter((d) => d.grade === "A").length} dari {finalized.length} Review
            </div>
            <span className="text-[11px] text-muted-foreground">Hanya review Finalized yang dihitung</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Status Evaluasi</span>
            <div className="text-2xl font-black text-brand-indigo">
              {data.filter((d) => d.status !== "Finalized").length} Belum Final
            </div>
            <span className="text-[11px] text-muted-foreground">
              {data.filter((d) => d.status === "Draft").length} Draft • {data.filter((d) => d.status === "In Review").length} In Review
            </span>
          </CardContent>
        </Card>
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

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={data} columns={columns} />
        )}
      </div>

      {/* Modal Buat KPI Review */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Buat KPI Review Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateKpi} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Karyawan *</label>
              <select
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDepartment(employees.find((emp) => emp.name === e.target.value)?.department || "");
                }}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih karyawan...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} — {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Departemen</label>
                <Input value={department} readOnly className="h-9 text-xs bg-slate-50" />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Periode (mis. 2026-Q3) *</label>
                <Input value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 text-xs" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Target Score</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={targetScore}
                  onChange={(e) => setTargetScore(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Actual Score</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={actualScore}
                  onChange={(e) => setActualScore(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Bobot & Formula Penilaian</label>
              <textarea
                rows={2}
                placeholder="mis. Revenue (40%) + Operational Uptime (30%) + Strategy (30%)"
                value={weightFormula}
                onChange={(e) => setWeightFormula(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-border bg-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Evaluator</label>
              <Input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} className="h-9 text-xs" />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Simpan Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
