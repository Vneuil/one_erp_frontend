"use client";

import * as React from "react";
import {
  Flame,
  Plus,
  Printer,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Activity,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { errText, useReport } from "@/components/reports/report-ui";
import {
  manufacturingApi,
  OvenProductionLogItem,
  CreateOvenLogInput,
  OvenCycleItem,
} from "@/lib/api/manufacturing";

const selectCls = "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

export default function OvenProductionPage() {
  const [reload, setReload] = React.useState(0);
  const [filterDate, setFilterDate] = React.useState("");
  const [filterOven, setFilterOven] = React.useState("");

  const { data: rawLogs, loading, error } = useReport(
    `mfg-oven-logs|${reload}|${filterDate}|${filterOven}`,
    () => manufacturingApi.listOvenLogs({ date: filterDate || undefined, ovenNumber: filterOven || undefined }).then((r) => r.data || [])
  );
  const logs: OvenProductionLogItem[] = rawLogs ?? [];

  // Print state
  const [printLog, setPrintLog] = React.useState<OvenProductionLogItem | null>(null);

  // New Dialog State
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<CreateOvenLogInput>({
    date: new Date().toISOString().slice(0, 10),
    ovenNumber: "Oven 01",
    operatorName: "Operator Oven",
    shift: "Shift 1 (Pagi)",
    orderNumber: "",
    notes: "",
    cycles: [
      {
        cycleNumber: 1,
        timeIn: "08:00",
        timeOut: "11:30",
        temperature: 65,
        trayWeight: 1.5,
        paperWeight: 0.05,
        grossInWeight: 26.55,
        grossOutWeight: 25.1,
        netWetWeight: 25.0,
        netDryWeight: 23.55,
        moistureLossPercent: 5.8,
        moistureContent: 1.8,
        notes: "Siklus pagi",
      },
    ],
  });

  const handleOpenDialog = () => {
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      ovenNumber: "Oven 01",
      operatorName: "Operator Oven",
      shift: "Shift 1 (Pagi)",
      orderNumber: "",
      notes: "",
      cycles: [
        {
          cycleNumber: 1,
          timeIn: "08:00",
          timeOut: "11:30",
          temperature: 65,
          trayWeight: 1.5,
          paperWeight: 0.05,
          grossInWeight: 26.55,
          grossOutWeight: 25.1,
          netWetWeight: 25.0,
          netDryWeight: 23.55,
          moistureLossPercent: 5.8,
          moistureContent: 1.8,
          notes: "",
        },
      ],
    });
    setFormError(null);
    setIsOpen(true);
  };

  const addCycle = () => {
    setFormData((prev) => {
      const nextNo = (prev.cycles?.length || 0) + 1;
      return {
        ...prev,
        cycles: [
          ...(prev.cycles || []),
          {
            cycleNumber: nextNo,
            timeIn: "12:00",
            timeOut: "15:30",
            temperature: 65,
            trayWeight: 1.5,
            paperWeight: 0.05,
            grossInWeight: 26.55,
            grossOutWeight: 25.1,
            netWetWeight: 25.0,
            netDryWeight: 23.55,
            moistureLossPercent: 5.8,
            moistureContent: 1.8,
            notes: "",
          },
        ],
      };
    });
  };

  const removeCycle = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      cycles: (prev.cycles || []).filter((_, i) => i !== idx),
    }));
  };

  const updateCycleCalculation = (idx: number, updates: Partial<OvenCycleItem>) => {
    setFormData((prev) => {
      const updated = [...(prev.cycles || [])];
      const cur = { ...updated[idx], ...updates };
      const netWet = Math.max(0, cur.grossInWeight - cur.trayWeight - cur.paperWeight);
      const netDry = Math.max(0, cur.grossOutWeight - cur.trayWeight - cur.paperWeight);
      let lossPct = 0;
      if (netWet > 0) {
        lossPct = ((netWet - netDry) / netWet) * 100;
      }
      updated[idx] = {
        ...cur,
        netWetWeight: netWet,
        netDryWeight: netDry,
        moistureLossPercent: lossPct,
      };
      return { ...prev, cycles: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cycles || formData.cycles.length === 0) {
      setFormError("Minimal satu siklus pengeringan oven wajib dicatat");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await manufacturingApi.createOvenLog(formData);
      setIsOpen(false);
      setReload((v) => v + 1);
    } catch (err) {
      setFormError(errText(err, "Gagal mencatat laporan harian oven"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerPrint = (log: OvenProductionLogItem) => {
    setPrintLog(log);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const totalWetWeightSum = logs.reduce((acc, l) => acc + l.totalWetWeight, 0);
  const totalDryWeightSum = logs.reduce((acc, l) => acc + l.totalDryWeight, 0);
  const totalCyclesSum = logs.reduce((acc, l) => acc + l.totalCycles, 0);

  const columns: Column<OvenProductionLogItem>[] = [
    {
      key: "logNo",
      header: "No. LHO & Tanggal",
      render: (r: OvenProductionLogItem) => (
        <div>
          <div className="font-mono font-bold text-foreground text-xs">{r.logNo}</div>
          <div className="text-[11px] text-muted-foreground">{r.date} ({r.shift})</div>
        </div>
      ),
    },
    {
      key: "oven",
      header: "No. Oven & Operator",
      render: (r: OvenProductionLogItem) => (
        <div>
          <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            {r.ovenNumber}
          </div>
          <div className="text-[11px] text-muted-foreground">Operator: {r.operatorName}</div>
        </div>
      ),
    },
    {
      key: "cycles",
      header: "Ringkasan Siklus Pengeringan",
      render: (r: OvenProductionLogItem) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-foreground">{r.totalCycles} Siklus Pengeringan</div>
          <div className="text-[11px] text-muted-foreground">
            Basah: <span className="font-semibold text-foreground">{r.totalWetWeight.toFixed(2)} KG</span> &rarr; Kering:{" "}
            <span className="font-semibold text-emerald-700">{r.totalDryWeight.toFixed(2)} KG</span>
          </div>
        </div>
      ),
    },
    {
      key: "loss",
      header: "Rata-Rata Susut (Moisture Loss)",
      render: (r: OvenProductionLogItem) => (
        <div className="text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800">
            <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
            {r.avgMoistureLoss.toFixed(2)}% Susut
          </span>
        </div>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      align: "right",
      render: (r: OvenProductionLogItem) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerPrint(r)}
          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
        >
          <Printer className="w-3.5 h-3.5" />
          Cetak LHO
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Screen Header */}
      <div className="print:hidden">
        <PageHeader
          title="Laporan Harian Produksi Oven (LHO)"
          description="Pencatatan siklus oven pengering gula semut: suhu operasional, penimbangan kotor/bersih, tare loyang & kertas, serta penghitungan susut kadar air harian (Doc: LHO)."
        >
          <Button size="sm" onClick={handleOpenDialog} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" />
            Catat Siklus Oven Baru
          </Button>
        </PageHeader>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Siklus Selesai</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalCyclesSum} Siklus</p>
            </div>
            <Flame className="w-8 h-8 text-amber-500/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Bahan Basah Masuk Oven</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalWetWeightSum.toFixed(2)} KG</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500/40" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Hasil Kering Keluar Oven</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{totalDryWeightSum.toFixed(2)} KG</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Penguapan Air (Susut)</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {(totalWetWeightSum - totalDryWeightSum).toFixed(2)} KG
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-amber-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-9 w-40 text-xs"
              />
            </div>
            <select
              value={filterOven}
              onChange={(e) => setFilterOven(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-white text-xs"
            >
              <option value="">Semua Mesin Oven</option>
              <option value="Oven 01">Oven 01</option>
              <option value="Oven 02">Oven 02</option>
              <option value="Oven 03">Oven 03</option>
            </select>
            {(filterDate || filterOven) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDate("");
                  setFilterOven("");
                }}
                className="text-xs text-muted-foreground"
              >
                Reset Filter
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Menampilkan <span className="font-semibold text-foreground">{logs.length}</span> laporan harian
          </div>
        </CardContent>
      </Card>

      {/* Table in Screen Mode */}
      <div className="print:hidden">
        <DataTable
          columns={columns}
          data={logs}
          isLoading={loading}

        />
      </div>

      {/* Printable View: Official LAPORAN HARIAN PRODUKSI OVEN (LHO) */}
      {printLog && (
        <div className="hidden print:block font-serif text-black p-4 text-xs">
          <div className="border-b-2 border-black pb-2 mb-3 text-center">
            <h1 className="text-lg font-bold tracking-wider uppercase">CV. MANNA / PT MANNA JAYA MAKMUR</h1>
            <p className="text-[11px] text-gray-700">Kulon Progo, D.I. Yogyakarta — Standard Operasional Pengeringan Gula Semut</p>
            <div className="mt-2 inline-block border border-black px-4 py-1 font-bold text-sm bg-gray-100">
              LAPORAN HARIAN PRODUKSI OVEN (LHO)
            </div>
            <div className="text-right text-[10px] mt-1 font-sans">No. Dokumen: LHO-PRO-001 / Rev 01</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3 text-[11px]">
            <div>
              <div><strong>Nomor LHO:</strong> {printLog.logNo}</div>
              <div><strong>Tanggal:</strong> {printLog.date} ({printLog.shift})</div>
              <div><strong>Mesin Oven:</strong> {printLog.ovenNumber}</div>
            </div>
            <div className="text-right">
              <div><strong>Operator Oven:</strong> {printLog.operatorName}</div>
              <div><strong>No. SPK:</strong> {printLog.orderNumber || "REGULER"}</div>
              <div><strong>Target Kadar Air:</strong> &lt; 2.0% (Standar SNI & Organik)</div>
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-[10px] mb-4">
            <thead>
              <tr className="bg-gray-200 text-center">
                <th className="border border-black p-1.5 w-7" rowSpan={2}>Siklus</th>
                <th className="border border-black p-1 w-14" colSpan={2}>Waktu (WIB)</th>
                <th className="border border-black p-1.5 w-12" rowSpan={2}>Suhu (°C)</th>
                <th className="border border-black p-1 w-20" colSpan={2}>Tare (KG)</th>
                <th className="border border-black p-1 w-24" colSpan={2}>Sebelum Oven</th>
                <th className="border border-black p-1 w-24" colSpan={2}>Setelah Oven</th>
                <th className="border border-black p-1.5 w-14" rowSpan={2}>Susut (%)</th>
                <th className="border border-black p-1.5 w-12" rowSpan={2}>KA Akhir (%)</th>
              </tr>
              <tr className="bg-gray-100 text-center text-[9px]">
                <th className="border border-black p-1 w-10">Masuk</th>
                <th className="border border-black p-1 w-10">Keluar</th>
                <th className="border border-black p-1 w-10">Loyang</th>
                <th className="border border-black p-1 w-10">Kertas</th>
                <th className="border border-black p-1 w-12">Kotor</th>
                <th className="border border-black p-1 w-12 font-bold">Netto</th>
                <th className="border border-black p-1 w-12">Kotor</th>
                <th className="border border-black p-1 w-12 font-bold">Netto</th>
              </tr>
            </thead>
            <tbody>
              {printLog.cycles?.map((c, i) => (
                <tr key={i} className="text-center">
                  <td className="border border-black p-1 font-bold">#{c.cycleNumber}</td>
                  <td className="border border-black p-1">{c.timeIn}</td>
                  <td className="border border-black p-1">{c.timeOut}</td>
                  <td className="border border-black p-1">{c.temperature}°C</td>
                  <td className="border border-black p-1">{c.trayWeight.toFixed(2)}</td>
                  <td className="border border-black p-1">{c.paperWeight.toFixed(2)}</td>
                  <td className="border border-black p-1">{c.grossInWeight.toFixed(2)}</td>
                  <td className="border border-black p-1 font-bold">{c.netWetWeight.toFixed(2)}</td>
                  <td className="border border-black p-1">{c.grossOutWeight.toFixed(2)}</td>
                  <td className="border border-black p-1 font-bold bg-gray-50">{c.netDryWeight.toFixed(2)}</td>
                  <td className="border border-black p-1 font-bold text-amber-900">{c.moistureLossPercent.toFixed(2)}%</td>
                  <td className="border border-black p-1 font-mono">{c.moistureContent ? `${c.moistureContent}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold text-center">
                <td className="border border-black p-1" colSpan={7}>TOTAL AKUMULASI HARIAN</td>
                <td className="border border-black p-1">{printLog.totalWetWeight.toFixed(2)} KG</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1 bg-yellow-100">{printLog.totalDryWeight.toFixed(2)} KG</td>
                <td className="border border-black p-1 text-amber-900">{printLog.avgMoistureLoss.toFixed(2)}%</td>
                <td className="border border-black p-1">Lolos</td>
              </tr>
            </tfoot>
          </table>

          <div className="grid grid-cols-2 mt-8 pt-4 text-center text-xs">
            <div>
              <p>Operator Mesin Oven:</p>
              <div className="h-16 flex items-end justify-center font-bold underline">
                ( {printLog.operatorName} )
              </div>
              <p className="text-[10px] text-gray-600">Teknisi Pengeringan</p>
            </div>
            <div>
              <p>Verifikasi Mutu & Produksi:</p>
              <div className="h-16 flex items-end justify-center font-bold underline">
                ( Adin / Spv Produksi )
              </div>
              <p className="text-[10px] text-gray-600">QC & Supervisor Produksi</p>
            </div>
          </div>
        </div>
      )}

      {/* New Oven Log Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Flame className="w-5 h-5 text-amber-600" />
              Catat Siklus Pengeringan Oven (LHO)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Tanggal</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Mesin Oven</label>
                <select
                  value={formData.ovenNumber}
                  onChange={(e) => setFormData({ ...formData, ovenNumber: e.target.value })}
                  className={`mt-1 ${selectCls}`}
                >
                  <option value="Oven 01">Oven 01</option>
                  <option value="Oven 02">Oven 02</option>
                  <option value="Oven 03">Oven 03</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Shift Kerja</label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className={`mt-1 ${selectCls}`}
                >
                  <option value="Shift 1 (Pagi)">Shift 1 (Pagi 07:00 - 15:00)</option>
                  <option value="Shift 2 (Siang)">Shift 2 (Siang 15:00 - 23:00)</option>
                  <option value="Shift Lembur">Shift Lembur</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Nama Operator</label>
                <Input
                  value={formData.operatorName}
                  onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">No. Order / SPK (Opsional)</label>
                <Input
                  placeholder="Misal: MO-202611-001"
                  value={formData.orderNumber || ""}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Cycles Form Builder */}
            <div className="border border-border rounded-lg p-3 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Daftar Siklus Oven (Tray, Jam, Suhu, Berat Kotor & Bersih)
                </span>
                <Button type="button" variant="outline" size="sm" onClick={addCycle} className="h-7 text-xs gap-1">
                  <Plus className="w-3.5 h-3.5" /> Tambah Siklus
                </Button>
              </div>

              <div className="space-y-3">
                {formData.cycles?.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-card space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="font-bold text-foreground">Siklus #{c.cycleNumber}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCycle(idx)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Jam Masuk</label>
                        <Input
                          type="time"
                          value={c.timeIn}
                          onChange={(e) => updateCycleCalculation(idx, { timeIn: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Jam Keluar</label>
                        <Input
                          type="time"
                          value={c.timeOut}
                          onChange={(e) => updateCycleCalculation(idx, { timeOut: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Suhu (°C)</label>
                        <Input
                          type="number"
                          value={c.temperature}
                          onChange={(e) => updateCycleCalculation(idx, { temperature: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Tare Loyang (kg)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={c.trayWeight}
                          onChange={(e) => updateCycleCalculation(idx, { trayWeight: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Tare Kertas (kg)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={c.paperWeight}
                          onChange={(e) => updateCycleCalculation(idx, { paperWeight: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 pt-1 border-t border-border">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Gross Masuk (kg)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={c.grossInWeight}
                          onChange={(e) => updateCycleCalculation(idx, { grossInWeight: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-blue-700 font-bold">Netto Basah (kg)</label>
                        <div className="h-8 px-2 flex items-center font-bold text-xs bg-blue-50 border border-blue-200 rounded">
                          {c.netWetWeight.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Gross Keluar (kg)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={c.grossOutWeight}
                          onChange={(e) => updateCycleCalculation(idx, { grossOutWeight: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-700 font-bold">Netto Kering (kg)</label>
                        <div className="h-8 px-2 flex items-center font-bold text-xs bg-emerald-50 border border-emerald-200 rounded">
                          {c.netDryWeight.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-700 font-bold">Susut Air (%)</label>
                        <div className="h-8 px-2 flex items-center font-bold text-xs bg-amber-50 border border-amber-200 rounded text-amber-900">
                          {c.moistureLossPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Catatan Oven</label>
              <Input
                placeholder="Catatan..."
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? "Menyimpan..." : "Simpan Laporan Oven (LHO)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
