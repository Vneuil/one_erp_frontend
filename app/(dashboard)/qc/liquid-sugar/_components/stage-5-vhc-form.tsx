"use client";

import * as React from "react";
import { Droplets, Plus, Download, CheckCircle2, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { qcApi, LiquidSugarWashVerificationItem, CreateLiquidSugarWashVerificationInput } from "@/lib/api/qc";
import { exportVHCExcel } from "@/lib/utils/export-liquid-sugar-excel";

interface Stage5VhcFormProps {
  month: string;
  batchNo: string;
  onDataChanged: () => void;
}

export function Stage5VhcForm({ month, batchNo, onDataChanged }: Stage5VhcFormProps) {
  const [list, setList] = React.useState<LiquidSugarWashVerificationItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<CreateLiquidSugarWashVerificationInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    batchNo: batchNo || "",
    location: "Gula Cair",
    picResponsible: "QC (Andin)",
    waterTempActual: 78.0,
    circulationStartTime: "15:00",
    circulationEndTime: "15:15",
    rinseColor: "Bening",
    rinseAroma: "Normal",
    rinseDirt: "Bebas kotoran",
    qcVerifierName: "Andin",
    qaVerifiedBy: "Supervisor QA",
    qaVerifiedDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  React.useEffect(() => {
    if (batchNo) setForm((f) => ({ ...f, batchNo }));
  }, [batchNo]);

  const fetchData = React.useCallback(async () => {
    const res = await qcApi.listLiquidSugarWashVerifications({ month, batchNo: batchNo || undefined });
    setList(res.data || []);
  }, [month, batchNo]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (editingId) {
        await qcApi.updateLiquidSugarWashVerification(editingId, form);
      } else {
        await qcApi.createLiquidSugarWashVerification(form);
      }
      setIsOpen(false);
      setEditingId(null);
      await fetchData();
      onDataChanged();
    } catch (err) {
      alert("Gagal menyimpan form VHC: " + (err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan VHC ini?")) return;
    await qcApi.deleteLiquidSugarWashVerification(id);
    await fetchData();
    onDataChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Droplets className="h-4 w-4 text-cyan-600" />
          <span>Form <strong>QC-055-VHC Rev. 00</strong> — Verifikasi Hasil Cuci Ruang Gula Cair (Air ≥75°C, Sirkulasi ≥10 mnt, Bilas ke-2 Bening/Normal/Bebas kotoran).</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 text-emerald-700 border-emerald-300" onClick={() => exportVHCExcel(list, month)}>
            <Download className="h-3.5 w-3.5" />
            Export VHC Excel
          </Button>
          <Button size="sm" className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setEditingId(null); setIsOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Catat VHC Baru
          </Button>
        </div>
      </div>

      <Card className="border shadow-xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="p-2.5">No. Dokumen</th>
                <th className="p-2.5">Tgl Pencucian & Batch</th>
                <th className="p-2.5">1. Suhu Air (Min 75°C)</th>
                <th className="p-2.5">2. Sirkulasi Pipa (Min 10 mnt)</th>
                <th className="p-2.5">3. Pembilasan ke-2 (Warna / Aroma / Kotoran)</th>
                <th className="p-2.5">QC / QA</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Belum ada data Verifikasi Hasil Cuci Ruang Gula Cair (QC-055-VHC).</td></tr>
              ) : list.map((it) => (
                <tr key={it.id} className="hover:bg-muted/30">
                  <td className="p-2.5 font-mono font-semibold text-primary">{it.documentNo}</td>
                  <td className="p-2.5">
                    <div>{it.checkDate}</div>
                    {it.batchNo && <div className="text-[11px] font-mono text-muted-foreground">{it.batchNo}</div>}
                  </td>
                  <td className="p-2.5 font-mono">
                    <span className={it.isTempStandardMet ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                      {it.waterTempActual}°C
                    </span>
                  </td>
                  <td className="p-2.5 font-mono">
                    {it.circulationStartTime} - {it.circulationEndTime} ({it.circulationDurationMin} mnt)
                  </td>
                  <td className="p-2.5">
                    {it.rinseColor} · {it.rinseAroma} · {it.rinseDirt}
                  </td>
                  <td className="p-2.5">{it.qcVerifierName} / {it.qaVerifiedBy || "-"}</td>
                  <td className="p-2.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      it.overallStatus === "passed" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {it.overallStatus === "passed" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {it.overallStatus === "passed" ? "LULUS" : "CUCI ULANG"}
                    </span>
                  </td>
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <button type="button" onClick={() => {
                      setEditingId(it.id);
                      setForm({
                        checkDate: it.checkDate, batchNo: it.batchNo || "", location: it.location, picResponsible: it.picResponsible,
                        waterTempActual: it.waterTempActual, circulationStartTime: it.circulationStartTime, circulationEndTime: it.circulationEndTime,
                        rinseColor: it.rinseColor, rinseAroma: it.rinseAroma, rinseDirt: it.rinseDirt,
                        qcVerifierName: it.qcVerifierName, qaVerifiedBy: it.qaVerifiedBy || "", qaVerifiedDate: it.qaVerifiedDate || "", notes: it.notes || "",
                      });
                      setIsOpen(true);
                    }} className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => handleDelete(it.id)} className="p-1 hover:bg-rose-100 text-rose-600 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Form QC-055-VHC Rev. 00: Verifikasi Hasil Cuci (Ruang Gula Cair)</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><label className="font-semibold">Tanggal Pencucian *</label><Input type="date" value={form.checkDate} onChange={(e) => setForm({ ...form, checkDate: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Batch Number</label><Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} className="mt-1" /></div>

            <div className="col-span-2 border-t pt-2 font-bold text-primary">1. Pemasakan Air di Tangki Gula Cair (Min 75°C)</div>
            <div className="col-span-2"><label className="font-medium">Suhu Aktual (°C)</label><Input type="number" step="0.1" value={form.waterTempActual} onChange={(e) => setForm({ ...form, waterTempActual: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>

            <div className="col-span-2 border-t pt-2 font-bold text-primary">2. Sirkulasi Air Panas di Pipa (Min 10 Menit)</div>
            <div><label className="font-medium">Mulai</label><Input type="time" value={form.circulationStartTime} onChange={(e) => setForm({ ...form, circulationStartTime: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Selesai</label><Input type="time" value={form.circulationEndTime} onChange={(e) => setForm({ ...form, circulationEndTime: e.target.value })} className="mt-1" /></div>

            <div className="col-span-2 border-t pt-2 font-bold text-primary">3. Pembilasan ke-2</div>
            <div>
              <label className="font-medium">Warna</label>
              <select value={form.rinseColor} onChange={(e) => setForm({ ...form, rinseColor: e.target.value })} className="w-full mt-1 h-9 rounded-md border border-input bg-background px-2 text-xs">
                <option value="Bening">Bening</option>
                <option value="Keruh">Keruh</option>
              </select>
            </div>
            <div>
              <label className="font-medium">Aroma</label>
              <select value={form.rinseAroma} onChange={(e) => setForm({ ...form, rinseAroma: e.target.value })} className="w-full mt-1 h-9 rounded-md border border-input bg-background px-2 text-xs">
                <option value="Normal">Normal</option>
                <option value="Aroma sabun">Aroma sabun</option>
                <option value="Aroma gula">Aroma gula</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="font-medium">Kotoran</label>
              <select value={form.rinseDirt} onChange={(e) => setForm({ ...form, rinseDirt: e.target.value })} className="w-full mt-1 h-9 rounded-md border border-input bg-background px-2 text-xs">
                <option value="Bebas kotoran">Bebas kotoran</option>
                <option value="Kotoran terdeteksi">Kotoran terdeteksi</option>
              </select>
            </div>

            <div><label className="font-semibold">Verifikasi QC *</label><Input value={form.qcVerifierName} onChange={(e) => setForm({ ...form, qcVerifierName: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Diketahui QA</label><Input value={form.qaVerifiedBy} onChange={(e) => setForm({ ...form, qaVerifiedBy: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">Simpan VHC</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
