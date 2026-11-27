"use client";

import * as React from "react";
import {
  Thermometer,
  Filter,
  Nut,
  Plus,
  Download,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  qcApi,
  LiquidSugarFlowStatusItem,
  SterilizationTempItem,
  CreateSterilizationTempInput,
  FilterMeshMonitoringItem,
  CreateFilterMeshInput,
  MeshBoltMonitoringItem,
  CreateMeshBoltInput,
} from "@/lib/api/qc";
import { exportMNPExcel, exportMNBExcel, exportMasterQC011Excel } from "@/lib/utils/export-qc-excel";
import { exportMSSExcel } from "@/lib/utils/export-liquid-sugar-excel";

interface Stage2PreProcessFormsProps {
  month: string;
  batchNo: string;
  flowStatus: LiquidSugarFlowStatusItem | null;
  onDataChanged: () => void;
}

type Stage2Tab = "mss2" | "mnp" | "mnb";

export function Stage2PreProcessForms({ month, batchNo, flowStatus, onDataChanged }: Stage2PreProcessFormsProps) {
  const [subTab, setSubTab] = React.useState<Stage2Tab>("mss2");
  const [mssList, setMssList] = React.useState<SterilizationTempItem[]>([]);
  const [mnpList, setMnpList] = React.useState<FilterMeshMonitoringItem[]>([]);
  const [mnbList, setMnbList] = React.useState<MeshBoltMonitoringItem[]>([]);

  // Dialogs
  const [isMssOpen, setIsMssOpen] = React.useState(false);
  const [editingMssId, setEditingMssId] = React.useState<string | null>(null);
  const [mssForm, setMssForm] = React.useState<CreateSterilizationTempInput>({
    stage: "tahap_2",
    checkDate: new Date().toISOString().slice(0, 10),
    batchNo: batchNo || "",
    packagingType: "Jerigen 25 Kg",
    initialTime: "08:30",
    initialTemp: 30,
    heatingTime: "08:45",
    heatingTemp: 72,
    finalTime: "09:35",
    finalTemp: 74,
    issues: "",
    actionTaken: "",
    qcName: "Staff QC",
    qaVerifiedBy: "Supervisor QA",
    notes: "",
  });

  const [isMnpOpen, setIsMnpOpen] = React.useState(false);
  const [mnpForm, setMnpForm] = React.useState<CreateFilterMeshInput>({
    documentCode: "QC-011-MNP",
    category: "gula_cair",
    location: "Ruang Gula Cair",
    checkDate: new Date().toISOString().slice(0, 10),
    productName: "Gula Cair Kelapa Organik",
    productCode: "GC-ORG-01",
    batchNo: batchNo || "",
    meshSize: "Mesh 150",
    picResponsible: "Sajiman",
    initialCondition: "Baik",
    initialFindings: "",
    initialAction: "",
    initialPicName: "Sajiman",
    initialQcName: "Staff QC",
    finalCondition: "Baik",
    finalFindings: "",
    finalAction: "",
    finalPicName: "Sajiman",
    finalQcName: "Staff QC",
    notes: "",
  });

  const [isMnbOpen, setIsMnbOpen] = React.useState(false);
  const [mnbForm, setMnbForm] = React.useState<CreateMeshBoltInput>({
    documentCode: "QC-011-MNB",
    formType: "MNB",
    stageCategory: "gula_cair",
    room: "Tangki Gula Cair",
    machineNo: "Tangki Masak 01",
    checkDate: new Date().toISOString().slice(0, 10),
    batchNo: batchNo || "",
    picResponsible: "Sajiman",
    initialBoltCount: 8,
    initialIsComplete: true,
    initialIsTight: true,
    initialCondition: "Lengkap & Kencang",
    initialFindings: "",
    initialAction: "",
    initialPicName: "Sajiman",
    initialQcName: "Staff QC",
    finalBoltCount: 8,
    finalIsComplete: true,
    finalIsTight: true,
    finalFindings: "",
    finalAction: "",
    finalPicName: "Sajiman",
    finalQcName: "Staff QC",
    qaVerifiedBy: "Supervisor QA",
    notes: "",
  });

  React.useEffect(() => {
    if (batchNo) {
      setMssForm((f) => ({ ...f, batchNo }));
      setMnpForm((f) => ({ ...f, batchNo }));
      setMnbForm((f) => ({ ...f, batchNo }));
    }
  }, [batchNo]);

  const fetchTabData = React.useCallback(async () => {
    const [mssRes, mnpRes, mnbRes] = await Promise.allSettled([
      qcApi.listSterilizationTempLogs({ month, stage: "tahap_2", batchNo: batchNo || undefined }),
      qcApi.listFilterMeshLogs({ month, category: "gula_cair" }),
      qcApi.listMeshBoltLogs({ month, formType: "MNB" }),
    ]);
    if (mssRes.status === "fulfilled") setMssList(mssRes.value.data || []);
    if (mnpRes.status === "fulfilled") {
      const list = mnpRes.value.data || [];
      setMnpList(batchNo ? list.filter((it) => (it.batchNo || "").toLowerCase() === batchNo.toLowerCase()) : list);
    }
    if (mnbRes.status === "fulfilled") {
      const list = mnbRes.value.data || [];
      setMnbList(batchNo ? list.filter((it) => (it.batchNo || "").toLowerCase() === batchNo.toLowerCase()) : list);
    }
  }, [month, batchNo]);

  React.useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  const handleSaveMss = async () => {
    try {
      if (editingMssId) {
        await qcApi.updateSterilizationTempLog(editingMssId, { ...mssForm, stage: "tahap_2" });
      } else {
        await qcApi.createSterilizationTempLog({ ...mssForm, stage: "tahap_2" });
      }
      setIsMssOpen(false);
      setEditingMssId(null);
      await fetchTabData();
      onDataChanged();
    } catch (err) {
      alert("Gagal menyimpan MSS Tahap 2: " + (err as Error).message);
    }
  };

  const handleDeleteMss = async (id: string) => {
    if (!confirm("Hapus catatan MSS Tahap 2 ini?")) return;
    await qcApi.deleteSterilizationTempLog(id);
    await fetchTabData();
    onDataChanged();
  };

  const handleSaveMnp = async () => {
    try {
      await qcApi.createFilterMeshLog({ ...mnpForm, category: "gula_cair", location: "Ruang Gula Cair" });
      setIsMnpOpen(false);
      await fetchTabData();
      onDataChanged();
    } catch (err) {
      alert("Gagal menyimpan form MNP: " + (err as Error).message);
    }
  };

  const handleSaveMnb = async () => {
    try {
      await qcApi.createMeshBoltLog({ ...mnbForm, formType: "MNB", stageCategory: "gula_cair" });
      setIsMnbOpen(false);
      await fetchTabData();
      onDataChanged();
    } catch (err) {
      alert("Gagal menyimpan form MNB: " + (err as Error).message);
    }
  };

  const mssCount = flowStatus?.mssStage2Count ?? mssList.length;
  const mnpCount = flowStatus?.mnpCount ?? mnpList.length;
  const mnbCount = flowStatus?.mnbCount ?? mnbList.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("mss2")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              subTab === "mss2"
                ? "bg-amber-600 text-white border-amber-600"
                : mssCount > 0
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-muted/50 text-muted-foreground border-border"
            }`}
          >
            <Thermometer className="h-3.5 w-3.5" />
            1. Monitoring Suhu Sterilisasi (Tahap 2)
            <Badge variant="outline" className={`text-[10px] font-mono ${subTab === "mss2" ? "border-white/40 text-white" : ""}`}>{mssCount}</Badge>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("mnp")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              subTab === "mnp"
                ? "bg-amber-600 text-white border-amber-600"
                : mnpCount > 0
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-muted/50 text-muted-foreground border-border"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            2a. QC-011-MNP: Saringan Mesh
            <Badge variant="outline" className={`text-[10px] font-mono ${subTab === "mnp" ? "border-white/40 text-white" : ""}`}>{mnpCount}</Badge>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("mnb")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              subTab === "mnb"
                ? "bg-amber-600 text-white border-amber-600"
                : mnbCount > 0
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-muted/50 text-muted-foreground border-border"
            }`}
          >
            <Nut className="h-3.5 w-3.5" />
            2b. QC-011-MNB: Mur Baut & Ring Tangki
            <Badge variant="outline" className={`text-[10px] font-mono ${subTab === "mnb" ? "border-white/40 text-white" : ""}`}>{mnbCount}</Badge>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 text-emerald-700 border-emerald-300"
            onClick={() => {
              if (subTab === "mss2") exportMSSExcel(mssList, "tahap_2", month);
              else if (subTab === "mnp") exportMNPExcel(mnpList, month);
              else exportMNBExcel(mnbList, month);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Export {subTab.toUpperCase()}
          </Button>
          {subTab !== "mss2" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 text-emerald-700 border-emerald-500"
              onClick={() => exportMasterQC011Excel({ mnp: mnpList, mnb: mnbList, filterMonth: month })}
            >
              <Download className="h-3.5 w-3.5" />
              Export Master QC-011
            </Button>
          )}
          <Button
            size="sm"
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => {
              if (subTab === "mss2") { setEditingMssId(null); setIsMssOpen(true); }
              else if (subTab === "mnp") setIsMnpOpen(true);
              else setIsMnbOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Catat {subTab.toUpperCase()} Baru
          </Button>
        </div>
      </div>

      {/* MSS Tahap 2 Table */}
      {subTab === "mss2" && (
        <Card className="border shadow-xs">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-2.5">No. Dokumen</th>
                  <th className="p-2.5">Tanggal & Batch</th>
                  <th className="p-2.5">Kemasan</th>
                  <th className="p-2.5">Awal</th>
                  <th className="p-2.5">Heating (≥70°C)</th>
                  <th className="p-2.5">Akhir (≥45 mnt)</th>
                  <th className="p-2.5">Durasi</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mssList.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Belum ada catatan Monitoring Suhu Sterilisasi (Tahap 2).</td></tr>
                ) : mssList.map((it) => (
                  <tr key={it.id} className="hover:bg-muted/30">
                    <td className="p-2.5 font-mono font-semibold text-primary">{it.documentNo}</td>
                    <td className="p-2.5">
                      <div>{it.checkDate}</div>
                      {it.batchNo && <div className="text-[11px] font-mono text-muted-foreground">{it.batchNo}</div>}
                    </td>
                    <td className="p-2.5">{it.packagingType}</td>
                    <td className="p-2.5 font-mono">{it.initialTime} / {it.initialTemp}°C</td>
                    <td className="p-2.5 font-mono">{it.heatingTime} / <strong>{it.heatingTemp}°C</strong></td>
                    <td className="p-2.5 font-mono">{it.finalTime} / {it.finalTemp}°C</td>
                    <td className="p-2.5 font-mono">{it.durationMinutes} mnt</td>
                    <td className="p-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${it.overallStatus === "passed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {it.overallStatus === "passed" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        {it.overallStatus === "passed" ? "SESUAI" : "TINDAKAN"}
                      </span>
                    </td>
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <button type="button" onClick={() => {
                        setEditingMssId(it.id);
                        setMssForm({
                          stage: "tahap_2", checkDate: it.checkDate, batchNo: it.batchNo || "",
                          packagingType: it.packagingType, initialTime: it.initialTime, initialTemp: it.initialTemp,
                          heatingTime: it.heatingTime, heatingTemp: it.heatingTemp, finalTime: it.finalTime, finalTemp: it.finalTemp,
                          issues: it.issues || "", actionTaken: it.actionTaken || "", qcName: it.qcName || "", qaVerifiedBy: it.qaVerifiedBy || "", notes: it.notes || "",
                        });
                        setIsMssOpen(true);
                      }} className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleDeleteMss(it.id)} className="p-1 hover:bg-rose-100 text-rose-600 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* MNP Table */}
      {subTab === "mnp" && (
        <Card className="border shadow-xs">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-2.5">No. Dokumen</th>
                  <th className="p-2.5">Tanggal & Batch</th>
                  <th className="p-2.5">Produk & Kode</th>
                  <th className="p-2.5">Mesh</th>
                  <th className="p-2.5">Awal</th>
                  <th className="p-2.5">Akhir</th>
                  <th className="p-2.5">PIC / QC</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mnpList.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Belum ada data Monitoring Proses Penyaringan (QC-011-MNP).</td></tr>
                ) : mnpList.map((it) => (
                  <tr key={it.id} className="hover:bg-muted/30">
                    <td className="p-2.5 font-mono font-semibold text-primary">{it.documentNo}</td>
                    <td className="p-2.5">
                      <div>{it.checkDate}</div>
                      {it.batchNo && <div className="text-[11px] font-mono text-muted-foreground">{it.batchNo}</div>}
                    </td>
                    <td className="p-2.5">
                      <div className="font-medium">{it.productName}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{it.productCode || "-"}</div>
                    </td>
                    <td className="p-2.5 font-semibold text-amber-700">{it.meshSize}</td>
                    <td className="p-2.5">{it.initialCondition}</td>
                    <td className="p-2.5">{it.finalCondition}</td>
                    <td className="p-2.5">{it.picResponsible} / {it.finalQcName || "-"}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${it.overallStatus === "passed" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {it.overallStatus === "passed" ? "LULUS" : "TINDAKAN"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* MNB Table */}
      {subTab === "mnb" && (
        <Card className="border shadow-xs">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-2.5">No. Dokumen</th>
                  <th className="p-2.5">Tanggal & Batch</th>
                  <th className="p-2.5">Tangki</th>
                  <th className="p-2.5">Baut Awal</th>
                  <th className="p-2.5">Baut Akhir</th>
                  <th className="p-2.5">Temuan</th>
                  <th className="p-2.5">PIC / QC</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mnbList.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Belum ada data Monitoring Mur Baut & Ring Tangki (QC-011-MNB).</td></tr>
                ) : mnbList.map((it) => (
                  <tr key={it.id} className="hover:bg-muted/30">
                    <td className="p-2.5 font-mono font-semibold text-primary">{it.documentNo}</td>
                    <td className="p-2.5">
                      <div>{it.checkDate}</div>
                      {it.batchNo && <div className="text-[11px] font-mono text-muted-foreground">{it.batchNo}</div>}
                    </td>
                    <td className="p-2.5 font-medium">{it.machineNo || it.room}</td>
                    <td className="p-2.5">{it.initialBoltCount} Baut</td>
                    <td className="p-2.5">{it.finalBoltCount} Baut</td>
                    <td className="p-2.5">{it.finalFindings || "-"}</td>
                    <td className="p-2.5">{it.picResponsible} / {it.finalQcName || "-"}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${it.overallStatus === "passed" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {it.overallStatus === "passed" ? "LULUS" : "BAHAYA FISIK"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* DIALOG MSS Tahap 2 */}
      <Dialog open={isMssOpen} onOpenChange={setIsMssOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Form QC-057-MSS: Monitoring Suhu Sterilisasi (Tahap 2)</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><label className="font-semibold">Tanggal *</label><Input type="date" value={mssForm.checkDate} onChange={(e) => setMssForm({ ...mssForm, checkDate: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Batch Number</label><Input value={mssForm.batchNo} onChange={(e) => setMssForm({ ...mssForm, batchNo: e.target.value })} className="mt-1" /></div>
            <div className="col-span-2"><label className="font-semibold">Kemasan *</label><Input value={mssForm.packagingType} onChange={(e) => setMssForm({ ...mssForm, packagingType: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Awal Waktu</label><Input type="time" value={mssForm.initialTime} onChange={(e) => setMssForm({ ...mssForm, initialTime: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Awal Suhu (°C)</label><Input type="number" step="0.1" value={mssForm.initialTemp} onChange={(e) => setMssForm({ ...mssForm, initialTemp: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
            <div><label className="font-medium">Heating Waktu</label><Input type="time" value={mssForm.heatingTime} onChange={(e) => setMssForm({ ...mssForm, heatingTime: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Heating Suhu (°C)</label><Input type="number" step="0.1" value={mssForm.heatingTemp} onChange={(e) => setMssForm({ ...mssForm, heatingTemp: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
            <div><label className="font-medium">Akhir Waktu</label><Input type="time" value={mssForm.finalTime} onChange={(e) => setMssForm({ ...mssForm, finalTime: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Akhir Suhu (°C)</label><Input type="number" step="0.1" value={mssForm.finalTemp} onChange={(e) => setMssForm({ ...mssForm, finalTemp: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
            <div><label className="font-medium">Paraf QC</label><Input value={mssForm.qcName} onChange={(e) => setMssForm({ ...mssForm, qcName: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Verifikasi QA</label><Input value={mssForm.qaVerifiedBy} onChange={(e) => setMssForm({ ...mssForm, qaVerifiedBy: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMssOpen(false)}>Batal</Button>
            <Button onClick={handleSaveMss} className="bg-amber-600 hover:bg-amber-700 text-white">Simpan MSS Tahap 2</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG MNP */}
      <Dialog open={isMnpOpen} onOpenChange={setIsMnpOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Form QC-011-MNP: Monitoring Proses Penyaringan Gula Cair</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><label className="font-semibold">Tanggal *</label><Input type="date" value={mnpForm.checkDate} onChange={(e) => setMnpForm({ ...mnpForm, checkDate: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Batch Number</label><Input value={mnpForm.batchNo} onChange={(e) => setMnpForm({ ...mnpForm, batchNo: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Nama Produk *</label><Input value={mnpForm.productName} onChange={(e) => setMnpForm({ ...mnpForm, productName: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Kode Produk</label><Input value={mnpForm.productCode} onChange={(e) => setMnpForm({ ...mnpForm, productCode: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Ukuran Mesh *</label><Input value={mnpForm.meshSize} onChange={(e) => setMnpForm({ ...mnpForm, meshSize: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">PIC (Operator) *</label><Input value={mnpForm.picResponsible} onChange={(e) => setMnpForm({ ...mnpForm, picResponsible: e.target.value, initialPicName: e.target.value, finalPicName: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Kondisi Awal</label><Input value={mnpForm.initialCondition} onChange={(e) => setMnpForm({ ...mnpForm, initialCondition: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Kondisi Akhir</label><Input value={mnpForm.finalCondition} onChange={(e) => setMnpForm({ ...mnpForm, finalCondition: e.target.value })} className="mt-1" /></div>
            <div className="col-span-2"><label className="font-medium">Temuan Akhir</label><Input value={mnpForm.finalFindings} onChange={(e) => setMnpForm({ ...mnpForm, finalFindings: e.target.value })} className="mt-1" /></div>
            <div className="col-span-2"><label className="font-medium">Tindakan Perbaikan</label><Input value={mnpForm.finalAction} onChange={(e) => setMnpForm({ ...mnpForm, finalAction: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMnpOpen(false)}>Batal</Button>
            <Button onClick={handleSaveMnp} className="bg-amber-600 hover:bg-amber-700 text-white">Simpan MNP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG MNB */}
      <Dialog open={isMnbOpen} onOpenChange={setIsMnbOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Form QC-011-MNB: Monitoring Mur Baut & Ring Tangki Gula Cair</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><label className="font-semibold">Tanggal *</label><Input type="date" value={mnbForm.checkDate} onChange={(e) => setMnbForm({ ...mnbForm, checkDate: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Batch Number</label><Input value={mnbForm.batchNo} onChange={(e) => setMnbForm({ ...mnbForm, batchNo: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">Tangki Gula Cair *</label><Input value={mnbForm.machineNo} onChange={(e) => setMnbForm({ ...mnbForm, machineNo: e.target.value })} className="mt-1" /></div>
            <div><label className="font-semibold">PIC *</label><Input value={mnbForm.picResponsible} onChange={(e) => setMnbForm({ ...mnbForm, picResponsible: e.target.value, initialPicName: e.target.value, finalPicName: e.target.value })} className="mt-1" /></div>
            <div><label className="font-medium">Jumlah Baut Awal</label><Input type="number" value={mnbForm.initialBoltCount} onChange={(e) => setMnbForm({ ...mnbForm, initialBoltCount: parseInt(e.target.value) || 0 })} className="mt-1" /></div>
            <div><label className="font-medium">Jumlah Baut Akhir</label><Input type="number" value={mnbForm.finalBoltCount} onChange={(e) => setMnbForm({ ...mnbForm, finalBoltCount: parseInt(e.target.value) || 0 })} className="mt-1" /></div>
            <div className="col-span-2"><label className="font-medium">Temuan / Catatan</label><Input value={mnbForm.finalFindings} onChange={(e) => setMnbForm({ ...mnbForm, finalFindings: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMnbOpen(false)}>Batal</Button>
            <Button onClick={handleSaveMnb} className="bg-amber-600 hover:bg-amber-700 text-white">Simpan MNB</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
