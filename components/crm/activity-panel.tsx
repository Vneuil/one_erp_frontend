"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadFromApi, checkUpload, UPLOAD_ACCEPT } from "@/lib/utils/download";
import {
  crmPlusApi,
  ParentType,
  InteractionItem,
  SalesTaskItem,
  CrmDocumentItem,
  CrmTagItem,
} from "@/lib/api/crmplus";

type Tab = "activity" | "tasks" | "documents" | "tags";

const KINDS: [InteractionItem["kind"], string][] = [
  ["call", "Telepon"],
  ["meeting", "Meeting"],
  ["whatsapp", "WhatsApp"],
  ["email", "Email"],
  ["visit", "Kunjungan"],
  ["note", "Catatan internal"],
];
const kindLabel = (k: string) => KINDS.find(([v]) => v === k)?.[1] ?? k;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const fmt = (iso: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso));
const TAG_COLORS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  red: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  violet: "bg-violet-100 text-violet-700",
  pink: "bg-pink-100 text-pink-700",
};

/** Activity log, tasks, documents and tags for one lead, deal or customer. */
export function CrmActivityPanel({ parentType, parentId }: { parentType: ParentType; parentId: string }) {
  const [tab, setTab] = React.useState<Tab>("activity");
  const [interactions, setInteractions] = React.useState<InteractionItem[]>([]);
  const [tasks, setTasks] = React.useState<SalesTaskItem[]>([]);
  const [docs, setDocs] = React.useState<CrmDocumentItem[]>([]);
  const [tags, setTags] = React.useState<CrmTagItem[]>([]);
  const [allTags, setAllTags] = React.useState<CrmTagItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [kind, setKind] = React.useState<InteractionItem["kind"]>("call");
  const [summary, setSummary] = React.useState("");
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDue, setTaskDue] = React.useState(today());
  const [docTitle, setDocTitle] = React.useState("");
  const [docType, setDocType] = React.useState("Proposal");
  const [docRef, setDocRef] = React.useState("");
  const [docFile, setDocFile] = React.useState<File | null>(null);
  const docFileError = checkUpload(docFile);
  const [newTag, setNewTag] = React.useState("");

  const load = React.useCallback(
    () =>
      Promise.all([
        crmPlusApi.interactions(parentType, parentId),
        crmPlusApi.tasks({ parentType, parentId }),
        crmPlusApi.documents(parentType, parentId),
        crmPlusApi.tagsFor(parentType, parentId),
        crmPlusApi.tags(),
      ]),
    [parentType, parentId]
  );

  React.useEffect(() => {
    let alive = true;
    load()
      .then(([i, t, d, tg, all]) => {
        if (!alive) return;
        setInteractions(i.data || []);
        setTasks(t.data || []);
        setDocs(d.data || []);
        setTags(tg.data || []);
        setAllTags(all.data || []);
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat aktivitas.")));
    return () => {
      alive = false;
    };
  }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      const [i, t, d, tg, all] = await load();
      setInteractions(i.data || []);
      setTasks(t.data || []);
      setDocs(d.data || []);
      setTags(tg.data || []);
      setAllTags(all.data || []);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const openTasks = tasks.filter((t) => t.status === "open").length;
  const tabs: [Tab, string][] = [
    ["activity", `Aktivitas (${interactions.length})`],
    ["tasks", `Tugas (${openTasks})`],
    ["documents", `Dokumen (${docs.length})`],
    ["tags", `Tag (${tags.length})`],
  ];

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap gap-1">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${tab === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>
      {error && <div role="alert" className="px-2 py-1.5 rounded bg-rose-50 border border-rose-200 text-rose-700">{error}</div>}

      {tab === "activity" && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <select value={kind} onChange={(e) => setKind(e.target.value as InteractionItem["kind"])} className="h-8 rounded-md border border-input bg-background px-1.5 text-xs" aria-label="Jenis aktivitas">
              {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Ringkasan: apa yang dibicarakan / hasilnya" className="h-8 text-xs" />
            <Button size="sm" disabled={busy || !summary.trim()} onClick={() => run(async () => { await crmPlusApi.logInteraction({ parentType, parentId, kind, summary }); setSummary(""); })} className="h-8 text-xs">Catat</Button>
          </div>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto">
            {interactions.length === 0 && <li className="text-muted-foreground">Belum ada aktivitas tercatat.</li>}
            {interactions.map((i) => (
              <li key={i.id} className="rounded border border-border p-2">
                <div className="flex justify-between text-[10px] text-muted-foreground"><span className="font-bold text-foreground">{kindLabel(i.kind)}</span><span>{fmt(i.occurredAt)}</span></div>
                <p className="whitespace-pre-wrap">{i.summary}</p>
                {i.createdByEmail && <p className="text-[10px] text-muted-foreground">oleh {i.createdByEmail}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Tugas / follow-up berikutnya" className="h-8 text-xs" />
            <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="h-8 w-36 text-xs" />
            <Button size="sm" disabled={busy || !taskTitle.trim()} onClick={() => run(async () => { await crmPlusApi.createTask({ title: taskTitle, dueDate: taskDue, parentType, parentId }); setTaskTitle(""); })} className="h-8 text-xs">Tambah</Button>
          </div>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto">
            {tasks.length === 0 && <li className="text-muted-foreground">Belum ada tugas.</li>}
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded border border-border p-2">
                <input type="checkbox" checked={t.status === "done"} disabled={busy} onChange={(e) => run(() => crmPlusApi.setTaskDone(t.id, e.target.checked))} aria-label={`Selesaikan ${t.title}`} />
                <div className="flex-1">
                  <div className={t.status === "done" ? "line-through text-muted-foreground" : "font-semibold"}>{t.title}</div>
                  <div className={`text-[10px] ${t.status === "open" && t.dueDate < today() ? "text-rose-600 font-bold" : "text-muted-foreground"}`}>Jatuh tempo {t.dueDate} · {t.assigneeEmail}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Judul dokumen" className="h-8 text-xs" />
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="h-8 rounded-md border border-input bg-background px-1.5 text-xs">
              {["Proposal", "Penawaran", "Kontrak", "Spesifikasi", "NDA", "Lainnya"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <Input type="file" accept={UPLOAD_ACCEPT} aria-label="Berkas dokumen" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} className="h-8 text-xs col-span-2" />
            {docFileError && <span className="col-span-2 text-[10px] text-rose-700">{docFileError}</span>}
            <Input value={docRef} disabled={!!docFile} onChange={(e) => setDocRef(e.target.value)} placeholder="atau ID/tautan berkas di ONE Drive" className="h-8 text-xs col-span-2" />
          </div>
          <Button size="sm" disabled={busy || !docTitle.trim() || !!docFileError} onClick={() => run(async () => { if (docFile) await crmPlusApi.uploadDocument({ parentType, parentId, title: docTitle, docType }, docFile); else await crmPlusApi.addDocument({ parentType, parentId, title: docTitle, docType, fileRef: docRef }); setDocTitle(""); setDocRef(""); setDocFile(null); })} className="h-8 text-xs">Tambah Dokumen</Button>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {docs.length === 0 && <li className="text-muted-foreground">Belum ada dokumen.</li>}
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded border border-border p-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{d.title} <span className="text-muted-foreground font-normal">· {d.docType}</span></div>
                  {d.fileName && <button type="button" className="underline text-[10px] cursor-pointer break-all" onClick={() => downloadFromApi(`/crm/documents/${d.id}/file`, d.fileName!).catch(() => undefined)}>{d.fileName}</button>}
                  {d.fileRef && (/^https?:\/\//.test(d.fileRef) ? <a href={d.fileRef} target="_blank" rel="noreferrer" className="underline text-[10px] break-all">{d.fileRef}</a> : <span className="text-[10px] text-muted-foreground break-all">{d.fileRef}</span>)}
                </div>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => crmPlusApi.deleteDocument(d.id))} className="h-7 px-2 text-[11px] text-rose-600 border-rose-200">Hapus</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "tags" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {allTags.length === 0 && <span className="text-muted-foreground">Belum ada tag. Buat yang pertama di bawah.</span>}
            {allTags.map((t) => {
              const on = tags.some((x) => x.id === t.id);
              return (
                <button key={t.id} disabled={busy} onClick={() => run(() => crmPlusApi.setTag(t.id, parentType, parentId, !on))} className={`px-2 py-1 rounded-full text-[11px] font-semibold cursor-pointer border ${on ? `${TAG_COLORS[t.color] ?? TAG_COLORS.slate} border-current` : "bg-white text-muted-foreground border-border hover:text-foreground"}`}>
                  {on ? "✓ " : ""}{t.name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5">
            <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Tag baru (mis. VIP, Tender, Prioritas)" className="h-8 text-xs" />
            <Button size="sm" disabled={busy || !newTag.trim()} onClick={() => run(async () => { const r = await crmPlusApi.createTag(newTag); await crmPlusApi.setTag(r.data.id, parentType, parentId, true); setNewTag(""); })} className="h-8 text-xs">Buat & Pasang</Button>
          </div>
        </div>
      )}
    </div>
  );
}
