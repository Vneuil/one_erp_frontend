"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { useEmployeeOptions } from "@/components/shared/use-employee-options";
import { Tabs, errText, selectCls, td, th, today, useReport } from "@/components/reports/report-ui";
import { useAppStore } from "@/stores/app-store";
import { hrLettersApi, Letter, LetterData, LetterInput, LetterType } from "@/lib/api/hrletters";

interface TypeConfig {
  label: string;
  hint: string;
  /** About one employee (true) or addressed to a group (false). */
  singleEmployee: boolean;
}

const TYPES: Record<LetterType, TypeConfig> = {
  contract: { label: "Surat Kontrak Kerja", hint: "Perjanjian kerja PKWT, PKWTT, atau magang. Saat diterbitkan, jenis kontrak karyawan ikut diperbarui.", singleEmployee: true },
  mutation: { label: "Mutasi Karyawan", hint: "Perpindahan departemen, jabatan, atau atasan. Saat diterbitkan dan sudah berlaku, data karyawan ikut diperbarui.", singleEmployee: true },
  summons: { label: "Surat Panggilan", hint: "Memanggil karyawan untuk klarifikasi atau pertemuan.", singleEmployee: true },
  reprimand: { label: "Surat Teguran", hint: "Teguran tertulis sebelum surat peringatan.", singleEmployee: true },
  warning: { label: "Surat Peringatan", hint: "SP I, II, atau III dengan masa berlaku (default 6 bulan).", singleEmployee: true },
  termination: { label: "Surat PHK", hint: "Pemutusan hubungan kerja. Status karyawan menjadi Terminated pada hari terakhir bekerja.", singleEmployee: true },
  memo: { label: "Memo Internal", hint: "Pemberitahuan internal untuk semua karyawan, satu departemen, atau karyawan tertentu.", singleEmployee: false },
  overtime_order: { label: "Surat Perintah Lembur", hint: "Perintah kerja lembur untuk satu atau beberapa karyawan.", singleEmployee: false },
};
const TYPE_KEYS = Object.keys(TYPES) as LetterType[];
const STATUS_LABEL = { draft: "Draft", issued: "Terbit", cancelled: "Batal" } as const;
const STATUS_CLS = { draft: "bg-slate-100 text-slate-700", issued: "bg-emerald-100 text-emerald-800", cancelled: "bg-rose-100 text-rose-800" } as const;
const TERMINATION_REASONS = ["pengunduran diri atas permintaan sendiri", "berakhirnya perjanjian kerja waktu tertentu", "pelanggaran disiplin yang telah diberi peringatan", "efisiensi dan restrukturisasi perusahaan", "mencapai usia pensiun", "kesepakatan bersama kedua belah pihak"];

interface FormState {
  date: string;
  subject: string;
  body: string;
  city: string;
  signerName: string;
  signerTitle: string;
  employeeId: string;
  recipientIds: string[];
  effectiveDate: string;
  endDate: string;
  level: number;
  data: LetterData;
}
const emptyForm = (keep?: Partial<FormState>): FormState => ({
  date: today(), subject: "", body: "", city: keep?.city ?? "", signerName: keep?.signerName ?? "", signerTitle: keep?.signerTitle ?? "",
  employeeId: "", recipientIds: [], effectiveDate: "", endDate: "", level: 1, data: {},
});

const f = "space-y-1 text-xs font-semibold";

