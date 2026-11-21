"use client";

import * as React from "react";
import {
  ShieldAlert,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sparkles,
  Layers,
  Clock,
  Radio,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  qcApi,
  MetalCleaningItem,
  CreateMetalCleaningInput,
  MetalVerificationItem,
  CreateMetalVerificationInput,
} from "@/lib/api/qc";
import { exportCPPExcel, exportVMDExcel } from "@/lib/utils/export-qc-excel";

export default function QCMetalDetectorPage() {
  const [activeTab, setActiveTab] = React.useState<"cpp" | "vmd">("vmd");
  const [productType, setProductType] = React.useState<"gula_semut" | "gula_cair">("gula_semut");
  const [month, setMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Data states
  const [cleaningLogs, setCleaningLogs] = React.useState<MetalCleaningItem[]>([]);
  const [verifLogs, setVerifLogs] = React.useState<MetalVerificationItem[]>([]);

  // Dialog states
  const [isCleaningOpen, setIsCleaningOpen] = React.useState<boolean>(false);
  const [isVerifOpen, setIsVerifOpen] = React.useState<boolean>(false);

  // Form states
  const [cleaningForm, setCleaningForm] = React.useState<CreateMetalCleaningInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    machineNo: "MD-01",
    location: "Ruang Packing",
    cleaningType: "pre_operational",
    sensorCleanliness: "Bersih",
    beltCleanliness: "Bersih",
    rejectBinCleanliness: "Bersih & Kosong",
    physicalCondition: "Normal",
    startTime: "07:30",
    endTime: "16:30",
    operatorName: "Teknisi Operasional",
    qcInspectorName: "Staff QC",
    notes: "",
  });

  const [verifForm, setVerifForm] = React.useState<CreateMetalVerificationInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    productType: "gula_semut",
    location: "Ruang Packing",
    packageCategory: "<= 12.5 kg",
    monitoringRound: 1,
    checkTime: "08:00",
    feTestPieceSize: "Fe >= 2.0mm",
    feAlarmTriggered: true,
    feConveyorStopped: true,
    nonFeTestPieceSize: "Non-Fe >= 2.0mm",
    nonFeAlarmTriggered: true,
    nonFeConveyorStopped: true,
    ssTestPieceSize: "SS >= 3.5mm",
    ssAlarmTriggered: true,
    ssConveyorStopped: true,
    correctiveAction: "",
    picName: "Operator CCP",
    qcVerifierName: "Staff QC",
    notes: "",
  });

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === "cpp") {
        const res = await qcApi.listMetalCleaningLogs({ month });
        setCleaningLogs(res.data || []);
      } else {
        const res = await qcApi.listMetalVerificationLogs({ month, productType });
        setVerifLogs(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching metal detector logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, month, productType]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit handlers
  const handleSaveCleaning = async () => {
    try {
      await qcApi.createMetalCleaningLog(cleaningForm);
      setIsCleaningOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan pembersihan metal detector: " + (err as Error).message);
    }
  };

  const handleSaveVerif = async () => {
    try {
      await qcApi.createMetalVerificationLog({ ...verifForm, productType });
      setIsVerifOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan verifikasi metal detector: " + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metal Detector CCP Control"
        description="Pembersihan berkala (CPP) & verifikasi rutin test piece sensor (VMD) untuk Critical Control Point keamanan pangan"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "cpp") exportCPPExcel(cleaningLogs);
              else exportVMDExcel(verifLogs);
            }}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export Excel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (activeTab === "cpp") setIsCleaningOpen(true);
              else setIsVerifOpen(true);
            }}
            className="flex items-center gap-1.5 bg-primary"
          >
            <Plus className="h-4 w-4" />
            Catat {activeTab === "cpp" ? "Pembersihan" : "Verifikasi CCP"} Baru
          </Button>
        </div>
      </PageHeader>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Tab */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("vmd")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "vmd"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              <Zap className="h-4 w-4 text-amber-400" />
              VMD: Verifikasi Sensor (CCP)
            </button>
            <button
              onClick={() => setActiveTab("cpp")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "cpp"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              <Sparkles className="h-4 w-4 text-cyan-400" />
              CPP: Pembersihan & Pemakaian
            </button>
          </div>

          {/* Sub-toggle for VMD product type */}
          {activeTab === "vmd" && (
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              <button
                onClick={() => setProductType("gula_semut")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  productType === "gula_semut"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Gula Semut (QC-017 Rev 03)
              </button>
              <button
                onClick={() => setProductType("gula_cair")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  productType === "gula_cair"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Gula Cair (QC-017 Rev 01)
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Bulan:</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none"
            />
          </div>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Cari log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 w-[180px]"
            />
          </div>
        </div>
      </div>

      {/* Content: VMD Verification */}
      {activeTab === "vmd" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">No. Dokumen</th>
                    <th className="py-2.5 px-3">Tanggal & Jam</th>
                    <th className="py-2.5 px-3">Round</th>
                    <th className="py-2.5 px-3">Kategori Kemasan</th>
                    <th className="py-2.5 px-3 text-center">Uji Fe (Alarm / Stop)</th>
                    <th className="py-2.5 px-3 text-center">Uji Non-Fe (Alarm / Stop)</th>
                    <th className="py-2.5 px-3 text-center">Uji SS (Alarm / Stop)</th>
                    <th className="py-2.5 px-3">PIC / QC</th>
                    <th className="py-2.5 px-3 text-center">Status CCP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        Memuat verifikasi metal detector...
                      </td>
                    </tr>
                  ) : verifLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        Belum ada data verifikasi metal detector untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    verifLogs.map((log) => {
                      const isFail = log.overallStatus === "failed";
                      return (
                        <tr key={log.id} className={`hover:bg-muted/30 ${isFail ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}>
                          <td className="py-2.5 px-3 font-mono font-medium">{log.documentNo}</td>
                          <td className="py-2.5 px-3">
                            {log.checkDate} <span className="text-muted-foreground">({log.checkTime})</span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold">Monitoring #{log.monitoringRound}</td>
                          <td className="py-2.5 px-3">{log.packageCategory}</td>

                          {/* Fe */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.fePassed
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {log.fePassed ? "PASS" : "FAIL"}
                            </span>
                          </td>

                          {/* Non-Fe */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.nonFePassed
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {log.nonFePassed ? "PASS" : "FAIL"}
                            </span>
                          </td>

                          {/* SS */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.ssPassed
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {log.ssPassed ? "PASS" : "FAIL"}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            {log.picName} / {log.qcVerifierName || "QC"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isFail ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                <AlertTriangle className="h-3 w-3" />
                                CCP Gagal
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Lolos CCP
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content: CPP Cleaning */}
      {activeTab === "cpp" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">No. Dokumen</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Mesin & Lokasi</th>
                    <th className="py-2.5 px-3">Tipe Pembersihan</th>
                    <th className="py-2.5 px-3">Sensor & Belt</th>
                    <th className="py-2.5 px-3">Reject Bin</th>
                    <th className="py-2.5 px-3">Jam Operasional</th>
                    <th className="py-2.5 px-3">Operator</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        Memuat catatan pembersihan metal detector...
                      </td>
                    </tr>
                  ) : cleaningLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        Belum ada catatan pembersihan untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    cleaningLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium">{log.documentNo}</td>
                        <td className="py-2.5 px-3">{log.checkDate}</td>
                        <td className="py-2.5 px-3 font-medium">
                          {log.machineNo} <span className="text-muted-foreground">({log.location})</span>
                        </td>
                        <td className="py-2.5 px-3 capitalize">{log.cleaningType.replace("_", " ")}</td>
                        <td className="py-2.5 px-3">
                          Sensor: <span className="font-semibold">{log.sensorCleanliness}</span> | Belt:{" "}
                          <span className="font-semibold">{log.beltCleanliness}</span>
                        </td>
                        <td className="py-2.5 px-3">{log.rejectBinCleanliness}</td>
                        <td className="py-2.5 px-3">
                          {log.startTime} - {log.endTime}
                        </td>
                        <td className="py-2.5 px-3">{log.operatorName}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            {log.overallStatus === "passed" ? "Bersih / OK" : log.overallStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Dialog: VMD Verifikasi CCP */}
      <Dialog open={isVerifOpen} onOpenChange={setIsVerifOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-amber-500" />
              Catat Verifikasi Metal Detector CCP (Form QC-017-VMD)
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 text-xs py-2">
            <div>
              <label className="font-semibold block mb-1">Tanggal</label>
              <Input
                type="date"
                value={verifForm.checkDate}
                onChange={(e) => setVerifForm({ ...verifForm, checkDate: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Jam Cek</label>
              <Input
                type="time"
                value={verifForm.checkTime}
                onChange={(e) => setVerifForm({ ...verifForm, checkTime: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Monitoring Ke</label>
              <Input
                type="number"
                value={verifForm.monitoringRound}
                onChange={(e) => setVerifForm({ ...verifForm, monitoringRound: parseInt(e.target.value) || 1 })}
                className="text-xs h-8"
              />
            </div>

            <div className="col-span-3">
              <label className="font-semibold block mb-1">Ukuran Kemasan</label>
              <select
                value={verifForm.packageCategory}
                onChange={(e) => setVerifForm({ ...verifForm, packageCategory: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="<= 12.5 kg">Kemasan &le; 12.5 kg (Fe &ge;2mm, Non-Fe &ge;2mm, SS &ge;3.5mm)</option>
                <option value="> 12.5 kg">Kemasan &gt; 12.5 kg (Fe &ge;2.5mm, Non-Fe &ge;3mm, SS &ge;3.5mm)</option>
              </select>
            </div>

            {/* Test Piece 1: Fe */}
            <div className="col-span-3 border-t pt-2 mt-1">
              <span className="font-bold text-amber-700 dark:text-amber-400 uppercase text-[10px]">
                1. Test Piece: Fe (Ferrous)
              </span>
            </div>
            <div className="col-span-3 flex items-center gap-4 bg-muted/30 p-2 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.feAlarmTriggered}
                  onChange={(e) => setVerifForm({ ...verifForm, feAlarmTriggered: e.target.checked })}
                  className="rounded text-primary"
                />
                Alarm Bunyi
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.feConveyorStopped}
                  onChange={(e) => setVerifForm({ ...verifForm, feConveyorStopped: e.target.checked })}
                  className="rounded text-primary"
                />
                Konveyor Berhenti
              </label>
            </div>

            {/* Test Piece 2: Non-Fe */}
            <div className="col-span-3 border-t pt-2 mt-1">
              <span className="font-bold text-cyan-700 dark:text-cyan-400 uppercase text-[10px]">
                2. Test Piece: Non-Fe (Non-Ferrous)
              </span>
            </div>
            <div className="col-span-3 flex items-center gap-4 bg-muted/30 p-2 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.nonFeAlarmTriggered}
                  onChange={(e) => setVerifForm({ ...verifForm, nonFeAlarmTriggered: e.target.checked })}
                  className="rounded text-primary"
                />
                Alarm Bunyi
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.nonFeConveyorStopped}
                  onChange={(e) => setVerifForm({ ...verifForm, nonFeConveyorStopped: e.target.checked })}
                  className="rounded text-primary"
                />
                Konveyor Berhenti
              </label>
            </div>

            {/* Test Piece 3: SS */}
            <div className="col-span-3 border-t pt-2 mt-1">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-[10px]">
                3. Test Piece: SS (Stainless Steel)
              </span>
            </div>
            <div className="col-span-3 flex items-center gap-4 bg-muted/30 p-2 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.ssAlarmTriggered}
                  onChange={(e) => setVerifForm({ ...verifForm, ssAlarmTriggered: e.target.checked })}
                  className="rounded text-primary"
                />
                Alarm Bunyi
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={verifForm.ssConveyorStopped}
                  onChange={(e) => setVerifForm({ ...verifForm, ssConveyorStopped: e.target.checked })}
                  className="rounded text-primary"
                />
                Konveyor Berhenti
              </label>
            </div>

            <div className="col-span-3 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">PIC & Tindakan Perbaikan</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Nama PIC</label>
              <Input
                value={verifForm.picName}
                onChange={(e) => setVerifForm({ ...verifForm, picName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Verifikator QC</label>
              <Input
                value={verifForm.qcVerifierName || ""}
                onChange={(e) => setVerifForm({ ...verifForm, qcVerifierName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Tindakan Perbaikan (Bila Gagal)</label>
              <Input
                value={verifForm.correctiveAction || ""}
                onChange={(e) => setVerifForm({ ...verifForm, correctiveAction: e.target.value })}
                placeholder="Reset sensor / re-adjust"
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsVerifOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveVerif} className="bg-primary">
              Simpan Verifikasi CCP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: CPP Pembersihan */}
      <Dialog open={isCleaningOpen} onOpenChange={setIsCleaningOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-cyan-500" />
              Catat Pembersihan & Pemakaian Metal Detector (CPP)
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 text-xs py-2">
            <div>
              <label className="font-semibold block mb-1">Tanggal</label>
              <Input
                type="date"
                value={cleaningForm.checkDate}
                onChange={(e) => setCleaningForm({ ...cleaningForm, checkDate: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">No Mesin</label>
              <Input
                value={cleaningForm.machineNo || "MD-01"}
                onChange={(e) => setCleaningForm({ ...cleaningForm, machineNo: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Tipe Pembersihan</label>
              <select
                value={cleaningForm.cleaningType}
                onChange={(e) => setCleaningForm({ ...cleaningForm, cleaningType: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="pre_operational">Sebelum Operasional</option>
                <option value="batch_change">Ganti Batch Produk</option>
                <option value="post_operational">Setelah Operasional</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Kebersihan Sensor</label>
              <select
                value={cleaningForm.sensorCleanliness}
                onChange={(e) => setCleaningForm({ ...cleaningForm, sensorCleanliness: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="Bersih">Bersih</option>
                <option value="Perlu Dibersihkan">Perlu Dibersihkan</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Jam Mulai</label>
              <Input
                type="time"
                value={cleaningForm.startTime}
                onChange={(e) => setCleaningForm({ ...cleaningForm, startTime: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Jam Selesai</label>
              <Input
                type="time"
                value={cleaningForm.endTime}
                onChange={(e) => setCleaningForm({ ...cleaningForm, endTime: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Operator Pelaksana</label>
              <Input
                value={cleaningForm.operatorName}
                onChange={(e) => setCleaningForm({ ...cleaningForm, operatorName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Inspector QC</label>
              <Input
                value={cleaningForm.qcInspectorName || ""}
                onChange={(e) => setCleaningForm({ ...cleaningForm, qcInspectorName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCleaningOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveCleaning} className="bg-primary">
              Simpan Data CPP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
