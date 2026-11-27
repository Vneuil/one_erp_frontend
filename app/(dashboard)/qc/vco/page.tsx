"use client";

import * as React from "react";
import {
  Filter,
  Plus,
  Download,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "@/lib/api/qc";
import { exportMMVExcel, exportMasterQC011Excel } from "@/lib/utils/export-qc-excel";

export default function QCVcoPage() {
  const [month, setMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Data states
  const [mmvList, setMmvList] = React.useState<FilterMeshMonitoringItem[]>([]);

  // Dialog state
  const [isMmvOpen, setIsMmvOpen] = React.useState<boolean>(false);

  // Form state
  const [mmvForm, setMmvForm] = React.useState<CreateFilterMeshInput>({
    documentCode: "QC-011-MMV. 01",
    formType: "MMV",
    location: "Ruang VCO",
    machineNo: "Saringan Mesh VCO 01",
    checkDate: new Date().toISOString().slice(0, 10),
    meshSize: "Mesh 200",
    picResponsible: "Abel",
    initialCondition: "Utuh & Bersih Bebas Karat",
    initialFindings: "",
    initialAction: "",
    initialPicName: "Abel",
    initialQcName: "Staff QC",
    initialQcPassed: true,
    finalCondition: "Utuh & Bersih Bebas Karat",
    finalFindings: "",
    finalAction: "",
    finalPicName: "Abel",
    finalQcName: "Staff QC",
    finalQcPassed: true,
    qaVerifiedBy: "Supervisor QA",
    notes: "",
  });

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await qcApi.listFilterMeshLogs({
        month: month || undefined,
        formType: "MMV",
      });
      setMmvList(res.data || []);
    } catch (err) {
      console.error("Error fetching QC VCO logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveMmv = async () => {
    try {
      await qcApi.createFilterMeshLog(mmvForm);
      setIsMmvOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan form MMV: " + (err as Error).message);
    }
  };

  const filteredMmv = mmvList.filter(
    (item) =>
      !searchQuery ||
      item.documentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.machineNo && item.machineNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.meshSize && item.meshSize.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Monitoring Mutu QC Virgin Coconut Oil (VCO)"
        description="Pencatatan monitoring integritas dan kebersihan saringan mesh VCO (QC-011-MMV. 01)"
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-cyan-400 bg-cyan-50 text-cyan-800">
            <Sparkles className="h-3 w-3 mr-1 text-cyan-600" />
            Ruang VCO
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMMVExcel(mmvList)}
            className="flex items-center gap-1.5 text-emerald-700 border-emerald-300"
          >
            <Download className="h-4 w-4" />
            Export MMV Excel
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
            onClick={() => setIsMmvOpen(true)}
            className="flex items-center gap-1.5 bg-primary"
          >
            <Plus className="h-4 w-4" />
            Catat MMV Baru
          </Button>
        </div>
      </PageHeader>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
          <Filter className="h-4 w-4 text-cyan-600" />
          <span>Daftar Log Saringan Mesh VCO (QC-011-MMV. 01)</span>
          <span className="text-xs text-muted-foreground ml-2">Total: {filteredMmv.length} log</span>
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

      {/* TAB CONTENT: MMV (SARINGAN MESH VCO) */}
      <Card className="shadow-sm border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b text-muted-foreground font-semibold">
                  <th className="p-3">No. Dokumen</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Saringan / Mesin</th>
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
                {filteredMmv.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      Belum ada data monitoring saringan mesh VCO (MMV) untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredMmv.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-medium text-primary">{item.documentNo}</td>
                      <td className="p-3 whitespace-nowrap">{item.checkDate}</td>
                      <td className="p-3 font-medium">{item.machineNo}</td>
                      <td className="p-3 font-semibold text-cyan-700">{item.meshSize}</td>
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
                        {item.picResponsible || item.finalPicName || "Abel"}
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

      {/* DIALOG: Catat MMV */}
      <Dialog open={isMmvOpen} onOpenChange={setIsMmvOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-cyan-600" />
              Form QC-011-MMV. 01: Monitoring Kondisi Mesh Saringan VCO
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold">Tanggal Pemeriksaan *</label>
              <Input
                type="date"
                value={mmvForm.checkDate}
                onChange={(e) => setMmvForm({ ...mmvForm, checkDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Saringan / Mesin VCO *</label>
              <Input
                value={mmvForm.machineNo}
                onChange={(e) => setMmvForm({ ...mmvForm, machineNo: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Ukuran Mesh Saringan *</label>
              <Input
                value={mmvForm.meshSize}
                onChange={(e) => setMmvForm({ ...mmvForm, meshSize: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Penanggung Jawab (PIC)</label>
              <Input
                value={mmvForm.picResponsible}
                onChange={(e) =>
                  setMmvForm({
                    ...mmvForm,
                    picResponsible: e.target.value,
                    initialPicName: e.target.value,
                    finalPicName: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div className="col-span-2 border-t pt-2 font-semibold text-primary">
              Kondisi Fisik Mesh Saringan VCO
            </div>
            <div>
              <label className="font-medium">Kondisi Saringan Awal</label>
              <Input
                value={mmvForm.initialCondition}
                onChange={(e) => setMmvForm({ ...mmvForm, initialCondition: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Kondisi Saringan Akhir</label>
              <Input
                value={mmvForm.finalCondition}
                onChange={(e) => setMmvForm({ ...mmvForm, finalCondition: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <label className="font-medium">Temuan Kotoran / Endapan Benda Asing</label>
              <Input
                placeholder="Deskripsi endapan kotoran atau serat kelapa yang tertahan..."
                value={mmvForm.finalFindings}
                onChange={(e) => setMmvForm({ ...mmvForm, finalFindings: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="font-medium">Tindakan Koreksi</label>
              <Input
                placeholder="Tindakan pencucian saringan atau penggantian mesh..."
                value={mmvForm.finalAction}
                onChange={(e) => setMmvForm({ ...mmvForm, finalAction: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Verifikasi QA</label>
              <Input
                value={mmvForm.qaVerifiedBy}
                onChange={(e) => setMmvForm({ ...mmvForm, qaVerifiedBy: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsMmvOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveMmv} className="bg-cyan-600 hover:bg-cyan-700">
              Simpan Form MMV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
