"use client";

import * as React from "react";
import {
  Filter,
  Nut,
  Plus,
  Download,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  Droplets,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  qcApi,
  FilterMeshMonitoringItem,
  CreateFilterMeshInput,
  MeshBoltMonitoringItem,
  CreateMeshBoltInput,
} from "@/lib/api/qc";
import { exportMNPExcel, exportMNBExcel, exportMasterQC011Excel } from "@/lib/utils/export-qc-excel";

export default function QCLiquidSugarPage() {
  const [activeTab, setActiveTab] = React.useState<"mnp" | "mnb">("mnp");
  const [month, setMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Data states
  const [mnpList, setMnpList] = React.useState<FilterMeshMonitoringItem[]>([]);
  const [mnbList, setMnbList] = React.useState<MeshBoltMonitoringItem[]>([]);

  // Dialog states
  const [isMnpOpen, setIsMnpOpen] = React.useState<boolean>(false);
  const [isMnbOpen, setIsMnbOpen] = React.useState<boolean>(false);

  // Form states
  const [mnpForm, setMnpForm] = React.useState<CreateFilterMeshInput>({
    documentCode: "QC-011-MNP. 01",
    formType: "MNP",
    location: "Ruang Gula Cair",
    machineNo: "Saringan Tangki 01",
    checkDate: new Date().toISOString().slice(0, 10),
    meshSize: "Mesh 150",
    picResponsible: "Sajiman",
    initialCondition: "Utuh & Bersih",
    initialFindings: "",
    initialAction: "",
    initialPicName: "Sajiman",
    initialQcName: "Staff QC",
    initialQcPassed: true,
    finalCondition: "Utuh & Bersih",
    finalFindings: "",
    finalAction: "",
    finalPicName: "Sajiman",
    finalQcName: "Staff QC",
    finalQcPassed: true,
    qaVerifiedBy: "Supervisor QA",
    notes: "",
  });

  const [mnbForm, setMnbForm] = React.useState<CreateMeshBoltInput>({
    documentCode: "QC-011-MNB. 01",
    formType: "MNB",
    stageCategory: "liquid_sugar",
    room: "Ruang Gula Cair",
    machineNo: "Tangki Masak 01",
    checkDate: new Date().toISOString().slice(0, 10),
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
    finalCondition: "Lengkap & Kencang",
    finalFindings: "",
    finalAction: "",
    finalPicName: "Sajiman",
    finalQcName: "Staff QC",
    qaVerifiedBy: "Supervisor QA",
    notes: "",
  });

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === "mnp") {
        const res = await qcApi.listFilterMeshLogs({
          month: month || undefined,
          formType: "MNP",
        });
        setMnpList(res.data || []);
      } else {
        const res = await qcApi.listMeshBoltLogs({
          month: month || undefined,
          formType: "MNB",
        });
        setMnbList(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching QC liquid sugar logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, month]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveMnp = async () => {
    try {
      await qcApi.createFilterMeshLog(mnpForm);
      setIsMnpOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan form MNP: " + (err as Error).message);
    }
  };

  const handleSaveMnb = async () => {
    try {
      await qcApi.createMeshBoltLog(mnbForm);
      setIsMnbOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan form MNB: " + (err as Error).message);
    }
  };

  const filteredMnp = mnpList.filter(
    (item) =>
      !searchQuery ||
      item.documentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.machineNo && item.machineNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.meshSize && item.meshSize.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredMnb = mnbList.filter(
    (item) =>
      !searchQuery ||
      item.documentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.machineNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Monitoring Mutu QC Gula Cair"
        description="Pencatatan monitoring saringan mesh (QC-011-MNP) serta integritas mur baut & ring tangki masak (QC-011-MNB)"
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800">
            <Droplets className="h-3 w-3 mr-1 text-amber-600" />
            Ruang Gula Cair
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "mnp") exportMNPExcel(mnpList);
              else exportMNBExcel(mnbList);
            }}
            className="flex items-center gap-1.5 text-emerald-700 border-emerald-300"
          >
            <Download className="h-4 w-4" />
            Export {activeTab.toUpperCase()} Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMasterQC011Excel()}
            className="flex items-center gap-1.5 text-emerald-700 border-emerald-500 hover:bg-emerald-50"
            title="Download Master Workbook 9 Sheet (MNJ, MNG, MNP, MNB, MNM Mentah/Matang, MMV, MBB, MPB)"
          >
            <Download className="h-4 w-4" />
            Export Master QC-011
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (activeTab === "mnp") setIsMnpOpen(true);
              else setIsMnbOpen(true);
            }}
            className="flex items-center gap-1.5 bg-primary"
          >
            <Plus className="h-4 w-4" />
            Catat {activeTab.toUpperCase()} Baru
          </Button>
        </div>
      </PageHeader>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("mnp")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "mnp"
                ? "bg-primary text-white shadow-sm"
                : "bg-muted/50 hover:bg-muted text-muted-foreground"
            }`}
          >
            <Filter className="h-4 w-4" />
            MNP: Saringan Mesh
          </button>
          <button
            onClick={() => setActiveTab("mnb")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "mnb"
                ? "bg-primary text-white shadow-sm"
                : "bg-muted/50 hover:bg-muted text-muted-foreground"
            }`}
          >
            <Nut className="h-4 w-4" />
            MNB: Mur Baut & Ring Tangki
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Bulan:</span>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari Dokumen / Mesin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs w-48"
            />
          </div>
        </div>
      </div>

      {/* TAB CONTENT 1: MNP (SARINGAN MESH GULA CAIR) */}
      {activeTab === "mnp" && (
        <Card className="shadow-sm border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b text-muted-foreground font-semibold">
                    <th className="p-3">No. Dokumen</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Tangki / Mesin</th>
                    <th className="p-3">Ukuran Mesh</th>
                    <th className="p-3">Pemeriksaan Awal (Mesh)</th>
                    <th className="p-3">Pemeriksaan Akhir (Mesh)</th>
                    <th className="p-3">Temuan & Tindakan</th>
                    <th className="p-3">PIC (Operator)</th>
                    <th className="p-3">QC / QA</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMnp.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-muted-foreground">
                        Belum ada data monitoring proses penyaringan gula cair (MNP) untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredMnp.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-medium text-primary">{item.documentNo}</td>
                        <td className="p-3 whitespace-nowrap">{item.checkDate}</td>
                        <td className="p-3 font-medium">{item.machineNo}</td>
                        <td className="p-3 font-semibold text-amber-700">{item.meshSize}</td>
                        <td className="p-3">
                          <div>{item.initialCondition}</div>
                          {item.initialFindings && (
                            <div className="text-[11px] text-muted-foreground">Temuan: {item.initialFindings}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div>{item.finalCondition}</div>
                          {item.finalFindings && (
                            <div className="text-[11px] text-muted-foreground">Temuan: {item.finalFindings}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div>{item.finalFindings || item.initialFindings || "-"}</div>
                          {item.finalAction && (
                            <div className="text-[11px] text-muted-foreground">Aksi: {item.finalAction}</div>
                          )}
                        </td>
                        <td className="p-3 font-medium text-gray-800">
                          {item.picResponsible || item.finalPicName || "Sajiman"}
                        </td>
                        <td className="p-3">
                          <div>QC: {item.finalQcName || "Staff QC"}</div>
                          <div className="text-[11px] text-muted-foreground">QA: {item.qaVerifiedBy || "-"}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.overallStatus === "passed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {item.overallStatus === "passed" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {item.overallStatus === "passed" ? "LULUS" : "TINDAKAN"}
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

      {/* TAB CONTENT 2: MNB (MUR BAUT & RING TANGKI GULA CAIR) */}
      {activeTab === "mnb" && (
        <Card className="shadow-sm border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b text-muted-foreground font-semibold">
                    <th className="p-3">No. Dokumen</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Tangki Gula Cair</th>
                    <th className="p-3">Kondisi Mur & Baut Awal</th>
                    <th className="p-3">Kondisi Mur & Baut Akhir</th>
                    <th className="p-3">Temuan & Tindakan</th>
                    <th className="p-3">PIC (Operator)</th>
                    <th className="p-3">QC / QA</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMnb.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        Belum ada data monitoring mur baut & ring tangki gula cair (MNB) untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredMnb.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-medium text-primary">{item.documentNo}</td>
                        <td className="p-3 whitespace-nowrap">{item.checkDate}</td>
                        <td className="p-3 font-medium">{item.machineNo}</td>
                        <td className="p-3">
                          <div>{item.initialBoltCount} Baut Terpasang</div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.initialIsComplete ? "Lengkap" : "Kurang"} | {item.initialIsTight ? "Kencang" : "Kendor"}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className={item.initialBoltCount !== item.finalBoltCount ? "text-rose-600 font-bold" : ""}>
                            {item.finalBoltCount} Baut Terpasang
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.finalIsComplete ? "Lengkap" : "Kurang"} | {item.finalIsTight ? "Kencang" : "Kendor"}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>{item.finalFindings || "-"}</div>
                          {item.finalAction && (
                            <div className="text-[11px] text-muted-foreground">Aksi: {item.finalAction}</div>
                          )}
                        </td>
                        <td className="p-3 font-medium text-gray-800">
                          {item.picResponsible || item.finalPicName || "Sajiman"}
                        </td>
                        <td className="p-3">
                          <div>QC: {item.finalQcName || "Staff QC"}</div>
                          <div className="text-[11px] text-muted-foreground">QA: {item.qaVerifiedBy || "-"}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.overallStatus === "passed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {item.overallStatus === "passed" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {item.overallStatus === "passed" ? "LULUS" : "TINDAKAN"}
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

      {/* DIALOG 1: Catat MNP */}
      <Dialog open={isMnpOpen} onOpenChange={setIsMnpOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-amber-600" />
              Form QC-011-MNP. 01: Monitoring Kondisi Penyaringan Gula Cair
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold">Tanggal Pemeriksaan *</label>
              <Input
                type="date"
                value={mnpForm.checkDate}
                onChange={(e) => setMnpForm({ ...mnpForm, checkDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Tangki / Mesin *</label>
              <Input
                value={mnpForm.machineNo}
                onChange={(e) => setMnpForm({ ...mnpForm, machineNo: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Ukuran Mesh Saringan *</label>
              <Input
                value={mnpForm.meshSize}
                onChange={(e) => setMnpForm({ ...mnpForm, meshSize: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Penanggung Jawab (PIC)</label>
              <Input
                value={mnpForm.picResponsible}
                onChange={(e) =>
                  setMnpForm({
                    ...mnpForm,
                    picResponsible: e.target.value,
                    initialPicName: e.target.value,
                    finalPicName: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div className="col-span-2 border-t pt-2 font-semibold text-primary">
              Kondisi Fisik Mesh Saringan
            </div>
            <div>
              <label className="font-medium">Kondisi Saringan Awal</label>
              <Input
                value={mnpForm.initialCondition}
                onChange={(e) => setMnpForm({ ...mnpForm, initialCondition: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Kondisi Saringan Akhir</label>
              <Input
                value={mnpForm.finalCondition}
                onChange={(e) => setMnpForm({ ...mnpForm, finalCondition: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <label className="font-medium">Temuan Kotoran / Benda Asing</label>
              <Input
                placeholder="Deskripsi gram kotoran/benda asing yang tertahan..."
                value={mnpForm.finalFindings}
                onChange={(e) => setMnpForm({ ...mnpForm, finalFindings: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="font-medium">Tindakan Koreksi</label>
              <Input
                placeholder="Tindakan pencucian saringan atau penggantian mesh..."
                value={mnpForm.finalAction}
                onChange={(e) => setMnpForm({ ...mnpForm, finalAction: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Verifikasi QA</label>
              <Input
                value={mnpForm.qaVerifiedBy}
                onChange={(e) => setMnpForm({ ...mnpForm, qaVerifiedBy: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsMnpOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveMnp} className="bg-amber-600 hover:bg-amber-700">
              Simpan Form MNP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Catat MNB */}
      <Dialog open={isMnbOpen} onOpenChange={setIsMnbOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Nut className="h-5 w-5 text-amber-600" />
              Form QC-011-MNB. 01: Monitoring Mur Baut & Ring Tangki Gula Cair
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold">Tanggal Pemeriksaan *</label>
              <Input
                type="date"
                value={mnbForm.checkDate}
                onChange={(e) => setMnbForm({ ...mnbForm, checkDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Tangki Gula Cair *</label>
              <Input
                value={mnbForm.machineNo}
                onChange={(e) => setMnbForm({ ...mnbForm, machineNo: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Penanggung Jawab (PIC)</label>
              <Input
                value={mnbForm.picResponsible}
                onChange={(e) =>
                  setMnbForm({
                    ...mnbForm,
                    picResponsible: e.target.value,
                    initialPicName: e.target.value,
                    finalPicName: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Verifikasi QA</label>
              <Input
                value={mnbForm.qaVerifiedBy}
                onChange={(e) => setMnbForm({ ...mnbForm, qaVerifiedBy: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-2 border-t pt-2 font-semibold text-primary">
              Kondisi Mur, Baut & Ring Tangki
            </div>
            <div>
              <label className="font-medium">Jumlah Baut Terpasang Awal</label>
              <Input
                type="number"
                value={mnbForm.initialBoltCount}
                onChange={(e) => setMnbForm({ ...mnbForm, initialBoltCount: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Jumlah Baut Terpasang Akhir</label>
              <Input
                type="number"
                value={mnbForm.finalBoltCount}
                onChange={(e) => setMnbForm({ ...mnbForm, finalBoltCount: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>

            {mnbForm.initialBoltCount !== mnbForm.finalBoltCount && (
              <div className="col-span-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  <strong>BAHAYA KONTAMINASI BENDA ASING:</strong> Selisih jumlah baut/ring tangki! Hentikan saluran
                  dan lakukan pemeriksaan menyeluruh.
                </span>
              </div>
            )}

            <div className="col-span-2">
              <label className="font-medium">Temuan / Catatan Khusus</label>
              <Input
                placeholder="Catatan kekencangan baut atau penggantian ring seal..."
                value={mnbForm.finalFindings}
                onChange={(e) => setMnbForm({ ...mnbForm, finalFindings: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsMnbOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveMnb} className="bg-amber-600 hover:bg-amber-700">
              Simpan Form MNB
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