export default function HRLettersPage() {
  const companyName = useAppStore((s) => s.currentCompany.name);
  const [type, setType] = React.useState<LetterType>("contract");
  const cfg = TYPES[type];
  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [search, setSearch] = React.useState("");

  const employees = useEmployeeOptions();
  const selected = employees.known[form.employeeId];
  const summary = useReport(`summary|${form.employeeId}|${reload}`, () => hrLettersApi.employeeSummary(form.employeeId).then((r) => r.data), cfg.singleEmployee && form.employeeId !== "");
  const letters = useReport(`list|${type}|${statusFilter}|${search}|${reload}`, () => hrLettersApi.list({ type, status: (statusFilter || undefined) as Letter["status"] | undefined, search: search || undefined }).then((r) => r.data || []));
  const expiring = useReport(`expiring|${reload}`, () => hrLettersApi.expiringContracts(60).then((r) => r.data || []));

  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));
  const setData = (patch: LetterData) => setForm((p) => ({ ...p, data: { ...p.data, ...patch } }));

  const changeType = (t: LetterType) => {
    setType(t);
    setEditingId(null);
    setError(null);
    setNotice(null);
    setForm((p) => emptyForm(p));
  };

  const pickEmployee = (id: string) => {
    const e = employees.options.find((o) => o.id === id);
    if (e) employees.remember(e);
    set({ employeeId: id });
    if (e && type === "contract") setData({ position: e.role, salary: e.baseSalary });
  };

  const toInput = (withBody = true): LetterInput => ({
    type, date: form.date, subject: form.subject || undefined, body: withBody && form.body.trim() ? form.body : undefined, companyName, city: form.city,
    signerName: form.signerName, signerTitle: form.signerTitle, employeeId: form.employeeId || undefined, effectiveDate: form.effectiveDate || undefined,
    endDate: form.endDate || undefined, level: type === "warning" ? form.level : undefined, data: form.data, recipientIds: form.recipientIds.length ? form.recipientIds : undefined,
  });

  const run = async (action: () => Promise<unknown>, okText: string, after?: () => void) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(okText);
      after?.();
      setReload((n) => n + 1);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const preview = () =>
    run(async () => {
      const res = await hrLettersApi.preview(toInput(false));
      set({ body: res.data.body });
    }, "Teks standar dimuat. Silakan sunting bila perlu.");

  const save = () =>
    run(
      async () => {
        const res = editingId ? await hrLettersApi.update(editingId, toInput()) : await hrLettersApi.create(toInput());
        setNotice(`${editingId ? "Draft diperbarui" : "Draft dibuat"}: ${res.data.subject}. Periksa lalu terbitkan dari daftar di bawah.`);
        setEditingId(null);
        setForm((p) => emptyForm(p));
      },
      ""
    );

  const edit = (l: Letter) => {
    setType(l.type);
    setEditingId(l.id);
    setError(null);
    setNotice(null);
    if (l.employeeId) {
      const e = employees.options.find((o) => o.id === l.employeeId);
      if (e) employees.remember(e);
    }
    setForm({
      date: l.date, subject: l.subject, body: l.body, city: l.city, signerName: l.signerName, signerTitle: l.signerTitle, employeeId: l.employeeId ?? "",
      recipientIds: (l.recipients ?? []).map((r) => r.employeeId), effectiveDate: l.effectiveDate ?? "", endDate: l.endDate ?? "", level: l.level || 1, data: l.data ?? {},
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const askCancel = (l: Letter) => {
    const reason = l.status === "issued" ? window.prompt(`Alasan membatalkan ${l.number}:`, "") : "";
    if (reason === null) return;
    run(() => hrLettersApi.cancel(l.id, reason), "Surat dibatalkan.");
  };

  const toggleRecipient = (id: string) => set({ recipientIds: form.recipientIds.includes(id) ? form.recipientIds.filter((x) => x !== id) : [...form.recipientIds, id] });
  const nextLevel = summary.data ? Math.min(summary.data.highestActiveLevel + 1, 3) : 1;

  const employeePicker = (label: string, value: string, onPick: (id: string) => void, required = true) => (
    <div className={f}>
      <label className="block">{label}{required ? " *" : ""}</label>
      <div className="flex gap-1.5">
        <Input value={employees.search} onChange={(e) => employees.setSearch(e.target.value)} placeholder="Cari nama / NIP" className="w-32" aria-label="Cari karyawan" />
        <select value={value} onChange={(e) => onPick(e.target.value)} className={selectCls} aria-label={label}>
          <option value="">Pilih karyawan...</option>
          {value && !employees.options.some((o) => o.id === value) && <option value={value}>(karyawan terpilih)</option>}
          {employees.options.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.nip}) - {e.department}</option>)}
        </select>
      </div>
    </div>
  );

  const canSave = form.signerName.trim() !== "" && (cfg.singleEmployee ? form.employeeId !== "" : true) && !(type === "memo" && form.body.trim() === "");

  return (
    <div className="space-y-6">
      <PageHeader title="Surat & Mutasi Karyawan" description="Surat kontrak, mutasi, panggilan, teguran, peringatan, PHK, memo internal, dan perintah lembur. Nomor surat diberikan saat diterbitkan." />

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      {expiring.data && expiring.data.length > 0 && (
        <div role="status" className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="font-bold">Kontrak yang perlu diputuskan ({expiring.data.length})</div>
          {expiring.data.map((c) => (
            <div key={c.letter.id} className="flex flex-wrap items-center gap-2">
              <span>{c.employeeName}: kontrak berakhir {c.letter.endDate} {c.status === "expired" ? `(lewat ${-c.daysLeft} hari)` : `(${c.daysLeft} hari lagi)`}</span>
              <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => { changeType("contract"); const e = c.letter.employeeId; if (e) set({ employeeId: e }); }}>Buat kontrak baru</Button>
            </div>
          ))}
        </div>
      )}

      <Tabs value={type} onChange={changeType} tabs={TYPE_KEYS.map((k) => [k, TYPES[k].label] as const)} />

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">{cfg.hint}</p>
            {editingId && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { setEditingId(null); setForm((p) => emptyForm(p)); }}>Batal sunting</Button>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {cfg.singleEmployee && <div className="sm:col-span-2">{employeePicker("Karyawan", form.employeeId, pickEmployee)}</div>}
            <label className={f}>Tanggal surat<Input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} /></label>
            <label className={f}>Kota<Input value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="Jakarta" /></label>
          </div>

          {cfg.singleEmployee && selected && (
            <p className="text-[11px] text-muted-foreground">{selected.name} · {selected.nip} · {selected.role}, {selected.department} · {selected.contractType} · bergabung {selected.joinDate || "-"}</p>
          )}
          {type === "warning" && summary.data && (
            <div className={`px-3 py-2 rounded-lg border text-xs ${summary.data.activeWarnings.length ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-slate-50 border-border text-muted-foreground"}`}>
              {summary.data.activeWarnings.length === 0 ? "Tidak ada surat peringatan aktif untuk karyawan ini." : `SP aktif: ${summary.data.activeWarnings.map((w) => `SP ${w.level} (berlaku s.d. ${w.endDate})`).join(", ")}. Peringatan berikutnya biasanya SP ${nextLevel}.`}
              {summary.data.activeWarnings.length === 0 || form.level === nextLevel ? null : <Button size="sm" variant="outline" className="h-6 ml-2 px-2 text-[11px]" onClick={() => set({ level: nextLevel })}>Pakai SP {nextLevel}</Button>}
            </div>
          )}

          {type === "contract" && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className={f}>Jenis kontrak
                <select value={form.data.contractType ?? ""} onChange={(e) => { setData({ contractType: (e.target.value || undefined) as LetterData["contractType"] }); if (e.target.value === "PKWTT") set({ endDate: "" }); }} className={selectCls}>
                  <option value="">Pilih...</option><option value="PKWT">PKWT (waktu tertentu)</option><option value="PKWTT">PKWTT (tetap)</option><option value="Magang">Magang</option>
                </select>
              </label>
              <label className={f}>Mulai<Input type="date" value={form.effectiveDate} onChange={(e) => set({ effectiveDate: e.target.value })} /></label>
              <label className={f}>Berakhir<Input type="date" value={form.endDate} disabled={form.data.contractType === "PKWTT"} onChange={(e) => set({ endDate: e.target.value })} /></label>
              <label className={f}>Masa percobaan (bulan)<Input type="number" min={0} max={3} value={form.data.probationMonths ?? ""} onChange={(e) => setData({ probationMonths: Number(e.target.value) })} /></label>
              <label className={f}>Jabatan<Input value={form.data.position ?? ""} onChange={(e) => setData({ position: e.target.value })} /></label>
              <label className={f}>Upah pokok / bulan (Rp)<Input type="number" min={0} value={form.data.salary ?? ""} onChange={(e) => setData({ salary: Number(e.target.value) })} /></label>
              <label className={`${f} sm:col-span-2`}>Tempat kerja<Input value={form.data.workplace ?? ""} onChange={(e) => setData({ workplace: e.target.value })} /></label>
            </div>
          )}

          {type === "mutation" && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className={f}>Berlaku mulai *<Input type="date" value={form.effectiveDate} onChange={(e) => set({ effectiveDate: e.target.value })} /></label>
              <label className={f}>Departemen baru<Input value={form.data.toDepartment ?? ""} onChange={(e) => setData({ toDepartment: e.target.value })} placeholder={selected?.department} /></label>
              <label className={f}>Jabatan baru<Input value={form.data.toRole ?? ""} onChange={(e) => setData({ toRole: e.target.value })} placeholder={selected?.role} /></label>
              <label className={f}>Atasan langsung baru
                <select value={form.data.toManagerId ?? ""} onChange={(e) => { const m = employees.options.find((o) => o.id === e.target.value); if (m) employees.remember(m); setData({ toManagerId: e.target.value || undefined }); }} className={selectCls}>
                  <option value="">Tidak berubah</option>
                  {form.data.toManagerId && !employees.options.some((o) => o.id === form.data.toManagerId) && <option value={form.data.toManagerId}>(atasan terpilih)</option>}
                  {employees.options.filter((o) => o.id !== form.employeeId).map((e) => <option key={e.id} value={e.id}>{e.name} ({e.nip})</option>)}
                </select>
              </label>
            </div>
          )}

          {type === "summons" && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className={f}>Tanggal pertemuan<Input type="date" value={form.data.meetingDate ?? ""} onChange={(e) => setData({ meetingDate: e.target.value })} /></label>
              <label className={f}>Pukul<Input type="time" value={form.data.meetingTime ?? ""} onChange={(e) => setData({ meetingTime: e.target.value })} /></label>
              <label className={`${f} sm:col-span-2`}>Tempat<Input value={form.data.place ?? ""} onChange={(e) => setData({ place: e.target.value })} /></label>
              <label className={`${f} sm:col-span-4`}>Keperluan<Input value={form.data.reason ?? ""} onChange={(e) => setData({ reason: e.target.value })} placeholder="mis. klarifikasi ketidakhadiran tanggal ..." /></label>
            </div>
          )}

          {(type === "reprimand" || type === "warning") && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {type === "warning" && (
                <>
                  <label className={f}>Tingkat
                    <select value={form.level} onChange={(e) => set({ level: Number(e.target.value) })} className={selectCls}><option value={1}>SP I</option><option value={2}>SP II</option><option value={3}>SP III</option></select>
                  </label>
                  <label className={f}>Berlaku mulai<Input type="date" value={form.effectiveDate} placeholder={form.date} onChange={(e) => set({ effectiveDate: e.target.value })} /></label>
                  <label className={f}>Masa berlaku (bulan)<Input type="number" min={1} max={12} value={form.data.validMonths ?? ""} placeholder="6" onChange={(e) => setData({ validMonths: Number(e.target.value) })} /></label>
                  <span />
                </>
              )}
              <label className={`${f} sm:col-span-4`}>Pelanggaran yang dilakukan *<textarea value={form.data.violation ?? ""} onChange={(e) => setData({ violation: e.target.value })} rows={3} className="w-full rounded-md border border-input bg-background p-2 text-xs" /></label>
              <label className={`${f} sm:col-span-4`}>Konsekuensi (opsional, ganti kalimat standar)<Input value={form.data.consequence ?? ""} onChange={(e) => setData({ consequence: e.target.value })} /></label>
            </div>
          )}

          {type === "termination" && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className={`${f} sm:col-span-3`}>Alasan PHK *<Input list="termination-reasons" value={form.data.terminationReason ?? ""} onChange={(e) => setData({ terminationReason: e.target.value })} /></label>
              <datalist id="termination-reasons">{TERMINATION_REASONS.map((r) => <option key={r} value={r} />)}</datalist>
              <label className={f}>Hari terakhir bekerja *<Input type="date" value={form.data.lastWorkDay ?? ""} onChange={(e) => setData({ lastWorkDay: e.target.value })} /></label>
              <label className={f}>Uang pesangon (Rp)<Input type="number" min={0} value={form.data.severance ?? ""} onChange={(e) => setData({ severance: Number(e.target.value) })} /></label>
              <label className={f}>Uang penghargaan masa kerja (Rp)<Input type="number" min={0} value={form.data.serviceAward ?? ""} onChange={(e) => setData({ serviceAward: Number(e.target.value) })} /></label>
              <label className={f}>Uang penggantian hak (Rp)<Input type="number" min={0} value={form.data.compensationRights ?? ""} onChange={(e) => setData({ compensationRights: Number(e.target.value) })} /></label>
              <p className="text-[11px] text-muted-foreground self-end">Nominal diisi manual sesuai perhitungan HR; sistem tidak menghitung pesangon.</p>
              <label className={`${f} sm:col-span-4`}>Catatan tambahan<Input value={form.data.notes ?? ""} onChange={(e) => setData({ notes: e.target.value })} /></label>
            </div>
          )}

          {type === "overtime_order" && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className={f}>Tanggal lembur<Input type="date" value={form.data.workDate ?? ""} onChange={(e) => setData({ workDate: e.target.value })} /></label>
              <label className={f}>Mulai<Input type="time" value={form.data.startTime ?? ""} onChange={(e) => setData({ startTime: e.target.value })} /></label>
              <label className={f}>Selesai<Input type="time" value={form.data.endTime ?? ""} onChange={(e) => setData({ endTime: e.target.value })} /></label>
              <label className={`${f} sm:col-span-4`}>Pekerjaan yang dilakukan *<Input value={form.data.tasks ?? ""} onChange={(e) => setData({ tasks: e.target.value })} /></label>
            </div>
          )}

          {type === "memo" && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className={f}>Ditujukan kepada
                <select value={form.data.audienceAll ? "all" : form.data.audienceDepartment ? "dept" : "people"} onChange={(e) => setData({ audienceAll: e.target.value === "all", audienceDepartment: e.target.value === "dept" ? form.data.audienceDepartment || " " : "" })} className={selectCls}>
                  <option value="all">Semua karyawan</option><option value="dept">Satu departemen</option><option value="people">Karyawan tertentu</option>
                </select>
              </label>
              {!form.data.audienceAll && form.data.audienceDepartment && <label className={`${f} sm:col-span-2`}>Departemen<Input value={form.data.audienceDepartment.trim()} onChange={(e) => setData({ audienceDepartment: e.target.value || " " })} /></label>}
            </div>
          )}

          {(type === "memo" || type === "overtime_order") && !form.data.audienceAll && !form.data.audienceDepartment && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><span className="text-xs font-bold">Karyawan {type === "overtime_order" ? "* " : ""}({form.recipientIds.length} dipilih)</span>
                <Input value={employees.search} onChange={(e) => employees.setSearch(e.target.value)} placeholder="Cari nama / NIP" className="max-w-xs h-8 text-xs" aria-label="Cari karyawan" /></div>
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {employees.options.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={form.recipientIds.includes(e.id)} onChange={() => { employees.remember(e); toggleRecipient(e.id); }} />
                    {e.name} <span className="text-muted-foreground">({e.nip}) {e.department}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className={f}>Penandatangan *<Input value={form.signerName} onChange={(e) => set({ signerName: e.target.value })} /></label>
            <label className={f}>Jabatan penandatangan<Input value={form.signerTitle} onChange={(e) => set({ signerTitle: e.target.value })} /></label>
            <label className={f}>Perihal (kosong = otomatis)<Input value={form.subject} onChange={(e) => set({ subject: e.target.value })} /></label>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold">Isi surat{type === "memo" ? " *" : " (kosong = teks standar)"}</label>
              {type !== "memo" && <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" disabled={busy || !canSave} onClick={preview}>Muat teks standar</Button>}
            </div>
            <textarea value={form.body} onChange={(e) => set({ body: e.target.value })} rows={type === "memo" ? 8 : 10} className="w-full rounded-md border border-input bg-background p-2 text-xs font-mono" placeholder={type === "memo" ? "Tulis isi memo..." : "Klik \"Muat teks standar\" untuk melihat dan menyunting teks sebelum disimpan."} />
          </div>

          <div className="flex justify-end">
            <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || !canSave} onClick={save}>{busy ? "Menyimpan..." : editingId ? "Perbarui draft" : "Simpan sebagai draft"}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="text-sm font-bold mr-auto">{cfg.label}</div>
          <label className="space-y-1 text-xs font-semibold">Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${selectCls} w-32`}><option value="">Semua</option><option value="draft">Draft</option><option value="issued">Terbit</option><option value="cancelled">Batal</option></select>
          </label>
          <label className="space-y-1 text-xs font-semibold">Cari<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nomor, nama, NIP" className="w-48" /></label>
        </div>
        <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
          <table className="w-full"><thead><tr><th className={th}>Nomor</th><th className={th}>Tanggal</th><th className={th}>{cfg.singleEmployee ? "Karyawan" : "Kepada"}</th><th className={th}>Perihal</th><th className={th}>Berlaku</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody>
              {letters.loading && <tr><td className={td} colSpan={7}>Memuat...</td></tr>}
              {letters.error && <tr><td className={`${td} text-rose-700`} colSpan={7}>{letters.error}</td></tr>}
              {!letters.loading && letters.data?.length === 0 && <tr><td className={td} colSpan={7}>Belum ada surat.</td></tr>}
              {letters.data?.map((l) => {
                const inEffect = !l.effectiveDate || l.effectiveDate <= today();
                const needsApply = l.status === "issued" && !l.applied && l.data.applyToEmployee && inEffect;
                return (
                  <tr key={l.id} className="border-t border-border align-top">
                    <td className={`${td} font-mono font-bold`}>{l.number || <span className="text-muted-foreground font-normal">(belum bernomor)</span>}</td>
                    <td className={td}>{l.date}</td>
                    <td className={td}>{l.employeeName || (l.data.audienceAll ? "Semua karyawan" : l.data.audienceDepartment?.trim() || `${l.recipients?.length ?? 0} karyawan`)}{l.nip && <div className="text-[10px] text-muted-foreground font-mono">{l.nip}</div>}</td>
                    <td className={td}>{l.subject}</td>
                    <td className={td}>{l.effectiveDate || "-"}{l.endDate ? ` s.d. ${l.endDate}` : ""}{l.applied && <div className="text-[10px] text-emerald-700">diterapkan ke data karyawan</div>}</td>
                    <td className={td}><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_CLS[l.status]}`}>{STATUS_LABEL[l.status]}</span>{l.acknowledgedAt && <div className="text-[10px] text-muted-foreground">diterima {l.acknowledgedAt.slice(0, 10)}</div>}{l.cancelReason && <div className="text-[10px] text-rose-700">{l.cancelReason}</div>}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        {l.status !== "cancelled" && <Link href={`/hrm/letters/${l.id}/print`} target="_blank" className="inline-flex items-center h-7 px-2 rounded-md border border-border text-[11px] font-semibold hover:bg-slate-50">Cetak</Link>}
                        {l.status === "draft" && <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={busy} onClick={() => edit(l)}>Sunting</Button>}
                        {l.status === "draft" && <Button size="sm" className="h-7 text-[11px]" disabled={busy} onClick={() => run(() => hrLettersApi.issue(l.id), "Surat diterbitkan.")}>Terbitkan</Button>}
                        {l.status === "issued" && !l.acknowledgedAt && <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={busy} onClick={() => run(() => hrLettersApi.acknowledge(l.id), "Tanda terima dicatat.")}>Diterima</Button>}
                        {needsApply && <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={busy} onClick={() => run(() => hrLettersApi.apply(l.id), "Diterapkan ke data karyawan.")}>Terapkan</Button>}
                        {l.status !== "cancelled" && !l.applied && <Button variant="outline" size="sm" className="h-7 text-[11px] text-rose-700" disabled={busy} onClick={() => askCancel(l)}>Batalkan</Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody></table>
        </CardContent></Card>
      </div>
    </div>
  );
}
