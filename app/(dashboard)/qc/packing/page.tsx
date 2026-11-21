"use client";

import * as React from "react";
import {
  Scissors,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Layers,
  Wrench,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  qcApi,
  NeedleMonitoringItem,
  CreateNeedleInput,
  ScissorMonitoringItem,
  CreateScissorInput,
} from "@/lib/api/qc";
import { exportNeedleToExcel, exportScissorToExcel } from "@/lib/utils/export-qc-excel";

export default function QCPackingPage() {
  const [activeTab, setActiveTab] = React.useState<"mnj" | "mng">("mnj");
  const [month, setMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Data states
  const [needleLogs, setNeedleLogs] = React.useState<NeedleMonitoringItem[]>([]);
  const [scissorLogs, setScissorLogs] = React.useState<ScissorMonitoringItem[]>([]);

  // Dialog states
  const [isNeedleOpen, setIsNeedleOpen] = React.useState<boolean>(false);
  const [isScissorOpen, setIsScissorOpen] = React.useState<boolean>(false);

  // Form states
  const [needleForm, setNeedleForm] = React.useState<CreateNeedleInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    sewingMachineNo: "Mesin Jahit 01",
    picResponsible: "Roji",
    initialIsPresent: true,
    initialCondition: "Baik",
    initialAnalysis: "",
    initialAction: "",
    finalIsPresent: true,
    finalCondition: "Baik",
    finalAnalysis: "",
    finalAction: "",
    needleStockInRoom: 12,
    picName: "Roji",
    qcVerifierName: "Staff QC",
    notes: "",
  });

  const [scissorForm, setScissorForm] = React.useState<CreateScissorInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    location: "Ruang Packing",
    picResponsible: "Roji",
    initialCount: 2,
    initialCondition: "Baik",
    initialAnalysis: "",
    initialAction: "",
    finalCount: 2,
    finalCondition: "Baik",
    finalAnalysis: "",
    finalAction: "",
    picName: "Roji",
    qcVerifierName: "Staff QC",
    notes: "",
  });

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === "mnj") {
        const res = await qcApi.listNeedleLogs({ month });
        setNeedleLogs(res.data || []);
      } else {
        const res = await qcApi.listScissorLogs({ month });
        setScissorLogs(res.data || []);
      }
    } catch (err) {
      console.error("Error loading packing QC logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, month]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit handlers
  const handleSaveNeedle = async () => {
    try {
      await qcApi.createNeedleLog(needleForm);
      setIsNeedleOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan data monitoring jarum: " + (err as Error).message);
    }
  };

  const handleSaveScissor = async () => {
    try {
      await qcApi.createScissorLog(scissorForm);
      setIsScissorOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan data monitoring gunting: " + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kontrol Benda Tajam Ruang Packing"
        description="Monitoring kondisi jarum mesin jahit (MNJ) dan gunting (MNG) untuk mencegah kontaminasi fisik pada kemasan"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "mnj") exportNeedleToExcel(needleLogs);
              else exportScissorToExcel(scissorLogs);
            }}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export Excel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (activeTab === "mnj") setIsNeedleOpen(true);
              else setIsScissorOpen(true);
            }}
            className="flex items-center gap-1.5 bg-primary"
          >
            <Plus className="h-4 w-4" />
            Catat {activeTab === "mnj" ? "Jarum" : "Gunting"} Baru
          </Button>
        </div>
      </PageHeader>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("mnj")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "mnj"
                ? "bg-primary text-white shadow-sm"
                : "bg-muted/50 hover:bg-muted text-muted-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            MNJ: Kondisi Jarum (QC-011)
          </button>
          <button
            onClick={() => setActiveTab("mng")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "mng"
                ? "bg-primary text-white shadow-sm"
                : "bg-muted/50 hover:bg-muted text-muted-foreground"
            }`}
          >
            <Scissors className="h-4 w-4" />
            MNG: Kondisi Gunting (QC-011 Sheet MNG)
          </button>
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
              placeholder="Cari data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 w-[180px]"
            />
          </div>
        </div>
      </div>

      {/* Content: MNJ (Needle) */}
      {activeTab === "mnj" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">No. Dokumen</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Mesin Jahit</th>
                    <th className="py-2.5 px-3">Cek Awal (Ada / Kondisi)</th>
                    <th className="py-2.5 px-3">Cek Akhir (Ada / Kondisi)</th>
                    <th className="py-2.5 px-3 text-center">Stok Jarum</th>
                    <th className="py-2.5 px-3">PIC / QC</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Memuat data monitoring jarum...
                      </td>
                    </tr>
                  ) : needleLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Belum ada catatan monitoring jarum untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    needleLogs.map((log) => {
                      const isAlert = log.overallStatus === "hazard_alert";
                      return (
                        <tr key={log.id} className={`hover:bg-muted/30 ${isAlert ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}>
                          <td className="py-2.5 px-3 font-mono font-medium">{log.documentNo}</td>
                          <td className="py-2.5 px-3">{log.checkDate}</td>
                          <td className="py-2.5 px-3 font-medium">{log.sewingMachineNo}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium">{log.initialIsPresent ? "Ada" : "Tidak"}</span> -{" "}
                            <span className={log.initialCondition === "Patah" ? "text-red-600 font-bold" : ""}>
                              {log.initialCondition}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium">{log.finalIsPresent ? "Ada" : "Tidak"}</span> -{" "}
                            <span className={log.finalCondition === "Patah" ? "text-red-600 font-bold" : ""}>
                              {log.finalCondition}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">{log.needleStockInRoom} pcs</td>
                          <td className="py-2.5 px-3">
                            {log.picName} / {log.qcVerifierName || "QC"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isAlert ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                <ShieldAlert className="h-3 w-3" />
                                Hazard Alert
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Passed
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

      {/* Content: MNG (Scissor) */}
      {activeTab === "mng" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">No. Dokumen</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Lokasi</th>
                    <th className="py-2.5 px-3">Cek Awal (Jumlah / Kondisi)</th>
                    <th className="py-2.5 px-3">Cek Akhir (Jumlah / Kondisi)</th>
                    <th className="py-2.5 px-3 text-center">Kesesuaian Jumlah</th>
                    <th className="py-2.5 px-3">PIC / QC</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Memuat data monitoring gunting...
                      </td>
                    </tr>
                  ) : scissorLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Belum ada catatan monitoring gunting untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    scissorLogs.map((log) => {
                      const isAlert = log.overallStatus === "hazard_alert";
                      return (
                        <tr key={log.id} className={`hover:bg-muted/30 ${isAlert ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}>
                          <td className="py-2.5 px-3 font-mono font-medium">{log.documentNo}</td>
                          <td className="py-2.5 px-3">{log.checkDate}</td>
                          <td className="py-2.5 px-3 font-medium">{log.location}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold">{log.initialCount} pcs</span> - {log.initialCondition}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold">{log.finalCount} pcs</span> - {log.finalCondition}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {log.isCountMatched ? (
                              <span className="text-emerald-600 font-semibold">Sesuai ({log.finalCount})</span>
                            ) : (
                              <span className="text-red-600 font-bold">Hilang ({log.initialCount - log.finalCount})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {log.picName} / {log.qcVerifierName || "QC"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isAlert ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                <AlertTriangle className="h-3 w-3" />
                                Hazard Alert
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Passed
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

      {/* Modal Dialog: MNJ (Needle) */}
      <Dialog open={isNeedleOpen} onOpenChange={setIsNeedleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5 text-primary" />
              Catat Monitoring Jarum Mesin Jahit (Form QC-011-MNJ)
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 text-xs py-2">
            <div>
              <label className="font-semibold block mb-1">Tanggal Periksa</label>
              <Input
                type="date"
                value={needleForm.checkDate}
                onChange={(e) => setNeedleForm({ ...needleForm, checkDate: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">No Mesin Jahit</label>
              <Input
                value={needleForm.sewingMachineNo}
                onChange={(e) => setNeedleForm({ ...needleForm, sewingMachineNo: e.target.value })}
                placeholder="Mesin Jahit 01"
                className="text-xs h-8"
              />
            </div>

            <div className="col-span-2 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Pemeriksaan Awal Operasional</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Kondisi Jarum Awal</label>
              <select
                value={needleForm.initialCondition}
                onChange={(e) => setNeedleForm({ ...needleForm, initialCondition: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="Baik">Baik & Lengkap</option>
                <option value="Rusak">Rusak / Bengkok</option>
                <option value="Patah">Patah</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Hasil Analisa Awal</label>
              <Input
                value={needleForm.initialAnalysis || ""}
                onChange={(e) => setNeedleForm({ ...needleForm, initialAnalysis: e.target.value })}
                placeholder="Siap operasional"
                className="text-xs h-8"
              />
            </div>

            <div className="col-span-2 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Pemeriksaan Akhir Operasional</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Kondisi Jarum Akhir</label>
              <select
                value={needleForm.finalCondition}
                onChange={(e) => setNeedleForm({ ...needleForm, finalCondition: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="Baik">Baik & Lengkap</option>
                <option value="Rusak">Rusak / Bengkok</option>
                <option value="Patah">Patah (Hazard Alert!)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Tindakan Perbaikan</label>
              <Input
                value={needleForm.finalAction || ""}
                onChange={(e) => setNeedleForm({ ...needleForm, finalAction: e.target.value })}
                placeholder="Pecahan ditemukan & diamankan"
                className="text-xs h-8"
              />
            </div>

            <div className="col-span-2 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Stok & PIC</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Jumlah Jarum di R. Packing (Pcs)</label>
              <Input
                type="number"
                value={needleForm.needleStockInRoom}
                onChange={(e) => setNeedleForm({ ...needleForm, needleStockInRoom: parseInt(e.target.value) || 0 })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Nama PIC Pemeriksa</label>
              <Input
                value={needleForm.picName}
                onChange={(e) => setNeedleForm({ ...needleForm, picName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNeedleOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveNeedle} className="bg-primary">
              Simpan Data MNJ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: MNG (Scissor) */}
      <Dialog open={isScissorOpen} onOpenChange={setIsScissorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Scissors className="h-5 w-5 text-primary" />
              Catat Monitoring Gunting Ruang Packing (Form MNG)
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 text-xs py-2">
            <div>
              <label className="font-semibold block mb-1">Tanggal Periksa</label>
              <Input
                type="date"
                value={scissorForm.checkDate}
                onChange={(e) => setScissorForm({ ...scissorForm, checkDate: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Lokasi</label>
              <Input
                value={scissorForm.location || "Ruang Packing"}
                onChange={(e) => setScissorForm({ ...scissorForm, location: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <div className="col-span-2 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Pengecekan Awal</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Jumlah Gunting Awal (Pcs)</label>
              <Input
                type="number"
                value={scissorForm.initialCount}
                onChange={(e) => setScissorForm({ ...scissorForm, initialCount: parseInt(e.target.value) || 0 })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Kondisi Awal</label>
              <select
                value={scissorForm.initialCondition}
                onChange={(e) => setScissorForm({ ...scissorForm, initialCondition: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="Baik">Baik & Utuh</option>
                <option value="Rusak">Rusak</option>
                <option value="Patah">Patah</option>
              </select>
            </div>

            <div className="col-span-2 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Pengecekan Akhir</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Jumlah Gunting Akhir (Pcs)</label>
              <Input
                type="number"
                value={scissorForm.finalCount}
                onChange={(e) => setScissorForm({ ...scissorForm, finalCount: parseInt(e.target.value) || 0 })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Kondisi Akhir</label>
              <select
                value={scissorForm.finalCondition}
                onChange={(e) => setScissorForm({ ...scissorForm, finalCondition: e.target.value })}
                className="w-full text-xs h-8 border rounded-md px-2 bg-background"
              >
                <option value="Baik">Baik & Utuh</option>
                <option value="Rusak">Rusak</option>
                <option value="Patah">Patah (Hazard Alert!)</option>
              </select>
            </div>

            <div className="col-span-2 border-t pt-2 mt-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">PIC & Catatan</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Nama PIC</label>
              <Input
                value={scissorForm.picName}
                onChange={(e) => setScissorForm({ ...scissorForm, picName: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Penanggung Jawab</label>
              <Input
                value={scissorForm.picResponsible}
                onChange={(e) => setScissorForm({ ...scissorForm, picResponsible: e.target.value })}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsScissorOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveScissor} className="bg-primary">
              Simpan Data MNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
