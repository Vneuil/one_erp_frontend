"use client";

import * as React from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { crmPlusApi, PipelineStageItem, LeadFormItem } from "@/lib/api/crmplus";
import { useAppStore } from "@/stores/app-store";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const KIND_LABEL = { open: "Berjalan", won: "Menang", lost: "Kalah" } as const;

export default function CrmSettingsPage() {
  const isAdmin = useAppStore((s) => s.currentUser?.role?.toLowerCase() === "admin");
  const [tab, setTab] = React.useState<"stages" | "forms">("stages");
  const [stages, setStages] = React.useState<PipelineStageItem[]>([]);
  const [forms, setForms] = React.useState<LeadFormItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [stageName, setStageName] = React.useState("");
  const [stageProb, setStageProb] = React.useState(50);
  const [formName, setFormName] = React.useState("");
  const [formPic, setFormPic] = React.useState("");

  const load = React.useCallback(() => Promise.all([crmPlusApi.stages(), crmPlusApi.leadForms()]), []);

  React.useEffect(() => {
    let alive = true;
    load()
      .then(([s, f]) => {
        if (!alive) return;
        setStages(s.data || []);
        setForms(f.data || []);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat pengaturan.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load]);

  const run = async (action: () => Promise<unknown>, okText?: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      const [s, f] = await load();
      setStages(s.data || []);
      setForms(f.data || []);
      if (okText) setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const move = (s: PipelineStageItem, dir: -1 | 1) => {
    const sorted = [...stages].sort((a, b) => a.position - b.position);
    const i = sorted.findIndex((x) => x.id === s.id);
    const other = sorted[i + dir];
    if (!other) return;
    // Swap the two positions.
    return run(async () => {
      await crmPlusApi.updateStage(s.id, { position: other.position });
      await crmPlusApi.updateStage(other.id, { position: s.position });
    });
  };

  const formUrl = (key: string) => (typeof window !== "undefined" ? `${window.location.origin}/forms/${key}` : `/forms/${key}`);
  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-brand-primary" />
          <span>Pengaturan CRM</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Tahap pipeline penjualan dan formulir web yang menangkap prospek otomatis.</p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}
      {!isAdmin && <p className="text-xs text-muted-foreground">Hanya admin yang dapat mengubah pengaturan ini.</p>}

      <div className="flex gap-1.5">
        {([["stages", "Tahap Pipeline"], ["forms", "Formulir Web"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${tab === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : tab === "stages" ? (
        <div className="space-y-4">
          {isAdmin && (
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <label className="space-y-1 text-xs font-semibold sm:col-span-2">Nama tahap baru<Input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="Survey Lokasi, Tender, ..." /></label>
                <label className="space-y-1 text-xs font-semibold">Probabilitas menang (%)<Input type="number" min={0} max={99} value={stageProb} onChange={(e) => setStageProb(Number(e.target.value))} /></label>
                <Button size="sm" disabled={busy || !stageName.trim()} onClick={() => run(async () => { await crmPlusApi.createStage({ name: stageName, probability: stageProb }); setStageName(""); }, "Tahap ditambahkan.")} className="h-9 text-xs font-bold">Tambah Tahap</Button>
              </CardContent>
            </Card>
          )}
          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead><tr>{["#", "Tahap", "Jenis", "Probabilitas", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {sortedStages.map((s, i) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className={td}>{i + 1}</td>
                      <td className={`${td} font-semibold`}>{s.name} <span className="text-[10px] text-muted-foreground font-mono">{s.key}</span></td>
                      <td className={td}>{KIND_LABEL[s.kind]}</td>
                      <td className={td}>{s.probability}%</td>
                      <td className={td}>{s.isActive ? "Aktif" : "Nonaktif"}</td>
                      <td className={td}>
                        {isAdmin && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" disabled={busy || i === 0} onClick={() => move(s, -1)} className="h-7 px-2 text-[11px]" aria-label="Naikkan">↑</Button>
                            <Button size="sm" variant="outline" disabled={busy || i === sortedStages.length - 1} onClick={() => move(s, 1)} className="h-7 px-2 text-[11px]" aria-label="Turunkan">↓</Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => crmPlusApi.updateStage(s.id, { isActive: !s.isActive }))} className="h-7 px-2 text-[11px]">{s.isActive ? "Nonaktifkan" : "Aktifkan"}</Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => window.confirm(`Hapus tahap ${s.name}?`) && run(() => crmPlusApi.deleteStage(s.id), "Tahap dihapus.")} className="h-7 px-2 text-[11px] text-rose-600 border-rose-200">Hapus</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="text-[11px] text-muted-foreground">Tahap yang masih dipakai deal tidak bisa dihapus (nonaktifkan saja). Pipeline wajib punya satu tahap Menang dan satu tahap Kalah yang aktif.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {isAdmin && (
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <label className="space-y-1 text-xs font-semibold sm:col-span-2">Nama formulir<Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Hubungi Kami" /></label>
                <label className="space-y-1 text-xs font-semibold">Email PIC (menerima notifikasi)<Input type="email" value={formPic} onChange={(e) => setFormPic(e.target.value)} /></label>
                <Button size="sm" disabled={busy || !formName.trim()} onClick={() => run(async () => { await crmPlusApi.createLeadForm({ name: formName, source: "web-form", defaultPic: formPic || undefined }); setFormName(""); }, "Formulir dibuat.")} className="h-9 text-xs font-bold">Buat Formulir</Button>
              </CardContent>
            </Card>
          )}
          {forms.length === 0 && <p className="text-xs text-muted-foreground">Belum ada formulir.</p>}
          {forms.map((f) => (
            <Card key={f.id} className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">{f.name} <span className={`ml-1 text-[10px] font-bold ${f.isActive ? "text-emerald-700" : "text-slate-500"}`}>{f.isActive ? "Aktif" : "Nonaktif"}</span></div>
                    <div className="text-[11px] text-muted-foreground">{f.submissions} kiriman · sumber {f.source}{f.defaultPic ? ` · PIC ${f.defaultPic}` : ""}</div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => crmPlusApi.updateLeadForm(f.id, { isActive: !f.isActive }))} className="h-7 px-2 text-[11px]">{f.isActive ? "Nonaktifkan" : "Aktifkan"}</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => window.confirm(`Hapus formulir ${f.name}? Tautannya berhenti berfungsi.`) && run(() => crmPlusApi.deleteLeadForm(f.id), "Formulir dihapus.")} className="h-7 px-2 text-[11px] text-rose-600 border-rose-200">Hapus</Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input readOnly value={formUrl(f.key)} onFocus={(e) => e.currentTarget.select()} className="flex-1 rounded border border-input bg-slate-50 px-2 py-1 text-[11px] font-mono" aria-label="Tautan formulir publik" />
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(formUrl(f.key)).then(() => setNotice("Tautan disalin."))} className="h-7 px-2 text-[11px]">Salin</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-[11px] text-muted-foreground">Bagikan tautan atau sematkan lewat iframe. Kiriman masuk sebagai prospek baru berstatus New, dengan pesan pengunjung tercatat sebagai catatan aktivitas.</p>
        </div>
      )}
    </div>
  );
}
