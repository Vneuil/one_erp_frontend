"use client";

import * as React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { hrmApi, EmployeeItem } from "@/lib/api/hrm";
import { hropsApi, EmployeeDocumentItem } from "@/lib/api/hrops";
import { downloadFromApi, checkUpload, UPLOAD_ACCEPT } from "@/lib/utils/download";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const DOC_TYPES = ["KTP", "NPWP", "Kontrak Kerja", "Ijazah", "Sertifikat", "BPJS", "Lainnya"];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

export default function EmployeeDocumentsPage() {
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [employeeId, setEmployeeId] = React.useState("");
  const [docs, setDocs] = React.useState<EmployeeDocumentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [docType, setDocType] = React.useState(DOC_TYPES[0]);
  const [fileRef, setFileRef] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const fileError = checkUpload(file);
  const [expiresOn, setExpiresOn] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    hrmApi
      .listEmployees({ perPage: 500 })
      .then((r) => alive && setEmployees(r.data || []))
      .catch((e) => alive && setError(errText(e, "Gagal memuat karyawan.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const pick = (id: string) => {
    setEmployeeId(id);
    setDocs([]);
    if (!id) return;
    hropsApi
      .documents(id)
      .then((r) => setDocs(r.data || []))
      .catch((e) => setError(errText(e, "Gagal memuat dokumen.")));
  };

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setDocs((await hropsApi.documents(employeeId)).data || []);
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-brand-primary" />
          <span>Dokumen Karyawan</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Arsip dokumen per karyawan (KTP, kontrak, ijazah, sertifikat) dengan tanggal kedaluwarsa. Unggah berkas ke ONE Drive, lalu tempel ID atau tautannya di sini.
        </p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <select value={employeeId} onChange={(e) => pick(e.target.value)} disabled={loading} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
        <option value="">Pilih karyawan…</option>
        {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.nip})</option>)}
      </select>

      {employeeId && (
        <>
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <label className="space-y-1 text-xs font-semibold">Judul<Input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
              <label className="space-y-1 text-xs font-semibold">
                Jenis
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                  {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold">Unggah berkas<Input type="file" accept={UPLOAD_ACCEPT} aria-label="Berkas dokumen" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {fileError && <span className="text-[10px] text-rose-700">{fileError}</span>}
              </label>
              <label className="space-y-1 text-xs font-semibold">atau ID/tautan berkas<Input value={fileRef} disabled={!!file} onChange={(e) => setFileRef(e.target.value)} /></label>
              <label className="space-y-1 text-xs font-semibold">Kedaluwarsa<Input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} /></label>
              <Button
                size="sm"
                disabled={busy || !title.trim() || !!fileError}
                onClick={() => run(async () => {
                  if (file) await hropsApi.uploadDocument(employeeId, { title, docType, expiresOn: expiresOn || undefined }, file);
                  else await hropsApi.addDocument(employeeId, { title, docType, fileRef, expiresOn: expiresOn || undefined });
                  setTitle(""); setFileRef(""); setFile(null);
                }, "Dokumen ditambahkan.")}
                className="h-9 text-xs font-bold"
              >
                Tambah
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>{["Judul", "Jenis", "Berkas", "Kedaluwarsa", ""].map((h) => <th key={h} className="text-left text-[11px] font-bold text-muted-foreground px-3 py-2">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {docs.length === 0 && <tr><td className="px-3 py-3 text-xs" colSpan={5}>Belum ada dokumen.</td></tr>}
                  {docs.map((d) => {
                    const expired = !!d.expiresOn && d.expiresOn < today();
                    return (
                      <tr key={d.id} className="border-t border-border">
                        <td className="px-3 py-2 text-xs font-medium">{d.title}</td>
                        <td className="px-3 py-2 text-xs">{d.docType}</td>
                        <td className="px-3 py-2 text-xs break-all">
                          {d.fileName ? (
                            <button type="button" className="underline cursor-pointer" onClick={() => downloadFromApi(`/hrm/documents/${d.id}/file`, d.fileName!).catch((e) => setError(e instanceof Error ? e.message : "Gagal mengunduh."))}>{d.fileName}</button>
                          ) : /^https?:\/\//.test(d.fileRef) ? <a href={d.fileRef} target="_blank" rel="noreferrer" className="underline">{d.fileRef}</a> : d.fileRef || "-"}
                        </td>
                        <td className={`px-3 py-2 text-xs ${expired ? "text-rose-600 font-bold" : ""}`}>{d.expiresOn ? `${d.expiresOn}${expired ? " (kedaluwarsa)" : ""}` : "-"}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => hropsApi.deleteDocument(d.id), "Dokumen dihapus.")} className="h-7 px-2 text-[11px] text-rose-600 border-rose-200">Hapus</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
