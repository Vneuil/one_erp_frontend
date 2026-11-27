"use client";

import * as React from "react";
import {
  Tag,
  Plus,
  FileSpreadsheet,
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  Eye,
  ShieldCheck,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  qcApi,
  PackagingLabelCheckItem,
  PackagingLabelCheckLineItem,
  CreatePackagingLabelCheckInput,
} from "@/lib/api/qc";
import { exportPLKExcel } from "@/lib/utils/export-wip-excel";

const selectCls =
  "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatPLKMonthYear(monthStr?: string): string {
  if (!monthStr || !/^\d{4}-\d{2}/.test(monthStr)) return monthStr || "";
  const [yr, mo] = monthStr.split("-");
  const idx = parseInt(mo, 10) - 1;
  return `${MONTH_NAMES_ID[idx] || mo} ${yr}`;
}

function escHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CHECK_PARAMS: { key: keyof PackagingLabelCheckLineItem; label: string; shortLabel: string; isLineCheck?: boolean }[] = [
  { key: "isProductNameMatch", label: "Nama Produk", shortLabel: "Produk" },
  { key: "isBatchMatch", label: "Batch Number", shortLabel: "Batch" },
  { key: "isProductionDateMatch", label: "Production Date", shortLabel: "Prod Date" },
  { key: "isExpiryMatch", label: "Best Before Date", shortLabel: "Best Before" },
  { key: "isOriginCountryMatch", label: "Negara Asal", shortLabel: "Asal" },
  { key: "isWeightMatch", label: "Berat", shortLabel: "Berat" },
  { key: "isPackagingMatch", label: "Kemasan", shortLabel: "Kemasan" },
  { key: "isStickerNoMatch", label: "No Sticker", shortLabel: "Sticker" },
  { key: "isAllergenInfoMatch", label: "Allergen Information", shortLabel: "Allergen" },
  { key: "isLineCheckPassed", label: "Line Check", shortLabel: "Line Check", isLineCheck: true },
];

function createEmptyItem(itemNo: number, defaultDate: string, defaultQc: string): PackagingLabelCheckLineItem {
  return {
    itemNo,
    itemCheckDate: defaultDate,
    buyerName: "",
    itemName: "Organic Coconut Sugar 25kg",
    itemCode: "",
    batchNo: "",
    productionDate: defaultDate,
    expiredDate: "",
    originCountry: "Indonesia",
    weightLabel: "25 kg",
    packagingType: "Kraft Bag 25kg",
    stickerNo: "",
    allergenInfo: "Allergen Free",
    isProductNameMatch: true,
    isBatchMatch: true,
    isProductionDateMatch: true,
    isExpiryMatch: true,
    isOriginCountryMatch: true,
    isWeightMatch: true,
    isPackagingMatch: true,
    isStickerNoMatch: true,
    isAllergenInfoMatch: true,
    isLineCheckPassed: true,
    isCertLogoMatch: true,
    isPrintQualityGood: true,
    isPositionAligned: true,
    inspectedQty: 0,
    passedQty: 0,
    rejectedQty: 0,
    itemDecision: "lolos",
    qcPicName: defaultQc,
    notes: "",
  };
}

function allChecksPassed(it: PackagingLabelCheckLineItem): boolean {
  return CHECK_PARAMS.every((p) => it[p.key] !== false);
}

