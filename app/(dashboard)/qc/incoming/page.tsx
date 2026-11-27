"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  ClipboardCheck,
  Plus,
  Printer,
  FileSpreadsheet,
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
} from "@/lib/api/qc";
import { rawMaterialStockApi, LBMInboundContext } from "@/lib/api/raw-material-stock";
import { exportPBDExcel } from "@/lib/utils/export-qc-excel";

const selectCls =
  "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

const CERT_OPTIONS = ["NATURAL", "ORGANIC EU", "ORGANIC USDA", "ORGANIC JAS"] as const;

const ITEM_TYPE_OPTIONS = [
  "Bahan Baku",
  "Gula Semut",
  "Gula Cair / Nira",
  "VCO / Kelapa",
  "Barang Jadi",
  "Bahan Kemas",
];

const COLOR_SCORE_OPTIONS = [
  { value: 1, label: "1 - Light Brown" },
  { value: 2, label: "2 - Normal" },
  { value: 3, label: "3 - Dark Brown" },
];

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatMonthYearID(monthStr?: string): { monthLabel: string; yearLabel: string } {
  if (!monthStr || !/^\d{4}-\d{2}/.test(monthStr)) {
    return { monthLabel: "", yearLabel: "" };
  }
  const [yr, mo] = monthStr.split("-");
  const idx = parseInt(mo, 10) - 1;
  return {
    monthLabel: MONTH_NAMES_ID[idx] || mo,
    yearLabel: yr,
  };
}

function escHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseCerts(certs?: string): string[] {
  if (!certs) return ["NATURAL"];
  return certs
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

function defaultFormData(
  lbmNo: string,
  grId: string,
  lbmCtx?: LBMInboundContext | null
): CreateIncomingCheckInput {
  const today = new Date().toISOString().slice(0, 10);
  const firstLine = lbmCtx?.lines?.[0];
  const rawCerts = (firstLine?.certifications || "").toUpperCase();
  const matchedCerts = CERT_OPTIONS.filter((c) => rawCerts.includes(c));
  if (matchedCerts.length === 0) {
    matchedCerts.push(firstLine?.organicType?.toLowerCase().includes("organik") ? "ORGANIC EU" : "NATURAL");
  }

  const netWeight = firstLine?.weightNet ?? 0;
  const grossWeight = firstLine?.weightGross ?? netWeight;

  return {
    fairtradeStatus: "NON FAIRTRADE",
    certifications: matchedCerts.join(", "),
    goodsReceiptId: grId || lbmCtx?.goodsReceiptId || undefined,
    lbmNo: lbmCtx?.lbmNo || lbmNo || "",
    checkDate: today,
    checkMonth: today.slice(0, 7),
    supplierId: lbmCtx?.supplierId || undefined,
    supplierName: lbmCtx?.supplierName || "",
    deliveryNoteNo: lbmCtx?.deliveryNoteNo || "",
    poNo: lbmCtx?.poNo || "",
    productName: firstLine?.productName || "Gula Semut Kelapa",
    itemCode: firstLine?.lotNumber || firstLine?.productSku || "",
    itemType: "Bahan Baku",
    batchNo: firstLine?.lotNumber || "",
    totalBags: firstLine?.bagCount || 0,
    sampleBags: 13,
    grossWeight,
    netWeight,
    acceptedWeight: netWeight,
    rejectedWeight: 0,
    checkPackaging: true,
    checkShape: true,
    checkTaste: true,
    checkAroma: true,
    colorScore: 2,
    moistureContent: 1.8,
    brixValue: undefined,
    checkSolubility: true,
    phValue: undefined,
    checkPackageLabel: true,
    passRatePercent: 100,
    inspectionDecision: "LOLOS",
    sugarCondition: lbmCtx?.sugarCondition || "Baik, Sesuai Spesifikasi",
    colorAppearance: "2 - Normal",
    aromaFlavor: "Khas Gula Kelapa Normal",
    foreignMatterClean: true,
    packagingCondition: lbmCtx?.packageCondition || "Kemasan & Label Baik",
    meshSize: "",
    recommendedAction: "",
    qcName: "Adin (QC)",
    qaName: "Mario (QA)",
    notes: "",
  };
}

export default function IncomingGoodsQualityPage() {
  const searchParams = useSearchParams();
  const initialLbmNo = searchParams.get("lbmNo") || "";
  const initialGrId = searchParams.get("goodsReceiptId") || "";

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [reload, setReload] = React.useState(0);
  const [filterMonth, setFilterMonth] = React.useState(initialLbmNo ? "" : currentMonthStr);
  const [filterDate, setFilterDate] = React.useState("");
  const [filterLbm, setFilterLbm] = React.useState(initialLbmNo);
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const [lbmContext, setLbmContext] = React.useState<LBMInboundContext | null>(null);

  React.useEffect(() => {
    if (!initialGrId) return;
    let active = true;
    rawMaterialStockApi
      .getLbmContext(initialGrId)
      .then((res) => {
        if (active && res.data) {
          setLbmContext(res.data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialGrId]);

  const { data: rawChecks, loading } = useReport(
    `qc-incoming|${reload}|${filterMonth}|${filterDate}|${filterLbm}`,
    () =>
      qcApi
        .listIncomingChecks({
          month: filterMonth || undefined,
          date: filterDate || undefined,
          lbmNo: filterLbm || undefined,
        })
        .then((r) => r.data || [])
  );
  const checks: IncomingCheckItem[] = rawChecks ?? [];

  const filteredChecks = React.useMemo(() => {
    if (!searchKeyword.trim()) return checks;
    const q = searchKeyword.toLowerCase();
    return checks.filter(
      (c) =>
        c.supplierName.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        (c.itemCode && c.itemCode.toLowerCase().includes(q)) ||
        (c.itemType && c.itemType.toLowerCase().includes(q)) ||
        (c.batchNo && c.batchNo.toLowerCase().includes(q)) ||
        (c.lbmNo && c.lbmNo.toLowerCase().includes(q)) ||
        (c.deliveryNoteNo && c.deliveryNoteNo.toLowerCase().includes(q))
    );
  }, [checks, searchKeyword]);

  // Statistics
  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.overallStatus === "passed").length;
  const conditionalChecks = checks.filter((c) => c.overallStatus === "conditional").length;
  const rejectedChecks = checks.filter((c) => c.overallStatus === "rejected" || c.inspectionDecision === "DITOLAK").length;

  // Dialog State
  const [isOpen, setIsOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<IncomingCheckItem | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [viewItem, setViewItem] = React.useState<IncomingCheckItem | null>(null);

  const [formData, setFormData] = React.useState<CreateIncomingCheckInput>(() =>
    defaultFormData(initialLbmNo, initialGrId, null)
  );

  const handleOpenCreate = () => {
    setEditTarget(null);
    setFormData(defaultFormData(filterLbm || initialLbmNo, initialGrId, lbmContext));
    setFormError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (item: IncomingCheckItem) => {
    setEditTarget(item);
    setFormData({
      fairtradeStatus: item.fairtradeStatus || "NON FAIRTRADE",
      certifications: item.certifications || "NATURAL",
      goodsReceiptId: item.goodsReceiptId,
      lbmNo: item.lbmNo || "",
      checkDate: item.checkDate,
      checkMonth: item.checkMonth,
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      deliveryNoteNo: item.deliveryNoteNo || "",
      poNo: item.poNo || "",
      productName: item.productName,
      itemCode: item.itemCode || item.batchNo || "",
      itemType: item.itemType || "Bahan Baku",
      batchNo: item.batchNo || item.itemCode || "",
      totalBags: item.totalBags,
      sampleBags: item.sampleBags,
      grossWeight: item.grossWeight,
      netWeight: item.netWeight,
      acceptedWeight: item.acceptedWeight,
      rejectedWeight: item.rejectedWeight,
      checkPackaging: item.checkPackaging ?? true,
      checkShape: item.checkShape ?? true,
      checkTaste: item.checkTaste ?? true,
      checkAroma: item.checkAroma ?? true,
      colorScore: item.colorScore || 2,
      moistureContent: item.moistureContent,
      brixValue: item.brixValue,
      checkSolubility: item.checkSolubility ?? true,
      phValue: item.phValue,
      checkPackageLabel: item.checkPackageLabel ?? true,
      passRatePercent: item.passRatePercent ?? 100,
      inspectionDecision: item.inspectionDecision || (item.overallStatus === "rejected" ? "DITOLAK" : "LOLOS"),
      sugarCondition: item.sugarCondition,
      colorAppearance: item.colorAppearance || "",
      aromaFlavor: item.aromaFlavor || "",
      foreignMatterClean: item.foreignMatterClean,
      packagingCondition: item.packagingCondition || "",
      meshSize: item.meshSize || "",
      recommendedAction: item.recommendedAction || "",
      qcName: item.qcName || "",
      qaName: item.qaName || "",
      notes: item.notes || "",
    });
    setFormError(null);
    setIsOpen(true);
  };

  const toggleCertification = (cert: string) => {
    const current = parseCerts(formData.certifications);
    const exists = current.includes(cert);
    const next = exists ? current.filter((c) => c !== cert) : [...current, cert];
    setFormData((p) => ({
      ...p,
      certifications: next.length > 0 ? next.join(", ") : "NATURAL",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierName.trim()) {
      setFormError("Supplier wajib diisi");
      return;
    }
    if (!formData.productName.trim()) {
      setFormError("Nama Barang wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: CreateIncomingCheckInput = {
        ...formData,
        batchNo: formData.itemCode || formData.batchNo || "",
        itemCode: formData.itemCode || formData.batchNo || "",
      };
      if (editTarget) {
        await qcApi.updateIncomingCheck(editTarget.id, payload);
      } else {
        await qcApi.createIncomingCheck(payload);
      }
      setIsOpen(false);
      setReload((p) => p + 1);
    } catch (err: unknown) {
      setFormError(errText(err, "Gagal menyimpan data pemeriksaan kualitas barang datang"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan pemeriksaan kualitas barang datang ini?")) return;
    try {
      await qcApi.deleteIncomingCheck(id);
      setReload((p) => p + 1);
    } catch (err: unknown) {
      alert(errText(err, "Gagal menghapus data"));
    }
  };

  // Cetak Formulir Resmi QC-002-PBD Rev. 05
  const handlePrintDocument = (item?: IncomingCheckItem) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan popup browser.");
      return;
    }

    const itemsToPrint = item ? [item] : filteredChecks;
    const sample = itemsToPrint[0];
    const periodSource = filterMonth || sample?.checkMonth || currentMonthStr;
    const { monthLabel, yearLabel } = formatMonthYearID(periodSource);

    const ft = sample?.fairtradeStatus || "";
    const ftHeader =
      ft === "FAIRTRADE"
        ? `FAIRTRADE / <span style="text-decoration:line-through; color:#666;">NON FAIRTRADE</span>`
        : ft === "NON FAIRTRADE"
          ? `<span style="text-decoration:line-through; color:#666;">FAIRTRADE</span> / NON FAIRTRADE`
          : `FAIRTRADE / NON FAIRTRADE`;

    const allCerts = itemsToPrint.map((d) => (d.certifications || "").toUpperCase()).join(",");
    const certBox = (label: string) =>
      `<span style="display:inline-flex; align-items:center; gap:3px; margin-left:10px;"><span style="display:inline-block; width:10px; height:10px; border:1px solid #000; text-align:center; line-height:9px; font-size:8pt;">${allCerts.includes(label) ? "✓" : ""}</span> ${label}</span>`;

    const minRows = Math.max(15, itemsToPrint.length);
    const rowsHtml = Array.from({ length: minRows }, (_, idx) => {
      const c = itemsToPrint[idx];
      if (!c) {
        return `<tr>${Array.from({ length: 20 }, () => `<td style="border:1px solid #000; height:18px;">&nbsp;</td>`).join("")}</tr>`;
      }
      const mk = (ok: boolean) => (ok ? "✓" : "✗");
      const decision = c.inspectionDecision || (c.overallStatus === "rejected" ? "DITOLAK" : "LOLOS");
      const ket = c.notes ? `${decision} (${c.notes})` : decision;
      return `
        <tr>
          <td style="text-align:center; border:1px solid #000; padding:2px 3px;">${idx + 1}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px 3px;">${escHtml(c.checkDate)}</td>
          <td style="border:1px solid #000; padding:2px 4px;">${escHtml(c.supplierName)}</td>
          <td style="border:1px solid #000; padding:2px 4px;">${escHtml(c.productName)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px 3px; font-family:monospace;">${escHtml(c.itemCode || c.batchNo || "-")}</td>
          <td style="border:1px solid #000; padding:2px 4px;">${escHtml(c.itemType || "Bahan Baku")}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${mk(c.checkPackaging ?? true)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${mk(c.checkShape ?? true)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${mk(c.checkTaste ?? true)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${mk(c.checkAroma ?? true)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${c.colorScore || 2}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${c.moistureContent !== undefined && c.moistureContent !== null ? c.moistureContent.toFixed(2) : "-"}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${c.brixValue !== undefined && c.brixValue !== null ? c.brixValue : "-"}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${mk(c.checkSolubility ?? true)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${c.phValue !== undefined && c.phValue !== null ? c.phValue : "-"}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${mk(c.checkPackageLabel ?? true)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${c.passRatePercent ?? 100}%</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${c.sampleBags || 0}</td>
          <td style="border:1px solid #000; padding:2px 4px; font-weight:bold;">${escHtml(ket)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px 3px;">${escHtml(c.qcName || "")}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QC-002-PBD - Pemeriksaan Kualitas Barang Datang</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; color: #000; margin: 0; }
          .top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
          .title { text-align: center; font-size: 11pt; font-weight: bold; margin: 4px 0 8px 0; line-height: 1.25; }
          .meta-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 8pt; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th { border: 1px solid #000; padding: 3px 2px; font-size: 7pt; font-weight: bold; text-align: center; vertical-align: middle; background: #fff; }
          td { font-size: 7pt; word-wrap: break-word; }
          .footer { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px; font-size: 7.5pt; }
          .notes { line-height: 1.45; }
          .qa-box { width: 160px; border: 1px solid #000; text-align: center; }
          .qa-head { border-bottom: 1px solid #000; padding: 2px 4px; font-weight: bold; }
          .qa-body { height: 52px; padding: 3px 5px; text-align: left; display: flex; flex-direction: column; justify-content: space-between; }
          .qa-foot { border-top: 1px solid #000; padding: 2px 4px; font-weight: bold; }
          .rev { text-align: center; margin-top: 8px; font-size: 7.5pt; }
        </style>
      </head>
      <body>
        <div class="top-row">
          <div style="line-height: 1.35;">
            <div style="font-weight: bold;">CV. Manna Anugerah Sejahtera</div>
            <div>CU 820674 D-11</div>
            <div>104464OC</div>
            <div>FLO-ID 43683</div>
          </div>
          <div style="text-align: right; line-height: 1.35; font-weight: bold;">
            <div>QC-002-PBD</div>
            <div>${ftHeader}</div>
          </div>
        </div>

        <div class="title">
          Pemeriksaan Kualitas Barang Datang<br/>(PBD)
        </div>

        <div class="meta-bar">
          <div>
            <span style="margin-right: 40px;">Bulan : <strong>${escHtml(monthLabel)}</strong></span>
            <span>Tahun : <strong>${escHtml(yearLabel)}</strong></span>
          </div>
          <div style="font-size: 7.5pt;">
            ${certBox("NATURAL")}
            ${certBox("ORGANIC EU")}
            ${certBox("ORGANIC USDA")}
            ${certBox("ORGANIC JAS")}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 24px;">No</th>
              <th rowspan="2" style="width: 58px;">Tgl/<br/>Bulan</th>
              <th rowspan="2" style="width: 85px;">Supplier</th>
              <th rowspan="2" style="width: 95px;">Nama<br/>Barang</th>
              <th rowspan="2" style="width: 65px;">Kode Barang</th>
              <th rowspan="2" style="width: 60px;">Jenis<br/>Barang</th>
              <th colspan="10">Pengecekan</th>
              <th rowspan="2" style="width: 44px;">Tingkat<br/>lolos (%)</th>
              <th rowspan="2" style="width: 48px;">Jumlah<br/>Sampling</th>
              <th rowspan="2" style="width: 85px;">Ket</th>
              <th rowspan="2" style="width: 48px;">Paraf</th>
            </tr>
            <tr>
              <th style="width: 38px;">Kemasan</th>
              <th style="width: 34px;">Bentuk</th>
              <th style="width: 30px;">Rasa</th>
              <th style="width: 34px;">Aroma</th>
              <th style="width: 34px;">Warna*</th>
              <th style="width: 38px;">Kadar<br/>air (%)</th>
              <th style="width: 28px;">Brix</th>
              <th style="width: 40px;">Kelarutan</th>
              <th style="width: 26px;">pH</th>
              <th style="width: 42px;">Label<br/>Kemasan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="notes">
            <strong>Catatan :</strong><br/>
            &bull; Ceklis apabila dalam keadaan baik<br/>
            &bull; Bandingkan hasil yang diperoleh dengan Spesifikasi bahan baku dan barang jadi sesuai jenis barang<br/>
            &bull; Beri label LOLOS / DITOLAK berdasarkan hasil pemeriksaan pada tiap barang datang<br/>
            * Warna, beri angka 1 (light brown), 2 (normal), 3 (dark brown)<br/>
            * Metode sampling dilakukan menggunakan military standard dengan AQL (<em>Acceptable Quality Level</em> ) 0,1 dan 2,5
          </div>
          <div class="qa-box">
            <div class="qa-head">Diverifikasi Oleh :</div>
            <div class="qa-body">
              <div>Tgl. ${escHtml(sample?.qaDate ? sample.qaDate.slice(0, 10) : "")}</div>
              <div style="text-align:center; font-weight:bold;">${escHtml(sample?.qaName || "")}</div>
            </div>
            <div class="qa-foot">QA</div>
          </div>
        </div>

        <div class="rev">Rev. 05</div>

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
      header: "Tgl/Bulan & Ref",
      render: (item: IncomingCheckItem) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900">{item.checkDate}</div>
          <div className="flex flex-wrap gap-1">
            {item.documentNo && (
              <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border">
                {item.documentNo}
              </span>
            )}
            {item.lbmNo && (
              <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                {item.lbmNo}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "supplierName",
      header: "Supplier",
      render: (item: IncomingCheckItem) => (
        <div className="space-y-0.5">
          <div className="font-medium text-slate-800">{item.supplierName}</div>
          <div className="text-[10px] text-muted-foreground">
            {item.fairtradeStatus || "NON FAIRTRADE"}
          </div>
        </div>
      ),
    },
    {
      key: "productName",
      header: "Barang, Kode & Jenis",
      render: (item: IncomingCheckItem) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900">{item.productName}</div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-mono text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
              {item.itemCode || item.batchNo || "-"}
            </span>
            <span className="text-[10px] text-slate-600">{item.itemType || "Bahan Baku"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "pengecekan",
      header: "Pengecekan (QC-002-PBD)",
      render: (item: IncomingCheckItem) => {
        const checksOk = [
          { k: "Kms", ok: item.checkPackaging ?? true },
          { k: "Btk", ok: item.checkShape ?? true },
          { k: "Rsa", ok: item.checkTaste ?? true },
          { k: "Arm", ok: item.checkAroma ?? true },
          { k: "Klr", ok: item.checkSolubility ?? true },
          { k: "Lbl", ok: item.checkPackageLabel ?? true },
        ];
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1">
              {checksOk.map((p) => (
                <span
                  key={p.k}
                  className={`text-[10px] px-1 rounded border font-medium ${
                    p.ok
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {p.ok ? "✓" : "✗"} {p.k}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-700 font-mono">
              <span>Warna:{item.colorScore || 2}</span>
              <span>•</span>
              <span className={item.moistureContent && item.moistureContent > 2.0 ? "text-amber-700 font-bold" : "text-emerald-700 font-bold"}>
                Air:{item.moistureContent != null ? `${item.moistureContent.toFixed(2)}%` : "-"}
              </span>
              {item.brixValue != null && <span>• Brix:{item.brixValue}</span>}
              {item.phValue != null && <span>• pH:{item.phValue}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: "passRatePercent",
      header: "Lolos & Sampling",
      render: (item: IncomingCheckItem) => (
        <div className="text-right space-y-0.5">
          <div className="font-bold text-slate-900 font-mono">
            {(item.passRatePercent ?? 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">
            Sampling: <strong>{item.sampleBags || 0}</strong> ({item.netWeight.toLocaleString("id-ID")} kg)
          </div>
        </div>
      ),
    },
    {
      key: "inspectionDecision",
      header: "Ket & Paraf",
      render: (item: IncomingCheckItem) => {
        const decision = item.inspectionDecision || (item.overallStatus === "rejected" ? "DITOLAK" : "LOLOS");
        const isReject = decision === "DITOLAK" || item.overallStatus === "rejected";
        const isCond = !isReject && item.overallStatus === "conditional";
        const badgeCls = isReject
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : isCond
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200";
        return (
          <div className="space-y-1">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${badgeCls}`}>
              {decision}{isCond ? " (Bersyarat)" : ""}
            </span>
            <div className="text-[10px] text-slate-600 truncate max-w-[140px]" title={item.notes || item.recommendedAction}>
              {item.qcName || "-"} {item.notes ? `• ${item.notes}` : ""}
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
            title="Cetak Formulir QC-002-PBD"
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
        title="Pemeriksaan Kualitas Barang Datang (PBD)"
        description="Form QC-002-PBD Rev. 05 — Pemeriksaan kualitas organoleptik, fisik, kadar air, Brix, pH, kelarutan, label kemasan, dan sampling AQL 0,1 & 2,5."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            onClick={() => exportPBDExcel(filteredChecks, filterMonth)}
            disabled={filteredChecks.length === 0}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel (QC-002-PBD)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs text-slate-700 border-slate-300"
            onClick={() => handlePrintDocument()}
            disabled={filteredChecks.length === 0}
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Cetak Form QC-002-PBD
          </Button>
          <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs font-semibold" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5" />
            Pemeriksaan Barang Baru
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-none border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Barang Datang Diuji</p>
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
              <p className="text-xs text-emerald-800 font-medium">LOLOS Standar (&le; 2.0%)</p>
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
              <p className="text-xs text-rose-800 font-medium">DITOLAK / Retur Supplier</p>
              <h3 className="text-xl font-bold text-rose-700 mt-1">{rejectedChecks}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panduan QC-002-PBD */}
      <div className="p-3.5 rounded-lg border border-amber-100 bg-gradient-to-r from-amber-50/60 to-orange-50/40 text-xs text-slate-800 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-amber-950">
          <Info className="h-4 w-4 text-amber-600" />
          <span>Pedoman Resmi Form QC-002-PBD (Rev. 05):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11px]">
          <div className="bg-white/85 p-2 rounded border border-amber-100">
            <strong className="text-emerald-800">Ceklis &amp; Warna*:</strong> Centang bila Kemasan, Bentuk, Rasa, Aroma, Kelarutan &amp; Label Kemasan baik. Warna: <strong>1</strong> (Light Brown), <strong>2</strong> (Normal), <strong>3</strong> (Dark Brown).
          </div>
          <div className="bg-white/85 p-2 rounded border border-amber-100">
            <strong className="text-amber-800">Uji Lab &amp; AQL:</strong> Catat Kadar Air (%), Brix, dan pH sesuai spesifikasi jenis barang. Sampling mengacu <em>Military Standard</em> AQL <strong>0,1</strong> dan <strong>2,5</strong>.
          </div>
          <div className="bg-white/85 p-2 rounded border border-amber-100">
            <strong className="text-rose-800">Label Keputusan:</strong> Beri label <strong>LOLOS</strong> atau <strong>DITOLAK</strong> pada tiap barang datang, lalu verifikasi oleh QA.
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
              placeholder="Cth: LBM-001-1126"
              value={filterLbm}
              onChange={(e) => setFilterLbm(e.target.value)}
              className="h-8 w-36 text-xs font-mono"
            />
          </div>

          {(filterMonth || filterDate || filterLbm) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setFilterMonth("");
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
            placeholder="Cari supplier / barang / kode..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <DataTable columns={columns} data={filteredChecks} isLoading={loading} />

      {/* Dialog: Create / Edit Form QC-002-PBD */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-600" />
              {editTarget
                ? "Edit Pemeriksaan Kualitas Barang Datang (QC-002-PBD)"
                : "Catat Pemeriksaan Kualitas Barang Datang (Form QC-002-PBD Rev. 05)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Bagian 1: Header & Sertifikasi */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1.5">
                1. Periode, Klasifikasi &amp; Referensi Kedatangan
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Tgl/Bulan Pemeriksaan *</label>
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
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Status Fairtrade</label>
                  <select
                    className={selectCls}
                    value={formData.fairtradeStatus || "NON FAIRTRADE"}
                    onChange={(e) => setFormData((p) => ({ ...p, fairtradeStatus: e.target.value }))}
                  >
                    <option value="NON FAIRTRADE">NON FAIRTRADE</option>
                    <option value="FAIRTRADE">FAIRTRADE</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Nomor LBM (Ref Gudang)</label>
                  <Input
                    placeholder="LBM-001-1126"
                    value={formData.lbmNo || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, lbmNo: e.target.value }))}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">No. Surat Jalan</label>
                  <Input
                    placeholder="SJ-XXXXX"
                    value={formData.deliveryNoteNo || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, deliveryNoteNo: e.target.value }))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Sertifikasi Organik / Natural (Header Form)
                </label>
                <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  {CERT_OPTIONS.map((cert) => {
                    const checked = parseCerts(formData.certifications).includes(cert);
                    return (
                      <label key={cert} className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCertification(cert)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span>{cert}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bagian 2: Identitas Barang Datang */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1.5">
                2. Identitas Supplier &amp; Barang Datang
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Supplier *</label>
                  <Input
                    placeholder="Nama petani / supplier..."
                    value={formData.supplierName}
                    onChange={(e) => setFormData((p) => ({ ...p, supplierName: e.target.value }))}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Nama Barang *</label>
                  <Input
                    placeholder="Gula Semut Kelapa..."
                    value={formData.productName}
                    onChange={(e) => setFormData((p) => ({ ...p, productName: e.target.value }))}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Kode Barang / Lot</label>
                  <Input
                    placeholder="Cth: 26N48PW01"
                    value={formData.itemCode || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, itemCode: e.target.value, batchNo: e.target.value }))
                    }
                    className="h-9 text-xs font-mono font-semibold text-indigo-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Jenis Barang</label>
                  <select
                    className={selectCls}
                    value={formData.itemType || "Bahan Baku"}
                    onChange={(e) => setFormData((p) => ({ ...p, itemType: e.target.value }))}
                  >
                    {ITEM_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bagian 3: 10 Parameter Pengecekan QC-002-PBD */}
            <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1.5 flex items-center justify-between">
                <span>3. Pengecekan Kualitas (10 Parameter QC-002-PBD)</span>
                <span className="text-[11px] font-semibold text-indigo-700">Ceklis apabila dalam keadaan baik</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  { key: "checkPackaging" as const, label: "Kemasan" },
                  { key: "checkShape" as const, label: "Bentuk" },
                  { key: "checkTaste" as const, label: "Rasa" },
                  { key: "checkAroma" as const, label: "Aroma" },
                  { key: "checkSolubility" as const, label: "Kelarutan" },
                  { key: "checkPackageLabel" as const, label: "Label Kemasan" },
                ].map((item) => {
                  const val = formData[item.key] ?? true;
                  return (
                    <label
                      key={item.key}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        val
                          ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                          : "bg-rose-50/70 border-rose-300 text-rose-900"
                      }`}
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) => setFormData((p) => ({ ...p, [item.key]: e.target.checked }))}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Warna* (1 / 2 / 3)</label>
                  <select
                    className={selectCls}
                    value={formData.colorScore || 2}
                    onChange={(e) => setFormData((p) => ({ ...p, colorScore: Number(e.target.value) }))}
                  >
                    {COLOR_SCORE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Kadar Air (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1.85"
                    value={formData.moistureContent ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        moistureContent: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Brix (°Bx)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Opsional"
                    value={formData.brixValue ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        brixValue: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">pH</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Opsional"
                    value={formData.phValue ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        phValue: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Bebas Benda Asing</label>
                  <select
                    className={selectCls}
                    value={formData.foreignMatterClean ? "true" : "false"}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, foreignMatterClean: e.target.value === "true" }))
                    }
                  >
                    <option value="true">✓ Bebas Kontaminan</option>
                    <option value="false">✗ Ada Benda Asing</option>
                  </select>
                </div>
              </div>

              {formData.moistureContent !== undefined && (
                <div className="text-[11px] flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-indigo-600" />
                  {formData.moistureContent <= 2.0 ? (
                    <span className="text-emerald-700 font-semibold">
                      Kadar Air &le; 2.0% — Memenuhi standar kering prima (dapat langsung ke Ayak Matang).
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">
                      Kadar Air &gt; 2.0% — Perlu pengeringan Oven sebelum Ayak Matang.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bagian 4: AQL Sampling, Tingkat Lolos, Bobot LBM & Keputusan */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1.5">
                4. Sampling AQL, Tingkat Lolos &amp; Keputusan (LOLOS / DITOLAK)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Tingkat Lolos (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.passRatePercent ?? 100}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, passRatePercent: Number(e.target.value) }))
                    }
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Jumlah Sampling</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.sampleBags ?? 0}
                    onChange={(e) => setFormData((p) => ({ ...p, sampleBags: Number(e.target.value) }))}
                    className="h-9 text-xs font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Label Keputusan *</label>
                  <select
                    className={selectCls}
                    value={formData.inspectionDecision || "LOLOS"}
                    onChange={(e) => {
                      const decision = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        inspectionDecision: decision,
                        passRatePercent: decision === "DITOLAK" ? 0 : p.passRatePercent === 0 ? 100 : p.passRatePercent,
                      }));
                    }}
                  >
                    <option value="LOLOS">LOLOS</option>
                    <option value="DITOLAK">DITOLAK</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Netto LBM (kg)</label>
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
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Ditolak (kg)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.rejectedWeight || 0}
                    onChange={(e) => {
                      const rej = Number(e.target.value);
                      setFormData((p) => ({
                        ...p,
                        rejectedWeight: rej,
                        acceptedWeight: Math.max(0, (p.netWeight || 0) - rej),
                      }));
                    }}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Paraf Pemeriksa (QC)</label>
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

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Ket / Catatan</label>
                  <Input
                    placeholder="Keterangan tambahan..."
                    value={formData.notes || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
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

      {/* Modal: Detail QC-002-PBD */}
      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Rincian Form QC-002-PBD (Rev. 05)</span>
                <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border">
                  {viewItem.itemCode || viewItem.batchNo || viewItem.documentNo}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Tgl/Bulan &amp; Fairtrade:</span>
                  <span className="font-semibold text-slate-800">
                    {viewItem.checkDate} • {viewItem.fairtradeStatus || "NON FAIRTRADE"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Sertifikasi:</span>
                  <span className="font-semibold text-slate-800">{viewItem.certifications || "NATURAL"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Supplier &amp; Ref LBM:</span>
                  <span className="font-semibold text-slate-800">
                    {viewItem.supplierName} ({viewItem.lbmNo || "-"})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Nama &amp; Jenis Barang:</span>
                  <span className="font-semibold text-slate-800">
                    {viewItem.productName} ({viewItem.itemType || "Bahan Baku"})
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-2.5 space-y-2">
                <div className="font-bold text-slate-800 border-b pb-1">Pengecekan Kualitas</div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  <div>Kemasan: <strong>{viewItem.checkPackaging ? "✓ Baik" : "✗ Tidak"}</strong></div>
                  <div>Bentuk: <strong>{viewItem.checkShape ? "✓ Baik" : "✗ Tidak"}</strong></div>
                  <div>Rasa: <strong>{viewItem.checkTaste ? "✓ Baik" : "✗ Tidak"}</strong></div>
                  <div>Aroma: <strong>{viewItem.checkAroma ? "✓ Baik" : "✗ Tidak"}</strong></div>
                  <div>Kelarutan: <strong>{viewItem.checkSolubility ? "✓ Baik" : "✗ Tidak"}</strong></div>
                  <div>Label Kemasan: <strong>{viewItem.checkPackageLabel ? "✓ Baik" : "✗ Tidak"}</strong></div>
                  <div>Warna*: <strong>{viewItem.colorScore || 2}</strong></div>
                  <div>Kadar Air: <strong>{viewItem.moistureContent != null ? `${viewItem.moistureContent.toFixed(2)}%` : "-"}</strong></div>
                  <div>Brix / pH: <strong>{viewItem.brixValue ?? "-"} / {viewItem.phValue ?? "-"}</strong></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-indigo-50 border border-indigo-200 p-2.5 rounded">
                <div>
                  <span className="text-[10px] text-indigo-800 block">Tingkat Lolos:</span>
                  <strong className="text-indigo-950 font-mono">{viewItem.passRatePercent ?? 100}%</strong>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-800 block">Jumlah Sampling:</span>
                  <strong className="text-indigo-950 font-mono">{viewItem.sampleBags || 0}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-800 block">Keputusan:</span>
                  <strong className="text-indigo-950">{viewItem.inspectionDecision || "LOLOS"}</strong>
                </div>
              </div>

              {viewItem.notes && (
                <div className="text-[11px] text-slate-700 bg-amber-50/60 border border-amber-200 p-2 rounded">
                  <strong>Ket:</strong> {viewItem.notes}
                </div>
              )}

              <div className="border-t pt-2 flex justify-between text-muted-foreground text-[11px]">
                <div>Paraf QC: {viewItem.qcName || "-"}</div>
                <div>Diverifikasi QA: {viewItem.qaName || "-"}</div>
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handlePrintDocument(viewItem)}
              >
                <Printer className="h-3.5 w-3.5" /> Cetak QC-002-PBD
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
