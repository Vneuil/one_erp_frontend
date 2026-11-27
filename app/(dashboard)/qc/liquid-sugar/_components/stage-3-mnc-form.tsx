"use client";

import * as React from "react";
import { Flame, Plus, Download, CheckCircle2, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { qcApi, LiquidSugarProcessingItem, CreateLiquidSugarProcessingInput } from "@/lib/api/qc";
import { exportMNCExcel } from "@/lib/utils/export-liquid-sugar-excel";

interface Stage3MncFormProps {
  month: string;
  batchNo: string;
  onDataChanged: () => void;
}

export function Stage3MncForm({ month, batchNo, onDataChanged }: Stage3MncFormProps) {
  const [list, setList] = React.useState<LiquidSugarProcessingItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<CreateLiquidSugarProcessingInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    batchNo: batchNo || "",
    productCode: "GC-ORG-01",
    productName: "Gula Cair Kelapa Organik",
    initialTime: "09:00",
    initialTemp: 32,
    initialMoisture: 28.0,
    initialBrix: 70.0,
    initialPh: 6.1,
    heatingTime: "09:20",
    heatingTemp: 92.5,
    finalTime: "09:35",
    finalProductTemp: 88.0,
    finalMoisture: 24.0,
    finalBrix: 75.5,
    finalPh: 6.0,
    issues: "",
    actionTaken: "",
    picName: "Sajiman",
    qcName: "Staff QC",
    qaVerifiedBy: "Supervisor QA",
    notes: "",
  });

  React.useEffect(() => {
    if (batchNo) setForm((f) => ({ ...f, batchNo }));
  }, [batchNo]);

  const fetchData = React.useCallback(async () => {
    const res = await qcApi.listLiquidSugarProcessingLogs({ month, batchNo: batchNo || undefined });
    setList(res.data || []);
  }, [month, batchNo]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (editingId) {
        await qcApi.updateLiquidSugarProcessingLog(editingId, form);
      } else {
        await qcApi.createLiquidSugarProcessingLog(form);
      }
      setIsOpen(false);
      setEditingId(null);
      await fetchData();
      onDataChanged();
    } catch (err) {
      alert("Gagal menyimpan form MNC: " + (err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan MNC ini?")) return;
    await qcApi.deleteLiquidSugarProcessingLog(id);
    await fetchData();
    onDataChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flame className="h-4 w-4 text-amber-600" />
          <span>Form <strong>QC-014-MNC</strong> — Heating CCP: <strong>90–95°C, minimal 10 menit</strong>.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 text-emerald-700 border-emerald-300" onClick={() => exportMNCExcel(list, month)}>
            <Download className="h-3.5 w-3.5" />
            Export MNC Excel
          </Button>
          <Button size="sm" className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setEditingId(null); setIsOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Catat MNC Baru
          </Button>
        </div>
      </div>

      <Card className="border shadow-xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="p-2.5">No. Dokumen</th>
                <th className="p-2.5">Tanggal & Batch</th>
                <th className="p-2.5">Kode Produk</th>
                <th className="p-2.5">Awal (Suhu / Air / Brix / pH)</th>
                <th className="p-2.5">Heating CCP (90–95°C)</th>
                <th className="p-2.5">Akhir (Suhu / Air / Brix / pH)</th>
                <th className="p-2.5">PIC / QC</th>
                <th className="p-2.5 text-center">Status CCP</th>
                <th className="p-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Belum ada data Monitoring Pengolahan Gula Cair (QC-014-MNC).</td></tr>
              ) : list.map((it) => (
                <tr key={it.id} className="hover:bg-muted/30">
                  <td className="p-2.5 font-mono font-semibold text-primary">{it.documentNo}</td>
                  <td className="p-2.5">
                    <div>{it.checkDate}</div>
                    {it.batchNo && <div className="text-[11px] font-mono text-muted-foreground">{it.batchNo}</div>}
                  </td>
                  <td className="p-2.5 font-mono font-semibold">{it.productCode}</td>
                  <td className="p-2.5 font-mono text-[11px]">
                    {it.initialTime} · {it.initialTemp}°C · {it.initialMoisture}% · {it.initialBrix}°Bx · pH {it.initialPh}
                  </td>
                  <td className="p-2.5 font-mono text-[11px]">
                    <div>{it.heatingTime} · <strong>{it.heatingTemp}°C</strong></div>
                    <div className="text-muted-foreground">Durasi: {it.heatingDurationMin} mnt</div>
                  </td>
                  <td className="p-2.5 font-mono text-[11px]">
                    {it.finalTime} · {it.finalProductTemp}°C · {it.finalMoisture}% · <strong>{it.finalBrix}°Bx</strong> · pH {it.finalPh}
                  </td>
                  <td className="p-2.5">{it.picName} / {it.qcName || "-"}</td>
                  <td className="p-2.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      it.overallStatus === "passed" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {it.overallStatus === "passed" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {it.overallStatus === "passed" ? "LOLOS CCP" : it.overallStatus === "ccp_alert" ? "CCP ALERT" : "TINDAKAN"}
                    </span>
                  </td>
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <button type="button" onClick={() => {
                      setEditingId(it.id);
                      setForm({
                        checkDate: it.checkDate, batchNo: it.batchNo || "", productCode: it.productCode, productName: it.productName || "",
                        initialTime: it.initialTime, initialTemp: it.initialTemp, initialMoisture: it.initialMoisture, initialBrix: it.initialBrix, initialPh: it.initialPh,
                        heatingTime: it.heatingTime, heatingTemp: it.heatingTemp,
                        finalTime: it.finalTime, finalProductTemp: it.finalProductTemp, finalMoisture: it.finalMoisture, finalBrix: it.finalBrix, finalPh: it.finalPh,
                        issues: it.issues || "", actionTaken: it.actionTaken || "", picName: it.picName, qcName: it.qcName || "", qaVerifiedBy: it.qaVerifiedBy || "", notes: it.notes || "",
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Form QC-014-MNC: Monitoring Proses Pengolahan Gula Cair</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><label className="font-semibold">Tanggal *</label><Input type="date" value={form.checkDate} onChange={(e) => setForm({ ...form, checkDate: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Kode Produk *</label><Input value={form.productCode} onChange={(e) => setForm({ ...form, productCode: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Batch Number</label><Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} className="mt-1" /></div>

            <div className="col-span-3 border-t pt-2 font-bold text-amber-800">Fase AWAL (Api Mulai Dinyalakan)</div>
            <div className="col-span-3 grid grid-cols-5 gap-2">
              <div><label>Waktu (WIB)</label><Input type="time" value={form.initialTime} onChange={(e) => setForm({ ...form, initialTime: e.target.value })} className="mt-1" /></div>
              <div><label>Suhu (°C)</label><Input type="number" step="0.1" value={form.initialTemp} onChange={(e) => setForm({ ...form, initialTemp: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
              <div><label>Kadar Air (%)</label><Input type="number" step="0.1" value={form.initialMoisture} onChange={(e) => setForm({ ...form, initialMoisture: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
              <div><label>Brix</label><Input type="number" step="0.1" value={form.initialBrix} onChange={(e) => setForm({ ...form, initialBrix: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
              <div><label>pH</label><Input type="number" step="0.1" value={form.initialPh} onChange={(e) => setForm({ ...form, initialPh: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
            </div>

            <div className="col-span-3 border-t pt-2 font-bold text-rose-700">Fase HEATING (CCP: 90–95°C, Min 10 Menit)</div>
            <div><label>Waktu Heating (WIB)</label><Input type="time" value={form.heatingTime} onChange={(e) => setForm({ ...form, heatingTime: e.target.value })} className="mt-1" /></div>
            <div><label>Suhu Heating (°C)</label><Input type="number" step="0.1" value={form.heatingTemp} onChange={(e) => setForm({ ...form, heatingTemp: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
            <div className="flex items-end pb-2 text-[11px] text-muted-foreground">Durasi dihitung dari Heating s/d Akhir</div>

            <div className="col-span-3 border-t pt-2 font-bold text-emerald-800">Fase AKHIR (Produk Siap Diturunkan)</div>
            <div className="col-span-3 grid grid-cols-5 gap-2">
              <div><label>Waktu (WIB)</label><Input type="time" value={form.finalTime} onChange={(e) => setForm({ ...form, finalTime: e.target.value })} className="mt-1" /></div>
              <div><label>Suhu Produk (°C)</label><Input type="number" step="0.1" value={form.finalProductTemp} onChange={(e) => setForm({ ...form, finalProductTemp: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
              <div><label>Kadar Air (%)</label><Input type="number" step="0.1" value={form.finalMoisture} onChange={(e) => setForm({ ...form, finalMoisture: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
              <div><label>Brix</label><Input type="number" step="0.1" value={form.finalBrix} onChange={(e) => setForm({ ...form, finalBrix: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
              <div><label>pH</label><Input type="number" step="0.1" value={form.finalPh} onChange={(e) => setForm({ ...form, finalPh: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
            </div>

            <div><label className="font-medium">Permasalahan</label><Input value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Tindakan</label><Input value={form.actionTaken} onChange={(e) => setForm({ ...form, actionTaken: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="font-semibold">PIC *</label><Input value={form.picName} onChange={(e) => setForm({ ...form, picName: e.target.value })} className="mt-1" /></div>
              <div><label className="font-medium">Paraf QC</label><Input value={form.qcName} onChange={(e) => setForm({ ...form, qcName: e.target.value })} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">Simpan MNC</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
