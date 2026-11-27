import ExcelJS from "exceljs";
import {
  IncomingCheckItem,
  SievingMonitoringItem,
  MagnetTrapItem,
  MeshBoltMonitoringItem,
  OvenMonitoringItem,
  NeedleMonitoringItem,
  ScissorMonitoringItem,
  MetalCleaningItem,
  MetalVerificationItem,
  FinishedGoodsInspectionItem,
  FilterMeshMonitoringItem,
  BrontolBladeMonitoringItem,
} from "../api/qc";

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
// 1. Export Form QC-009-MNA.01 (Monitoring Proses Ayak)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportMNAExcel(data: SievingMonitoringItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Monitoring Proses Ayak", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  // Header Title
  ws.mergeCells("A2:N2");
  ws.getCell("A2").value = "MONITORING PROSES AYAK";
  ws.getCell("A2").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:N3");
  ws.getCell("A3").value = "(MNA) • Form-QC-009-MNA. 01";
  ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  // Metadata Row 5
  const sample = data[0];
  ws.getCell("A5").value = `No Mesin : ${sample?.machineNo || "Semua Mesin"}`;
  ws.getCell("A5").font = { name: "Arial", size: 10, bold: true };

  ws.getCell("K5").value = `Bulan/Tahun : ${sample?.checkMonth || new Date().toISOString().slice(0, 7)}`;
  ws.getCell("K5").font = { name: "Arial", size: 10, bold: true };

  // Multi-tier Table Header
  // Row 6: Main headers
  ws.mergeCells("A6:A7");
  ws.getCell("A6").value = "HARI/ TANGGAL";
  ws.mergeCells("B6:B7");
  ws.getCell("B6").value = "PRODUK";
  ws.mergeCells("C6:C7");
  ws.getCell("C6").value = "KODE PRODUK";
  ws.mergeCells("D6:D7");
  ws.getCell("D6").value = "Oven/ Mentah";
  ws.mergeCells("E6:E7");
  ws.getCell("E6").value = "Tgl. Oven";
  ws.mergeCells("F6:F7");
  ws.getCell("F6").value = "MESH";

  // AWAL
  ws.mergeCells("G6:J6");
  ws.getCell("G6").value = "AWAL";
  ws.getCell("G7").value = "KONDISI*";
  ws.getCell("H7").value = "TEMUAN";
  ws.getCell("I7").value = "TINDAKAN";
  ws.getCell("J7").value = "PIC / QC";

  // AKHIR
  ws.mergeCells("K6:N6");
  ws.getCell("K6").value = "AKHIR";
  ws.getCell("K7").value = "KONDISI*";
  ws.getCell("L7").value = "TEMUAN";
  ws.getCell("M7").value = "TINDAKAN";
  ws.getCell("N7").value = "PIC / QC";

  for (let r = 6; r <= 7; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Arial", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFEFEF" },
      };
    }
  }

  // Data rows
  let rowIdx = 8;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.productName;
    row.getCell(3).value = item.batchNo;
    row.getCell(4).value = item.category;
    row.getCell(5).value = item.ovenDate || "-";
    row.getCell(6).value = item.meshSize;

    row.getCell(7).value = item.initialCondition;
    row.getCell(8).value = item.initialFindings || "-";
    row.getCell(9).value = item.initialAction || "-";
    row.getCell(10).value = `${item.initialPicName}${item.initialQcName ? ` / ${item.initialQcName}` : ""}`;

    row.getCell(11).value = item.finalCondition;
    row.getCell(12).value = item.finalFindings || "-";
    row.getCell(13).value = item.finalAction || "-";
    row.getCell(14).value = `${item.finalPicName}${item.finalQcName ? ` / ${item.finalQcName}` : ""}`;

    row.font = { name: "Arial", size: 9 };
    for (let c = 1; c <= 14; c++) {
      row.getCell(c).border = thinBorder;
    }
    rowIdx++;
  }

  // Footer notes
  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value =
    "Keterangan : - Pengecekan dilakukan setiap awal dan akhir proses ayak dan setiap pergantian kode bahan";
  ws.getCell(`A${rowIdx + 1}`).value =
    " - Catat kondisi alat dan mesh ayakan sesuai keadaan sebenarnya";
  ws.getCell(`A${rowIdx + 2}`).value =
    " - Tulis tindakan yang dilakukan jika terdapat temuan dan kondisi yang tidak sesuai";
  ws.getCell(`A${rowIdx + 3}`).value =
    " - Tulis nama PIC beserta paraf proses ayak dan diverifikasi oleh QC/QA";

  for (let i = 0; i < 4; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Arial", size: 8, italic: true };
  }

  // Widths
  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 24;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 10;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 16;
  ws.getColumn(9).width = 16;
  ws.getColumn(10).width = 16;
  ws.getColumn(11).width = 14;
  ws.getColumn(12).width = 16;
  ws.getColumn(13).width = 16;
  ws.getColumn(14).width = 16;

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-009-MNA-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Export Form QC-038-CMT (Catatan Pemakaian Magnet Trap)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportCMTExcel(data: MagnetTrapItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Catatan Magnet Trap", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  // Header Title
  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "CATATAN PEMAKAIAN MAGNET TRAP";
  ws.getCell("A1").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = "(CMT) • Form-QC-038-CMT";
  ws.getCell("A2").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  const sample = data[0];
  ws.getCell("A3").value = `Bulan/Tahun : ${sample?.checkMonth || new Date().toISOString().slice(0, 7)}`;
  ws.getCell("E3").value = `Ruangan : ${sample?.room || "Ayak Mentah"}`;
  ws.getCell("H3").value = `No Mesin : ${sample?.machineNo || "Semua Mesin"}`;
  ws.getCell("A4").value = `Penanggung Jawab : ${sample?.picResponsible || "-"}`;

  for (let r = 3; r <= 4; r++) {
    ws.getRow(r).font = { name: "Arial", size: 9, bold: true };
  }

  // Headers (Row 5 & 6)
  ws.mergeCells("A5:A6");
  ws.getCell("A5").value = "HARI / TANGGAL";
  ws.mergeCells("B5:B6");
  ws.getCell("B5").value = "KONDISI (√/x)";

  ws.mergeCells("C5:E5");
  ws.getCell("C5").value = "HASIL TEST GAUSS METER (mT)";
  ws.getCell("C6").value = "Titik 1";
  ws.getCell("D6").value = "Titik 2";
  ws.getCell("E6").value = "Titik 3";

  ws.mergeCells("F5:F6");
  ws.getCell("F5").value = "Benda Asing yang Menempel";
  ws.mergeCells("G5:G6");
  ws.getCell("G5").value = "PERMASALAHAN";
  ws.mergeCells("H5:H6");
  ws.getCell("H5").value = "TINDAKAN";
  ws.mergeCells("I5:I6");
  ws.getCell("I5").value = "NAMA / PARAF PIC";
  ws.mergeCells("J5:J6");
  ws.getCell("J5").value = "PARAF QC";

  for (let r = 5; r <= 6; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Arial", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 10; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    }
  }

  // Data rows
  let rowIdx = 7;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.isClean ? "√" : "x";
    row.getCell(3).value = item.gaussPoint1;
    row.getCell(4).value = item.gaussPoint2;
    row.getCell(5).value = item.gaussPoint3;
    row.getCell(6).value = item.foreignMatterFound || "-";
    row.getCell(7).value = item.issues || "-";
    row.getCell(8).value = item.actionTaken || "-";
    row.getCell(9).value = item.picName;
    row.getCell(10).value = item.qcName || (item.qcPassed ? "Passed" : "-");

    row.font = { name: "Arial", size: 9 };
    for (let c = 1; c <= 10; c++) {
      row.getCell(c).border = thinBorder;
    }
    rowIdx++;
  }

  // SOP Notes
  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value =
    "Keterangan : - Pengecekan dilakukan setiap hari sebelum alat digunakan";
  ws.getCell(`A${rowIdx + 1}`).value =
    "- Kondisi magnet trap beri tanda (√) jika bersih dan tanda (x) jika kotor";
  ws.getCell(`A${rowIdx + 2}`).value =
    "- Catat jumlah temuan benda yang menempel";
  ws.getCell(`A${rowIdx + 3}`).value =
    "- Jika kekuatan magnet < 7000 Gauss atau < 700 mT maka laporkan ke QC untuk mengganti magnet";
  ws.getCell(`A${rowIdx + 4}`).value = "- 1 mT = 10 Gauss";

  for (let i = 0; i < 5; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Arial", size: 8, italic: true };
  }

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 24;
  ws.getColumn(7).width = 20;
  ws.getColumn(8).width = 20;
  ws.getColumn(9).width = 16;
  ws.getColumn(10).width = 16;

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-038-CMT-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Form-QC-011 Multi-Form Suite Exporters (MNM, MNB, MBB, MPB, MNP, MMV, MNJ, MNG)
// ─────────────────────────────────────────────────────────────────────────────

