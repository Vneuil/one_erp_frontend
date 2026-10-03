"use client";

import * as React from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useNavigationAccess } from "@/providers/navigation-access";
import { useIsOwnDocument } from "@/lib/hooks/use-own-document";
import { hropsApi, CashAdvanceItem } from "@/lib/api/hrops";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
const STATUS: Record<string, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" };

export default function CashAdvancesPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("hrm");
  const isOwn = useIsOwnDocument();

  const [items, setItems] = React.useState<CashAdvanceItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [amount, setAmount] = React.useState(0);
  const [installments, setInstallments] = React.useState(3);
  const [startPeriod, setStartPeriod] = React.useState(thisMonth());
  const [reason, setReason] = React.useState("");

  // Approvers see everyone's requests; everyone else only their own.
  const load = React.useCallback(() => (mayApprove ? hropsApi.allAdvances() : hropsApi.myAdvances()), [mayApprove]);

  React.useEffect(() => {
    let alive = true;
    load()
      .then((r) => {
        if (!alive) return;
        setItems(r.data || []);
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat kasbon.")))
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
      const r = await load();
      setItems(r.data || []);
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const monthly = installments > 0 ? Math.floor((amount / installments) * 100) / 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-brand-dark flex items-center gap-2"><Wallet className="h-5 w-5" /> Kasbon Karyawan</h1>
        <p className="text-xs text-muted-foreground">Pinjaman dari perusahaan yang dicicil lewat potongan gaji bulanan mulai periode yang dipilih. Satu kasbon aktif per karyawan. Pencairan dan cicilan dijurnal otomatis.</p>
      </div>
      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-5 items-end">
          <label className="space-y-1 text-xs font-semibold">Jumlah (Rp)<Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
          <label className="space-y-1 text-xs font-semibold">Cicilan (bulan)<Input type="number" min={1} max={12} value={installments} onChange={(e) => setInstallments(Number(e.target.value))} /></label>
          <label className="space-y-1 text-xs font-semibold">Mulai periode<Input type="month" value={startPeriod} onChange={(e) => setStartPeriod(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold sm:col-span-2">Alasan<Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></label>
          <div className="sm:col-span-5 flex items-center gap-3">
            <Button
              size="sm"
              disabled={busy || amount <= 0 || installments < 1 || installments > 12 || !startPeriod}
              onClick={() => run(async () => { await hropsApi.requestAdvance({ amount, installments, startPeriod, reason }); setAmount(0); setReason(""); }, "Pengajuan kasbon dikirim.")}
              className="text-xs font-bold"
            >Ajukan kasbon</Button>
            {amount > 0 && <span className="text-[11px] text-muted-foreground">≈ <MoneyDisplay amount={monthly} /> per bulan</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <p className="p-4 text-xs text-muted-foreground">Memuat…</p> : items.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">Belum ada kasbon.</p>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground border-b"><th className="p-3">Karyawan</th><th className="p-3 text-right">Jumlah</th><th className="p-3">Cicilan</th><th className="p-3 text-right">Sisa</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead>
              <tbody>
                {items.map((a) => {
                  // The server also refuses these; hiding the buttons avoids a pointless error.
                  const mine = isOwn(a.requestedByEmail);
                  return (
                    <tr key={a.id} className="border-b">
                      <td className="p-3"><div className="font-semibold">{a.employeeName}</div><div className="text-[10px] text-muted-foreground">{a.nip} · {a.reason || "-"}</div></td>
                      <td className="p-3 text-right"><MoneyDisplay amount={a.amount} /></td>
                      <td className="p-3">{a.installments}× <MoneyDisplay amount={a.monthly} /> dari {a.startPeriod}</td>
                      <td className="p-3 text-right">{a.status === "approved" ? (a.settled ? "Lunas" : <MoneyDisplay amount={a.outstanding} />) : "-"}</td>
                      <td className="p-3 font-bold">{STATUS[a.status] ?? a.status}{a.decidedBy ? <div className="text-[10px] font-normal text-muted-foreground">oleh {a.decidedBy}</div> : null}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {a.status === "pending" && mayApprove && !mine && (
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" disabled={busy} onClick={() => run(() => hropsApi.decideAdvance(a.id, true), "Kasbon disetujui.")} className="h-7 px-2 text-[11px] font-bold">Setujui</Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => hropsApi.decideAdvance(a.id, false), "Kasbon ditolak.")} className="h-7 px-2 text-[11px]">Tolak</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
