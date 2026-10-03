"use client";

import * as React from "react";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { crmPlusApi, SalesTaskItem, TaskBuckets } from "@/lib/api/crmplus";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const PRIORITY: Record<string, string> = { high: "bg-rose-100 text-rose-700", normal: "bg-slate-100 text-slate-700", low: "bg-blue-50 text-blue-700" };
const PRIORITY_LABEL: Record<string, string> = { high: "Tinggi", normal: "Normal", low: "Rendah" };

export default function SalesTasksPage() {
  const [buckets, setBuckets] = React.useState<TaskBuckets>({ overdue: [], today: [], upcoming: [] });
  const [done, setDone] = React.useState<SalesTaskItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState(today());
  const [priority, setPriority] = React.useState("normal");
  const [assignee, setAssignee] = React.useState("");

  const load = React.useCallback(() => Promise.all([crmPlusApi.reminders(), crmPlusApi.tasks({ status: "done", mine: true })]), []);

  React.useEffect(() => {
    let alive = true;
    load()
      .then(([r, d]) => {
        if (!alive) return;
        setBuckets(r.data);
        setDone((d.data || []).slice(-10).reverse());
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat tugas.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      const [r, d] = await load();
      setBuckets(r.data);
      setDone((d.data || []).slice(-10).reverse());
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const row = (t: SalesTaskItem, tone: string) => (
    <li key={t.id} className="flex items-start gap-3 py-2 border-t border-border first:border-t-0">
      <input type="checkbox" className="mt-0.5" checked={t.status === "done"} disabled={busy} onChange={(e) => run(() => crmPlusApi.setTaskDone(t.id, e.target.checked))} aria-label={`Selesaikan ${t.title}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold">{t.title}</div>
        {t.notes && <div className="text-[11px] text-muted-foreground">{t.notes}</div>}
        <div className={`text-[10px] ${tone}`}>Jatuh tempo {t.dueDate}{t.parentType ? ` · terkait ${t.parentType}` : ""}</div>
      </div>
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
    </li>
  );

  const section = (label: string, items: SalesTaskItem[], tone: string) => (
    <Card className="border-border shadow-2xs">
      <CardContent className="p-4">
        <div className="text-xs font-bold mb-1">{label} <span className="text-muted-foreground font-normal">({items.length})</span></div>
        <ul>{items.length === 0 ? <li className="text-xs text-muted-foreground py-1">Tidak ada.</li> : items.map((t) => row(t, tone))}</ul>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-brand-primary" />
          <span>Tugas & Pengingat Sales</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Follow-up yang harus dilakukan. Tugas yang Anda berikan ke orang lain masuk ke kotak notifikasi mereka.
        </p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold sm:col-span-2">Tugas<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kirim penawaran ke PT ..." /></label>
          <label className="space-y-1 text-xs font-semibold">Jatuh tempo<Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">
            Prioritas
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
              <option value="low">Rendah</option><option value="normal">Normal</option><option value="high">Tinggi</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold">Untuk (email, kosong = saya)<Input value={assignee} onChange={(e) => setAssignee(e.target.value)} /></label>
          <div className="sm:col-span-5">
            <Button size="sm" disabled={busy || !title.trim()} onClick={() => run(async () => { await crmPlusApi.createTask({ title, dueDate: due, priority, assigneeEmail: assignee || undefined }); setTitle(""); setAssignee(""); })} className="h-9 text-xs font-bold">Tambah Tugas</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {section("Terlambat", buckets.overdue, "text-rose-600 font-bold")}
          {section("Hari ini", buckets.today, "text-amber-700 font-bold")}
          {section("Mendatang", buckets.upcoming, "text-muted-foreground")}
        </div>
      )}

      {done.length > 0 && (
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4">
            <div className="text-xs font-bold mb-1">Baru selesai</div>
            <ul>{done.map((t) => row(t, "text-muted-foreground line-through"))}</ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
