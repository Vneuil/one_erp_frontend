import { ExportLBMOptions, LineExportData } from "./export-lbm-excel";

export function printLBMExcelDocument({
  receipt,
  lines,
  vendorName,
  warehouseName,
}: ExportLBMOptions): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Gagal membuka jendela cetak. Izinkan popup browser untuk mencetak laporan.");
    return;
  }

  const plasticTare = receipt.plasticTare ?? 0.03;
  const COLS = 6;
  const ROWS_PER_COL = 50; // Standar form GDG-001: 50 baris x 6 kolom = 300 karung per halaman
  const SACKS_PER_SHEET = COLS * ROWS_PER_COL; // 300

  const allSheets: string[] = [];

  lines.forEach((line) => {
    const entries = line.entries || [];
    const entriesMap = new Map<number, number | null>();
    entries.forEach((e) => entriesMap.set(e.rowNumber, e.weightActual));

    const maxRowNumber = entries.length > 0 ? Math.max(...entries.map((e) => e.rowNumber)) : (line.bagCount || 0);
    const totalCount = Math.max(entries.length, maxRowNumber, line.bagCount || 0);
    const totalChunks = Math.max(1, Math.ceil(totalCount / SACKS_PER_SHEET));

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const pageOffset = chunkIdx * SACKS_PER_SHEET;

      // Calculate column totals for this chunk
      const colTotals: number[] = [];
      for (let c = 0; c < COLS; c++) {
        let sum = 0;
        for (let r = 0; r < ROWS_PER_COL; r++) {
          const sackNo = pageOffset + c * ROWS_PER_COL + (r + 1);
          const w = entriesMap.get(sackNo);
          if (w !== undefined && w !== null) {
            sum += Number(w);
          }
        }
        colTotals.push(sum);
      }

      // Build Table Headers
      let headerThs = "";
      for (let c = 0; c < COLS; c++) {
        headerThs += `
          <th style="border: 1px solid #000; padding: 2px 4px; text-align: center; width: 28px; background: #f1f5f9; font-size: 8pt;">No</th>
          <th style="border: 1px solid #000; padding: 2px 4px; text-align: center; width: 62px; background: #f1f5f9; font-size: 8pt;">Berat ( kg )</th>
        `;
        if (c < COLS - 1) {
          headerThs += `<th style="width: 5px; border: none; background: transparent;"></th>`;
        }
      }

      // Build Table Data Rows (50 rows)
      let bodyRows = "";
      for (let r = 0; r < ROWS_PER_COL; r++) {
        let rowHtml = "<tr>";
        for (let c = 0; c < COLS; c++) {
          const sackNo = pageOffset + c * ROWS_PER_COL + (r + 1);
          const w = entriesMap.get(sackNo);
          const hasWeight = w !== undefined && w !== null;

          rowHtml += `
            <td style="border: 1px solid #000; padding: 1.5px 2px; text-align: center; font-size: 8pt; font-family: monospace;">${sackNo}</td>
            <td style="border: 1px solid #000; padding: 1.5px 4px; text-align: right; font-size: 8pt; font-family: monospace; font-weight: ${hasWeight ? "bold" : "normal"};">
              ${hasWeight ? Number(w).toFixed(2) : ""}
            </td>
          `;
          if (c < COLS - 1) {
            rowHtml += `<td style="border: none; width: 5px; background: transparent;"></td>`;
          }
        }
        rowHtml += "</tr>";
        bodyRows += rowHtml;
      }

      // Build Subtotal Row
      let subtotalCells = "";
      for (let c = 0; c < COLS; c++) {
        subtotalCells += `
          <td style="border: 1px solid #000; padding: 2px 3px; text-align: center; font-weight: bold; background: #f1f5f9; font-size: 8pt;">Total</td>
          <td style="border: 1px solid #000; padding: 2px 4px; text-align: right; font-weight: bold; background: #f1f5f9; font-size: 8pt; font-family: monospace;">
            ${colTotals[c] > 0 ? colTotals[c].toFixed(2) : ""}
          </td>
        `;
        if (c < COLS - 1) {
          subtotalCells += `<td style="border: none; width: 5px;"></td>`;
        }
      }
      const subtotalRow = `<tr>${subtotalCells}</tr>`;

      // Calculation summary
      const grandTotal = colTotals.reduce((a, b) => a + b, 0);
      const chunkEntries = entries.filter((e) => e.rowNumber > pageOffset && e.rowNumber <= pageOffset + SACKS_PER_SHEET);
      const filledSacks = chunkEntries.filter((e) => e.weightActual !== null).length;
      const sacksToDeduct = filledSacks > 0 ? filledSacks : chunkEntries.length;
      const plasticDeduction = plasticTare * sacksToDeduct;
      const netActual = Math.max(0, grandTotal - plasticDeduction);

      const sjWeight = line.weightNet || line.quantityOrderedRef || 0;
      const diffSj = Math.abs(netActual - sjWeight);
      const isSesuai = sjWeight > 0 && diffSj / sjWeight <= 0.01;

      const pageTitleExtra = totalChunks > 1 ? ` (Hal ${chunkIdx + 1}/${totalChunks})` : "";

      allSheets.push(`
        <div class="sheet-container" style="page-break-after: always;">
          <!-- Kop Surat Resmi Dokumen -->
          <div class="kop-header">
            <div class="kop-left">
              <div style="font-weight: bold; font-size: 9.5pt;">CV. Manna Anugerah Sejahtera</div>
              <div style="font-size: 7.5pt; color: #334155; line-height: 1.2;">
                CU 820674 D-11<br/>
                104464OC<br/>
                FLO-ID 43683
              </div>
            </div>
            <div class="kop-right">
              <div style="font-weight: bold; font-size: 9pt;">GDG-001-LBM</div>
              <div style="font-size: 7.5pt; font-style: italic;">Revisi 00</div>
            </div>
          </div>

          <!-- Judul Form (Persis format Excel) -->
          <div class="form-title">
            LAPORAN RINCI BARANG MASUK / DETAIL INCOMING GOODS REPORT${pageTitleExtra}<br/>
            <span style="font-size: 9.5pt; font-weight: bold;">(LBM)</span>
          </div>

          <!-- Tabel Informasi Metadata -->
          <table class="meta-table">
            <tr>
              <td class="lbl">Asal Bahan Baku</td>
              <td class="sep">:</td>
              <td class="val">${vendorName || "-"}</td>
              <td class="spacer"></td>
              <td class="lbl">Jenis Gula</td>
              <td class="sep">:</td>
              <td class="val"><strong>${line.productName}</strong></td>
            </tr>
            <tr>
              <td class="lbl">Kondisi Gula</td>
              <td class="sep">:</td>
              <td class="val">${receipt.sugarCondition || "Baik / Kering"}</td>
              <td class="spacer"></td>
              <td class="lbl">Kondisi Kemasan</td>
              <td class="sep">:</td>
              <td class="val">${receipt.packageCondition || "Utuh / Bersih"}</td>
            </tr>
            <tr>
              <td class="lbl">Tanggal</td>
              <td class="sep">:</td>
              <td class="val">${receipt.receivedDate || "-"}</td>
              <td class="spacer"></td>
              <td class="lbl">No. Surat Jalan</td>
              <td class="sep">:</td>
              <td class="val"><strong>${receipt.deliveryNoteNo || "-"}</strong></td>
            </tr>
            <tr>
              <td class="lbl">Kode Barang</td>
              <td class="sep">:</td>
              <td class="val font-mono">${receipt.documentCode || "GDG-001-LBM"}</td>
              <td class="spacer"></td>
              <td class="lbl">Berat Plastik</td>
              <td class="sep">:</td>
              <td class="val font-mono">${plasticTare.toFixed(3)} kg/karung</td>
            </tr>
          </table>

          <!-- Grid 6 Kolom Timbangan Karung (Rows 10-59) -->
          <table class="grid-table">
            <thead>
              <tr>${headerThs}</tr>
            </thead>
            <tbody>
              ${bodyRows}
              ${subtotalRow}
            </tbody>
          </table>

          <!-- Grand Total & Footer Calculation Bar -->
          <table class="grand-total-table">
            <tr>
              <td style="width: 15%; text-align: center; font-weight: bold; background: #f1f5f9; border: 1px solid #000;">
                Grand Total
              </td>
              <td style="width: 15%; text-align: right; font-weight: bold; font-family: monospace; border: 1px solid #000;">
                ${grandTotal.toFixed(2)} kg
              </td>
              <td style="width: 35%; text-align: center; font-weight: bold; background: #f8fafc; border: 1px solid #000;">
                Netto setelah dikurangi plastik (${plasticTare} x ${sacksToDeduct})
              </td>
              <td style="width: 35%; text-align: right; font-weight: bold; font-family: monospace; color: #0f766e; border: 1px solid #000;">
                ${netActual.toFixed(2)} kg
              </td>
            </tr>
          </table>

          <!-- Komparasi Surat Jalan -->
          <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8.5pt;">
            <tr>
              <td style="padding: 3px 0;">
                <strong>Bandingkan dengan surat jalan : </strong>
                <span style="font-weight: bold; color: ${isSesuai ? "#16a34a" : "#dc2626"};">
                  ${isSesuai ? "SESUAI ✓" : "TIDAK SESUAI ✗"}
                </span>
                <span style="color: #475569; font-size: 8pt;"> (Kuantitas SJ: ${sjWeight.toLocaleString("id-ID")} kg, Selisih: ${diffSj.toFixed(2)} kg)</span>
              </td>
              <td style="text-align: right; padding: 3px 0; font-size: 8.5pt;">
                Dibuat Oleh : <strong>${receipt.receivedBy || "Admin Gudang"}</strong>
              </td>
            </tr>
          </table>

          <!-- Tanda Tangan Resmi Dokumen -->
          <div class="sig-container">
            <div class="sig-col">
              <div style="font-size: 8pt; color: #475569;">Diserahkan Oleh (Supir / Vendor)</div>
              <div class="sig-line">( ${vendorName || "Supir Vendor"} )</div>
            </div>
            <div class="sig-col">
              <div style="font-size: 8pt; color: #475569;">Diperiksa Oleh (QC Inbound)</div>
              <div class="sig-line">( Petugas QC )</div>
            </div>
            <div class="sig-col">
              <div style="font-size: 8pt; color: #475569;">Dibuat Oleh (Admin Gudang)</div>
              <div class="sig-line">( ${receipt.receivedBy || "Admin Gudang"} )</div>
            </div>
          </div>

          <div style="font-size: 7.5pt; font-style: italic; color: #64748b; margin-top: 6px;">
            Revisi 00
          </div>
        </div>
      `);
    }
  });

  const sheetsHtml = allSheets.join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Barang Masuk (LBM) - ${receipt.receiptNo}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0.6cm 0.5cm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 8pt;
          color: #000;
          margin: 0;
          padding: 10px;
          background: #f8fafc;
        }
        .sheet-container {
          background: #fff;
          padding: 16px;
          margin: 0 auto 20px auto;
          max-width: 210mm;
          min-height: 290mm;
          border: 1px solid #cbd5e1;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        @media print {
          body {
            background: #fff;
            padding: 0;
          }
          .sheet-container {
            border: none;
            box-shadow: none;
            padding: 0;
            margin: 0;
            max-width: none;
            min-height: 0;
          }
          .no-print {
            display: none !important;
          }
        }
        .kop-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #000;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .kop-right {
          text-align: right;
        }
        .form-title {
          text-align: center;
          font-weight: bold;
          font-size: 11pt;
          border: 2px solid #000;
          padding: 5px;
          margin-bottom: 8px;
          background: #f8fafc;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          font-size: 8pt;
        }
        .meta-table td {
          padding: 1.5px 3px;
          vertical-align: top;
        }
        .meta-table td.lbl {
          width: 105px;
          font-weight: bold;
        }
        .meta-table td.sep {
          width: 10px;
          text-align: center;
        }
        .meta-table td.val {
          width: 210px;
        }
        .meta-table td.spacer {
          width: 20px;
        }
        .grid-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
        }
        .grand-total-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          font-size: 8pt;
        }
        .grand-total-table td {
          padding: 3px 5px;
        }
        .sig-container {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          text-align: center;
          page-break-inside: avoid;
        }
        .sig-col {
          width: 30%;
        }
        .sig-line {
          border-top: 1px solid #000;
          padding-top: 3px;
          margin-top: 36px;
          font-weight: bold;
          font-size: 8pt;
        }
        .font-mono {
          font-family: monospace;
        }

        /* Top Action Bar (Screen Only) */
        .top-toolbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #1e293b;
          color: #fff;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.2);
        }
        .btn-action {
          cursor: pointer;
          border: none;
          padding: 6px 14px;
          border-radius: 5px;
          font-size: 12px;
          font-weight: bold;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
        }
        .btn-print {
          background: #0f766e;
          color: #fff;
        }
        .btn-print:hover {
          background: #0d9488;
        }
        .btn-close {
          background: #475569;
          color: #fff;
        }
        .btn-close:hover {
          background: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="top-toolbar no-print">
        <div style="font-weight: bold; font-size: 13px;">
          Dokumen Cetak LBM GDG-001 (Format Excel Resmi)
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-action btn-print" onclick="window.print()">
            🖨️ Cetak Dokumen (Print)
          </button>
          <button class="btn-action btn-close" onclick="window.close()">
            ✕ Tutup
          </button>
        </div>
      </div>

      ${sheetsHtml}

      <script>
        // Auto trigger print dialog after page renders
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
