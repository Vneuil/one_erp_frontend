"use client";

import * as React from "react";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useNavigationAccess } from "@/providers/navigation-access";
import { useIsOwnDocument } from "@/lib/hooks/use-own-document";
import { projectCostApi, WorkOrderItem, WorkOrderStatus } from "@/lib/api/projectcost";
import { projectsApi } from "@/lib/api/projects";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const STATUS: Record<WorkOrderStatus, { label: string; style: string }> = {
  draft: { label: "Draf", style: "bg-slate-100 text-slate-700" },
  issued: { label: "Diterbitkan", style: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Dikerjakan", style: "bg-amber-100 text-amber-800" },
  completed: { label: "Selesai", style: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Dibatalkan", style: "bg-rose-100 text-rose-700" },
};

export default function WorkOrdersPage() {
  const { canApprove } = useNavigationAccess();
  const mayIssue = canApprove("project");
  const isOwn = useIsOwnDocument();

  const [items, setItems] = React.useState<WorkOrderItem[]>([]);
  const [projects, setProjects] = React.useState<{ id: string; code: string; name: string; customer: string }[]>([]);
  const [filter, setFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [value, setValue] = React.useState(0);
  const [start, setStart] = React.useState("");
  const [due, setDue] = React.useState("");
  const [assigned, setAssigned] = React.useState("");
  const [scope, setScope] = React.useState("");

  const load = React.useCallback(() => Promise.all([projectCostApi.workOrders(), projectsApi.list({ perPage: 200 })]), []);

  React.useEffect(() => {
    let alive = true;
    load()
      .then(([w, p]) => {
        if (!alive) return;
        setItems(w.data || []);
        setProjects((p.data || []).map((x) => ({ id: x.id, code: x.code, name: x.name, customer: x.customer })));
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat SPK.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load]);

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setItems((await projectCostApi.workOrders()).data || []);
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const shown = items.filter((w) => !filter || w.status === filter);
  const projectName = (id?: string | null) => projects.find((p) => p.id === id);
  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs align-top";

  const actions = (w: WorkOrderItem) => {
    const btn = (label: string, action: "issue" | "start" | "complete" | "cancel", ok: string, danger = false) => (
      <Button key={action} size="sm" variant="outline" disabled={busy} onClick={() => (action !== "cancel" && action !== "complete") || window.confirm(`${label} SPK ${w.number}?`) ? run(() => projectCostApi.advanceWorkOrder(w.id, action), ok) : undefined}
        className={`h-7 px-2 text-[11px] font-bold ${danger ? "text-rose-600 border-rose-200" : ""}`}>{label}</Button>
    );
    return (
      <div className="flex flex-wrap gap-1.5">
        {w.status === "draft" && (mayIssue && !isOwn(w.createdByEmail) ? btn("Terbitkan", "issue", `SPK ${w.number} diterbitkan.`) : <span className="text-[10px] text-muted-foreground">{mayIssue ? "Diterbitkan oleh atasan lain" : "Menunggu diterbitkan atasan"}</span>)}
        {w.status === "issued" && btn("Mulai", "start", "SPK mulai dikerjakan.")}
        {w.status === "in_progress" && (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => { const v = window.prompt("Progres pekerjaan (0-99%):", String(w.progressPct)); if (v !== null && v.trim() !== "") run(() => projectCostApi.setWorkOrderProgress(w.id, Number(v)), "Progres diperbarui."); }} className="h-7 px-2 text-[11px] font-bold">Progres</Button>
            {btn("Selesai", "complete", "SPK selesai.")}
          </>
        )}
        {["draft", "issued", "in_progress"].includes(w.status) && btn("Batalkan", "cancel", "SPK dibatalkan.", true)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-brand-primary" /><span>SPK / Work Order</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Surat perintah kerja dengan ruang lingkup, nilai, tenggat, dan progres. Penerbitan memerlukan atasan lain dari pembuat draf.</p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold sm:col-span-2">Judul pekerjaan<Input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">
            Proyek (opsional)
            <select value={projectId} onChange={(e) => { setProjectId(e.target.value); const p = projectName(e.target.value); if (p && !customer) setCustomer(p.customer); }} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
              <option value="">Tanpa proyek</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold">Pelanggan<Input value={customer} onChange={(e) => setCustomer(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Nilai kontrak (Rp)<Input type="number" min={0} value={value || ""} onChange={(e) => setValue(Number(e.target.value))} /></label>
          <label className="space-y-1 text-xs font-semibold">Mulai<Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Tenggat<Input type="date" value={due} min={start} onChange={(e) => setDue(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Penanggung jawab<Input value={assigned} onChange={(e) => setAssigned(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold sm:col-span-3">Ruang lingkup<Input value={scope} onChange={(e) => setScope(e.target.value)} /></label>
          <Button size="sm" disabled={busy || !title.trim() || !customer.trim()} className="h-9 text-xs font-bold"
            onClick={() => run(async () => { await projectCostApi.createWorkOrder({ title, customerName: customer, projectId: projectId || undefined, contractValue: value, startDate: start || undefined, dueDate: due || undefined, assignedTo: assigned || undefined, scope: scope || undefined }); setTitle(""); setScope(""); setValue(0); }, "SPK dibuat sebagai draf.")}>Buat SPK</Button>
        </CardContent>
      </Card>

      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs" aria-label="Filter status">
        <option value="">Semua status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["No. SPK", "Pekerjaan", "Proyek", "Nilai", "Jadwal", "Progres", "Status", "Aksi"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td className={td} colSpan={8}>Memuat data...</td></tr>}
              {!loading && shown.length === 0 && <tr><td className={td} colSpan={8}>Belum ada SPK.</td></tr>}
              {shown.map((w) => {
                const late = w.dueDate && w.status !== "completed" && w.status !== "cancelled" && w.dueDate < new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
                return (
                  <tr key={w.id} className="border-t border-border">
                    <td className={`${td} font-mono font-bold`}>{w.number}</td>
                    <td className={td}><div className="font-semibold">{w.title}</div><div className="text-[10px] text-muted-foreground">{w.customerName}{w.assignedTo ? ` · PJ ${w.assignedTo}` : ""}</div></td>
                    <td className={td}>{projectName(w.projectId)?.code ?? "-"}</td>
                    <td className={td}><MoneyDisplay amount={w.contractValue} /></td>
                    <td className={`${td} ${late ? "text-rose-600 font-bold" : ""}`}>{w.startDate || "-"} → {w.dueDate || "-"}{late ? " (lewat tenggat)" : ""}</td>
                    <td className={td}><div className="h-1.5 w-20 rounded bg-slate-100"><div className="h-1.5 rounded bg-brand-primary" style={{ width: `${w.progressPct}%` }} /></div><div className="text-[10px]">{w.progressPct}%</div></td>
                    <td className={td}><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS[w.status].style}`}>{STATUS[w.status].label}</span></td>
                    <td className={td}>{actions(w)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
