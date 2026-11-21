import ExcelJS from "exceljs";
import {
  SievingMonitoringItem,
  MagnetTrapItem,
  MeshBoltMonitoringItem,
  OvenMonitoringItem,
  NeedleMonitoringItem,
  ScissorMonitoringItem,
  MetalCleaningItem,
  MetalVerificationItem,
  FinishedGoodsInspectionItem,
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
// 3. Export Form QC-010-MNM.01 (Monitoring Mur & Baut Mesh Ayakan)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportMNMExcel(data: MeshBoltMonitoringItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Monitoring Mur & Baut", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = "MONITORING DAN KONDISI MUR & BAUT PADA MESH AYAKAN";
  ws.getCell("A1").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A2:K2");
  ws.getCell("A2").value = "(MNM) • Form-QC-010-MNM. 01";
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
  ws.getCell("B5").value = "KODE BATCH / LOT";
  ws.mergeCells("C5:C6");
  ws.getCell("C5").value = "MESH";

  // AWAL
  ws.mergeCells("D5:G5");
  ws.getCell("D5").value = "PEMERIKSAAN AWAL";
  ws.getCell("D6").value = "Jml Baut";
  ws.getCell("E6").value = "Kondisi / Kencang";
  ws.getCell("F6").value = "Temuan & Tindakan";
  ws.getCell("G6").value = "PIC / QC";

  // AKHIR
  ws.mergeCells("H5:K5");
  ws.getCell("H5").value = "PEMERIKSAAN AKHIR";
  ws.getCell("H6").value = "Jml Baut";
  ws.getCell("I6").value = "Integritas Baut";
  ws.getCell("J6").value = "Temuan & Tindakan";
  ws.getCell("K6").value = "PIC / QC";

  for (let r = 5; r <= 6; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Arial", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 11; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    }
  }

  let rowIdx = 7;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = item.checkDate;
    row.getCell(2).value = item.batchNo || "-";
    row.getCell(3).value = item.meshSize;

    row.getCell(4).value = `${item.initialBoltCount} Baut`;
    row.getCell(5).value = `${item.initialIsTight ? "Kencang" : "Kendor"}, ${item.initialCondition}`;
    row.getCell(6).value = `${item.initialFindings || "Tidak ada temuan"}${item.initialAction ? ` -> ${item.initialAction}` : ""}`;
    row.getCell(7).value = `${item.initialPicName}${item.initialQcName ? ` / ${item.initialQcName}` : ""}`;

    row.getCell(8).value = `${item.finalBoltCount} Baut`;
    row.getCell(9).value = item.isCountMatched ? "Utuh & Lengkap" : "BAUT HILANG (HAZARD)";
    row.getCell(10).value = `${item.finalFindings || "Tidak ada temuan"}${item.finalAction ? ` -> ${item.finalAction}` : ""}`;
    row.getCell(11).value = `${item.finalPicName}${item.finalQcName ? ` / ${item.finalQcName}` : ""}`;

    row.font = { name: "Arial", size: 9 };
    for (let c = 1; c <= 11; c++) {
      row.getCell(c).border = thinBorder;
    }
    rowIdx++;
  }

  // Notes
  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value =
    "Keterangan : - Pengecekan mur dan baut dilakukan setiap awal dan akhir proses pengayakan serta saat pergantian mesh / kode bahan";
  ws.getCell(`A${rowIdx + 1}`).value =
    "- Pastikan semua mur, baut, dan ring pengunci dalam kondisi kencang dan tidak ada yang kendor atau hilang (risiko physical contamination)";
  ws.getCell(`A${rowIdx + 2}`).value =
    "- Laporkan segera ke QC & Maintenance jika ada mur/baut yang kendor/hilang sebelum mesin dinyalakan";

  for (let i = 0; i < 3; i++) {
    ws.getCell(`A${rowIdx + i}`).font = { name: "Arial", size: 8, italic: true };
  }

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 22;
  ws.getColumn(6).width = 24;
  ws.getColumn(7).width = 18;
  ws.getColumn(8).width = 12;
  ws.getColumn(9).width = 22;
  ws.getColumn(10).width = 24;
  ws.getColumn(11).width = 18;

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-010-MNM-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
// 7. Export Form CPP (Catatan Pembersihan dan Pemakaian Alat Metal Detector)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportCPPExcel(data: MetalCleaningItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Pembersihan Metal Detector", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = "Catatan Pembersihan dan Pemakaian Alat Metal Detector";
  ws.getCell("A2").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:L3");
  ws.getCell("A3").value = "(CPP) - Standar Sanitasi HACCP & BRC";
  ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  const headers = [
    "Tanggal", "No Mesin", "Lokasi", "Jenis Pembersihan", "Kebersihan Sensor",
    "Kebersihan Belt", "Reject Bin", "Kondisi Fisik", "Jam Mulai", "Jam Selesai",
    "Operator", "Status QC",
  ];

  const headerRow = ws.getRow(5);
  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = { name: "Arial", size: 9, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = thinBorder;
  });

  let rowIdx = 6;
  for (const item of data) {
    ws.getCell(`A${rowIdx}`).value = item.checkDate;
    ws.getCell(`B${rowIdx}`).value = item.machineNo;
    ws.getCell(`C${rowIdx}`).value = item.location;
    ws.getCell(`D${rowIdx}`).value = item.cleaningType;
    ws.getCell(`E${rowIdx}`).value = item.sensorCleanliness;
    ws.getCell(`F${rowIdx}`).value = item.beltCleanliness;
    ws.getCell(`G${rowIdx}`).value = item.rejectBinCleanliness;
    ws.getCell(`H${rowIdx}`).value = item.physicalCondition;
    ws.getCell(`I${rowIdx}`).value = item.startTime;
    ws.getCell(`J${rowIdx}`).value = item.endTime;
    ws.getCell(`K${rowIdx}`).value = item.operatorName;
    ws.getCell(`L${rowIdx}`).value = item.overallStatus === "passed" ? "OK / Bersih" : item.overallStatus;

    for (let c = 1; c <= 12; c++) {
      const cell = ws.getRow(rowIdx).getCell(c);
      cell.border = thinBorder;
      cell.font = { name: "Arial", size: 8 };
      cell.alignment = { vertical: "middle" };
      if ([1, 2, 3, 9, 10, 11, 12].includes(c)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    }
    rowIdx++;
  }

  ws.columns = [
    { width: 14 }, { width: 12 }, { width: 16 }, { width: 18 },
    { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 },
    { width: 12 }, { width: 12 }, { width: 16 }, { width: 16 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-CPP-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
