"use client";

import * as React from "react";
import {
  FolderKanban,
  Plus,
  CheckCircle2,
  Clock,
  UserCheck,
  CheckSquare,
  AlertCircle,
  Building,
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
import { useAppStore } from "@/stores/app-store";
import { projectsApi } from "@/lib/api/projects";
import { projectTaskApi, ProjectTaskItem as ApiProjectTask } from "@/lib/api/projecttask";

type TaskStatus = "todo" | "in_progress" | "review" | "done";

interface ProjectTask {
  id: string;
  projectCode: string;
  title: string;
  assignee: string;
  priority: "High" | "Medium" | "Low";
  status: TaskStatus;
  dueDate: string;
  checklists: { id?: string; text: string; done: boolean }[];
}

const mapTask = (t: ApiProjectTask): ProjectTask => ({
  id: t.id,
  projectCode: t.projectCode,
  title: t.title,
  assignee: t.assignee,
  priority: (t.priority as ProjectTask["priority"]) || "Medium",
  status: (t.status as TaskStatus) || "todo",
  dueDate: t.dueDate,
  checklists: (t.checklist || []).map((c) => ({ text: c.text, done: c.done, id: c.id })),
});

const columns: { id: TaskStatus; label: string; color: string; badge: string }[] = [
  { id: "todo", label: "To Do (Antrean)", color: "border-slate-300 bg-slate-50/50", badge: "bg-slate-200 text-slate-800" },
  { id: "in_progress", label: "Sedang Dikerjakan", color: "border-blue-300 bg-blue-50/40", badge: "bg-blue-100 text-blue-800" },
  { id: "review", label: "Review & Validasi", color: "border-amber-300 bg-amber-50/40", badge: "bg-amber-100 text-amber-800" },
  { id: "done", label: "Selesai (Done)", color: "border-emerald-300 bg-emerald-50/40", badge: "bg-emerald-100 text-emerald-800" },
];

export default function KanbanBoardPage() {
  const { currentUser } = useAppStore();
  const [tasks, setTasks] = React.useState<ProjectTask[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [projectOptions, setProjectOptions] = React.useState<{ code: string; name: string }[]>([]);
  const [isNewTaskOpen, setIsNewTaskOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<ProjectTask | null>(null);

  // Form State
  const [newTitle, setNewTitle] = React.useState("");
  const [newPrj, setNewPrj] = React.useState("");
  const [newPriority, setNewPriority] = React.useState<ProjectTask["priority"]>("Medium");
  const [newDueDate, setNewDueDate] = React.useState("");

  const loadTasks = () =>
    projectTaskApi
      .list()
      .then((res) => {
        setTasks((res.data || []).map(mapTask));
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load tasks", err);
        setLoadError("Gagal memuat tugas dari server.");
      });

  React.useEffect(() => {
    projectTaskApi
      .list()
      .then((res) => {
        setTasks((res.data || []).map(mapTask));
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load tasks", err);
        setLoadError("Gagal memuat tugas dari server.");
      })
      .finally(() => setIsLoading(false));
    projectsApi
      .list()
      .then((res) => setProjectOptions((res.data || []).map((p) => ({ code: p.code, name: p.name }))))
      .catch((err) => console.error("Failed to load projects", err));
  }, []);

  // Cards move optimistically for a responsive board, but the server has the
  // last word: on failure the board is reloaded from it and the error shown.
  const moveTask = (taskId: string, targetStatus: TaskStatus) => {
    setNotice(null);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t)));
    setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, status: targetStatus } : prev));

    projectTaskApi.updateStatus(taskId, targetStatus).catch((err) => {
      setNotice(err instanceof Error ? err.message : "Gagal menyimpan perpindahan tugas.");
      loadTasks();
    });
  };

  const toggleChecklist = (taskId: string, cIdx: number) => {
    setNotice(null);
    const source = tasks.find((t) => t.id === taskId);
    const itemId = source?.checklists[cIdx]?.id;
    const flip = (t: ProjectTask): ProjectTask => {
      const next = [...t.checklists];
      next[cIdx] = { ...next[cIdx], done: !next[cIdx].done };
      return { ...t, checklists: next };
    };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? flip(t) : t)));
    setSelectedTask((prev) => (prev && prev.id === taskId ? flip(prev) : prev));

    if (itemId) {
      projectTaskApi.toggleChecklistItem(itemId).catch((err) => {
        setNotice(err instanceof Error ? err.message : "Gagal menyimpan checklist.");
        loadTasks();
      });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrj) return;
    setFormError(null);
    try {
      const res = await projectTaskApi.create({
        projectCode: newPrj,
        title: newTitle,
        assignee: currentUser.name,
        priority: newPriority,
        status: "todo",
        dueDate: newDueDate || undefined,
        checklist: [{ text: "Pekerjaan utama" }],
      });
      if (res.data) {
        setTasks((prev) => [mapTask(res.data), ...prev]);
      }
      setIsNewTaskOpen(false);
      setNewTitle("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat tugas.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-brand-primary" />
            <span>Kanban Board Pekerjaan Proyek</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola pembagian tugas, checklist aktivitas, assignment PIC, dan milestone deadline proyek.
          </p>
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

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewTaskOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Tambah Task Baru</span>
        </Button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto min-h-[550px]">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className={`rounded-xl border ${col.color} p-3.5 flex flex-col justify-between space-y-3 min-w-[260px]`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{col.label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[620px] pr-0.5">
                {colTasks.map((task) => {
                  const completedChecklists = task.checklists.filter((c) => c.done).length;

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-3.5 bg-white rounded-xl border border-border shadow-2xs hover:border-brand-primary/50 hover:shadow-xs transition-all cursor-pointer text-left space-y-2.5 group"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold text-brand-dark bg-brand-tint px-1.5 py-0.5 rounded">
                          {task.projectCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            task.priority === "High"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-foreground leading-snug group-hover:text-brand-primary transition-colors">
                        {task.title}
                      </h4>

                      {/* Checklist counter */}
                      {task.checklists.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <CheckSquare className="h-3 w-3 text-brand-primary" />
                          <span>
                            {completedChecklists}/{task.checklists.length} Checklist Selesai
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <UserCheck className="h-3 w-3 text-brand-primary" />
                          {task.assignee}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.dueDate}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground/60 border border-dashed border-border rounded-lg">
                    Tidak ada task
                  </div>
                )}
              </div>

              {/* Column Footer */}
              <button
                type="button"
                onClick={() => setIsNewTaskOpen(true)}
                className="w-full py-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Tambah Task
              </button>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <Dialog open={Boolean(selectedTask)} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-brand-primary" />
                <span>{selectedTask.title}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Proyek: <strong className="text-foreground font-mono">{selectedTask.projectCode}</strong></span>
                <span>PIC: <strong className="text-foreground">{selectedTask.assignee}</strong></span>
              </div>

              {/* Checklist Section */}
              <div className="space-y-2">
                <label className="font-bold text-foreground">Subtask Checklist:</label>
                <div className="space-y-1.5">
                  {selectedTask.checklists.map((chk, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleChecklist(selectedTask.id, idx)}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border bg-slate-50/60 cursor-pointer hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={chk.done}
                        onChange={() => {}}
                        className="h-3.5 w-3.5 accent-[#9A20D6] rounded"
                      />
                      <span className={chk.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}>
                        {chk.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Move Status */}
              <div className="space-y-2">
                <label className="font-bold text-foreground">Pindahkan Status:</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={selectedTask.status === "todo" ? "gradient" : "outline"}
                    onClick={() => moveTask(selectedTask.id, "todo")}
                    className="text-xs h-8"
                  >
                    To Do
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTask.status === "in_progress" ? "gradient" : "outline"}
                    onClick={() => moveTask(selectedTask.id, "in_progress")}
                    className="text-xs h-8"
                  >
                    In Progress
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTask.status === "review" ? "gradient" : "outline"}
                    onClick={() => moveTask(selectedTask.id, "review")}
                    className="text-xs h-8"
                  >
                    Review
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTask.status === "done" ? "gradient" : "outline"}
                    onClick={() => moveTask(selectedTask.id, "done")}
                    className="text-xs h-8 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
                  >
                    ✓ Selesai (Done)
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTask(null)}
                className="text-xs h-9"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* New Task Modal */}
      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Tambah Task Pekerjaan Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Judul Task *</label>
              <Input
                placeholder="Contoh: Pengujian Instalasi Rak Pallet"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Pilih Proyek</label>
                <select
                  value={newPrj}
                  onChange={(e) => setNewPrj(e.target.value)}
                  required
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="">Pilih proyek...</option>
                  {projectOptions.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Prioritas</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as ProjectTask["priority"])}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="High">Tinggi (High)</option>
                  <option value="Medium">Sedang (Medium)</option>
                  <option value="Low">Rendah (Low)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Target Deadline</label>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewTaskOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Simpan Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