export function populateMNJSheet(ws: ExcelJS.Worksheet, data: NeedleMonitoringItem[], month?: string): void {
  ws.views = [{ showGridLines: true }];
  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = "Monitoring Kondisi Jarum";
  ws.getCell("A2").font = { name: "Calibri", size: 14, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:L3");
  ws.getCell("A3").value = "(MNJ)";
  ws.getCell("A3").font = { name: "Calibri", size: 11, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  const sample = data[0];
  const mLabel = month || sample?.checkMonth || new Date().toISOString().slice(0, 7);
  const [yr, mo] = mLabel.split("-");
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const moName = mo ? monthNames[parseInt(mo, 10) - 1] || mo : "Desember";

  ws.getCell("A4").value = `Bulan : ${moName}`;
  ws.getCell("D4").value = `Tahun : ${yr || "2026"}`;
  ws.getCell("I4").value = `Penanggung Jawab : ${sample?.picResponsible || "Roji"}`;
  ws.getRow(4).font = { name: "Calibri", size: 10, bold: true };

  ws.mergeCells("A5:A6");
  ws.getCell("A5").value = "Tanggal Periksa";
  ws.mergeCells("B5:B6");
  ws.getCell("B5").value = "No Mesin Jahit";

  ws.mergeCells("C5:F5");
  ws.getCell("C5").value = "Pengecekan Awal";
  ws.getCell("C6").value = "Ada/ Tidak";
  ws.getCell("D6").value = "Baik/ Rusak/ Patah";
  ws.getCell("E6").value = "Hasil Analisa";
  ws.getCell("F6").value = "Tindakan Perbaikan";

  ws.mergeCells("G5:J5");
  ws.getCell("G5").value = "Pengecekan Akhir";
  ws.getCell("G6").value = "Ada/ Tidak";
  ws.getCell("H6").value = "Baik/ Rusak/ Patah";
  ws.getCell("I6").value = "Hasil Analisa";
  ws.getCell("J6").value = "Tindakan Perbaikan";

  ws.mergeCells("K5:K6");
  ws.getCell("K5").value = " Jarum di R. Packing";
  ws.mergeCells("L5:L6");
  ws.getCell("L5").value = "Nama / Paraf PIC";

  for (let r = 5; r <= 6; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Calibri", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 12; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    }
  }

  let rowIdx = 7;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.sewingMachineNo;
    row.getCell(3).value = item.initialIsPresent ? "Ada" : "Tidak";
    row.getCell(4).value = item.initialCondition;
    row.getCell(5).value = item.initialAnalysis || "-";
    row.getCell(6).value = item.initialAction || "-";
    row.getCell(7).value = item.finalIsPresent ? "Ada" : "Tidak";
    row.getCell(8).value = item.finalCondition;
    row.getCell(9).value = item.finalAnalysis || "-";
    row.getCell(10).value = item.finalAction || "-";
    row.getCell(11).value = item.needleStockInRoom;
    row.getCell(12).value = item.picName;

    row.font = { name: "Calibri", size: 9 };
    for (let c = 1; c <= 12; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { vertical: "middle" };
      if ([1, 2, 3, 4, 7, 8, 11, 12].includes(c)) {
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  rowIdx += 1;
  ws.getCell(`A${rowIdx}`).value = "Catatan: • Pengecekan dilakukan sebelum dan setelah proses penjahitan";
  ws.getCell(`A${rowIdx + 1}`).value = "• Pengecekan kondisi dilakukan secara visual dan pengecekan jumlah jarum yang ada di ruang packing";
  ws.getCell(`A${rowIdx + 2}`).value = "• Catat hasil analisa dan tindakan perbaikan jika jarum tidak ada, rusak atau patah.";
  for (let i = 0; i < 3; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Calibri", size: 8, italic: true };
  }

  const widths = [12, 14, 10, 14, 18, 18, 10, 14, 18, 18, 14, 16];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
}

export function populateMNGSheet(ws: ExcelJS.Worksheet, data: ScissorMonitoringItem[], month?: string): void {
  ws.views = [{ showGridLines: true }];
  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "Monitoring Kondisi Gunting";
  ws.getCell("A1").font = { name: "Calibri", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = "(MNG)";
  ws.getCell("A2").font = { name: "Calibri", size: 11, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  const sample = data[0];
  ws.getCell("A3").value = "Lokasi";
  ws.getCell("B3").value = `: ${sample?.location || "Ruang Packing"}`;
  ws.getCell("E3").value = `Bulan/Tahun :`;
  ws.getCell("F3").value = month || sample?.checkMonth || new Date().toISOString().slice(0, 7);
  ws.getCell("I3").value = `Penanggung Jawab : ${sample?.picResponsible || "Roji"}`;
  ws.getRow(3).font = { name: "Calibri", size: 10, bold: true };

  ws.mergeCells("A4:A5");
  ws.getCell("A4").value = "Tanggal Periksa";

  ws.mergeCells("B4:E4");
  ws.getCell("B4").value = "Pengecekan Awal";
  ws.getCell("B5").value = "Jumlah Gunting";
  ws.getCell("C5").value = "Baik/ Rusak/ Patah";
  ws.getCell("D5").value = "Hasil Analisa";
  ws.getCell("E5").value = "Tindakan Perbaikan";

  ws.mergeCells("F4:I4");
  ws.getCell("F4").value = "Pengecekan Akhir";
  ws.getCell("F5").value = "Jumlah Gunting";
  ws.getCell("G5").value = "Baik/ Rusak/ Patah";
  ws.getCell("H5").value = "Hasil Analisa";
  ws.getCell("I5").value = "Tindakan Perbaikan";

  ws.mergeCells("J4:J5");
  ws.getCell("J4").value = "Nama / Paraf PIC";

  for (let r = 4; r <= 5; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Calibri", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 10; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    }
  }

  let rowIdx = 6;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.initialCount;
    row.getCell(3).value = item.initialCondition;
    row.getCell(4).value = item.initialAnalysis || "-";
    row.getCell(5).value = item.initialAction || "-";
    row.getCell(6).value = item.finalCount;
    row.getCell(7).value = item.finalCondition;
    row.getCell(8).value = item.finalAnalysis || "-";
    row.getCell(9).value = item.finalAction || "-";
    row.getCell(10).value = item.picName;

    row.font = { name: "Calibri", size: 9 };
    for (let c = 1; c <= 10; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { vertical: "middle" };
      if ([1, 2, 3, 6, 7, 10].includes(c)) {
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  rowIdx += 1;
  ws.getCell(`A${rowIdx}`).value = "Catatan: • Pengecekan dilakukan setiap hari pagi (awal) dan sore hari (akhir)";
  ws.getCell(`A${rowIdx + 1}`).value = "• Pengecekan kondisi dilakukan secara visual dan pengecekan jumlah gunting yang ada di area kerja/lokasi";
  ws.getCell(`A${rowIdx + 2}`).value = "• Catat hasil analisa dan tindakan perbaikan jika gunting tidak ada, rusak atau patah.";
  for (let i = 0; i < 3; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Calibri", size: 8, italic: true };
  }

  const widths = [14, 12, 14, 18, 18, 12, 14, 18, 18, 16];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
}

export function populateMNPSheet(ws: ExcelJS.Worksheet, data: FilterMeshMonitoringItem[], month?: string): void {
  ws.views = [{ showGridLines: true }];
  ws.mergeCells("A1:N1");
  ws.getCell("A1").value = "Monitoring Proses Penyaringan ";
  ws.getCell("A1").font = { name: "Calibri", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A2:N2");
  ws.getCell("A2").value = "(MNP)";
  ws.getCell("A2").font = { name: "Calibri", size: 11, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  const sample = data[0];
  const mLabel = month || sample?.checkMonth || new Date().toISOString().slice(0, 7);
  const [yr, mo] = mLabel.split("-");
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const moName = mo ? monthNames[parseInt(mo, 10) - 1] || mo : "Desember";

  ws.getCell("A3").value = `Bulan : ${moName}`;
  ws.getCell("D3").value = `Tahun : ${yr || "2026"}`;
  ws.getCell("G3").value = `Lokasi : Ruang Gula Cair`;
  ws.getCell("L3").value = `PIC: ${sample?.picResponsible || "Sajiman"}`;
  ws.getRow(3).font = { name: "Calibri", size: 10, bold: true };

  ws.mergeCells("A4:A5");
  ws.getCell("A4").value = "Hari/Tanggal";
  ws.mergeCells("B4:B5");
  ws.getCell("B4").value = "Produk";
  ws.mergeCells("C4:C5");
  ws.getCell("C4").value = "Kode Produk";
  ws.mergeCells("D4:D5");
  ws.getCell("D4").value = "Mesh";

  ws.mergeCells("E4:G4");
  ws.getCell("E4").value = "Pengecekan Awal";
  ws.getCell("E5").value = "Kondisi";
  ws.getCell("F5").value = "Temuan";
  ws.getCell("G5").value = "Tindakan Perbaikan";

  ws.mergeCells("H4:H5");
  ws.getCell("H4").value = "Nama/Paraf PIC";
  ws.mergeCells("I4:I5");
  ws.getCell("I4").value = "Paraf QC";

  ws.mergeCells("J4:L4");
  ws.getCell("J4").value = "Pengecekan Akhir";
  ws.getCell("J5").value = "Kondisi";
  ws.getCell("K5").value = "Temuan";
  ws.getCell("L5").value = "Tindakan Perbaikan";

  ws.mergeCells("M4:M5");
  ws.getCell("M4").value = "Nama/Paraf PIC";
  ws.mergeCells("N4:N5");
  ws.getCell("N4").value = "Paraf QC";

  for (let r = 4; r <= 5; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Calibri", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 14; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    }
  }

  let rowIdx = 6;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.productName;
    row.getCell(3).value = item.productCode || "-";
    row.getCell(4).value = item.meshSize;
    row.getCell(5).value = item.initialCondition;
    row.getCell(6).value = item.initialFindings || "-";
    row.getCell(7).value = item.initialAction || "-";
    row.getCell(8).value = item.initialPicName;
    row.getCell(9).value = item.initialQcName || "QC";
    row.getCell(10).value = item.finalCondition;
    row.getCell(11).value = item.finalFindings || "-";
    row.getCell(12).value = item.finalAction || "-";
    row.getCell(13).value = item.finalPicName;
    row.getCell(14).value = item.finalQcName || "QC";

    row.font = { name: "Calibri", size: 9 };
    for (let c = 1; c <= 14; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { vertical: "middle" };
      if ([1, 4, 5, 8, 9, 10, 13, 14].includes(c)) {
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  rowIdx += 1;
  ws.getCell(`A${rowIdx}`).value = "Catatan: • Pengecekan dilakukan setiap awal dan akhir proses penyaringan dan setiap pergantian kode bahan";
  ws.getCell(`A${rowIdx + 1}`).value = "• Catat kondisi alat dan mesh penyaringan sesuai dengan keadaan sebenarnya";
  ws.getCell(`A${rowIdx + 2}`).value = "• Tulis tindakan yang dilakukan jika terdapat temuan dan kondisi yang tidak sesuai";
  for (let i = 0; i < 3; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Calibri", size: 8, italic: true };
  }

  const widths = [14, 18, 14, 10, 12, 16, 18, 14, 12, 12, 16, 18, 14, 12];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
}

export function populateMNBSheet(ws: ExcelJS.Worksheet, data: MeshBoltMonitoringItem[], month?: string): void {
  ws.views = [{ showGridLines: true }];
  ws.mergeCells("A3:K3");
  ws.getCell("A3").value = "Monitoring Kondisi Mur Baut & Ring Pada Tangki Gula Cair ";
  ws.getCell("A3").font = { name: "Calibri", size: 14, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A4:K4");
  ws.getCell("A4").value = "(MNB)";
  ws.getCell("A4").font = { name: "Calibri", size: 11, bold: true };
  ws.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };

  const sample = data[0];
  const mLabel = month || sample?.checkMonth || new Date().toISOString().slice(0, 7);
  const [yr, mo] = mLabel.split("-");
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const moName = mo ? monthNames[parseInt(mo, 10) - 1] || mo : "Desember";

  ws.getCell("A5").value = `Bulan : ${moName}`;
  ws.getCell("D5").value = `Tahun : ${yr || "2026"}`;
  ws.getCell("F5").value = `Lokasi : Tangki Gula Cair`;
  ws.getCell("I5").value = `PIC: ${sample?.picResponsible || "Sajiman"}`;
  ws.getRow(5).font = { name: "Calibri", size: 10, bold: true };

  ws.mergeCells("A6:A7");
  ws.getCell("A6").value = "Tanggal Periksa";

  ws.mergeCells("B6:E6");
  ws.getCell("B6").value = "Pengecekan Awal";
  ws.getCell("B7").value = "Jumlah";
  ws.getCell("C7").value = "Baik/Jumlah lengkap";
  ws.getCell("D7").value = "Hasil Analisa";
  ws.getCell("E7").value = "Tindakan Perbaikan";

  ws.mergeCells("F6:I6");
  ws.getCell("F6").value = "Pengecekan Akhir";
  ws.getCell("F7").value = "Jumlah";
  ws.getCell("G7").value = "Baik/Jumlah lengkap";
  ws.getCell("H7").value = "Hasil Analisa";
  ws.getCell("I7").value = "Tindakan Perbaikan";

  ws.mergeCells("J6:J7");
  ws.getCell("J6").value = "Nama / Paraf PIC";
  ws.mergeCells("K6:K7");
  ws.getCell("K6").value = "Paraf QC";

  for (let r = 6; r <= 7; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Calibri", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 11; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    }
  }

  let rowIdx = 8;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.initialBoltCount;
    row.getCell(3).value = item.initialIsComplete ? "Lengkap" : "Kurang";
    row.getCell(4).value = item.initialFindings || "-";
    row.getCell(5).value = item.initialAction || "-";
    row.getCell(6).value = item.finalBoltCount;
    row.getCell(7).value = item.finalIsComplete ? "Lengkap" : "Kurang";
    row.getCell(8).value = item.finalFindings || "-";
    row.getCell(9).value = item.finalAction || "-";
    row.getCell(10).value = item.finalPicName || item.initialPicName;
    row.getCell(11).value = item.finalQcName || item.initialQcName || "QC";

    row.font = { name: "Calibri", size: 9 };
    for (let c = 1; c <= 11; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { vertical: "middle" };
      if ([1, 2, 3, 6, 7, 10, 11].includes(c)) {
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  rowIdx += 1;
  ws.getCell(`A${rowIdx}`).value = "Catatan: • Pengecekan dilakukan sebelum dan setelah proses memasak gula cair";
  ws.getCell(`A${rowIdx + 1}`).value = "• Pengecekan kondisi dilakukan secara visual dan pengecekan jumlah mur baut & ring yang ada di ruang gula cair";
  ws.getCell(`A${rowIdx + 2}`).value = "• Catat hasil analisa dan laporkan ke QC jika mur baut & ring tidak ada, rusak atau patah.";
  for (let i = 0; i < 3; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Calibri", size: 8, italic: true };
  }

  const widths = [14, 10, 16, 18, 18, 10, 16, 18, 18, 16, 12];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
}

export function populateMNMSheet(ws: ExcelJS.Worksheet, data: MeshBoltMonitoringItem[], stage: "mentah" | "matang", month?: string): void {
  ws.views = [{ showGridLines: true }];
  ws.mergeCells("A3:N3");
  ws.getCell("A3").value = "Monitoring Kondisi Mur & Baut Pada Mesh Ayakan ";
  ws.getCell("A3").font = { name: "Calibri", size: 14, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A4:N4");
  ws.getCell("A4").value = "(MNM)";
  ws.getCell("A4").font = { name: "Calibri", size: 11, bold: true };
  ws.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };

  const sample = data[0];
  const mLabel = month || sample?.checkMonth || new Date().toISOString().slice(0, 7);
  const [yr, mo] = mLabel.split("-");
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const moName = mo ? monthNames[parseInt(mo, 10) - 1] || mo : "Desember";

  const locLabel = stage === "matang" ? "Mesh ayakan matang" : "Mesh Ayakan Mentah";
  const picDefault = stage === "matang" ? "Adi" : "Azis";

  ws.getCell("A5").value = `Bulan : ${moName}`;
  ws.getCell("D5").value = `Tahun : ${yr || "2026"}`;
  ws.getCell("G5").value = `Lokasi : ${locLabel}`;
  ws.getCell("L5").value = `PIC: ${sample?.picResponsible || picDefault}`;
  ws.getRow(5).font = { name: "Calibri", size: 10, bold: true };

  ws.mergeCells("A6:A7");
  ws.getCell("A6").value = "Tanggal Periksa";
  ws.mergeCells("B6:B7");
  ws.getCell("B6").value = "Mesh";

  ws.mergeCells("C6:F6");
  ws.getCell("C6").value = "Pengecekan Awal";
  ws.getCell("C7").value = "Jumlah";
  ws.getCell("D7").value = "Baik/Jumlah lengkap";
  ws.getCell("E7").value = "Hasil Analisa";
  ws.getCell("F7").value = "Tindakan Perbaikan";

  ws.mergeCells("G6:G7");
  ws.getCell("G6").value = "Nama / Paraf PIC";
  ws.mergeCells("H6:H7");
  ws.getCell("H6").value = "Paraf QC";

  ws.mergeCells("I6:L6");
  ws.getCell("I6").value = "Pengecekan Akhir";
  ws.getCell("I7").value = "Jumlah";
  ws.getCell("J7").value = "Baik/Jumlah lengkap";
  ws.getCell("K7").value = "Hasil Analisa";
  ws.getCell("L7").value = "Tindakan Perbaikan";

  ws.mergeCells("M6:M7");
  ws.getCell("M6").value = "Nama / Paraf PIC";
  ws.mergeCells("N6:N7");
  ws.getCell("N6").value = "Paraf QC";

  for (let r = 6; r <= 7; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Calibri", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 14; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    }
  }

  let rowIdx = 8;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.meshSize || "Mesh 18";
    row.getCell(3).value = item.initialBoltCount;
    row.getCell(4).value = item.initialIsComplete ? "Lengkap" : "Kurang";
    row.getCell(5).value = item.initialFindings || "-";
    row.getCell(6).value = item.initialAction || "-";
    row.getCell(7).value = item.initialPicName;
    row.getCell(8).value = item.initialQcName || "QC";
    row.getCell(9).value = item.finalBoltCount;
    row.getCell(10).value = item.finalIsComplete ? "Lengkap" : "Kurang";
    row.getCell(11).value = item.finalFindings || "-";
    row.getCell(12).value = item.finalAction || "-";
    row.getCell(13).value = item.finalPicName;
    row.getCell(14).value = item.finalQcName || "QC";

    row.font = { name: "Calibri", size: 9 };
    for (let c = 1; c <= 14; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { vertical: "middle" };
      if ([1, 2, 3, 4, 7, 8, 9, 10, 13, 14].includes(c)) {
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  rowIdx += 1;
  ws.getCell(`A${rowIdx}`).value = "Catatan: • Pengecekan dilakukan sebelum dan setelah proses pengayakan gula semut";
  ws.getCell(`A${rowIdx + 1}`).value = "• Pengecekan kondisi dilakukan secara visual dan pengecekan jumlah mur baut & ring pada mesh ayakan";
  ws.getCell(`A${rowIdx + 2}`).value = "• Catat hasil analisa dan laporkan ke QC jika mur & baut tidak ada, rusak atau patah.";
  for (let i = 0; i < 3; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Calibri", size: 8, italic: true };
  }

  const widths = [14, 10, 10, 16, 18, 18, 14, 12, 10, 16, 18, 18, 14, 12];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
}

export function populateMMVSheet(ws: ExcelJS.Worksheet, data: FilterMeshMonitoringItem[], month?: string): void {
  ws.views = [{ showGridLines: true }];
  ws.mergeCells("A1:N1");
  ws.getCell("A1").value = "Monitoring Kondisi Mesh VCO";
  ws.getCell("A1").font = { name: "Calibri", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A2:N2");
  ws.getCell("A2").value = "(MMV)";
  ws.getCell("A2").font = { name: "Calibri", size: 11, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  const sample = data[0];
  const mLabel = month || sample?.checkMonth || new Date().toISOString().slice(0, 7);
  const [yr, mo] = mLabel.split("-");
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const moName = mo ? monthNames[parseInt(mo, 10) - 1] || mo : "Desember";

  ws.getCell("A3").value = `Bulan : ${moName}`;
  ws.getCell("D3").value = `Tahun : ${yr || "2026"}`;
  ws.getCell("G3").value = `Lokasi : Ruang VCO`;
  ws.getCell("L3").value = `PIC: ${sample?.picResponsible || "Abel"}`;
  ws.getRow(3).font = { name: "Calibri", size: 10, bold: true };

  ws.mergeCells("A4:A5");
  ws.getCell("A4").value = "Hari/Tanggal";
  ws.mergeCells("B4:B5");
  ws.getCell("B4").value = "Produk";
  ws.mergeCells("C4:C5");
  ws.getCell("C4").value = "Kode Produk";
  ws.mergeCells("D4:D5");
  ws.getCell("D4").value = "Mesh";

  ws.mergeCells("E4:G4");
  ws.getCell("E4").value = "Pengecekan Awal";
  ws.getCell("E5").value = "Kondisi";
  ws.getCell("F5").value = "Temuan";
  ws.getCell("G5").value = "Tindakan Perbaikan";

  ws.mergeCells("H4:H5");
  ws.getCell("H4").value = "Nama/Paraf PIC";
  ws.mergeCells("I4:I5");
  ws.getCell("I4").value = "Paraf QC";

  ws.mergeCells("J4:L4");
  ws.getCell("J4").value = "Pengecekan Akhir";
  ws.getCell("J5").value = "Kondisi";
  ws.getCell("K5").value = "Temuan";
  ws.getCell("L5").value = "Tindakan Perbaikan";

  ws.mergeCells("M4:M5");
  ws.getCell("M4").value = "Nama/Paraf PIC";
  ws.mergeCells("N4:N5");
  ws.getCell("N4").value = "Paraf QC";

  for (let r = 4; r <= 5; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Calibri", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 14; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    }
  }

  let rowIdx = 6;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.productName;
    row.getCell(3).value = item.productCode || "-";
    row.getCell(4).value = item.meshSize;
    row.getCell(5).value = item.initialCondition;
    row.getCell(6).value = item.initialFindings || "-";
    row.getCell(7).value = item.initialAction || "-";
    row.getCell(8).value = item.initialPicName;
    row.getCell(9).value = item.initialQcName || "QC";
    row.getCell(10).value = item.finalCondition;
    row.getCell(11).value = item.finalFindings || "-";
    row.getCell(12).value = item.finalAction || "-";
    row.getCell(13).value = item.finalPicName;
    row.getCell(14).value = item.finalQcName || "QC";

    row.font = { name: "Calibri", size: 9 };
    for (let c = 1; c <= 14; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { vertical: "middle" };
      if ([1, 4, 5, 8, 9, 10, 13, 14].includes(c)) {
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  rowIdx += 1;
  ws.getCell(`A${rowIdx}`).value = "Catatan: • Pengecekan dilakukan setiap awal dan akhir proses penyaringan dan setiap pergantian kode bahan";
  ws.getCell(`A${rowIdx + 1}`).value = "• Catat kondisi alat dan mesh penyaringan sesuai dengan keadaan sebenarnya";
  ws.getCell(`A${rowIdx + 2}`).value = "• Tulis tindakan yang dilakukan jika terdapat temuan dan kondisi yang tidak sesuai";
  for (let i = 0; i < 3; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Calibri", size: 8, italic: true };
  }

  const widths = [14, 18, 14, 10, 12, 16, 18, 14, 12, 12, 16, 18, 14, 12];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
}

export function populateMBBSheet(ws: ExcelJS.Worksheet, data: MeshBoltMonitoringItem[], month?: string): void {
  ws.views = [{ showGridLines: true }];
  ws.mergeCells("A3:M3");
  ws.getCell("A3").value = "Monitoring Kondisi Mur & Baut Pada Mesin Brontol";
  ws.getCell("A3").font = { name: "Calibri", size: 14, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A4:M4");
  ws.getCell("A4").value = "(MBB)";
  ws.getCell("A4").font = { name: "Calibri", size: 11, bold: true };
  ws.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };

  const sample = data[0];
  const mLabel = month || sample?.checkMonth || new Date().toISOString().slice(0, 7);
  const [yr, mo] = mLabel.split("-");
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const moName = mo ? monthNames[parseInt(mo, 10) - 1] || mo : "Desember";

  ws.getCell("A5").value = `Bulan : ${moName}`;
  ws.getCell("C5").value = `Tahun : ${yr || "2026"}`;
  ws.getCell("F5").value = `Lokasi : Mesin Brontol`;
  ws.getCell("K5").value = `PIC: ${sample?.picResponsible || "Sajiman"}`;
  ws.getRow(5).font = { name: "Calibri", size: 10, bold: true };

  ws.mergeCells("A6:A7");
  ws.getCell("A6").value = "Tanggal Periksa";

  ws.mergeCells("B6:E6");
  ws.getCell("B6").value = "Pengecekan Awal";
  ws.getCell("B7").value = "Jumlah";
  ws.getCell("C7").value = "Baik/Jumlah lengkap";
  ws.getCell("D7").value = "Hasil Analisa";
  ws.getCell("E7").value = "Tindakan Perbaikan";

  ws.mergeCells("F6:F7");
  ws.getCell("F6").value = "Nama / Paraf PIC";
  ws.mergeCells("G6:G7");
  ws.getCell("G6").value = "Paraf QC";

  ws.mergeCells("H6:K6");
  ws.getCell("H6").value = "Pengecekan Akhir";
  ws.getCell("H7").value = "Jumlah";
  ws.getCell("I7").value = "Baik/Jumlah lengkap";
  ws.getCell("J7").value = "Hasil Analisa";
  ws.getCell("K7").value = "Tindakan Perbaikan";

  ws.mergeCells("L6:L7");
  ws.getCell("L6").value = "Nama / Paraf PIC";
  ws.mergeCells("M6:M7");
  ws.getCell("M6").value = "Paraf QC";

  for (let r = 6; r <= 7; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Calibri", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 13; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    }
  }

  let rowIdx = 8;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.initialBoltCount;
    row.getCell(3).value = item.initialIsComplete ? "Lengkap" : "Kurang";
    row.getCell(4).value = item.initialFindings || "-";
    row.getCell(5).value = item.initialAction || "-";
    row.getCell(6).value = item.initialPicName;
    row.getCell(7).value = item.initialQcName || "QC";
    row.getCell(8).value = item.finalBoltCount;
    row.getCell(9).value = item.finalIsComplete ? "Lengkap" : "Kurang";
    row.getCell(10).value = item.finalFindings || "-";
    row.getCell(11).value = item.finalAction || "-";
    row.getCell(12).value = item.finalPicName;
    row.getCell(13).value = item.finalQcName || "QC";

    row.font = { name: "Calibri", size: 9 };
    for (let c = 1; c <= 13; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { vertical: "middle" };
      if ([1, 2, 3, 6, 7, 8, 9, 12, 13].includes(c)) {
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  rowIdx += 1;
  ws.getCell(`A${rowIdx}`).value = "Catatan: • Pengecekan dilakukan sebelum dan setelah proses produksi";
  ws.getCell(`A${rowIdx + 1}`).value = "• Pengecekan kondisi dilakukan secara visual dan pengecekan jumlah mur baut & ring pada mesin brontol";
  ws.getCell(`A${rowIdx + 2}`).value = "• Catat hasil analisa dan laporkan ke QC jika mur & baut tidak ada, rusak atau patah.";
  for (let i = 0; i < 3; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Calibri", size: 8, italic: true };
  }

  const widths = [16, 10, 16, 18, 18, 14, 12, 10, 16, 18, 18, 14, 12];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
}

export function populateMPBSheet(ws: ExcelJS.Worksheet, data: BrontolBladeMonitoringItem[], month?: string): void {
  ws.views = [{ showGridLines: true }];
  ws.mergeCells("A3:M3");
  ws.getCell("A3").value = "Monitoring Bilah Pisau Mesin Brontol ";
  ws.getCell("A3").font = { name: "Calibri", size: 14, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A4:M4");
  ws.getCell("A4").value = "(MPB)";
  ws.getCell("A4").font = { name: "Calibri", size: 11, bold: true };
  ws.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };

  const sample = data[0];
  const mLabel = month || sample?.checkMonth || new Date().toISOString().slice(0, 7);
  const [yr, mo] = mLabel.split("-");
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const moName = mo ? monthNames[parseInt(mo, 10) - 1] || mo : "Desember";

  ws.getCell("A5").value = `Bulan : ${moName}`;
  ws.getCell("C5").value = `Tahun: ${yr || "2026"}`;
  ws.getCell("F5").value = `Lokasi : Ruang ayak matang`;
  ws.getCell("K5").value = `PIC: ${sample?.picResponsible || "Sajiman"}`;
  ws.getRow(5).font = { name: "Calibri", size: 10, bold: true };

  ws.mergeCells("A6:A7");
  ws.getCell("A6").value = "Hari/Tanggal";
  ws.mergeCells("B6:B7");
  ws.getCell("B6").value = "Produk";
  ws.mergeCells("C6:C7");
  ws.getCell("C6").value = "Kode Produk";

  ws.mergeCells("D6:F6");
  ws.getCell("D6").value = "Pengecekan Awal";
  ws.getCell("D7").value = "Kondisi";
  ws.getCell("E7").value = "Temuan";
  ws.getCell("F7").value = "Tindakan Perbaikan";

  ws.mergeCells("G6:G7");
  ws.getCell("G6").value = "Nama/Paraf PIC";
  ws.mergeCells("H6:H7");
  ws.getCell("H6").value = "Paraf QC";

  ws.mergeCells("I6:K6");
  ws.getCell("I6").value = "Pengecekan Akhir";
  ws.getCell("I7").value = "Kondisi";
  ws.getCell("J7").value = "Temuan";
  ws.getCell("K7").value = "Tindakan Perbaikan";

  ws.mergeCells("L6:L7");
  ws.getCell("L6").value = "Nama/Paraf PIC";
  ws.mergeCells("M6:M7");
  ws.getCell("M6").value = "Paraf QC";

  for (let r = 6; r <= 7; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Calibri", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 13; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    }
  }

  let rowIdx = 8;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.productName;
    row.getCell(3).value = item.productCode || "-";
    row.getCell(4).value = item.initialCondition;
    row.getCell(5).value = item.initialFindings || "-";
    row.getCell(6).value = item.initialAction || "-";
    row.getCell(7).value = item.initialPicName;
    row.getCell(8).value = item.initialQcName || "QC";
    row.getCell(9).value = item.finalCondition;
    row.getCell(10).value = item.finalFindings || "-";
    row.getCell(11).value = item.finalAction || "-";
    row.getCell(12).value = item.finalPicName;
    row.getCell(13).value = item.finalQcName || "QC";

    row.font = { name: "Calibri", size: 9 };
    for (let c = 1; c <= 13; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { vertical: "middle" };
      if ([1, 4, 7, 8, 9, 12, 13].includes(c)) {
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  rowIdx += 1;
  ws.getCell(`A${rowIdx}`).value = "Catatan: • Pengecekan dilakukan setiap awal dan akhir proses dan setiap pergantian kode bahan";
  ws.getCell(`A${rowIdx + 1}`).value = "• Catat kondisi alat dan mesh penyaringan sesuai dengan keadaan sebenarnya";
  ws.getCell(`A${rowIdx + 2}`).value = "• Tulis tindakan yang dilakukan jika terdapat temuan dan kondisi yang tidak sesuai";
  for (let i = 0; i < 3; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Calibri", size: 8, italic: true };
  }

  const widths = [14, 18, 14, 12, 16, 18, 14, 12, 12, 16, 18, 14, 12];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
}

// ─── Export Functions ────────────────────────────────────────────────────────

export async function exportMNMExcel(
  data: MeshBoltMonitoringItem[],
  stage: "mentah" | "matang" | "all" = "all",
  filterMonth?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  if (stage === "mentah" || stage === "all") {
    const wsMentah = workbook.addWorksheet("MNM mentah", {
      pageSetup: { paperSize: 9, orientation: "landscape" },
    });
    const mentahData = data.filter((d) => d.stageCategory === "mentah" || d.room === "Ayak Mentah" || !d.stageCategory);
    populateMNMSheet(wsMentah, mentahData.length > 0 ? mentahData : data, "mentah", filterMonth);
  }

  if (stage === "matang" || stage === "all") {
    const wsMatang = workbook.addWorksheet("MNM matang", {
      pageSetup: { paperSize: 9, orientation: "landscape" },
    });
    const matangData = data.filter((d) => d.stageCategory === "matang" || d.room === "Ayak Matang");
    populateMNMSheet(wsMatang, matangData.length > 0 ? matangData : data, "matang", filterMonth);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-011-MNM-${stage}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportMNBExcel(data: MeshBoltMonitoringItem[], filterMonth?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("MNB", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });
  populateMNBSheet(ws, data, filterMonth);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-011-MNB-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportMBBExcel(data: MeshBoltMonitoringItem[], filterMonth?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("MBB Brontol", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });
  populateMBBSheet(ws, data, filterMonth);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-011-MBB-Brontol-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportMPBExcel(data: BrontolBladeMonitoringItem[], filterMonth?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("MPB Brontol", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });
  populateMPBSheet(ws, data, filterMonth);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-011-MPB-Brontol-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportMNPExcel(data: FilterMeshMonitoringItem[], filterMonth?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("MNP", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });
  populateMNPSheet(ws, data, filterMonth);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-011-MNP-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportMMVExcel(data: FilterMeshMonitoringItem[], filterMonth?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("MMV", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });
  populateMMVSheet(ws, data, filterMonth);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-011-MMV-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportMasterQC011Excel(datasets: {
  mnj?: NeedleMonitoringItem[];
  mng?: ScissorMonitoringItem[];
  mnp?: FilterMeshMonitoringItem[];
  mnb?: MeshBoltMonitoringItem[];
  mnmMentah?: MeshBoltMonitoringItem[];
  mnmMatang?: MeshBoltMonitoringItem[];
  mmv?: FilterMeshMonitoringItem[];
  mbb?: MeshBoltMonitoringItem[];
  mpb?: BrontolBladeMonitoringItem[];
  filterMonth?: string;
} = {}): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  // 1. MNJ
  const wsMNJ = workbook.addWorksheet("MNJ", { pageSetup: { paperSize: 9, orientation: "landscape" } });
  populateMNJSheet(wsMNJ, datasets.mnj || [], datasets.filterMonth);

  // 2. MNG
  const wsMNG = workbook.addWorksheet("MNG", { pageSetup: { paperSize: 9, orientation: "landscape" } });
  populateMNGSheet(wsMNG, datasets.mng || [], datasets.filterMonth);

  // 3. MNP
  const wsMNP = workbook.addWorksheet("MNP", { pageSetup: { paperSize: 9, orientation: "landscape" } });
  populateMNPSheet(wsMNP, datasets.mnp || [], datasets.filterMonth);

  // 4. MNB
  const wsMNB = workbook.addWorksheet("MNB", { pageSetup: { paperSize: 9, orientation: "landscape" } });
  populateMNBSheet(wsMNB, datasets.mnb || [], datasets.filterMonth);

  // 5. MNM mentah
  const wsMNMMentah = workbook.addWorksheet("MNM mentah", { pageSetup: { paperSize: 9, orientation: "landscape" } });
  populateMNMSheet(wsMNMMentah, datasets.mnmMentah || [], "mentah", datasets.filterMonth);

  // 6. MNM matang
  const wsMNMMatang = workbook.addWorksheet("MNM matang", { pageSetup: { paperSize: 9, orientation: "landscape" } });
  populateMNMSheet(wsMNMMatang, datasets.mnmMatang || [], "matang", datasets.filterMonth);

  // 7. MMV
  const wsMMV = workbook.addWorksheet("MMV", { pageSetup: { paperSize: 9, orientation: "landscape" } });
  populateMMVSheet(wsMMV, datasets.mmv || [], datasets.filterMonth);

  // 8. MBB Brontol
  const wsMBB = workbook.addWorksheet("MBB Brontol", { pageSetup: { paperSize: 9, orientation: "landscape" } });
  populateMBBSheet(wsMBB, datasets.mbb || [], datasets.filterMonth);

  // 9. MPB Brontol
  const wsMPB = workbook.addWorksheet("MPB Brontol", { pageSetup: { paperSize: 9, orientation: "landscape" } });
  populateMPBSheet(wsMPB, datasets.mpb || [], datasets.filterMonth);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-011-MASTER-SUITE-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Export Form QC-012-MNO.05 (Monitoring Proses Oven)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportMNOExcel(data: OvenMonitoringItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Monitoring Proses Oven", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  // Title
  ws.mergeCells("A2:N2");
  ws.getCell("A2").value = "Monitoring Proses Oven";
  ws.getCell("A2").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:N3");
  ws.getCell("A3").value = "(MNO) • Form-QC-012-MNO. 05";
  ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  const sample = data[0];
  ws.getCell("A5").value = `Bulan/Tahun : ${sample?.checkMonth || new Date().toISOString().slice(0, 7)}`;
  ws.getCell("G5").value = `No Oven : ${sample?.ovenNo || "Semua Oven"}`;

  for (let r = 5; r <= 5; r++) {
    ws.getRow(r).font = { name: "Arial", size: 10, bold: true };
  }

  // Headers (Row 6, 7, 8)
  ws.mergeCells("A6:A8");
  ws.getCell("A6").value = "HARI/ TANGGAL";
  ws.mergeCells("B6:B8");
  ws.getCell("B6").value = "KODE PRODUK";

  // AWAL
  ws.mergeCells("C6:E6");
  ws.getCell("C6").value = "AWAL";
  ws.mergeCells("C7:C8");
  ws.getCell("C7").value = "SUHU (°C)";
  ws.mergeCells("D7:D8");
  ws.getCell("D7").value = "Waktu (WIB)";
  ws.mergeCells("E7:E8");
  ws.getCell("E7").value = "Kadar Air (%)";

  // STABIL
  ws.mergeCells("F6:F8");
  ws.getCell("F6").value = "STABIL (100°C)\nWaktu (WIB)";

  // PROSES
  ws.mergeCells("G6:J6");
  ws.getCell("G6").value = "PROSES (±1 Jam Setelah Stabil)";
  ws.mergeCells("G7:G8");
  ws.getCell("G7").value = "SUHU (°C)";
  ws.mergeCells("H7:J7");
  ws.getCell("H7").value = "Kadar Air (%) Berkala";
  ws.getCell("H8").value = "Titik 1";
  ws.getCell("I8").value = "Titik 2";
  ws.getCell("J8").value = "Titik 3";

  // AKHIR
  ws.mergeCells("K6:M6");
  ws.getCell("K6").value = "AKHIR (Siap Turun)";
  ws.mergeCells("K7:K8");
  ws.getCell("K7").value = "SUHU (°C)";
  ws.mergeCells("L7:L8");
  ws.getCell("L7").value = "Waktu Selesai";
  ws.mergeCells("M7:M8");
  ws.getCell("M7").value = "Kadar Air (%)";

  // PIC & QC
  ws.mergeCells("N6:N8");
  ws.getCell("N6").value = "PIC / QC";

  for (let r = 6; r <= 8; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Arial", size: 8, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 14; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    }
  }

  let rowIdx = 9;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.batchNo;
    row.getCell(3).value = item.initialTemperature;
    row.getCell(4).value = item.initialTime;
    row.getCell(5).value = `${item.initialMoisture}%`;
    row.getCell(6).value = item.stabilizedTime;
    row.getCell(7).value = item.processTemperature;
    row.getCell(8).value = item.processMoisture1 != null ? `${item.processMoisture1}%` : "-";
    row.getCell(9).value = item.processMoisture2 != null ? `${item.processMoisture2}%` : "-";
    row.getCell(10).value = item.processMoisture3 != null ? `${item.processMoisture3}%` : "-";
    row.getCell(11).value = item.finalTemperature;
    row.getCell(12).value = item.finalTime;
    row.getCell(13).value = `${item.finalMoisture}%`;
    row.getCell(14).value = `${item.picName}${item.qcVerifierName ? ` / ${item.qcVerifierName}` : ""}`;

    row.font = { name: "Arial", size: 9 };
    for (let c = 1; c <= 14; c++) {
      row.getCell(c).border = thinBorder;
    }
    rowIdx++;
  }

  // SOP Notes
  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value =
    "Keterangan : - Awal yaitu ketika bahan baku mulai dimasukkan dalam oven";
  ws.getCell(`A${rowIdx + 1}`).value =
    "             - Stabil yaitu ketika suhu telah tercapai 100°C";
  ws.getCell(`A${rowIdx + 2}`).value =
    "             - Proses yaitu ketika bahan baku telah berproses ± 1 jam setelah stabil";
  ws.getCell(`A${rowIdx + 3}`).value =
    "             - Akhir yaitu ketika produk sudah siap untuk diturunkan (Target Kadar Air <= 2.0%)";

  for (let i = 0; i < 4; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Arial", size: 8, italic: true };
  }

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 10;
  ws.getColumn(8).width = 10;
  ws.getColumn(9).width = 10;
  ws.getColumn(10).width = 10;
  ws.getColumn(11).width = 10;
  ws.getColumn(12).width = 12;
  ws.getColumn(13).width = 14;
  ws.getColumn(14).width = 18;

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-012-MNO-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Export Form QC-011-MNJ.01 (Monitoring Jarum)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportNeedleToExcel(data: NeedleMonitoringItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Monitoring Jarum", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  // Header Title
  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = "Monitoring Kondisi Jarum";
  ws.getCell("A2").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:L3");
  ws.getCell("A3").value = "(MNJ) - Form QC-011-MNJ.01";
  ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  // Table Headers
  ws.mergeCells("A5:A6");
  ws.getCell("A5").value = "Tanggal Periksa";
  ws.mergeCells("B5:B6");
  ws.getCell("B5").value = "No Mesin Jahit";

  ws.mergeCells("C5:F5");
  ws.getCell("C5").value = "Pengecekan Awal";
  ws.getCell("C6").value = "Ada/Tidak";
  ws.getCell("D6").value = "Baik/Rusak/Patah";
  ws.getCell("E6").value = "Hasil Analisa";
  ws.getCell("F6").value = "Tindakan Perbaikan";

  ws.mergeCells("G5:J5");
  ws.getCell("G5").value = "Pengecekan Akhir";
  ws.getCell("G6").value = "Ada/Tidak";
  ws.getCell("H6").value = "Baik/Rusak/Patah";
  ws.getCell("I6").value = "Hasil Analisa";
  ws.getCell("J6").value = "Tindakan Perbaikan";

  ws.mergeCells("K5:K6");
  ws.getCell("K5").value = "Jarum di R. Packing";
  ws.mergeCells("L5:L6");
  ws.getCell("L5").value = "Nama / Paraf PIC";

  const headerCells = ["A5", "B5", "C5", "G5", "K5", "L5", "C6", "D6", "E6", "F6", "G6", "H6", "I6", "J6"];
  headerCells.forEach((addr) => {
    const c = ws.getCell(addr);
    c.font = { name: "Arial", size: 9, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = thinBorder;
  });

  let rowIdx = 7;
  for (const item of data) {
    ws.getCell(`A${rowIdx}`).value = item.checkDate;
    ws.getCell(`B${rowIdx}`).value = item.sewingMachineNo;
    ws.getCell(`C${rowIdx}`).value = item.initialIsPresent ? "Ada" : "Tidak";
    ws.getCell(`D${rowIdx}`).value = item.initialCondition;
    ws.getCell(`E${rowIdx}`).value = item.initialAnalysis || "-";
    ws.getCell(`F${rowIdx}`).value = item.initialAction || "-";
    ws.getCell(`G${rowIdx}`).value = item.finalIsPresent ? "Ada" : "Tidak";
    ws.getCell(`H${rowIdx}`).value = item.finalCondition;
    ws.getCell(`I${rowIdx}`).value = item.finalAnalysis || "-";
    ws.getCell(`J${rowIdx}`).value = item.finalAction || "-";
    ws.getCell(`K${rowIdx}`).value = item.needleStockInRoom;
    ws.getCell(`L${rowIdx}`).value = item.picName;

    for (let c = 1; c <= 12; c++) {
      const cell = ws.getRow(rowIdx).getCell(c);
      cell.border = thinBorder;
      cell.font = { name: "Arial", size: 8 };
      cell.alignment = { vertical: "middle" };
      if ([1, 2, 3, 4, 7, 8, 11, 12].includes(c)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  ws.columns = [
    { width: 14 }, { width: 16 }, { width: 12 }, { width: 14 },
    { width: 18 }, { width: 18 }, { width: 12 }, { width: 14 },
    { width: 18 }, { width: 18 }, { width: 16 }, { width: 16 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-011-MNJ-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Export Form QC-011-MNJ.01 Sheet MNG (Monitoring Gunting)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportScissorToExcel(data: ScissorMonitoringItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Monitoring Gunting", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  ws.mergeCells("A2:K2");
  ws.getCell("A2").value = "Monitoring Kondisi Gunting";
  ws.getCell("A2").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:K3");
  ws.getCell("A3").value = "(MNG) - Form QC-011-MNJ.01 Sheet MNG";
  ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A5:A6");
  ws.getCell("A5").value = "Tanggal Periksa";
  ws.mergeCells("B5:B6");
  ws.getCell("B5").value = "Lokasi";

  ws.mergeCells("C5:F5");
  ws.getCell("C5").value = "Pengecekan Awal";
  ws.getCell("C6").value = "Jumlah Gunting";
  ws.getCell("D6").value = "Baik/Rusak/Patah";
  ws.getCell("E6").value = "Hasil Analisa";
  ws.getCell("F6").value = "Tindakan Perbaikan";

  ws.mergeCells("G5:J5");
  ws.getCell("G5").value = "Pengecekan Akhir";
  ws.getCell("G6").value = "Jumlah Gunting";
  ws.getCell("H6").value = "Baik/Rusak/Patah";
  ws.getCell("I6").value = "Hasil Analisa";
  ws.getCell("J6").value = "Tindakan Perbaikan";

  ws.mergeCells("K5:K6");
  ws.getCell("K5").value = "Nama / Paraf PIC";

  const headerCells = ["A5", "B5", "C5", "G5", "K5", "C6", "D6", "E6", "F6", "G6", "H6", "I6", "J6"];
  headerCells.forEach((addr) => {
    const c = ws.getCell(addr);
    c.font = { name: "Arial", size: 9, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = thinBorder;
  });

  let rowIdx = 7;
  for (const item of data) {
    ws.getCell(`A${rowIdx}`).value = item.checkDate;
    ws.getCell(`B${rowIdx}`).value = item.location;
    ws.getCell(`C${rowIdx}`).value = item.initialCount;
    ws.getCell(`D${rowIdx}`).value = item.initialCondition;
    ws.getCell(`E${rowIdx}`).value = item.initialAnalysis || "-";
    ws.getCell(`F${rowIdx}`).value = item.initialAction || "-";
    ws.getCell(`G${rowIdx}`).value = item.finalCount;
    ws.getCell(`H${rowIdx}`).value = item.finalCondition;
    ws.getCell(`I${rowIdx}`).value = item.finalAnalysis || "-";
    ws.getCell(`J${rowIdx}`).value = item.finalAction || "-";
    ws.getCell(`K${rowIdx}`).value = item.picName;

    for (let c = 1; c <= 11; c++) {
      const cell = ws.getRow(rowIdx).getCell(c);
      cell.border = thinBorder;
      cell.font = { name: "Arial", size: 8 };
      cell.alignment = { vertical: "middle" };
      if ([1, 2, 3, 4, 7, 8, 11].includes(c)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  ws.columns = [
    { width: 14 }, { width: 16 }, { width: 14 }, { width: 14 },
    { width: 18 }, { width: 18 }, { width: 14 }, { width: 14 },
    { width: 18 }, { width: 18 }, { width: 16 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-011-MNG-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Export Form PRO-007-CPP Revisi 01 (Catatan Pemakaian dan Pembersihan Alat)
//    Satu sheet per kombinasi Alat + Lokasi: "MD" (Metal Detector – R. Packing),
//    "MD GC" (Metal Detector – R. Gula Cair), "X-Ray" (X-Ray – R. Packing).
// ─────────────────────────────────────────────────────────────────────────────

const CPP_MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function cppIsGulaCair(location?: string): boolean {
  const l = (location || "").toLowerCase();
  return l.includes("cair") || l.includes("gc");
}

export function cppEquipmentLabel(item: Pick<MetalCleaningItem, "equipmentName" | "machineNo">): string {
  const raw = `${item.equipmentName || ""} ${item.machineNo || ""}`.toLowerCase();
  return raw.includes("x-ray") || raw.includes("xray") ? "X-Ray" : "Metal Detector";
}

export function cppSheetKey(item: MetalCleaningItem): "MD" | "MD GC" | "X-Ray" {
  if (cppEquipmentLabel(item) === "X-Ray") return "X-Ray";
  return cppIsGulaCair(item.location) ? "MD GC" : "MD";
}

export function cppLocationLabel(key: "MD" | "MD GC" | "X-Ray"): string {
  return key === "MD GC" ? "R. Gula Cair" : "R. Packing";
}

export function cppMonthLabel(month?: string): string {
  if (!month || month.length < 7) return "";
  const [y, m] = month.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${CPP_MONTHS_ID[idx] || m}/${y}`;
}

function cppFormatDate(d?: string): string {
  if (!d || d.length < 10) return d || "";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export async function exportCPPExcel(data: MetalCleaningItem[], filterMonth?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const month = filterMonth || data[0]?.checkMonth || new Date().toISOString().slice(0, 7);
  const sorted = [...data].sort((a, b) =>
    `${a.checkDate} ${a.startTime}`.localeCompare(`${b.checkDate} ${b.startTime}`)
  );

  // Kelompokkan per sheet; selalu sediakan sheet "MD" walau data kosong.
  const groups = new Map<"MD" | "MD GC" | "X-Ray", MetalCleaningItem[]>();
  for (const it of sorted) {
    const k = cppSheetKey(it);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }
  if (groups.size === 0) groups.set("MD", []);
  const order: ("MD GC" | "X-Ray" | "MD")[] = ["MD GC", "X-Ray", "MD"];

  const font = (size: number, bold = false): Partial<ExcelJS.Font> => ({ name: "Arial", size, bold });
  const center: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle", wrapText: true };

  for (const key of order) {
    const rows = groups.get(key);
    if (!rows) continue;

    const ws = workbook.addWorksheet(key, {
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        scale: 86,
        margins: { left: 0.15, right: 0.13, top: 0.56, bottom: 0.45, header: 0.17, footer: 0.3 },
      },
      headerFooter: {
        oddHeader:
          "&LCV. Manna Anugerah Sejahtera\nCU 820674 D-11\n104464OC\nFLO-ID 43683&RPRO-007-CPP\nFAIRTRADE / NON FAIRTRADE",
        oddFooter: "&CRevisi 01",
      },
    });

    ws.columns = [3.57, 12.43, 7.86, 15, 11.14, 5.14, 8, 8.43, 14.14, 22.86, 19, 8.43, 7.57, 5.29].map((w) => ({ width: w }));

    // Judul
    ws.mergeCells("A1:N1");
    ws.getCell("A1").value = "Catatan Pemakaian dan Pembersihan Alat";
    ws.getCell("A1").font = font(14, true);
    ws.getCell("A1").alignment = center;
    ws.getRow(1).height = 23.2;
    ws.mergeCells("A2:N2");
    ws.getCell("A2").value = "(CPP)";
    ws.getCell("A2").font = font(14, true);
    ws.getCell("A2").alignment = center;
    ws.getRow(2).height = 23.2;

    // Info
    const equipment = key === "X-Ray" ? "X-Ray" : "Metal Detector";
    ws.getCell("A3").value = "Lokasi";
    ws.getCell("C3").value = `: ${cppLocationLabel(key)}`;
    ws.getCell("A4").value = "Nama Alat";
    ws.getCell("C4").value = `: ${equipment}`;
    ws.getCell("A5").value = "Bulan/Tahun";
    ws.getCell("C5").value = `: ${cppMonthLabel(month)}`;
    ["A3", "C3", "A4", "C4", "A5", "C5"].forEach((a) => (ws.getCell(a).font = font(10, a.startsWith("A"))));
    ws.getRow(5).height = 21.75;

    // Header tabel (baris 6–8)
    const merges = [
      "A6:A8", "B6:B8", "C6:C8", "D6:D8", "E6:E8", "F6:F8",
      "G6:K6", "G7:H7", "I7:I8", "J7:J8", "K7:K8",
      "L6:M6", "L7:M7", "N6:N8",
    ];
    merges.forEach((m) => ws.mergeCells(m));
    const headers: Record<string, string> = {
      A6: "No", B6: "Tanggal", C6: "Nama Produk", D6: "No. Batch", E6: "Customer", F6: "Jumlah",
      G6: "Pemakaian", G7: "Jam (WIB)", G8: "Mulai", H8: "Selesai",
      I7: "Temuan", J7: "Hasil Analisa", K7: "Tindakan Perbaikan",
      L6: "Pembersihan ", L7: "Jam (WIB)", L8: "Mulai", M8: "Selesai", N6: "PIC",
    };
    for (let r = 6; r <= 8; r++) {
      for (let c = 1; c <= 14; c++) {
        const cell = ws.getRow(r).getCell(c);
        cell.border = thinBorder;
        cell.font = font(9, true);
        cell.alignment = center;
      }
    }
    Object.entries(headers).forEach(([addr, v]) => (ws.getCell(addr).value = v));
    ws.getRow(8).height = 21.75;

    // Data (minimal 12 baris: 9–20 seperti template)
    const minRows = 12;
    const totalRows = Math.max(minRows, rows.length);
    for (let i = 0; i < totalRows; i++) {
      const r = 9 + i;
      const it = rows[i];
      const row = ws.getRow(r);
      if (it) {
        const values = [
          i + 1,
          cppFormatDate(it.checkDate),
          it.productName || "",
          it.batchNo || "",
          it.customerName || "",
          it.quantity || "",
          it.startTime || "",
          it.endTime || "",
          it.finding || "-",
          it.analysisResult || "-",
          it.correctiveAction || "-",
          it.cleaningStartTime || "",
          it.cleaningEndTime || "",
          it.operatorName || "",
        ];
        values.forEach((v, idx) => (row.getCell(idx + 1).value = v));
      }
      for (let c = 1; c <= 14; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        cell.font = font(8);
        cell.alignment = [3, 9, 10, 11].includes(c)
          ? { vertical: "middle", wrapText: true }
          : center;
      }
      row.height = 20;
    }

    // Footer catatan & tanda tangan
    const f = 9 + totalRows; // = 21 bila 12 baris
    ws.getCell(`A${f}`).value = "Catatan :";
    ws.getCell(`A${f}`).font = font(9, true);
    ws.getCell(`A${f + 1}`).value = " - Isi sebelum dan sesudah penggunaan alat";
    ws.mergeCells(`A${f + 2}:I${f + 2}`);
    ws.getCell(`A${f + 2}`).value =
      " - Bersihkan alat setiap selesai penggunaan\n - Jika ada temuan, catat hasil temuan, hasil analisa, dan tindakan yang dilakukan";
    ws.getCell(`A${f + 2}`).alignment = { vertical: "top", wrapText: true };
    ws.getRow(f + 2).height = 24.75;
    [f + 1, f + 2].forEach((r) => (ws.getCell(`A${r}`).font = font(8)));

    const lastQA = [...rows].reverse().find((x) => x.qcInspectorName);
    ws.mergeCells(`L${f}:N${f}`);
    ws.getCell(`L${f}`).value = "Diketahui Oleh:";
    ws.mergeCells(`L${f + 1}:N${f + 2}`);
    ws.getCell(`L${f + 1}`).value = lastQA
      ? `Tgl. ${cppFormatDate(lastQA.qaVerifiedDate) || ""}\n${lastQA.qcInspectorName}`
      : "Tgl.";
    ws.mergeCells(`L${f + 3}:N${f + 3}`);
    ws.getCell(`L${f + 3}`).value = "QA";
    [f, f + 1, f + 3].forEach((r) => {
      const c = ws.getCell(`L${r}`);
      c.font = font(8, r !== f + 1);
      c.alignment = center;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-PRO-007-CPP-${month}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Export Form QC-017-VMD (Verifikasi Metal Detector CCP)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportVMDExcel(data: MetalVerificationItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Verifikasi Metal Detector", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  ws.mergeCells("A2:N2");
  ws.getCell("A2").value = "Catatan Verifikasi Metal Detector (CCP)";
  ws.getCell("A2").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:N3");
  ws.getCell("A3").value = "(VMD) - Form QC-017-VMD Rev 03 2026";
  ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A5:A6");
  ws.getCell("A5").value = "Tgl.";
  ws.mergeCells("B5:B6");
  ws.getCell("B5").value = "Round";
  ws.mergeCells("C5:C6");
  ws.getCell("C5").value = "Jam";
  ws.mergeCells("D5:D6");
  ws.getCell("D5").value = "Kemasan";

  ws.mergeCells("E5:G5");
  ws.getCell("E5").value = "Test Piece: Fe";
  ws.getCell("E6").value = "Alarm";
  ws.getCell("F6").value = "Konveyor";
  ws.getCell("G6").value = "Status";

  ws.mergeCells("H5:J5");
  ws.getCell("H5").value = "Test Piece: Non-Fe";
  ws.getCell("H6").value = "Alarm";
  ws.getCell("I6").value = "Konveyor";
  ws.getCell("J6").value = "Status";

  ws.mergeCells("K5:M5");
  ws.getCell("K5").value = "Test Piece: SS";
  ws.getCell("K6").value = "Alarm";
  ws.getCell("L6").value = "Konveyor";
  ws.getCell("M6").value = "Status";

  ws.mergeCells("N5:N6");
  ws.getCell("N5").value = "Paraf PIC / QC";

  const headerCells = ["A5", "B5", "C5", "D5", "E5", "H5", "K5", "N5", "E6", "F6", "G6", "H6", "I6", "J6", "K6", "L6", "M6"];
  headerCells.forEach((addr) => {
    const c = ws.getCell(addr);
    c.font = { name: "Arial", size: 9, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = thinBorder;
  });

  let rowIdx = 7;
  for (const item of data) {
    ws.getCell(`A${rowIdx}`).value = item.checkDate;
    ws.getCell(`B${rowIdx}`).value = `Monitoring #${item.monitoringRound}`;
    ws.getCell(`C${rowIdx}`).value = item.checkTime;
    ws.getCell(`D${rowIdx}`).value = item.packageCategory;

    ws.getCell(`E${rowIdx}`).value = item.feAlarmTriggered ? "Bunyi (OK)" : "Tdk Bunyi";
    ws.getCell(`F${rowIdx}`).value = item.feConveyorStopped ? "Berhenti (OK)" : "Tdk Berhenti";
    ws.getCell(`G${rowIdx}`).value = item.fePassed ? "PASS" : "FAIL";

    ws.getCell(`H${rowIdx}`).value = item.nonFeAlarmTriggered ? "Bunyi (OK)" : "Tdk Bunyi";
    ws.getCell(`I${rowIdx}`).value = item.nonFeConveyorStopped ? "Berhenti (OK)" : "Tdk Berhenti";
    ws.getCell(`J${rowIdx}`).value = item.nonFePassed ? "PASS" : "FAIL";

    ws.getCell(`K${rowIdx}`).value = item.ssAlarmTriggered ? "Bunyi (OK)" : "Tdk Bunyi";
    ws.getCell(`L${rowIdx}`).value = item.ssConveyorStopped ? "Berhenti (OK)" : "Tdk Berhenti";
    ws.getCell(`M${rowIdx}`).value = item.ssPassed ? "PASS" : "FAIL";

    ws.getCell(`N${rowIdx}`).value = `${item.picName} / ${item.qcVerifierName || "QC"}`;

    for (let c = 1; c <= 14; c++) {
      const cell = ws.getRow(rowIdx).getCell(c);
      cell.border = thinBorder;
      cell.font = { name: "Arial", size: 8 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
    rowIdx++;
  }

  // Catatan Batas Kritis CCP
  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value =
    "Catatan : Beri tanda centang (√) sesuai kondisi alarm (bunyi/tidak bunyi) dan conveyor (berhenti/tidak berhenti).";
  ws.getCell(`A${rowIdx + 1}`).value =
    "          Ukuran Test Piece Gula Semut, kemasan <= 12,5 kg: Fe >= 2mm, Non-Fe >= 2mm, SS >= 3,5mm.";
  ws.getCell(`A${rowIdx + 2}`).value =
    "          kemasan > 12,5 kg: Fe >= 2,5mm, Non-Fe >= 3mm, SS >= 3,5mm. Monitoring per 4 jam / awal & akhir.";

  for (let i = 0; i < 3; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Arial", size: 8, italic: true };
  }

  ws.columns = [
    { width: 14 }, { width: 14 }, { width: 10 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 10 },
    { width: 14 }, { width: 14 }, { width: 10 },
    { width: 14 }, { width: 14 }, { width: 10 },
    { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-017-VMD-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Export Form QC-004-PJD.05 (Pemeriksaan Kualitas Produk Jadi)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportFinishedGoodsToExcel(data: FinishedGoodsInspectionItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Pemeriksaan Produk Jadi", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  ws.mergeCells("A2:Q2");
  ws.getCell("A2").value = "Pemeriksaan Kualitas Produk Jadi";
  ws.getCell("A2").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:Q3");
  ws.getCell("A3").value = "(PJD) - Form QC-004-PJD.05 Rev 05";
  ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A5:A6");
  ws.getCell("A5").value = "Tgl";
  ws.mergeCells("B5:B6");
  ws.getCell("B5").value = "Nama Produk";
  ws.mergeCells("C5:C6");
  ws.getCell("C5").value = "Batch Number";
  ws.mergeCells("D5:D6");
  ws.getCell("D5").value = "Kode Bahan";

  ws.mergeCells("E5:N5");
  ws.getCell("E5").value = "Pengecekan Kualitas Organoleptik & Fisik";
  ws.getCell("E6").value = "Kemasan Primer";
  ws.getCell("F6").value = "Kemasan Sekunder";
  ws.getCell("G6").value = "Berat Bersih (kg)";
  ws.getCell("H6").value = "Berat Kotor (kg)";
  ws.getCell("I6").value = "Bentuk";
  ws.getCell("J6").value = "Aroma";
  ws.getCell("K6").value = "Warna* (1-3)";
  ws.getCell("L6").value = "Rasa";
  ws.getCell("M6").value = "Bebas Benda Asing";
  ws.getCell("N6").value = "Kadar Air (%)";

  ws.mergeCells("O5:O6");
  ws.getCell("O5").value = "Keputusan (Lolos/Ditolak)";
  ws.mergeCells("P5:P6");
  ws.getCell("P5").value = "Keterangan";
  ws.mergeCells("Q5:Q6");
  ws.getCell("Q5").value = "Paraf QC / QA";

  const headerCells = [
    "A5", "B5", "C5", "D5", "E5", "O5", "P5", "Q5",
    "E6", "F6", "G6", "H6", "I6", "J6", "K6", "L6", "M6", "N6",
  ];
  headerCells.forEach((addr) => {
    const c = ws.getCell(addr);
    c.font = { name: "Arial", size: 9, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = thinBorder;
  });

  let rowIdx = 7;
  for (const item of data) {
    ws.getCell(`A${rowIdx}`).value = item.checkDate;
    ws.getCell(`B${rowIdx}`).value = item.productName;
    ws.getCell(`C${rowIdx}`).value = item.batchNo;
    ws.getCell(`D${rowIdx}`).value = item.rawMaterialCode || "-";
    ws.getCell(`E${rowIdx}`).value = item.primaryPackaging;
    ws.getCell(`F${rowIdx}`).value = item.secondaryPackaging;
    ws.getCell(`G${rowIdx}`).value = item.netWeight;
    ws.getCell(`H${rowIdx}`).value = item.grossWeight;
    ws.getCell(`I${rowIdx}`).value = item.appearanceShape;
    ws.getCell(`J${rowIdx}`).value = item.aroma;
    ws.getCell(`K${rowIdx}`).value = `${item.colorScore} (${item.colorDescription || "Normal"})`;
    ws.getCell(`L${rowIdx}`).value = item.taste;
    ws.getCell(`M${rowIdx}`).value = item.isFreeForeignMatter ? "Ya (Bersih)" : "Tidak (Terkontaminasi)";
    ws.getCell(`N${rowIdx}`).value = item.moistureContent;
    ws.getCell(`O${rowIdx}`).value = item.inspectionDecision.toUpperCase();
    ws.getCell(`P${rowIdx}`).value = item.notes || "-";
    ws.getCell(`Q${rowIdx}`).value = `${item.qcPersonnelName} / ${item.qaVerifiedBy || "QA"}`;

    for (let c = 1; c <= 17; c++) {
      const cell = ws.getRow(rowIdx).getCell(c);
      cell.border = thinBorder;
      cell.font = { name: "Arial", size: 8 };
      cell.alignment = { vertical: "middle" };
      if ([1, 3, 4, 5, 6, 7, 8, 11, 13, 14, 15, 17].includes(c)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  // Keterangan SOP Resmi
  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value = "Keterangan : • (*) Ceklis apabila dalam keadaan baik pada kolom pengecekan";
  ws.getCell(`A${rowIdx + 1}`).value = "             • Bandingkan hasil yang diperoleh dengan Spesifikasi Produk Jadi (SPK-006-PJK)";
  ws.getCell(`A${rowIdx + 2}`).value = "             • Beri label LOLOS / DITOLAK berdasarkan hasil pemeriksaan produk jadi";
  ws.getCell(`A${rowIdx + 3}`).value = "             • * Warna, beri angka 1 (light brown), 2 (normal), 3 (dark brown)";
  ws.getCell(`A${rowIdx + 4}`).value = "             • ** Berat kotor meliputi berat gula, kemasan primer, dan kemasan sekunder";
  ws.getCell(`A${rowIdx + 5}`).value = "             • Standar kadar air target ekspor: <= 2.0%";

  for (let i = 0; i < 6; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Arial", size: 8, italic: true };
  }

  ws.columns = [
    { width: 14 }, { width: 22 }, { width: 16 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
    { width: 18 }, { width: 16 }, { width: 14 }, { width: 16 },
    { width: 18 }, { width: 14 }, { width: 16 }, { width: 18 }, { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-004-PJD-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Export Form QC-002-PBD Rev. 05 (Pemeriksaan Kualitas Barang Datang)
// ─────────────────────────────────────────────────────────────────────────────

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

export async function exportPBDExcel(data: IncomingCheckItem[], filterMonth?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("QC-002-PBD", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  const sample = data[0];
  const periodSource = filterMonth || sample?.checkMonth || new Date().toISOString().slice(0, 7);
  const { monthLabel, yearLabel } = formatMonthYearID(periodSource);

  // Kop Kiri (Baris 1-4)
  ws.getCell("A1").value = "CV. Manna Anugerah Sejahtera";
  ws.getCell("A1").font = { name: "Arial", size: 9, bold: true };
  ws.getCell("A2").value = "CU 820674 D-11";
  ws.getCell("A3").value = "104464OC";
  ws.getCell("A4").value = "FLO-ID 43683";
  for (let r = 2; r <= 4; r++) {
    ws.getCell(`A${r}`).font = { name: "Arial", size: 8 };
  }

  // Kop Kanan (Baris 1-2)
  ws.mergeCells("Q1:T1");
  ws.getCell("Q1").value = "QC-002-PBD";
  ws.getCell("Q1").font = { name: "Arial", size: 9, bold: true };
  ws.getCell("Q1").alignment = { horizontal: "right", vertical: "middle" };

  ws.mergeCells("Q2:T2");
  const ft = sample?.fairtradeStatus || "";
  ws.getCell("Q2").value =
    ft === "FAIRTRADE"
      ? "FAIRTRADE / [NON FAIRTRADE]"
      : ft === "NON FAIRTRADE"
        ? "[FAIRTRADE] / NON FAIRTRADE"
        : "FAIRTRADE / NON FAIRTRADE";
  ws.getCell("Q2").font = { name: "Arial", size: 8, bold: true };
  ws.getCell("Q2").alignment = { horizontal: "right", vertical: "middle" };

  // Judul Tengah (Baris 5-6)
  ws.mergeCells("A5:T5");
  ws.getCell("A5").value = "Pemeriksaan Kualitas Barang Datang";
  ws.getCell("A5").font = { name: "Arial", size: 12, bold: true };
  ws.getCell("A5").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A6:T6");
  ws.getCell("A6").value = "(PBD)";
  ws.getCell("A6").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A6").alignment = { horizontal: "center", vertical: "middle" };

  // Baris 7: Bulan, Tahun & 4 Checkbox Sertifikasi
  ws.mergeCells("A7:C7");
  ws.getCell("A7").value = `Bulan : ${monthLabel}`;
  ws.getCell("A7").font = { name: "Arial", size: 9, bold: true };

  ws.mergeCells("D7:F7");
  ws.getCell("D7").value = `Tahun : ${yearLabel}`;
  ws.getCell("D7").font = { name: "Arial", size: 9, bold: true };

  const allCerts = data.map((d) => (d.certifications || "").toUpperCase()).join(",");
  const hasCert = (c: string) => (allCerts.includes(c) ? "☑" : "☐");

  ws.mergeCells("M7:N7");
  ws.getCell("M7").value = `${hasCert("NATURAL")} NATURAL`;
  ws.mergeCells("O7:P7");
  ws.getCell("O7").value = `${hasCert("ORGANIC EU")} ORGANIC EU`;
  ws.mergeCells("Q7:R7");
  ws.getCell("Q7").value = `${hasCert("ORGANIC USDA")} ORGANIC USDA`;
  ws.mergeCells("S7:T7");
  ws.getCell("S7").value = `${hasCert("ORGANIC JAS")} ORGANIC JAS`;
  for (const addr of ["M7", "O7", "Q7", "S7"]) {
    ws.getCell(addr).font = { name: "Arial", size: 8, bold: true };
    ws.getCell(addr).alignment = { horizontal: "center", vertical: "middle" };
  }

  // Header Tabel 2 Baris (Baris 8-9, Kolom A..T = 20 kolom)
  const singleHeaders: [string, string][] = [
    ["A", "No"],
    ["B", "Tgl/Bulan"],
    ["C", "Supplier"],
    ["D", "Nama Barang"],
    ["E", "Kode Barang"],
    ["F", "Jenis Barang"],
    ["Q", "Tingkat lolos (%)"],
    ["R", "Jumlah Sampling"],
    ["S", "Ket"],
    ["T", "Paraf"],
  ];
  for (const [col, label] of singleHeaders) {
    ws.mergeCells(`${col}8:${col}9`);
    ws.getCell(`${col}8`).value = label;
  }

  ws.mergeCells("G8:P8");
  ws.getCell("G8").value = "Pengecekan";

  const subHeaders: [string, string][] = [
    ["G", "Kemasan"],
    ["H", "Bentuk"],
    ["I", "Rasa"],
    ["J", "Aroma"],
    ["K", "Warna*"],
    ["L", "Kadar air (%)"],
    ["M", "Brix"],
    ["N", "Kelarutan"],
    ["O", "pH"],
    ["P", "Label Kemasan"],
  ];
  for (const [col, label] of subHeaders) {
    ws.getCell(`${col}9`).value = label;
  }

  for (let r = 8; r <= 9; r++) {
    const row = ws.getRow(r);
    row.height = 22;
    for (let c = 1; c <= 20; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Arial", size: 8, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = thinBorder;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };
    }
  }

  // Data Rows (min 15 rows like physical sheet)
  const totalRows = Math.max(15, data.length);
  let rowIdx = 10;
  for (let i = 0; i < totalRows; i++) {
    const item = data[i];
    const row = ws.getRow(rowIdx);
    row.height = 19;

    if (item) {
      const checkMark = (ok: boolean) => (ok ? "✓" : "✗");
      const ketParts = [item.inspectionDecision || (item.overallStatus === "rejected" ? "DITOLAK" : "LOLOS")];
      if (item.notes) ketParts.push(item.notes);

      row.getCell(1).value = i + 1;
      row.getCell(2).value = item.checkDate;
      row.getCell(3).value = item.supplierName;
      row.getCell(4).value = item.productName;
      row.getCell(5).value = item.itemCode || item.batchNo || "-";
      row.getCell(6).value = item.itemType || "Bahan Baku";
      row.getCell(7).value = checkMark(item.checkPackaging ?? true);
      row.getCell(8).value = checkMark(item.checkShape ?? true);
      row.getCell(9).value = checkMark(item.checkTaste ?? true);
      row.getCell(10).value = checkMark(item.checkAroma ?? true);
      row.getCell(11).value = item.colorScore || 2;
      row.getCell(12).value = item.moistureContent ?? "-";
      row.getCell(13).value = item.brixValue ?? "-";
      row.getCell(14).value = checkMark(item.checkSolubility ?? true);
      row.getCell(15).value = item.phValue ?? "-";
      row.getCell(16).value = checkMark(item.checkPackageLabel ?? true);
      row.getCell(17).value = item.passRatePercent ?? 100;
      row.getCell(18).value = item.sampleBags || 0;
      row.getCell(19).value = ketParts.join(" — ");
      row.getCell(20).value = item.qcName || "-";
    } else {
      row.getCell(1).value = "";
    }

    for (let c = 1; c <= 20; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.font = { name: "Arial", size: 8 };
      const isLeft = c === 3 || c === 4 || c === 6 || c === 19;
      cell.alignment = {
        horizontal: isLeft ? "left" : "center",
        vertical: "middle",
        wrapText: true,
      };
    }
    rowIdx++;
  }

  // Footer Catatan (Kiri) & Kotak Diverifikasi Oleh QA (Kanan)
  const footerStart = rowIdx + 1;
  const notesLines = [
    "Catatan :",
    "• Ceklis apabila dalam keadaan baik",
    "• Bandingkan hasil yang diperoleh dengan Spesifikasi bahan baku dan barang jadi sesuai jenis barang",
    "• Beri label LOLOS / DITOLAK berdasarkan hasil pemeriksaan pada tiap barang datang",
    "* Warna, beri angka 1 (light brown), 2 (normal), 3 (dark brown)",
    "* Metode sampling dilakukan menggunakan military standard dengan AQL (Acceptable Quality Level ) 0,1 dan 2,5",
  ];
  notesLines.forEach((line, idx) => {
    const r = footerStart + idx;
    ws.getCell(`A${r}`).value = line;
    ws.getCell(`A${r}`).font = { name: "Arial", size: 8, bold: idx === 0 };
  });

  // Kotak Diverifikasi Oleh : / Tgl. / QA di kolom R..T
  ws.mergeCells(`R${footerStart}:T${footerStart}`);
  ws.getCell(`R${footerStart}`).value = "Diverifikasi Oleh :";
  ws.getCell(`R${footerStart}`).font = { name: "Arial", size: 8, bold: true };
  ws.getCell(`R${footerStart}`).alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`R${footerStart + 1}:T${footerStart + 3}`);
  const qaDateText = sample?.qaDate ? sample.qaDate.slice(0, 10) : "";
  ws.getCell(`R${footerStart + 1}`).value = `Tgl. ${qaDateText}\n\n${sample?.qaName || ""}`;
  ws.getCell(`R${footerStart + 1}`).font = { name: "Arial", size: 8 };
  ws.getCell(`R${footerStart + 1}`).alignment = { horizontal: "left", vertical: "top", wrapText: true };

  ws.mergeCells(`R${footerStart + 4}:T${footerStart + 4}`);
  ws.getCell(`R${footerStart + 4}`).value = "QA";
  ws.getCell(`R${footerStart + 4}`).font = { name: "Arial", size: 8, bold: true };
  ws.getCell(`R${footerStart + 4}`).alignment = { horizontal: "center", vertical: "middle" };

  for (let r = footerStart; r <= footerStart + 4; r++) {
    for (let c = 18; c <= 20; c++) {
      ws.getRow(r).getCell(c).border = thinBorder;
    }
  }

  // Rev. 05 di tengah bawah
  const revRow = footerStart + 6;
  ws.mergeCells(`A${revRow}:T${revRow}`);
  ws.getCell(`A${revRow}`).value = "Rev. 05";
  ws.getCell(`A${revRow}`).font = { name: "Arial", size: 8 };
  ws.getCell(`A${revRow}`).alignment = { horizontal: "center", vertical: "middle" };

  ws.columns = [
    { width: 5 },  // A: No
    { width: 12 }, // B: Tgl/Bulan
    { width: 18 }, // C: Supplier
    { width: 22 }, // D: Nama Barang
    { width: 14 }, // E: Kode Barang
    { width: 13 }, // F: Jenis Barang
    { width: 9 },  // G: Kemasan
    { width: 8 },  // H: Bentuk
    { width: 8 },  // I: Rasa
    { width: 8 },  // J: Aroma
    { width: 8 },  // K: Warna*
    { width: 10 }, // L: Kadar air (%)
    { width: 8 },  // M: Brix
    { width: 9 },  // N: Kelarutan
    { width: 7 },  // O: pH
    { width: 11 }, // P: Label Kemasan
    { width: 11 }, // Q: Tingkat lolos (%)
    { width: 11 }, // R: Jumlah Sampling
    { width: 22 }, // S: Ket
    { width: 12 }, // T: Paraf
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-002-PBD-${periodSource}.xlsx`);
}
