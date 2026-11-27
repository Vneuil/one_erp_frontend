import ExcelJS from "exceljs";
import {
  SterilizationTempItem,
  LiquidPackagingVisualItem,
  MetalVerificationItem,
  LiquidSugarProcessingItem,
  LiquidSugarFinishedGoodsItem,
  LiquidSugarWashVerificationItem,
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

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function fmtMonthYear(monthStr?: string): string {
  if (!monthStr || !/^\d{4}-\d{2}/.test(monthStr)) return monthStr || "-";
  const [yr, mo] = monthStr.split("-");
  const idx = parseInt(mo, 10) - 1;
  return `${MONTHS_ID[idx] || mo} / ${yr}`;
}

function styleHeaderRange(ws: ExcelJS.Worksheet, startRow: number, endRow: number, colCount: number, fillHex = "FFEFEFEF") {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    row.font = { name: "Arial", size: 9, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillHex } };
    }
  }
}

// 1. Export Form QC-057-MSS (Monitoring Suhu Sterilisasi)
export async function exportMSSExcel(
  data: SterilizationTempItem[],
  stage: "tahap_1" | "tahap_2" | "all" = "all",
  filterMonth?: string
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Monitoring Suhu Sterilisasi", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = "MONITORING SUHU STERILISASI";
  ws.getCell("A1").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A2:K2");
  ws.getCell("A2").value = `(MSS) • Form QC-057-MSS (${stage === "tahap_2" ? "Tahap 2" : stage === "tahap_1" ? "Tahap 1" : "Semua Tahap"})`;
  ws.getCell("A2").font = { name: "Arial", size: 11, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.getCell("A4").value = `Bulan / Tahun : ${fmtMonthYear(filterMonth || data[0]?.checkMonth)}`;
  ws.getCell("A4").font = { name: "Arial", size: 10, bold: true };

  ws.mergeCells("A5:A6"); ws.getCell("A5").value = "HARI/ TANGGAL";
  ws.mergeCells("B5:B6"); ws.getCell("B5").value = "KEMASAN";
  ws.mergeCells("C5:D5"); ws.getCell("C5").value = "AWAL";
  ws.getCell("C6").value = "WAKTU (WIB)";
  ws.getCell("D6").value = "SUHU (°C)";
  ws.mergeCells("E5:F5"); ws.getCell("E5").value = "HEATING";
  ws.getCell("E6").value = "WAKTU (WIB)";
  ws.getCell("F6").value = "SUHU (°C)";
  ws.mergeCells("G5:H5"); ws.getCell("G5").value = "AKHIR";
  ws.getCell("G6").value = "WAKTU (WIB)";
  ws.getCell("H6").value = "SUHU (°C)";
  ws.mergeCells("I5:I6"); ws.getCell("I5").value = "PERMASALAHAN";
  ws.mergeCells("J5:J6"); ws.getCell("J5").value = "TINDAKAN";
  ws.mergeCells("K5:K6"); ws.getCell("K5").value = "Paraf QC";

  styleHeaderRange(ws, 5, 6, 11);

  let rowIdx = 7;
  for (const item of data) {
    const row = ws.getRow(rowIdx);
    row.values = [
      item.checkDate,
      item.packagingType,
      item.initialTime,
      item.initialTemp,
      item.heatingTime,
      item.heatingTemp,
      item.finalTime,
      item.finalTemp,
      item.issues || "-",
      item.actionTaken || "-",
      item.qcName || "-",
    ];
    row.font = { name: "Arial", size: 9 };
    for (let c = 1; c <= 11; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { horizontal: c <= 8 || c === 11 ? "center" : "left", vertical: "middle" };
    }
    rowIdx++;
  }

  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value = "Keterangan : - Awal yaitu ketika mesin sterilisasi dinyalakan";
  ws.getCell(`A${rowIdx + 1}`).value = "- Heating yaitu ketika suhu telah mencapai 70°C, minimal 45 menit";
  ws.getCell(`A${rowIdx + 2}`).value = "- Akhir yaitu ketika mencapai 45 menit";
  for (let i = 0; i < 3; i++) ws.getCell(`A${rowIdx + i}`).font = { name: "Arial", size: 8, italic: true };

  ws.columns = [
    { width: 14 }, { width: 22 }, { width: 12 }, { width: 11 },
    { width: 12 }, { width: 11 }, { width: 12 }, { width: 11 },
    { width: 22 }, { width: 22 }, { width: 14 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-057-MSS-${stage}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 2. Export Form QC-041-PVK Rev. 01 (Pengecekan Visual Kemasan Primer Gula Cair)
export async function exportPVKExcel(data: LiquidPackagingVisualItem[], filterMonth?: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("QC-041-PVK", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  ws.getCell("A1").value = "CV. Manna Anugerah Sejahtera";
  ws.getCell("A1").font = { name: "Arial", size: 9, bold: true };
  ws.getCell("J1").value = "QC-041-PVK";
  ws.getCell("J1").font = { name: "Arial", size: 9, bold: true };
  ws.getCell("J1").alignment = { horizontal: "right" };

  ws.mergeCells("A3:J3");
  ws.getCell("A3").value = "PENGECEKAN VISUAL KEMASAN PRIMER GULA CAIR (PVK)";
  ws.getCell("A3").font = { name: "Arial", size: 13, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  ws.getCell("A5").value = `Penanggung jawab : ${data[0]?.picResponsible || "Sajiman"}`;
  ws.getCell("F5").value = `Bulan / Tahun : ${fmtMonthYear(filterMonth || data[0]?.checkMonth)}`;
  ws.getCell("A5").font = { name: "Arial", size: 10, bold: true };
  ws.getCell("F5").font = { name: "Arial", size: 10, bold: true };

  const headers = [
    "HARI/ TANGGAL", "JENIS KEMASAN", "JUMLAH", "NAMA BUYER", "STERILISASI",
    "KONDISI KEMASAN (B/K)", "TEMUAN", "TINDAKAN", "NAMA/ PARAF PIC", "PARAF QC",
  ];
  ws.getRow(6).values = headers;
  styleHeaderRange(ws, 6, 6, 10, "FFD9E1F2");

  let rowIdx = 7;
  for (const it of data) {
    const row = ws.getRow(rowIdx);
    row.values = [
      it.checkDate,
      it.packagingType,
      it.quantity,
      it.buyerName || "-",
      it.sterilizationInfo || "-",
      it.packagingCondition,
      it.findings || "-",
      it.actionTaken || "-",
      it.picName,
      it.qcName || "-",
    ];
    row.font = { name: "Arial", size: 9 };
    for (let c = 1; c <= 10; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { horizontal: [1, 3, 6, 9, 10].includes(c) ? "center" : "left", vertical: "middle" };
    }
    rowIdx++;
  }

  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value = "Keterangan : * Kondisi : B (Bersih), K (Kotor)";
  ws.getCell(`A${rowIdx}`).font = { name: "Arial", size: 8, italic: true };
  ws.getCell(`G${rowIdx}`).value = `Diketahui Oleh QC: ${data[0]?.qcKnownBy || "-"}`;
  ws.getCell(`I${rowIdx}`).value = `Diverifikasi Oleh QA: ${data[0]?.qaVerifiedBy || "-"}`;
  ws.getCell(`E${rowIdx + 2}`).value = "Revisi 01";

  ws.columns = [
    { width: 14 }, { width: 20 }, { width: 10 }, { width: 18 }, { width: 18 },
    { width: 16 }, { width: 20 }, { width: 20 }, { width: 16 }, { width: 14 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-041-PVK-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 3. Export Form QC-017-VMD Rev. 01 Gula Cair
export async function exportVMDGulaCairExcel(data: MetalVerificationItem[], filterMonth?: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Revisi 01 GULA CAIR", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "CATATAN VERIFIKASI METAL DETECTOR (VMD) — GULA CAIR";
  ws.getCell("A1").font = { name: "Arial", size: 13, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.getCell("I1").value = "CCP";
  ws.getCell("I1").font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFF0000" } };
  ws.getCell("I1").alignment = { horizontal: "center" };

  ws.getCell("A3").value = "Lokasi : Gula Cair";
  ws.getCell("E3").value = `Bulan/Tahun : ${fmtMonthYear(filterMonth || data[0]?.checkMonth)}`;
  ws.getCell("A3").font = { name: "Arial", size: 10, bold: true };
  ws.getCell("E3").font = { name: "Arial", size: 10, bold: true };

  ws.getRow(5).values = [
    "Tgl", "Jam", "Monitoring ke", "Tes Piece", "Alarm", "Conveyor", "Tindakan Perbaikan", "Paraf PIC", "Paraf QC",
  ];
  styleHeaderRange(ws, 5, 5, 9);

  let rowIdx = 6;
  for (const it of data) {
    const pieces = [
      { label: it.feTestPieceSize || "Fe >= 1.5mm", alarm: it.feAlarmTriggered, conv: it.feConveyorStopped },
      { label: it.nonFeTestPieceSize || "Non-Fe >= 1.5mm", alarm: it.nonFeAlarmTriggered, conv: it.nonFeConveyorStopped },
      { label: it.ssTestPieceSize || "SS >= 2.5mm", alarm: it.ssAlarmTriggered, conv: it.ssConveyorStopped },
    ];
    for (const p of pieces) {
      const row = ws.getRow(rowIdx);
      row.values = [
        it.checkDate,
        it.checkTime,
        `Monitoring #${it.monitoringRound}`,
        p.label,
        p.alarm ? "Bunyi (√)" : "Tidak Bunyi (X)",
        p.conv ? "Berhenti (√)" : "Tidak Berhenti (X)",
        it.correctiveAction || "-",
        it.picName,
        it.qcVerifierName || "-",
      ];
      row.font = { name: "Arial", size: 9 };
      for (let c = 1; c <= 9; c++) {
        row.getCell(c).border = thinBorder;
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
      rowIdx++;
    }
  }

  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value =
    "Catatan : Ukuran Test Piece Gula Cair : Fe >= 1,5 mm, Non Fe >= 1,5 mm, dan SS >= 2,5 mm. Monitoring dilakukan setiap 4 jam sekali / awal & akhir.";
  ws.getCell(`A${rowIdx}`).font = { name: "Arial", size: 8, italic: true };

  ws.columns = [
    { width: 12 }, { width: 10 }, { width: 14 }, { width: 18 },
    { width: 16 }, { width: 18 }, { width: 22 }, { width: 14 }, { width: 14 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-017-VMD-GulaCair-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 4. Export Form QC-014-MNC (Monitoring Proses Pengolahan Gula Cair)
export async function exportMNCExcel(data: LiquidSugarProcessingItem[], filterMonth?: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Monitoring Pengolahan MNC", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  ws.mergeCells("A1:R1");
  ws.getCell("A1").value = "MONITORING PROSES PENGOLAHAN GULA CAIR (MNC)";
  ws.getCell("A1").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.getCell("A3").value = `Bulan / Tahun : ${fmtMonthYear(filterMonth || data[0]?.checkMonth)}`;
  ws.getCell("A3").font = { name: "Arial", size: 10, bold: true };

  ws.mergeCells("A5:A6"); ws.getCell("A5").value = "HARI/ TANGGAL";
  ws.mergeCells("B5:B6"); ws.getCell("B5").value = "KODE PRODUK";
  ws.mergeCells("C5:G5"); ws.getCell("C5").value = "AWAL";
  ws.getCell("C6").value = "WAKTU (WIB)";
  ws.getCell("D6").value = "SUHU (°C)";
  ws.getCell("E6").value = "KADAR AIR (%)";
  ws.getCell("F6").value = "Brix";
  ws.getCell("G6").value = "pH";
  ws.mergeCells("H5:I5"); ws.getCell("H5").value = "HEATING (CCP 90-95°C)";
  ws.getCell("H6").value = "WAKTU (WIB)";
  ws.getCell("I6").value = "SUHU (°C)";
  ws.mergeCells("J5:N5"); ws.getCell("J5").value = "AKHIR";
  ws.getCell("J6").value = "WAKTU (WIB)";
  ws.getCell("K6").value = "SUHU PRODUK (°C)";
  ws.getCell("L6").value = "KADAR AIR (%)";
  ws.getCell("M6").value = "Brix";
  ws.getCell("N6").value = "pH";
  ws.mergeCells("O5:O6"); ws.getCell("O5").value = "PERMASALAHAN";
  ws.mergeCells("P5:P6"); ws.getCell("P5").value = "TINDAKAN";
  ws.mergeCells("Q5:Q6"); ws.getCell("Q5").value = "PIC / Paraf";
  ws.mergeCells("R5:R6"); ws.getCell("R5").value = "Paraf QC";

  styleHeaderRange(ws, 5, 6, 18);

  let rowIdx = 7;
  for (const it of data) {
    const row = ws.getRow(rowIdx);
    row.values = [
      it.checkDate,
      it.productCode,
      it.initialTime,
      it.initialTemp,
      it.initialMoisture,
      it.initialBrix,
      it.initialPh,
      it.heatingTime,
      it.heatingTemp,
      it.finalTime,
      it.finalProductTemp,
      it.finalMoisture,
      it.finalBrix,
      it.finalPh,
      it.issues || "-",
      it.actionTaken || "-",
      it.picName,
      it.qcName || "-",
    ];
    row.font = { name: "Arial", size: 9 };
    for (let c = 1; c <= 18; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { horizontal: c <= 14 || c >= 17 ? "center" : "left", vertical: "middle" };
    }
    rowIdx++;
  }

  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value = "Keterangan : - Awal yaitu ketika api mulai dinyalakan";
  ws.getCell(`A${rowIdx + 1}`).value = "- Heating yaitu ketika suhu telah mencapai CCP (90-95°C, minimal 10 menit)";
  ws.getCell(`A${rowIdx + 2}`).value = "- Akhir yaitu ketika produk sudah siap untuk diturunkan (telah melewati batas kritis)";
  for (let i = 0; i < 3; i++) ws.getCell(`A${rowIdx + i}`).font = { name: "Arial", size: 8, italic: true };

  ws.columns = [
    { width: 13 }, { width: 14 },
    { width: 11 }, { width: 10 }, { width: 12 }, { width: 9 }, { width: 8 },
    { width: 11 }, { width: 10 },
    { width: 11 }, { width: 13 }, { width: 12 }, { width: 9 }, { width: 8 },
    { width: 20 }, { width: 20 }, { width: 14 }, { width: 12 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-014-MNC-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 5. Export Form QC-015-PJC Rev. 02 (Pemeriksaan Kualitas Produk Jadi Gula Cair)
export async function exportPJCExcel(data: LiquidSugarFinishedGoodsItem[], filterMonth?: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("QC-015-PJC", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  ws.getCell("A1").value = "CV. Manna Anugerah Sejahtera\n104464OC";
  ws.getCell("R1").value = "QC-015-PJC";
  ws.getCell("R1").font = { name: "Arial", size: 9, bold: true };
  ws.getCell("R1").alignment = { horizontal: "right" };

  ws.mergeCells("A2:R2");
  ws.getCell("A2").value = "Pemeriksaan Kualitas Produk Jadi Gula Cair (PJC)";
  ws.getCell("A2").font = { name: "Arial", size: 13, bold: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.getCell("A4").value = `Bulan/ Tahun : ${fmtMonthYear(filterMonth || data[0]?.checkMonth)}`;
  ws.getCell("A4").font = { name: "Arial", size: 10, bold: true };

  ws.mergeCells("A5:A6"); ws.getCell("A5").value = "Tgl";
  ws.mergeCells("B5:B6"); ws.getCell("B5").value = "Nama Produk";
  ws.mergeCells("C5:C6"); ws.getCell("C5").value = "Batch Number";
  ws.mergeCells("D5:D6"); ws.getCell("D5").value = "Kode Bahan";
  ws.mergeCells("E5:O5"); ws.getCell("E5").value = "Pengecekan";
  ws.getCell("E6").value = "Kemasan";
  ws.getCell("F6").value = "Berat";
  ws.getCell("G6").value = "Bentuk";
  ws.getCell("H6").value = "Aroma";
  ws.getCell("I6").value = "Warna*";
  ws.getCell("J6").value = "Rasa";
  ws.getCell("K6").value = "Bebas Benda Asing";
  ws.getCell("L6").value = "Kelarutan";
  ws.getCell("M6").value = "Kadar Air (%)";
  ws.getCell("N6").value = "pH";
  ws.getCell("O6").value = "Brix";
  ws.mergeCells("P5:P6"); ws.getCell("P5").value = "Lolos/ditolak";
  ws.mergeCells("Q5:Q6"); ws.getCell("Q5").value = "Keterangan";
  ws.mergeCells("R5:R6"); ws.getCell("R5").value = "Paraf QC";

  styleHeaderRange(ws, 5, 6, 18);

  const chk = (v: boolean) => (v ? "✓" : "✗");
  let rowIdx = 7;
  for (const it of data) {
    const row = ws.getRow(rowIdx);
    row.values = [
      it.checkDate,
      it.productName,
      it.batchNo,
      it.rawMaterialCode || "-",
      chk(it.checkPackaging),
      it.weightValue !== undefined ? `${chk(it.checkWeight)} (${it.weightValue})` : chk(it.checkWeight),
      chk(it.checkShape),
      chk(it.checkAroma),
      `${it.colorScore} (${it.colorDescription || "Normal"})`,
      chk(it.checkTaste),
      chk(it.checkFreeForeignMatter),
      chk(it.checkSolubility),
      it.moistureContent,
      it.phValue,
      it.brixValue,
      it.inspectionDecision,
      it.notes || "-",
      it.qcPersonnelName,
    ];
    row.font = { name: "Arial", size: 9 };
    for (let c = 1; c <= 18; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { horizontal: [2, 17].includes(c) ? "left" : "center", vertical: "middle" };
    }
    rowIdx++;
  }

  rowIdx += 2;
  ws.getCell(`A${rowIdx}`).value = "• Ceklis apabila dalam keadaan baik pada kolom pengecekan";
  ws.getCell(`A${rowIdx + 1}`).value = "• Bandingkan hasil yang diperoleh dengan Spesifikasi Produk Jadi";
  ws.getCell(`A${rowIdx + 2}`).value = "• Beri label LOLOS / DITOLAK berdasarkan hasil pemeriksaan produk jadi";
  ws.getCell(`A${rowIdx + 3}`).value = "• Warna, beri angka 1 (light brown), 2 (normal), 3 (dark brown)";
  ws.getCell(`P${rowIdx}`).value = `Diverifikasi Oleh QA: ${data[0]?.qaVerifiedBy || "-"}`;
  ws.getCell(`I${rowIdx + 5}`).value = "Rev 02";

  ws.columns = [
    { width: 12 }, { width: 22 }, { width: 15 }, { width: 13 },
    { width: 9 }, { width: 11 }, { width: 9 }, { width: 9 },
    { width: 13 }, { width: 9 }, { width: 14 }, { width: 10 },
    { width: 12 }, { width: 8 }, { width: 8 },
    { width: 13 }, { width: 22 }, { width: 13 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-015-PJC-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 6. Export Form QC-055-VHC Rev. 00 (Verifikasi Hasil Cuci - Ruang Gula Cair)
export async function exportVHCExcel(data: LiquidSugarWashVerificationItem[], filterMonth?: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("VHC Ruang Gula Cair", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = "Verifikasi Hasil Cuci (VHC) — Ruang Gula Cair";
  ws.getCell("A1").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.getCell("A3").value = `Penanggung Jawab : ${data[0]?.picResponsible || "QC (Andin)"}`;
  ws.getCell("E3").value = `Bulan : ${fmtMonthYear(filterMonth || data[0]?.checkMonth)}`;
  ws.getCell("I3").value = `Lokasi : ${data[0]?.location || "Gula Cair"}`;
  ["A3", "E3", "I3"].forEach((c) => { ws.getCell(c).font = { name: "Arial", size: 10, bold: true }; });

  ws.getRow(5).values = [
    "Tanggal Pencucian",
    "Batch",
    "1. Suhu Air Tangki (Min 75°C)",
    "2. Sirkulasi Pipa Mulai",
    "2. Sirkulasi Pipa Selesai",
    "Durasi (Min 10 mnt)",
    "3. Bilas Warna (Bening)",
    "3. Bilas Aroma (Normal)",
    "3. Bilas Kotoran (Bebas)",
    "Verifikasi QC",
    "Status / QA",
  ];
  styleHeaderRange(ws, 5, 5, 11);

  let rowIdx = 6;
  for (const it of data) {
    const row = ws.getRow(rowIdx);
    row.values = [
      it.checkDate,
      it.batchNo || "-",
      `${it.waterTempActual} °C (${it.isTempStandardMet ? "OK" : "<75°C"})`,
      it.circulationStartTime,
      it.circulationEndTime,
      `${it.circulationDurationMin} mnt (${it.isCirculationStandardMet ? "OK" : "<10m"})`,
      it.rinseColor,
      it.rinseAroma,
      it.rinseDirt,
      it.qcVerifierName,
      `${it.overallStatus === "passed" ? "LULUS" : "CUCI ULANG"} / ${it.qaVerifiedBy || "-"}`,
    ];
    row.font = { name: "Arial", size: 9 };
    for (let c = 1; c <= 11; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
    }
    rowIdx++;
  }

  rowIdx += 2;
  const notes = [
    "Keterangan :",
    "1. Cek kondisi alat sesuai jenis alat (tidak berkarat, tidak rapuh, tidak retak, kawat mesh tidak sobek/patah)",
    "3. Pembersihan dilakukan setelah alat digunakan dan 1 hari sebelum alat digunakan setelah idle time",
    "4. Apabila mesin tidak dipakai dalam periode 2 minggu, maka mesin wajib dibersihkan dan disanitasi",
    "5. Apabila hasil verifikasi suhu tidak sesuai maka suhu ditingkatkan; bila waktu kontak < 10 menit maka dilanjutkan",
    "6. Apabila hasil pemantauan warna, aroma, dan kotoran belum memenuhi standard maka pembersihan diulangi",
  ];
  notes.forEach((n, idx) => {
    ws.getCell(`A${rowIdx + idx}`).value = n;
    ws.getCell(`A${rowIdx + idx}`).font = { name: "Arial", size: 8, italic: idx > 0, bold: idx === 0 };
  });

  ws.columns = [
    { width: 15 }, { width: 14 }, { width: 22 }, { width: 16 }, { width: 16 },
    { width: 16 }, { width: 16 }, { width: 18 }, { width: 20 }, { width: 16 }, { width: 20 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer, `Form-QC-055-VHC-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
