"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { manufacturingApi } from "@/lib/api/manufacturing";
import { downloadCsv } from "@/lib/utils/csv";
import { Note, RangeFilter, ReportState, Stat, Tabs, monthStart, td, tdr, th, thr, today, useReport } from "@/components/reports/report-ui";

type Tab = "daily" | "summary" | "process" | "wip";
const TABS = [["daily", "Order per Hari"], ["summary", "Ringkasan Order"], ["process", "Ringkasan per Proses"], ["wip", "Work In Process"]] as const;
const STATUS: Record<string, string> = { planned: "Direncanakan", released: "Dirilis", in_progress: "Berjalan", paused: "Dijeda", completed: "Selesai", cancelled: "Dibatalkan" };
const num = (n: number) => n.toLocaleString("id-ID");

export default function ProductionReportsPage() {
  const [tab, setTab] = React.useState<Tab>("daily");
  const [from, setFrom] = React.useState(monthStart());
  const [to, setTo] = React.useState(today());
  const p = { from, to };
  const r = `${from}|${to}`;
  const daily = useReport(`d|${r}`, () => manufacturingApi.dailyReport(p).then((x) => x.data), tab === "daily");
  const summary = useReport(`s|${r}`, () => manufacturingApi.orderSummary(p).then((x) => x.data), tab === "summary");
  const process = useReport(`p|${r}`, () => manufacturingApi.processSummary(p).then((x) => x.data), tab === "process");
  const wip = useReport("wip", () => manufacturingApi.wipReport().then((x) => x.data), tab === "wip");
  const active = { daily, summary, process, wip }[tab];

  const exportCsv = () => {
    const name = (s: string) => `${s}-${from}-${to}.csv`;
    if (tab === "daily" && daily.data) {
      const rows: (string | number)[][] = [];
      daily.data.days.forEach((d) => {
        d.plannedOrders.forEach((o) => rows.push([d.date, "Rencana", o.orderNumber, o.product, "", o.quantityToProduce]));
        d.stepOutputs.forEach((o) => rows.push([d.date, "Output proses", o.orderNumber, o.product, o.step ?? "", o.quantity]));
        d.completions.forEach((o) => rows.push([d.date, "Unit selesai", o.orderNumber, o.product, "", o.quantity]));
      });
      downloadCsv(name("produksi-harian"), ["Tanggal", "Jenis", "No. Order", "Produk", "Proses", "Qty"], rows);
    } else if (tab === "summary" && summary.data) {
      downloadCsv(name("ringkasan-order-produksi"), ["No. Order", "Produk", "Status", "Tgl Rencana", "Rencana", "Selesai", "Progres %", "Tgl Selesai", "Terlambat (hari)"],
        summary.data.orders.map((o) => [o.orderNumber, o.product, STATUS[o.status] ?? o.status, o.plannedDate, o.quantityToProduce, o.quantityCompleted, o.progressPct, o.actualCompletionDate ?? "", o.lateDays]));
    } else if (tab === "process" && process.data) {
      downloadCsv(name("ringkasan-per-proses"), ["Proses", "Unit", "Order", "Hari aktif", "Rata-rata unit/hari", "Waktu standar (menit)", "Antrian saat ini"],
        process.data.rows.map((x) => [x.process, x.units, x.orders, x.activeDays, x.avgUnitsPerDay, x.standardMinutes, x.waitingUnits]));
    } else if (tab === "wip" && wip.data) {
      downloadCsv("work-in-process.csv", ["No. Order", "Produk", "Status", "Mode material", "Rencana", "Selesai", "Unit WIP", "Material/unit", "Nilai diambil", "Nilai WIP"],
        wip.data.orders.map((o) => [o.orderNumber, o.product, STATUS[o.status] ?? o.status, o.materialMode, o.quantityToProduce, o.quantityCompleted, o.unitsInWip, o.materialCostPerUnit, o.issuedValue, o.wipValue]));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Produksi" description="Order produksi per hari, ringkasan order, ringkasan per proses, dan work in process.">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" disabled={!active.data} onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>Cetak</Button>
      </PageHeader>
      {tab !== "wip" && <RangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />}
      <Tabs value={tab} onChange={setTab} tabs={TABS} />
      <ReportState loading={active.loading} error={active.error} />

      {tab === "daily" && daily.data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Unit direncanakan">{num(daily.data.plannedUnits)}</Stat><Stat label="Output proses">{num(daily.data.stepUnits)}</Stat><Stat label="Unit selesai">{num(daily.data.unitsCompleted)}</Stat>
          </div>
          {daily.data.days.length === 0 && <div className="py-8 text-center text-xs text-muted-foreground">Tidak ada aktivitas produksi pada periode ini.</div>}
          {daily.data.days.map((d) => (
            <Card key={d.date} className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
              <div className="px-3 py-2 border-b border-border bg-slate-50 flex items-baseline justify-between"><span className="text-sm font-bold">{d.date}</span><span className="text-[11px] text-muted-foreground">rencana {num(d.plannedUnits)} · output proses {num(d.stepUnits)} · selesai {num(d.unitsCompleted)}</span></div>
              <table className="w-full"><thead><tr><th className={th}>Jenis</th><th className={th}>No. Order</th><th className={th}>Produk</th><th className={th}>Proses</th><th className={thr}>Qty</th></tr></thead>
                <tbody>
                  {d.plannedOrders.map((o) => <tr key={`p${o.orderId}`} className="border-t border-border"><td className={td}>Rencana ({STATUS[o.status] ?? o.status})</td><td className={`${td} font-mono`}>{o.orderNumber}</td><td className={td}>{o.product}</td><td className={td}>-</td><td className={tdr}>{num(o.quantityToProduce)}</td></tr>)}
                  {d.stepOutputs.map((o, i) => <tr key={`s${i}`} className="border-t border-border"><td className={td}>Output proses</td><td className={`${td} font-mono`}>{o.orderNumber}</td><td className={td}>{o.product}</td><td className={td}>{o.step}</td><td className={tdr}>{num(o.quantity)}</td></tr>)}
                  {d.completions.map((o, i) => <tr key={`c${i}`} className="border-t border-border"><td className={`${td} font-semibold text-emerald-700`}>Unit selesai</td><td className={`${td} font-mono`}>{o.orderNumber}</td><td className={td}>{o.product}</td><td className={td}>-</td><td className={tdr}>{num(o.quantity)}</td></tr>)}
                </tbody></table>
            </CardContent></Card>
          ))}
        </>
      )}

      {tab === "summary" && summary.data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Unit direncanakan">{num(summary.data.plannedUnits)}</Stat><Stat label="Unit selesai">{num(summary.data.completedUnits)} ({summary.data.completionPct}%)</Stat>
            <Stat label="Order selesai">{summary.data.completedOrders}</Stat><Stat label="Tepat waktu">{summary.data.onTimePct}% ({summary.data.onTimeOrders})</Stat>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">{Object.entries(summary.data.byStatus).map(([k, v]) => <span key={k} className="px-2.5 py-1 rounded-full bg-slate-100 font-semibold">{STATUS[k] ?? k}: {v}</span>)}</div>
          <Note>Order dilaporkan menurut tanggal rencananya (atau tanggal dibuat bila tidak ada). Order batal tidak dihitung dalam unit.</Note>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <div className="px-3 py-2 border-b border-border bg-slate-50 text-sm font-bold">Per produk</div>
            <table className="w-full"><thead><tr><th className={th}>Produk</th><th className={thr}>Order</th><th className={thr}>Rencana</th><th className={thr}>Selesai</th><th className={thr}>%</th></tr></thead>
              <tbody>
                {summary.data.byProduct.length === 0 && <tr><td className={td} colSpan={5}>Tidak ada order pada periode ini.</td></tr>}
                {summary.data.byProduct.map((x) => <tr key={x.sku + x.product} className="border-t border-border"><td className={td}>{x.product}</td><td className={tdr}>{x.orders}</td><td className={tdr}>{num(x.planned)}</td><td className={tdr}>{num(x.completed)}</td><td className={tdr}>{x.completionPct}%</td></tr>)}
              </tbody></table>
          </CardContent></Card>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full"><thead><tr><th className={th}>No. Order</th><th className={th}>Produk</th><th className={th}>Status</th><th className={th}>Tgl rencana</th><th className={thr}>Rencana</th><th className={thr}>Selesai</th><th className={thr}>Progres</th><th className={th}>Tgl selesai</th></tr></thead>
              <tbody>
                {summary.data.orders.map((o) => (
                  <tr key={o.orderId} className="border-t border-border"><td className={`${td} font-mono`}>{o.orderNumber}</td><td className={td}>{o.product}</td><td className={td}>{STATUS[o.status] ?? o.status}</td><td className={td}>{o.plannedDate || "-"}</td><td className={tdr}>{num(o.quantityToProduce)}</td><td className={tdr}>{num(o.quantityCompleted)}</td><td className={tdr}>{o.progressPct}%</td><td className={td}>{o.actualCompletionDate || "-"}{o.lateDays > 0 && <span className="ml-1 text-rose-700 font-semibold">(+{o.lateDays} hr)</span>}</td></tr>
                ))}
              </tbody></table>
          </CardContent></Card>
        </>
      )}

      {tab === "process" && process.data && (
        <>
          <Note>{process.data.note}</Note>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full"><thead><tr><th className={th}>Proses</th><th className={thr}>Unit</th><th className={thr}>Order</th><th className={thr}>Hari aktif</th><th className={thr}>Rata-rata unit/hari</th><th className={thr}>Waktu standar (menit)</th><th className={thr}>Antrian saat ini</th></tr></thead>
              <tbody>
                {process.data.rows.length === 0 && <tr><td className={td} colSpan={7}>Belum ada output proses pada periode ini. Rute proses diatur di BOM.</td></tr>}
                {process.data.rows.map((x) => <tr key={x.process} className="border-t border-border"><td className={`${td} font-semibold`}>{x.process}</td><td className={tdr}>{num(x.units)}</td><td className={tdr}>{x.orders}</td><td className={tdr}>{x.activeDays}</td><td className={tdr}>{x.avgUnitsPerDay}</td><td className={tdr}>{num(x.standardMinutes)}</td><td className={`${tdr} ${x.waitingUnits ? "text-amber-700 font-bold" : ""}`}>{num(x.waitingUnits)}</td></tr>)}
              </tbody></table>
          </CardContent></Card>
        </>
      )}

      {tab === "wip" && wip.data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Stat label="Unit dalam proses">{num(wip.data.totalUnitsInWip)}</Stat>
            <Stat label="Nilai WIP (material)"><MoneyDisplay amount={wip.data.totalWipValue} /></Stat>
            {wip.data.ledgerBalance !== undefined && <Stat label="Saldo Barang dalam Proses (buku besar)"><MoneyDisplay amount={wip.data.ledgerBalance} /></Stat>}
          </div>
          <Note>{wip.data.note}</Note>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full"><thead><tr><th className={th}>No. Order</th><th className={th}>Produk</th><th className={th}>Status</th><th className={thr}>Selesai / rencana</th><th className={th}>Posisi unit (selesai / menunggu)</th><th className={thr}>Unit WIP</th><th className={thr}>Material diambil</th><th className={thr}>Nilai WIP</th></tr></thead>
              <tbody>
                {wip.data.orders.length === 0 && <tr><td className={td} colSpan={8}>Tidak ada pekerjaan dalam proses.</td></tr>}
                {wip.data.orders.map((o) => (
                  <tr key={o.orderId} className="border-t border-border align-top">
                    <td className={`${td} font-mono`}>{o.orderNumber}</td><td className={td}>{o.product}<div className="text-[10px] text-muted-foreground">{o.materialMode === "issued" ? "material diambil lebih dulu" : "material otomatis saat selesai"}</div></td><td className={td}>{STATUS[o.status] ?? o.status}</td>
                    <td className={tdr}>{num(o.quantityCompleted)} / {num(o.quantityToProduce)}</td>
                    <td className={td}>{o.steps.length === 0 ? "-" : o.steps.map((s) => <div key={s.name}>{s.name}: {s.done} / {s.waiting}</div>)}</td>
                    <td className={tdr}>{num(o.unitsInWip)}</td><td className={tdr}>{o.materialMode === "issued" ? <MoneyDisplay amount={o.issuedValue} /> : "-"}</td><td className={`${tdr} font-bold`}><MoneyDisplay amount={o.wipValue} /></td>
                  </tr>
                ))}
              </tbody></table>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
