"use client";

import * as React from "react";
import {
  Flame,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Thermometer,
  Droplets,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  qcApi,
  OvenMonitoringItem,
  CreateOvenMonitoringInput,
} from "@/lib/api/qc";
import { exportMNOExcel } from "@/lib/utils/export-qc-excel";

export default function QCOvenPage() {
  const [month, setMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [ovenNo, setOvenNo] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [ovenLogs, setOvenLogs] = React.useState<OvenMonitoringItem[]>([]);

  // Dialog state
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  // Form state
  const [formData, setFormData] = React.useState<CreateOvenMonitoringInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    ovenNo: "Oven 01",
    batchNo: "",
    productName: "Gula Semut Kelapa Organik",
    initialTemperature: 60,
    initialTime: "08:00",
    initialMoisture: 2.8,
    stabilizedTime: "08:45",
    processTemperature: 100,
    processMoisture1: 2.5,
    processMoisture2: 2.2,
    processMoisture3: 1.9,
    finalTemperature: 95,
    finalTime: "11:30",
    finalMoisture: 1.8,
    issues: "",
    actionTaken: "",
    picName: "Operator Oven",
    qcVerifierName: "Staff QC",
    qcPassed: true,
    notes: "",
  });

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await qcApi.listOvenMonitoringLogs({
        month,
        ovenNo: ovenNo || undefined,
      });
      setOvenLogs(res.data || []);
    } catch (err) {
      console.error("Error fetching oven monitoring logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [month, ovenNo]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      await qcApi.createOvenMonitoringLog(formData);
      setIsOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan monitoring oven: " + (err as Error).message);
    }
  };

  const isMoistureTargetMet = formData.finalMoisture <= 2.0 && formData.finalMoisture > 0;

  const filteredLogs = ovenLogs.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.batchNo.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.documentNo.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Monitoring Proses Oven (MNO)"
        description="Pencatatan siklus pemanasan oven (QC-012-MNO.05): Suhu awal, stabil 100°C, pemantauan berkala, dan verifikasi kadar air akhir ≤ 2.0%"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMNOExcel(ovenLogs)}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export Excel
          </Button>
          <Button
            size="sm"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 bg-primary"
          >
            <Plus className="h-4 w-4" />
            Catat Siklus Oven Baru
          </Button>
        </div>
      </PageHeader>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
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
            <span>Nomor Oven:</span>
            <select
              value={ovenNo}
              onChange={(e) => setOvenNo(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">Semua Oven</option>
              <option value="Oven 01">Oven 01</option>
              <option value="Oven 02">Oven 02</option>
              <option value="Oven 03">Oven 03</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari Batch / Produk / Dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs w-64"
          />
        </div>
      </div>

      {/* Main Table */}
      <Card className="shadow-sm border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b text-muted-foreground font-semibold">
                  <th className="p-3">No. Dokumen</th>
                  <th className="p-3">Tgl</th>
                  <th className="p-3">Oven</th>
                  <th className="p-3">Batch / Produk</th>
                  <th className="p-3">Awal (Masuk)</th>
                  <th className="p-3">Stabil (100°C)</th>
                  <th className="p-3">Proses (Berkala)</th>
                  <th className="p-3">Akhir (Selesai)</th>
                  <th className="p-3 text-center">Kadar Air Akhir</th>
                  <th className="p-3">PIC / QC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      Belum ada data monitoring oven (MNO) untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-medium text-primary">{item.documentNo}</td>
                      <td className="p-3 whitespace-nowrap">{item.checkDate}</td>
                      <td className="p-3 font-medium flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-amber-500" />
                        {item.ovenNo}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{item.productName}</div>
                        <div className="font-mono text-muted-foreground text-[11px]">{item.batchNo}</div>
                      </td>
                      <td className="p-3">
                        <div>{item.initialTime} WIB</div>
                        <div className="text-muted-foreground text-[11px]">
                          {item.initialTemperature}°C | KA: {item.initialMoisture}%
                        </div>
                      </td>
                      <td className="p-3 font-medium text-amber-700">
                        {item.stabilizedTime} WIB (100°C)
                      </td>
                      <td className="p-3">
                        <div>Suhu: {item.processTemperature}°C</div>
                        <div className="text-muted-foreground text-[11px]">
                          KA: {item.processMoisture1 ?? "-"}% &rarr; {item.processMoisture2 ?? "-"}%
                        </div>
                      </td>
                      <td className="p-3">
                        <div>{item.finalTime} WIB</div>
                        <div className="text-muted-foreground text-[11px]">
                          Suhu Akhir: {item.finalTemperature}°C
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-mono font-bold text-sm">
                          {item.finalMoisture}%
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.isTargetMoistureReached
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {item.isTargetMoistureReached ? (
                            <CheckCircle2 className="h-2.5 w-2.5" />
                          ) : (
                            <AlertTriangle className="h-2.5 w-2.5" />
                          )}
                          {item.isTargetMoistureReached ? "LULUS (≤ 2.0%)" : "OVEN ULANG"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div>PIC: {item.picName}</div>
                        <div className="text-muted-foreground text-[11px]">QC: {item.qcVerifierName || "-"}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG: Catat Siklus Oven MNO Baru */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form QC-012-MNO.05: Monitoring Siklus Oven</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold">Tanggal Operasional</label>
              <Input
                type="date"
                value={formData.checkDate}
                onChange={(e) => setFormData({ ...formData, checkDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Nomor Oven</label>
              <select
                value={formData.ovenNo}
                onChange={(e) => setFormData({ ...formData, ovenNo: e.target.value })}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="Oven 01">Oven 01</option>
                <option value="Oven 02">Oven 02</option>
                <option value="Oven 03">Oven 03</option>
              </select>
            </div>
            <div>
              <label className="font-semibold">Nomor Batch (Lot dari Ayak Mentah)</label>
              <Input
                placeholder="e.g. 26O10PW001"
                value={formData.batchNo}
                onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-semibold">Nama Produk</label>
              <Input
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* FASE 1: AWAL */}
            <div className="col-span-2 border-t pt-3 font-semibold text-primary flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              1. Fase AWAL (Bahan mulai masuk oven)
            </div>
            <div>
              <label className="font-medium">Jam Masuk (WIB)</label>
              <Input
                type="time"
                value={formData.initialTime}
                onChange={(e) => setFormData({ ...formData, initialTime: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Suhu Ruang Oven (°C)</label>
              <Input
                type="number"
                value={formData.initialTemperature}
                onChange={(e) => setFormData({ ...formData, initialTemperature: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="font-medium">Kadar Air Bahan Mentah (%)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.initialMoisture}
                onChange={(e) => setFormData({ ...formData, initialMoisture: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>

            {/* FASE 2: STABIL */}
            <div className="col-span-2 border-t pt-3 font-semibold text-amber-700 flex items-center gap-1.5">
              <Thermometer className="h-4 w-4" />
              2. Fase STABIL (Ketika temperatur oven stabil mencapai 100°C)
            </div>
            <div className="col-span-2">
              <label className="font-medium">Waktu Tercapai Stabil 100°C (WIB)</label>
              <Input
                type="time"
                value={formData.stabilizedTime}
                onChange={(e) => setFormData({ ...formData, stabilizedTime: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* FASE 3: PROSES */}
            <div className="col-span-2 border-t pt-3 font-semibold text-sky-700 flex items-center gap-1.5">
              <Droplets className="h-4 w-4" />
              3. Fase PROSES (Pemantauan berkala ± 1 jam setelah stabil)
            </div>
            <div>
              <label className="font-medium">Suhu Pemanasan (°C)</label>
              <Input
                type="number"
                value={formData.processTemperature}
                onChange={(e) => setFormData({ ...formData, processTemperature: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Kadar Air Pengamatan 1 (%)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.processMoisture1 ?? ""}
                onChange={(e) => setFormData({ ...formData, processMoisture1: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Kadar Air Pengamatan 2 (%)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.processMoisture2 ?? ""}
                onChange={(e) => setFormData({ ...formData, processMoisture2: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Kadar Air Pengamatan 3 (%)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.processMoisture3 ?? ""}
                onChange={(e) => setFormData({ ...formData, processMoisture3: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>

            {/* FASE 4: AKHIR */}
            <div className="col-span-2 border-t pt-3 font-semibold text-emerald-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                4. Fase AKHIR (Produk siap diturunkan)
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">Target: ≤ 2.0%</span>
            </div>
            <div>
              <label className="font-medium">Jam Selesai (WIB)</label>
              <Input
                type="time"
                value={formData.finalTime}
                onChange={(e) => setFormData({ ...formData, finalTime: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Suhu Akhir (°C)</label>
              <Input
                type="number"
                value={formData.finalTemperature}
                onChange={(e) => setFormData({ ...formData, finalTemperature: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="font-medium">Kadar Air Akhir Sampling (%)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.finalMoisture}
                onChange={(e) => setFormData({ ...formData, finalMoisture: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              {isMoistureTargetMet ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Parameter Mutu Lulus:</strong> Kadar air {formData.finalMoisture}% memenuhi target standar
                    (≤ 2.0%). Produk kering siap diturunkan ke tahap ayak matang.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>
                    <strong>Belum Memenuhi Target:</strong> Kadar air {formData.finalMoisture}% masih di atas 2.0%. Wajib
                    dilakukan pemanasan tambahan sebelum produk diturunkan!
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="font-medium">Nama Operator (PIC)</label>
              <Input
                value={formData.picName}
                onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Verifikasi QC Sampling</label>
              <Input
                value={formData.qcVerifierName}
                onChange={(e) => setFormData({ ...formData, qcVerifierName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="font-medium">Permasalahan & Tindakan</label>
              <Input
                placeholder="Catatan kendala pemanasan oven..."
                value={formData.issues}
                onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan Monitoring Oven</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