export default function QCLabelInspectionPage() {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [reports, setReports] = React.useState<PackagingLabelCheckItem[]>([]);
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonthStr);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [decisionFilter, setDecisionFilter] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Dialog states
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [editTarget, setEditTarget] = React.useState<PackagingLabelCheckItem | null>(null);
  const [viewReport, setViewReport] = React.useState<PackagingLabelCheckItem | null>(null);

  // Form States
  const today = new Date().toISOString().slice(0, 10);
  const [checkDate, setCheckDate] = React.useState<string>(today);
  const [fairtradeStatus, setFairtradeStatus] = React.useState<string>("NON FAIRTRADE");
  const [certification, setCertification] = React.useState<string>("NATURAL");
  const [qcInspectorName, setQcInspectorName] = React.useState<string>("Adin (QC)");
  const [qcSupervisorName, setQcSupervisorName] = React.useState<string>("Mario (QA)");
  const [notes, setNotes] = React.useState<string>("");
  const [items, setItems] = React.useState<PackagingLabelCheckLineItem[]>([
    createEmptyItem(1, today, "Adin (QC)"),
  ]);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await qcApi.listPackagingLabelChecks({
        month: filterMonth || undefined,
        decision: decisionFilter || undefined,
      });
      if (res.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat data PLK:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterMonth, decisionFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredReports = React.useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter((r) => {
      if (
        r.documentNo.toLowerCase().includes(q) ||
        (r.batchNo && r.batchNo.toLowerCase().includes(q)) ||
        (r.qcInspectorName && r.qcInspectorName.toLowerCase().includes(q))
      ) {
        return true;
      }
      return (r.items || []).some(
        (it) =>
          (it.buyerName && it.buyerName.toLowerCase().includes(q)) ||
          it.itemName.toLowerCase().includes(q) ||
          it.batchNo.toLowerCase().includes(q)
      );
    });
  }, [reports, searchQuery]);

  const handleOpenCreate = () => {
    const d = new Date().toISOString().slice(0, 10);
    setEditTarget(null);
    setCheckDate(d);
    setFairtradeStatus("NON FAIRTRADE");
    setCertification("NATURAL");
    setQcInspectorName("Adin (QC)");
    setQcSupervisorName("Mario (QA)");
    setNotes("");
    setItems([createEmptyItem(1, d, "Adin (QC)")]);
    setIsOpen(true);
  };

  const handleOpenEdit = (rep: PackagingLabelCheckItem) => {
    setEditTarget(rep);
    setCheckDate(rep.checkDate);
    setFairtradeStatus(rep.fairtradeStatus || "NON FAIRTRADE");
    setCertification(rep.certification || "NATURAL");
    setQcInspectorName(rep.qcInspectorName || "Adin (QC)");
    setQcSupervisorName(rep.qcSupervisorName || "");
    setNotes(rep.notes || "");
    const mappedItems =
      rep.items && rep.items.length > 0
        ? rep.items.map((it, idx) => ({
            ...createEmptyItem(idx + 1, rep.checkDate, rep.qcInspectorName || "Adin (QC)"),
            ...it,
            itemCheckDate: it.itemCheckDate || rep.checkDate,
            isProductNameMatch: it.isProductNameMatch ?? true,
            isProductionDateMatch: it.isProductionDateMatch ?? true,
            isOriginCountryMatch: it.isOriginCountryMatch ?? true,
            isWeightMatch: it.isWeightMatch ?? true,
            isPackagingMatch: it.isPackagingMatch ?? true,
            isStickerNoMatch: it.isStickerNoMatch ?? true,
            isAllergenInfoMatch: it.isAllergenInfoMatch ?? true,
            isLineCheckPassed: it.isLineCheckPassed ?? true,
            qcPicName: it.qcPicName || rep.qcInspectorName || "",
          }))
        : [createEmptyItem(1, rep.checkDate, rep.qcInspectorName || "Adin (QC)")];
    setItems(mappedItems);
    setIsOpen(true);
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem(prev.length + 1, checkDate, qcInspectorName)]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof PackagingLabelCheckLineItem,
    val: string | number | boolean
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: val } as PackagingLabelCheckLineItem;

      if (field !== "itemDecision") {
        target.itemDecision = allChecksPassed(target) ? "lolos" : "ditolak";
      }
      if (field === "batchNo") {
        target.itemCode = String(val);
      }

      updated[index] = target;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some((it) => !it.itemName.trim() || !it.batchNo.trim())) {
      alert("Nama Produk dan Batch Number pada setiap baris wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreatePackagingLabelCheckInput = {
        checkDate,
        checkMonth: checkDate.slice(0, 7),
        fairtradeStatus,
        certification,
        batchNo: items[0]?.batchNo || "",
        qcInspectorName,
        qcSupervisorName,
        notes,
        items: items.map((it, idx) => ({
          ...it,
          itemNo: idx + 1,
          itemCode: it.itemCode || it.batchNo,
          itemCheckDate: it.itemCheckDate || checkDate,
          qcPicName: it.qcPicName || qcInspectorName,
        })),
      };
      if (editTarget) {
        await qcApi.updatePackagingLabelCheck(editTarget.id, payload);
      } else {
        await qcApi.createPackagingLabelCheck(payload);
      }
      setIsOpen(false);
      await loadData();
    } catch (err) {
      alert("Gagal menyimpan PLK: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan Pemeriksaan Label Kemasan (PLK) ini?")) return;
    try {
      await qcApi.deletePackagingLabelCheck(id);
      await loadData();
    } catch (err) {
      alert("Gagal menghapus PLK: " + (err as Error).message);
    }
  };

  // Cetak Formulir Resmi QC-016-PLK. 01 (Revisi 01 — Penambahan Line Check)
  const handlePrintDocument = (singleReport?: PackagingLabelCheckItem) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan popup browser.");
      return;
    }

    const listToPrint = singleReport ? [singleReport] : filteredReports;
    const sample = listToPrint[0];
    const periodSource = filterMonth || sample?.checkMonth || currentMonthStr;
    const periodLabel = formatPLKMonthYear(periodSource);

    const ft = sample?.fairtradeStatus || "";
    const ftHeader =
      ft === "FAIRTRADE"
        ? `FAIRTRADE / <span style="text-decoration:line-through; color:#666;">NON FAIRTRADE</span>`
        : ft === "NON FAIRTRADE"
          ? `<span style="text-decoration:line-through; color:#666;">FAIRTRADE</span> / NON FAIRTRADE`
          : `FAIRTRADE / NON FAIRTRADE`;

    const flatRows = listToPrint.flatMap((rep) =>
      (rep.items && rep.items.length > 0 ? rep.items : []).map((it) => ({ rep, it }))
    );
    const minRows = Math.max(14, flatRows.length);

    const rowsHtml = Array.from({ length: minRows }, (_, idx) => {
      const entry = flatRows[idx];
      if (!entry) {
        return `<tr>${Array.from({ length: 19 }, () => `<td style="border:1px solid #000; height:18px;">&nbsp;</td>`).join("")}</tr>`;
      }
      const { rep, it } = entry;
      const ck = (v?: boolean) => (v !== false ? "✓" : "✗");
      const decisionLabel =
        it.itemDecision === "ditolak" || rep.overallDecision === "ditolak" ? "Tidak" : "Lolos";
      return `
        <tr>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${escHtml(it.itemCheckDate || rep.checkDate)}</td>
          <td style="border:1px solid #000; padding:2px 3px;">${escHtml(it.buyerName || "-")}</td>
          <td style="border:1px solid #000; padding:2px 3px;">${escHtml(it.itemName)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px; font-family:monospace;">${escHtml(it.batchNo || rep.batchNo || "-")}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${escHtml(it.productionDate || "-")}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${escHtml(it.expiredDate || "-")}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${ck(it.isProductNameMatch)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${ck(it.isBatchMatch)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${ck(it.isProductionDateMatch)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${ck(it.isExpiryMatch)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${ck(it.isOriginCountryMatch)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${ck(it.isWeightMatch)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${ck(it.isPackagingMatch)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${ck(it.isStickerNoMatch)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${ck(it.isAllergenInfoMatch)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${ck(it.isLineCheckPassed)}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px; font-weight:bold;">${decisionLabel}</td>
          <td style="border:1px solid #000; padding:2px 3px;">${escHtml(it.notes || rep.notes || "")}</td>
          <td style="text-align:center; border:1px solid #000; padding:2px;">${escHtml(it.qcPicName || rep.qcInspectorName || "")}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QC-016-PLK - Pemeriksaan Label Kemasan</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; color: #000; margin: 0; }
          .top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
          .title { text-align: center; font-size: 11pt; font-weight: bold; margin: 4px 0 8px 0; line-height: 1.25; }
          .meta { margin-bottom: 5px; font-size: 8pt; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th { border: 1px solid #000; padding: 3px 2px; font-size: 7pt; font-weight: bold; text-align: center; vertical-align: middle; background: #fff; }
          td { font-size: 7pt; word-wrap: break-word; }
          .vtext { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; height: 74px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
          .notes { margin-top: 8px; font-size: 7.5pt; line-height: 1.45; }
          .rev { text-align: center; margin-top: 10px; font-size: 7.5pt; }
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
            <div>QC-016-PLK</div>
            <div>${ftHeader}</div>
          </div>
        </div>

        <div class="title">
          Pemeriksaan Label Kemasan<br/>(PLK)
        </div>

        <div class="meta">Bulan / Tahun : ${escHtml(periodLabel)}</div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 56px;">Tanggal</th>
              <th rowspan="2" style="width: 78px;">Customer</th>
              <th rowspan="2" style="width: 92px;">Nama Produk</th>
              <th rowspan="2" style="width: 78px;">Batch Number</th>
              <th rowspan="2" style="width: 56px;">Production Date</th>
              <th rowspan="2" style="width: 56px;">Expired Date</th>
              <th colspan="9">Kesesuaian Label &amp; Kemasan*</th>
              <th rowspan="2" style="width: 24px;"><div class="vtext">Line Check</div></th>
              <th rowspan="2" style="width: 44px;">Lolos/<br/>Tidak</th>
              <th rowspan="2" style="width: 96px;">Keterangan</th>
              <th rowspan="2" style="width: 46px;">Paraf QC</th>
            </tr>
            <tr>
              <th style="width: 20px;"><div class="vtext">Nama Produk</div></th>
              <th style="width: 20px;"><div class="vtext">Batch Number</div></th>
              <th style="width: 20px;"><div class="vtext">Production Date</div></th>
              <th style="width: 20px;"><div class="vtext">Best Before Date</div></th>
              <th style="width: 20px;"><div class="vtext">Negara Asal</div></th>
              <th style="width: 20px;"><div class="vtext">Berat</div></th>
              <th style="width: 20px;"><div class="vtext">Kemasan</div></th>
              <th style="width: 20px;"><div class="vtext">No Sticker</div></th>
              <th style="width: 20px;"><div class="vtext">Allergen Information</div></th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="notes">
          <strong>Keterangan :</strong> - (*) Ceklis apabila sesuai dengan ketentuan<br/>
          <span style="padding-left: 60px; display:inline-block;">- Pemeriksaan dilakukan sebelum produk memasuki area penyimpanan produk jadi</span><br/>
          <span style="padding-left: 60px; display:inline-block;">- Jika pada saat proses produksi label belum tersedia, pemeriksaan dilakukan setelah tersedianya label</span><br/>
          <span style="padding-left: 60px; display:inline-block;">- Tempel label karantina jika produk belum dilakukan pemeriksaan dan label lolos jika produk telah sesuai standar</span>
        </div>

        <div class="rev">Revisi 01</div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Metrics
  const totalLines = filteredReports.reduce((acc, r) => acc + (r.items?.length || 0), 0);
  const passedReports = filteredReports.filter((r) => r.overallDecision === "lolos").length;
  const rejectedReports = filteredReports.filter((r) => r.overallDecision === "ditolak").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pemeriksaan Label Kemasan QC (PLK)"
        description="Formulir QC-016-PLK. 01 (Revisi 01 — Penambahan Line Check) untuk verifikasi kesesuaian label, kemasan, tanggal produksi/expired, allergen, dan line check sebelum masuk gudang produk jadi."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            onClick={() => exportPLKExcel(filteredReports, filterMonth)}
            disabled={filteredReports.length === 0}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel (QC-016-PLK)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => handlePrintDocument()}
            disabled={filteredReports.length === 0}
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak QC-016-PLK
          </Button>
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Catat Pemeriksaan Label
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Dokumen PLK</p>
              <h3 className="text-2xl font-bold mt-1 text-indigo-700">
                {filteredReports.length} <span className="text-sm font-normal">Form</span>
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
              <Tag className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Lolos (Sesuai Standar)</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-700">
                {passedReports} <span className="text-sm font-normal">Lolos</span>
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Tidak Lolos / Karantina</p>
              <h3 className="text-2xl font-bold mt-1 text-red-700">
                {rejectedReports} <span className="text-sm font-normal">Reject</span>
              </h3>
            </div>
            <div className="p-3 bg-red-50 rounded-full text-red-600">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Baris Diperiksa</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-700">
                {totalLines.toLocaleString()} <span className="text-sm font-normal">Batch</span>
              </h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-full text-purple-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pedoman QC-016-PLK Rev. 01 */}
      <div className="p-3.5 rounded-lg border border-indigo-100 bg-indigo-50/40 text-xs text-slate-800 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-indigo-950">
          <Info className="h-4 w-4 text-indigo-600" />
          <span>Ketentuan Pemeriksaan Label Kemasan (QC-016-PLK Revisi 01):</span>
        </div>
        <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-slate-700">
          <li>Pemeriksaan dilakukan sebelum produk memasuki area penyimpanan produk jadi (atau setelah tersedianya label).</li>
          <li>Verifikasi 9 poin <strong>Kesesuaian Label &amp; Kemasan*</strong> ditambah <strong>Line Check</strong>.</li>
          <li>Tempel label <strong>Karantina</strong> jika belum diperiksa, dan label <strong>Lolos</strong> jika produk telah sesuai standar.</li>
        </ul>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="flex flex-wrap flex-1 gap-2 w-full md:w-auto items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Bulan:</span>
                <Input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="h-9 w-36 text-xs"
                />
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari customer, nama produk, batch, dokumen..."
                  className="pl-8 h-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="h-9 border rounded-md px-3 text-xs bg-background"
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value)}
              >
                <option value="">Semua Keputusan</option>
                <option value="lolos">Lolos</option>
                <option value="ditolak">Tidak / Ditolak</option>
              </select>
              {(filterMonth || decisionFilter || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground"
                  onClick={() => {
                    setFilterMonth("");
                    setDecisionFilter("");
                    setSearchQuery("");
                  }}
                >
                  Reset
                </Button>
              )}
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
                  <th className="py-3 px-4 text-left">No. Dokumen &amp; Tanggal</th>
                  <th className="py-3 px-4 text-left">Customer &amp; Produk</th>
                  <th className="py-3 px-4 text-left">Batch / Prod / Exp Date</th>
                  <th className="py-3 px-4 text-center">Kesesuaian Label (9 Poin) &amp; Line Check</th>
                  <th className="py-3 px-4 text-center">Lolos / Tidak</th>
                  <th className="py-3 px-4 text-left">Paraf QC</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Memuat data PLK...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Belum ada formulir Pemeriksaan Label Kemasan (QC-016-PLK) yang dicatat.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r) => {
                    const lineItems = r.items || [];
                    return (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 align-top">
                          <div className="font-mono font-semibold text-indigo-700 text-xs">{r.documentNo}</div>
                          <div className="text-xs font-medium mt-0.5">{r.checkDate}</div>
                          <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 mt-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            {r.fairtradeStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-top space-y-1">
                          {lineItems.map((it, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-semibold text-slate-900">{it.itemName}</span>
                              <div className="text-[11px] text-muted-foreground">
                                Customer: <strong>{it.buyerName || "-"}</strong>
                              </div>
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4 align-top space-y-1">
                          {lineItems.map((it, idx) => (
                            <div key={idx} className="text-xs space-y-0.5">
                              <div className="font-mono font-semibold text-slate-800">{it.batchNo || r.batchNo || "-"}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Prod: {it.productionDate || "-"} | Exp: {it.expiredDate || "-"}
                              </div>
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4 align-top">
                          <div className="space-y-1.5">
                            {lineItems.map((it, idx) => (
                              <div key={idx} className="flex flex-wrap items-center justify-center gap-1">
                                {CHECK_PARAMS.map((p) => {
                                  const ok = it[p.key] !== false;
                                  return (
                                    <span
                                      key={p.key}
                                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                                        p.isLineCheck
                                          ? ok
                                            ? "bg-indigo-50 text-indigo-800 border-indigo-300 font-bold"
                                            : "bg-rose-100 text-rose-800 border-rose-300 font-bold"
                                          : ok
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-rose-50 text-rose-700 border-rose-200"
                                      }`}
                                    >
                                      {ok ? "✓" : "✗"} {p.shortLabel}
                                    </span>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center align-top">
                          {r.overallDecision === "lolos" ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Lolos
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold border border-red-200">
                              <XCircle className="h-3 w-3" /> Tidak
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top text-xs">
                          <div className="font-medium text-slate-800">{r.qcInspectorName}</div>
                          {r.notes && (
                            <div className="text-[11px] text-muted-foreground max-w-[140px] truncate" title={r.notes}>
                              {r.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center align-top">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-600"
                              onClick={() => setViewReport(r)}
                              title="Lihat Detail"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-600"
                              onClick={() => handlePrintDocument(r)}
                              title="Cetak QC-016-PLK"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-emerald-700"
                              onClick={() => exportPLKExcel(r)}
                              title="Export Excel"
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-indigo-600"
                              onClick={() => handleOpenEdit(r)}
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-rose-600"
                              onClick={() => handleDelete(r.id)}
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Create / Edit PLK (QC-016-PLK Rev. 01) */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Tag className="h-5 w-5 text-indigo-600" />
              {editTarget
                ? `Edit Pemeriksaan Label Kemasan (${editTarget.documentNo})`
                : "Catat Pemeriksaan Label Kemasan — Form QC-016-PLK (Revisi 01)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="text-xs font-semibold text-slate-700">Tanggal Pemeriksaan *</label>
                <Input
                  type="date"
                  className="mt-1 h-9 text-xs"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Status Fairtrade</label>
                <select
                  className={`mt-1 ${selectCls}`}
                  value={fairtradeStatus}
                  onChange={(e) => setFairtradeStatus(e.target.value)}
                >
                  <option value="NON FAIRTRADE">NON FAIRTRADE</option>
                  <option value="FAIRTRADE">FAIRTRADE</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Paraf QC (Inspector) *</label>
                <Input
                  className="mt-1 h-9 text-xs"
                  value={qcInspectorName}
                  onChange={(e) => setQcInspectorName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Supervisor QC / QA</label>
                <Input
                  className="mt-1 h-9 text-xs"
                  value={qcSupervisorName}
                  onChange={(e) => setQcSupervisorName(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Rows */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Daftar Produk, Kesesuaian Label &amp; Kemasan*, &amp; Line Check
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="gap-1 text-xs h-8">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris
                </Button>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="p-3 border border-slate-200 rounded-lg bg-white space-y-3">
                  <div className="flex justify-between items-center border-b pb-1.5">
                    <span className="text-xs font-bold text-slate-700">Baris Pemeriksaan #{idx + 1}</span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-rose-600 hover:text-rose-800 text-xs"
                        onClick={() => handleRemoveItem(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                      </Button>
                    )}
                  </div>

                  {/* Identitas Produk & Tanggal */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">Tanggal</label>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={it.itemCheckDate || checkDate}
                        onChange={(e) => handleItemChange(idx, "itemCheckDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">Customer</label>
                      <Input
                        placeholder="Nama customer..."
                        className="h-8 text-xs"
                        value={it.buyerName || ""}
                        onChange={(e) => handleItemChange(idx, "buyerName", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">Nama Produk *</label>
                      <Input
                        placeholder="Nama produk..."
                        className="h-8 text-xs"
                        value={it.itemName}
                        onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">Batch Number *</label>
                      <Input
                        placeholder="26N48PW01"
                        className="h-8 text-xs font-mono"
                        value={it.batchNo}
                        onChange={(e) => handleItemChange(idx, "batchNo", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">Production Date</label>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={it.productionDate || ""}
                        onChange={(e) => handleItemChange(idx, "productionDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">Expired Date</label>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={it.expiredDate || ""}
                        onChange={(e) => handleItemChange(idx, "expiredDate", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 9 Checklists Kesesuaian Label & Kemasan* + Line Check */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700">
                      Kesesuaian Label &amp; Kemasan* (9 Poin) + Line Check (Revisi 01):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {CHECK_PARAMS.map((param) => {
                        const checked = it[param.key] !== false;
                        return (
                          <label
                            key={param.key}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs cursor-pointer ${
                              param.isLineCheck
                                ? checked
                                  ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-bold"
                                  : "bg-rose-100 border-rose-300 text-rose-900 font-bold"
                                : checked
                                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 font-medium"
                                  : "bg-rose-50 border-rose-200 text-rose-900 font-medium"
                            }`}
                          >
                            <span className="truncate pr-1">{param.label}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => handleItemChange(idx, param.key, e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Opsional Metadata Kemasan/Sticker + Lolos/Tidak + Keterangan + Paraf QC */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">Kemasan</label>
                      <Input
                        placeholder="Kraft 25kg..."
                        className="h-8 text-xs"
                        value={it.packagingType || ""}
                        onChange={(e) => handleItemChange(idx, "packagingType", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">No Sticker</label>
                      <Input
                        placeholder="26N48PW001-050"
                        className="h-8 text-xs font-mono"
                        value={it.stickerNo || ""}
                        onChange={(e) => handleItemChange(idx, "stickerNo", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">Lolos / Tidak</label>
                      <select
                        className={selectCls}
                        value={it.itemDecision === "ditolak" ? "ditolak" : "lolos"}
                        onChange={(e) => handleItemChange(idx, "itemDecision", e.target.value)}
                      >
                        <option value="lolos">Lolos</option>
                        <option value="ditolak">Tidak (Ditolak / Karantina)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">Keterangan</label>
                      <Input
                        placeholder="Keterangan hasil cek..."
                        className="h-8 text-xs"
                        value={it.notes || ""}
                        onChange={(e) => handleItemChange(idx, "notes", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">Paraf QC</label>
                      <Input
                        placeholder="Nama QC"
                        className="h-8 text-xs"
                        value={it.qcPicName || ""}
                        onChange={(e) => handleItemChange(idx, "qcPicName", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Catatan Umum Dokumen</label>
              <Input
                className="mt-1 h-9 text-xs"
                placeholder="Catatan tambahan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSubmitting ? "Menyimpan..." : editTarget ? "Perbarui QC-016-PLK" : "Simpan QC-016-PLK"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal View Detail */}
      {viewReport && (
        <Dialog open={!!viewReport} onOpenChange={(open) => !open && setViewReport(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center justify-between">
                <span>Detail QC-016-PLK (Revisi 01) — {viewReport.documentNo}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    viewReport.overallDecision === "lolos"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {viewReport.overallDecision === "lolos" ? "LOLOS" : "TIDAK LOLOS"}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs py-2">
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded border">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Bulan / Tanggal:</span>
                  <strong>{viewReport.checkDate}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Status Fairtrade:</span>
                  <strong>{viewReport.fairtradeStatus}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Paraf QC:</span>
                  <strong>{viewReport.qcInspectorName}</strong>
                </div>
              </div>

              {(viewReport.items || []).map((it, i) => (
                <div key={i} className="border rounded p-3 space-y-2">
                  <div className="flex justify-between font-semibold border-b pb-1">
                    <span>
                      {it.itemName} — Batch <span className="font-mono">{it.batchNo}</span>
                    </span>
                    <span className={it.itemDecision === "ditolak" ? "text-rose-600" : "text-emerald-700"}>
                      {it.itemDecision === "ditolak" ? "Tidak" : "Lolos"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700">
                    <div>Customer: <strong>{it.buyerName || "-"}</strong></div>
                    <div>Prod Date: <strong>{it.productionDate || "-"}</strong></div>
                    <div>Exp Date: <strong>{it.expiredDate || "-"}</strong></div>
                    <div>No Sticker: <strong>{it.stickerNo || "-"}</strong></div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {CHECK_PARAMS.map((p) => {
                      const ok = it[p.key] !== false;
                      return (
                        <span
                          key={p.key}
                          className={`text-[10px] px-2 py-0.5 rounded border ${
                            ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {ok ? "✓" : "✗"} {p.label}
                        </span>
                      );
                    })}
                  </div>
                  {it.notes && <div className="text-[11px] text-slate-600">Keterangan: {it.notes}</div>}
                </div>
              ))}
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handlePrintDocument(viewReport)}>
                  <Printer className="h-3.5 w-3.5" /> Cetak QC-016-PLK
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportPLKExcel(viewReport)}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
                </Button>
              </div>
              <Button variant="default" size="sm" onClick={() => setViewReport(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
