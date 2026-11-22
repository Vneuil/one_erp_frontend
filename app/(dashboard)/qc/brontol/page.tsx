"use client";

import * as React from "react";
import {
  AlertTriangle,
  RotateCcw,
  Truck,
  Plus,
  Search,
  Filter,
  Printer,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Boxes,
  Eye,
  RefreshCw,
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
import { Textarea } from "@/components/ui/textarea";
import {
  qcApi,
  BrontolReportItem,
  RejectReturnItem,
  BrontolStats,
  BrontolStockCardItem,
  CreateBrontolReportInput,
  CreateRejectReturnInput,
  UpdateRejectReturnInput,
} from "@/lib/api/qc";

export default function BrontolAndReturnPage() {
  const [activeTab, setActiveTab] = React.useState<string>("brontol");
  const [month, setMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [stageFilter, setStageFilter] = React.useState<string>("");
  const [actionFilter, setActionFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Data states
  const [reports, setReports] = React.useState<BrontolReportItem[]>([]);
  const [returns, setReturns] = React.useState<RejectReturnItem[]>([]);
  const [stockCards, setStockCards] = React.useState<BrontolStockCardItem[]>([]);
  const [stats, setStats] = React.useState<BrontolStats>({
    totalCount: 0,
    totalQuantityKg: 0,
    returnCount: 0,
    returnQtyKg: 0,
    reworkCount: 0,
  });

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = React.useState<boolean>(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = React.useState<boolean>(false);
  const [isUpdateReturnOpen, setIsUpdateReturnOpen] = React.useState<boolean>(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState<boolean>(false);
  const [selectedReport, setSelectedReport] = React.useState<BrontolReportItem | null>(null);
  const [selectedReturn, setSelectedReturn] = React.useState<RejectReturnItem | null>(null);

  // Form states
  const [formData, setFormData] = React.useState<CreateBrontolReportInput>({
    reportDate: new Date().toISOString().slice(0, 10),
    sourceStage: "manual",
    productName: "Gula Kelapa Semut (GSKN)",
    productCode: "GSKN-01",
    batchNo: "",
    materialType: "BM",
    machineNo: "Mesin Ayak 13",
    meshSize: "16",
    quantity: 5.0,
    unit: "KG",
    defectReason: "",
    actionDisposition: "return_to_supplier",
    supplierName: "",
    operatorName: "",
    qcInspectorName: "Staff QC",
    notes: "",
  });

  const [returnFormData, setReturnFormData] = React.useState<CreateRejectReturnInput>({
    returnDate: new Date().toISOString().slice(0, 10),
    supplierName: "",
    poNo: "",
    goodsReceiptNo: "",
    deliveryNoteNo: "",
    returnQuantity: 0,
    unit: "KG",
    returnReason: "",
    courierName: "",
    vehicleNumber: "",
    driverName: "",
    preparedBy: "Staff QC / Logistik",
    notes: "",
  });

  const [updateReturnData, setUpdateReturnData] = React.useState<UpdateRejectReturnInput>({
    courierName: "",
    vehicleNumber: "",
    driverName: "",
    status: "pending_pickup",
    notes: "",
  });

  // Fetch all data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [reportsRes, returnsRes, cardsRes, statsRes] = await Promise.all([
        qcApi.listBrontolReports({
          month: month || undefined,
          stage: stageFilter || undefined,
          action: actionFilter || undefined,
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        }),
        qcApi.listRejectReturns({
          month: month || undefined,
          search: searchQuery || undefined,
        }),
        qcApi.getBrontolStockCard({ month: month || undefined }),
        qcApi.getBrontolStats(),
      ]);

      setReports(reportsRes.data || []);
      setReturns(returnsRes.data || []);
      setStockCards(cardsRes.data || []);
      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Error fetching brontol & return data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [month, stageFilter, actionFilter, statusFilter, searchQuery]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle create manual brontol
  const handleCreateBrontol = async () => {
    try {
      await qcApi.createBrontolReport(formData);
      setIsCreateOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal mencatat laporan brontol: " + (err as Error).message);
    }
  };

  // Open return creation modal
  const openProcessReturnModal = (report: BrontolReportItem) => {
    setSelectedReport(report);
    setReturnFormData({
      returnDate: new Date().toISOString().slice(0, 10),
      supplierName: report.supplierName || "",
      poNo: "",
      goodsReceiptNo: report.sourceInspectionNo || "",
      deliveryNoteNo: "",
      returnQuantity: report.quantity,
      unit: report.unit,
      returnReason: report.defectReason,
      courierName: "",
      vehicleNumber: "",
      driverName: "",
      preparedBy: report.qcInspectorName || "Staff QC",
      notes: "",
    });
    setIsReturnModalOpen(true);
  };

  const handleProcessReturn = async () => {
    if (!selectedReport) return;
    try {
      await qcApi.createRejectReturn(selectedReport.id, returnFormData);
      setIsReturnModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal memproses laporan retur: " + (err as Error).message);
    }
  };

  // Open update return modal
  const openUpdateReturnModal = (ret: RejectReturnItem) => {
    setSelectedReturn(ret);
    setUpdateReturnData({
      courierName: ret.courierName || "",
      vehicleNumber: ret.vehicleNumber || "",
      driverName: ret.driverName || "",
      status: ret.status,
      notes: ret.notes || "",
    });
    setIsUpdateReturnOpen(true);
  };

  const handleUpdateReturn = async () => {
    if (!selectedReturn) return;
    try {
      await qcApi.updateRejectReturn(selectedReturn.id, updateReturnData);
      setIsUpdateReturnOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal memperbarui retur: " + (err as Error).message);
    }
  };

  // Stage display helper
  const renderStageBadge = (stage: string) => {
    switch (stage) {
      case "incoming_raw_material":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Penerimaan Bahan (PBD)</Badge>;
      case "incoming_packaging":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Bahan Kemas (PBK)</Badge>;
      case "sieving":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Ayak (MNA)</Badge>;
      case "magnet_trap":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">Magnet Trap (CMT)</Badge>;
      case "mesh_bolt":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">Baut Ayak (MNM)</Badge>;
      case "oven":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Oven (MNO)</Badge>;
      case "metal_detector":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Metal Detector (VMD)</Badge>;
      case "finished_goods":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Produk Jadi (PJD)</Badge>;
      case "label_packaging":
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">Label Kemas (PLK)</Badge>;
      case "production_step":
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">Step Produksi</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Lantai Produksi</Badge>;
    }
  };

  const renderActionBadge = (action: string) => {
    switch (action) {
      case "return_to_supplier":
        return (
          <Badge className="bg-rose-600 text-white font-medium flex items-center gap-1">
            <Truck className="h-3 w-3" /> Retur ke Supplier
          </Badge>
        );
      case "rework":
        return (
          <Badge className="bg-amber-500 text-white font-medium flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Masak Ulang / Reproses
          </Badge>
        );
      case "re_oven":
        return (
          <Badge className="bg-orange-500 text-white font-medium flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Masuk Oven Ulang
          </Badge>
        );
      case "disposal":
        return <Badge className="bg-gray-700 text-white font-medium">Afkir / Pemusnahan</Badge>;
      default:
        return <Badge className="bg-yellow-500 text-white font-medium">Karantina / Hold</Badge>;
    }
  };

  const renderReturnStatusBadge = (status: string) => {
    switch (status) {
      case "pending_pickup":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Menunggu Pengambilan</Badge>;
      case "shipped":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Sedang Dikirim</Badge>;
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Selesai / Diterima</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Laporan Brontol & Retur Barang Reject"
        description="Mekanisme terpadu deteksi QC gagal, pencatatan brontol (REP-013-KSB), dan penerbitan laporan retur barang reject ke supplier"
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">
            Form REP-013-KSB
          </Badge>
          <Badge variant="default" className="bg-rose-600 hidden sm:inline-flex">
            Auto-Trigger on QC Fail
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1"
          >
            <Printer className="h-4 w-4" />
            Cetak Dokumen
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Catat Brontol Manual
          </Button>
        </div>
      </PageHeader>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Laporan Brontol
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCount}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Semua kegagalan QC</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-full text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Reject / Brontol
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalQuantityKg.toLocaleString("id-ID", { maximumFractionDigits: 2 })}{" "}
                <span className="text-sm font-normal text-gray-500">KG</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Lumpur / butiran / kemasan reject</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-full text-amber-600">
              <Boxes className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Retur ke Supplier
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {stats.returnCount}{" "}
                <span className="text-sm font-normal text-gray-500">
                  ({stats.returnQtyKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} KG)
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Barang reject dikembalikan</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
              <Truck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Reproses / Oven Ulang
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.reworkCount}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Dapat dipulihkan internal</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full text-purple-600">
              <RotateCcw className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1 border">
          <TabsTrigger value="brontol" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Daftar Laporan Brontol ({reports.length})
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Laporan Retur Barang Reject ({returns.length})
          </TabsTrigger>
          <TabsTrigger value="stockcard" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Kartu Stok Brontol (REP-013-KSB)
          </TabsTrigger>
        </TabsList>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari Batch, Produk, Supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-36 text-sm"
              />
            </div>

            {activeTab === "brontol" && (
              <>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input text-sm bg-background"
                >
                  <option value="">Semua Tahap Flow QC</option>
                  <option value="incoming_raw_material">Penerimaan Bahan (PBD)</option>
                  <option value="incoming_packaging">Bahan Kemas (PBK)</option>
                  <option value="sieving">Ayak (MNA)</option>
                  <option value="magnet_trap">Magnet Trap (CMT)</option>
                  <option value="mesh_bolt">Baut Ayak (MNM)</option>
                  <option value="oven">Oven (MNO)</option>
                  <option value="metal_detector">Metal Detector (VMD)</option>
                  <option value="finished_goods">Produk Jadi (PJD)</option>
                  <option value="label_packaging">Label Kemas (PLK)</option>
                  <option value="production_step">Step Produksi</option>
                  <option value="manual">Manual Lantai Produksi</option>
                </select>

                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input text-sm bg-background"
                >
                  <option value="">Semua Tindakan</option>
                  <option value="return_to_supplier">Retur ke Supplier</option>
                  <option value="rework">Masak Ulang / Reproses</option>
                  <option value="re_oven">Masuk Oven Ulang</option>
                  <option value="disposal">Pemusnahan / Afkir</option>
                  <option value="hold">Karantina / Hold</option>
                </select>
              </>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={fetchData} className="flex items-center gap-1">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>

        {/* ─── TAB 1: DAFTAR LAPORAN BRONTOL ───────────────────────────────── */}
        <TabsContent value="brontol">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/50 border-b text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">No. Laporan & Tanggal</th>
                      <th className="px-4 py-3">Sumber Flow QC</th>
                      <th className="px-4 py-3">Produk & Batch</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3 text-right">Jumlah Reject</th>
                      <th className="px-4 py-3">Alasan Gagal QC</th>
                      <th className="px-4 py-3">Tindakan Disposisi</th>
                      <th className="px-4 py-3">Petugas / QC</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-muted-foreground">
                          {isLoading ? "Memuat data laporan brontol..." : "Tidak ada laporan brontol untuk filter ini."}
                        </td>
                      </tr>
                    ) : (
                      reports.map((report) => (
                        <tr key={report.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{report.reportNo}</div>
                            <div className="text-xs text-muted-foreground">{report.reportDate}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{report.documentCode}</div>
                          </td>
                          <td className="px-4 py-3">
                            {renderStageBadge(report.sourceStage)}
                            {report.sourceInspectionNo && (
                              <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                                Ref: {report.sourceInspectionNo}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{report.productName}</div>
                            <div className="text-xs font-mono text-muted-foreground">
                              Batch: {report.batchNo}
                            </div>
                            {report.supplierName && (
                              <div className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                                <Building2 className="h-3 w-3" /> {report.supplierName}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-xs">
                            <Badge variant="outline">{report.materialType}</Badge>
                            {report.machineNo && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {report.machineNo} {report.meshSize ? `(M${report.meshSize})` : ""}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-bold text-rose-600">
                              {report.quantity.toLocaleString("id-ID", { maximumFractionDigits: 2 })}{" "}
                              {report.unit}
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="text-xs text-gray-800 line-clamp-2" title={report.defectReason}>
                              {report.defectReason}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {renderActionBadge(report.actionDisposition)}
                            {report.returnReport && (
                              <div className="text-xs text-rose-700 font-mono mt-1 flex items-center gap-1">
                                <Truck className="h-3 w-3" /> {report.returnReport.returnNo}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-medium">{report.qcInspectorName || "-"}</div>
                            {report.operatorName && (
                              <div className="text-muted-foreground text-[11px]">Op: {report.operatorName}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={
                                report.status === "returned"
                                  ? "bg-rose-50 text-rose-700 border-rose-300"
                                  : report.status === "reprocessed"
                                  ? "bg-amber-50 text-amber-700 border-amber-300"
                                  : "bg-gray-50 text-gray-700"
                              }
                            >
                              {report.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setIsDetailOpen(true);
                                }}
                                title="Lihat Detail & Cetak"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {report.actionDisposition === "return_to_supplier" && !report.returnReport && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                                  onClick={() => openProcessReturnModal(report)}
                                  title="Buat Laporan Retur"
                                >
                                  <Truck className="h-3.5 w-3.5 mr-1" />
                                  Proses Retur
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: LAPORAN RETUR BARANG REJECT KE SUPPLIER ─────────────────── */}
        <TabsContent value="returns">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/50 border-b text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">No. Retur & Tanggal</th>
                      <th className="px-4 py-3">Supplier Tujuan</th>
                      <th className="px-4 py-3">Produk & Batch</th>
                      <th className="px-4 py-3 text-right">Kuantitas Retur</th>
                      <th className="px-4 py-3">Alasan Retur / Gagal QC</th>
                      <th className="px-4 py-3">Informasi Pengiriman</th>
                      <th className="px-4 py-3">Petugas</th>
                      <th className="px-4 py-3 text-center">Status Retur</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {returns.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                          {isLoading ? "Memuat laporan retur..." : "Belum ada barang reject yang di-retur ke supplier."}
                        </td>
                      </tr>
                    ) : (
                      returns.map((ret) => (
                        <tr key={ret.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-rose-700 font-mono">{ret.returnNo}</div>
                            <div className="text-xs text-muted-foreground">{ret.returnDate}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{ret.documentCode}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900 flex items-center gap-1">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              {ret.supplierName}
                            </div>
                            {ret.goodsReceiptNo && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                GRN: {ret.goodsReceiptNo}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{ret.productName}</div>
                            <div className="text-xs font-mono text-muted-foreground">
                              Batch: {ret.batchNo}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-bold text-rose-700 text-base">
                              {ret.returnQuantity.toLocaleString("id-ID", { maximumFractionDigits: 2 })}{" "}
                              {ret.unit}
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="text-xs text-gray-800 line-clamp-2" title={ret.returnReason}>
                              {ret.returnReason}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {ret.courierName ? (
                              <div>
                                <span className="font-medium">{ret.courierName}</span>
                                {ret.vehicleNumber && <div>Nopol: {ret.vehicleNumber}</div>}
                                {ret.driverName && <div>Sopir: {ret.driverName}</div>}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">Belum dijadwalkan kurir</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div>Dibuat: {ret.preparedBy}</div>
                            {ret.approvedBy && <div>ACC: {ret.approvedBy}</div>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {renderReturnStatusBadge(ret.status)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs flex items-center gap-1"
                                onClick={() => openUpdateReturnModal(ret)}
                              >
                                <Truck className="h-3 w-3" />
                                Update Kirim
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: KARTU STOK BRONTOL (REP-013-KSB) ───────────────────────── */}
        <TabsContent value="stockcard">
          <Card className="border shadow-sm">
            <CardContent className="p-6 space-y-4">
              {/* Official Card Header */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-gray-900">
                      CV. MANNA ANUGERAH SEJAHTERA
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      CU 820674 D-11 | 104464OC | FLO-ID 43683 | Sertifikasi: FAIRTRADE / ORGANIC
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-sm font-mono border-gray-400">
                      REP-013-KSB
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Revisi: 00</p>
                  </div>
                </div>
                <div className="text-center mt-3">
                  <h1 className="text-xl font-bold uppercase tracking-wider text-gray-900">
                    KARTU STOK BRONTOL (KSB)
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Pencatatan Masuk & Keluar Material Reject / Oversize Mesh Ayakan
                  </p>
                </div>
              </div>

              {/* Physical Card Table Replica */}
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-muted text-gray-700 font-semibold border-b text-center">
                      <th rowSpan={2} className="border px-2 py-2 w-10">NO</th>
                      <th rowSpan={2} className="border px-3 py-2">KODE BAHAN / BATCH</th>
                      <th colSpan={2} className="border px-2 py-1">KATEGORI</th>
                      <th colSpan={2} className="border px-3 py-1 bg-emerald-50 text-emerald-900">MASUK (REJECT QC)</th>
                      <th colSpan={2} className="border px-3 py-1 bg-rose-50 text-rose-900">KELUAR (RETUR/REPROSES)</th>
                      <th rowSpan={2} className="border px-3 py-2 bg-blue-50 text-blue-900 w-24">SALDO (KG)</th>
                      <th colSpan={2} className="border px-2 py-1">MESIN AYAK</th>
                      <th rowSpan={2} className="border px-3 py-2">OPERATOR</th>
                      <th rowSpan={2} className="border px-3 py-2">DISPOSISI / STATUS</th>
                    </tr>
                    <tr className="bg-muted/80 text-gray-600 border-b text-center">
                      <th className="border px-2 py-1 w-10">BM</th>
                      <th className="border px-2 py-1 w-10">BO</th>
                      <th className="border px-2 py-1 bg-emerald-50">TANGGAL</th>
                      <th className="border px-2 py-1 bg-emerald-50">JML (KG)</th>
                      <th className="border px-2 py-1 bg-rose-50">TANGGAL</th>
                      <th className="border px-2 py-1 bg-rose-50">JML (KG)</th>
                      <th className="border px-2 py-1 w-12">NO</th>
                      <th className="border px-2 py-1 w-12">MESH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockCards.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="text-center py-6 text-muted-foreground italic">
                          Belum ada mutasi kartu stok brontol pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      stockCards.map((sc) => (
                        <tr key={sc.id} className="hover:bg-muted/30 border-b text-center">
                          <td className="border px-2 py-2 font-mono">{sc.rowNo}</td>
                          <td className="border px-3 py-2 font-mono font-medium text-left">
                            {sc.batchNo}
                            <div className="text-[10px] text-gray-400 font-sans">{sc.productName}</div>
                          </td>
                          <td className="border px-2 py-2 font-bold text-emerald-700">
                            {sc.isBM ? "V" : "-"}
                          </td>
                          <td className="border px-2 py-2 font-bold text-orange-700">
                            {sc.isBO ? "V" : "-"}
                          </td>
                          <td className="border px-2 py-2 font-mono">{sc.inDate}</td>
                          <td className="border px-2 py-2 font-bold text-right font-mono text-emerald-700">
                            {sc.inQty.toFixed(2)}
                          </td>
                          <td className="border px-2 py-2 font-mono text-muted-foreground">
                            {sc.outDate || "-"}
                          </td>
                          <td className="border px-2 py-2 font-bold text-right font-mono text-rose-700">
                            {sc.outQty > 0 ? sc.outQty.toFixed(2) : "-"}
                          </td>
                          <td className="border px-3 py-2 font-bold text-right font-mono bg-blue-50/50 text-blue-900 text-sm">
                            {sc.balanceQty.toFixed(2)}
                          </td>
                          <td className="border px-2 py-2">{sc.machineNo || "-"}</td>
                          <td className="border px-2 py-2">{sc.meshSize || "-"}</td>
                          <td className="border px-3 py-2 text-left">{sc.operatorName || "-"}</td>
                          <td className="border px-3 py-2 text-left">
                            <span className="text-xs font-medium text-gray-800">
                              {sc.actionDisposition === "return_to_supplier"
                                ? "Retur ke Supplier"
                                : sc.actionDisposition === "rework"
                                ? "Masak Ulang"
                                : sc.actionDisposition}
                            </span>
                            {sc.returnNo && (
                              <div className="text-[10px] text-rose-600 font-mono">
                                Retur: {sc.returnNo}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Card Footer Notes */}
              <div className="text-xs text-muted-foreground pt-2">
                <p>* BM: Bahan Mentah | BO: Bahan Oven</p>
                <p>* Saldo akhir brontol diakumulasi otomatis dari rangkaian pencatatan flow QC</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL 1: CATAT BRONTOL MANUAL ─────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Catat Laporan Brontol Manual (REP-013-KSB)
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <label className="text-xs font-medium text-gray-700">Tanggal Pemeriksaan *</label>
              <Input
                type="date"
                value={formData.reportDate}
                onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Tahap Flow QC *</label>
              <select
                value={formData.sourceStage}
                onChange={(e) => setFormData({ ...formData, sourceStage: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-md border border-input text-sm bg-background"
              >
                <option value="manual">Lantai Produksi (Manual)</option>
                <option value="incoming_raw_material">Penerimaan Bahan Baku (PBD)</option>
                <option value="incoming_packaging">Penerimaan Bahan Kemas (PBK)</option>
                <option value="sieving">Proses Ayak (MNA)</option>
                <option value="oven">Pengeringan Oven (MNO)</option>
                <option value="metal_detector">Metal Detector (VMD)</option>
                <option value="finished_goods">Produk Jadi (PJD)</option>
                <option value="label_packaging">Label Kemasan (PLK)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-700">Nama Produk / Bahan *</label>
              <Input
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="Contoh: Gula Kelapa Semut Natural"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Nomor Batch *</label>
              <Input
                value={formData.batchNo}
                onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                placeholder="Contoh: 25N67 PB3"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Kategori Bahan</label>
              <select
                value={formData.materialType}
                onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-md border border-input text-sm bg-background"
              >
                <option value="BM">BM - Bahan Mentah</option>
                <option value="BO">BO - Bahan Oven</option>
                <option value="BK">BK - Bahan Kemas</option>
                <option value="FG">FG - Produk Jadi</option>
                <option value="WIP">WIP - Work in Progress</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Jumlah Reject *</label>
              <Input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Satuan</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-md border border-input text-sm bg-background"
              >
                <option value="KG">KG (Kilogram)</option>
                <option value="PCS">PCS (Pieces)</option>
                <option value="SAK">SAK / Karung</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Mesin / Line</label>
              <Input
                value={formData.machineNo || ""}
                onChange={(e) => setFormData({ ...formData, machineNo: e.target.value })}
                placeholder="Contoh: Mesin Ayak 13"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Ukuran Mesh</label>
              <Input
                value={formData.meshSize || ""}
                onChange={(e) => setFormData({ ...formData, meshSize: e.target.value })}
                placeholder="Contoh: 16 atau 18"
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-700">Tindakan Disposisi *</label>
              <select
                value={formData.actionDisposition}
                onChange={(e) => setFormData({ ...formData, actionDisposition: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-md border border-input text-sm bg-background font-medium"
              >
                <option value="return_to_supplier">Retur ke Supplier (Buat Laporan Retur Otomatis)</option>
                <option value="rework">Masak Ulang / Reproses</option>
                <option value="re_oven">Masuk Oven Ulang</option>
                <option value="disposal">Pemusnahan / Afkir</option>
                <option value="hold">Karantina / Hold Evaluasi</option>
              </select>
            </div>

            {formData.actionDisposition === "return_to_supplier" && (
              <div className="col-span-2 bg-rose-50 p-3 rounded-md border border-rose-200">
                <label className="text-xs font-bold text-rose-900">Nama Supplier Tujuan Retur *</label>
                <Input
                  value={formData.supplierName || ""}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="Contoh: Kelompok Tani Mekar Sari"
                  className="mt-1 bg-white"
                />
                <p className="text-[11px] text-rose-700 mt-1">
                  * Sistem akan otomatis menerbitkan nomor Laporan Retur Barang Reject (RET-BRT-...)
                </p>
              </div>
            )}

            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-700">Alasan Reject / Temuan Gagal QC *</label>
              <Textarea
                value={formData.defectReason}
                onChange={(e) => setFormData({ ...formData, defectReason: e.target.value })}
                placeholder="Deskripsikan penyebab kegagalan: kadar air tinggi, butiran gumpal, benda asing, dll."
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Nama Operator Mesin</label>
              <Input
                value={formData.operatorName || ""}
                onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
                placeholder="Contoh: Gama"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Petugas QC</label>
              <Input
                value={formData.qcInspectorName || ""}
                onChange={(e) => setFormData({ ...formData, qcInspectorName: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateBrontol} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Simpan Laporan Brontol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: PROSES RETUR KE SUPPLIER ─────────────────────────────── */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Truck className="h-5 w-5" />
              Proses Retur Barang Reject ke Supplier
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-3 py-2">
              <div className="bg-muted p-2.5 rounded text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">No. Brontol:</span>{" "}
                  <span className="font-mono font-bold">{selectedReport.reportNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Produk & Batch:</span>{" "}
                  <span className="font-semibold">{selectedReport.productName}</span> (Batch: {selectedReport.batchNo})
                </div>
                <div>
                  <span className="text-muted-foreground">Jumlah Reject:</span>{" "}
                  <span className="font-bold text-rose-600">
                    {selectedReport.quantity} {selectedReport.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Tanggal Retur *</label>
                <Input
                  type="date"
                  value={returnFormData.returnDate}
                  onChange={(e) => setReturnFormData({ ...returnFormData, returnDate: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Nama Supplier Tujuan *</label>
                <Input
                  value={returnFormData.supplierName}
                  onChange={(e) => setReturnFormData({ ...returnFormData, supplierName: e.target.value })}
                  placeholder="Contoh: CV. Pemasok Mandiri"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">No. PO Referensi</label>
                  <Input
                    value={returnFormData.poNo || ""}
                    onChange={(e) => setReturnFormData({ ...returnFormData, poNo: e.target.value })}
                    placeholder="PO-202611-001"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">No. Surat Jalan Datang</label>
                  <Input
                    value={returnFormData.deliveryNoteNo || ""}
                    onChange={(e) => setReturnFormData({ ...returnFormData, deliveryNoteNo: e.target.value })}
                    placeholder="SJ-012/SUP"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Alasan Retur *</label>
                <Textarea
                  value={returnFormData.returnReason}
                  onChange={(e) => setReturnFormData({ ...returnFormData, returnReason: e.target.value })}
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Kurir/Ekspedisi</label>
                  <Input
                    value={returnFormData.courierName || ""}
                    onChange={(e) => setReturnFormData({ ...returnFormData, courierName: e.target.value })}
                    placeholder="Armada Supplier"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">No. Polisi</label>
                  <Input
                    value={returnFormData.vehicleNumber || ""}
                    onChange={(e) => setReturnFormData({ ...returnFormData, vehicleNumber: e.target.value })}
                    placeholder="B 1234 CD"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Nama Sopir</label>
                  <Input
                    value={returnFormData.driverName || ""}
                    onChange={(e) => setReturnFormData({ ...returnFormData, driverName: e.target.value })}
                    placeholder="Budi"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleProcessReturn} className="bg-rose-600 hover:bg-rose-700 text-white">
              Terbitkan Laporan Retur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: UPDATE STATUS PENGIRIMAN RETUR ────────────────────────── */}
      <Dialog open={isUpdateReturnOpen} onOpenChange={setIsUpdateReturnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Update Pengiriman Retur Barang
            </DialogTitle>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-3 py-2">
              <div className="bg-muted p-2 rounded text-xs">
                <span className="font-mono font-bold text-rose-700">{selectedReturn.returnNo}</span> -{" "}
                {selectedReturn.supplierName} ({selectedReturn.returnQuantity} {selectedReturn.unit})
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Status Pengiriman *</label>
                <select
                  value={updateReturnData.status}
                  onChange={(e) => setUpdateReturnData({ ...updateReturnData, status: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded-md border border-input text-sm bg-background font-medium"
                >
                  <option value="pending_pickup">Menunggu Pengambilan oleh Supplier</option>
                  <option value="shipped">Sedang Dikirim / Keluar Gudang Pabrik</option>
                  <option value="completed">Selesai / Sudah Diterima oleh Supplier</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Kurir / Ekspedisi</label>
                <Input
                  value={updateReturnData.courierName || ""}
                  onChange={(e) => setUpdateReturnData({ ...updateReturnData, courierName: e.target.value })}
                  placeholder="Nama Kurir / Truk Supplier"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">No. Polisi Kendaraan</label>
                  <Input
                    value={updateReturnData.vehicleNumber || ""}
                    onChange={(e) => setUpdateReturnData({ ...updateReturnData, vehicleNumber: e.target.value })}
                    placeholder="Contoh: AA 9012 BC"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Nama Sopir</label>
                  <Input
                    value={updateReturnData.driverName || ""}
                    onChange={(e) => setUpdateReturnData({ ...updateReturnData, driverName: e.target.value })}
                    placeholder="Contoh: Pak Herman"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Catatan Pengiriman</label>
                <Textarea
                  value={updateReturnData.notes || ""}
                  onChange={(e) => setUpdateReturnData({ ...updateReturnData, notes: e.target.value })}
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateReturnOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateReturn} className="bg-blue-600 hover:bg-blue-700 text-white">
              Perbarui Pengiriman
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: DETAIL & PRINT VIEW ──────────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedReport && (
            <div className="space-y-4 p-2">
              {/* Header printable */}
              <div className="border-b pb-3 text-center">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  CV. MANNA ANUGERAH SEJAHTERA
                </div>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                  LAPORAN BRONTOL & KETIDAKSESUAIAN MUTU (REP-013-KSB)
                </h2>
                <div className="text-xs font-mono text-muted-foreground">
                  Nomor: {selectedReport.reportNo} | Tanggal: {selectedReport.reportDate}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground">Sumber Tahap Flow:</span>
                  <div className="mt-0.5">{renderStageBadge(selectedReport.sourceStage)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">No. Referensi Inspeksi:</span>
                  <div className="font-mono font-semibold text-gray-900 mt-0.5">
                    {selectedReport.sourceInspectionNo || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Nama Produk / Material:</span>
                  <div className="font-semibold text-gray-900">{selectedReport.productName}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Nomor Batch:</span>
                  <div className="font-mono font-bold text-gray-900">{selectedReport.batchNo}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Kategori Bahan:</span>
                  <div className="font-medium text-gray-900">{selectedReport.materialType}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Jumlah Reject / Brontol:</span>
                  <div className="text-base font-bold text-rose-600">
                    {selectedReport.quantity} {selectedReport.unit}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Mesin & Mesh:</span>
                  <div className="text-gray-900 font-medium">
                    {selectedReport.machineNo || "-"} {selectedReport.meshSize ? `(Mesh ${selectedReport.meshSize})` : ""}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <div className="text-gray-900 font-medium">{selectedReport.supplierName || "-"}</div>
                </div>
              </div>

              <div className="border rounded-md p-3 space-y-1">
                <div className="text-xs font-semibold text-gray-700">Alasan Kegagalan / Reject:</div>
                <p className="text-xs text-gray-800 bg-rose-50/50 p-2 rounded border border-rose-100">
                  {selectedReport.defectReason}
                </p>
              </div>

              <div className="border rounded-md p-3 space-y-2">
                <div className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Tindakan Disposisi Mutu:</span>
                  {renderActionBadge(selectedReport.actionDisposition)}
                </div>

                {selectedReport.returnReport && (
                  <div className="mt-2 p-2.5 bg-blue-50/60 rounded border border-blue-200 text-xs space-y-1">
                    <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-blue-700" />
                      Laporan Retur Barang Reject Terkait:
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      <div>
                        <span className="text-muted-foreground">No. Retur:</span>{" "}
                        <span className="font-mono font-bold">{selectedReport.returnReport.returnNo}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status Retur:</span>{" "}
                        {renderReturnStatusBadge(selectedReport.returnReport.status)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Supplier Tujuan:</span>{" "}
                        <span className="font-medium">{selectedReport.returnReport.supplierName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Jumlah Dikembalikan:</span>{" "}
                        <span className="font-bold text-rose-700">
                          {selectedReport.returnReport.returnQuantity} {selectedReport.returnReport.unit}
                        </span>
                      </div>
                      {selectedReport.returnReport.courierName && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Pengiriman:</span>{" "}
                          {selectedReport.returnReport.courierName} (Nopol: {selectedReport.returnReport.vehicleNumber || "-"}, Driver: {selectedReport.returnReport.driverName || "-"})
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t text-center text-xs">
                <div>
                  <p className="text-muted-foreground">Operator Lantai</p>
                  <div className="h-12 flex items-center justify-center font-serif text-sm">
                    {selectedReport.operatorName || "( ... )"}
                  </div>
                  <p className="font-medium">{selectedReport.operatorName || "Operator"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pemeriksa QC</p>
                  <div className="h-12 flex items-center justify-center font-serif text-sm">
                    {selectedReport.qcInspectorName || "( ... )"}
                  </div>
                  <p className="font-medium">{selectedReport.qcInspectorName || "Quality Control"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kepala Produksi / QA</p>
                  <div className="h-12 flex items-center justify-center font-serif text-sm">
                    ( Disetujui )
                  </div>
                  <p className="font-medium">Supervisor QA</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-1">
              <Printer className="h-4 w-4" /> Cetak
            </Button>
            <Button onClick={() => setIsDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
