"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building,
  Calendar,
  CheckSquare,
  Clock,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi, timeEntriesApi } from "@/lib/api/projects";
import { projectTaskApi } from "@/lib/api/projecttask";

export default function ProjectDetailPage() {
  const params = useParams();
  return (
    <React.Suspense fallback={<p>Memuat detail proyek...</p>}>
      <ProjectDetail key={String(params.id)} />
    </React.Suspense>
  );
}

const statusStyles: Record<string, string> = {
  Planning: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  "On Hold": "bg-rose-50 text-rose-700 border-rose-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function ProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await projectsApi.getById(projectId);
      if (!response.data) throw new Error("Proyek tidak ditemukan.");
      return response.data;
    },
  });

  const project = projectQuery.data;

  // Recalculate real Progress (completed / total Kanban tasks) and
  // ActualCost (sum of logged timesheet hours x hourly rate) as soon as the
  // detail page loads, so the numbers shown here are always fresh instead
  // of stale manually-edited values (see backend
  // modules/project.RecalculateProgress).
  const recalculateQuery = useQuery({
    queryKey: ["project-recalculate", projectId],
    queryFn: async () => {
      const response = await projectsApi.recalculate(projectId);
      if (response.data) {
        queryClient.setQueryData(["project", projectId], response.data);
      }
      return response.data;
    },
    enabled: !!project,
    staleTime: Infinity,
    retry: false,
  });

  const tasksQuery = useQuery({
    queryKey: ["project-tasks", project?.code],
    queryFn: async () => {
      const response = await projectTaskApi.list({ projectCode: project?.code });
      return response.data || [];
    },
    enabled: !!project?.code,
  });

  const timeEntriesQuery = useQuery({
    queryKey: ["project-time-entries", project?.code],
    queryFn: async () => {
      const response = await timeEntriesApi.list({ projectCode: project?.code });
      return response.data || [];
    },
    enabled: !!project?.code,
  });

  const displayedProgress = recalculateQuery.data?.progress ?? project?.progress ?? 0;
  const displayedActualCost = recalculateQuery.data?.actualCost ?? project?.actualCost ?? 0;

  if (!project || projectQuery.isError) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/projects">Kembali ke Daftar Proyek</Link>
        </Button>
        {projectQuery.isError ? (
          <div role="alert">
            <p>{projectQuery.error instanceof Error ? projectQuery.error.message : "Gagal memuat proyek."}</p>
            <Button onClick={() => projectQuery.refetch()}>Coba Lagi</Button>
          </div>
        ) : (
          <p role="status">Memuat detail proyek...</p>
        )}
      </div>
    );
  }

  const tasks = tasksQuery.data || [];
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/projects">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar Proyek
          </Link>
        </Button>
      </div>

      <PageHeader
        title={project.name}
        description={`${project.code} • Klien: ${project.customer} • PM: ${project.manager || "-"}`}
      >
        <Button asChild variant="outline" size="sm" className="h-8 text-xs font-bold">
          <Link href={`/projects/${projectId}/budget`}>RAB, RAP & Biaya</Link>
        </Button>
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusStyles[project.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
          {project.status}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          disabled={recalculateQuery.isFetching}
          onClick={() => recalculateQuery.refetch()}
          title="Hitung ulang progress (dari tugas Kanban selesai) dan biaya aktual (dari timesheet)"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${recalculateQuery.isFetching ? "animate-spin" : ""}`} />
          {recalculateQuery.isFetching ? "Menghitung..." : "Recalculate"}
        </Button>
      </PageHeader>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Nilai Kontrak (RAB)</span>
            <p className="text-xl font-bold text-foreground mt-1">
              <MoneyDisplay amount={project.rabValue} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Pagu Biaya (RAP)</span>
            <p className="text-xl font-bold text-foreground mt-1">
              <MoneyDisplay amount={project.rapValue} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Realisasi Biaya Aktual</span>
            <p className="text-xl font-bold text-brand-indigo mt-1">
              <MoneyDisplay amount={displayedActualCost} />
            </p>
            <span className="text-[10px] text-muted-foreground">
              {recalculateQuery.isFetching
                ? "Menghitung ulang dari timesheet..."
                : "Live dari total jam timesheet x rate"}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Progres Fisik</span>
            <p className="text-xl font-bold text-emerald-600 mt-1">{displayedProgress}%</p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-primary rounded-full transition-all"
                style={{ width: `${displayedProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {tasksQuery.isSuccess ? `${doneTasks}/${tasks.length} task Kanban selesai` : "Live dari task Kanban"}
            </span>
          </CardContent>
        </Card>
      </div>

      {recalculateQuery.isError && (
        <p role="alert" className="text-xs text-rose-700">
          Gagal menghitung ulang progress/biaya real-time. Menampilkan nilai tersimpan terakhir.{" "}
          <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => recalculateQuery.refetch()}>
            Coba Lagi
          </Button>
        </p>
      )}

      {/* Tabs View */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Task Kanban</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-brand-primary" /> Task Kanban Proyek Ini
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul Task</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Prioritas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="text-right">Checklist</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasksQuery.isPending && (
                    <TableRow>
                      <TableCell colSpan={6}>Memuat task...</TableCell>
                    </TableRow>
                  )}
                  {tasksQuery.isError && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <span role="alert">Gagal memuat task.</span>{" "}
                        <Button variant="outline" onClick={() => tasksQuery.refetch()}>Coba Lagi</Button>
                      </TableCell>
                    </TableRow>
                  )}
                  {tasksQuery.isSuccess && !tasks.length && (
                    <TableRow>
                      <TableCell colSpan={6}>Belum ada task Kanban untuk proyek ini.</TableCell>
                    </TableRow>
                  )}
                  {!tasksQuery.isError &&
                    tasks.map((t) => {
                      const doneCount = (t.checklist || []).filter((c) => c.done).length;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-semibold text-xs text-foreground">{t.title}</TableCell>
                          <TableCell className="text-xs flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-brand-primary" /> {t.assignee || "-"}
                          </TableCell>
                          <TableCell className="text-xs">{t.priority}</TableCell>
                          <TableCell className="text-xs capitalize">{t.status.replace("_", " ")}</TableCell>
                          <TableCell className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {t.dueDate}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold">
                            {doneCount}/{(t.checklist || []).length}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheet">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-primary" /> Timesheet Proyek Ini
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pekerjaan</TableHead>
                    <TableHead>Personil</TableHead>
                    <TableHead className="text-right">Durasi</TableHead>
                    <TableHead className="text-right">Biaya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntriesQuery.isPending && (
                    <TableRow>
                      <TableCell colSpan={5}>Memuat timesheet...</TableCell>
                    </TableRow>
                  )}
                  {timeEntriesQuery.isError && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <span role="alert">Gagal memuat timesheet.</span>{" "}
                        <Button variant="outline" onClick={() => timeEntriesQuery.refetch()}>Coba Lagi</Button>
                      </TableCell>
                    </TableRow>
                  )}
                  {timeEntriesQuery.isSuccess && !(timeEntriesQuery.data || []).length && (
                    <TableRow>
                      <TableCell colSpan={5}>Belum ada entri timesheet untuk proyek ini.</TableCell>
                    </TableRow>
                  )}
                  {!timeEntriesQuery.isError &&
                    (timeEntriesQuery.data || []).map((e) => {
                      const hours = e.durationMinutes / 60;
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs text-muted-foreground">{e.date}</TableCell>
                          <TableCell className="text-xs font-semibold text-foreground">{e.taskTitle}</TableCell>
                          <TableCell className="text-xs flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-brand-primary" /> {e.workerName}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {Math.floor(hours)}j {e.durationMinutes % 60}m
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold">
                            <MoneyDisplay amount={hours * e.hourlyRate} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="p-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Building className="h-3.5 w-3.5" />
          Dibuat: {project.createdAt ? new Date(project.createdAt).toLocaleDateString("id-ID") : "-"} • Terakhir diperbarui:{" "}
          {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("id-ID") : "-"}
        </CardContent>
      </Card>
    </div>
  );
}
