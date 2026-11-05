"use client";

import * as React from "react";
import {
  ShieldCheck,
  Plus,
  Printer,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Activity,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { errText, useReport } from "@/components/reports/report-ui";
import { qcApi, PreOpSanitationCheckItem, CreatePreOpCheckInput } from "@/lib/api/qc";

const selectCls = "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

export default function PreOpSanitationPage() {
  const [reload, setReload] = React.useState(0);
  const [filterDate, setFilterDate] = React.useState("");
  const [filterRoom, setFilterRoom] = React.useState("");

  const { data: rawChecks, loading, error } = useReport(
    `qc-preop|${reload}|${filterDate}|${filterRoom}`,
    () => qcApi.listPreOpChecks({ date: filterDate || undefined, room: filterRoom || undefined }).then((r) => r.data || [])
  );
  const checks: PreOpSanitationCheckItem[] = rawChecks ?? [];

  // Dialog State
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<CreatePreOpCheckInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    checkTime: "07:30",
    shift: "Shift 1 (Pagi)",
    room: "Ruang Packing",
    floorClean: true,
    wallCeilingClean: true,
    equipmentSanitized: true,
    trashBinClosed: true,
    lightingProtected: true,
    pestControlIntact: true,
    gaussReading: 11000,
    metalTrapClean: true,
    status: "approved",
    notes: "",
    inspectorName: "Adin (QC)",
    supervisorName: "Abel (Spv Produksi)",
  });

  const handleOpenDialog = () => {
    setFormData({
      checkDate: new Date().toISOString().slice(0, 10),
      checkTime: new Date().toTimeString().slice(0, 5),
      shift: "Shift 1 (Pagi)",
      room: "Ruang Packing",
      floorClean: true,
      wallCeilingClean: true,
      equipmentSanitized: true,
      trashBinClosed: true,
      lightingProtected: true,
      pestControlIntact: true,
      gaussReading: 11000,
      metalTrapClean: true,
      status: "approved",
      notes: "",
      inspectorName: "Adin (QC)",
      supervisorName: "Abel (Spv Produksi)",
    });
    setFormError(null);
    setIsOpen(true);
  };

  const isAyakOrPacking = formData.room === "Ruang Packing" || formData.room === "Ruang Ayak";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      await qcApi.createPreOpCheck({
        ...formData,
        gaussReading: isAyakOrPacking ? Number(formData.gaussReading) || 0 : undefined,
        metalTrapClean: isAyakOrPacking ? formData.metalTrapClean : undefined,
      });
      setIsOpen(false);
      setReload((v) => v + 1);
    } catch (err) {
      setFormError(errText(err, "Gagal mencatat pemeriksaan sarana operasional"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan pemeriksaan pra-operasional ini?")) return;
    try {
      await qcApi.deletePreOpCheck(id);
      setReload((v) => v + 1);
    } catch (err) {
      alert(errText(err, "Gagal menghapus catatan"));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const approvedCount = checks.filter((c) => c.status === "approved").length;
  const holdCount = checks.length - approvedCount;

  const columns: Column<PreOpSanitationCheckItem>[] = [
    {
      key: "date",
      header: "Tanggal & Jam",
      render: (r: PreOpSanitationCheckItem) => (
        <div>
          <div className="font-semibold text-foreground text-xs">{r.checkDate}</div>
          <div className="text-[11px] text-muted-foreground">{r.checkTime} WIB ({r.shift})</div>
        </div>
      ),
    },
    {
      key: "room",
      header: "Ruangan / Fasilitas",
      render: (r: PreOpSanitationCheckItem) => (
        <div>
          <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            {r.room}
          </div>
          {r.supervisorName && (
            <div className="text-[11px] text-muted-foreground">Spv: {r.supervisorName}</div>
          )}
        </div>
      ),
    },
    {
      key: "sanitation",
      header: "Hasil Sanitasi (6 Parameter)",
      render: (r: PreOpSanitationCheckItem) => (
        <div className="flex flex-wrap gap-1 text-[10px]">
          <span className={`px-1.5 py-0.5 rounded ${r.floorClean ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            Lantai: {r.floorClean ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.wallCeilingClean ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            Dinding: {r.wallCeilingClean ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.equipmentSanitized ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            Alat: {r.equipmentSanitized ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.trashBinClosed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            Sampah: {r.trashBinClosed ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.lightingProtected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            Lampu: {r.lightingProtected ? "✓" : "✗"}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${r.pestControlIntact ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            Pest: {r.pestControlIntact ? "✓" : "✗"}
          </span>
        </div>
      ),
    },
    {
      key: "gauss",
      header: "Gauss Meter / Magnet Trap",
      render: (r: PreOpSanitationCheckItem) =>
        r.gaussReading ? (
          <div className="text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              {r.gaussReading.toLocaleString("id-ID")} Gauss
            </span>
            <span className={`text-[10px] font-medium ${r.metalTrapClean ? "text-emerald-700" : "text-red-700"}`}>
              Trap: {r.metalTrapClean ? "Bersih (Nihil Serpihan)" : "Terdeteksi Logam!"}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs italic">-</span>
        ),
    },
    {
      key: "status",
      header: "Status Kesiapan",
      render: (r: PreOpSanitationCheckItem) =>
        r.status === "approved" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Siap Operasi (Pass)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Tunda / Perbaikan
          </span>
        ),
    },
    {
      key: "inspector",
      header: "Inspektor QC",
      render: (r: PreOpSanitationCheckItem) => (
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
      render: (r: PreOpSanitationCheckItem) => (
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
          title="Sarana Produksi Sebelum Operasional (SSO)"
          description="Pemeriksaan sanitasi, higienitas ruangan, kesiapan mesin, dan uji kekuatan Gauss Meter magnet trap sebelum lini produksi dimulai (Doc: SSO)."
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="w-4 h-4" />
              Cetak Dokumen SSO
            </Button>
            <Button size="sm" onClick={handleOpenDialog} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4" />
              Inspeksi Pra-Operasional Baru
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Ruangan Diperiksa</p>
              <p className="text-2xl font-bold text-foreground mt-1">{checks.length} Ruang</p>
            </div>
            <Layers className="w-8 h-8 text-primary/40" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Siap Operasional (Approved)</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{approvedCount} Ruang</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Tunda / Perlu Sanitasi Ulang</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{holdCount} Ruang</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500/40" />
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
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-white text-xs"
            >
              <option value="">Semua Ruangan & Fasilitas</option>
              <option value="Ruang Packing">Ruang Packing</option>
              <option value="Ruang Ayak">Ruang Ayak</option>
              <option value="Ruang Oven">Ruang Oven</option>
              <option value="Ruang Gula Cair">Ruang Gula Cair</option>
              <option value="Ruang VCO">Ruang VCO</option>
              <option value="Gudang Bahan Baku">Gudang Bahan Baku</option>
              <option value="Gudang Bahan Kemas">Gudang Bahan Kemas</option>
            </select>
            {(filterDate || filterRoom) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDate("");
                  setFilterRoom("");
                }}
                className="text-xs text-muted-foreground"
              >
                Reset Filter
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Menampilkan <span className="font-semibold text-foreground">{checks.length}</span> ruangan
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

      {/* Print View: Official SARANA PRODUKSI SEBELUM OPERASIONAL (SSO) */}
      <div className="hidden print:block font-serif text-black p-4 text-xs">
        <div className="border-b-2 border-black pb-3 mb-4 text-center">
          <h1 className="text-lg font-bold tracking-wider uppercase">CV. MANNA / PT MANNA JAYA MAKMUR</h1>
          <p className="text-[11px] text-gray-700">Kulon Progo, D.I. Yogyakarta — Standard Operasional Food Safety & GMP</p>
          <div className="mt-2 inline-block border border-black px-4 py-1 font-bold text-sm bg-gray-100">
            SARANA PRODUKSI SEBELUM OPERASIONAL (SSO)
          </div>
          <div className="text-right text-[10px] mt-1 font-sans">No. Dokumen: QA-002-SSO / Rev 01</div>
        </div>

        <div className="flex justify-between items-center mb-3 text-[11px]">
          <div>
            <div><strong>Tanggal Pemeriksaan:</strong> {filterDate || new Date().toISOString().slice(0, 10)}</div>
            <div><strong>Fasilitas:</strong> CV Manna Production Plant</div>
          </div>
          <div className="text-right">
            <div><strong>Waktu Inspeksi:</strong> Sebelum Operasional Shift Dimulai</div>
            <div><strong>Spv Bertugas:</strong> Adin (QC) / Abel (Produksi)</div>
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-gray-200 text-center">
              <th className="border border-black p-1.5 w-7" rowSpan={2}>No</th>
              <th className="border border-black p-1.5" rowSpan={2}>Ruangan / Fasilitas</th>
              <th className="border border-black p-1.5 w-14" rowSpan={2}>Jam Cek</th>
              <th className="border border-black p-1" colSpan={6}>Kondisi Kebersihan & Sanitasi Ruangan (✓ / ✗)</th>
              <th className="border border-black p-1 w-24" colSpan={2}>Magnet Trap (Ayak/Packing)</th>
              <th className="border border-black p-1.5 w-16" rowSpan={2}>Status Operasi</th>
              <th className="border border-black p-1.5 w-16" rowSpan={2}>Paraf QC</th>
            </tr>
            <tr className="bg-gray-100 text-center text-[9px]">
              <th className="border border-black p-1 w-11">Lantai</th>
              <th className="border border-black p-1 w-11">Dinding</th>
              <th className="border border-black p-1 w-11">Alat/Meja</th>
              <th className="border border-black p-1 w-11">Sampah</th>
              <th className="border border-black p-1 w-11">Lampu</th>
              <th className="border border-black p-1 w-11">Pest</th>
              <th className="border border-black p-1 w-14">Gauss Reading</th>
              <th className="border border-black p-1 w-10">Trap Bersih</th>
            </tr>
          </thead>
          <tbody>
            {checks.length === 0 ? (
              <tr>
                <td colSpan={13} className="border border-black p-4 text-center italic">
                  Nihil data inspeksi sarana pra-operasional pada tanggal ini
                </td>
              </tr>
            ) : (
              checks.map((c, idx) => (
                <tr key={c.id} className="text-center">
                  <td className="border border-black p-1">{idx + 1}</td>
                  <td className="border border-black p-1 text-left font-bold">{c.room}</td>
                  <td className="border border-black p-1">{c.checkTime}</td>
                  <td className="border border-black p-1">{c.floorClean ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.wallCeilingClean ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.equipmentSanitized ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.trashBinClosed ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.lightingProtected ? "✓" : "✗"}</td>
                  <td className="border border-black p-1">{c.pestControlIntact ? "✓" : "✗"}</td>
                  <td className="border border-black p-1 font-mono text-[9px]">
                    {c.gaussReading ? `${c.gaussReading.toLocaleString("id-ID")} G` : "-"}
                  </td>
                  <td className="border border-black p-1">
                    {c.metalTrapClean !== undefined ? (c.metalTrapClean ? "✓" : "✗") : "-"}
                  </td>
                  <td className="border border-black p-1 font-bold">
                    {c.status === "approved" ? "SIAP" : "TUNDA"}
                  </td>
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
            <div>Disetujui Oleh (Kepala Bagian Produksi):</div>
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
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Pemeriksaan Sarana Produksi Sebelum Operasional
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
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
                <label className="text-xs font-semibold text-foreground">Jam Cek</label>
                <Input
                  type="time"
                  value={formData.checkTime}
                  onChange={(e) => setFormData({ ...formData, checkTime: e.target.value })}
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
                  <option value="Shift 1 (Pagi)">Shift 1 (Pagi)</option>
                  <option value="Shift 2 (Siang)">Shift 2 (Siang)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Ruangan / Fasilitas Produksi</label>
              <select
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className={`mt-1 ${selectCls}`}
              >
                <option value="Ruang Packing">Ruang Packing</option>
                <option value="Ruang Ayak">Ruang Ayak</option>
                <option value="Ruang Oven">Ruang Oven</option>
                <option value="Ruang Gula Cair">Ruang Gula Cair</option>
                <option value="Ruang VCO">Ruang VCO</option>
                <option value="Gudang Bahan Baku">Gudang Bahan Baku</option>
                <option value="Gudang Bahan Kemas">Gudang Bahan Kemas</option>
              </select>
            </div>

            {/* Checklist Sanitasi 6 Parameter */}
            <div className="border border-border rounded-lg p-3 bg-muted/20 space-y-2.5">
              <div className="text-xs font-semibold text-foreground mb-1">
                Kondisi Kebersihan & Sanitasi Ruangan:
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.floorClean}
                    onChange={(e) => setFormData({ ...formData, floorClean: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>1. Lantai Bersih & Kering</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.wallCeilingClean}
                    onChange={(e) => setFormData({ ...formData, wallCeilingClean: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>2. Dinding & Plafon Bebas Sawang</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.equipmentSanitized}
                    onChange={(e) => setFormData({ ...formData, equipmentSanitized: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>3. Meja & Mesin Sudah Disanitasi</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.trashBinClosed}
                    onChange={(e) => setFormData({ ...formData, trashBinClosed: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>4. Tempat Sampah Tertutup & Plastik</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.lightingProtected}
                    onChange={(e) => setFormData({ ...formData, lightingProtected: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>5. Lampu Berpelindung (Shatter-proof)</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.pestControlIntact}
                    onChange={(e) => setFormData({ ...formData, pestControlIntact: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>6. Jebakan Hama Utuh / Nihil Pest</span>
                </label>
              </div>
            </div>

            {/* Khusus Ruang Ayak & Ruang Packing: Gauss Meter & Magnet Trap */}
            {isAyakOrPacking && (
              <div className="border border-amber-300 bg-amber-50/50 rounded-lg p-3 space-y-2.5">
                <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-700" />
                  Inspeksi Gauss Meter & Magnet Trap (Khusus Ayak/Packing)
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-medium text-foreground">Kekuatan Gauss Meter (Gauss)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 10000 - 12000"
                      value={formData.gaussReading || ""}
                      onChange={(e) => setFormData({ ...formData, gaussReading: Number(e.target.value) })}
                      className="mt-1 h-9 text-xs bg-white"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Standar minimal: &ge; 10.000 Gauss</p>
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2 cursor-pointer mt-3">
                      <input
                        type="checkbox"
                        checked={formData.metalTrapClean}
                        onChange={(e) => setFormData({ ...formData, metalTrapClean: e.target.checked })}
                        className="rounded text-primary focus:ring-primary w-4 h-4"
                      />
                      <span className="font-medium text-foreground">Magnet Trap Bersih (Nihil Serpihan)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Status Kesiapan Operasional</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className={`mt-1 ${selectCls}`}
                >
                  <option value="approved">Siap Operasional (Approved)</option>
                  <option value="hold">Tunda / Sanitasi Ulang (Hold)</option>
                  <option value="action_required">Perlu Tindakan Perbaikan</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Catatan / Tindakan Perbaikan</label>
                <Input
                  placeholder="Catatan kebersihan..."
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Petugas QC (Inspector)</label>
                <Input
                  value={formData.inspectorName}
                  onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Supervisor Produksi</label>
                <Input
                  value={formData.supervisorName || ""}
                  onChange={(e) => setFormData({ ...formData, supervisorName: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? "Menyimpan..." : "Simpan Dokumen SSO"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
