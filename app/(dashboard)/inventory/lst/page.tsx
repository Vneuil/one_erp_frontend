"use client";

import * as React from "react";
import {
  FileCheck2,
  Plus,
  Download,
  Search,
  CheckCircle,
  Clock,
  ShieldCheck,
  Warehouse,
  Boxes,
  Weight,
  Layers,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  manufacturingApi,
  HandoverReportItem,
  CreateLSTInput,
  CreateLSTItemInput,
} from "@/lib/api/manufacturing";
import { exportLSTExcel } from "@/lib/utils/export-wip-excel";

export default function InventoryLSTPage() {
  const [reports, setReports] = React.useState<HandoverReportItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Dialog state
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  // Form State
  const [fairtradeStatus, setFairtradeStatus] = React.useState<string>("NON FAIRTRADE");
  const [fromDepartment, setFromDepartment] = React.useState<string>("Produksi");
  const [toDepartment, setToDepartment] = React.useState<string>("Gudang");
  const [handoverDate, setHandoverDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [handedOverBy, setHandedOverBy] = React.useState<string>("PIC Produksi");
  const [notes, setNotes] = React.useState<string>("");

  const [items, setItems] = React.useState<CreateLSTItemInput[]>([
    {
      itemNo: 1,
      itemName: "Organic Coconut Sugar 25kg",
      itemCode: "GSO-001",
      batchNo: "BATCH-202611-001",
      unitKg: 1000.0,
      packaging: "Sak Kertas Kraft 25kg",
      buyerName: "Eco Organic BV",
      quantityPcs: 40,
      notes: "Kondisi sak bersih & rapi",
    },
  ]);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await manufacturingApi.listLST({
        batchNo: searchQuery || undefined,
        status: statusFilter || undefined,
      });
      if (res.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat daftar LST:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemNo: prev.length + 1,
        itemName: "Organic Coconut Sugar 25kg",
        itemCode: "",
        batchNo: "",
        unitKg: 25.0,
        packaging: "Sak Kertas Kraft",
        buyerName: "",
        quantityPcs: 1,
        notes: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof CreateLSTItemInput, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: CreateLSTInput = {
        fairtradeStatus,
        fromDepartment,
        toDepartment,
        handoverDate,
        handedOverBy,
        notes,
        items,
      };
      await manufacturingApi.createLST(payload);
      setIsOpen(false);
      await loadData();
    } catch (err) {
      alert("Gagal membuat LST: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyQC = async (id: string) => {
    if (!confirm("Konfirmasi verifikasi mutu QC untuk dokumen serah terima ini?")) return;
    try {
      await manufacturingApi.verifyLSTByQC(id);
      await loadData();
    } catch (err) {
      alert("Gagal verifikasi QC: " + (err as Error).message);
    }
  };

  const handleAcceptWarehouse = async (id: string) => {
    if (!confirm("Konfirmasi penerimaan fisik oleh Gudang? Stok WIP / Barang Jadi akan resmi ditambahkan ke gudang.")) return;
    try {
      await manufacturingApi.acceptLSTByWarehouse(id);
      alert("Barang resmi diterima di Gudang dan dibukukan ke stok WIP/Barang Jadi!");
      await loadData();
    } catch (err) {
      alert("Gagal penerimaan gudang: " + (err as Error).message);
    }
  };

  // Metrics
  const totalWeight = reports.reduce((acc, r) => acc + (r.totalWeightKg || 0), 0);
  const totalPcs = reports.reduce((acc, r) => acc + (r.totalQuantityPcs || 0), 0);
  const pendingQC = reports.filter((r) => r.status === "draft").length;
  const acceptedWarehouse = reports.filter((r) => r.status === "accepted_warehouse").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Serah Terima (LST)"
        description="Formulir resmi GDG-009-LST penyerahan fisik barang dari Produksi kepada Gudang Barang Jadi / WIP"
      >
        <div className="flex gap-2">
          <Button onClick={() => setIsOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Buat LST Manual
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Diterima Gudang (WIP)</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-700">{acceptedWarehouse} <span className="text-sm font-normal">LST</span></h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
              <Warehouse className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Menunggu Verifikasi QC</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-700">{pendingQC} <span className="text-sm font-normal">Dokumen</span></h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-full text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Bobot Diserahterimakan</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-700">{totalWeight.toLocaleString()} <span className="text-sm font-normal">Kg</span></h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
              <Weight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Kemasan Diserahkan</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-700">{totalPcs.toLocaleString()} <span className="text-sm font-normal">Pcs</span></h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-full text-purple-600">
              <Boxes className="h-6 w-6" />
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
                  placeholder="Cari nomor batch atau barang..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="border rounded-md px-3 text-sm bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status Serah Terima</option>
                <option value="draft">Draft (Menunggu QC)</option>
                <option value="verified_qc">Diverifikasi QC</option>
                <option value="accepted_warehouse">Diterima Gudang</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4 text-left">No. LST</th>
                  <th className="py-3 px-4 text-left">Tgl Serah Terima</th>
                  <th className="py-3 px-4 text-left">Dari &rarr; Kepada</th>
                  <th className="py-3 px-4 text-left">Rincian Barang & Batch</th>
                  <th className="py-3 px-4 text-right">Kemasan (Pcs)</th>
                  <th className="py-3 px-4 text-right">Total Berat (Kg)</th>
                  <th className="py-3 px-4 text-center">Status Alur</th>
                  <th className="py-3 px-4 text-center">Tanda Tangan & Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Memuat data LST...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Belum ada Laporan Serah Terima (GDG-009-LST) yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono font-medium text-blue-700">
                        {r.reportNo}
                        {r.lhpReportNo && (
                          <div className="text-xs text-muted-foreground font-sans">
                            Asal: {r.lhpReportNo}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium">{r.handoverDate}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {r.fromDepartment}
                        </span>
                        <span className="mx-1 text-muted-foreground">&rarr;</span>
                        <span className="font-semibold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {r.toDepartment}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {(r.items || []).map((it, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">{it.itemName}</span>{" "}
                            <span className="font-mono text-muted-foreground">({it.batchNo})</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {r.totalQuantityPcs} Pcs
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700">
                        {r.totalWeightKg.toLocaleString()} Kg
                      </td>
                      <td className="py-3 px-4 text-center">
                        {r.status === "accepted_warehouse" ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                            <CheckCircle className="h-3 w-3" /> Diterima Gudang (WIP Masuk)
                          </span>
                        ) : r.status === "verified_qc" ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                            <ShieldCheck className="h-3 w-3" /> Diverifikasi QC
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                            <Clock className="h-3 w-3" /> Menunggu Verifikasi QC
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => exportLSTExcel(r)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Excel
                          </Button>
                          {r.status === "draft" && (
                            <Button
                              size="sm"
                              className="h-8 gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => handleVerifyQC(r.id)}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Verif QC
                            </Button>
                          )}
                          {r.status === "verified_qc" && (
                            <Button
                              size="sm"
                              className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleAcceptWarehouse(r.id)}
                            >
                              <Warehouse className="h-3.5 w-3.5" />
                              Terima Gudang
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

      {/* Dialog Input LST Manual */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-blue-600" />
              Laporan Serah Terima (GDG-009-LST)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/20 p-3 rounded-lg border">
              <div>
                <label className="text-xs font-medium">Status Fairtrade</label>
                <select
                  className="w-full mt-1 border rounded px-3 py-1.5 text-sm bg-background"
                  value={fairtradeStatus}
                  onChange={(e) => setFairtradeStatus(e.target.value)}
                >
                  <option value="NON FAIRTRADE">NON FAIRTRADE</option>
                  <option value="FAIRTRADE">FAIRTRADE</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium">Dari Bagian</label>
                <Input
                  className="mt-1"
                  value={fromDepartment}
                  onChange={(e) => setFromDepartment(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium">Kepada Bagian</label>
                <Input
                  className="mt-1"
                  value={toDepartment}
                  onChange={(e) => setToDepartment(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium">Tanggal Serah Terima</label>
                <Input
                  type="date"
                  className="mt-1"
                  value={handoverDate}
                  onChange={(e) => setHandoverDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium">Diserahkan Oleh (Produksi)</label>
                <Input
                  className="mt-1"
                  value={handedOverBy}
                  onChange={(e) => setHandedOverBy(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium">Catatan Dokumen</label>
                <Input
                  placeholder="Catatan..."
                  className="mt-1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Items */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold">Daftar Barang Diserahterimakan</h4>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-card space-y-3 relative">
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="text-xs font-bold text-muted-foreground">Baris #{idx + 1}</span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs">Nama Barang</label>
                        <Input
                          placeholder="Nama Barang..."
                          value={it.itemName}
                          onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Kode Barang</label>
                        <Input
                          placeholder="Kode Barang..."
                          value={it.itemCode}
                          onChange={(e) => handleItemChange(idx, "itemCode", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Nomor Batch</label>
                        <Input
                          placeholder="Nomor Batch..."
                          value={it.batchNo}
                          onChange={(e) => handleItemChange(idx, "batchNo", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Buyer</label>
                        <Input
                          placeholder="Nama Buyer..."
                          value={it.buyerName}
                          onChange={(e) => handleItemChange(idx, "buyerName", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs">Kemasan</label>
                        <Input
                          placeholder="Sak Kertas Kraft 25kg..."
                          value={it.packaging}
                          onChange={(e) => handleItemChange(idx, "packaging", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Unit Total (Kg)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={it.unitKg}
                          onChange={(e) => handleItemChange(idx, "unitKg", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs">Jumlah (Pcs)</label>
                        <Input
                          type="number"
                          value={it.quantityPcs}
                          onChange={(e) => handleItemChange(idx, "quantityPcs", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting ? "Menyimpan..." : "Simpan LST (GDG-009-LST)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
