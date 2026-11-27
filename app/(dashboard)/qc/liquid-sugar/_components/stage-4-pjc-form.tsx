"use client";

import * as React from "react";
import { PackageCheck, Plus, Download, CheckCircle2, XCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { qcApi, LiquidSugarFinishedGoodsItem, CreateLiquidSugarFinishedGoodsInput } from "@/lib/api/qc";
import { exportPJCExcel } from "@/lib/utils/export-liquid-sugar-excel";

interface Stage4PjcFormProps {
  month: string;
  batchNo: string;
  onDataChanged: () => void;
}

export function Stage4PjcForm({ month, batchNo, onDataChanged }: Stage4PjcFormProps) {
  const [list, setList] = React.useState<LiquidSugarFinishedGoodsItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<CreateLiquidSugarFinishedGoodsInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    productName: "Gula Cair Kelapa Organik",
    batchNo: batchNo || "",
    rawMaterialCode: "GS-ORG-01",
    checkPackaging: true,
    checkWeight: true,
    weightValue: 25,
    checkShape: true,
    checkAroma: true,
    colorScore: 2,
    colorDescription: "Normal",
    checkTaste: true,
    checkFreeForeignMatter: true,
    checkSolubility: true,
    moistureContent: 24.0,
    phValue: 6.0,
    brixValue: 75.5,
    inspectionDecision: "LOLOS",
    notes: "",
    qcPersonnelName: "Staff QC",
    qaVerifiedBy: "Supervisor QA",
    qaVerifiedDate: new Date().toISOString().slice(0, 10),
  });

  React.useEffect(() => {
    if (batchNo) setForm((f) => ({ ...f, batchNo }));
  }, [batchNo]);

  const fetchData = React.useCallback(async () => {
    const res = await qcApi.listLiquidSugarFinishedGoodsLogs({ month, batchNo: batchNo || undefined });
    setList(res.data || []);
  }, [month, batchNo]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (editingId) {
        await qcApi.updateLiquidSugarFinishedGoodsLog(editingId, form);
      } else {
        await qcApi.createLiquidSugarFinishedGoodsLog(form);
      }
      setIsOpen(false);
      setEditingId(null);
      await fetchData();
      onDataChanged();
    } catch (err) {
      alert("Gagal menyimpan form PJC: " + (err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan PJC ini?")) return;
    await qcApi.deleteLiquidSugarFinishedGoodsLog(id);
    await fetchData();
    onDataChanged();
  };

  const chk = (ok: boolean) => (ok ? "✓" : "✗");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <PackageCheck className="h-4 w-4 text-amber-600" />
          <span>Form <strong>QC-015-PJC Rev. 02</strong> — Pemeriksaan Kualitas Produk Jadi Gula Cair.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 text-emerald-700 border-emerald-300" onClick={() => exportPJCExcel(list, month)}>
            <Download className="h-3.5 w-3.5" />
            Export PJC Excel
          </Button>
          <Button size="sm" className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setEditingId(null); setIsOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Catat PJC Baru
          </Button>
        </div>
      </div>

      <Card className="border shadow-xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="p-2.5">No. Dokumen</th>
                <th className="p-2.5">Tgl & Batch</th>
                <th className="p-2.5">Produk & Kode Bahan</th>
                <th className="p-2.5">Organoleptik (Kms/Brt/Btk/Arm/Rs/Klr/Bba)</th>
                <th className="p-2.5 text-center">Warna</th>
                <th className="p-2.5 text-center">Air / pH / Brix</th>
                <th className="p-2.5">QC / QA</th>
                <th className="p-2.5 text-center">Keputusan</th>
                <th className="p-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Belum ada data Pemeriksaan Produk Jadi Gula Cair (QC-015-PJC).</td></tr>
              ) : list.map((it) => (
                <tr key={it.id} className="hover:bg-muted/30">
                  <td className="p-2.5 font-mono font-semibold text-primary">{it.documentNo}</td>
                  <td className="p-2.5">
                    <div>{it.checkDate}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{it.batchNo}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-medium">{it.productName}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{it.rawMaterialCode || "-"}</div>
                  </td>
                  <td className="p-2.5 font-mono text-[11px]">
                    {chk(it.checkPackaging)} {chk(it.checkWeight)} {chk(it.checkShape)} {chk(it.checkAroma)} {chk(it.checkTaste)} {chk(it.checkSolubility)} {chk(it.checkFreeForeignMatter)}
                  </td>
                  <td className="p-2.5 text-center">{it.colorScore} ({it.colorDescription || "Normal"})</td>
                  <td className="p-2.5 text-center font-mono">
                    {it.moistureContent}% · pH {it.phValue} · <strong>{it.brixValue}°Bx</strong>
                  </td>
                  <td className="p-2.5">{it.qcPersonnelName} / {it.qaVerifiedBy || "-"}</td>
                  <td className="p-2.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      it.inspectionDecision === "LOLOS" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {it.inspectionDecision === "LOLOS" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {it.inspectionDecision}
                    </span>
                  </td>
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <button type="button" onClick={() => {
                      setEditingId(it.id);
                      setForm({
                        checkDate: it.checkDate, productName: it.productName, batchNo: it.batchNo, rawMaterialCode: it.rawMaterialCode || "",
                        checkPackaging: it.checkPackaging, checkWeight: it.checkWeight, weightValue: it.weightValue,
                        checkShape: it.checkShape, checkAroma: it.checkAroma, colorScore: it.colorScore, colorDescription: it.colorDescription || "Normal",
                        checkTaste: it.checkTaste, checkFreeForeignMatter: it.checkFreeForeignMatter, checkSolubility: it.checkSolubility,
                        moistureContent: it.moistureContent, phValue: it.phValue, brixValue: it.brixValue,
                        inspectionDecision: it.inspectionDecision, notes: it.notes || "",
                        qcPersonnelName: it.qcPersonnelName, qaVerifiedBy: it.qaVerifiedBy || "", qaVerifiedDate: it.qaVerifiedDate || "",
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Form QC-015-PJC Rev. 02: Pemeriksaan Kualitas Produk Jadi Gula Cair</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><label className="font-semibold">Tanggal *</label><Input type="date" value={form.checkDate} onChange={(e) => setForm({ ...form, checkDate: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Batch Number *</label><Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Nama Produk *</label><Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Kode Bahan</label><Input value={form.rawMaterialCode} onChange={(e) => setForm({ ...form, rawMaterialCode: e.target.value })} className="mt-1" /></div>

            <div className="col-span-2 border-t pt-2 font-bold text-primary">Ceklis Kondisi Baik (Pengecekan)</div>
            <div className="col-span-2 grid grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded-lg">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.checkPackaging} onChange={(e) => setForm({ ...form, checkPackaging: e.target.checked })} /> Kemasan</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.checkWeight} onChange={(e) => setForm({ ...form, checkWeight: e.target.checked })} /> Berat</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.checkShape} onChange={(e) => setForm({ ...form, checkShape: e.target.checked })} /> Bentuk</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.checkAroma} onChange={(e) => setForm({ ...form, checkAroma: e.target.checked })} /> Aroma</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.checkTaste} onChange={(e) => setForm({ ...form, checkTaste: e.target.checked })} /> Rasa</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.checkSolubility} onChange={(e) => setForm({ ...form, checkSolubility: e.target.checked })} /> Kelarutan</label>
              <label className="flex items-center gap-2 col-span-3 font-semibold text-emerald-800"><input type="checkbox" checked={form.checkFreeForeignMatter} onChange={(e) => setForm({ ...form, checkFreeForeignMatter: e.target.checked })} /> Bebas Benda Asing</label>
            </div>

            <div>
              <label className="font-semibold">Warna* (1–3)</label>
              <select
                value={form.colorScore}
                onChange={(e) => {
                  const s = parseInt(e.target.value, 10);
                  const desc = s === 1 ? "Light Brown" : s === 3 ? "Dark Brown" : "Normal";
                  setForm({ ...form, colorScore: s, colorDescription: desc });
                }}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value={1}>1 — Light Brown</option>
                <option value={2}>2 — Normal</option>
                <option value={3}>3 — Dark Brown</option>
              </select>
            </div>
            <div><label className="font-medium">Berat Aktual (Kg, opsional)</label><Input type="number" step="0.1" value={form.weightValue ?? ""} onChange={(e) => setForm({ ...form, weightValue: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" /></div>

            <div className="col-span-2 grid grid-cols-3 gap-2">
              <div><label className="font-semibold">Kadar Air (%)</label><Input type="number" step="0.1" value={form.moistureContent} onChange={(e) => setForm({ ...form, moistureContent: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
              <div><label className="font-semibold">pH</label><Input type="number" step="0.1" value={form.phValue} onChange={(e) => setForm({ ...form, phValue: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
              <div><label className="font-semibold">Brix</label><Input type="number" step="0.1" value={form.brixValue} onChange={(e) => setForm({ ...form, brixValue: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
            </div>

            <div>
              <label className="font-semibold">Keputusan (Lolos / Ditolak) *</label>
              <select
                value={form.inspectionDecision}
                onChange={(e) => setForm({ ...form, inspectionDecision: e.target.value })}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-2 text-xs font-bold"
              >
                <option value="LOLOS">LOLOS</option>
                <option value="DITOLAK">DITOLAK</option>
              </select>
            </div>
            <div><label className="font-semibold">Paraf QC *</label><Input value={form.qcPersonnelName} onChange={(e) => setForm({ ...form, qcPersonnelName: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Diverifikasi QA</label><Input value={form.qaVerifiedBy} onChange={(e) => setForm({ ...form, qaVerifiedBy: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Keterangan</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">Simpan PJC</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
