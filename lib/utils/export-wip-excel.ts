import ExcelJS from "exceljs";
import { ProductionOutputReportItem, HandoverReportItem } from "@/lib/api/manufacturing";
import { PackagingLabelCheckItem, ContainerChecklistItem } from "@/lib/api/qc";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

function triggerDownload(buffer: ExcelJS.Buffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Export Form PRO-002-LHP (Laporan Hasil Produksi)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportLHPExcel(report: ProductionOutputReportItem): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Laporan Hasil Produksi", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  // Header Manna
  ws.mergeCells("A2:C2");
  ws.getCell("A2").value = "CV. MANNA ANUGERAH SEJAHTERA";
  ws.getCell("A2").font = { name: "Arial", size: 10, bold: true };

  ws.mergeCells("A3:C3");
  ws.getCell("A3").value = "CU 820674 D-11 | 104464OC | FLO-ID 43683";
  ws.getCell("A3").font = { name: "Arial", size: 8 };

  ws.mergeCells("M2:O2");
  ws.getCell("M2").value = "PRO-002-LHP";
  ws.getCell("M2").font = { name: "Arial", size: 10, bold: true };
  ws.getCell("M2").alignment = { horizontal: "right" };

  // Title
  ws.mergeCells("A5:O5");
  ws.getCell("A5").value = "LAPORAN HASIL PRODUKSI ( LHP )";
  ws.getCell("A5").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A5").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A6:O6");
  ws.getCell("A6").value = `${report.fairtradeStatus.toUpperCase()} - ${report.certifications || "NATURAL"}`;
  ws.getCell("A6").font = { name: "Arial", size: 10, bold: true };
  ws.getCell("A6").alignment = { horizontal: "center", vertical: "middle" };

  // Metadata
  ws.getCell("A8").value = "No. LHP";
  ws.getCell("B8").value = `: ${report.reportNo}`;
  ws.getCell("H8").value = "Tanggal Packing";
  ws.getCell("I8").value = `: ${report.packingDate}`;

  ws.getCell("A9").value = "Jam Packing";
  ws.getCell("B9").value = `: Mulai: ${report.packingStartTime || "-"} s/d Selesai: ${report.packingEndTime || "-"}`;
  ws.getCell("H9").value = "Status";
  ws.getCell("I9").value = `: ${report.status.toUpperCase()}`;

  for (const addr of ["A8", "H8", "A9", "H9"]) {
    ws.getCell(addr).font = { name: "Arial", size: 9, bold: true };
  }

  // Table Headers
  // Row 11: Multi-column headers
  ws.mergeCells("A11:A12");
  ws.getCell("A11").value = "NO";
  ws.mergeCells("B11:B12");
  ws.getCell("B11").value = "KODE BAHAN";
  ws.mergeCells("C11:C12");
  ws.getCell("C11").value = "NAMA PRODUK";
  ws.mergeCells("D11:D12");
  ws.getCell("D11").value = "NO. BATCH";
  ws.mergeCells("E11:E12");
  ws.getCell("E11").value = "UNIT (PCS)";

  ws.mergeCells("F11:G11");
  ws.getCell("F11").value = "KEMASAN PRIMER";
  ws.getCell("F12").value = "JENIS";
  ws.getCell("G12").value = "KODE";

  ws.mergeCells("H11:I11");
  ws.getCell("H11").value = "KEMASAN SEKUNDER";
  ws.getCell("H12").value = "JENIS";
  ws.getCell("I12").value = "KODE";

  ws.mergeCells("J11:K11");
  ws.getCell("J11").value = "BERAT (KG)";
  ws.getCell("J12").value = "PER KEMASAN";
  ws.getCell("K12").value = "TOTAL (KG)";

  ws.mergeCells("L11:L12");
  ws.getCell("L11").value = "NOMOR STIKER";
  ws.mergeCells("M11:M12");
  ws.getCell("M11").value = "SISA (KG)";
  ws.mergeCells("N11:N12");
  ws.getCell("N11").value = "NAMA BUYER";
  ws.mergeCells("O11:O12");
  ws.getCell("O11").value = "KETERANGAN";

  const headerCells = [
    "A11", "B11", "C11", "D11", "E11", "F11", "H11", "J11", "L11", "M11", "N11", "O11",
    "F12", "G12", "H12", "I12", "J12", "K12",
  ];
  headerCells.forEach((addr) => {
    const c = ws.getCell(addr);
    c.font = { name: "Arial", size: 8, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = thinBorder;
  });

  let rowIdx = 13;
  const items = report.items || [];
  for (const it of items) {
    ws.getCell(`A${rowIdx}`).value = it.itemNo;
    ws.getCell(`B${rowIdx}`).value = it.rawMaterialCode;
    ws.getCell(`C${rowIdx}`).value = it.productName;
    ws.getCell(`D${rowIdx}`).value = it.batchNo;
    ws.getCell(`E${rowIdx}`).value = it.unitPcs;
    ws.getCell(`F${rowIdx}`).value = it.primaryPackagingType || "-";
    ws.getCell(`G${rowIdx}`).value = it.primaryPackagingCode || "-";
    ws.getCell(`H${rowIdx}`).value = it.secondaryPackagingType || "-";
    ws.getCell(`I${rowIdx}`).value = it.secondaryPackagingCode || "-";
    ws.getCell(`J${rowIdx}`).value = it.weightPerPackKg;
    ws.getCell(`K${rowIdx}`).value = it.totalWeightKg;
    ws.getCell(`L${rowIdx}`).value = it.stickerNo || "-";
    ws.getCell(`M${rowIdx}`).value = it.remainingStockKg || 0;
    ws.getCell(`N${rowIdx}`).value = it.buyerName || "-";
    ws.getCell(`O${rowIdx}`).value = it.notes || "-";

    for (let c = 1; c <= 15; c++) {
      const cell = ws.getRow(rowIdx).getCell(c);
      cell.border = thinBorder;
      cell.font = { name: "Arial", size: 8 };
      cell.alignment = { vertical: "middle" };
      if ([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(c)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  // Summary Row
  ws.mergeCells(`A${rowIdx}:D${rowIdx}`);
  ws.getCell(`A${rowIdx}`).value = "TOTAL REALISASI PACKING";
  ws.getCell(`A${rowIdx}`).font = { name: "Arial", size: 8, bold: true };
  ws.getCell(`A${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };

  ws.getCell(`E${rowIdx}`).value = report.totalQuantityPcs;
  ws.getCell(`E${rowIdx}`).font = { name: "Arial", size: 8, bold: true };
  ws.getCell(`E${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };

  ws.getCell(`K${rowIdx}`).value = report.totalWeightKg;
  ws.getCell(`K${rowIdx}`).font = { name: "Arial", size: 8, bold: true };
  ws.getCell(`K${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };

  for (let c = 1; c <= 15; c++) {
    const cell = ws.getRow(rowIdx).getCell(c);
    cell.border = thinBorder;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F9" } };
  }
  rowIdx += 2;

  // Evaluation Notes
  if (report.evaluationNotes) {
    ws.getCell(`A${rowIdx}`).value = `Evaluasi: ${report.evaluationNotes}`;
    ws.getCell(`A${rowIdx}`).font = { name: "Arial", size: 8, italic: true };
    rowIdx++;
  }

  // Signatures
  rowIdx++;
  ws.mergeCells(`B${rowIdx}:D${rowIdx}`);
  ws.getCell(`B${rowIdx}`).value = "Dibuat Oleh (Produksi)";
  ws.getCell(`B${rowIdx}`).font = { name: "Arial", size: 9, bold: true };
  ws.getCell(`B${rowIdx}`).alignment = { horizontal: "center" };

  ws.mergeCells(`L${rowIdx}:N${rowIdx}`);
  ws.getCell(`L${rowIdx}`).value = "Diketahui Oleh (Admin Produksi)";
  ws.getCell(`L${rowIdx}`).font = { name: "Arial", size: 9, bold: true };
  ws.getCell(`L${rowIdx}`).alignment = { horizontal: "center" };

  rowIdx += 3;
  ws.mergeCells(`B${rowIdx}:D${rowIdx}`);
  ws.getCell(`B${rowIdx}`).value = `${report.productionPic} (${report.productionSignDate || report.packingDate})`;
  ws.getCell(`B${rowIdx}`).font = { name: "Arial", size: 9 };
  ws.getCell(`B${rowIdx}`).alignment = { horizontal: "center" };

  ws.mergeCells(`L${rowIdx}:N${rowIdx}`);
  ws.getCell(`L${rowIdx}`).value = `${report.adminPic} (${report.adminSignDate || report.packingDate})`;
  ws.getCell(`L${rowIdx}`).font = { name: "Arial", size: 9 };
  ws.getCell(`L${rowIdx}`).alignment = { horizontal: "center" };

  ws.columns = [
    { width: 5 }, { width: 14 }, { width: 22 }, { width: 18 }, { width: 11 },
    { width: 14 }, { width: 12 }, { width: 16 }, { width: 12 }, { width: 13 },
    { width: 13 }, { width: 16 }, { width: 11 }, { width: 18 }, { width: 16 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-PRO-LHP-${report.reportNo}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Export Form GDG-009-LST (Laporan Serah Terima)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportLSTExcel(report: HandoverReportItem): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Laporan Serah Terima", {
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  // Header Manna
  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = "CV. Manna Anugerah Sejahtera";
  ws.getCell("A2").font = { name: "Arial", size: 11, bold: true };

  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = "CU 820674 D-11 | 104464OC | FLO-ID 43683";
  ws.getCell("A3").font = { name: "Arial", size: 8 };

  ws.mergeCells("H2:J2");
  ws.getCell("H2").value = "GDG-009-LST";
  ws.getCell("H2").font = { name: "Arial", size: 10, bold: true };
  ws.getCell("H2").alignment = { horizontal: "right" };

  // Title
  ws.mergeCells("A5:J5");
  ws.getCell("A5").value = "Laporan Serah Terima";
  ws.getCell("A5").font = { name: "Arial", size: 13, bold: true };
  ws.getCell("A5").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A6:J6");
  ws.getCell("A6").value = "(LST)";
  ws.getCell("A6").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A6").alignment = { horizontal: "center", vertical: "middle" };

  ws.getCell("A8").value = `${report.fairtradeStatus.toUpperCase()}*`;
  ws.getCell("A8").font = { name: "Arial", size: 9, bold: true };

  ws.getCell("A9").value = "Dari";
  ws.getCell("B9").value = `: ${report.fromDepartment}`;
  ws.getCell("G9").value = "Kepada";
  ws.getCell("H9").value = `: ${report.toDepartment}`;
  ws.getCell("A9").font = { name: "Arial", size: 9, bold: true };
  ws.getCell("G9").font = { name: "Arial", size: 9, bold: true };

  // Table Headers
  const headers = [
    { col: 1, label: "No" },
    { col: 2, label: "Nama Barang" },
    { col: 4, label: "Kode Barang" },
    { col: 6, label: "Nomor Batch" },
    { col: 7, label: "Unit (Kg)" },
    { col: 8, label: "Kemasan" },
    { col: 9, label: "Buyer" },
    { col: 10, label: "Jumlah (Pcs)" },
  ];

  ws.getRow(10).height = 24;
  ws.mergeCells("B10:C10");
  ws.mergeCells("D10:E10");

  for (const h of headers) {
    const c = ws.getRow(10).getCell(h.col);
    c.value = h.label;
    c.font = { name: "Arial", size: 8, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = thinBorder;
  }
  ws.getRow(10).getCell(3).border = thinBorder;
  ws.getRow(10).getCell(5).border = thinBorder;

  let rowIdx = 11;
  const items = report.items || [];
  for (const it of items) {
    ws.mergeCells(`B${rowIdx}:C${rowIdx}`);
    ws.mergeCells(`D${rowIdx}:E${rowIdx}`);

    ws.getCell(`A${rowIdx}`).value = it.itemNo;
    ws.getCell(`B${rowIdx}`).value = it.itemName;
    ws.getCell(`D${rowIdx}`).value = it.itemCode;
    ws.getCell(`F${rowIdx}`).value = it.batchNo;
    ws.getCell(`G${rowIdx}`).value = it.unitKg;
    ws.getCell(`H${rowIdx}`).value = it.packaging;
    ws.getCell(`I${rowIdx}`).value = it.buyerName || "-";
    ws.getCell(`J${rowIdx}`).value = it.quantityPcs;

    for (let c = 1; c <= 10; c++) {
      const cell = ws.getRow(rowIdx).getCell(c);
      cell.border = thinBorder;
      cell.font = { name: "Arial", size: 8 };
      cell.alignment = { vertical: "middle" };
      if ([1, 4, 6, 7, 8, 10].includes(c)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  // Catatan & Signatures
  rowIdx++;
  ws.getCell(`A${rowIdx}`).value = `Catatan : ${report.notes || "-"}`;
  ws.getCell(`A${rowIdx}`).font = { name: "Arial", size: 8, italic: true };

  ws.getCell(`F${rowIdx}`).value = "Diserahkan Oleh";
  ws.mergeCells(`G${rowIdx}:H${rowIdx}`);
  ws.getCell(`G${rowIdx}`).value = "Diverifikasi Oleh";
  ws.mergeCells(`I${rowIdx}:J${rowIdx}`);
  ws.getCell(`I${rowIdx}`).value = "Diterima Oleh";

  for (const c of [6, 7, 9]) {
    ws.getRow(rowIdx).getCell(c).font = { name: "Arial", size: 8, bold: true };
    ws.getRow(rowIdx).getCell(c).alignment = { horizontal: "center" };
  }

  rowIdx++;
  ws.getCell(`F${rowIdx}`).value = `Tgl: ${report.handedOverSignDate || report.handoverDate}`;
  ws.mergeCells(`G${rowIdx}:H${rowIdx}`);
  ws.getCell(`G${rowIdx}`).value = `Tgl: ${report.verifiedSignDate || "-"}`;
  ws.mergeCells(`I${rowIdx}:J${rowIdx}`);
  ws.getCell(`I${rowIdx}`).value = `Tgl: ${report.receivedSignDate || "-"}`;

  for (const c of [6, 7, 9]) {
    ws.getRow(rowIdx).getCell(c).font = { name: "Arial", size: 7 };
    ws.getRow(rowIdx).getCell(c).alignment = { horizontal: "center" };
  }

  rowIdx += 3;
  ws.getCell(`F${rowIdx}`).value = `${report.handedOverBy}\n(Produksi)`;
  ws.mergeCells(`G${rowIdx}:H${rowIdx}`);
  ws.getCell(`G${rowIdx}`).value = `${report.verifiedByQc || "-"}\n(QC)`;
  ws.mergeCells(`I${rowIdx}:J${rowIdx}`);
  ws.getCell(`I${rowIdx}`).value = `${report.receivedByWarehouse || "-"}\n(Gudang)`;

  for (const c of [6, 7, 9]) {
    ws.getRow(rowIdx).getCell(c).font = { name: "Arial", size: 8, bold: true };
    ws.getRow(rowIdx).getCell(c).alignment = { horizontal: "center", wrapText: true };
  }

  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value = "*pilih salah satu yang sesuai | Revisi 00";
  ws.getCell(`A${rowIdx}`).font = { name: "Arial", size: 7, italic: true };

  ws.columns = [
    { width: 5 }, { width: 16 }, { width: 14 }, { width: 12 }, { width: 10 },
    { width: 18 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 12 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-GDG-LST-${report.reportNo}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Export Form QC-018-PLK (Pemeriksaan Label Kemasan QC)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportPLKExcel(report: PackagingLabelCheckItem): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Pemeriksaan Label Kemasan", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  // Header Manna
  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = "CV. Manna Anugerah Sejahtera";
  ws.getCell("A2").font = { name: "Arial", size: 11, bold: true };

  ws.mergeCells("M2:O2");
  ws.getCell("M2").value = "QC-018-PLK";
  ws.getCell("M2").font = { name: "Arial", size: 10, bold: true };
  ws.getCell("M2").alignment = { horizontal: "right" };

  // Title
  ws.mergeCells("A5:O5");
  ws.getCell("A5").value = "Form Pemeriksaan Label Kemasan QC (PLK)";
  ws.getCell("A5").font = { name: "Arial", size: 13, bold: true };
  ws.getCell("A5").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A6:O6");
  ws.getCell("A6").value = `${report.fairtradeStatus.toUpperCase()} - ${report.certification || "NATURAL"}`;
  ws.getCell("A6").font = { name: "Arial", size: 10, bold: true };
  ws.getCell("A6").alignment = { horizontal: "center", vertical: "middle" };

  ws.getCell("A8").value = "No. Dokumen";
  ws.getCell("B8").value = `: ${report.documentNo}`;
  ws.getCell("H8").value = "Tanggal Periksa";
  ws.getCell("I8").value = `: ${report.checkDate}`;

  ws.getCell("A9").value = "No. Batch";
  ws.getCell("B9").value = `: ${report.batchNo || "-"}`;
  ws.getCell("H9").value = "Keputusan QC";
  ws.getCell("I9").value = `: ${report.overallDecision.toUpperCase()}`;

  for (const addr of ["A8", "H8", "A9", "H9"]) {
    ws.getCell(addr).font = { name: "Arial", size: 9, bold: true };
  }

  // Table Headers
  const headerCols = [
    "No", "Nama Barang", "Kode Barang", "Nomor Batch", "Buyer", "Kemasan",
    "No. Stiker", "Batch Sesuai", "Exp Date", "Logo Sertifikasi", "Kualitas Cetak",
    "Posisi Rapi", "Diperiksa", "Lolos", "Keputusan",
  ];

  ws.getRow(11).height = 24;
  headerCols.forEach((title, i) => {
    const colNum = i + 1;
    const c = ws.getRow(11).getCell(colNum);
    c.value = title;
    c.font = { name: "Arial", size: 8, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = thinBorder;
  });

  let rowIdx = 12;
  const items = report.items || [];
  for (const it of items) {
    ws.getCell(`A${rowIdx}`).value = it.itemNo;
    ws.getCell(`B${rowIdx}`).value = it.itemName;
    ws.getCell(`C${rowIdx}`).value = it.itemCode;
    ws.getCell(`D${rowIdx}`).value = it.batchNo;
    ws.getCell(`E${rowIdx}`).value = it.buyerName || "-";
    ws.getCell(`F${rowIdx}`).value = it.packagingType || "-";
    ws.getCell(`G${rowIdx}`).value = it.stickerNo || "-";
    ws.getCell(`H${rowIdx}`).value = it.isBatchMatch ? "Sesuai" : "Tdk Sesuai";
    ws.getCell(`I${rowIdx}`).value = it.isExpiryMatch ? "Sesuai" : "Tdk Sesuai";
    ws.getCell(`J${rowIdx}`).value = it.isCertLogoMatch ? "Sesuai" : "Tdk Sesuai";
    ws.getCell(`K${rowIdx}`).value = it.isPrintQualityGood ? "Baik" : "Cacat";
    ws.getCell(`L${rowIdx}`).value = it.isPositionAligned ? "Rapi" : "Miring";
    ws.getCell(`M${rowIdx}`).value = it.inspectedQty;
    ws.getCell(`N${rowIdx}`).value = it.passedQty;
    ws.getCell(`O${rowIdx}`).value = it.itemDecision.toUpperCase();

    for (let c = 1; c <= 15; c++) {
      const cell = ws.getRow(rowIdx).getCell(c);
      cell.border = thinBorder;
      cell.font = { name: "Arial", size: 8 };
      cell.alignment = { vertical: "middle" };
      if ([1, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(c)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  // Signatures
  rowIdx += 2;
  ws.mergeCells(`B${rowIdx}:D${rowIdx}`);
  ws.getCell(`B${rowIdx}`).value = "Diperiksa Oleh (QC Inspector)";
  ws.getCell(`B${rowIdx}`).font = { name: "Arial", size: 8, bold: true };
  ws.getCell(`B${rowIdx}`).alignment = { horizontal: "center" };

  ws.mergeCells(`L${rowIdx}:N${rowIdx}`);
  ws.getCell(`L${rowIdx}`).value = "Diverifikasi Oleh (QC Supervisor / QA)";
  ws.getCell(`L${rowIdx}`).font = { name: "Arial", size: 8, bold: true };
  ws.getCell(`L${rowIdx}`).alignment = { horizontal: "center" };

  rowIdx += 3;
  ws.mergeCells(`B${rowIdx}:D${rowIdx}`);
  ws.getCell(`B${rowIdx}`).value = `${report.qcInspectorName} (${report.qcInspectorSignDate || report.checkDate})`;
  ws.getCell(`B${rowIdx}`).font = { name: "Arial", size: 8 };
  ws.getCell(`B${rowIdx}`).alignment = { horizontal: "center" };

  ws.mergeCells(`L${rowIdx}:N${rowIdx}`);
  ws.getCell(`L${rowIdx}`).value = `${report.qcSupervisorName || "-"} (${report.qcSupervisorSignDate || "-"})`;
  ws.getCell(`L${rowIdx}`).font = { name: "Arial", size: 8 };
  ws.getCell(`L${rowIdx}`).alignment = { horizontal: "center" };

  ws.columns = [
    { width: 5 }, { width: 18 }, { width: 12 }, { width: 16 }, { width: 16 },
    { width: 14 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 },
    { width: 12 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 12 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-PLK-${report.documentNo}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Export Form QC-008-CCO.02 (Checklist Container)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportCCOExcel(report: ContainerChecklistItem): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Checklist Container", {
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  // Header & Title
  ws.mergeCells("A2:B2");
  ws.getCell("A2").value = "CV. Manna Anugerah Sejahtera";
  ws.getCell("A2").font = { name: "Arial", size: 10, bold: true };

  ws.mergeCells("E2:F2");
  ws.getCell("E2").value = "Form QC-008-CCO. 02";
  ws.getCell("E2").font = { name: "Arial", size: 9, bold: true };
  ws.getCell("E2").alignment = { horizontal: "right" };

  ws.mergeCells("A4:F4");
  ws.getCell("A4").value = "Checklist Container (CCO)";
  ws.getCell("A4").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };

  let r = 6;
  const sectionHeader = (title: string) => {
    ws.mergeCells(`A${r}:F${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = title;
    c.font = { name: "Arial", size: 9, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4F8" } };
    c.border = thinBorder;
    r++;
  };

  const addRow = (label1: string, val1: string, label2?: string, val2?: string) => {
    ws.getCell(`A${r}`).value = label1;
    ws.getCell(`A${r}`).font = { name: "Arial", size: 8, bold: true };
    ws.mergeCells(`B${r}:C${r}`);
    ws.getCell(`B${r}`).value = `: ${val1}`;
    ws.getCell(`B${r}`).font = { name: "Arial", size: 8 };

    if (label2) {
      ws.getCell(`D${r}`).value = label2;
      ws.getCell(`D${r}`).font = { name: "Arial", size: 8, bold: true };
      ws.mergeCells(`E${r}:F${r}`);
      ws.getCell(`E${r}`).value = `: ${val2 || "-"}`;
      ws.getCell(`E${r}`).font = { name: "Arial", size: 8 };
    }
    r++;
  };

  // 1. Identitas Pengemudi & Armada
  sectionHeader("1. Identitas Pengemudi & Kendaraan");
  addRow("No. Dokumen CCO", report.documentNo, "Tanggal Periksa", report.checkDate);
  addRow("Nama Pengemudi", report.driverName, "KTP / SIM", `${report.idCardType} - ${report.idCardNumber}`);
  addRow("Nopol Truk", report.vehicleLicensePlate, "Perusahaan Ekspedisi", report.transporterCompany);
  addRow("Tempat/Tgl Lahir", report.birthDetails || "-", "Masa Berlaku Kartu", report.cardValidity || "-");

  // 2. Data Kontainer
  sectionHeader("2. Data Kontainer & Segel Pengapalan");
  addRow("Nama Kontainer / Line", report.containerName, "Nomor Kontainer", report.containerNumber);
  addRow("Ukuran Kontainer", report.containerSize, "Nomor Seal / CAP", report.sealNumber);
  addRow("Shipping Instruction (SI)", report.shippingInstructionNo || "-", "EIR / No. E/R", `${report.eirNumber || "-"} / ${report.erNumber || "-"}`);
  addRow("Tujuan Pengiriman", report.shipmentDestination, "Pallet", report.palletDetails || "-");

  // 3. Inspeksi Keamanan
  sectionHeader("3. Pemeriksaan Barang / Bahan Mencurigakan");
  addRow("Ruang Kemudi", report.cabinAreaStatus.toUpperCase(), "Bawah Kendaraan", report.underVehicleStatus.toUpperCase());
  addRow("Bagian Dalam Kontainer", report.insideContainerStatus.toUpperCase(), "Catatan Temuan", report.suspiciousNotes || "Aman");

  // 4. Kebersihan Kontainer (5 Sisi)
  sectionHeader("4. Kebersihan Ruang Dalam Kontainer (Bebas cairan/padatan/noda)");
  addRow("Lantai", report.floorCleanliness.toUpperCase(), "Atap", report.roofCleanliness.toUpperCase());
  addRow("Dinding Kanan", report.rightWallCleanliness.toUpperCase(), "Dinding Kiri", report.leftWallCleanliness.toUpperCase());
  addRow("Pintu", report.doorCleanliness.toUpperCase(), "Catatan Kebersihan", report.cleanlinessNotes || "Bersih");

  // 5. Uji Lubang Bocor Cahaya & Air (Posisi Pintu Tertutup Rapat)
  sectionHeader("5. Uji Lubang / Celah Bocor Cahaya (Pintu Tertutup Rapat)");
  addRow("Lantai", report.floorHoleStatus.toUpperCase(), "Atap", report.roofHoleStatus.toUpperCase());
  addRow("Dinding Kanan", report.rightWallHoleStatus.toUpperCase(), "Dinding Kiri", report.leftWallHoleStatus.toUpperCase());
  addRow("Pintu", report.doorHoleStatus.toUpperCase(), "Catatan Uji Lubang", report.holeNotes || "Rapat / Kedap");

  // 6. Timestamps & Keputusan
  sectionHeader("6. Waktu Pelaksanaan & Keputusan Akhir");
  addRow("Jam Segel Dipasang", report.sealTime || "-", "Jam CAP Dipasang", report.capTime || "-");
  addRow("Jam Berangkat Truk", report.departureTime || "-", "STATUS KELAYAKAN", report.overallDecision.toUpperCase());

  r++;
  ws.mergeCells(`A${r}:C${r}`);
  ws.getCell(`A${r}`).value = "Dibuat Oleh (QC)";
  ws.getCell(`A${r}`).font = { name: "Arial", size: 8, bold: true };
  ws.getCell(`A${r}`).alignment = { horizontal: "center" };

  ws.mergeCells(`D${r}:F${r}`);
  ws.getCell(`D${r}`).value = "Diverifikasi Oleh (QA)";
  ws.getCell(`D${r}`).font = { name: "Arial", size: 8, bold: true };
  ws.getCell(`D${r}`).alignment = { horizontal: "center" };

  r += 3;
  ws.mergeCells(`A${r}:C${r}`);
  ws.getCell(`A${r}`).value = `${report.inspectorQc}\nTgl: ${report.qcSignDate || report.checkDate}`;
  ws.getCell(`A${r}`).font = { name: "Arial", size: 8 };
  ws.getCell(`A${r}`).alignment = { horizontal: "center", wrapText: true };

  ws.mergeCells(`D${r}:F${r}`);
  ws.getCell(`D${r}`).value = `${report.verifierQa}\nTgl: ${report.qaSignDate || report.checkDate}`;
  ws.getCell(`D${r}`).font = { name: "Arial", size: 8 };
  ws.getCell(`D${r}`).alignment = { horizontal: "center", wrapText: true };

  ws.columns = [
    { width: 22 }, { width: 18 }, { width: 14 }, { width: 20 }, { width: 16 }, { width: 16 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-CCO-${report.documentNo}.xlsx`);
}
