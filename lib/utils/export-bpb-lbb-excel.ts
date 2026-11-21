import ExcelJS from "exceljs";
import { MaterialRequisitionItem, LBBReportItem } from "../api/manufacturing";

export async function exportBPBExcel(req: MaterialRequisitionItem): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("BPB", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Header 1: Company
  ws.mergeCells("A1:E1");
  const compCell = ws.getCell("A1");
  compCell.value = "CV. Manna Anugerah Sejahtera";
  compCell.font = { name: "Arial", size: 12, bold: true };

  ws.mergeCells("A2:E2");
  const certCell = ws.getCell("A2");
  certCell.value = "CU 820674 D-11 • 104464OC • FLO-ID 43683";
  certCell.font = { name: "Arial", size: 9, italic: true };

  ws.mergeCells("A3:E3");
  const formCell = ws.getCell("A3");
  formCell.value = `GDG-011-BPB • Revisi : 00 | FAIRTRADE / NON FAIRTRADE* | ${req.materialCategory || "GSKN & GCKN"}`;
  formCell.font = { name: "Arial", size: 9, bold: true };

  // Title
  ws.mergeCells("A5:E5");
  const titleCell = ws.getCell("A5");
  titleCell.value = "BON PERMINTAAN BAHAN BAKU (BPB)";
  titleCell.font = { name: "Arial", size: 13, bold: true, underline: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Meta
  ws.getCell("A7").value = "No. Dokumen";
  ws.getCell("B7").value = `: ${req.requestNo}`;
  ws.getCell("D7").value = "Tanggal";
  ws.getCell("E7").value = `: ${req.requestDate}`;

  ws.getCell("A8").value = "Departemen";
  ws.getCell("B8").value = `: ${req.department}`;
  ws.getCell("D8").value = "Order / SPK";
  ws.getCell("E8").value = `: ${req.orderNumber || "-"}`;

  for (let r = 7; r <= 8; r++) {
    ws.getRow(r).font = { name: "Arial", size: 9 };
  }

  // Table header (Row 10)
  const headers = ["No", "Nama barang", "Jumlah", "No. Batch", "Keterangan"];
  const headerRow = ws.getRow(10);
  headerRow.values = headers;
  headerRow.font = { name: "Arial", size: 9, bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  let curRow = 11;
  (req.lines || []).forEach((line, idx) => {
    const qty = line.quantityIssued > 0 ? line.quantityIssued : line.quantityRequested;
    const pkgs = (line.packageCountIssued && line.packageCountIssued > 0) ? line.packageCountIssued : line.packageCountRequested;
    const qtyStr = `${qty} ${line.uom}${pkgs ? ` (${pkgs} ${line.packageUnit || "Sak"})` : ""}`;
    const ketParts: string[] = [];
    if (line.arrivalDateRef) ketParts.push(line.arrivalDateRef);
    if (line.rackLocation || line.palletNo) ketParts.push(`Rak/Pallet: ${line.rackLocation || "-"}/${line.palletNo || "-"}`);
    if (line.moistureContent != null) ketParts.push(`KA: ${line.moistureContent}%`);
    if (line.notes) ketParts.push(line.notes);

    const r = ws.getRow(curRow);
    r.values = [
      idx + 1,
      `${line.productName} ${line.batchNo ? `(${line.batchNo})` : ""}`,
      qtyStr,
      line.batchNo || "-",
      ketParts.join(" • ") || "-",
    ];
    r.font = { name: "Arial", size: 9 };
    r.eachCell((cell, colNum) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      if (colNum === 1 || colNum === 4) cell.alignment = { horizontal: "center", vertical: "middle" };
      else if (colNum === 3) cell.alignment = { horizontal: "right", vertical: "middle" };
    });
    curRow++;
  });

  curRow += 2;
  ws.getCell(`A${curRow}`).value = "Catatan: Dibuat 2 rangkap: Gudang (Asli) | Produksi (Copy 1)";
  ws.getCell(`A${curRow}`).font = { name: "Arial", size: 8, italic: true };

  // Signatures
  curRow += 2;
  ws.getCell(`A${curRow}`).value = "Dibuat oleh (Produksi)";
  ws.getCell(`C${curRow}`).value = "Diserahkan oleh (Gudang)";
  ws.getCell(`E${curRow}`).value = "Manager Gudang (ACC)";
  ws.getRow(curRow).font = { name: "Arial", size: 9, bold: true };
  ws.getRow(curRow).alignment = { horizontal: "center" };

  curRow += 4;
  ws.getCell(`A${curRow}`).value = req.requestedBy || "...........................";
  ws.getCell(`C${curRow}`).value = req.issuedBy || "...........................";
  ws.getCell(`E${curRow}`).value = req.warehouseApprovedBy || "...........................";
  ws.getRow(curRow).font = { name: "Arial", size: 9, underline: true };
  ws.getRow(curRow).alignment = { horizontal: "center" };

  // Column widths
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 38;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 32;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BPB-${req.requestNo}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportLBBExcel(lbb: LBBReportItem): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const isVCO = (lbb.variantType || "").toUpperCase() === "VCO";
  const uomLabel = lbb.uom || (isVCO ? "L" : "kg");

  const ws = workbook.addWorksheet(lbb.variantType || "LBB", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Row 1: Header
  ws.mergeCells("A1:L1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "CV. Manna Anugerah Sejahtera — LAPORAN PERMINTAAN BAHAN BAKU (LBB)";
  titleCell.font = { name: "Arial", size: 12, bold: true };

  ws.mergeCells("A2:L2");
  const codeCell = ws.getCell("A2");
  codeCell.value = `Kode Form: GDG-013-LBB • Revisi 00 | No: ${lbb.reportNo} | Status: ${(lbb.status || "").toUpperCase()}`;
  codeCell.font = { name: "Arial", size: 9, italic: true };

  // Metadata Block (Row 4-6)
  ws.getCell("A4").value = "Tanggal :";
  ws.getCell("B4").value = lbb.reportDate;
  ws.getCell("D4").value = "No. Mesin :";
  ws.getCell("E4").value = lbb.machineNo || "-";
  ws.getCell("G4").value = "Mesh :";
  ws.getCell("H4").value = lbb.meshSize || "-";
  ws.getCell("J4").value = "Customer :";
  ws.getCell("K4").value = lbb.customerName || "-";

  ws.getCell("A5").value = "Kode Bahan :";
  ws.getCell("B5").value = lbb.materialCode;
  ws.getCell("D5").value = "Suplier :";
  ws.getCell("E5").value = lbb.supplierName || "-";
  ws.getCell("J5").value = "Fairtrade / Non Fairtrade* :";
  ws.getCell("K5").value = lbb.fairtradeStatus || "Fairtrade";

  ws.getCell("A6").value = "Nama Barang :";
  ws.getCell("B6").value = lbb.productName;

  for (let r = 4; r <= 6; r++) {
    ws.getRow(r).font = { name: "Arial", size: 9 };
  }

  // Row 7: Kode header for 6 columns
  const row7 = ws.getRow(7);
  for (let c = 0; c < 6; c++) {
    const colStart = c * 2 + 1;
    ws.mergeCells(7, colStart, 7, colStart + 1);
    const cell = ws.getCell(7, colStart);
    cell.value = `Kode : ${lbb.materialCode}`;
    cell.font = { name: "Arial", size: 9, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  }

  // Row 8: Subheaders: No | Berat (kg/L)
  const row8 = ws.getRow(8);
  const row8Values: (string | number)[] = [];
  for (let c = 0; c < 6; c++) {
    row8Values.push("No", `Berat ( ${uomLabel} )`);
  }
  row8.values = row8Values;
  row8.font = { name: "Arial", size: 8, bold: true };
  row8.eachCell((cell) => {
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  });

  // Entry lookup
  const entryMap = new Map<number, number>();
  (lbb.bagEntries || []).forEach(e => {
    if (e.weightValue != null && e.weightValue > 0) {
      entryMap.set(e.rowNumber, e.weightValue);
    }
  });

  // 50 rows (Row 9 to 58)
  for (let i = 0; i < 50; i++) {
    const rNum = 9 + i;
    const r = ws.getRow(rNum);
    const rowVals: (string | number)[] = [];
    for (let c = 0; c < 6; c++) {
      const bagNum = c * 50 + (i + 1);
      const val = entryMap.get(bagNum);
      rowVals.push(bagNum, val != null ? val : "");
    }
    r.values = rowVals;
    r.font = { name: "Arial", size: 8 };
    r.eachCell((cell, colNum) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      if (colNum % 2 === 1) {
        cell.alignment = { horizontal: "center" };
      } else {
        cell.alignment = { horizontal: "right" };
        if (typeof cell.value === "number") cell.numFmt = "#,##0.00";
      }
    });
  }

  // Row 59: Totals per column group
  const row59 = ws.getRow(59);
  const row59Values: (string | number)[] = [];
  for (let c = 0; c < 6; c++) {
    let subTot = 0;
    for (let i = 1; i <= 50; i++) {
      subTot += entryMap.get(c * 50 + i) || 0;
    }
    row59Values.push("Total :", subTot > 0 ? subTot : 0);
  }
  row59.values = row59Values;
  row59.font = { name: "Arial", size: 8, bold: true };
  row59.eachCell((cell, colNum) => {
    cell.border = { top: { style: "medium" }, left: { style: "thin" }, bottom: { style: "medium" }, right: { style: "thin" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    if (colNum % 2 === 1) {
      cell.alignment = { horizontal: "center" };
    } else {
      cell.alignment = { horizontal: "right" };
      if (typeof cell.value === "number") cell.numFmt = "#,##0.00";
    }
  });

  // Footer: Summary & Signatures (Row 61-68)
  ws.getCell("A61").value = `Total Kemasan Terisi: ${lbb.totalBags} Kemasan`;
  ws.getCell("A61").font = { name: "Arial", size: 9, bold: true };
  ws.getCell("A62").value = `∑ Total Bruto = ${lbb.totalGrossWeight.toFixed(2)} ${uomLabel}`;
  ws.getCell("A62").font = { name: "Arial", size: 9, bold: true };

  if (!isVCO) {
    ws.getCell("A63").value = `Berat Plastik: ${lbb.plasticTarePerBag.toFixed(3)} kg/sak • Total Tara: ${lbb.totalPlasticTare.toFixed(3)} kg`;
    ws.getCell("A63").font = { name: "Arial", size: 8 };
    ws.getCell("A64").value = `∑ = Total Netto: ${lbb.totalNetWeight.toFixed(2)} ${uomLabel}`;
    ws.getCell("A64").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0F766E" } };
  } else {
    ws.getCell("A63").value = `∑ = Total Netto: ${lbb.totalNetWeight.toFixed(2)} ${uomLabel}`;
    ws.getCell("A63").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0F766E" } };
  }

  // Signatures on right side
  ws.getCell("I61").value = `Dibuat Oleh (${lbb.operatorRole || (isVCO ? "Operator Filling" : "Operator Ayak")})`;
  ws.getCell("K61").value = "Diketahui oleh (Admin Produksi)";
  ws.getRow(61).font = { name: "Arial", size: 9, bold: true };
  ws.getCell("I61").alignment = { horizontal: "center" };
  ws.getCell("K61").alignment = { horizontal: "center" };

  ws.getCell("I65").value = lbb.preparedBy || "...........................";
  ws.getCell("K65").value = lbb.acknowledgedBy || "...........................";
  ws.getRow(65).font = { name: "Arial", size: 9, underline: true };
  ws.getCell("I65").alignment = { horizontal: "center" };
  ws.getCell("K65").alignment = { horizontal: "center" };

  // Set widths
  for (let c = 1; c <= 12; c++) {
    ws.getColumn(c).width = c % 2 === 1 ? 6 : 11;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LBB-${lbb.reportNo}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
