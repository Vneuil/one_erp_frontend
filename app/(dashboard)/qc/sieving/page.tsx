"use client";

import * as React from "react";
import {
  ShieldAlert,
  Sparkles,
  Printer,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Magnet,
  Nut,
  Grid,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  qcApi,
  SievingMonitoringItem,
  CreateSievingInput,
  MagnetTrapItem,
  CreateMagnetTrapInput,
  MeshBoltMonitoringItem,
  CreateMeshBoltInput,
} from "@/lib/api/qc";
import { exportMNAExcel, exportCMTExcel, exportMNMExcel } from "@/lib/utils/export-qc-excel";

export default function QCSievingPage() {
  const [activeTab, setActiveTab] = React.useState<"mna" | "cmt" | "mnm">("mna");
  const [stage, setStage] = React.useState<"mentah" | "matang">("mentah");
  const [month, setMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [machineNo, setMachineNo] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Data states
  const [mnaList, setMnaList] = React.useState<SievingMonitoringItem[]>([]);
  const [cmtList, setCmtList] = React.useState<MagnetTrapItem[]>([]);
  const [mnmList, setMnmList] = React.useState<MeshBoltMonitoringItem[]>([]);

  // Dialog states
  const [isMnaOpen, setIsMnaOpen] = React.useState<boolean>(false);
  const [isCmtOpen, setIsCmtOpen] = React.useState<boolean>(false);
  const [isMnmOpen, setIsMnmOpen] = React.useState<boolean>(false);

  // Form states
  const [mnaForm, setMnaForm] = React.useState<CreateSievingInput>({
    machineNo: "Mesin Ayak 01",
    checkDate: new Date().toISOString().slice(0, 10),
    category: "Mentah",
    productName: "Gula Semut Kelapa Organik",
    batchNo: "",
    meshSize: "Mesh 18",
    initialCondition: "Baik & Bersih",
    initialFindings: "",
    initialAction: "",
    initialPicName: "Operator Ayak",
    initialQcName: "Staff QC",
    initialQcPassed: true,
    finalCondition: "Baik & Bersih",
    finalFindings: "",
    finalAction: "",
    finalPicName: "Operator Ayak",
    finalQcName: "Staff QC",
    finalQcPassed: true,
    notes: "",
  });

  const [cmtForm, setCmtForm] = React.useState<CreateMagnetTrapInput>({
    machineNo: "Mesin Ayak 01",
    checkDate: new Date().toISOString().slice(0, 10),
    room: "Ayak Mentah",
    picResponsible: "Mandor Ayak",
    isClean: true,
    gaussPoint1: 720,
    gaussPoint2: 715,
    gaussPoint3: 710,
    gaussPoint4: 715,
    gaussPoint5: 720,
    foreignMatterFound: "",
    issues: "",
    actionTaken: "",
    picName: "Operator Ayak",
    qcName: "Staff QC",
    qcPassed: true,
    qaVerifiedBy: "Supervisor QA",
    notes: "",
  });

  const [mnmForm, setMnmForm] = React.useState<CreateMeshBoltInput>({
    machineNo: "Mesin Ayak 01",
    checkDate: new Date().toISOString().slice(0, 10),
    room: "Ayak Mentah",
    meshSize: "Mesh 18",
    picResponsible: "Mandor Ayak",
    initialBoltCount: 16,
    initialIsComplete: true,
    initialIsTight: true,
    initialCondition: "SS304 Utuh & Bebas Karat",
    initialFindings: "",
    initialAction: "",
    initialPicName: "Operator Ayak",
    initialQcName: "Staff QC",
    finalBoltCount: 16,
    finalIsComplete: true,
    finalIsTight: true,
    finalFindings: "",
    finalAction: "",
    finalPicName: "Operator Ayak",
    finalQcName: "Staff QC",
    qaVerifiedBy: "Supervisor QA",
    notes: "",
  });

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === "mna") {
        const res = await qcApi.listSievingLogs({
          month,
          machineNo: machineNo || undefined,
          category: stage === "matang" ? "Matang" : "Mentah",
        });
        setMnaList(res.data || []);
      } else if (activeTab === "cmt") {
        const res = await qcApi.listMagnetTrapLogs({
          month,
          machineNo: machineNo || undefined,
          room: stage === "matang" ? "Ayak Matang" : "Ayak Mentah",
        });
        setCmtList(res.data || []);
      } else if (activeTab === "mnm") {
        const res = await qcApi.listMeshBoltLogs({
          month,
          machineNo: machineNo || undefined,
          room: stage === "matang" ? "Ayak Matang" : "Ayak Mentah",
        });
        setMnmList(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching QC logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, month, machineNo, stage]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit handlers
  const handleSaveMna = async () => {
    try {
      await qcApi.createSievingLog(mnaForm);
      setIsMnaOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan form MNA: " + (err as Error).message);
    }
  };

  const handleSaveCmt = async () => {
    try {
      await qcApi.createMagnetTrapLog(cmtForm);
      setIsCmtOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan form CMT: " + (err as Error).message);
    }
  };

  const handleSaveMnm = async () => {
    try {
      await qcApi.createMeshBoltLog(mnmForm);
      setIsMnmOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan form MNM: " + (err as Error).message);
    }
  };

  // Gauss meter real-time calculation
  const p1 = cmtForm.gaussPoint1 ?? 0;
  const p2 = cmtForm.gaussPoint2 ?? 0;
  const p3 = cmtForm.gaussPoint3 ?? 0;
  const p4 = cmtForm.gaussPoint4 ?? 0;
  const p5 = cmtForm.gaussPoint5 ?? 0;
  const countPoints = p4 > 0 && p5 > 0 ? 5 : 3;
  const cmtAvg = Math.round(((p1 + p2 + p3 + (countPoints === 5 ? p4 + p5 : 0)) / countPoints) * 100) / 100;
  const isCmtPowerLow = p1 < 700 || p2 < 700 || p3 < 700 || (countPoints === 5 && (p4 < 700 || p5 < 700));

  // Bolt count mismatch check
  const isBoltMismatch = (mnmForm.initialBoltCount || 16) !== (mnmForm.finalBoltCount || 16);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={stage === "matang" ? "Monitoring Pengayakan Matang (MNA/CMT/MNM)" : "Monitoring Pengayakan Mentah (MNA/CMT/MNM)"}
        description="Pencatatan resmi proses ayak (QC-009-MNA.01), pemakaian magnet trap (QC-038-CMT), serta integritas mur & baut mesh (QC-010-MNM.01)"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "mna") exportMNAExcel(mnaList);
              else if (activeTab === "cmt") exportCMTExcel(cmtList);
              else if (activeTab === "mnm") exportMNMExcel(mnmList);
            }}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export Excel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (activeTab === "mna") setIsMnaOpen(true);
              else if (activeTab === "cmt") setIsCmtOpen(true);
              else if (activeTab === "mnm") setIsMnmOpen(true);
            }}
            className="flex items-center gap-1.5 bg-primary"
          >
            <Plus className="h-4 w-4" />
            Catat {activeTab.toUpperCase()} Baru
          </Button>
        </div>
      </PageHeader>

      {/* Filter and Tab Selection Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Stage Selector: Ayak Mentah vs Ayak Matang */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => {
                setStage("mentah");
                setMnaForm((prev) => ({ ...prev, category: "Mentah" }));
                setCmtForm((prev) => ({ ...prev, room: "Ayak Mentah" }));
                setMnmForm((prev) => ({ ...prev, room: "Ayak Mentah" }));
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                stage === "mentah"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🌱 Ayak Mentah
            </button>
            <button
              onClick={() => {
                setStage("matang");
                setMnaForm((prev) => ({ ...prev, category: "Matang" }));
                setCmtForm((prev) => ({ ...prev, room: "Ayak Matang" }));
                setMnmForm((prev) => ({ ...prev, room: "Ayak Matang" }));
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                stage === "matang"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🔥 Ayak Matang
            </button>
          </div>

          <div className="h-6 w-px bg-border hidden md:block" />

          {/* Form Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("mna")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "mna"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              <Grid className="h-4 w-4" />
              MNA: Proses Ayak
            </button>
            <button
              onClick={() => setActiveTab("cmt")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "cmt"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              <Magnet className="h-4 w-4" />
              CMT: Magnet Trap
            </button>
            <button
              onClick={() => setActiveTab("mnm")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "mnm"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              <Nut className="h-4 w-4" />
              MNM: Mur & Baut
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Bulan:</span>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Mesin:</span>
            <select
              value={machineNo}
              onChange={(e) => setMachineNo(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">Semua Mesin</option>
              <option value="Mesin Ayak 01">Mesin Ayak 01</option>
              <option value="Mesin Ayak 02">Mesin Ayak 02</option>
              <option value="Mesin Ayak 03">Mesin Ayak 03</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari Batch / Produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs w-48"
            />
          </div>
        </div>
      </div>

      {/* TAB CONTENT 1: MNA */}
      {activeTab === "mna" && (
        <Card className="shadow-sm border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b text-muted-foreground font-semibold">
                    <th className="p-3">No. Dokumen</th>
                    <th className="p-3">Tgl</th>
                    <th className="p-3">Mesin</th>
                    <th className="p-3">Produk & Batch</th>
                    <th className="p-3">Mesh</th>
                    <th className="p-3">Pemeriksaan Awal (Mesh)</th>
                    <th className="p-3">Pemeriksaan Akhir (Mesh)</th>
                    <th className="p-3">PIC / QC</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mnaList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        Belum ada data monitoring proses ayak (MNA) untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    mnaList.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-medium text-primary">{item.documentNo}</td>
                        <td className="p-3 whitespace-nowrap">{item.checkDate}</td>
                        <td className="p-3 font-medium">{item.machineNo}</td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">{item.productName}</div>
                          <div className="font-mono text-muted-foreground text-[11px]">{item.batchNo}</div>
                        </td>
                        <td className="p-3 font-semibold text-sky-700">{item.meshSize}</td>
                        <td className="p-3">
                          <div className="text-foreground">{item.initialCondition}</div>
                          {item.initialFindings && (
                            <div className="text-muted-foreground text-[11px]">Temuan: {item.initialFindings}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-foreground">{item.finalCondition}</div>
                          {item.finalFindings && (
                            <div className="text-muted-foreground text-[11px]">Temuan: {item.finalFindings}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div>PIC: {item.finalPicName || item.initialPicName}</div>
                          <div className="text-muted-foreground text-[11px]">QC: {item.finalQcName || "-"}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.overallStatus === "passed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
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

      {/* TAB CONTENT 2: CMT */}
      {activeTab === "cmt" && (
        <Card className="shadow-sm border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b text-muted-foreground font-semibold">
                    <th className="p-3">No. Dokumen</th>
                    <th className="p-3">Tgl</th>
                    <th className="p-3">Mesin & Ruangan</th>
                    <th className="p-3">Kondisi Fisik</th>
                    <th className="p-3">Gauss Meter 3 Titik (mT)</th>
                    <th className="p-3">Rata-rata</th>
                    <th className="p-3">Benda Asing Terjaring</th>
                    <th className="p-3">PIC & QA</th>
                    <th className="p-3 text-center">Evaluasi Magnet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cmtList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        Belum ada data catatan pemakaian magnet trap (CMT) untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    cmtList.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-medium text-primary">{item.documentNo}</td>
                        <td className="p-3 whitespace-nowrap">{item.checkDate}</td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">{item.machineNo}</div>
                          <div className="text-muted-foreground text-[11px]">{item.room}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.isClean ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {item.isClean ? "√ Bersih" : "x Kotor"}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          P1: {item.gaussPoint1} | P2: {item.gaussPoint2} | P3: {item.gaussPoint3}
                        </td>
                        <td className="p-3 font-mono font-bold">{item.gaussAverage} mT</td>
                        <td className="p-3">
                          {item.foreignMatterFound ? (
                            <span className="text-rose-600 font-medium">{item.foreignMatterFound}</span>
                          ) : (
                            <span className="text-muted-foreground">Nihil</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div>PIC: {item.picName}</div>
                          <div className="text-muted-foreground text-[11px]">QA: {item.qaVerifiedBy || "-"}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.isPowerSufficient
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {item.isPowerSufficient ? "Normal (≥700 mT)" : "ALERT (<700 mT)"}
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

      {/* TAB CONTENT 3: MNM */}
      {activeTab === "mnm" && (
        <Card className="shadow-sm border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b text-muted-foreground font-semibold">
                    <th className="p-3">No. Dokumen</th>
                    <th className="p-3">Tgl</th>
                    <th className="p-3">Mesin & Mesh</th>
                    <th className="p-3">Pemeriksaan Awal</th>
                    <th className="p-3">Pemeriksaan Akhir</th>
                    <th className="p-3">Integritas Baut</th>
                    <th className="p-3">Temuan & Tindakan</th>
                    <th className="p-3">PIC & QA</th>
                    <th className="p-3 text-center">Status Food Safety</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mnmList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        Belum ada data monitoring mur & baut mesh (MNM) untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    mnmList.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-medium text-primary">{item.documentNo}</td>
                        <td className="p-3 whitespace-nowrap">{item.checkDate}</td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">{item.machineNo}</div>
                          <div className="text-sky-700 font-semibold text-[11px]">{item.meshSize}</div>
                        </td>
                        <td className="p-3">
                          <div>{item.initialBoltCount} Baut ({item.initialIsTight ? "Kencang" : "Kendor"})</div>
                          <div className="text-muted-foreground text-[11px]">{item.initialCondition}</div>
                        </td>
                        <td className="p-3">
                          <div>{item.finalBoltCount} Baut ({item.finalIsTight ? "Kencang" : "Kendor"})</div>
                        </td>
                        <td className="p-3 font-medium">
                          {item.isCountMatched ? (
                            <span className="text-emerald-700 font-bold">100% Utuh ({item.finalBoltCount}/{item.initialBoltCount})</span>
                          ) : (
                            <span className="text-rose-700 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              BAUT HILANG ({item.finalBoltCount - item.initialBoltCount})
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {item.finalFindings || item.initialFindings || "-"}
                        </td>
                        <td className="p-3">
                          <div>PIC: {item.finalPicName || item.initialPicName}</div>
                          <div className="text-muted-foreground text-[11px]">QA: {item.qaVerifiedBy || "-"}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.overallStatus === "passed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {item.overallStatus === "passed" ? "LULUS" : "BAHAYA FISIK"}
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

      {/* DIALOG 1: Catat MNA */}
      <Dialog open={isMnaOpen} onOpenChange={setIsMnaOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form QC-009-MNA.01: Monitoring Proses Ayak</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold">Tanggal Operasional</label>
              <Input
                type="date"
                value={mnaForm.checkDate}
                onChange={(e) => setMnaForm({ ...mnaForm, checkDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Nomor Mesin</label>
              <Input
                value={mnaForm.machineNo}
                onChange={(e) => setMnaForm({ ...mnaForm, machineNo: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Nama Produk</label>
              <Input
                value={mnaForm.productName}
                onChange={(e) => setMnaForm({ ...mnaForm, productName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Nomor Batch / Lot</label>
              <Input
                value={mnaForm.batchNo}
                onChange={(e) => setMnaForm({ ...mnaForm, batchNo: e.target.value })}
                placeholder="e.g. 26O10PW001"
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Ukuran Mesh</label>
              <Input
                value={mnaForm.meshSize}
                onChange={(e) => setMnaForm({ ...mnaForm, meshSize: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Lini Ayak</label>
              <select
                value={mnaForm.category}
                onChange={(e) => setMnaForm({ ...mnaForm, category: e.target.value })}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="Mentah">Ayak Mentah</option>
                <option value="Oven">Ayak Matang / Oven</option>
              </select>
            </div>

            <div className="col-span-2 border-t pt-3 font-semibold text-primary">
              Pemeriksaan AWAL (Sebelum Pengayakan / Pergantian Lot)
            </div>
            <div>
              <label className="font-medium">Kondisi Mesh Awal</label>
              <Input
                value={mnaForm.initialCondition}
                onChange={(e) => setMnaForm({ ...mnaForm, initialCondition: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Nama PIC Awal (Operator)</label>
              <Input
                value={mnaForm.initialPicName}
                onChange={(e) => setMnaForm({ ...mnaForm, initialPicName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="font-medium">Temuan & Tindakan Awal</label>
              <Input
                placeholder="Tulis jika ada kotoran/kerusakan mesh..."
                value={mnaForm.initialFindings}
                onChange={(e) => setMnaForm({ ...mnaForm, initialFindings: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-2 border-t pt-3 font-semibold text-primary">
              Pemeriksaan AKHIR (Setelah Pengayakan Selesai)
            </div>
            <div>
              <label className="font-medium">Kondisi Mesh Akhir</label>
              <Input
                value={mnaForm.finalCondition}
                onChange={(e) => setMnaForm({ ...mnaForm, finalCondition: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Nama PIC Akhir (Operator)</label>
              <Input
                value={mnaForm.finalPicName}
                onChange={(e) => setMnaForm({ ...mnaForm, finalPicName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="font-medium">Temuan & Tindakan Akhir</label>
              <Input
                placeholder="Tulis jika ditemukan kawat aus/sobek..."
                value={mnaForm.finalFindings}
                onChange={(e) => setMnaForm({ ...mnaForm, finalFindings: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsMnaOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveMna}>Simpan Form MNA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Catat CMT */}
      <Dialog open={isCmtOpen} onOpenChange={setIsCmtOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form QC-038-CMT: Catatan Pemakaian Magnet Trap</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold">Tanggal Pemeriksaan</label>
              <Input
                type="date"
                value={cmtForm.checkDate}
                onChange={(e) => setCmtForm({ ...cmtForm, checkDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Nomor Mesin</label>
              <Input
                value={cmtForm.machineNo}
                onChange={(e) => setCmtForm({ ...cmtForm, machineNo: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Ruangan</label>
              <Input
                value={cmtForm.room}
                onChange={(e) => setCmtForm({ ...cmtForm, room: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Penanggung Jawab</label>
              <Input
                value={cmtForm.picResponsible}
                onChange={(e) => setCmtForm({ ...cmtForm, picResponsible: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-2 border-t pt-3 font-semibold text-primary flex items-center justify-between">
              <span>Pengukuran Kekuatan Gauss Meter (mT)</span>
              <span className="text-[11px] font-normal text-muted-foreground">Standar: ≥ 700 mT (7000 Gauss)</span>
            </div>

            <div>
              <label className="font-medium">Titik 1 (mT)</label>
              <Input
                type="number"
                value={cmtForm.gaussPoint1}
                onChange={(e) => setCmtForm({ ...cmtForm, gaussPoint1: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Titik 2 (mT)</label>
              <Input
                type="number"
                value={cmtForm.gaussPoint2}
                onChange={(e) => setCmtForm({ ...cmtForm, gaussPoint2: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Titik 3 (mT)</label>
              <Input
                type="number"
                value={cmtForm.gaussPoint3}
                onChange={(e) => setCmtForm({ ...cmtForm, gaussPoint3: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Rata-rata Terkalkulasi</label>
              <div className="mt-1 h-9 px-3 flex items-center bg-muted/40 rounded-md font-mono font-bold text-sm">
                {cmtAvg} mT ({Math.round(cmtAvg * 10)} Gauss)
              </div>
            </div>

            {isCmtPowerLow && (
              <div className="col-span-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  <strong>Peringatan Ambang Batas:</strong> Terdapat titik dengan kekuatan &lt; 700 mT. Segera laporkan
                  ke QC untuk pergantian magnet!
                </span>
              </div>
            )}

            <div className="col-span-2">
              <label className="font-medium">Benda Asing yang Menempel</label>
              <Input
                placeholder="Deskripsi temuan gram besi/serpihan..."
                value={cmtForm.foreignMatterFound}
                onChange={(e) => setCmtForm({ ...cmtForm, foreignMatterFound: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Nama PIC (Operator)</label>
              <Input
                value={cmtForm.picName}
                onChange={(e) => setCmtForm({ ...cmtForm, picName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Verifikasi QA</label>
              <Input
                value={cmtForm.qaVerifiedBy}
                onChange={(e) => setCmtForm({ ...cmtForm, qaVerifiedBy: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCmtOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveCmt}>Simpan Form CMT</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Catat MNM */}
      <Dialog open={isMnmOpen} onOpenChange={setIsMnmOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form QC-010-MNM.01: Monitoring Mur & Baut Mesh Ayakan</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold">Tanggal Pemeriksaan</label>
              <Input
                type="date"
                value={mnmForm.checkDate}
                onChange={(e) => setMnmForm({ ...mnmForm, checkDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Nomor Mesin</label>
              <Input
                value={mnmForm.machineNo}
                onChange={(e) => setMnmForm({ ...mnmForm, machineNo: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Ukuran Mesh</label>
              <Input
                value={mnmForm.meshSize}
                onChange={(e) => setMnmForm({ ...mnmForm, meshSize: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Penanggung Jawab</label>
              <Input
                value={mnmForm.picResponsible}
                onChange={(e) => setMnmForm({ ...mnmForm, picResponsible: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-2 border-t pt-3 font-semibold text-primary">
              Integritas Mur & Baut (Awal vs Akhir)
            </div>
            <div>
              <label className="font-medium">Jumlah Baut Terpasang Awal</label>
              <Input
                type="number"
                value={mnmForm.initialBoltCount}
                onChange={(e) => setMnmForm({ ...mnmForm, initialBoltCount: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Jumlah Baut Terpasang Akhir</label>
              <Input
                type="number"
                value={mnmForm.finalBoltCount}
                onChange={(e) => setMnmForm({ ...mnmForm, finalBoltCount: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>

            {isBoltMismatch && (
              <div className="col-span-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  <strong>BAHAYA KONTAMINASI FISIK:</strong> Terdapat selisih jumlah baut awal dan akhir! Hentikan lini
                  dan lakukan pemeriksaan Metal Detector menyeluruh pada produk gula yang telah diayak.
                </span>
              </div>
            )}

            <div>
              <label className="font-medium">Nama PIC (Operator)</label>
              <Input
                value={mnmForm.finalPicName}
                onChange={(e) => setMnmForm({ ...mnmForm, finalPicName: e.target.value, initialPicName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Verifikasi QA</label>
              <Input
                value={mnmForm.qaVerifiedBy}
                onChange={(e) => setMnmForm({ ...mnmForm, qaVerifiedBy: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="font-medium">Temuan / Catatan Khusus</label>
              <Input
                placeholder="Catatan baut kencang/kendor..."
                value={mnmForm.finalFindings}
                onChange={(e) => setMnmForm({ ...mnmForm, finalFindings: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsMnmOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveMnm}>Simpan Form MNM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
