"use client";

import * as React from "react";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { StatusBadge } from "@/components/shared/status-badge";
import { salesApi, SalesOrderItem, BillingTermItem } from "@/lib/api/sales";

interface DraftTerm {
  label: string;
  percent: number;
  dueInDays: number;
}

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const PRESETS: { name: string; terms: DraftTerm[] }[] = [
  { name: "50% / 50%", terms: [{ label: "Uang muka", percent: 50, dueInDays: 0 }, { label: "Pelunasan", percent: 50, dueInDays: 30 }] },
  { name: "30% / 40% / 30%", terms: [{ label: "Uang muka", percent: 30, dueInDays: 0 }, { label: "Progres", percent: 40, dueInDays: 30 }, { label: "Pelunasan", percent: 30, dueInDays: 60 }] },
  { name: "Lunas sekaligus", terms: [{ label: "Pelunasan", percent: 100, dueInDays: 30 }] },
];

export default function BillingTermsPage() {
  const [orders, setOrders] = React.useState<SalesOrderItem[]>([]);
  const [orderId, setOrderId] = React.useState("");
  const [schedule, setSchedule] = React.useState<BillingTermItem[]>([]);
  const [draft, setDraft] = React.useState<DraftTerm[]>(PRESETS[0].terms);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    salesApi
      .listOrders({ perPage: 200 })
      .then((r) => alive && setOrders((r.data || []).filter((o) => o.status !== "rejected" && o.status !== "pending_approval")))
      .catch((e) => alive && setError(errText(e, "Gagal memuat sales order.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const pick = (id: string) => {
    setOrderId(id);
    setSchedule([]);
    setNotice(null);
    if (!id) return;
    salesApi
      .listBillingSchedule(id)
      .then((r) => setSchedule(r.data || []))
      .catch((e) => setError(errText(e, "Gagal memuat jadwal termin.")));
  };

  const order = orders.find((o) => o.id === orderId);
  const sum = draft.reduce((a, t) => a + (Number(t.percent) || 0), 0);
  const frozen = schedule.some((t) => t.status === "invoiced");
  const invoiced = schedule.filter((t) => t.status === "invoiced").reduce((a, t) => a + t.amount, 0);

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setSchedule((await salesApi.listBillingSchedule(orderId)).data || []);
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const setTerm = (i: number, patch: Partial<DraftTerm>) => setDraft((d) => d.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="h-6 w-6 text-brand-primary" />
          <span>Termin Penagihan & Sub-Invoice</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Pecah tagihan sales order menjadi beberapa termin (uang muka, progres, pelunasan). Setiap termin menerbitkan sub-invoice sendiri, berurutan, dan otomatis dijurnal.
        </p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <select value={orderId} onChange={(e) => pick(e.target.value)} disabled={loading} className="h-9 rounded-md border border-input bg-background px-2 text-xs min-w-72">
        <option value="">Pilih sales order…</option>
        {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNumber} — {o.customerName}</option>)}
      </select>

      {order && (
        <>
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 flex flex-wrap gap-6 text-xs">
              <div><div className="text-muted-foreground font-semibold">Nilai order</div><div className="text-lg font-black"><MoneyDisplay amount={order.baseAmount ?? order.totalAmount} /></div></div>
              <div><div className="text-muted-foreground font-semibold">Sudah ditagihkan</div><div className="text-lg font-black text-emerald-700"><MoneyDisplay amount={invoiced} /></div></div>
              <div><div className="text-muted-foreground font-semibold">Belum ditagihkan</div><div className="text-lg font-black text-amber-700"><MoneyDisplay amount={(order.baseAmount ?? order.totalAmount) - invoiced} /></div></div>
            </CardContent>
          </Card>

          {schedule.length > 0 && (
            <Card className="border-border shadow-2xs">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full">
                  <thead><tr>{["#", "Termin", "Persen", "Jumlah", "Jatuh tempo", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {schedule.map((t) => {
                      const previousOpen = schedule.some((x) => x.seq < t.seq && x.status !== "invoiced");
                      return (
                        <tr key={t.id} className="border-t border-border">
                          <td className={td}>{t.seq}</td>
                          <td className={td}>{t.label}</td>
                          <td className={td}>{t.percent}%</td>
                          <td className={`${td} font-bold`}><MoneyDisplay amount={t.amount} /></td>
                          <td className={td}>{t.dueDate}</td>
                          <td className={td}><StatusBadge status={t.status === "invoiced" ? "paid" : "pending"} label={t.status === "invoiced" ? "Sudah ditagih" : "Terjadwal"} /></td>
                          <td className={td}>
                            {t.status === "scheduled" && (
                              <Button size="sm" variant="gradient" disabled={busy || previousOpen} title={previousOpen ? "Tagih termin sebelumnya dulu" : undefined} onClick={() => run(() => salesApi.invoiceBillingTerm(t.id), `Sub-invoice termin ${t.seq} diterbitkan.`)} className="h-7 px-2 text-[11px] font-bold">
                                Terbitkan Invoice
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {frozen ? (
            <p className="text-xs text-muted-foreground">Jadwal tidak dapat diubah karena sudah ada termin yang ditagihkan.</p>
          ) : (
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold">{schedule.length ? "Ubah jadwal" : "Buat jadwal termin"}</span>
                  {PRESETS.map((p) => (
                    <button key={p.name} onClick={() => setDraft(p.terms)} className="px-2 py-1 rounded bg-slate-100 text-[11px] font-semibold hover:bg-slate-200 cursor-pointer">{p.name}</button>
                  ))}
                </div>
                {draft.map((t, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                    <label className="space-y-1 text-xs font-semibold sm:col-span-2">Nama<Input value={t.label} onChange={(e) => setTerm(i, { label: e.target.value })} /></label>
                    <label className="space-y-1 text-xs font-semibold">Persen<Input type="number" min={0} max={100} step="0.001" value={t.percent} onChange={(e) => setTerm(i, { percent: Number(e.target.value) })} /></label>
                    <label className="space-y-1 text-xs font-semibold">Jatuh tempo (hari dari hari ini)<Input type="number" min={0} value={t.dueInDays} onChange={(e) => setTerm(i, { dueInDays: Number(e.target.value) })} /></label>
                    <Button size="sm" variant="outline" disabled={draft.length <= 1} onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))} className="h-9 text-xs">Hapus</Button>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" disabled={draft.length >= 12} onClick={() => setDraft((d) => [...d, { label: "", percent: 0, dueInDays: 30 }])} className="h-8 text-xs">Tambah termin</Button>
                  <span className={`text-xs font-bold ${Math.abs(sum - 100) < 0.001 ? "text-emerald-700" : "text-rose-700"}`}>Total {sum}% {Math.abs(sum - 100) < 0.001 ? "" : "(harus 100%)"}</span>
                  <Button size="sm" disabled={busy || Math.abs(sum - 100) >= 0.001} onClick={() => run(() => salesApi.setBillingSchedule(orderId, draft.map((t) => ({ label: t.label, percent: Number(t.percent), dueInDays: t.dueInDays }))), "Jadwal termin disimpan.")} className="h-8 text-xs font-bold">
                    Simpan Jadwal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
