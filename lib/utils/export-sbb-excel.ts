import ExcelJS from "exceljs";
import { RawMaterialStockItem } from "@/lib/api/raw-material-stock";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  available: "Siap Produksi",
  quarantine: "Karantina",
  depleted: "Habis Terpakai",
  rejected: "Ditolak",
  voided: "Dibatalkan (Void)",
};

export async function exportSBBToExcel(items: RawMaterialStockItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "One ERP - CV. Manna Anugerah Sejahtera";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Stok Gudang Bahan Baku", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Title Header
  ws.mergeCells("A1:R1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "CV. MANNA ANUGERAH SEJAHTERA — FORM STOK GUDANG BAHAN BAKU (GDG-002-SBB)";
  titleCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F172A" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:R2");
  const subCell = ws.getCell("A2");
  subCell.value = `CU 820674 D-11 • 104464OC • FLO-ID 43683 | Dicetak: ${new Date().toLocaleString("id-ID")}`;
  subCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF475569" } };
  ws.getRow(2).height = 16;

  // Table Headers (Row 4)
  const headers = [
    "No",
    "No. SBB",
    "Tgl Masuk",
    "Ref. LBM",
    "Supplier",
    "Nama Bahan Baku",
    "Kode Lot / Batch",
    "Organik / Sertifikasi",
    "Status QC (CAS/PBD/PBK)",
    "Kadar Air (%)",
    "Gudang",
    "Zona / Rak / Pallet",
    "Best Before",
    "Qty Masuk",
    "Qty Reject",
    "Sisa Saldo",
    "Sisa Kemasan",
    "Status",
  ];

  const headerRow = ws.getRow(4);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  let totalReceived = 0;
  let totalRejected = 0;
  let totalRemaining = 0;
  let totalRemainingPkg = 0;

  items.forEach((item, idx) => {
    totalReceived += item.qtyReceived || 0;
    totalRejected += item.qtyRejected || 0;
    totalRemaining += item.qtyRemaining || 0;
    totalRemainingPkg += item.remainingPackages || 0;

    const certText = [item.organicStatus, item.halalStatus, item.kosherStatus]
      .filter(Boolean)
      .join(" / ");
    const qcText = `CAS:${item.casStatus} | PBD:${item.pbdStatus} | PBK:${item.pbkStatus}`;
    const locText = [item.storageZone, item.rackLocation, item.palletNo].filter(Boolean).join(" / ");

    const row = ws.addRow([
      idx + 1,
      item.entryNo,
      item.entryDate,
      item.lbmNo || item.sourceType,
      item.supplierName || "-",
      item.productName,
      item.batchNo,
      certText,
      qcText,
      item.moistureContent !== undefined && item.moistureContent !== null ? item.moistureContent : "-",
      item.warehouseName || "-",
      locText || "-",
      item.expiryDate || "-",
      item.qtyReceived,
      item.qtyRejected,
      item.qtyRemaining,
      `${item.remainingPackages} / ${item.totalPackages} ${item.packageUnit}`,
      STATUS_LABELS[item.status] || item.status,
    ]);

    row.font = { name: "Arial", size: 9 };
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
      if (colNumber === 1 || colNumber === 3 || colNumber === 13 || colNumber === 18) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (colNumber >= 14 && colNumber <= 16) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = "#,##0.00";
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
  });

  // Totals row
  const totalRow = ws.addRow([
    "",
    "TOTAL",
    "",
    "",
    "",
    `${items.length} Lot`,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    totalReceived,
    totalRejected,
    totalRemaining,
    `${totalRemainingPkg} Kemasan`,
    "",
  ]);
  totalRow.font = { name: "Arial", size: 9, bold: true };
  totalRow.eachCell((cell, colNumber) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.border = {
      top: { style: "medium" },
      left: { style: "thin" },
      bottom: { style: "medium" },
      right: { style: "thin" },
    };
    if (colNumber >= 14 && colNumber <= 16) {
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.numFmt = "#,##0.00";
    }
  });

  // Column widths
  const widths = [5, 18, 12, 17, 24, 28, 18, 22, 28, 11, 18, 24, 12, 13, 12, 13, 18, 15];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Stok-Gudang-Bahan-Baku-SBB-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
