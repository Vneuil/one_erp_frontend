"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Printer,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Layers,
  Trash2,
  Send,
  Droplets,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { errText, useReport } from "@/components/reports/report-ui";
import {
  manufacturingApi,
  MaterialRequisitionItem,
  CreateRequisitionInput,
  RequisitionType,
  MaterialRequisitionLineItem,
  LiquidSugarDispensingItem,
} from "@/lib/api/manufacturing";
import { productsApi, ProductItem } from "@/lib/api/products";

const selectCls = "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

export default function RequisitionsPage() {
  const [reload, setReload] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<RequisitionType>("raw_material");

  // Load products for dropdown
  const { data: rawProducts } = useReport<ProductItem[]>("products-catalog-cached", () =>
    productsApi.list({ perPage: 100 }).then((r) => r.data || [])
  );
  const products: ProductItem[] = rawProducts ?? [];

  // Load requisitions
  const { data: rawList, loading, error } = useReport(
    `mfg-reqs|${reload}|${activeTab}`,
    () => manufacturingApi.listRequisitions({ type: activeTab }).then((r) => r.data || [])
  );
  const requisitions: MaterialRequisitionItem[] = rawList ?? [];

  // Print state
  const [printDoc, setPrintDoc] = React.useState<MaterialRequisitionItem | null>(null);

  // New Dialog State
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<CreateRequisitionInput>({
    requisitionType: "raw_material",
    requestDate: new Date().toISOString().slice(0, 10),
    department: "Produksi Gula Semut",
    requestedBy: "Mas Abel (Produksi)",
    orderNumber: "",
    notes: "",
    lines: [],
    dispensingItems: [],
  });

  const handleOpenDialog = () => {
    setFormData({
      requisitionType: activeTab,
      requestDate: new Date().toISOString().slice(0, 10),
      department:
        activeTab === "liquid_sugar"
          ? "Produksi Gula Cair"
          : activeTab === "packaging"
          ? "Ruang Packing"
          : "Produksi Gula Semut",
      requestedBy: "Mas Abel (Produksi)",
      orderNumber: "",
      notes: "",
      lines:
        activeTab === "liquid_sugar"
          ? []
          : [
              {
                productId: products[0]?.id || "",
                productName: products[0]?.name || "Bahan Utama",
                batchNo: "26N48PW",
                quantityRequested: 1000,
                quantityIssued: 1000,
                quantityUsed: 990,
                quantityReject: 0,
                quantityReturned: 10,
                uom: activeTab === "packaging" ? "PCS" : "KG",
              },
            ],
      dispensingItems:
        activeTab === "liquid_sugar"
          ? [
              {
                jerryCanNo: 1,
                grossWeight: 28.5,
                tareWeight: 1.2,
                netWeight: 27.3,
                brix: 76.5,
                aromaColor: "Kuning kecoklatan, aroma khas kelapa",
              },
              {
                jerryCanNo: 2,
                grossWeight: 28.6,
                tareWeight: 1.2,
                netWeight: 27.4,
                brix: 76.8,
                aromaColor: "Kuning kecoklatan, aroma khas kelapa",
              },
            ]
          : [],
    });
    setFormError(null);
    setIsOpen(true);
  };

  const addLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...(prev.lines || []),
        {
          productId: products[0]?.id || "",
          productName: products[0]?.name || "Bahan Baku",
          batchNo: "26N48PW",
          quantityRequested: 100,
          quantityIssued: 100,
          quantityUsed: 100,
          quantityReject: 0,
          quantityReturned: 0,
          uom: activeTab === "packaging" ? "PCS" : "KG",
        },
      ],
    }));
  };

  const removeLine = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      lines: (prev.lines || []).filter((_, i) => i !== idx),
    }));
  };

  const addJerryCan = () => {
    setFormData((prev) => {
      const items = prev.dispensingItems || [];
      const nextNo = items.length + 1;
      return {
        ...prev,
        dispensingItems: [
          ...items,
          {
            jerryCanNo: nextNo,
            grossWeight: 28.5,
            tareWeight: 1.2,
            netWeight: 27.3,
            brix: 76.5,
            aromaColor: "Normal",
          },
        ],
      };
    });
  };

  const removeJerryCan = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      dispensingItems: (prev.dispensingItems || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      await manufacturingApi.createRequisition(formData);
      setIsOpen(false);
      setReload((v) => v + 1);
    } catch (err) {
      setFormError(errText(err, "Gagal membuat dokumen permintaan bahan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await manufacturingApi.updateRequisitionStatus(id, {
        status,
        issuedBy: "Mas Abel (Staf Gudang)",
      });
      setReload((v) => v + 1);
    } catch (err) {
      alert(errText(err, "Gagal memperbarui status permintaan"));
    }
  };

  const triggerPrint = (item: MaterialRequisitionItem) => {
    setPrintDoc(item);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const columns: Column<MaterialRequisitionItem>[] = [
    {
      key: "requestNo",
      header: "No. Bon & Tanggal",
      render: (r: MaterialRequisitionItem) => (
        <div>
          <div className="font-mono font-bold text-foreground text-xs">{r.requestNo}</div>
          <div className="text-[11px] text-muted-foreground">{r.requestDate}</div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Departemen / Bagian",
      render: (r: MaterialRequisitionItem) => (
        <div>
          <div className="font-semibold text-foreground text-xs">{r.department}</div>
          <div className="text-[11px] text-muted-foreground">Peminta: {r.requestedBy}</div>
        </div>
      ),
    },
    {
      key: "summary",
      header: "Ringkasan Barang Diminta",
      render: (r: MaterialRequisitionItem) => {
        if (r.requisitionType === "liquid_sugar" && r.dispensingItems) {
          const totalNet = r.dispensingItems.reduce((acc: number, c: LiquidSugarDispensingItem) => acc + c.netWeight, 0);
          return (
            <div className="text-xs">
              <span className="font-semibold text-foreground">
                {r.dispensingItems.length} Jerigen Gula Cair
              </span>
              <div className="text-[11px] text-emerald-700 font-medium">
                Total Netto Olah: {totalNet.toLocaleString("id-ID")} KG
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-1">
            {r.lines?.slice(0, 2).map((l: MaterialRequisitionLineItem, i: number) => (
              <div key={i} className="text-xs flex items-center justify-between gap-2">
                <span className="text-foreground font-medium">{l.productName}</span>
                <span className="font-mono text-muted-foreground">
                  {l.quantityRequested.toLocaleString("id-ID")} {l.uom}
                </span>
              </div>
            ))}
            {(r.lines?.length || 0) > 2 && (
              <div className="text-[10px] text-muted-foreground italic">
                +{(r.lines?.length || 0) - 2} item lainnya...
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r: MaterialRequisitionItem) => {
        if (r.status === "completed") {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Selesai Digunakan
            </span>
          );
        }
        if (r.status === "issued") {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Sudah Diserahkan Gudang
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Menunggu Gudang
          </span>
        );
      },
    },
    {
      key: "action",
      header: "Aksi",
      align: "right",
      render: (r: MaterialRequisitionItem) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.status === "submitted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus(r.id, "issued")}
              className="h-7 text-[11px] gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Send className="w-3 h-3" />
              Serahkan
            </Button>
          )}
          {r.status === "issued" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus(r.id, "completed")}
              className="h-7 text-[11px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCircle2 className="w-3 h-3" />
              Selesai
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => triggerPrint(r)}
            className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Screen Header */}
      <div className="print:hidden">
        <PageHeader
          title="Permintaan Bahan (Requisitions)"
          description="Penerbitan dokumen serah-terima bahan baku (BPB GDG-011), barang kemas (PBPK GDG-012), dan dispensing gula cair (LPC GDG-008)."
        >
          <Button size="sm" onClick={handleOpenDialog} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" />
            Buat Permintaan Baru
          </Button>
        </PageHeader>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("raw_material")}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "raw_material"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
          BPB: Bahan Baku (GDG-011-BPB)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("packaging")}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "packaging"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Boxes className="w-4 h-4" />
          PBPK: Barang Kemas (GDG-012-BPK)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("liquid_sugar")}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "liquid_sugar"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Droplets className="w-4 h-4" />
          LPC: Gula Cair Dispensing (GDG-008-LPC)
        </button>
      </div>

      {/* Table in Screen Mode */}
      <div className="print:hidden">
        <DataTable
          columns={columns}
          data={requisitions}
          isLoading={loading}

        />
      </div>

      {/* Printable Views for BPB, PBPK, LPC */}
      {printDoc && (
        <div className="hidden print:block font-serif text-black p-4 text-xs">
          <div className="border-b-2 border-black pb-2 mb-3 text-center">
            <h1 className="text-lg font-bold tracking-wider uppercase">CV. MANNA / PT MANNA JAYA MAKMUR</h1>
            <p className="text-[11px] text-gray-700">Kulon Progo, D.I. Yogyakarta — Standar Dokumen Pergudangan & Produksi</p>
            <div className="mt-2 inline-block border border-black px-4 py-1 font-bold text-sm bg-gray-100">
              {printDoc.requisitionType === "raw_material" && "BON PERMINTAAN BAHAN BAKU (BPB)"}
              {printDoc.requisitionType === "packaging" && "BON PERMINTAAN BARANG KEMAS (PBPK)"}
              {printDoc.requisitionType === "liquid_sugar" && "LAPORAN PERMINTAAN BAHAN BAKU GULA CAIR (LPC)"}
            </div>
            <div className="text-right text-[10px] mt-1 font-sans">
              No. Form:{" "}
              {printDoc.requisitionType === "raw_material" && "GDG-011-BPB"}
              {printDoc.requisitionType === "packaging" && "GDG-012-BPK"}
              {printDoc.requisitionType === "liquid_sugar" && "GDG-008-LPC"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3 text-[11px]">
            <div>
              <div><strong>Nomor Dokumen:</strong> {printDoc.requestNo}</div>
              <div><strong>Tanggal:</strong> {printDoc.requestDate}</div>
              <div><strong>Bagian / Lini:</strong> {printDoc.department}</div>
            </div>
            <div className="text-right">
              <div><strong>Status:</strong> {printDoc.status.toUpperCase()}</div>
              <div><strong>No. SPK / Order:</strong> {printDoc.orderNumber || "REGULER"}</div>
              <div><strong>Pemohon:</strong> {printDoc.requestedBy}</div>
            </div>
          </div>

          {/* Table for BPB (Bahan Baku) */}
          {printDoc.requisitionType === "raw_material" && (
            <table className="w-full border-collapse border border-black text-[10px] mb-4">
              <thead>
                <tr className="bg-gray-200 text-center">
                  <th className="border border-black p-1.5 w-8">No</th>
                  <th className="border border-black p-1.5 text-left">Nama Bahan Baku</th>
                  <th className="border border-black p-1.5 w-24">No. Batch / Lot</th>
                  <th className="border border-black p-1.5 w-20">Diminta</th>
                  <th className="border border-black p-1.5 w-20">Diberikan</th>
                  <th className="border border-black p-1.5 w-16">Satuan</th>
                  <th className="border border-black p-1.5">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {printDoc.lines?.map((l, i) => (
                  <tr key={i} className="text-center">
                    <td className="border border-black p-1">{i + 1}</td>
                    <td className="border border-black p-1 text-left font-semibold">{l.productName}</td>
                    <td className="border border-black p-1 font-mono">{l.batchNo || "-"}</td>
                    <td className="border border-black p-1">{l.quantityRequested.toLocaleString("id-ID")}</td>
                    <td className="border border-black p-1 font-bold">{l.quantityIssued.toLocaleString("id-ID")}</td>
                    <td className="border border-black p-1">{l.uom}</td>
                    <td className="border border-black p-1 text-left">{l.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Table for PBPK (Barang Kemas with breakdown) */}
          {printDoc.requisitionType === "packaging" && (
            <table className="w-full border-collapse border border-black text-[10px] mb-4">
              <thead>
                <tr className="bg-gray-200 text-center">
                  <th className="border border-black p-1.5 w-8" rowSpan={2}>No</th>
                  <th className="border border-black p-1.5 text-left" rowSpan={2}>Jenis Barang Kemas</th>
                  <th className="border border-black p-1.5 w-16" rowSpan={2}>Satuan</th>
                  <th className="border border-black p-1" colSpan={2}>Serah Terima Gudang</th>
                  <th className="border border-black p-1" colSpan={3}>Realisasi Pemakaian Produksi</th>
                </tr>
                <tr className="bg-gray-100 text-center text-[9px]">
                  <th className="border border-black p-1 w-16">Diminta</th>
                  <th className="border border-black p-1 w-16">Diberikan</th>
                  <th className="border border-black p-1 w-16">Terpakai</th>
                  <th className="border border-black p-1 w-16 text-red-700">Reject/Rusak</th>
                  <th className="border border-black p-1 w-16 text-blue-700">Sisa Kembali</th>
                </tr>
              </thead>
              <tbody>
                {printDoc.lines?.map((l, i) => (
                  <tr key={i} className="text-center">
                    <td className="border border-black p-1">{i + 1}</td>
                    <td className="border border-black p-1 text-left font-semibold">{l.productName}</td>
                    <td className="border border-black p-1">{l.uom}</td>
                    <td className="border border-black p-1">{l.quantityRequested.toLocaleString("id-ID")}</td>
                    <td className="border border-black p-1 font-bold">{l.quantityIssued.toLocaleString("id-ID")}</td>
                    <td className="border border-black p-1 font-bold text-emerald-800">{l.quantityUsed.toLocaleString("id-ID")}</td>
                    <td className="border border-black p-1 text-red-700">{l.quantityReject.toLocaleString("id-ID")}</td>
                    <td className="border border-black p-1 text-blue-700 font-semibold">{l.quantityReturned.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Table for LPC (Dispensing Gula Cair) */}
          {printDoc.requisitionType === "liquid_sugar" && (
            <table className="w-full border-collapse border border-black text-[10px] mb-4">
              <thead>
                <tr className="bg-gray-200 text-center">
                  <th className="border border-black p-1.5 w-8">No</th>
                  <th className="border border-black p-1.5 w-16">No. Jerigen</th>
                  <th className="border border-black p-1.5 w-24">Berat Kotor (Gross KG)</th>
                  <th className="border border-black p-1.5 w-24">Berat Jerigen Kosong (Tare KG)</th>
                  <th className="border border-black p-1.5 w-24 bg-gray-300">Netto Bahan Olah (KG)</th>
                  <th className="border border-black p-1.5 w-20">Kadar Brix (°Bx)</th>
                  <th className="border border-black p-1.5">Aroma & Warna</th>
                </tr>
              </thead>
              <tbody>
                {printDoc.dispensingItems?.map((d, i) => (
                  <tr key={i} className="text-center">
                    <td className="border border-black p-1">{i + 1}</td>
                    <td className="border border-black p-1 font-bold">Jerigen #{d.jerryCanNo}</td>
                    <td className="border border-black p-1">{d.grossWeight.toFixed(2)}</td>
                    <td className="border border-black p-1">{d.tareWeight.toFixed(2)}</td>
                    <td className="border border-black p-1 font-bold bg-gray-50">{d.netWeight.toFixed(2)}</td>
                    <td className="border border-black p-1 font-mono">{d.brix ? `${d.brix}°Bx` : "-"}</td>
                    <td className="border border-black p-1 text-left">{d.aromaColor || "Normal"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200 font-bold text-center">
                  <td className="border border-black p-1" colSpan={4}>TOTAL NETTO BAHAN OLAH DISPENSING</td>
                  <td className="border border-black p-1 bg-yellow-100">
                    {printDoc.dispensingItems?.reduce((a, b) => a + b.netWeight, 0).toFixed(2)} KG
                  </td>
                  <td className="border border-black p-1" colSpan={2}>
                    Total {printDoc.dispensingItems?.length || 0} Jerigen
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 2-ply Signoffs: Yang Meminta (Produksi) & Yang Menyerahkan (Gudang) */}
          <div className="grid grid-cols-2 mt-8 pt-4 text-center text-xs">
            <div>
              <p>Yang Meminta (Produksi):</p>
              <div className="h-16 flex items-end justify-center font-bold underline">
                ( {printDoc.requestedBy} )
              </div>
              <p className="text-[10px] text-gray-600">Bagian Pengolahan / Packing</p>
            </div>
            <div>
              <p>Yang Menyerahkan (Gudang):</p>
              <div className="h-16 flex items-end justify-center font-bold underline">
                ( {printDoc.issuedBy || "Mas Abel (Staf Gudang)"} )
              </div>
              <p className="text-[10px] text-gray-600">Kepala Gudang Bahan</p>
            </div>
          </div>
        </div>
      )}

      {/* New Requisition Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-emerald-600" />
              Buat Permintaan{" "}
              {activeTab === "raw_material" && "Bahan Baku (BPB)"}
              {activeTab === "packaging" && "Barang Kemas (PBPK)"}
              {activeTab === "liquid_sugar" && "Gula Cair Dispensing (LPC)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Tanggal Permintaan</label>
                <Input
                  type="date"
                  value={formData.requestDate}
                  onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Departemen / Lini</label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Nama Pemohon (Produksi)</label>
                <Input
                  value={formData.requestedBy}
                  onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">No. SPK / Order (Opsional)</label>
                <Input
                  placeholder="Misal: MO-202611-001"
                  value={formData.orderNumber || ""}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* If NOT liquid sugar: Lines Table */}
            {activeTab !== "liquid_sugar" && (
              <div className="border border-border rounded-lg p-3 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Daftar Barang Diminta</span>
                  <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-7 text-xs gap-1">
                    <Plus className="w-3.5 h-3.5" /> Tambah Item
                  </Button>
                </div>

                {formData.lines?.map((line, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border bg-card space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={line.productId}
                        onChange={(e) => {
                          const p = products.find((prod) => prod.id === e.target.value);
                          const updated = [...(formData.lines || [])];
                          updated[idx] = {
                            ...updated[idx],
                            productId: e.target.value,
                            productName: p ? p.name : updated[idx].productName,
                          };
                          setFormData({ ...formData, lines: updated });
                        }}
                        className={`flex-1 ${selectCls}`}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(idx)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Batch/Lot</label>
                        <Input
                          value={line.batchNo || ""}
                          onChange={(e) => {
                            const updated = [...(formData.lines || [])];
                            updated[idx].batchNo = e.target.value;
                            setFormData({ ...formData, lines: updated });
                          }}
                          className="h-8 text-xs font-mono"
                          placeholder="26N48PW"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Diminta</label>
                        <Input
                          type="number"
                          value={line.quantityRequested}
                          onChange={(e) => {
                            const updated = [...(formData.lines || [])];
                            updated[idx].quantityRequested = Number(e.target.value);
                            setFormData({ ...formData, lines: updated });
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Diberikan</label>
                        <Input
                          type="number"
                          value={line.quantityIssued}
                          onChange={(e) => {
                            const updated = [...(formData.lines || [])];
                            updated[idx].quantityIssued = Number(e.target.value);
                            setFormData({ ...formData, lines: updated });
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Satuan</label>
                        <Input
                          value={line.uom}
                          onChange={(e) => {
                            const updated = [...(formData.lines || [])];
                            updated[idx].uom = e.target.value;
                            setFormData({ ...formData, lines: updated });
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {activeTab === "packaging" && (
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
                        <div>
                          <label className="text-[10px] text-emerald-700 font-medium">Terpakai</label>
                          <Input
                            type="number"
                            value={line.quantityUsed}
                            onChange={(e) => {
                              const updated = [...(formData.lines || [])];
                              updated[idx].quantityUsed = Number(e.target.value);
                              setFormData({ ...formData, lines: updated });
                            }}
                            className="h-7 text-xs bg-emerald-50/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-red-700 font-medium">Reject/Rusak</label>
                          <Input
                            type="number"
                            value={line.quantityReject}
                            onChange={(e) => {
                              const updated = [...(formData.lines || [])];
                              updated[idx].quantityReject = Number(e.target.value);
                              setFormData({ ...formData, lines: updated });
                            }}
                            className="h-7 text-xs bg-red-50/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-blue-700 font-medium">Sisa Kembali</label>
                          <Input
                            type="number"
                            value={line.quantityReturned}
                            onChange={(e) => {
                              const updated = [...(formData.lines || [])];
                              updated[idx].quantityReturned = Number(e.target.value);
                              setFormData({ ...formData, lines: updated });
                            }}
                            className="h-7 text-xs bg-blue-50/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* If liquid sugar: Jerigen Dispensing Builder */}
            {activeTab === "liquid_sugar" && (
              <div className="border border-border rounded-lg p-3 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Penimbangan Per Jerigen (Gross - Tare = Netto)
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={addJerryCan} className="h-7 text-xs gap-1">
                    <Plus className="w-3.5 h-3.5" /> Tambah Jerigen
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.dispensingItems?.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-border bg-card grid grid-cols-6 gap-2 items-center text-xs">
                      <div>
                        <span className="font-bold text-foreground">#{item.jerryCanNo}</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Kotor (Gross kg)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.grossWeight}
                          onChange={(e) => {
                            const updated = [...(formData.dispensingItems || [])];
                            const gross = Number(e.target.value);
                            updated[idx].grossWeight = gross;
                            updated[idx].netWeight = Math.max(0, gross - updated[idx].tareWeight);
                            setFormData({ ...formData, dispensingItems: updated });
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Tare Jerigen (kg)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.tareWeight}
                          onChange={(e) => {
                            const updated = [...(formData.dispensingItems || [])];
                            const tare = Number(e.target.value);
                            updated[idx].tareWeight = tare;
                            updated[idx].netWeight = Math.max(0, updated[idx].grossWeight - tare);
                            setFormData({ ...formData, dispensingItems: updated });
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-700 font-bold">Netto Olah (kg)</label>
                        <div className="h-7 px-2 flex items-center font-bold text-xs bg-emerald-50 border border-emerald-200 rounded">
                          {item.netWeight.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Brix (°Bx)</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={item.brix || ""}
                          onChange={(e) => {
                            const updated = [...(formData.dispensingItems || [])];
                            updated[idx].brix = Number(e.target.value);
                            setFormData({ ...formData, dispensingItems: updated });
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeJerryCan(idx)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-xs flex justify-between font-bold text-emerald-900">
                  <span>Total Netto Olah:</span>
                  <span>
                    {(formData.dispensingItems || []).reduce((a, b) => a + b.netWeight, 0).toFixed(2)} KG (
                    {formData.dispensingItems?.length || 0} Jerigen)
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground">Catatan Tambahan</label>
              <Input
                placeholder="Catatan..."
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? "Menyimpan..." : "Kirim Permintaan ke Gudang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
