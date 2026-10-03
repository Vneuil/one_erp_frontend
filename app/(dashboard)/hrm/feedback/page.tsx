"use client";

import * as React from "react";
import { MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigationAccess } from "@/providers/navigation-access";
import { hrmApi, EmployeeItem } from "@/lib/api/hrm";
import { hropsApi, FeedbackSummary } from "@/lib/api/hrops";
import { useAppStore } from "@/stores/app-store";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const COMPETENCIES = [
  ["communication", "Komunikasi"],
  ["teamwork", "Kerja sama tim"],
  ["leadership", "Kepemimpinan"],
  ["reliability", "Keandalan"],
] as const;
const RELATIONSHIPS = [
  ["peer", "Rekan sejawat"],
  ["manager", "Atasan"],
  ["subordinate", "Bawahan"],
  ["self", "Diri sendiri"],
] as const;

export default function Feedback360Page() {
  const { canApprove } = useNavigationAccess();
  const canSeeSummary = canApprove("hrm");
  const email = useAppStore((s) => s.currentUser?.email ?? "");

  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [subject, setSubject] = React.useState("");
  const [relationship, setRelationship] = React.useState("peer");
  const [period, setPeriod] = React.useState(String(new Date().getFullYear()));
  const [ratings, setRatings] = React.useState<Record<string, number>>({ communication: 3, teamwork: 3, leadership: 3, reliability: 3 });
  const [comment, setComment] = React.useState("");

  const [summarySubject, setSummarySubject] = React.useState("");
  const [summary, setSummary] = React.useState<FeedbackSummary | null>(null);

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

  const subjectEmp = employees.find((e) => e.id === subject);
  const isSelf = !!subjectEmp && subjectEmp.email.toLowerCase() === email.toLowerCase();

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await hropsApi.submitFeedback({
        subjectId: subject,
        relationship: isSelf ? "self" : relationship,
        period,
        communication: ratings.communication,
        teamwork: ratings.teamwork,
        leadership: ratings.leadership,
        reliability: ratings.reliability,
        comment,
      });
      setComment("");
      setNotice("Feedback terkirim. Identitas Anda tidak ditampilkan kepada yang dinilai.");
    } catch (e) {
      setError(errText(e, "Gagal mengirim feedback."));
    } finally {
      setBusy(false);
    }
  };

  const loadSummary = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await hropsApi.feedbackSummary(summarySubject, period);
      setSummary(r.data);
    } catch (e) {
      setError(errText(e, "Gagal memuat ringkasan."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <MessagesSquare className="h-6 w-6 text-brand-primary" />
          <span>Feedback 360°</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Penilaian dari rekan, atasan, bawahan, dan diri sendiri. Pemberi nilai bersifat anonim, dan ringkasan baru tampil setelah minimal 3 penilai selain diri sendiri.
        </p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="text-xs font-bold">Beri penilaian</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1 text-xs font-semibold">
              Karyawan yang dinilai
              <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={loading} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                <option value="">Pilih karyawan…</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.nip})</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Hubungan Anda
              <select value={isSelf ? "self" : relationship} onChange={(e) => setRelationship(e.target.value)} disabled={isSelf} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                {RELATIONSHIPS.filter(([k]) => (isSelf ? k === "self" : k !== "self")).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Periode
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026 atau 2026-Q3" />
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COMPETENCIES.map(([k, l]) => (
              <label key={k} className="space-y-1 text-xs font-semibold">
                {l}: {ratings[k]}
                <input type="range" min={1} max={5} value={ratings[k]} onChange={(e) => setRatings({ ...ratings, [k]: Number(e.target.value) })} className="w-full" />
              </label>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Komentar (opsional)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs" />
          <Button size="sm" disabled={busy || !subject || !period.trim()} onClick={submit} className="h-9 text-xs font-bold">
            Kirim Penilaian
          </Button>
        </CardContent>
      </Card>

      {canSeeSummary && (
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-3">
            <div className="text-xs font-bold">Ringkasan hasil (HR)</div>
            <div className="flex flex-wrap gap-3 items-end">
              <select value={summarySubject} onChange={(e) => { setSummarySubject(e.target.value); setSummary(null); }} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                <option value="">Pilih karyawan…</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <Button size="sm" variant="outline" disabled={busy || !summarySubject} onClick={loadSummary} className="h-9 text-xs font-bold">
                Lihat Ringkasan (periode {period})
              </Button>
            </div>
            {summary && (
              summary.count === 0 || Object.keys(summary.overall).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {summary.count} penilaian masuk. Ringkasan disembunyikan sampai ada minimal 3 penilai selain diri sendiri.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{summary.count} penilaian</p>
                  <table className="text-xs">
                    <thead><tr><th className="text-left pr-6 py-1">Kompetensi</th><th className="pr-6">Rata-rata</th>{Object.keys(summary.byRelationship).map((r) => <th key={r} className="pr-6 capitalize">{r}</th>)}</tr></thead>
                    <tbody>
                      {COMPETENCIES.map(([k, l]) => (
                        <tr key={k} className="border-t border-border">
                          <td className="py-1 pr-6">{l}</td>
                          <td className="pr-6 text-center font-bold">{summary.overall[k]}</td>
                          {Object.values(summary.byRelationship).map((v, i) => <td key={i} className="pr-6 text-center">{v[k]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {summary.comments.length > 0 && (
                    <ul className="list-disc pl-5 text-xs space-y-0.5">
                      {summary.comments.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  )}
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
