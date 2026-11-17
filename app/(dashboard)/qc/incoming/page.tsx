"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  ClipboardCheck,
  Plus,
  Printer,
  Calendar,
  Box,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Edit2,
  Eye,
  Info,
  Droplets,
  Flame,
  Scale,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { errText, useReport } from "@/components/reports/report-ui";
import {
  qcApi,
  IncomingCheckItem,
  CreateIncomingCheckInput,
  UpdateIncomingCheckInput,
} from "@/lib/api/qc";

const selectCls =
  "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

export default function IncomingRawMaterialPage() {
  const searchParams = useSearchParams();
  const initialLbmNo = searchParams.get("lbmNo") || "";
  const initialGrId = searchParams.get("goodsReceiptId") || "";

  const [reload, setReload] = React.useState(0);
  const [filterDate, setFilterDate] = React.useState("");
  const [filterLbm, setFilterLbm] = React.useState(initialLbmNo);
  const [searchKeyword, setSearchKeyword] = React.useState("");

  const { data: rawChecks, loading, error } = useReport(
    `qc-incoming|${reload}|${filterDate}|${filterLbm}`,
    () =>
      qcApi
        .listIncomingChecks({
          date: filterDate || undefined,
          lbmNo: filterLbm || undefined,
        })
        .then((r) => r.data || [])
  );
  const checks: IncomingCheckItem[] = rawChecks ?? [];

  // Filter in memory for search
  const filteredChecks = React.useMemo(() => {
    if (!searchKeyword.trim()) return checks;
    const q = searchKeyword.toLowerCase();
    return checks.filter(
      (c) =>
        c.supplierName.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        (c.batchNo && c.batchNo.toLowerCase().includes(q)) ||
        (c.lbmNo && c.lbmNo.toLowerCase().includes(q)) ||
        (c.deliveryNoteNo && c.deliveryNoteNo.toLowerCase().includes(q))
    );
  }, [checks, searchKeyword]);

  // Statistics
  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.overallStatus === "passed").length;
  const conditionalChecks = checks.filter((c) => c.overallStatus === "conditional").length;
  const rejectedChecks = checks.filter((c) => c.overallStatus === "rejected").length;

  // Dialog State (Create / Edit)
  const [isOpen, setIsOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<IncomingCheckItem | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Detail View Modal
  const [viewItem, setViewItem] = React.useState<IncomingCheckItem | null>(null);

  // Form State
  const [formData, setFormData] = React.useState<CreateIncomingCheckInput>({
    goodsReceiptId: initialGrId || undefined,
    lbmNo: initialLbmNo,
    checkDate: new Date().toISOString().slice(0, 10),
    checkMonth: new Date().toISOString().slice(0, 7),
    supplierName: "",
    deliveryNoteNo: "",
    poNo: "",
    productName: "Gula Kelapa Semut Mentah",
    batchNo: `RAW-${new Date().toISOString().slice(2, 4)}${new Date().toISOString().slice(5, 7)}-01`,
    totalBags: 200,
    sampleBags: 10,
    grossWeight: 5000,
    netWeight: 4940,
    acceptedWeight: 4940,
    rejectedWeight: 0,
    sugarCondition: "Kering, Bersih, Sesuai Standar",
    colorAppearance: "Coklat Keemasan Cerah",
    aromaFlavor: "Khas Gula Kelapa Segar, Tidak Sangit",
    foreignMatterClean: true,
    packagingCondition: "Sak Karung Utuh & Bersih, Lapisan Inner Rapat",
    moistureContent: 1.8,
    brixValue: undefined,
    meshSize: "Mesh 16 - 18",
    recommendedAction: "Lolos Standar - Dapat Langsung ke Ayak Matang / Produksi (Kadar Air <= 2.0%)",
    qcName: "Adin (QC Inspector)",
    qaName: "Mario (QA Spv)",
    notes: "",
  });

  const handleOpenCreate = () => {
    setEditTarget(null);
    setFormData({
      goodsReceiptId: initialGrId || undefined,
      lbmNo: filterLbm || "",
      checkDate: new Date().toISOString().slice(0, 10),
      checkMonth: new Date().toISOString().slice(0, 7),
      supplierName: "",
      deliveryNoteNo: "",
      poNo: "",
      productName: "Gula Kelapa Semut Mentah",
      batchNo: `RAW-${new Date().toISOString().slice(2, 4)}${new Date().toISOString().slice(5, 7)}-01`,
      totalBags: 200,
      sampleBags: 10,
      grossWeight: 5000,
      netWeight: 4940,
      acceptedWeight: 4940,
      rejectedWeight: 0,
      sugarCondition: "Kering, Bersih, Sesuai Standar",
      colorAppearance: "Coklat Keemasan Cerah",
      aromaFlavor: "Khas Gula Kelapa Segar, Tidak Sangit",
      foreignMatterClean: true,
      packagingCondition: "Sak Karung Utuh & Bersih, Lapisan Inner Rapat",
      moistureContent: 1.8,
      brixValue: undefined,
      meshSize: "Mesh 16 - 18",
      recommendedAction: "Lolos Standar - Dapat Langsung ke Ayak Matang / Produksi (Kadar Air <= 2.0%)",
      qcName: "Adin (QC Inspector)",
      qaName: "Mario (QA Spv)",
      notes: "",
    });
    setFormError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (item: IncomingCheckItem) => {
    setEditTarget(item);
    setFormData({
      goodsReceiptId: item.goodsReceiptId,
      lbmNo: item.lbmNo || "",
      checkDate: item.checkDate,
      checkMonth: item.checkMonth,
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      deliveryNoteNo: item.deliveryNoteNo || "",
      poNo: item.poNo || "",
      productName: item.productName,
      batchNo: item.batchNo || "",
      totalBags: item.totalBags,
      sampleBags: item.sampleBags,
      grossWeight: item.grossWeight,
      netWeight: item.netWeight,
      acceptedWeight: item.acceptedWeight,
      rejectedWeight: item.rejectedWeight,
      sugarCondition: item.sugarCondition,
      colorAppearance: item.colorAppearance || "",
      aromaFlavor: item.aromaFlavor || "",
      foreignMatterClean: item.foreignMatterClean,
      packagingCondition: item.packagingCondition || "",
      moistureContent: item.moistureContent,
      brixValue: item.brixValue,
      meshSize: item.meshSize || "",
      recommendedAction: item.recommendedAction || "",
      qcName: item.qcName || "",
      qaName: item.qaName || "",
      notes: item.notes || "",
    });
    setFormError(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierName.trim()) {
      setFormError("Nama supplier wajib diisi");
      return;
    }
    if (!formData.productName.trim()) {
      setFormError("Nama komoditas bahan baku wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editTarget) {
        await qcApi.updateIncomingCheck(editTarget.id, formData);
      } else {
        await qcApi.createIncomingCheck(formData);
      }
      setIsOpen(false);
      setReload((p) => p + 1);
    } catch (err: unknown) {
      setFormError(errText(err, "Gagal menyimpan data pemeriksaan bahan datang"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan pemeriksaan bahan datang ini?")) return;
    try {
      await qcApi.deleteIncomingCheck(id);
      setReload((p) => p + 1);
    } catch (err: unknown) {
      alert(errText(err, "Gagal menghapus data"));
    }
  };

  // Cetak Dokumen Resmi QC-001-PBD. 02
  const handlePrintDocument = (item?: IncomingCheckItem) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan popup browser.");
      return;
    }

    const itemsToPrint = item ? [item] : filteredChecks;

    const rowsHtml = itemsToPrint
      .map(
        (c, idx) => `
        <tr>
          <td style="text-align: center; border: 1px solid #333; padding: 4px;">${idx + 1}</td>
          <td style="text-align: center; border: 1px solid #333; padding: 4px;">${c.checkDate}</td>
          <td style="border: 1px solid #333; padding: 4px;"><strong>${c.lbmNo || "-"}</strong></td>
          <td style="border: 1px solid #333; padding: 4px;">${c.supplierName}</td>
          <td style="border: 1px solid #333; padding: 4px;"><strong>${c.productName}</strong><br/><small style="font-family: monospace;">${c.batchNo || "-"}</small></td>
          <td style="text-align: right; border: 1px solid #333; padding: 4px; font-weight: bold;">${c.netWeight.toLocaleString("id-ID")} kg<br/><small>${c.totalBags} sak</small></td>
          <td style="text-align: center; border: 1px solid #333; padding: 4px; font-weight: bold; color: ${c.moistureContent && c.moistureContent > 2.0 ? "#b45309" : "#15803d"};">
            ${c.moistureContent !== undefined && c.moistureContent !== null ? `${c.moistureContent.toFixed(2)} %` : "-"}
          </td>
          <td style="border: 1px solid #333; padding: 4px; font-size: 8pt;">${c.sugarCondition}</td>
          <td style="border: 1px solid #333; padding: 4px; font-size: 8pt;">${c.colorAppearance || "-"}</td>
          <td style="text-align: center; border: 1px solid #333; padding: 4px;">
            ${c.foreignMatterClean ? '<span style="color: #15803d; font-weight: bold;">✓ Bebas Benda Asing</span>' : '<span style="color: #b91c1c; font-weight: bold;">✗ Ada Kontaminan</span>'}
          </td>
          <td style="border: 1px solid #333; padding: 4px; font-size: 8pt; font-weight: 600;">${c.recommendedAction || "-"}</td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Form QC-001-PBD. 02 - Pemeriksaan Bahan Datang</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 8.5pt; color: #000; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .company { font-weight: bold; font-size: 13pt; text-transform: uppercase; }
          .title { text-align: center; font-size: 11pt; font-weight: bold; margin: 8px 0; }
          .meta { display: flex; gap: 30px; margin-bottom: 10px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 8pt; }
          th { border: 1px solid #000; background-color: #f1f5f9; padding: 5px; font-size: 7.5pt; text-align: center; }
          .notes-box { font-size: 7.5pt; border: 1px solid #666; padding: 8px; background: #fafafa; margin-bottom: 16px; border-radius: 4px; }
          .signatures { display: flex; justify-content: flex-end; gap: 60px; margin-top: 15px; }
          .sig-box { width: 160px; text-align: center; }
          .sig-line { margin-top: 45px; border-bottom: 1px solid #000; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">CV. Manna Anugerah Sejahtera</div>
            <div style="font-size: 8pt; color: #444;">Food Safety & Quality Control System</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 9pt;">form-QC-001-PBD. 02</div>
            <div style="font-size: 7.5pt;">(Pemeriksaan Bahan Datang)</div>
          </div>
        </div>

        <div class="title">PEMERIKSAAN KUALITAS BAHAN DATANG (PBD)</div>

        <div class="meta">
          <div>Tanggal / Periode: <u>${filterDate || "Semua"}</u></div>
          <div>Ref. LBM: <u>${filterLbm || "Semua"}</u></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px;">No</th>
              <th style="width: 65px;">Tanggal</th>
              <th style="width: 80px;">No. LBM</th>
              <th style="width: 120px;">Supplier</th>
              <th>Bahan / No. Lot</th>
              <th style="width: 85px;">Kuantitas Netto</th>
              <th style="width: 70px;">Kadar Air (%)</th>
              <th style="width: 110px;">Kondisi Fisik</th>
              <th style="width: 90px;">Kenampakan / Warna</th>
              <th style="width: 90px;">Uji Benda Asing</th>
              <th>Rekomendasi Alur Produksi</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="11" style="text-align: center; padding: 10px;">Tidak ada data pemeriksaan bahan datang.</td></tr>`}
          </tbody>
        </table>

        <div class="notes-box">
          <strong>Kriteria Mutu & Aturan Alur Produksi (BRL-01):</strong><br/>
          &bull; <strong>Kadar Air &le; 2.0%:</strong> Bahan kering prima, direkomendasikan langsung masuk tahap <strong>Line 3 (Ayak Matang)</strong> tanpa melalui oven.<br/>
          &bull; <strong>Kadar Air &gt; 2.0%:</strong> Wajib diproses melalui <strong>Line 1 (Ayak Mentah)</strong> lalu <strong>Line 2 (Oven Pengering)</strong> sampai kadar air &lt; 2.0%.<br/>
          &bull; <strong>Kontaminan Benda Asing:</strong> Wajib bebas serangga, kotoran, atau partikel keras/logam yang membahayakan sanitasi pangan.
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div>Diperiksa Oleh,</div>
            <div style="font-size: 7.5pt; color: #666; margin-top: 2px;">Tgl: ....................</div>
            <div class="sig-line"></div>
            <div style="font-weight: bold; margin-top: 4px;">QC Inspector</div>
          </div>
          <div class="sig-box">
            <div>Diverifikasi Oleh,</div>
            <div style="font-size: 7.5pt; color: #666; margin-top: 2px;">Tgl: ....................</div>
            <div class="sig-line"></div>
            <div style="font-weight: bold; margin-top: 4px;">QA / Spv Produksi</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const columns: Column<IncomingCheckItem>[] = [
    {
      key: "checkDate",
      header: "Tanggal / Ref",
      render: (item: IncomingCheckItem) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900">{item.checkDate}</div>
          {item.lbmNo ? (
            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border">
              LBM: {item.lbmNo}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "supplierName",
      header: "Supplier & SJ",
      render: (item: IncomingCheckItem) => (
        <div className="space-y-0.5">
          <div className="font-medium text-slate-800">{item.supplierName}</div>
          {item.deliveryNoteNo && (
            <div className="text-[11px] text-muted-foreground font-mono">SJ: {item.deliveryNoteNo}</div>
          )}
        </div>
      ),
    },
    {
      key: "productName",
      header: "Bahan Baku & Lot",
      render: (item: IncomingCheckItem) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900">{item.productName}</div>
          {item.batchNo && (
            <span className="font-mono text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
              Lot: {item.batchNo}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "netWeight",
      header: "Kuantitas Masuk",
      render: (item: IncomingCheckItem) => (
        <div className="text-right space-y-0.5">
          <div className="font-bold text-slate-900">{item.netWeight.toLocaleString("id-ID")} kg</div>
          <div className="text-[10px] text-muted-foreground">
            {item.totalBags} sak (Sampel: {item.sampleBags})
          </div>
        </div>
      ),
    },
    {
      key: "moistureContent",
      header: "Kadar Air (%)",
      render: (item: IncomingCheckItem) => {
        if (item.moistureContent === undefined || item.moistureContent === null) {
          return <span className="text-muted-foreground text-xs">-</span>;
        }
        const isDry = item.moistureContent <= 2.0;
        return (
          <div className="space-y-1">
            <div
              className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                isDry
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-amber-50 text-amber-700 border-amber-300"
              }`}
            >
              <Droplets className="h-3 w-3" />
              <span>{item.moistureContent.toFixed(2)} %</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {isDry ? "Bypass Oven (Ayak Matang)" : "Wajib Oven"}
            </div>
          </div>
        );
      },
    },
    {
      key: "sugarCondition",
      header: "Fisik & Organoleptik",
      render: (item: IncomingCheckItem) => (
        <div className="text-xs text-slate-700 space-y-0.5">
          <div className="font-medium text-slate-800">{item.sugarCondition}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span>{item.colorAppearance || "Warna standard"}</span>
            {item.foreignMatterClean ? (
              <span className="text-emerald-700 font-semibold">✓ Bersih</span>
            ) : (
              <span className="text-rose-600 font-semibold">✗ Ada Kotoran</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "overallStatus",
      header: "Keputusan QC",
      render: (item: IncomingCheckItem) => {
        let badgeCls = "bg-emerald-50 text-emerald-700 border-emerald-200";
        let label = "Lolos Standar";
        if (item.overallStatus === "conditional") {
          badgeCls = "bg-amber-50 text-amber-700 border-amber-200";
          label = "Diterima Bersyarat";
        } else if (item.overallStatus === "rejected") {
          badgeCls = "bg-rose-50 text-rose-700 border-rose-200";
          label = "Ditolak / Retur";
        }
        return (
          <div className="space-y-1">
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeCls}`}>
              {label}
            </span>
            <div className="text-[10px] text-slate-600 max-w-[150px] truncate" title={item.recommendedAction}>
              {item.recommendedAction || "-"}
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Aksi",
      render: (item: IncomingCheckItem) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
            onClick={() => setViewItem(item)}
            title="Lihat Detail Form PBD"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
            onClick={() => handlePrintDocument(item)}
            title="Cetak Formulir PBD (QC-001)"
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-900"
            onClick={() => handleOpenEdit(item)}
            title="Edit Pemeriksaan"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-900"
            onClick={() => handleDelete(item.id)}
            title="Hapus"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Pemeriksaan Bahan Datang (PBD)"
        description="Dokumen QC-001-PBD. 02 — Pengujian mutu organoleptik, kebersihan bahan baku, dan kadar air gula kelapa datang sebelum masuk lini produksi."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs text-slate-700 border-slate-300"
            onClick={() => handlePrintDocument()}
            disabled={filteredChecks.length === 0}
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Cetak Rekap PBD (QC-001)
          </Button>
          <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs font-semibold" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5" />
            Pemeriksaan Bahan Baru
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-none border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Penerimaan Diuji</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{totalChecks}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Box className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-emerald-200 bg-emerald-50/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-800 font-medium">Lolos Standar (&le; 2.0%)</p>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">{passedChecks}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-amber-200 bg-amber-50/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-800 font-medium">Bersyarat / Wajib Oven (&gt; 2.0%)</p>
              <h3 className="text-xl font-bold text-amber-700 mt-1">{conditionalChecks}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Flame className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-rose-200 bg-rose-50/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-800 font-medium">Ditolak / Retur Supplier</p>
              <h3 className="text-xl font-bold text-rose-700 mt-1">{rejectedChecks}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dokumen Acuan Card */}
      <div className="p-3.5 rounded-lg border border-amber-100 bg-gradient-to-r from-amber-50/60 to-orange-50/40 text-xs text-slate-800 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-amber-950">
          <Info className="h-4 w-4 text-amber-600" />
          <span>Panduan Pengujian Mutu Bahan Datang (QC-001-PBD. 02):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11px]">
          <div className="bg-white/85 p-2 rounded border border-amber-100">
            <strong className="text-emerald-800">Kadar Air &le; 2.0%:</strong> Kering prima, bebas gumpalan basah. Dapat langsung dialirkan ke <strong>Line 3 (Ayak Matang)</strong>.
          </div>
          <div className="bg-white/85 p-2 rounded border border-amber-100">
            <strong className="text-amber-800">Kadar Air &gt; 2.0%:</strong> Lembab/basah. Wajib dialirkan ke <strong>Line 1 (Ayak Mentah)</strong> lalu <strong>Line 2 (Oven)</strong>.
          </div>
          <div className="bg-white/85 p-2 rounded border border-amber-100">
            <strong className="text-rose-800">Kontaminan & Kemasan:</strong> Sak tidak boleh basah/sobek. Wajib 100% bebas benda asing (serangga/kerikil).
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Tanggal:</span>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Ref LBM:</span>
            <Input
              placeholder="Cth: LBM-2026-001"
              value={filterLbm}
              onChange={(e) => setFilterLbm(e.target.value)}
              className="h-8 w-40 text-xs font-mono"
            />
          </div>

          {(filterDate || filterLbm) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setFilterDate("");
                setFilterLbm("");
              }}
            >
              Reset Filter
            </Button>
          )}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Cari supplier / bahan baku / lot..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredChecks}
        isLoading={loading}
      />

      {/* Dialog: Create / Edit Form PBD */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-600" />
              {editTarget ? "Edit Pemeriksaan Bahan Datang" : "Catat Pemeriksaan Bahan Datang (Form QC-001-PBD. 02)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Bagian 1: Kedatangan & Dokumen */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1.5">
                1. Data Penerimaan & Dokumen Pengantar
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Tanggal Pemeriksaan *</label>
                  <Input
                    type="date"
                    value={formData.checkDate}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        checkDate: e.target.value,
                        checkMonth: e.target.value ? e.target.value.slice(0, 7) : p.checkMonth,
                      }))
                    }
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Nomor LBM (Ref Gudang)</label>
                  <Input
                    placeholder="LBM-XXXX-XXX"
                    value={formData.lbmNo || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, lbmNo: e.target.value }))}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">No. Surat Jalan Vendor</label>
                  <Input
                    placeholder="SJ-XXXXX"
                    value={formData.deliveryNoteNo || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, deliveryNoteNo: e.target.value }))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Nama Supplier *</label>
                  <Input
                    placeholder="Nama petani / supplier..."
                    value={formData.supplierName}
                    onChange={(e) => setFormData((p) => ({ ...p, supplierName: e.target.value }))}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Komoditas Bahan Baku *</label>
                  <Input
                    placeholder="Gula Kelapa Semut Mentah / Kelapa Butir"
                    value={formData.productName}
                    onChange={(e) => setFormData((p) => ({ ...p, productName: e.target.value }))}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Nomor Lot / Batch Masuk</label>
                  <Input
                    placeholder="Cth: 26N48PW01 / RAW-001"
                    value={formData.batchNo || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, batchNo: e.target.value }))}
                    className="h-9 text-xs font-mono font-semibold text-indigo-700"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 2: Kuantitas */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1.5 flex items-center justify-between">
                <span>2. Kuantitas Kedatangan (Timbangan & Sak)</span>
                <span className="text-[11px] font-normal lowercase text-muted-foreground">
                  Diterima: <strong>{formData.acceptedWeight} kg</strong> | Ditolak: <strong>{formData.rejectedWeight} kg</strong>
                </span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Total Sak Karung</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.totalBags || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, totalBags: Number(e.target.value) }))}
                    className="h-9 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Sampel Diuji (Sak)</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.sampleBags || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, sampleBags: Number(e.target.value) }))}
                    className="h-9 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Berat Bruto (kg)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.grossWeight || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, grossWeight: Number(e.target.value) }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Berat Netto (kg)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.netWeight || ""}
                    onChange={(e) => {
                      const net = Number(e.target.value);
                      setFormData((p) => ({
                        ...p,
                        netWeight: net,
                        acceptedWeight: Math.max(0, net - (p.rejectedWeight || 0)),
                      }));
                    }}
                    className="h-9 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 3: Parameter Uji Lab & Organoleptik */}
            <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1.5 flex items-center justify-between">
                <span>3. Uji Mutu Organoleptik & Laboratorium</span>
                <span className="text-[11px] font-semibold text-indigo-700">BRL-01: Kadar Air Max 2.0%</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/40 space-y-1">
                  <label className="text-xs font-bold text-amber-900 block">Kadar Air (% Moisture) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Cth: 1.85"
                    value={formData.moistureContent ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        moistureContent: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="h-8 text-xs font-mono font-bold bg-white text-slate-900"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    {formData.moistureContent !== undefined && formData.moistureContent <= 2.0 ? (
                      <span className="text-emerald-700 font-semibold">✓ Standar (&le; 2.0%, skip oven)</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">⚠️ Di atas 2.0% (wajib oven)</span>
                    )}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Derajat Brix (°Bx) (Opsional)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Untuk nira / gula cair..."
                    value={formData.brixValue ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        brixValue: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Ukuran Mesh / Granulasi</label>
                  <Input
                    placeholder="Cth: Mesh 16 - 18"
                    value={formData.meshSize || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, meshSize: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Kondisi Fisik Gula *</label>
                  <select
                    className={selectCls}
                    value={formData.sugarCondition}
                    onChange={(e) => setFormData((p) => ({ ...p, sugarCondition: e.target.value }))}
                  >
                    <option value="Kering, Bersih, Sesuai Standar">Kering, Bersih, Sesuai Standar</option>
                    <option value="Lembab (Perlu Pengeringan Oven)">Lembab (Perlu Pengeringan Oven)</option>
                    <option value="Menggumpal / Lembab Tinggi">Menggumpal / Lembab Tinggi</option>
                    <option value="Basah / Rusak (Reject)">Basah / Rusak (Reject)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Warna & Kenampakan</label>
                  <Input
                    placeholder="Cth: Coklat Keemasan Cerah / Coklat Normal"
                    value={formData.colorAppearance || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, colorAppearance: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Aroma & Rasa</label>
                  <Input
                    placeholder="Cth: Khas Gula Kelapa Segar, Tidak Sangit/Asam"
                    value={formData.aromaFlavor || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, aromaFlavor: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Kebersihan Dari Benda Asing</label>
                  <div className="flex items-center gap-4 h-9 px-3 bg-slate-50 border rounded-lg text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.foreignMatterClean === true}
                        onChange={() => setFormData((p) => ({ ...p, foreignMatterClean: true }))}
                        className="text-emerald-600"
                      />
                      <span className="text-emerald-700 font-semibold">✓ Bebas Kotoran</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.foreignMatterClean === false}
                        onChange={() => setFormData((p) => ({ ...p, foreignMatterClean: false }))}
                        className="text-rose-600"
                      />
                      <span className="text-rose-600 font-semibold">✗ Ada Kontaminan</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 4: Rekomendasi & Verifikasi */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1.5">
                4. Rekomendasi Alur Produksi & Verifikator
              </h4>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Rekomendasi Penanganan Alur Produksi</label>
                <Input
                  placeholder="Cth: Dapat langsung ke Ayak Matang / Wajib masuk Oven Pengering"
                  value={formData.recommendedAction || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, recommendedAction: e.target.value }))}
                  className="h-9 text-xs font-semibold text-indigo-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Diperiksa Oleh (QC Inspector)</label>
                  <Input
                    value={formData.qcName || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, qcName: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Diverifikasi Oleh (QA / Spv)</label>
                  <Input
                    value={formData.qaName || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, qaName: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Catatan Tambahan</label>
                <Input
                  placeholder="Catatan penanganan bahan baku..."
                  value={formData.notes || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? "Menyimpan..." : editTarget ? "Perbarui Catatan PBD" : "Simpan Catatan PBD"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: View Detail PBD */}
      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Rincian Form QC-001-PBD. 02</span>
                <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border">
                  {viewItem.batchNo || "RAW"}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Tanggal:</span>
                  <span className="font-semibold text-slate-800">{viewItem.checkDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Ref LBM:</span>
                  <span className="font-mono font-semibold text-slate-800">{viewItem.lbmNo || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Supplier:</span>
                  <span className="font-semibold text-slate-800">{viewItem.supplierName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Surat Jalan:</span>
                  <span className="font-mono text-slate-800">{viewItem.deliveryNoteNo || "-"}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-2.5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Komoditas:</span>
                  <span className="font-bold text-slate-900">{viewItem.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kuantitas Netto:</span>
                  <span className="font-bold text-slate-900">{viewItem.netWeight.toLocaleString("id-ID")} kg ({viewItem.totalBags} sak)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kadar Air (%):</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {viewItem.moistureContent !== undefined ? `${viewItem.moistureContent.toFixed(2)} %` : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kondisi Fisik:</span>
                  <span>{viewItem.sugarCondition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warna / Kenampakan:</span>
                  <span>{viewItem.colorAppearance || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aroma & Rasa:</span>
                  <span>{viewItem.aromaFlavor || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Benda Asing:</span>
                  <span>{viewItem.foreignMatterClean ? "✓ Bebas Kotoran" : "✗ Ada Temuan"}</span>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded space-y-1">
                <span className="text-[10px] font-bold text-indigo-900 uppercase block">Rekomendasi Alur Produksi:</span>
                <div className="text-xs font-semibold text-indigo-950">{viewItem.recommendedAction || "Sesuai Standar"}</div>
              </div>

              {viewItem.notes && (
                <div className="text-[11px] text-slate-700 bg-amber-50/60 border border-amber-200 p-2 rounded">
                  <strong>Catatan:</strong> {viewItem.notes}
                </div>
              )}

              <div className="border-t pt-2 flex justify-between text-muted-foreground text-[11px]">
                <div>QC: {viewItem.qcName || "-"}</div>
                <div>QA: {viewItem.qaName || "-"}</div>
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handlePrintDocument(viewItem)}
              >
                <Printer className="h-3.5 w-3.5" /> Cetak Form
              </Button>
              <Button variant="default" size="sm" onClick={() => setViewItem(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
