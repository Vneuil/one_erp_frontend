"use client";

import * as React from "react";
import {
  ShieldCheck,
  Plus,
  Printer,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { errText, useReport } from "@/components/reports/report-ui";
import { qcApi, PersonalHygieneCheckItem, CreateHygieneCheckInput } from "@/lib/api/qc";

const selectCls = "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

export default function PersonalHygienePage() {
  const [reload, setReload] = React.useState(0);
  const [filterDate, setFilterDate] = React.useState("");
  const [filterLine, setFilterLine] = React.useState("");

  const { data: rawChecks, loading, error } = useReport(
    `qc-hygiene|${reload}|${filterDate}|${filterLine}`,
    () => qcApi.listHygieneChecks({ date: filterDate || undefined, line: filterLine || undefined }).then((r) => r.data || [])
  );
  const checks: PersonalHygieneCheckItem[] = rawChecks ?? [];

  // Dialog State
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<CreateHygieneCheckInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    shift: "Shift 1 (Pagi)",
    line: "Gula Semut (Granulated)",
    employeeName: "",
    workWearClean: true,
    hairNet: true,
    nailsClean: true,
    noJewelry: true,
    workShoesClean: true,
    handWashing: true,
    healthFit: true,
    actionTaken: "",
    inspectorName: "Adin (QC Inspector)",
    notes: "",
  });

  const handleOpenDialog = () => {
    setFormData({
      checkDate: new Date().toISOString().slice(0, 10),
      shift: "Shift 1 (Pagi)",
      line: "Gula Semut (Granulated)",
      employeeName: "",
      workWearClean: true,
      hairNet: true,
      nailsClean: true,
      noJewelry: true,
      workShoesClean: true,
      handWashing: true,
      healthFit: true,
      actionTaken: "",
      inspectorName: "Adin (QC Inspector)",
      notes: "",
    });
    setFormError(null);
    setIsOpen(true);
  };

  const isFormCompliant =
    formData.workWearClean &&
    formData.hairNet &&
    formData.nailsClean &&
    formData.noJewelry &&
    formData.workShoesClean &&
    formData.handWashing &&
    formData.healthFit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName.trim()) {
      setFormError("Nama karyawan wajib diisi");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await qcApi.createHygieneCheck(formData);
      setIsOpen(false);
      setReload((v) => v + 1);
    } catch (err) {
      setFormError(errText(err, "Gagal mencatat pemeriksaan hygiene"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan pemeriksaan hygiene ini?")) return;
    try {
      await qcApi.deleteHygieneCheck(id);
      setReload((v) => v + 1);
    } catch (err) {
      alert(errText(err, "Gagal menghapus catatan"));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const passCount = checks.filter((c) => c.isPassed).length;
  const failCount = checks.length - passCount;

  const columns: Column<PersonalHygieneCheckItem>[] = [
    {
      key: "date",
      header: "Tanggal & Shift",
      render: (r: PersonalHygieneCheckItem) => (
        <div>
          <div className="font-semibold text-foreground text-xs">{r.checkDate}</div>
          <div className="text-[11px] text-muted-foreground">{r.shift}</div>
        </div>
      ),
    },
    {
      key: "employee",
      header: "Karyawan & Lini",
      render: (r: PersonalHygieneCheckItem) => (
        <div>
          <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            {r.employeeName}
          </div>
          <div className="text-[11px] text-muted-foreground">{r.line}</div>
        </div>
      ),
    },
    {
      key: "checklist",
      header: "Checklist GMP (7 Indikator)",
      render: (r: PersonalHygieneCheckItem) => (
        <div className="flex flex-wrap gap-1 text-[10px]">
          <span className={`px-1.5 py-0.5 rounded ${r.workWearClean ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`} title="Pakaian Bersih">
            Pakaian: {r.workWearClean ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.hairNet ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`} title="Hairnet/Tutup Kepala">
            Hairnet: {r.hairNet ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.nailsClean ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`} title="Kuku Pendek & Bersih">
            Kuku: {r.nailsClean ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.noJewelry ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`} title="Bebas Aksesoris">
            Aksesoris: {r.noJewelry ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.workShoesClean ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`} title="Sandal Produksi Bersih">
            Sandal: {r.workShoesClean ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.handWashing ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`} title="Cuci Tangan">
            Cuci Tangan: {r.handWashing ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.healthFit ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`} title="Sehat/Fit">
            Fit: {r.healthFit ? "✓" : "✗"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status Mutu",
      render: (r: PersonalHygieneCheckItem) =>
        r.isPassed ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Lolos (OK)
          </span>
        ) : (
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              Tidak Lolos
            </span>
            {r.actionTaken && (
              <div className="text-[10px] text-amber-700 mt-1 italic">
                Tindakan: {r.actionTaken}
              </div>
            )}
          </div>
        ),
    },
    {
      key: "inspector",
      header: "Inspektor QC",
      render: (r: PersonalHygieneCheckItem) => (
        <div className="text-xs">
          <div className="font-medium text-foreground">{r.inspectorName}</div>
          {r.notes && <div className="text-[11px] text-muted-foreground">{r.notes}</div>}
        </div>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      align: "right",
      render: (r: PersonalHygieneCheckItem) => (
        <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Screen Header */}
      <div className="print:hidden">
        <PageHeader
          title="Catatan Personal Hygiene (CPH)"
          description="Pemeriksaan kebersihan personal harian karyawan lantai produksi sesuai kaidah Good Manufacturing Practices (GMP) & Sertifikasi Organik/Halal (Doc: CPH)."
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="w-4 h-4" />
              Cetak Dokumen CPH
            </Button>
            <Button size="sm" onClick={handleOpenDialog} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4" />
              Catat Pemeriksaan Karyawan
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Diperiksa</p>
              <p className="text-2xl font-bold text-foreground mt-1">{checks.length} Orang</p>
            </div>
            <Users className="w-8 h-8 text-primary/40" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Lolos Hygiene (100% Taat)</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{passCount} Orang</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Penyimpangan / Perlu Koreksi</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{failCount} Kasus</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500/40" />
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
              value={filterLine}
              onChange={(e) => setFilterLine(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-white text-xs"
            >
              <option value="">Semua Lini Produksi</option>
              <option value="Gula Semut (Granulated)">Gula Semut (Granulated)</option>
              <option value="Gula Cair (Liquid Sugar)">Gula Cair (Liquid Sugar)</option>
              <option value="Virgin Coconut Oil (VCO)">Virgin Coconut Oil (VCO)</option>
              <option value="Ruang Packing">Ruang Packing</option>
              <option value="Ruang Oven">Ruang Oven</option>
            </select>
            {(filterDate || filterLine) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDate("");
                  setFilterLine("");
                }}
                className="text-xs text-muted-foreground"
              >
                Reset Filter
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Menampilkan <span className="font-semibold text-foreground">{checks.length}</span> catatan
          </div>
        </CardContent>
      </Card>

      {/* Table in Screen Mode */}
      <div className="print:hidden">
        <DataTable
          columns={columns}
          data={checks}
          isLoading={loading}

        />
      </div>

      {/* Print View: Official CATATAN PERSONAL HYGIENE (CPH) */}
      <div className="hidden print:block font-serif text-black p-4 text-xs">
        <div className="border-b-2 border-black pb-3 mb-4 text-center">
          <h1 className="text-lg font-bold tracking-wider uppercase">CV. MANNA / PT MANNA JAYA MAKMUR</h1>
          <p className="text-[11px] text-gray-700">Kulon Progo, D.I. Yogyakarta — Standard Operasional Food Safety & GMP</p>
          <div className="mt-2 inline-block border border-black px-4 py-1 font-bold text-sm bg-gray-100">
            CATATAN PERSONAL HYGIENE (CPH)
          </div>
          <div className="text-right text-[10px] mt-1 font-sans">No. Dokumen: QA-001-CPH / Rev 01</div>
        </div>

        <div className="flex justify-between items-center mb-3 text-[11px]">
          <div>
            <div><strong>Tanggal Pemeriksaan:</strong> {filterDate || new Date().toISOString().slice(0, 10)}</div>
            <div><strong>Lini Produksi:</strong> {filterLine || "Seluruh Area Produksi"}</div>
          </div>
          <div className="text-right">
            <div><strong>Verifikator:</strong> Tim QA / Pak Adin</div>
            <div><strong>Frekuensi:</strong> Harian (Sebelum Masuk Shift)</div>
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-gray-200 text-center">
              <th className="border border-black p-1.5 w-7" rowSpan={2}>No</th>
              <th className="border border-black p-1.5" rowSpan={2}>Nama Karyawan</th>
              <th className="border border-black p-1.5 w-16" rowSpan={2}>Shift / Lini</th>
              <th className="border border-black p-1" colSpan={7}>Pemeriksaan Fisik & Kebersihan (✓ / ✗)</th>
              <th className="border border-black p-1.5 w-14" rowSpan={2}>Status</th>
              <th className="border border-black p-1.5" rowSpan={2}>Tindakan Perbaikan</th>
              <th className="border border-black p-1.5 w-16" rowSpan={2}>Paraf QC</th>
            </tr>
            <tr className="bg-gray-100 text-center text-[9px]">
              <th className="border border-black p-1 w-11">Pakaian Kerja</th>
              <th className="border border-black p-1 w-11">Tutup Rambut</th>
              <th className="border border-black p-1 w-11">Kuku Bersih</th>
              <th className="border border-black p-1 w-11">Bebas Aksesori</th>
              <th className="border border-black p-1 w-11">Sandal Kerja</th>
              <th className="border border-black p-1 w-11">Cuci Tangan</th>
              <th className="border border-black p-1 w-11">Kondisi Sehat</th>
            </tr>
          </thead>
          <tbody>
            {checks.length === 0 ? (
              <tr>
                <td colSpan={13} className="border border-black p-4 text-center italic">
                  Nihil data pemeriksaan pada tanggal terpilih
                </td>
              </tr>
            ) : (
              checks.map((c, idx) => (
                <tr key={c.id} className="text-center">
                  <td className="border border-black p-1">{idx + 1}</td>
                  <td className="border border-black p-1 text-left font-medium">{c.employeeName}</td>
                  <td className="border border-black p-1 text-[9px]">{c.line}</td>
                  <td className="border border-black p-1">{c.workWearClean ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.hairNet ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.nailsClean ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.noJewelry ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.workShoesClean ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.handWashing ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.healthFit ? "✓" : "✗"}</td>
                  <td className="border border-black p-1 font-bold">
                    {c.isPassed ? "OK" : "REJECT"}
                  </td>
                  <td className="border border-black p-1 text-left text-[9px]">{c.actionTaken || "-"}</td>
                  <td className="border border-black p-1 text-[9px]">✓ {c.inspectorName.split(" ")[0]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="grid grid-cols-2 mt-8 pt-4 text-center text-xs">
          <div>
            <p>Diperiksa Oleh (QC Inspector):</p>
            <div className="h-16 flex items-end justify-center font-bold underline">
              ( Adin / Tim QC )
            </div>
            <p className="text-[10px] text-gray-600">QC & Food Safety Supervisor</p>
          </div>
          <div>
            <div>Mengetahui (Kepala Produksi):</div>
            <div className="h-16 flex items-end justify-center font-bold underline">
              ( Mas Abel / Supervisor )
            </div>
            <p className="text-[10px] text-gray-600">Kepala Bagian Produksi</p>
          </div>
        </div>
      </div>

      {/* Input Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Pemeriksaan Personal Hygiene Karyawan
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Tanggal</label>
                <Input
                  type="date"
                  value={formData.checkDate}
                  onChange={(e) => setFormData({ ...formData, checkDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Shift</label>
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
                <label className="text-xs font-semibold text-foreground">Nama Karyawan</label>
                <Input
                  placeholder="Misal: Budi Santoso / Siti"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Lini / Area Produksi</label>
                <select
                  value={formData.line}
                  onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                  className={`mt-1 ${selectCls}`}
                >
                  <option value="Gula Semut (Granulated)">Gula Semut (Granulated)</option>
                  <option value="Gula Cair (Liquid Sugar)">Gula Cair (Liquid Sugar)</option>
                  <option value="Virgin Coconut Oil (VCO)">Virgin Coconut Oil (VCO)</option>
                  <option value="Ruang Packing">Ruang Packing</option>
                  <option value="Ruang Oven">Ruang Oven</option>
                  <option value="Gudang Bahan Baku">Gudang Bahan Baku</option>
                </select>
              </div>
            </div>

            {/* Checklist GMP */}
            <div className="border border-border rounded-lg p-3 bg-muted/20 space-y-2.5">
              <div className="text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                <span>7 Kriteria Standar GMP & Hygiene:</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isFormCompliant ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                  {isFormCompliant ? "✓ MEMENUHI STANDAR" : "⚠ ADA PENYIMPANGAN"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.workWearClean}
                    onChange={(e) => setFormData({ ...formData, workWearClean: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>1. Pakaian Kerja Bersih & Rapi</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hairNet}
                    onChange={(e) => setFormData({ ...formData, hairNet: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>2. Rambut Tertutup (Hairnet)</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.nailsClean}
                    onChange={(e) => setFormData({ ...formData, nailsClean: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>3. Kuku Pendek & Bersih</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.noJewelry}
                    onChange={(e) => setFormData({ ...formData, noJewelry: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>4. Bebas Cincin / Perhiasan</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.workShoesClean}
                    onChange={(e) => setFormData({ ...formData, workShoesClean: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>5. Sandal Produksi Bersih</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.handWashing}
                    onChange={(e) => setFormData({ ...formData, handWashing: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>6. Cuci Tangan dg Sabun</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer col-span-2">
                  <input
                    type="checkbox"
                    checked={formData.healthFit}
                    onChange={(e) => setFormData({ ...formData, healthFit: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>7. Kondisi Sehat (Tidak Batuk/Flu, Tidak Ada Luka Terbuka)</span>
                </label>
              </div>
            </div>

            {!isFormCompliant && (
              <div>
                <label className="text-xs font-semibold text-red-600">
                  Tindakan Perbaikan / Catatan Khusus (Wajib diisi jika tidak lolos)
                </label>
                <Input
                  placeholder="Misal: Diberikan masker & hairnet baru / Disuruh ganti sandal produksi"
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                  className="mt-1 h-9 text-xs border-red-300"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground">Nama Petugas Pemeriksa (QC)</label>
              <Input
                value={formData.inspectorName}
                onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? "Menyimpan..." : "Simpan Catatan Hygiene"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
