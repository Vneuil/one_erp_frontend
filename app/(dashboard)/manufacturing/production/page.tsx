"use client";

import * as React from "react";
import { CheckCircle2, Pause, Play, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { errText } from "@/components/reports/report-ui";
import { manufacturingApi, ProductionOrderItem, ProductionStepLogItem } from "@/lib/api/manufacturing";

type Notice = { kind: "success" | "error"; text: string } | null;

/** Units of this order that have passed every step and can be completed now. */
function completable(o: ProductionOrderItem): number {
  if (!o.steps?.length) return o.remainingQuantity;
  return Math.max(0, Math.min(o.steps[o.steps.length - 1].quantityDone - o.quantityCompleted, o.remainingQuantity));
}

export default function ProductionRunPage() {
  const [orders, setOrders] = React.useState<ProductionOrderItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [logsOpen, setLogsOpen] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<ProductionStepLogItem[]>([]);

  const toggleLogs = async (order: ProductionOrderItem) => {
    if (logsOpen === order.id) {
      setLogsOpen(null);
      return;
    }
    try {
      const res = await manufacturingApi.listStepLogs(order.id);
      setLogs(res.data || []);
      setLogsOpen(order.id);
    } catch (err) {
      setNotice({ kind: "error", text: errText(err, "Gagal memuat riwayat log.") });
    }
  };

  const voidLog = async (order: ProductionOrderItem, log: ProductionStepLogItem, stepName: string) => {
    const reason = window.prompt(`Alasan membatalkan log ${stepName} ${log.quantity} unit (${log.date})? Jumlah di proses itu akan dikurangi dan biaya tenaga kerja/overhead-nya dibalik.`, "");
    if (reason === null) return;
    if (!reason.trim()) {
      setNotice({ kind: "error", text: "Alasan pembatalan wajib diisi." });
      return;
    }
    await run(`${order.id}:void:${log.id}`, () => manufacturingApi.voidStepLog(order.id, log.id, reason.trim()), `Log ${stepName} dibatalkan.`, order);
    try {
      setLogs((await manufacturingApi.listStepLogs(order.id)).data || []);
    } catch {
      /* the list refreshes the next time it is opened */
    }
  };

  React.useEffect(() => {
    manufacturingApi
      .listProductionOrders({ perPage: 100 })
      .then((res) => {
        setOrders((res.data || []).filter((o) => o.status === "released" || o.status === "in_progress" || o.status === "paused"));
        setLoadError(null);
      })
      .catch((err) => setLoadError(errText(err, "Gagal memuat order produksi dari server.")))
      .finally(() => setIsLoading(false));
  }, []);

  // Only the server's response changes an order: a failed call must never look like production progressed.
  const run = async (key: string, call: () => Promise<{ data: ProductionOrderItem }>, success: string, order: ProductionOrderItem) => {
    if (busyId) return;
    setBusyId(key);
    setNotice(null);
    try {
      const res = await call();
      setOrders((prev) => prev.flatMap((o) => (o.id !== order.id ? [o] : res.data.status === "completed" || res.data.status === "cancelled" ? [] : [res.data])));
      setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith(order.id))));
      setNotice({ kind: "success", text: success });
    } catch (err) {
      setNotice({ kind: "error", text: errText(err, "Gagal memperbarui order produksi.") });
    } finally {
      setBusyId(null);
    }
  };

  const qtyOf = (key: string, fallback: number) => {
    const raw = drafts[key];
    return raw === undefined || raw === "" ? fallback : Math.floor(Number(raw));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Live Production Floor Execution" description="Catat output tiap proses, selesaikan unit yang sudah melewati seluruh rute, dan jeda atau lanjutkan order." />

      {loadError && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{loadError}</div>}
      {notice && (
        <div role={notice.kind === "error" ? "alert" : "status"} className={`px-3 py-2 rounded-lg border text-xs font-medium ${notice.kind === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>{notice.text}</div>
      )}
      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : orders.length === 0 && !loadError ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Belum ada order produksi yang sedang berjalan. Rilis order di menu Work Orders.</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {orders.map((o) => {
          const progress = o.quantityToProduce > 0 ? Math.round((o.quantityCompleted / o.quantityToProduce) * 100) : 0;
          const ready = completable(o);
          const paused = o.status === "paused";
          const doneKey = `${o.id}:done`;
          return (
            <Card key={o.id} className="hover:border-brand-primary/40 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-brand-primary" />
                    <CardTitle className="text-sm font-bold">{o.productName || o.bomName}</CardTitle>
                  </div>
                  <StatusBadge status={paused ? "paused" : "processing"} />
                </div>
                <CardDescription className="font-mono text-xs text-brand-indigo font-bold pt-1">{o.orderNumber} · {o.warehouseName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Selesai:</span>
                    <span className="text-brand-dark">{o.quantityCompleted} / {o.quantityToProduce} unit ({progress}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-indigo" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {o.steps?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold">Proses</div>
                    {o.steps.map((s) => {
                      const key = `${o.id}:${s.id}`;
                      const pct = o.quantityToProduce > 0 ? Math.round((s.quantityDone / o.quantityToProduce) * 100) : 0;
                      return (
                        <div key={s.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                          <span className="col-span-1 text-muted-foreground">{s.sequence}</span>
                          <div className="col-span-5">
                            <div className="font-semibold">{s.name}</div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full bg-brand-primary/70" style={{ width: `${pct}%` }} /></div>
                          </div>
                          <span className="col-span-2 text-right tabular-nums">{s.quantityDone}/{o.quantityToProduce}</span>
                          <Input type="number" min={1} max={s.waitingQuantity} value={drafts[key] ?? ""} placeholder={String(s.waitingQuantity)} disabled={paused || s.waitingQuantity === 0} onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))} className="col-span-2 h-8 text-xs" aria-label={`Output ${s.name}`} />
                          <Button size="sm" variant="outline" className="col-span-2 h-8 px-1 text-[11px]" disabled={paused || s.waitingQuantity === 0 || busyId !== null}
                            onClick={() => run(key, () => manufacturingApi.logStep(o.id, s.id, { quantity: qtyOf(key, s.waitingQuantity) }), `Output ${s.name} dicatat.`, o)}>
                            <Play className="h-3 w-3" /> Catat
                          </Button>
                        </div>
                      );
                    })}
                    <p className="text-[11px] text-muted-foreground">Kolom angka = unit yang selesai di proses itu (kosong = semua yang menunggu).</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={busyId !== null}
                    onClick={() => run(`${o.id}:pause`, () => (paused ? manufacturingApi.resumeProductionOrder(o.id) : manufacturingApi.pauseProductionOrder(o.id)), paused ? "Order produksi dilanjutkan." : "Order produksi dijeda.", o)}>
                    <Pause className="h-3 w-3" /> {paused ? "Resume" : "Pause"}
                  </Button>
                  <Input type="number" min={1} max={ready} value={drafts[doneKey] ?? ""} placeholder={String(ready)} disabled={paused || ready === 0} onChange={(e) => setDrafts((d) => ({ ...d, [doneKey]: e.target.value }))} className="h-8 w-20 text-xs" aria-label="Unit diselesaikan" />
                  <Button variant="gradient" size="sm" className="h-8 gap-1 text-xs font-semibold" disabled={paused || ready === 0 || busyId !== null}
                    onClick={() => run(doneKey, () => manufacturingApi.completeBatch(o.id, { quantityCompleted: qtyOf(doneKey, ready) }), `${qtyOf(doneKey, ready)} unit selesai dicatat.`, o)}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Selesaikan unit
                  </Button>
                </div>
                {o.steps?.length > 0 && (
                  <div className="space-y-1.5">
                    <button type="button" className="text-[11px] font-semibold text-brand-indigo underline cursor-pointer" onClick={() => toggleLogs(o)}>{logsOpen === o.id ? "Sembunyikan riwayat log" : "Riwayat log proses"}</button>
                    {logsOpen === o.id && (
                      logs.length === 0 ? <p className="text-[11px] text-muted-foreground">Belum ada log.</p> : (
                        <table className="w-full text-[11px]"><tbody>
                          {logs.map((l) => {
                            const stepName = o.steps.find((s) => s.id === l.stepId)?.name ?? "Proses";
                            return (
                              <tr key={l.id} className={`border-t border-border ${l.voided ? "text-muted-foreground line-through" : ""}`}>
                                <td className="py-1">{l.date}</td><td>{stepName}</td><td className="text-right tabular-nums">{l.quantity} unit</td>
                                <td className="pl-2 no-underline">{l.voided ? <span title={l.voidReason}>batal</span> : <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-rose-700" disabled={busyId !== null} onClick={() => voidLog(o, l, stepName)}>Batalkan</Button>}</td>
                              </tr>
                            );
                          })}
                        </tbody></table>
                      )
                    )}
                  </div>
                )}
                {ready === 0 && o.steps?.length > 0 && !paused && <p className="text-[11px] text-muted-foreground text-right">Belum ada unit yang melewati seluruh proses.</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
