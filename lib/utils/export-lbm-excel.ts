import ExcelJS from "exceljs";
import { GoodsReceiptItem, BagEntryItem } from "@/lib/api/procurement";

export interface LineExportData {
  lineId: string;
  productId: string;
  productName: string;
  quantityOrderedRef: number;
  weightGross: number;
  weightTare: number;
  weightNet: number;
  packageSize: number;
  bagCount: number;
  entries: BagEntryItem[];
}

export interface ExportLBMOptions {
  receipt: GoodsReceiptItem;
  lines: LineExportData[];
  vendorName: string;
  warehouseName: string;
}

export async function exportLBMToExcel({
  receipt,
  lines,
  vendorName,
  warehouseName,
}: ExportLBMOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - PT Manna Jaya Makmur";
  workbook.created = new Date();

  const plasticTare = receipt.plasticTare ?? 0.03;

  lines.forEach((line, lineIdx) => {
    const entries = line.entries || [];
    const entriesMap = new Map<number, number | null>();
    entries.forEach((e) => entriesMap.set(e.rowNumber, e.weightActual));

    const maxRowNumber = entries.length > 0 ? Math.max(...entries.map((e) => e.rowNumber)) : (line.bagCount || 0);
    const totalCount = Math.max(entries.length, maxRowNumber, line.bagCount || 0);
    const totalChunks = Math.max(1, Math.ceil(totalCount / 300));

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const pageOffset = chunkIdx * 300;
      const rawSheetName = totalChunks > 1
        ? `${line.productName.slice(0, 16)} Hal ${chunkIdx + 1}`
        : lines.length > 1
        ? `LBM - ${line.productName.slice(0, 20)}`
        : "LBM";
      // Sheet name max 31 chars in Excel
      const sheetName = rawSheetName.slice(0, 31).replace(/[:\\/?*[\]]/g, "_");
      const ws = workbook.addWorksheet(sheetName, {
        pageSetup: {
          paperSize: 9, // A4
          orientation: "portrait",
          margins: {
            left: 0.42,
            right: 0.15,
            top: 1.09,
            bottom: 0.13,
            header: 0.3,
            footer: 0.3,
          },
        },
        headerFooter: {
          oddHeader:
            "&LCV. Manna Anugerah Sejahtera\nCU 820674 D-11\n104464OC\nFLO-ID 43683&RGDG-001-LBM",
        },
      });

      // 17 Columns with custom widths matching original template
      ws.columns = [
        { key: "c1", width: 4.5 },   // A: No
        { key: "c2", width: 10.5 },  // B: Berat (kg)
        { key: "c3", width: 3 },     // C: spacer
        { key: "c4", width: 4.5 },   // D: No
        { key: "c5", width: 10.5 },  // E: Berat (kg)
        { key: "c6", width: 2.5 },   // F: spacer
        { key: "c7", width: 4.5 },   // G: No
        { key: "c8", width: 10.5 },  // H: Berat (kg)
        { key: "c9", width: 2.5 },   // I: spacer
        { key: "c10", width: 4.5 },  // J: No
        { key: "c11", width: 10.5 }, // K: Berat (kg)
        { key: "c12", width: 3 },    // L: spacer
        { key: "c13", width: 4.5 },  // M: No
        { key: "c14", width: 10.5 }, // N: Berat (kg)
        { key: "c15", width: 2.5 },  // O: spacer
        { key: "c16", width: 4.5 },  // P: No
        { key: "c17", width: 10.5 }, // Q: Berat (kg)
      ];

      // Row 1: Title
      ws.mergeCells("A1:Q1");
      const r1 = ws.getCell("A1");
      const titleExtra = totalChunks > 1 ? ` (Halaman ${chunkIdx + 1} dari ${totalChunks})` : "";
      r1.value = `Laporan Rinci Barang Masuk/Detail Incoming Goods Report${titleExtra}`;
      r1.font = { name: "Arial", size: 12, bold: true };
      r1.alignment = { horizontal: "center", vertical: "middle" };

      // Row 2: Subtitle
      ws.mergeCells("A2:Q2");
      const r2 = ws.getCell("A2");
      r2.value = "(LBM)";
      r2.font = { name: "Arial", size: 10, bold: true };
      r2.alignment = { horizontal: "center", vertical: "middle" };

      // Meta styles helper
      const metaFont = { name: "Arial", size: 9 };
      const metaBold = { name: "Arial", size: 9, bold: true };

      // Row 3
      ws.getCell("A3").value = "Asal Bahan Baku";
      ws.getCell("A3").font = metaBold;
      ws.getCell("D3").value = ":";
      ws.getCell("D3").font = metaBold;
      ws.mergeCells("E3:H3");
      ws.getCell("E3").value = vendorName || "-";
      ws.getCell("E3").font = metaFont;

      ws.getCell("J3").value = "Jenis Gula";
      ws.getCell("J3").font = metaBold;
      ws.getCell("M3").value = ":";
      ws.getCell("M3").font = metaBold;
      ws.mergeCells("N3:Q3");
      ws.getCell("N3").value = line.productName;
      ws.getCell("N3").font = metaBold;

      // Row 4
      ws.getCell("A4").value = "Kondisi Gula";
      ws.getCell("A4").font = metaBold;
      ws.getCell("D4").value = ":";
      ws.getCell("D4").font = metaBold;
      ws.mergeCells("E4:H4");
      ws.getCell("E4").value = receipt.sugarCondition || "Baik / Kering";
      ws.getCell("E4").font = metaFont;

      ws.getCell("J4").value = "Kondisi Kemasan";
      ws.getCell("J4").font = metaBold;
      ws.getCell("M4").value = ":";
      ws.getCell("M4").font = metaBold;
      ws.mergeCells("N4:Q4");
      ws.getCell("N4").value = receipt.packageCondition || "Utuh / Bersih";
      ws.getCell("N4").font = metaFont;

      // Row 5
      ws.getCell("A5").value = "Tanggal";
      ws.getCell("A5").font = metaBold;
      ws.getCell("D5").value = ":";
      ws.getCell("D5").font = metaBold;
      ws.mergeCells("E5:H5");
      ws.getCell("E5").value = receipt.receivedDate || "-";
      ws.getCell("E5").font = metaFont;

      ws.getCell("J5").value = "No. Surat Jalan";
      ws.getCell("J5").font = metaBold;
      ws.getCell("M5").value = ":";
      ws.getCell("M5").font = metaBold;
      ws.mergeCells("N5:Q5");
      ws.getCell("N5").value = receipt.deliveryNoteNo || "-";
      ws.getCell("N5").font = metaBold;

      // Row 6
      ws.getCell("A6").value = "Kode Barang";
      ws.getCell("A6").font = metaBold;
      ws.getCell("D6").value = ":";
      ws.getCell("D6").font = metaBold;
      ws.mergeCells("E6:H6");
      ws.getCell("E6").value = receipt.documentCode || "GDG-001-LBM";
      ws.getCell("E6").font = metaFont;

      ws.getCell("J6").value = "Berat Plastik";
      ws.getCell("J6").font = metaBold;
      ws.getCell("M6").value = ":";
      ws.getCell("M6").font = metaBold;
      ws.mergeCells("N6:Q6");
      ws.getCell("N6").value = `${plasticTare.toFixed(3)} kg/karung`;
      ws.getCell("N6").font = metaFont;

      // Thin borders & header styles
      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      const headerFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };

      // Table Header Row 9 (6 Column pairs: A-B, D-E, G-H, J-K, M-N, P-Q)
      const colPairs = [
        { noCol: "A", valCol: "B" },
        { noCol: "D", valCol: "E" },
        { noCol: "G", valCol: "H" },
        { noCol: "J", valCol: "K" },
        { noCol: "M", valCol: "N" },
        { noCol: "P", valCol: "Q" },
      ];

      colPairs.forEach((p) => {
        const cNo = ws.getCell(`${p.noCol}9`);
        cNo.value = "No";
        cNo.font = { name: "Arial", size: 8, bold: true };
        cNo.alignment = { horizontal: "center", vertical: "middle" };
        cNo.border = thinBorder;
        cNo.fill = headerFill;

        const cVal = ws.getCell(`${p.valCol}9`);
        cVal.value = "Berat ( kg )";
        cVal.font = { name: "Arial", size: 8, bold: true };
        cVal.alignment = { horizontal: "center", vertical: "middle" };
        cVal.border = thinBorder;
        cVal.fill = headerFill;
      });

      // Populate data rows 10 to 59 (50 rows per column pair = 300 sacks max per page)
      for (let r = 0; r < 50; r++) {
        const excelRow = 10 + r;

        colPairs.forEach((p, pairIdx) => {
          const sackNumber = pageOffset + pairIdx * 50 + (r + 1);
          const weightVal = entriesMap.get(sackNumber);

          const noCell = ws.getCell(`${p.noCol}${excelRow}`);
          noCell.value = sackNumber;
          noCell.font = { name: "Arial", size: 8 };
          noCell.alignment = { horizontal: "center", vertical: "middle" };
          noCell.border = thinBorder;

          const valCell = ws.getCell(`${p.valCol}${excelRow}`);
          if (weightVal !== undefined && weightVal !== null) {
            valCell.value = Number(weightVal);
            valCell.numFmt = "0.00";
            valCell.font = { name: "Arial", size: 8, bold: true };
          } else {
            valCell.value = "";
          }
          valCell.alignment = { horizontal: "right", vertical: "middle" };
          valCell.border = thinBorder;
        });
      }

      // Row 60: Subtotals per column pair
      colPairs.forEach((p) => {
        const labelCell = ws.getCell(`${p.noCol}60`);
        labelCell.value = "Total";
        labelCell.font = { name: "Arial", size: 8, bold: true };
        labelCell.alignment = { horizontal: "center", vertical: "middle" };
        labelCell.border = thinBorder;
        labelCell.fill = headerFill;

        const sumCell = ws.getCell(`${p.valCol}60`);
        sumCell.value = { formula: `SUM(${p.valCol}10:${p.valCol}59)` };
        sumCell.numFmt = "#,##0.00";
        sumCell.font = { name: "Arial", size: 8, bold: true };
        sumCell.alignment = { horizontal: "right", vertical: "middle" };
        sumCell.border = thinBorder;
        sumCell.fill = headerFill;
      });

      // Row 61: Grand Total & Netto after plastic
      ws.mergeCells("A61:B61");
      const gtLabel = ws.getCell("A61");
      gtLabel.value = "Grand Total";
      gtLabel.font = { name: "Arial", size: 9, bold: true };
      gtLabel.alignment = { horizontal: "center", vertical: "middle" };
      gtLabel.border = thinBorder;

      ws.mergeCells("C61:E61");
      const gtVal = ws.getCell("C61");
      gtVal.value = { formula: "B60+E60+H60+K60+N60+Q60" };
      gtVal.numFmt = "#,##0.00";
      gtVal.font = { name: "Arial", size: 9, bold: true };
      gtVal.alignment = { horizontal: "center", vertical: "middle" };
      gtVal.border = thinBorder;

      const chunkEntries = entries.filter((e) => e.rowNumber > pageOffset && e.rowNumber <= pageOffset + 300);
      const actualCount = chunkEntries.filter((e) => e.weightActual !== null).length;
      const totalCountToDeduct = actualCount > 0 ? actualCount : chunkEntries.length || Math.min(300, totalCount - pageOffset);

      ws.mergeCells("I61:K61");
      const netLabel = ws.getCell("I61");
      netLabel.value = `Netto (- plastik ${plasticTare}x${totalCountToDeduct})`;
      netLabel.font = { name: "Arial", size: 8, bold: true };
      netLabel.alignment = { horizontal: "center", vertical: "middle" };
      netLabel.border = thinBorder;

      ws.mergeCells("L61:N61");
      const netVal = ws.getCell("L61");
      netVal.value = { formula: `C61-(${plasticTare}*${totalCountToDeduct})` };
      netVal.numFmt = "#,##0.00";
      netVal.font = { name: "Arial", size: 9, bold: true };
      netVal.alignment = { horizontal: "center", vertical: "middle" };
      netVal.border = thinBorder;

      // Row 62: Comparison with Surat Jalan & Signatures
      const sjTotal = line.weightNet || line.quantityOrderedRef || 0;
      const sumWeighed = chunkEntries.reduce((s, e) => s + (e.weightActual ?? 0), 0);
      const netCalculated = Math.max(0, sumWeighed - plasticTare * totalCountToDeduct);
      const isSesuai = sjTotal > 0 && Math.abs(netCalculated - sjTotal) / sjTotal <= 0.01;

      ws.getCell("A62").value = `Bandingkan dengan surat jalan : ${
        isSesuai ? "SESUAI" : "TIDAK SESUAI"
      } (SJ: ${sjTotal.toLocaleString("id-ID")} kg)`;
      ws.getCell("A62").font = {
        name: "Arial",
        size: 9,
        bold: true,
        color: { argb: isSesuai ? "FF16A34A" : "FFDC2626" },
      };

      ws.getCell("J62").value = `Dibuat Oleh : ${receipt.receivedBy || "........................."}`;
      ws.getCell("J62").font = { name: "Arial", size: 9 };

      // Row 63: Footer Revision
      ws.mergeCells("A63:N63");
      const revCell = ws.getCell("A63");
      revCell.value = "Revisi 00";
      revCell.font = { name: "Arial", size: 8, italic: true };
    }
  });

  // Write and download to browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LBM-${receipt.receiptNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
