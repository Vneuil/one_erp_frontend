"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Users,
  Briefcase,
  CheckCircle2,
  Calendar,
  Building,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { recruitmentApi } from "@/lib/api/recruitment";

interface JobOpening {
  id: string;
  title: string;
  department: string;
  openings: number;
  postedDate: string;
}

interface CandidateApplicant {
  id: string;
  name: string;
  appliedPosition: string;
  department: string;
  stage: "Applied" | "Screening" | "Interview" | "Offering" | "Hired" | "Rejected";
  appliedDate: string;
  // Not tracked by the backend candidate record yet - shown as "-" rather
  // than invented, never backfilled from a mock/demo array.
  experienceYears?: number;
  expectedSalary?: string;
  interviewer?: string;
}

const stageToBackend: Record<CandidateApplicant["stage"], string> = {
  Applied: "applied",
  Screening: "screening",
  Interview: "interview",
  Offering: "offer",
  Hired: "hired",
  Rejected: "rejected",
};

const stageFromBackend: Record<string, CandidateApplicant["stage"]> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offering",
  hired: "Hired",
  rejected: "Rejected",
};

export default function RecruitmentPage() {
  const { canApprove } = useNavigationAccess();
  const mayHire = canApprove("recruitment");
  const [applicants, setApplicants] = React.useState<CandidateApplicant[]>([]);
  const [jobOpenings, setJobOpenings] = React.useState<JobOpening[]>([]);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [openings, setOpenings] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    recruitmentApi
      .listVacancies()
      .then((res) => {
        const vacancies = res.data || [];
        setJobOpenings(
          vacancies.map((v) => ({
            id: v.id,
            title: v.title,
            department: v.department,
            openings: v.openingsCount,
            postedDate: v.postedDate,
          }))
        );

        const vacancyById = new Map(vacancies.map((v) => [v.id, v]));

        recruitmentApi
          .listCandidates()
          .then((cres) => {
            setApplicants(
              (cres.data || []).map((c) => {
                const vacancy = vacancyById.get(c.jobVacancyId);
                return {
                  id: c.id,
                  name: c.name,
                  appliedPosition: vacancy?.title ?? "-",
                  department: vacancy?.department ?? "-",
                  stage: stageFromBackend[c.stage] ?? "Applied",
                  appliedDate: c.appliedDate,
                };
              })
            );
          })
          .catch((err) => {
            console.error("Failed to load candidates", err);
            setLoadError("Gagal memuat data kandidat dari server.");
          });
      })
      .catch((err) => {
        console.error("Failed to load job vacancies", err);
        setLoadError("Gagal memuat lowongan dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !department) return;
    setFormError(null);
    try {
      const res = await recruitmentApi.createVacancy({ title, department, openingsCount: openings });
      if (res.data) {
        const v = res.data;
        setJobOpenings((prev) => [
          { id: v.id, title: v.title, department: v.department, openings: v.openingsCount, postedDate: v.postedDate },
          ...prev,
        ]);
      }
      setIsNewOpen(false);
      setTitle("");
      setDepartment("");
      setOpenings(1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan lowongan.");
    }
  };

  // The stage changes only after the server accepts it; hiring in particular
  // creates the employee record, so a failure must never look like a hire.
  const moveStage = async (id: string, next: CandidateApplicant["stage"]) => {
    setNotice(null);
    try {
      await recruitmentApi.advanceStage(id, { stage: stageToBackend[next] });
      setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, stage: next } : a)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal memperbarui tahap kandidat.");
    }
  };

  const columns: Column<CandidateApplicant>[] = [
    {
      key: "name",
      header: "Kandidat Pelamar",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.name}</div>
          <div className="text-[11px] text-muted-foreground font-mono">
            CAND-{row.id.slice(0, 8).toUpperCase()}{row.experienceYears ? ` • ${row.experienceYears} thn exp` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "appliedPosition",
      header: "Posisi yang Dilamar",
      render: (row) => (
        <div>
          <span className="font-semibold text-xs text-foreground">{row.appliedPosition}</span>
          <div className="text-[11px] text-brand-indigo font-medium">{row.department}</div>
        </div>
      ),
    },
    {
      key: "expectedSalary",
      header: "Ekspektasi Gaji",
      render: (row) => <span className="font-mono text-xs">{row.expectedSalary ?? "-"}</span>,
    },
    {
      key: "stage",
      header: "Tahapan Rekrutmen",
      render: (row) => {
        const styles: Record<string, string> = {
          Applied: "bg-slate-100 text-slate-800 border-slate-200",
          Screening: "bg-blue-50 text-blue-700 border-blue-200",
          Interview: "bg-purple-50 text-brand-indigo border-purple-200",
          Offering: "bg-amber-50 text-amber-700 border-amber-200",
          Hired: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
          Rejected: "bg-rose-50 text-rose-700 border-rose-200",
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[row.stage]}`}>
            {row.stage}
          </span>
        );
      },
    },
    {
      key: "interviewer",
      header: "Pewawancara",
      render: (row) => <span className="text-xs text-foreground">{row.interviewer ?? "-"}</span>,
    },
    {
      key: "id",
      header: "Proses",
      render: (row) => {
        if (row.stage === "Interview") {
          return (
            <Button
              size="sm"
              variant="gradient"
              onClick={() => moveStage(row.id, "Offering")}
              className="h-7 px-2 text-[11px] font-bold"
            >
              Kirim Offering
            </Button>
          );
        } else if (row.stage === "Offering" && mayHire) {
          return (
            <Button
              size="sm"
              variant="gradient"
              onClick={() => moveStage(row.id, "Hired")}
              className="h-7 px-2 text-[11px] font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300"
            >
              Terima (Hired)
            </Button>
          );
        }
        return <span className="text-[11px] text-muted-foreground">Tercatat</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-brand-primary" />
            <span>Perekrutan & Pipeline Pelamar Kerja (ONE Recruitment)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola lowongan pekerjaan, alur pelamar (Screening, Interview, Offering, Onboarding), dan arsip CV kandidat.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Buka Lowongan Kerja Baru</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {jobOpenings.map((job) => (
          <Card key={job.id} className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-bold text-foreground">{job.title}</span>
              <div className="text-[11px] text-brand-indigo font-medium">{job.department}</div>
              <div className="text-[11px] text-muted-foreground">
                {job.openings} posisi terbuka • Dibuka {job.postedDate}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Pelamar Masuk</span>
            <div className="text-2xl font-black text-brand-dark">{applicants.length} Berkas</div>
            <span className="text-[11px] text-muted-foreground">3 Posisi Lowongan Aktif</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Tahap Interview & Offering</span>
            <div className="text-2xl font-black text-brand-indigo">
              {applicants.filter((a) => a.stage === "Interview" || a.stage === "Offering").length} Kandidat
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">Siap Onboarding Bulan Ini</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Kandidat Berhasil Direkrut (Hired)</span>
            <div className="text-2xl font-black text-emerald-600">
              {applicants.filter((a) => a.stage === "Hired").length} Orang
            </div>
            <span className="text-[11px] text-muted-foreground">Telah masuk database HRM</span>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        {loadError && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}
        {notice && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {notice}
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={applicants} columns={columns} />
        )}
      </div>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka Lowongan Kerja Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateJob} className="space-y-3">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Posisi</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Departemen</label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Jumlah Posisi</label>
              <Input type="number" min={1} value={openings} onChange={(e) => setOpenings(Number(e.target.value))} />
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold">
                Publikasikan Lowongan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
