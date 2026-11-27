"use client";

import * as React from "react";
import {
  Thermometer,
  Eye,
  Zap,
  Sparkles,
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
  LiquidPackagingVisualItem,
  CreateLiquidPackagingVisualInput,
  MetalVerificationItem,
  CreateMetalVerificationInput,
  MetalCleaningItem,
  CreateMetalCleaningInput,
} from "@/lib/api/qc";
import { exportCPPExcel } from "@/lib/utils/export-qc-excel";
import {
  exportMSSExcel,
  exportPVKExcel,
  exportVMDGulaCairExcel,
} from "@/lib/utils/export-liquid-sugar-excel";

interface Stage1PrepFormsProps {
  month: string;
  batchNo: string;
  flowStatus: LiquidSugarFlowStatusItem | null;
  onDataChanged: () => void;
}

type PrepTab = "mss1" | "pvk" | "vmd" | "cpp";

export function Stage1PrepForms({ month, batchNo, flowStatus, onDataChanged }: Stage1PrepFormsProps) {
  const [subTab, setSubTab] = React.useState<PrepTab>("mss1");
  const [loading, setLoading] = React.useState(false);

  const [mssList, setMssList] = React.useState<SterilizationTempItem[]>([]);
  const [pvkList, setPvkList] = React.useState<LiquidPackagingVisualItem[]>([]);
  const [vmdList, setVmdList] = React.useState<MetalVerificationItem[]>([]);
  const [cppList, setCppList] = React.useState<MetalCleaningItem[]>([]);

  // MSS Dialog
  const [isMssOpen, setIsMssOpen] = React.useState(false);
  const [editingMssId, setEditingMssId] = React.useState<string | null>(null);
  const [mssForm, setMssForm] = React.useState<CreateSterilizationTempInput>({
    stage: "tahap_1",
    checkDate: new Date().toISOString().slice(0, 10),
    batchNo: batchNo || "",
    packagingType: "Jerigen 25 Kg",
    initialTime: "07:00",
    initialTemp: 30,
    heatingTime: "07:15",
    heatingTemp: 72,
    finalTime: "08:05",
    finalTemp: 74,
    issues: "",
    actionTaken: "",
    qcName: "Staff QC",
    qaVerifiedBy: "Supervisor QA",
    notes: "",
  });

  // PVK Dialog
  const [isPvkOpen, setIsPvkOpen] = React.useState(false);
  const [editingPvkId, setEditingPvkId] = React.useState<string | null>(null);
  const [pvkForm, setPvkForm] = React.useState<CreateLiquidPackagingVisualInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    batchNo: batchNo || "",
    picResponsible: "Sajiman",
    packagingType: "Jerigen 25 Kg",
    quantity: 40,
    buyerName: "",
    sterilizationInfo: "Steril 72°C / 45 menit",
    packagingCondition: "B",
    findings: "",
    actionTaken: "",
    picName: "Sajiman",
    qcName: "Staff QC",
    qcKnownBy: "QC",
    qaVerifiedBy: "Supervisor QA",
    notes: "",
  });

  // VMD Dialog
  const [isVmdOpen, setIsVmdOpen] = React.useState(false);
  const [vmdForm, setVmdForm] = React.useState<CreateMetalVerificationInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    productType: "gula_cair",
    location: "Gula Cair",
    batchNo: batchNo || "",
    packageCategory: "Gula Cair",
    monitoringRound: 1,
    checkTime: "08:00",
    feTestPieceSize: "Fe >= 1.5mm",
    feAlarmTriggered: true,
    feConveyorStopped: true,
    nonFeTestPieceSize: "Non-Fe >= 1.5mm",
    nonFeAlarmTriggered: true,
    nonFeConveyorStopped: true,
    ssTestPieceSize: "SS >= 2.5mm",
    ssAlarmTriggered: true,
    ssConveyorStopped: true,
    correctiveAction: "",
    picName: "Sajiman",
    qcVerifierName: "Staff QC",
    notes: "",
  });

  // CPP Dialog
  const [isCppOpen, setIsCppOpen] = React.useState(false);
  const [editingCppId, setEditingCppId] = React.useState<string | null>(null);
  const [cppForm, setCppForm] = React.useState<CreateMetalCleaningInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    machineNo: "MD-GC-01",
    location: "R. Gula Cair",
    equipmentName: "Metal Detector",
    cleaningType: "post_operational",
    productName: "Gula Cair Kelapa",
    batchNo: batchNo || "",
    customerName: "",
    quantity: "",
    startTime: "08:00",
    endTime: "16:00",
    finding: "",
    analysisResult: "",
    correctiveAction: "",
    cleaningStartTime: "16:00",
    cleaningEndTime: "16:15",
    operatorName: "Sajiman",
    qcInspectorName: "Supervisor QA",
    qaVerifiedDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  React.useEffect(() => {
    if (batchNo) {
      setMssForm((f) => ({ ...f, batchNo }));
      setPvkForm((f) => ({ ...f, batchNo }));
      setVmdForm((f) => ({ ...f, batchNo }));
      setCppForm((f) => ({ ...f, batchNo }));
    }
  }, [batchNo]);

  const fetchTabData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [mssRes, pvkRes, vmdRes, cppRes] = await Promise.allSettled([
        qcApi.listSterilizationTempLogs({ month, stage: "tahap_1", batchNo: batchNo || undefined }),
        qcApi.listLiquidPackagingVisualChecks({ month, batchNo: batchNo || undefined }),
        qcApi.listMetalVerificationLogs({ month, productType: "gula_cair" }),
        qcApi.listMetalCleaningLogs({ month, location: "R. Gula Cair" }),
      ]);
      if (mssRes.status === "fulfilled") setMssList(mssRes.value.data || []);
      if (pvkRes.status === "fulfilled") setPvkList(pvkRes.value.data || []);
      if (vmdRes.status === "fulfilled") {
        const list = vmdRes.value.data || [];
        setVmdList(batchNo ? list.filter((it) => (it.batchNo || "").toLowerCase() === batchNo.toLowerCase()) : list);
      }
      if (cppRes.status === "fulfilled") {
        const list = cppRes.value.data || [];
        setCppList(batchNo ? list.filter((it) => (it.batchNo || "").toLowerCase() === batchNo.toLowerCase()) : list);
      }
    } finally {
      setLoading(false);
    }
  }, [month, batchNo]);

  React.useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // MSS handlers
  const handleSaveMss = async () => {
    try {
      if (editingMssId) {
        await qcApi.updateSterilizationTempLog(editingMssId, { ...mssForm, stage: "tahap_1" });
      } else {
        await qcApi.createSterilizationTempLog({ ...mssForm, stage: "tahap_1" });
      }
      setIsMssOpen(false);
      setEditingMssId(null);
      await fetchTabData();
      onDataChanged();
    } catch (err) {
      alert("Gagal menyimpan form MSS: " + (err as Error).message);
    }
  };

  const handleDeleteMss = async (id: string) => {
    if (!confirm("Hapus catatan MSS ini?")) return;
    await qcApi.deleteSterilizationTempLog(id);
    await fetchTabData();
    onDataChanged();
  };

  // PVK handlers
  const handleSavePvk = async () => {
    try {
      if (editingPvkId) {
        await qcApi.updateLiquidPackagingVisualCheck(editingPvkId, pvkForm);
      } else {
        await qcApi.createLiquidPackagingVisualCheck(pvkForm);
      }
      setIsPvkOpen(false);
      setEditingPvkId(null);
      await fetchTabData();
      onDataChanged();
    } catch (err) {
      alert("Gagal menyimpan form PVK: " + (err as Error).message);
    }
  };

  const handleDeletePvk = async (id: string) => {
    if (!confirm("Hapus catatan PVK ini?")) return;
    await qcApi.deleteLiquidPackagingVisualCheck(id);
    await fetchTabData();
    onDataChanged();
  };

  // VMD handlers
  const handleSaveVmd = async () => {
    try {
      await qcApi.createMetalVerificationLog({ ...vmdForm, productType: "gula_cair", location: "Gula Cair" });
      setIsVmdOpen(false);
      await fetchTabData();
      onDataChanged();
    } catch (err) {
      alert("Gagal menyimpan form VMD Gula Cair: " + (err as Error).message);
    }
  };

  // CPP handlers
  const handleSaveCpp = async () => {
    try {
      if (editingCppId) {
        await qcApi.updateMetalCleaningLog(editingCppId, { ...cppForm, location: "R. Gula Cair", equipmentName: "Metal Detector" });
      } else {
        await qcApi.createMetalCleaningLog({ ...cppForm, location: "R. Gula Cair", equipmentName: "Metal Detector" });
      }
      setIsCppOpen(false);
      setEditingCppId(null);
      await fetchTabData();
      onDataChanged();
    } catch (err) {
      alert("Gagal menyimpan form CPP: " + (err as Error).message);
    }
  };

  const handleDeleteCpp = async (id: string) => {
    if (!confirm("Hapus catatan CPP ini?")) return;
    await qcApi.deleteMetalCleaningLog(id);
    await fetchTabData();
    onDataChanged();
  };

  const mssCount = flowStatus?.mssStage1Count ?? mssList.length;
  const pvkCount = flowStatus?.pvkCount ?? pvkList.length;
  const vmdCount = flowStatus?.vmdCount ?? vmdList.length;
  const cppCount = flowStatus?.cppCount ?? cppList.length;

  const tabs: { key: PrepTab; label: string; doc: string; count: number; icon: React.ReactNode }[] = [
    { key: "mss1", label: "1. Monitoring Suhu Sterilisasi", doc: "QC-057-MSS", count: mssCount, icon: <Thermometer className="h-3.5 w-3.5" /> },
    { key: "pvk", label: "2. Visual Kemasan Primer", doc: "QC-041-PVK", count: pvkCount, icon: <Eye className="h-3.5 w-3.5" /> },
    { key: "vmd", label: "3. Verifikasi Metal Detector", doc: "QC-017-VMD", count: vmdCount, icon: <Zap className="h-3.5 w-3.5" /> },
    { key: "cpp", label: "4. Pemakaian & Pembersihan MD", doc: "PRO-007-CPP", count: cppCount, icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Sub-Form Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => {
            const active = subTab === t.key;
            const done = t.count > 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setSubTab(t.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  active
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : done
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                <Badge variant="outline" className={`text-[10px] font-mono ${active ? "border-white/40 text-white" : ""}`}>
                  {t.count}
                </Badge>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 text-emerald-700 border-emerald-300"
            onClick={() => {
              if (subTab === "mss1") exportMSSExcel(mssList, "tahap_1", month);
              else if (subTab === "pvk") exportPVKExcel(pvkList, month);
              else if (subTab === "vmd") exportVMDGulaCairExcel(vmdList, month);
              else exportCPPExcel(cppList, month);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => {
              if (subTab === "mss1") {
                setEditingMssId(null);
                setIsMssOpen(true);
              } else if (subTab === "pvk") {
                setEditingPvkId(null);
                setIsPvkOpen(true);
              } else if (subTab === "vmd") {
                setIsVmdOpen(true);
              } else {
                setEditingCppId(null);
                setIsCppOpen(true);
              }
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Catat {subTab.toUpperCase()} Baru
          </Button>
        </div>
      </div>

      {/* SUB-TAB 1: MSS Tahap 1 */}
      {subTab === "mss1" && (
        <Card className="border shadow-xs">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-2.5">No. Dokumen</th>
                  <th className="p-2.5">Tanggal & Batch</th>
                  <th className="p-2.5">Kemasan</th>
                  <th className="p-2.5">Awal (WIB / °C)</th>
                  <th className="p-2.5">Heating (≥70°C)</th>
                  <th className="p-2.5">Akhir (≥45 mnt)</th>
                  <th className="p-2.5">Durasi</th>
                  <th className="p-2.5">QC / QA</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Memuat MSS...</td></tr>
                ) : mssList.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Belum ada catatan Monitoring Suhu Sterilisasi (Tahap 1).</td></tr>
                ) : mssList.map((it) => (
                  <tr key={it.id} className="hover:bg-muted/30">
                    <td className="p-2.5 font-mono font-semibold text-primary">{it.documentNo}</td>
                    <td className="p-2.5">
                      <div>{it.checkDate}</div>
                      {it.batchNo && <div className="text-[11px] font-mono text-muted-foreground">{it.batchNo}</div>}
                    </td>
                    <td className="p-2.5 font-medium">{it.packagingType}</td>
                    <td className="p-2.5 font-mono">{it.initialTime} / {it.initialTemp}°C</td>
                    <td className="p-2.5 font-mono">{it.heatingTime} / <strong>{it.heatingTemp}°C</strong></td>
                    <td className="p-2.5 font-mono">{it.finalTime} / {it.finalTemp}°C</td>
                    <td className="p-2.5 font-mono">{it.durationMinutes} mnt</td>
                    <td className="p-2.5">{it.qcName || "-"}</td>
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
                          stage: "tahap_1", checkDate: it.checkDate, batchNo: it.batchNo || "",
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

      {/* SUB-TAB 2: PVK */}
      {subTab === "pvk" && (
        <Card className="border shadow-xs">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-2.5">No. Dokumen</th>
                  <th className="p-2.5">Tanggal & Batch</th>
                  <th className="p-2.5">Jenis Kemasan</th>
                  <th className="p-2.5 text-right">Jumlah</th>
                  <th className="p-2.5">Buyer</th>
                  <th className="p-2.5">Sterilisasi</th>
                  <th className="p-2.5 text-center">Kondisi</th>
                  <th className="p-2.5">Temuan & Tindakan</th>
                  <th className="p-2.5">PIC / QC</th>
                  <th className="p-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pvkList.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Belum ada catatan Pengecekan Visual Kemasan (QC-041-PVK).</td></tr>
                ) : pvkList.map((it) => (
                  <tr key={it.id} className="hover:bg-muted/30">
                    <td className="p-2.5 font-mono font-semibold text-primary">{it.documentNo}</td>
                    <td className="p-2.5">
                      <div>{it.checkDate}</div>
                      {it.batchNo && <div className="text-[11px] font-mono text-muted-foreground">{it.batchNo}</div>}
                    </td>
                    <td className="p-2.5 font-medium">{it.packagingType}</td>
                    <td className="p-2.5 text-right font-mono">{it.quantity}</td>
                    <td className="p-2.5">{it.buyerName || "-"}</td>
                    <td className="p-2.5">{it.sterilizationInfo || "-"}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${it.packagingCondition === "B" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {it.packagingCondition === "B" ? "B (Bersih)" : "K (Kotor)"}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div>{it.findings || "-"}</div>
                      {it.actionTaken && <div className="text-[11px] text-muted-foreground">Aksi: {it.actionTaken}</div>}
                    </td>
                    <td className="p-2.5">{it.picName} / {it.qcName || "-"}</td>
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <button type="button" onClick={() => {
                        setEditingPvkId(it.id);
                        setPvkForm({
                          checkDate: it.checkDate, batchNo: it.batchNo || "", picResponsible: it.picResponsible,
                          packagingType: it.packagingType, quantity: it.quantity, buyerName: it.buyerName || "",
                          sterilizationInfo: it.sterilizationInfo || "", packagingCondition: it.packagingCondition,
                          findings: it.findings || "", actionTaken: it.actionTaken || "",
                          picName: it.picName, qcName: it.qcName || "", qcKnownBy: it.qcKnownBy || "",
                          qaVerifiedBy: it.qaVerifiedBy || "", notes: it.notes || "",
                        });
                        setIsPvkOpen(true);
                      }} className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleDeletePvk(it.id)} className="p-1 hover:bg-rose-100 text-rose-600 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* SUB-TAB 3: VMD Gula Cair */}
      {subTab === "vmd" && (
        <Card className="border shadow-xs">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-2.5">No. Dokumen</th>
                  <th className="p-2.5">Tgl & Jam</th>
                  <th className="p-2.5">Batch</th>
                  <th className="p-2.5">Round</th>
                  <th className="p-2.5 text-center">Fe (≥1.5mm)</th>
                  <th className="p-2.5 text-center">Non-Fe (≥1.5mm)</th>
                  <th className="p-2.5 text-center">SS (≥2.5mm)</th>
                  <th className="p-2.5">PIC / QC</th>
                  <th className="p-2.5 text-center">Status CCP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vmdList.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Belum ada verifikasi Metal Detector Gula Cair (QC-017-VMD Rev. 01).</td></tr>
                ) : vmdList.map((it) => (
                  <tr key={it.id} className="hover:bg-muted/30">
                    <td className="p-2.5 font-mono font-semibold text-primary">{it.documentNo}</td>
                    <td className="p-2.5">{it.checkDate} ({it.checkTime})</td>
                    <td className="p-2.5 font-mono">{it.batchNo || "-"}</td>
                    <td className="p-2.5">Monitoring #{it.monitoringRound}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${it.fePassed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {it.fePassed ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${it.nonFePassed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {it.nonFePassed ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${it.ssPassed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {it.ssPassed ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="p-2.5">{it.picName} / {it.qcVerifierName || "-"}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${it.overallStatus === "passed" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {it.overallStatus === "passed" ? "LOLOS CCP" : "GAGAL CCP"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* SUB-TAB 4: CPP R. Gula Cair */}
      {subTab === "cpp" && (
        <Card className="border shadow-xs">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-2.5">No. Dokumen</th>
                  <th className="p-2.5">Tanggal</th>
                  <th className="p-2.5">Produk & Batch</th>
                  <th className="p-2.5">Pemakaian (WIB)</th>
                  <th className="p-2.5">Pembersihan (WIB)</th>
                  <th className="p-2.5">Temuan & Tindakan</th>
                  <th className="p-2.5">PIC / QA</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cppList.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Belum ada catatan Pemakaian & Pembersihan MD Ruang Gula Cair (PRO-007-CPP).</td></tr>
                ) : cppList.map((it) => (
                  <tr key={it.id} className="hover:bg-muted/30">
                    <td className="p-2.5 font-mono font-semibold text-primary">{it.documentNo}</td>
                    <td className="p-2.5">{it.checkDate}</td>
                    <td className="p-2.5">
                      <div className="font-medium">{it.productName || "-"}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{it.batchNo || "-"}</div>
                    </td>
                    <td className="p-2.5 font-mono">{it.startTime} - {it.endTime}</td>
                    <td className="p-2.5 font-mono">{it.cleaningStartTime || "-"} - {it.cleaningEndTime || "-"}</td>
                    <td className="p-2.5">{it.finding || "-"}</td>
                    <td className="p-2.5">{it.operatorName} / {it.qcInspectorName || "-"}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${it.overallStatus === "passed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {it.overallStatus === "passed" ? "BERSIH / OK" : "TEMUAN"}
                      </span>
                    </td>
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <button type="button" onClick={() => {
                        setEditingCppId(it.id);
                        setCppForm({
                          checkDate: it.checkDate, machineNo: it.machineNo, location: "R. Gula Cair", equipmentName: "Metal Detector",
                          productName: it.productName || "", batchNo: it.batchNo || "", customerName: it.customerName || "",
                          quantity: it.quantity || "", startTime: it.startTime, endTime: it.endTime,
                          finding: it.finding || "", analysisResult: it.analysisResult || "", correctiveAction: it.correctiveAction || "",
                          cleaningStartTime: it.cleaningStartTime || "", cleaningEndTime: it.cleaningEndTime || "",
                          operatorName: it.operatorName, qcInspectorName: it.qcInspectorName || "", qaVerifiedDate: it.qaVerifiedDate || "", notes: it.notes || "",
                        });
                        setIsCppOpen(true);
                      }} className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleDeleteCpp(it.id)} className="p-1 hover:bg-rose-100 text-rose-600 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* DIALOG MSS Tahap 1 */}
      <Dialog open={isMssOpen} onOpenChange={setIsMssOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Thermometer className="h-5 w-5 text-amber-600" />
              Form QC-057-MSS: Monitoring Suhu Sterilisasi (Tahap 1)
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold">Tanggal *</label>
              <Input type="date" value={mssForm.checkDate} onChange={(e) => setMssForm({ ...mssForm, checkDate: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Batch Number</label>
              <Input value={mssForm.batchNo} onChange={(e) => setMssForm({ ...mssForm, batchNo: e.target.value })} placeholder="Misal: GC-2611-001" className="mt-1" />
            </div>
            <div className="col-span-2">
              <label className="font-semibold">Kemasan *</label>
              <Input value={mssForm.packagingType} onChange={(e) => setMssForm({ ...mssForm, packagingType: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Awal Waktu (WIB)</label>
              <Input type="time" value={mssForm.initialTime} onChange={(e) => setMssForm({ ...mssForm, initialTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Awal Suhu (°C)</label>
              <Input type="number" step="0.1" value={mssForm.initialTemp} onChange={(e) => setMssForm({ ...mssForm, initialTemp: parseFloat(e.target.value) || 0 })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Heating Waktu (WIB)</label>
              <Input type="time" value={mssForm.heatingTime} onChange={(e) => setMssForm({ ...mssForm, heatingTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Heating Suhu (°C) — Min 70°C</label>
              <Input type="number" step="0.1" value={mssForm.heatingTemp} onChange={(e) => setMssForm({ ...mssForm, heatingTemp: parseFloat(e.target.value) || 0 })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Akhir Waktu (WIB) — Min +45 mnt</label>
              <Input type="time" value={mssForm.finalTime} onChange={(e) => setMssForm({ ...mssForm, finalTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Akhir Suhu (°C)</label>
              <Input type="number" step="0.1" value={mssForm.finalTemp} onChange={(e) => setMssForm({ ...mssForm, finalTemp: parseFloat(e.target.value) || 0 })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Permasalahan</label>
              <Input value={mssForm.issues} onChange={(e) => setMssForm({ ...mssForm, issues: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Tindakan</label>
              <Input value={mssForm.actionTaken} onChange={(e) => setMssForm({ ...mssForm, actionTaken: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Paraf QC</label>
              <Input value={mssForm.qcName} onChange={(e) => setMssForm({ ...mssForm, qcName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Verifikasi QA</label>
              <Input value={mssForm.qaVerifiedBy} onChange={(e) => setMssForm({ ...mssForm, qaVerifiedBy: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMssOpen(false)}>Batal</Button>
            <Button onClick={handleSaveMss} className="bg-amber-600 hover:bg-amber-700 text-white">Simpan MSS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG PVK */}
      <Dialog open={isPvkOpen} onOpenChange={setIsPvkOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="h-5 w-5 text-amber-600" />
              Form QC-041-PVK: Pengecekan Visual Kemasan Primer Gula Cair
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold">Tanggal *</label>
              <Input type="date" value={pvkForm.checkDate} onChange={(e) => setPvkForm({ ...pvkForm, checkDate: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Batch Number</label>
              <Input value={pvkForm.batchNo} onChange={(e) => setPvkForm({ ...pvkForm, batchNo: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Jenis Kemasan *</label>
              <Input value={pvkForm.packagingType} onChange={(e) => setPvkForm({ ...pvkForm, packagingType: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Jumlah *</label>
              <Input type="number" value={pvkForm.quantity} onChange={(e) => setPvkForm({ ...pvkForm, quantity: parseInt(e.target.value) || 0 })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Nama Buyer</label>
              <Input value={pvkForm.buyerName} onChange={(e) => setPvkForm({ ...pvkForm, buyerName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Sterilisasi</label>
              <Input value={pvkForm.sterilizationInfo} onChange={(e) => setPvkForm({ ...pvkForm, sterilizationInfo: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Kondisi Kemasan *</label>
              <select
                value={pvkForm.packagingCondition}
                onChange={(e) => setPvkForm({ ...pvkForm, packagingCondition: e.target.value })}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="B">B (Bersih)</option>
                <option value="K">K (Kotor)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold">Nama / Paraf PIC *</label>
              <Input value={pvkForm.picName} onChange={(e) => setPvkForm({ ...pvkForm, picName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Temuan</label>
              <Input value={pvkForm.findings} onChange={(e) => setPvkForm({ ...pvkForm, findings: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Tindakan</label>
              <Input value={pvkForm.actionTaken} onChange={(e) => setPvkForm({ ...pvkForm, actionTaken: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Paraf QC</label>
              <Input value={pvkForm.qcName} onChange={(e) => setPvkForm({ ...pvkForm, qcName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Diverifikasi Oleh QA</label>
              <Input value={pvkForm.qaVerifiedBy} onChange={(e) => setPvkForm({ ...pvkForm, qaVerifiedBy: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPvkOpen(false)}>Batal</Button>
            <Button onClick={handleSavePvk} className="bg-amber-600 hover:bg-amber-700 text-white">Simpan PVK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG VMD Gula Cair */}
      <Dialog open={isVmdOpen} onOpenChange={setIsVmdOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-amber-600" />
              Form QC-017-VMD Rev. 01: Verifikasi Metal Detector Gula Cair
            </DialogTitle>
          </DialogHeader>
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
            Standar Test Piece Gula Cair: <strong>Fe ≥ 1.5 mm</strong>, <strong>Non-Fe ≥ 1.5 mm</strong>, <strong>SS ≥ 2.5 mm</strong>.
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold">Tanggal *</label>
              <Input type="date" value={vmdForm.checkDate} onChange={(e) => setVmdForm({ ...vmdForm, checkDate: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Jam Cek *</label>
              <Input type="time" value={vmdForm.checkTime} onChange={(e) => setVmdForm({ ...vmdForm, checkTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Batch Number</label>
              <Input value={vmdForm.batchNo} onChange={(e) => setVmdForm({ ...vmdForm, batchNo: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Monitoring Ke</label>
              <Input type="number" value={vmdForm.monitoringRound} onChange={(e) => setVmdForm({ ...vmdForm, monitoringRound: parseInt(e.target.value) || 1 })} className="mt-1" />
            </div>
            <div className="col-span-2 flex items-center justify-between bg-muted/40 p-2 rounded">
              <span className="font-bold">1. Fe ≥ 1.5 mm</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={vmdForm.feAlarmTriggered} onChange={(e) => setVmdForm({ ...vmdForm, feAlarmTriggered: e.target.checked })} /> Alarm Bunyi</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={vmdForm.feConveyorStopped} onChange={(e) => setVmdForm({ ...vmdForm, feConveyorStopped: e.target.checked })} /> Conveyor Berhenti</label>
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between bg-muted/40 p-2 rounded">
              <span className="font-bold">2. Non-Fe ≥ 1.5 mm</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={vmdForm.nonFeAlarmTriggered} onChange={(e) => setVmdForm({ ...vmdForm, nonFeAlarmTriggered: e.target.checked })} /> Alarm Bunyi</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={vmdForm.nonFeConveyorStopped} onChange={(e) => setVmdForm({ ...vmdForm, nonFeConveyorStopped: e.target.checked })} /> Conveyor Berhenti</label>
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between bg-muted/40 p-2 rounded">
              <span className="font-bold">3. SS ≥ 2.5 mm</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={vmdForm.ssAlarmTriggered} onChange={(e) => setVmdForm({ ...vmdForm, ssAlarmTriggered: e.target.checked })} /> Alarm Bunyi</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={vmdForm.ssConveyorStopped} onChange={(e) => setVmdForm({ ...vmdForm, ssConveyorStopped: e.target.checked })} /> Conveyor Berhenti</label>
              </div>
            </div>
            <div>
              <label className="font-semibold">Nama PIC *</label>
              <Input value={vmdForm.picName} onChange={(e) => setVmdForm({ ...vmdForm, picName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Verifikator QC</label>
              <Input value={vmdForm.qcVerifierName} onChange={(e) => setVmdForm({ ...vmdForm, qcVerifierName: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVmdOpen(false)}>Batal</Button>
            <Button onClick={handleSaveVmd} className="bg-amber-600 hover:bg-amber-700 text-white">Simpan VMD</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG CPP R. Gula Cair */}
      <Dialog open={isCppOpen} onOpenChange={setIsCppOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-amber-600" />
              Form PRO-007-CPP (Sheet MD GC): Pemakaian & Pembersihan MD Ruang Gula Cair
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold">Tanggal *</label>
              <Input type="date" value={cppForm.checkDate} onChange={(e) => setCppForm({ ...cppForm, checkDate: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Nama Produk</label>
              <Input value={cppForm.productName} onChange={(e) => setCppForm({ ...cppForm, productName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">No. Batch</label>
              <Input value={cppForm.batchNo} onChange={(e) => setCppForm({ ...cppForm, batchNo: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Customer</label>
              <Input value={cppForm.customerName} onChange={(e) => setCppForm({ ...cppForm, customerName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Jumlah</label>
              <Input value={cppForm.quantity} onChange={(e) => setCppForm({ ...cppForm, quantity: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">PIC *</label>
              <Input value={cppForm.operatorName} onChange={(e) => setCppForm({ ...cppForm, operatorName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Pemakaian Mulai (WIB)</label>
              <Input type="time" value={cppForm.startTime} onChange={(e) => setCppForm({ ...cppForm, startTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-semibold">Pemakaian Selesai (WIB)</label>
              <Input type="time" value={cppForm.endTime} onChange={(e) => setCppForm({ ...cppForm, endTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Diketahui QA</label>
              <Input value={cppForm.qcInspectorName} onChange={(e) => setCppForm({ ...cppForm, qcInspectorName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Pembersihan Mulai (WIB)</label>
              <Input type="time" value={cppForm.cleaningStartTime} onChange={(e) => setCppForm({ ...cppForm, cleaningStartTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Pembersihan Selesai (WIB)</label>
              <Input type="time" value={cppForm.cleaningEndTime} onChange={(e) => setCppForm({ ...cppForm, cleaningEndTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="font-medium">Temuan</label>
              <Input value={cppForm.finding} onChange={(e) => setCppForm({ ...cppForm, finding: e.target.value })} className="mt-1" />
            </div>
            <div className="col-span-3 grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium">Hasil Analisa</label>
                <Input value={cppForm.analysisResult} onChange={(e) => setCppForm({ ...cppForm, analysisResult: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="font-medium">Tindakan Perbaikan</label>
                <Input value={cppForm.correctiveAction} onChange={(e) => setCppForm({ ...cppForm, correctiveAction: e.target.value })} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCppOpen(false)}>Batal</Button>
            <Button onClick={handleSaveCpp} className="bg-amber-600 hover:bg-amber-700 text-white">Simpan CPP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
