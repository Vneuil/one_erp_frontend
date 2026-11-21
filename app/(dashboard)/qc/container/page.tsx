"use client";

import * as React from "react";
import {
  Truck,
  Plus,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Container,
  Clock,
  Sparkles,
  Lock,
  Eye,
  Droplets,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  qcApi,
  ContainerChecklistItem,
  CreateContainerChecklistInput,
} from "@/lib/api/qc";
import { exportCCOExcel } from "@/lib/utils/export-wip-excel";

export default function QCContainerPage() {
  const [reports, setReports] = React.useState<ContainerChecklistItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [decisionFilter, setDecisionFilter] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Dialog state
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<"driver" | "container" | "security" | "cleanliness" | "leak" | "time">("driver");

  // Form State
  const [formData, setFormData] = React.useState<CreateContainerChecklistInput>({
    checkDate: new Date().toISOString().slice(0, 10),
    idCardType: "SIM",
    idCardNumber: "920193819203",
    driverName: "Agus Santoso",
    birthDetails: "Cilacap, 12 Mei 1985",
    gender: "Laki-laki",
    address: "Jl. Raya Pelabuhan No. 45, Cilacap",
    religion: "Islam",
    maritalStatus: "Menikah",
    cardValidity: "2028-05-12",
    transporterCompany: "PT Samudera Logistik Nusantara",
    vehicleLicensePlate: "B 9182 UE",

    containerName: "Maersk Line (MSKU)",
    containerNumber: "MSKU9182391",
    containerSize: "20ft",
    sealNumber: "ML-ID-918201",
    shippingInstructionNo: "SI-2026-11-098",
    eirNumber: "EIR-882190",
    erNumber: "ER-99120",

    cabinAreaStatus: "aman",
    underVehicleStatus: "aman",
    insideContainerStatus: "aman",
    suspiciousNotes: "Bebas dari bahan kimia dan barang berbahaya",

    floorCleanliness: "bersih",
    rightWallCleanliness: "bersih",
    leftWallCleanliness: "bersih",
    roofCleanliness: "bersih",
    doorCleanliness: "bersih",
    cleanlinessNotes: "Kering, bebas bau menyengat, bebas noda oli/cairan",

    floorHoleStatus: "rapat",
    rightWallHoleStatus: "rapat",
    leftWallHoleStatus: "rapat",
    roofHoleStatus: "rapat",
    doorHoleStatus: "rapat",
    holeNotes: "Uji gelap posisi pintu tertutup: tidak ada celah cahaya masuk",

    sealTime: "14:30",
    capTime: "14:45",
    departureTime: "15:30",
    palletDetails: "10 Pallet Kayu Fumigasi ISPM 15",
    shipmentDestination: "Rotterdam Port, Netherlands (Eco Organic BV)",

    inspectorQc: "Rudi Hartono (QC)",
    verifierQa: "Steven (QA Lead)",
    notes: "Kontainer dalam kondisi prima dan siap muat ekspor",
  });

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await qcApi.listContainerChecklists({
        containerNo: searchQuery || undefined,
        decision: decisionFilter || undefined,
      });
      if (res.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat data CCO:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, decisionFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (field: keyof CreateContainerChecklistInput, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await qcApi.createContainerChecklist(formData);
      setIsOpen(false);
      await loadData();
    } catch (err) {
      alert("Gagal menyimpan Checklist Container CCO: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const passedCount = reports.filter((r) => r.overallDecision === "lolos").length;
  const rejectedCount = reports.filter((r) => r.overallDecision === "ditolak").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklist Container (CCO)"
        description="Formulir resmi QC-008-CCO.02 verifikasi kelayakan armada kontainer ekspor: identitas sopir, kebersihan 5 sisi, uji kedap lubang cahaya, dan penguncian segel resmi"
      >
        <div className="flex gap-2">
          <Button onClick={() => setIsOpen(true)} className="gap-2 bg-blue-700 hover:bg-blue-800 text-white">
            <Plus className="h-4 w-4" />
            Checklist Kontainer Baru
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Kontainer Diperiksa</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-800">{reports.length} <span className="text-sm font-normal">Kontainer</span></h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-700">
              <Container className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Lolos & Layak Muat (Stuffing)</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-700">{passedCount} <span className="text-sm font-normal">Lolos</span></h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Ditolak (Bocor / Kotor)</p>
              <h3 className="text-2xl font-bold mt-1 text-red-700">{rejectedCount} <span className="text-sm font-normal">Reject</span></h3>
            </div>
            <div className="p-3 bg-red-50 rounded-full text-red-600">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Tingkat Kelayakan Armada</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-700">
                {reports.length > 0 ? Math.round((passedCount / reports.length) * 100) : 100}%
              </h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-full text-purple-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex flex-1 gap-2 w-full md:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nomor kontainer atau dokumen CCO..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="border rounded-md px-3 text-sm bg-background"
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value)}
              >
                <option value="">Semua Keputusan</option>
                <option value="lolos">Lolos (Layak Stuffing)</option>
                <option value="ditolak">Ditolak (Reject Armada)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4 text-left">No. CCO</th>
                  <th className="py-3 px-4 text-left">Tgl Periksa</th>
                  <th className="py-3 px-4 text-left">Kontainer & Ukuran</th>
                  <th className="py-3 px-4 text-left">Nomor Seal / CAP</th>
                  <th className="py-3 px-4 text-left">Pengemudi & Nopol</th>
                  <th className="py-3 px-4 text-left">Tujuan Pengiriman</th>
                  <th className="py-3 px-4 text-center">Hasil Inspeksi</th>
                  <th className="py-3 px-4 text-center">Keputusan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Memuat checklist container...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Belum ada dokumen Checklist Container (QC-008-CCO.02) yang dicatat.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono font-medium text-blue-700">
                        {r.documentNo}
                      </td>
                      <td className="py-3 px-4 font-medium">{r.checkDate}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold">{r.containerNumber}</div>
                        <div className="text-xs text-muted-foreground">{r.containerName} ({r.containerSize})</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-xs">
                        {r.sealNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-xs">{r.driverName}</div>
                        <div className="text-xs text-muted-foreground">{r.vehicleLicensePlate} - {r.transporterCompany}</div>
                      </td>
                      <td className="py-3 px-4 text-xs max-w-[180px] truncate">
                        {r.shipmentDestination}
                      </td>
                      <td className="py-3 px-4 text-center text-xs">
                        <span className={r.insideContainerStatus === "aman" ? "text-emerald-600 font-medium" : "text-red-500 font-bold"}>
                          Keamanan: {r.insideContainerStatus === "aman" ? "✓" : "✗"}
                        </span>
                        <br />
                        <span className={r.roofHoleStatus === "rapat" ? "text-emerald-600 font-medium" : "text-red-500 font-bold"}>
                          Kedap: {r.roofHoleStatus === "rapat" ? "✓" : "✗"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {r.overallDecision === "lolos" ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                            <CheckCircle2 className="h-3 w-3" /> LAYAK MUAT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold">
                            <XCircle className="h-3 w-3" /> DITOLAK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => exportCCOExcel(r)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Excel
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Input CCO */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-700" />
              Checklist Container (QC-008-CCO. 02)
            </DialogTitle>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="flex border-b text-xs font-medium space-x-1 overflow-x-auto pb-1">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-t-md transition-colors ${
                activeTab === "driver" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setActiveTab("driver")}
            >
              1. Pengemudi & Truk
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-t-md transition-colors ${
                activeTab === "container" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setActiveTab("container")}
            >
              2. Data Kontainer
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-t-md transition-colors ${
                activeTab === "security" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setActiveTab("security")}
            >
              3. Barang Mencurigakan
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-t-md transition-colors ${
                activeTab === "cleanliness" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setActiveTab("cleanliness")}
            >
              4. Kebersihan 5 Sisi
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-t-md transition-colors ${
                activeTab === "leak" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setActiveTab("leak")}
            >
              5. Uji Lubang / Celah
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-t-md transition-colors ${
                activeTab === "time" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setActiveTab("time")}
            >
              6. Waktu & Verifikasi
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Tab 1: Driver */}
            {activeTab === "driver" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium">Tgl Periksa</label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={formData.checkDate}
                      onChange={(e) => handleChange("checkDate", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Jenis Identitas</label>
                    <select
                      className="w-full mt-1 border rounded px-3 py-1.5 text-sm bg-background"
                      value={formData.idCardType}
                      onChange={(e) => handleChange("idCardType", e.target.value)}
                    >
                      <option value="SIM">SIM</option>
                      <option value="KTP">KTP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Nomor Identitas</label>
                    <Input
                      className="mt-1"
                      value={formData.idCardNumber}
                      onChange={(e) => handleChange("idCardNumber", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium">Nama Lengkap Pengemudi</label>
                    <Input
                      className="mt-1"
                      value={formData.driverName}
                      onChange={(e) => handleChange("driverName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">TTL (Tempat, Tgl Lahir)</label>
                    <Input
                      className="mt-1"
                      value={formData.birthDetails}
                      onChange={(e) => handleChange("birthDetails", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Nomor Polisi Truk</label>
                    <Input
                      className="mt-1 font-mono font-bold"
                      value={formData.vehicleLicensePlate}
                      onChange={(e) => handleChange("vehicleLicensePlate", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Asal Perusahaan (Transporter)</label>
                    <Input
                      className="mt-1"
                      value={formData.transporterCompany}
                      onChange={(e) => handleChange("transporterCompany", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Masa Berlaku SIM / KTP</label>
                    <Input
                      className="mt-1"
                      value={formData.cardValidity}
                      onChange={(e) => handleChange("cardValidity", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Container */}
            {activeTab === "container" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium">Nama Kontainer / Pelayaran</label>
                    <Input
                      placeholder="Maersk Line / MSC..."
                      className="mt-1"
                      value={formData.containerName}
                      onChange={(e) => handleChange("containerName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Nomor Kontainer</label>
                    <Input
                      placeholder="MSKU9182391"
                      className="mt-1 font-mono font-bold"
                      value={formData.containerNumber}
                      onChange={(e) => handleChange("containerNumber", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Ukuran Kontainer</label>
                    <select
                      className="w-full mt-1 border rounded px-3 py-1.5 text-sm bg-background"
                      value={formData.containerSize}
                      onChange={(e) => handleChange("containerSize", e.target.value)}
                    >
                      <option value="20ft">20 Feet</option>
                      <option value="40ft">40 Feet</option>
                      <option value="40ft HC">40 Feet High Cube (HC)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium">Nomor Seal / CAP</label>
                    <Input
                      placeholder="ML-ID-918201"
                      className="mt-1 font-mono font-bold"
                      value={formData.sealNumber}
                      onChange={(e) => handleChange("sealNumber", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Shipping Instruction (SI)</label>
                    <Input
                      className="mt-1"
                      value={formData.shippingInstructionNo}
                      onChange={(e) => handleChange("shippingInstructionNo", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">EIR / No. E/R</label>
                    <Input
                      className="mt-1"
                      value={formData.eirNumber}
                      onChange={(e) => handleChange("eirNumber", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Tujuan Pengiriman</label>
                    <Input
                      placeholder="Pelabuhan Rotterdam / Nama Buyer..."
                      className="mt-1"
                      value={formData.shipmentDestination}
                      onChange={(e) => handleChange("shipmentDestination", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Rincian Pallet</label>
                    <Input
                      placeholder="10 Pallet Kayu Fumigasi ISPM 15..."
                      className="mt-1"
                      value={formData.palletDetails}
                      onChange={(e) => handleChange("palletDetails", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Security */}
            {activeTab === "security" && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                  <strong>Catatan Keamanan:</strong> Barang mencurigakan adalah barang/komoditas yang tidak mendukung kedatangan bahan baku (bahan kimia berbahaya, narkotika, dan barang yang tidak tertera dalam surat pengantar).
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg">
                    <label className="text-xs font-bold">Ruang Kemudi</label>
                    <select
                      className="w-full mt-1 border rounded px-3 py-1.5 text-sm bg-background font-medium"
                      value={formData.cabinAreaStatus}
                      onChange={(e) => handleChange("cabinAreaStatus", e.target.value)}
                    >
                      <option value="aman">Aman (Bebas temuan)</option>
                      <option value="mencurigakan">Mencurigakan</option>
                    </select>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <label className="text-xs font-bold">Bagian Bawah Kendaraan</label>
                    <select
                      className="w-full mt-1 border rounded px-3 py-1.5 text-sm bg-background font-medium"
                      value={formData.underVehicleStatus}
                      onChange={(e) => handleChange("underVehicleStatus", e.target.value)}
                    >
                      <option value="aman">Aman (Bebas temuan)</option>
                      <option value="mencurigakan">Mencurigakan</option>
                    </select>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <label className="text-xs font-bold">Bagian Dalam Kontainer</label>
                    <select
                      className="w-full mt-1 border rounded px-3 py-1.5 text-sm bg-background font-medium"
                      value={formData.insideContainerStatus}
                      onChange={(e) => handleChange("insideContainerStatus", e.target.value)}
                    >
                      <option value="aman">Aman (Bebas temuan)</option>
                      <option value="mencurigakan">Mencurigakan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium">Catatan Temuan Keamanan</label>
                  <Input
                    className="mt-1"
                    placeholder="Bebas temuan..."
                    value={formData.suspiciousNotes}
                    onChange={(e) => handleChange("suspiciousNotes", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Tab 4: Cleanliness */}
            {activeTab === "cleanliness" && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded border border-blue-200 text-xs text-blue-800">
                  <strong>Standar Kebersihan Kontainer:</strong> Kondisi kendaraan tidak terdapat kotoran berupa cairan, noda oli, atau padatan yang dapat mengontaminasi produk pangan.
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="p-2 border rounded">
                    <label className="text-xs font-bold">Lantai</label>
                    <select
                      className="w-full mt-1 border rounded px-2 py-1 text-xs bg-background"
                      value={formData.floorCleanliness}
                      onChange={(e) => handleChange("floorCleanliness", e.target.value)}
                    >
                      <option value="bersih">Bersih</option>
                      <option value="kotor">Kotor</option>
                    </select>
                  </div>

                  <div className="p-2 border rounded">
                    <label className="text-xs font-bold">Dinding Kanan</label>
                    <select
                      className="w-full mt-1 border rounded px-2 py-1 text-xs bg-background"
                      value={formData.rightWallCleanliness}
                      onChange={(e) => handleChange("rightWallCleanliness", e.target.value)}
                    >
                      <option value="bersih">Bersih</option>
                      <option value="kotor">Kotor</option>
                    </select>
                  </div>

                  <div className="p-2 border rounded">
                    <label className="text-xs font-bold">Dinding Kiri</label>
                    <select
                      className="w-full mt-1 border rounded px-2 py-1 text-xs bg-background"
                      value={formData.leftWallCleanliness}
                      onChange={(e) => handleChange("leftWallCleanliness", e.target.value)}
                    >
                      <option value="bersih">Bersih</option>
                      <option value="kotor">Kotor</option>
                    </select>
                  </div>

                  <div className="p-2 border rounded">
                    <label className="text-xs font-bold">Atap</label>
                    <select
                      className="w-full mt-1 border rounded px-2 py-1 text-xs bg-background"
                      value={formData.roofCleanliness}
                      onChange={(e) => handleChange("roofCleanliness", e.target.value)}
                    >
                      <option value="bersih">Bersih</option>
                      <option value="kotor">Kotor</option>
                    </select>
                  </div>

                  <div className="p-2 border rounded">
                    <label className="text-xs font-bold">Pintu</label>
                    <select
                      className="w-full mt-1 border rounded px-2 py-1 text-xs bg-background"
                      value={formData.doorCleanliness}
                      onChange={(e) => handleChange("doorCleanliness", e.target.value)}
                    >
                      <option value="bersih">Bersih</option>
                      <option value="kotor">Kotor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium">Catatan Kebersihan</label>
                  <Input
                    className="mt-1"
                    placeholder="Bebas bau dan kotoran..."
                    value={formData.cleanlinessNotes}
                    onChange={(e) => handleChange("cleanlinessNotes", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Tab 5: Leak Test */}
            {activeTab === "leak" && (
              <div className="space-y-4">
                <div className="p-3 bg-purple-50 rounded border border-purple-200 text-xs text-purple-800">
                  <strong>Uji Lubang (Celah Cahaya & Air):</strong> Dilakukan saat posisi DUA PINTU TERTUTUP RAPAT dari dalam kontainer. Tidak boleh ada celah atau titik sinar tembus.
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="p-2 border rounded">
                    <label className="text-xs font-bold">Lantai</label>
                    <select
                      className="w-full mt-1 border rounded px-2 py-1 text-xs bg-background"
                      value={formData.floorHoleStatus}
                      onChange={(e) => handleChange("floorHoleStatus", e.target.value)}
                    >
                      <option value="rapat">Rapat / Kedap</option>
                      <option value="bocor">Bocor / Celah</option>
                    </select>
                  </div>

                  <div className="p-2 border rounded">
                    <label className="text-xs font-bold">Dinding Kanan</label>
                    <select
                      className="w-full mt-1 border rounded px-2 py-1 text-xs bg-background"
                      value={formData.rightWallHoleStatus}
                      onChange={(e) => handleChange("rightWallHoleStatus", e.target.value)}
                    >
                      <option value="rapat">Rapat / Kedap</option>
                      <option value="bocor">Bocor / Celah</option>
                    </select>
                  </div>

                  <div className="p-2 border rounded">
                    <label className="text-xs font-bold">Dinding Kiri</label>
                    <select
                      className="w-full mt-1 border rounded px-2 py-1 text-xs bg-background"
                      value={formData.leftWallHoleStatus}
                      onChange={(e) => handleChange("leftWallHoleStatus", e.target.value)}
                    >
                      <option value="rapat">Rapat / Kedap</option>
                      <option value="bocor">Bocor / Celah</option>
                    </select>
                  </div>

                  <div className="p-2 border rounded">
                    <label className="text-xs font-bold">Atap</label>
                    <select
                      className="w-full mt-1 border rounded px-2 py-1 text-xs bg-background"
                      value={formData.roofHoleStatus}
                      onChange={(e) => handleChange("roofHoleStatus", e.target.value)}
                    >
                      <option value="rapat">Rapat / Kedap</option>
                      <option value="bocor">Bocor / Celah</option>
                    </select>
                  </div>

                  <div className="p-2 border rounded">
                    <label className="text-xs font-bold">Pintu</label>
                    <select
                      className="w-full mt-1 border rounded px-2 py-1 text-xs bg-background"
                      value={formData.doorHoleStatus}
                      onChange={(e) => handleChange("doorHoleStatus", e.target.value)}
                    >
                      <option value="rapat">Rapat / Kedap</option>
                      <option value="bocor">Bocor / Celah</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium">Catatan Uji Lubang</label>
                  <Input
                    className="mt-1"
                    placeholder="Semua sisi kedap..."
                    value={formData.holeNotes}
                    onChange={(e) => handleChange("holeNotes", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Tab 6: Timestamps & Verification */}
            {activeTab === "time" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium">Jam Disegel</label>
                    <Input
                      type="time"
                      className="mt-1"
                      value={formData.sealTime}
                      onChange={(e) => handleChange("sealTime", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium">Jam Dipasang CAP</label>
                    <Input
                      type="time"
                      className="mt-1"
                      value={formData.capTime}
                      onChange={(e) => handleChange("capTime", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium">Jam Berangkat Truk</label>
                    <Input
                      type="time"
                      className="mt-1"
                      value={formData.departureTime}
                      onChange={(e) => handleChange("departureTime", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Pemeriksa QC (Dibuat Oleh)</label>
                    <Input
                      className="mt-1"
                      value={formData.inspectorQc}
                      onChange={(e) => handleChange("inspectorQc", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium">Verifikator QA (Diverifikasi Oleh)</label>
                    <Input
                      className="mt-1"
                      value={formData.verifierQa}
                      onChange={(e) => handleChange("verifierQa", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium">Catatan Akhir</label>
                  <Input
                    className="mt-1"
                    placeholder="Kontainer siap berangkat..."
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-700 hover:bg-blue-800 text-white">
                {isSubmitting ? "Menyimpan..." : "Simpan Checklist Container (CCO)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
