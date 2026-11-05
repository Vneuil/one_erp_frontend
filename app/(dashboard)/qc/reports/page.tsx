"use client";

import * as React from "react";
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Download,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { errText, useReport } from "@/components/reports/report-ui";
import { qcApi, QCInspectionItem } from "@/lib/api/qc";

export default function QCReportsPage() {
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [reload, setReload] = React.useState(0);

  const { data: rawInspections, loading: isLoading, error } = useReport(
    `qc-report-inspections|${dateFrom}|${dateTo}|${reload}`,
    () => qcApi.listInspections({ startDate: dateFrom, endDate: dateTo, perPage: 200 }).then((res) => res.data || [])
  );
  const inspections = rawInspections ?? [];
  const { data: stats } = useReport(`qc-report-stats|${reload}`, () => qcApi.getStats().then((res) => res.data));

  // Compute analytics from loaded inspections
  const total = inspections.length;
  const passed = inspections.filter((i) => i.overallStatus === "passed" && !i.isVoided).length;
  const failed = inspections.filter((i) => i.overallStatus === "failed" && !i.isVoided).length;
  const passRate = total > 0 ? Math.round((passed / (passed + failed || 1)) * 1000) / 10 : 0;

  // Extract moisture readings
  const moistureValues: number[] = [];
  const brixValues: number[] = [];
  let metalPass = 0;
  let metalFail = 0;

  inspections.forEach((insp) => {
    if (insp.isVoided) return;
    insp.items?.forEach((itm) => {
      const pName = itm.parameterName.toLowerCase();
      if ((pName.includes("air") || pName.includes("moisture")) && itm.numericValue !== undefined) {
        moistureValues.push(itm.numericValue);
      }
      if (pName.includes("brix") && itm.numericValue !== undefined) {
        brixValues.push(itm.numericValue);
      }
      if (pName.includes("metal")) {
        if (itm.isPassed) metalPass++;
        else metalFail++;
      }
    });
  });

  const avgMoisture = moistureValues.length > 0 ? (moistureValues.reduce((a, b) => a + b, 0) / moistureValues.length).toFixed(2) : "-";
  const avgBrix = brixValues.length > 0 ? (brixValues.reduce((a, b) => a + b, 0) / brixValues.length).toFixed(1) : "-";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Analitik Mutu (QC Reports)"
        description="Statistik kepatuhan mutu pangan, distribusi kadar air gula semut, nilai Brix gula cair, dan performa deteksi logam."
      >
        <Button variant="outline" onClick={() => window.print()} className="gap-2 text-xs">
          <Download className="w-4 h-4" />
          Ekspor / Cetak Laporan
        </Button>
      </PageHeader>

      {/* Filter Bar */}
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Filter className="w-4 h-4 text-muted-foreground" />
            Rentang Waktu:
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40 text-xs"
            />
            <span className="text-muted-foreground">s/d</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40 text-xs"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setReload((n) => n + 1)} className="text-xs">
            Muat Ulang
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Tingkat Lulus (Pass Rate)</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{passRate}%</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Target: ≥ 98% Lulus</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Rata-rata Kadar Air</div>
            <div className="text-2xl font-bold text-foreground mt-1">{avgMoisture} %</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Batas Maksimal: ≤ 2.0%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Rata-rata Kadar Brix</div>
            <div className="text-2xl font-bold text-foreground mt-1">{avgBrix} °Bx</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Target: 70 ± 2 °Bx</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Reject Metal Detector</div>
            <div className="text-2xl font-bold text-rose-700 mt-1">{metalFail} Lot</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Lolos: {metalPass} Lot</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Kadar Air Gula Semut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Distribusi Kadar Air Gula Semut</span>
              <span className="text-xs font-normal text-muted-foreground font-mono">BRL-01</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Kadar Air ≤ 2.0% (Oven Dilewati)
                </span>
                <span className="font-mono font-bold">
                  {moistureValues.filter((v) => v <= 2.0).length} Batch
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{
                    width: `${moistureValues.length ? (moistureValues.filter((v) => v <= 2.0).length / moistureValues.length) * 100 : 0}%`,
                  }}
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Kadar Air &gt; 2.0% (Wajib Ayak 1 & Oven)
                </span>
                <span className="font-mono font-bold">
                  {moistureValues.filter((v) => v > 2.0).length} Batch
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{
                    width: `${moistureValues.length ? (moistureValues.filter((v) => v > 2.0).length / moistureValues.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Total pembacaan kadar air: {moistureValues.length} sampel. Nilai terendah: {moistureValues.length ? Math.min(...moistureValues) : 0}%, nilai tertinggi: {moistureValues.length ? Math.max(...moistureValues) : 0}%.
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Gate Metal Detector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Keamanan Pangan & Gate Metal Detector</span>
              <span className="text-xs font-normal text-muted-foreground font-mono">BRL-03</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Lulus Uji Logam (Siap Packing / FG)
                </span>
                <span className="font-mono font-bold">{metalPass} Lot</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  Gagal / Terdeteksi Logam (Reject / Hold)
                </span>
                <span className="font-mono font-bold text-rose-700">{metalFail} Lot</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Tingkat bebas kontaminasi: {metalPass + metalFail > 0 ? ((metalPass / (metalPass + metalFail)) * 100).toFixed(1) : 100}%. Batch yang gagal secara otomatis diblokir dari penerimaan ke gudang barang jadi.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
