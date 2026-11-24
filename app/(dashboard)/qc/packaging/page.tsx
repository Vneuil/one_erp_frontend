"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  PackageCheck,
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
  FileSpreadsheet,
  Info,
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
  PackagingCheckItem,
  CreatePackagingCheckInput,
  UpdatePackagingCheckInput,
} from "@/lib/api/qc";

const selectCls =
  "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

export default function PackagingQualityPage() {
  const searchParams = useSearchParams();
  const initialLbmNo = searchParams.get("lbmNo") || "";
  const initialGrId = searchParams.get("goodsReceiptId") || "";

  const [reload, setReload] = React.useState(0);
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [filterMonth, setFilterMonth] = React.useState(currentMonthStr);
  const [filterLbm, setFilterLbm] = React.useState(initialLbmNo);
  const [searchKeyword, setSearchKeyword] = React.useState("");

  const { data: rawChecks, loading, error } = useReport(
    `qc-packaging|${reload}|${filterMonth}|${filterLbm}`,
    () =>
      qcApi
        .listPackagingChecks({
          month: filterMonth || undefined,
          lbmNo: filterLbm || undefined,
        })
        .then((r) => r.data || [])
  );
  const checks: PackagingCheckItem[] = rawChecks ?? [];

  // Filtered in memory for search keyword
  const filteredChecks = React.useMemo(() => {
    if (!searchKeyword.trim()) return checks;
    const q = searchKeyword.toLowerCase();
    return checks.filter(
      (c) =>
        c.supplierName.toLowerCase().includes(q) ||
        c.itemName.toLowerCase().includes(q) ||
        (c.itemCode && c.itemCode.toLowerCase().includes(q)) ||
        (c.lbmNo && c.lbmNo.toLowerCase().includes(q))
    );
  }, [checks, searchKeyword]);

  // Statistics
  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.overallStatus === "passed").length;
  const partialChecks = checks.filter((c) => c.overallStatus === "partial").length;
  const failedChecks = checks.filter((c) => c.overallStatus === "failed").length;

  // Dialog State (Create / Edit)
  const [isOpen, setIsOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PackagingCheckItem | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Detail View Modal
  const [viewItem, setViewItem] = React.useState<PackagingCheckItem | null>(null);

  // Form State
  const [formData, setFormData] = React.useState<CreatePackagingCheckInput>({
    checkMonth: currentMonthStr,
    goodsReceiptId: initialGrId || undefined,
    lbmNo: initialLbmNo,
    checkDate: new Date().toISOString().slice(0, 10),
    supplierName: "",
    itemName: "",
    itemCode: "",
    materialType: "plastik",
    baseColor: "",
    dimension: "",
    totalQty: 100,
    sampleQty: 5,
    passedQty: 100,
    passedCondition: "Bersih, utuh, tidak cacat",
    failedQty: 0,
    failedCondition: "",
    qcName: "Staff QC",
    qaName: "Mario (QA/QC Spv)",
    notes: "",
  });

  const handleOpenCreate = () => {
    setEditTarget(null);
    setFormData({
      checkMonth: filterMonth || currentMonthStr,
      goodsReceiptId: initialGrId || undefined,
      lbmNo: filterLbm || "",
      checkDate: new Date().toISOString().slice(0, 10),
      supplierName: "",
      itemName: "",
      itemCode: "",
      materialType: "plastik",
      baseColor: "Bening / Putih",
      dimension: "25 kg (45x75 cm)",
      totalQty: 500,
      sampleQty: 10,
      passedQty: 500,
      passedCondition: "Bersih, utuh, tidak ada sobek / cacat",
      failedQty: 0,
      failedCondition: "",
      qcName: "Adin (QC Inspector)",
      qaName: "Mario (QA Spv)",
      notes: "",
    });
    setFormError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (item: PackagingCheckItem) => {
    setEditTarget(item);
    setFormData({
      checkMonth: item.checkMonth,
      goodsReceiptId: item.goodsReceiptId,
      lbmNo: item.lbmNo || "",
      checkDate: item.checkDate,
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      itemName: item.itemName,
      itemCode: item.itemCode || "",
      materialType: item.materialType,
      baseColor: item.baseColor || "",
      dimension: item.dimension || "",
      totalQty: item.totalQty,
      sampleQty: item.sampleQty,
      passedQty: item.passedQty,
      passedCondition: item.passedCondition || "",
      failedQty: item.failedQty,
      failedCondition: item.failedCondition || "",
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
    if (!formData.itemName.trim()) {
      setFormError("Nama barang kemas wajib diisi");
      return;
    }
    if (formData.totalQty <= 0) {
      setFormError("Jumlah kemasan harus lebih dari 0");
      return;
    }
    if (formData.sampleQty <= 0) {
      setFormError("Jumlah sampel harus lebih dari 0");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editTarget) {
        await qcApi.updatePackagingCheck(editTarget.id, formData);
      } else {
        await qcApi.createPackagingCheck(formData);
      }
      setIsOpen(false);
      setReload((p) => p + 1);
    } catch (err: unknown) {
      setFormError(errText(err, "Gagal menyimpan data pemeriksaan kemasan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan pemeriksaan bahan kemas ini?")) return;
    try {
      await qcApi.deletePackagingCheck(id);
      setReload((p) => p + 1);
    } catch (err: unknown) {
      alert(errText(err, "Gagal menghapus data"));
    }
  };

  // Cetak Dokumen Resmi QC-003-PBK. 02
  const handlePrintDocument = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan popup browser.");
      return;
    }

    const rowsHtml = filteredChecks
      .map(
        (c, idx) => `
        <tr>
          <td style="text-align: center; border: 1px solid #333; padding: 4px;">${idx + 1}</td>
          <td style="text-align: center; border: 1px solid #333; padding: 4px;">${c.checkDate}</td>
          <td style="border: 1px solid #333; padding: 4px;">${c.supplierName}</td>
          <td style="border: 1px solid #333; padding: 4px;"><strong>${c.itemName}</strong></td>
          <td style="border: 1px solid #333; padding: 4px; font-family: monospace;">${c.itemCode || "-"}</td>
          <td style="border: 1px solid #333; padding: 4px;">${c.materialType}</td>
          <td style="border: 1px solid #333; padding: 4px;">${c.baseColor || "-"}</td>
          <td style="border: 1px solid #333; padding: 4px;">${c.dimension || "-"}</td>
          <td style="text-align: right; border: 1px solid #333; padding: 4px; font-weight: bold;">${c.totalQty.toLocaleString("id-ID")}</td>
          <td style="text-align: right; border: 1px solid #333; padding: 4px;">${c.sampleQty.toLocaleString("id-ID")}</td>
          <td style="text-align: right; border: 1px solid #333; padding: 4px; color: #15803d; font-weight: bold;">${c.passedQty.toLocaleString("id-ID")}</td>
          <td style="border: 1px solid #333; padding: 4px; font-size: 8pt;">${c.passedCondition || "-"}</td>
          <td style="text-align: right; border: 1px solid #333; padding: 4px; color: #b91c1c; font-weight: bold;">${c.failedQty.toLocaleString("id-ID")}</td>
          <td style="border: 1px solid #333; padding: 4px; font-size: 8pt;">${c.failedCondition || "-"}</td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Form QC-003-PBK. 02 - Pemeriksaan Barang Kemas</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 8.5pt; color: #000; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .company { font-weight: bold; font-size: 13pt; text-transform: uppercase; }
          .title { text-align: center; font-size: 11pt; font-weight: bold; margin: 8px 0; }
          .meta { display: flex; gap: 30px; margin-bottom: 10px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 8pt; }
          th { border: 1px solid #000; background-color: #f1f5f9; padding: 4px; font-size: 7.5pt; text-align: center; }
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
            <div style="font-size: 8pt; color: #444;">Pemeriksaan Kualitas Bahan Kemas (PBK)</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 9pt;">form-QC-003-PBK. 02</div>
            <div style="font-size: 7.5pt;">(Pemeriksaan Barang Kemas)</div>
          </div>
        </div>

        <div class="title">PEMERIKSAAN KUALITAS BAHAN KEMAS (PBK)</div>

        <div class="meta">
          <div>Bulan: <u>${filterMonth || "-"}</u></div>
          <div>Ref. LBM: <u>${filterLbm || "Semua"}</u></div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 25px;">No</th>
              <th rowspan="2" style="width: 65px;">Tgl/Bln</th>
              <th rowspan="2" style="width: 120px;">Supplier</th>
              <th rowspan="2">Nama Barang</th>
              <th rowspan="2" style="width: 80px;">Kode Bahan Kemas</th>
              <th rowspan="2" style="width: 70px;">Bahan</th>
              <th rowspan="2" style="width: 70px;">Warna Dasar</th>
              <th rowspan="2" style="width: 80px;">Dimensi</th>
              <th rowspan="2" style="width: 55px;">Jumlah Kemasan</th>
              <th rowspan="2" style="width: 50px;">Sampel</th>
              <th colspan="2">Lolos</th>
              <th colspan="2">Tidak Lolos</th>
            </tr>
            <tr>
              <th style="width: 50px;">Jumlah</th>
              <th>Kondisi</th>
              <th style="width: 50px;">Jumlah</th>
              <th>Kondisi / Alasan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="14" style="text-align: center; padding: 10px;">Tidak ada data pemeriksaan.</td></tr>`}
          </tbody>
        </table>

        <div class="notes-box">
          <strong>Keterangan Kondisi Baik:</strong><br/>
          &bull; <strong>Kondisi baik (plastic):</strong> Bersih, utuh (tidak sobek/bolong/cacat/rusak)<br/>
          &bull; <strong>Kondisi baik (kardus):</strong> Bersih, tidak basah, utuh (tidak sobek, tidak mudah rusak)<br/>
          &bull; <strong>Kondisi baik (jerigen):</strong> Bersih, lubang jerigen tertutup, tidak ada kotoran didalamnya<br/>
          &bull; <strong>Kondisi baik (pallet):</strong> Plastik (tidak berlubang, kering, tidak rapuh), Kayu (tidak berlubang, tidak memiliki mata kayu, kering, tidak rapuh)
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div>Diketahui Oleh,</div>
            <div style="font-size: 7.5pt; color: #666; margin-top: 2px;">Tgl: ....................</div>
            <div class="sig-line"></div>
            <div style="font-weight: bold; margin-top: 4px;">QC Inspector</div>
          </div>
          <div class="sig-box">
            <div>Diverifikasi Oleh,</div>
            <div style="font-size: 7.5pt; color: #666; margin-top: 2px;">Tgl: ....................</div>
            <div class="sig-line"></div>
            <div style="font-weight: bold; margin-top: 4px;">QA Supervisor</div>
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

  const columns: Column<PackagingCheckItem>[] = [
    {
      key: "checkDate",
      header: "Tanggal / Ref",
      render: (item: PackagingCheckItem) => (
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
      header: "Supplier",
      render: (item: PackagingCheckItem) => <div className="font-medium text-slate-800">{item.supplierName}</div>,
    },
    {
      key: "itemName",
      header: "Nama Kemas & Bahan",
      render: (item: PackagingCheckItem) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900">{item.itemName}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="uppercase text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
              {item.materialType}
            </span>
            {item.itemCode && <span>({item.itemCode})</span>}
          </div>
        </div>
      ),
    },
    {
      key: "dimension",
      header: "Dimensi / Warna",
      render: (item: PackagingCheckItem) => (
        <div className="text-xs text-slate-700 space-y-0.5">
          <div>{item.dimension || "-"}</div>
          <div className="text-[11px] text-muted-foreground">{item.baseColor || "-"}</div>
        </div>
      ),
    },
    {
      key: "totalQty",
      header: "Qty & Sampel",
      render: (item: PackagingCheckItem) => (
        <div className="text-right space-y-0.5">
          <div className="font-bold text-slate-900">{item.totalQty.toLocaleString("id-ID")} pcs</div>
          <div className="text-[10px] text-muted-foreground">Sampel: {item.sampleQty} pcs</div>
        </div>
      ),
    },
    {
      key: "overallStatus",
      header: "Hasil Uji",
      render: (item: PackagingCheckItem) => {
        let badgeCls = "bg-emerald-50 text-emerald-700 border-emerald-200";
        let label = "Lolos Penuh";
        if (item.overallStatus === "partial") {
          badgeCls = "bg-amber-50 text-amber-700 border-amber-200";
          label = "Lolos Sebagian";
        } else if (item.overallStatus === "failed") {
          badgeCls = "bg-rose-50 text-rose-700 border-rose-200";
          label = "Ditolak";
        }
        return (
          <div className="space-y-1">
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeCls}`}>
              {label}
            </span>
            <div className="text-[11px] flex items-center gap-2">
              <span className="text-emerald-700 font-semibold">✓ {item.passedQty}</span>
              {item.failedQty > 0 && <span className="text-rose-600 font-semibold">✗ {item.failedQty}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: "qcName",
      header: "Petugas",
      render: (item: PackagingCheckItem) => (
        <div className="text-[11px] space-y-0.5">
          <div className="text-slate-700 font-medium">QC: {item.qcName || "-"}</div>
          <div className="text-muted-foreground">QA: {item.qaName || "-"}</div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (item: PackagingCheckItem) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
            onClick={() => setViewItem(item)}
            title="Lihat Rincian"
          >
            <Eye className="h-3.5 w-3.5" />
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
        title="Pemeriksaan Kualitas Bahan Kemas (PBK)"
        description="Dokumen QC-003-PBK. 02 — Verifikasi fisik dan kepatuhan spek karung, inner plastic, kardus, jerigen, dan pallet yang masuk."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs text-slate-700 border-slate-300"
            onClick={handlePrintDocument}
            disabled={filteredChecks.length === 0}
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Cetak Dokumen PBK (QC-003)
          </Button>
          <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs font-semibold" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5" />
            Pemeriksaan Kemas Baru
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-none border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Item Diperiksa</p>
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
              <p className="text-xs text-emerald-800 font-medium">Lolos Penuh (100% OK)</p>
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
              <p className="text-xs text-amber-800 font-medium">Lolos Sebagian (Catatan)</p>
              <h3 className="text-xl font-bold text-amber-700 mt-1">{partialChecks}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-rose-200 bg-rose-50/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-800 font-medium">Ditolak / Rusak (Reject)</p>
              <h3 className="text-xl font-bold text-rose-700 mt-1">{failedChecks}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dokumen Acuan Card */}
      <div className="p-3.5 rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-sky-50/40 text-xs text-slate-800 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-indigo-900">
          <Info className="h-4 w-4 text-indigo-600" />
          <span>Panduan Standar Kondisi Baik (QC-003-PBK. 02):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-[11px]">
          <div className="bg-white/80 p-2 rounded border border-indigo-100">
            <strong>Plastik:</strong> Bersih, utuh, tidak sobek, tidak bolong/cacat/rusak.
          </div>
          <div className="bg-white/80 p-2 rounded border border-indigo-100">
            <strong>Kardus:</strong> Bersih, tidak basah, utuh, tidak sobek/mudah rusak.
          </div>
          <div className="bg-white/80 p-2 rounded border border-indigo-100">
            <strong>Jerigen:</strong> Bersih, lubang tertutup, tidak ada kotoran di dalamnya.
          </div>
          <div className="bg-white/80 p-2 rounded border border-indigo-100">
            <strong>Pallet:</strong> Kering, tidak rapuh, tidak berlubang/bebas mata kayu.
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Bulan:</span>
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Ref LBM:</span>
            <Input
              placeholder="Cth: LBM-001-1126"
              value={filterLbm}
              onChange={(e) => setFilterLbm(e.target.value)}
              className="h-8 w-40 text-xs font-mono"
            />
          </div>

          {(filterMonth || filterLbm) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setFilterMonth("");
                setFilterLbm("");
              }}
            >
              Reset Filter
            </Button>
          )}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Cari supplier / nama barang..."
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

      {/* Dialog: Create / Edit Check */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-indigo-600" />
              {editTarget ? "Edit Pemeriksaan Bahan Kemas" : "Catat Pemeriksaan Bahan Kemas (PBK)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Bulan Form (YYYY-MM) *</label>
                <Input
                  type="month"
                  value={formData.checkMonth}
                  onChange={(e) => setFormData((p) => ({ ...p, checkMonth: e.target.value }))}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Tanggal Pemeriksaan *</label>
                <Input
                  type="date"
                  value={formData.checkDate}
                  onChange={(e) => setFormData((p) => ({ ...p, checkDate: e.target.value }))}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Nomor LBM (Opsional)</label>
                <Input
                  placeholder="LBM-001-1126"
                  value={formData.lbmNo || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, lbmNo: e.target.value }))}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Nama Supplier *</label>
                <Input
                  placeholder="PT / CV Supplier Kemasan..."
                  value={formData.supplierName}
                  onChange={(e) => setFormData((p) => ({ ...p, supplierName: e.target.value }))}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Nama Barang Kemas *</label>
                <Input
                  placeholder="Cth: Karung Sak 25 kg / Inner PE / Kardus"
                  value={formData.itemName}
                  onChange={(e) => setFormData((p) => ({ ...p, itemName: e.target.value }))}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Kode Bahan Kemas</label>
                <Input
                  placeholder="Cth: KMS-PL-025"
                  value={formData.itemCode || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, itemCode: e.target.value }))}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Jenis Bahan *</label>
                <select
                  className={selectCls}
                  value={formData.materialType}
                  onChange={(e) => setFormData((p) => ({ ...p, materialType: e.target.value }))}
                >
                  <option value="plastik">Plastik (PE / PP / Inner)</option>
                  <option value="kardus">Kardus (Corrugated Box)</option>
                  <option value="jerigen">Jerigen (HDPE / Jerrycan)</option>
                  <option value="pallet_plastik">Pallet Plastik</option>
                  <option value="pallet_kayu">Pallet Kayu</option>
                  <option value="karung">Karung Sak Anyam</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Warna Dasar</label>
                <Input
                  placeholder="Cth: Putih / Bening / Coklat"
                  value={formData.baseColor || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, baseColor: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Dimensi / Ukuran</label>
                <Input
                  placeholder="Cth: 45 x 75 cm / 120 x 100 cm"
                  value={formData.dimension || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, dimension: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Jumlah Datang (pcs) *</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.totalQty}
                  onChange={(e) => {
                    const total = Number(e.target.value);
                    setFormData((p) => ({
                      ...p,
                      totalQty: total,
                      passedQty: Math.max(0, total - (p.failedQty || 0)),
                    }));
                  }}
                  required
                  className="h-9 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Jumlah Sampel Diuji *</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.sampleQty}
                  onChange={(e) => setFormData((p) => ({ ...p, sampleQty: Number(e.target.value) }))}
                  required
                  className="h-9 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Hasil Pengujian Box */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Hasil Pengujian Mutu</span>
                <span className="text-[11px] font-normal lowercase text-muted-foreground">
                  Status otomatis dihitung:{" "}
                  {formData.failedQty === 0 ? (
                    <strong className="text-emerald-700">Lolos Penuh</strong>
                  ) : formData.passedQty === 0 ? (
                    <strong className="text-rose-600">Ditolak</strong>
                  ) : (
                    <strong className="text-amber-700">Lolos Sebagian</strong>
                  )}
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-800">Jumlah Lolos (pcs)</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.passedQty}
                      onChange={(e) => setFormData((p) => ({ ...p, passedQty: Number(e.target.value) }))}
                      className="h-8 w-24 text-right text-xs font-bold text-emerald-700 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-emerald-900 block mb-0.5">Kondisi Lolos</label>
                    <Input
                      placeholder="Cth: Bersih, utuh, dimensi sesuai spek"
                      value={formData.passedCondition || ""}
                      onChange={(e) => setFormData((p) => ({ ...p, passedCondition: e.target.value }))}
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-rose-50/50 border border-rose-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-800">Jumlah Tidak Lolos (pcs)</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.failedQty}
                      onChange={(e) => {
                        const failed = Number(e.target.value);
                        setFormData((p) => ({
                          ...p,
                          failedQty: failed,
                          passedQty: Math.max(0, p.totalQty - failed),
                        }));
                      }}
                      className="h-8 w-24 text-right text-xs font-bold text-rose-700 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-rose-900 block mb-0.5">Kondisi / Alasan Tidak Lolos</label>
                    <Input
                      placeholder="Cth: Sobek, basah, berdebu tebal"
                      value={formData.failedCondition || ""}
                      onChange={(e) => setFormData((p) => ({ ...p, failedCondition: e.target.value }))}
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Verifikator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Diketahui Oleh (QC)</label>
                <Input
                  value={formData.qcName || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, qcName: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Diverifikasi Oleh (QA)</label>
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
                placeholder="Catatan penanganan material kemasan..."
                value={formData.notes || ""}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? "Menyimpan..." : editTarget ? "Perbarui Catatan" : "Simpan Catatan PBK"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: View Detail */}
      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Rincian Form QC-003-PBK. 02</span>
                <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
                  {viewItem.itemCode || "KMS"}
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
                  <span className="text-muted-foreground block text-[10px]">Periode Form:</span>
                  <span className="font-semibold text-slate-800">{viewItem.checkMonth}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Supplier:</span>
                  <span className="font-semibold text-slate-800">{viewItem.supplierName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Ref LBM:</span>
                  <span className="font-mono font-semibold text-slate-800">{viewItem.lbmNo || "-"}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-2.5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nama Barang:</span>
                  <span className="font-bold text-slate-900">{viewItem.itemName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jenis Bahan:</span>
                  <span className="capitalize font-semibold text-indigo-700">{viewItem.materialType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensi / Spek:</span>
                  <span>{viewItem.dimension || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warna Dasar:</span>
                  <span>{viewItem.baseColor || "-"}</span>
                </div>
                <div className="flex justify-between pt-1 border-t">
                  <span className="text-muted-foreground">Jumlah Datang:</span>
                  <span className="font-bold">{viewItem.totalQty.toLocaleString("id-ID")} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sampel Diuji:</span>
                  <span>{viewItem.sampleQty.toLocaleString("id-ID")} pcs</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Lolos</span>
                  <div className="text-base font-bold text-emerald-700">{viewItem.passedQty.toLocaleString("id-ID")} pcs</div>
                  <div className="text-[11px] text-emerald-900">{viewItem.passedCondition || "Kondisi Baik"}</div>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded space-y-1">
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">Tidak Lolos</span>
                  <div className="text-base font-bold text-rose-700">{viewItem.failedQty.toLocaleString("id-ID")} pcs</div>
                  <div className="text-[11px] text-rose-900">{viewItem.failedCondition || "-"}</div>
                </div>
              </div>

              <div className="border-t pt-2 flex justify-between text-muted-foreground text-[11px]">
                <div>QC: {viewItem.qcName || "-"}</div>
                <div>QA: {viewItem.qaName || "-"}</div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setViewItem(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
