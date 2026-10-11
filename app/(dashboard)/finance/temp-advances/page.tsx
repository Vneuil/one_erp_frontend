"use client";

import * as React from "react";
import { Plus, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { downloadCsv } from "@/lib/utils/csv";
import { financeApi, AccountItem, TempAdvanceItem, OutstandingTempAdvances } from "@/lib/api/finance";

type Tab = "list" | "outstanding";
interface DraftLine { accountCode: string; description: string; amount: number }

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const emptyLine = (): DraftLine => ({ accountCode: "", description: "", amount: 0 });
const STATUS_LABEL: Record<TempAdvanceItem["status"], string> = { open: "Belum selesai", settled: "Selesai", cancelled: "Dibatalkan" };

export default function TempAdvancesPage() {
  const [tab, setTab] = React.useState<Tab>("list");
  const [advances, setAdvances] = React.useState<TempAdvanceItem[]>([]);
  const [accounts, setAccounts] = React.useState<AccountItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Issue form
  const [recipient, setRecipient] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [date, setDate] = React.useState(today());
  const [dueDate, setDueDate] = React.useState("");
  const [cashCode, setCashCode] = React.useState("1000");

  // Settlement panel
  const [settling, setSettling] = React.useState<TempAdvanceItem | null>(null);
  const [settleDate, setSettleDate] = React.useState(today());
  const [lines, setLines] = React.useState<DraftLine[]>([emptyLine()]);

  // Outstanding report (key-tagged so "loading" is derived, not set in an effect)
  const [asOf, setAsOf] = React.useState(today());
  const [report, setReport] = React.useState<{ key: string; data?: OutstandingTempAdvances; error?: string } | null>(null);
  const reportKey = `${asOf}|${advances.length}|${advances.filter((a) => a.status === "open").length}`;

  const reload = React.useCallback(() => financeApi.listTempAdvances().then((r) => setAdvances(r.data || [])), []);

  React.useEffect(() => {
    let alive = true;
    Promise.all([financeApi.listTempAdvances(), financeApi.listAccounts({ perPage: 500 })])
      .then(([v, a]) => {
        if (!alive) return;
        setAdvances(v.data || []);
        setAccounts((a.data || []).filter((x) => x.isActive));
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat data.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (tab !== "outstanding") return;
    let alive = true;
    financeApi
      .outstandingTempAdvances(asOf)
      .then((r) => alive && setReport({ key: reportKey, data: r.data }))
      .catch((e) => alive && setReport({ key: reportKey, error: errText(e, "Gagal memuat laporan.") }));
    return () => {
      alive = false;
    };
  }, [tab, asOf, reportKey]);

  const cashAccounts = accounts.filter((a) => a.type === "asset" && /^10\d\d$/.test(a.code));
  const expenseAccounts = accounts.filter((a) => a.type === "expense");
  const spent = lines.reduce((s, l) => s + (l.amount > 0 ? l.amount : 0), 0);
  const diff = settling ? settling.amount - spent : 0;
  const linesValid = lines.every((l) => (!l.accountCode && !l.amount) || (l.accountCode && l.amount > 0));

  const issue = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await financeApi.issueTempAdvance({ recipientName: recipient, purpose, amount, date, dueDate: dueDate || undefined, cashAccountCode: cashCode });
      setNotice(`KBS ${res.data.number} dicatat dan dijurnal.`);
      setRecipient("");
      setPurpose("");
      setAmount(0);
      setDueDate("");
      await reload();
    } catch (e) {
      setError(errText(e, "Gagal mencatat KBS."));
      reload().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const startSettle = (a: TempAdvanceItem) => {
    setSettling(a);
    setSettleDate(today());
    setLines([emptyLine()]);
    setError(null);
    setNotice(null);
  };

  const settle = async () => {
    if (!settling) return;
    setBusy(true);
    setError(null);
    try {
      const res = await financeApi.settleTempAdvance(settling.id, {
        date: settleDate,
        lines: lines.filter((l) => l.accountCode && l.amount > 0).map((l) => ({ accountCode: l.accountCode, description: l.description, amount: l.amount })),
      });
      setNotice(`KBS ${res.data.number} diselesaikan.`);
      setSettling(null);
      await reload();
    } catch (e) {
      setError(errText(e, "Gagal menyelesaikan KBS."));
      reload().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (a: TempAdvanceItem) => {
    if (!window.confirm(`Batalkan KBS ${a.number}? Kas akan dikembalikan lewat jurnal pembalik.`)) return;
    setBusy(true);
    setError(null);
    try {
      await financeApi.cancelTempAdvance(a.id);
      setNotice(`KBS ${a.number} dibatalkan.`);
      await reload();
    } catch (e) {
      setError(errText(e, "Gagal membatalkan KBS."));
    } finally {
      setBusy(false);
    }
  };

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";
  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-xs";
  const rep = report && report.key === reportKey ? report : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Kas Bon Sementara (KBS)" description="Pencairan uang muka sementara, pertanggungjawaban dengan bukti biaya, dan laporan KBS yang belum selesai. Setiap tahap otomatis dijurnal." />

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <div className="flex gap-1.5">
        {([["list", "Daftar KBS"], ["outstanding", "KBS Belum Selesai"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${tab === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="text-xs font-bold">Cairkan KBS baru</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <label className="space-y-1 text-xs font-semibold">Penerima *<Input value={recipient} onChange={(e) => setRecipient(e.target.value)} /></label>
                <label className="space-y-1 text-xs font-semibold">Jumlah (Rp) *<Input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></label>
                <label className="space-y-1 text-xs font-semibold">Tanggal<Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
                <label className="space-y-1 text-xs font-semibold">Batas pertanggungjawaban<Input type="date" min={date} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
                <label className="sm:col-span-3 space-y-1 text-xs font-semibold">Keperluan<Input value={purpose} onChange={(e) => setPurpose(e.target.value)} /></label>
                <label className="space-y-1 text-xs font-semibold">
                  Dari Kas / Bank
                  <select value={cashCode} onChange={(e) => setCashCode(e.target.value)} className={sel}>
                    {!cashAccounts.some((a) => a.code === "1000") && <option value="1000">Kas (1000)</option>}
                    {cashAccounts.map((a) => <option key={a.id} value={a.code}>{a.name} ({a.code})</option>)}
                  </select>
                </label>
              </div>
              <div className="flex justify-end">
                <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || !recipient.trim() || amount <= 0} onClick={issue}>{busy ? "Menyimpan..." : "Cairkan KBS"}</Button>
              </div>
            </CardContent>
          </Card>

          {settling && (
            <Card className="border-brand-primary/40 shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold">Pertanggungjawaban {settling.number} · {settling.recipientName} · <MoneyDisplay amount={settling.amount} /></div>
                  <label className="text-xs font-semibold flex items-center gap-2">Tanggal<Input type="date" min={settling.date} max={today()} value={settleDate} onChange={(e) => setSettleDate(e.target.value)} className="h-8 w-40" /></label>
                </div>
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <label className="sm:col-span-5 space-y-1 text-[11px] font-semibold">
                      {i === 0 && "Akun biaya"}
                      <select value={l.accountCode} onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, accountCode: e.target.value } : x)))} className={sel} aria-label={`Akun biaya baris ${i + 1}`}>
                        <option value="">Pilih akun...</option>
                        {expenseAccounts.map((a) => <option key={a.id} value={a.code}>{a.code} - {a.name}</option>)}
                      </select>
                    </label>
                    <label className="sm:col-span-4 space-y-1 text-[11px] font-semibold">{i === 0 && "Keterangan / no. bukti"}<Input value={l.description} onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} /></label>
                    <label className="sm:col-span-2 space-y-1 text-[11px] font-semibold">{i === 0 && "Jumlah (Rp)"}<Input type="number" min={0} value={l.amount || ""} onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)))} /></label>
                    <Button type="button" variant="outline" size="sm" className="h-9 sm:col-span-1" disabled={lines.length === 1} onClick={() => setLines((p) => p.filter((_, j) => j !== i))} aria-label={`Hapus baris ${i + 1}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setLines((p) => [...p, emptyLine()])}><Plus className="h-3.5 w-3.5" /> Tambah baris</Button>
                  <div className="text-xs space-x-4">
                    <span>Terpakai: <b><MoneyDisplay amount={spent} /></b></span>
                    <span className={diff < 0 ? "text-rose-700" : "text-emerald-700"}>
                      {diff >= 0 ? "Sisa dikembalikan ke kas: " : "Kekurangan dibayar perusahaan: "}<b><MoneyDisplay amount={Math.abs(diff)} /></b>
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setSettling(null)}>Batal</Button>
                  <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || !linesValid} onClick={settle}>{busy ? "Memproses..." : "Selesaikan KBS"}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead><tr>{["No. KBS", "Tanggal", "Penerima / Keperluan", "Jumlah", "Terpakai", "Status", "Aksi"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {loading && <tr><td className={td} colSpan={7}>Memuat data...</td></tr>}
                  {!loading && advances.length === 0 && <tr><td className={td} colSpan={7}>Belum ada KBS.</td></tr>}
                  {advances.map((a) => (
                    <tr key={a.id} className="border-t border-border align-top">
                      <td className={`${td} font-mono font-bold`}>{a.number}</td>
                      <td className={td}>{a.date}{a.dueDate ? <div className="text-[10px] text-muted-foreground">Batas {a.dueDate}</div> : null}</td>
                      <td className={td}><div className="font-semibold">{a.recipientName}</div><div className="text-muted-foreground">{a.purpose}</div></td>
                      <td className={`${td} font-bold`}><MoneyDisplay amount={a.amount} /></td>
                      <td className={td}>{a.status === "settled" ? <MoneyDisplay amount={a.spentTotal} /> : "-"}</td>
                      <td className={td}>{STATUS_LABEL[a.status]}{a.status === "settled" && a.settledDate ? ` · ${a.settledDate}` : ""}</td>
                      <td className={td}>
                        {a.status === "open" && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={busy} onClick={() => startSettle(a)}>Pertanggungjawaban</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] border-rose-200 text-rose-700" disabled={busy} onClick={() => cancel(a)}>Batalkan</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "outstanding" && (
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="space-y-1 text-xs font-semibold">Per tanggal<Input type="date" max={today()} value={asOf} onChange={(e) => setAsOf(e.target.value || today())} className="h-9 w-44" /></label>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                disabled={!rep?.data}
                onClick={() =>
                  rep?.data &&
                  downloadCsv(`kbs-belum-selesai-${rep.data.asOf}.csv`, ["No. KBS", "Tanggal", "Batas", "Penerima", "Keperluan", "Jumlah", "Umur (hari)", "Lewat batas"],
                    rep.data.rows.map((r) => [r.number, r.date, r.dueDate ?? "", r.recipientName, r.purpose, r.amount, r.ageDays, r.overdue ? "Ya" : "Tidak"]))
                }
              >
                <Download className="h-3.5 w-3.5" /> Ekspor CSV
              </Button>
            </div>
            {rep?.error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{rep.error}</div>}
            {!rep && <div className="text-xs text-muted-foreground">Memuat laporan...</div>}
            {rep?.data && (
              <>
                <div className="flex flex-wrap gap-6 text-xs">
                  <span>Total belum selesai: <b><MoneyDisplay amount={rep.data.total} /></b> ({rep.data.rows.length} KBS)</span>
                  <span className="text-rose-700">Lewat batas: <b><MoneyDisplay amount={rep.data.overdueTotal} /></b></span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr>{["No. KBS", "Tanggal", "Batas", "Penerima", "Keperluan", "Jumlah", "Umur"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {rep.data.rows.length === 0 && <tr><td className={td} colSpan={7}>Tidak ada KBS yang belum selesai.</td></tr>}
                      {rep.data.rows.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className={`${td} font-mono font-bold`}>{r.number}</td>
                          <td className={td}>{r.date}</td>
                          <td className={`${td} ${r.overdue ? "text-rose-700 font-bold" : ""}`}>{r.dueDate || "-"}{r.overdue ? " (lewat)" : ""}</td>
                          <td className={td}>{r.recipientName}</td>
                          <td className={td}>{r.purpose}</td>
                          <td className={`${td} font-bold`}><MoneyDisplay amount={r.amount} /></td>
                          <td className={td}>{r.ageDays} hari</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
