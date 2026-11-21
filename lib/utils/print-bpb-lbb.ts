import { MaterialRequisitionItem, LBBReportItem } from "../api/manufacturing";

export function printBPBDocument(req: MaterialRequisitionItem) {
  const win = window.open("", "_blank");
  if (!win) return;

  const isFairtrade = (req.fairtradeStatus || "Fairtrade").toLowerCase().includes("fairtrade") &&
    !req.fairtradeStatus?.toLowerCase().includes("non");

  const linesHtml = (req.lines || []).map((l, idx) => {
    const qty = l.quantityIssued > 0 ? l.quantityIssued : l.quantityRequested;
    const pkgs = (l.packageCountIssued && l.packageCountIssued > 0) ? l.packageCountIssued : l.packageCountRequested;
    const qtyDisplay = `${qty.toLocaleString("id-ID", { maximumFractionDigits: 3 })} ${l.uom || "KG"}${pkgs ? ` (${pkgs} ${l.packageUnit || "Sak"})` : ""}`;
    const ketParts: string[] = [];
    if (l.arrivalDateRef) ketParts.push(l.arrivalDateRef);
    if (l.rackLocation || l.palletNo) ketParts.push(`Rak/Pallet: ${l.rackLocation || "-"}/${l.palletNo || "-"}`);
    if (l.moistureContent != null) ketParts.push(`KA: ${l.moistureContent}%`);
    if (l.notes) ketParts.push(l.notes);

    return `
      <tr>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${idx + 1}</td>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">
          ${l.productName} ${l.batchNo ? `(${l.batchNo})` : ""}
        </td>
        <td style="text-align: right; border: 1px solid #000; padding: 6px;">${qtyDisplay}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px; font-family: monospace;">${l.batchNo || "-"}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 11px;">${ketParts.join(" • ") || "-"}</td>
      </tr>
    `;
  }).join("");

  const approvedDateStr = req.warehouseApprovedAt ? new Date(req.warehouseApprovedAt).toLocaleDateString("id-ID") : "..................";
  const issuedDateStr = req.issuedAt ? new Date(req.issuedAt).toLocaleDateString("id-ID") : "..................";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BPB - ${req.requestNo}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm 12mm 15mm 12mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 10px; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .header-table td { vertical-align: top; }
        .company-title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
        .company-sub { font-size: 10px; color: #333; margin-bottom: 6px; }
        .doc-title { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; text-transform: uppercase; text-decoration: underline; }
        .doc-meta { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
        .doc-meta td { padding: 3px 0; }
        .cert-badge { font-weight: bold; font-size: 12px; }
        .strikethrough { text-decoration: line-through; color: #777; }
        .main-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
        .main-table th { border: 1px solid #000; background: #f0f0f0; padding: 6px; font-weight: bold; text-align: center; }
        .notes-section { font-size: 10px; margin-bottom: 20px; line-height: 1.4; }
        .signatures-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; text-align: center; }
        .signatures-table td { width: 33.33%; padding: 4px; vertical-align: top; }
        .sig-box { border: 1px solid #000; min-height: 90px; display: flex; flex-direction: column; justify-content: space-between; padding: 6px; }
        .sig-name { font-weight: bold; text-decoration: underline; margin-top: 55px; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 65%;">
            <div class="company-title">CV. Manna Anugerah Sejahtera</div>
            <div class="company-sub">CU 820674 D-11 • 104464OC • FLO-ID 43683</div>
            <div class="cert-badge">
              Klasifikasi: 
              <span class="${isFairtrade ? "" : "strikethrough"}">FAIRTRADE</span> / 
              <span class="${!isFairtrade ? "" : "strikethrough"}">NON FAIRTRADE*</span>
              &nbsp;|&nbsp; Kategori: <strong>${req.materialCategory || "GSKN & GCKN"}</strong>
            </div>
          </td>
          <td style="width: 35%; text-align: right; font-size: 11px;">
            <div>Kode Form: <strong>${req.documentCode || "GDG-011-BPB"}</strong></div>
            <div>Revisi : <strong>00</strong></div>
            <div style="margin-top: 4px;">No: <strong>${req.requestNo}</strong></div>
          </td>
        </tr>
      </table>

      <div class="doc-title">Bon Permintaan Bahan Baku (BPB)</div>

      <table class="doc-meta">
        <tr>
          <td style="width: 15%;"><strong>Tanggal</strong></td>
          <td style="width: 35%;">: ${req.requestDate}</td>
          <td style="width: 18%;"><strong>Order / SPK</strong></td>
          <td style="width: 32%;">: ${req.orderNumber || "-"}</td>
        </tr>
        <tr>
          <td><strong>Departemen</strong></td>
          <td>: ${req.department}</td>
          <td><strong>Status</strong></td>
          <td>: ${req.status.toUpperCase()}</td>
        </tr>
      </table>

      <table class="main-table">
        <thead>
          <tr>
            <th style="width: 5%;">No</th>
            <th style="width: 35%;">Nama Barang</th>
            <th style="width: 20%;">Jumlah</th>
            <th style="width: 18%;">No. Batch</th>
            <th style="width: 22%;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml || "<tr><td colspan='5' style='text-align:center; padding:12px; border:1px solid #000;'>Tidak ada rincian barang</td></tr>"}
        </tbody>
      </table>

      <div class="notes-section">
        <strong>Catatan Distribusi:</strong> Dibuat 2 rangkap: <em>Gudang (Asli)</em> • <em>Produksi (Copy 1)</em><br/>
        <em>* Coret yang tidak sesuai</em>
      </div>

      <table class="signatures-table">
        <tr>
          <td>
            <div class="sig-box">
              <div><strong>Dibuat oleh :</strong><br/><small>Produksi</small></div>
              <div class="sig-name">${req.requestedBy || "..........................."}</div>
              <div style="font-size: 10px;">Tgl. ${req.requestDate}</div>
            </div>
          </td>
          <td>
            <div class="sig-box">
              <div><strong>Diserahkan oleh :</strong><br/><small>Gudang</small></div>
              <div class="sig-name">${req.issuedBy || "..........................."}</div>
              <div style="font-size: 10px;">Tgl. ${issuedDateStr}</div>
            </div>
          </td>
          <td>
            <div class="sig-box">
              <div><strong>Manager Gudang :</strong><br/><small>ACC Gudang</small></div>
              <div class="sig-name">${req.warehouseApprovedBy || "..........................."}</div>
              <div style="font-size: 10px;">Tgl. ${approvedDateStr}</div>
            </div>
          </td>
        </tr>
      </table>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function printLBBDocument(lbb: LBBReportItem) {
  const win = window.open("", "_blank");
  if (!win) return;

  const isVCO = (lbb.variantType || "").toUpperCase() === "VCO";
  const uomLabel = lbb.uom || (isVCO ? "L" : "kg");

  // Create dictionary of 1..300 bag weights
  const entryMap = new Map<number, number>();
  (lbb.bagEntries || []).forEach(e => {
    if (e.weightValue != null && e.weightValue > 0) {
      entryMap.set(e.rowNumber, e.weightValue);
    }
  });

  // Build 6 parallel column groups of 50 rows each
  const colGroups = [
    { start: 1, end: 50 },
    { start: 51, end: 100 },
    { start: 101, end: 150 },
    { start: 151, end: 200 },
    { start: 201, end: 250 },
    { start: 251, end: 300 },
  ];

  const colTotals = colGroups.map(grp => {
    let tot = 0;
    for (let r = grp.start; r <= grp.end; r++) {
      tot += entryMap.get(r) || 0;
    }
    return tot;
  });

  let gridRowsHtml = "";
  for (let rowIdx = 0; rowIdx < 50; rowIdx++) {
    gridRowsHtml += "<tr>";
    for (let colIdx = 0; colIdx < 6; colIdx++) {
      const rowNum = colGroups[colIdx].start + rowIdx;
      const weight = entryMap.get(rowNum);
      const weightStr = weight != null && weight > 0 ? weight.toFixed(2) : "";
      gridRowsHtml += `
        <td style="border: 1px solid #000; text-align: center; font-size: 9px; padding: 1px; width: 4%;">${rowNum}</td>
        <td style="border: 1px solid #000; text-align: right; font-size: 9px; padding: 1px 3px; width: 12.6%; font-family: monospace;">${weightStr}</td>
      `;
    }
    gridRowsHtml += "</tr>";
  }

  const totalsHtml = colTotals.map(tot => `
    <td style="border: 1px solid #000; text-align: center; font-size: 9px; font-weight: bold; background: #eee;">Tot</td>
    <td style="border: 1px solid #000; text-align: right; font-size: 9px; font-weight: bold; background: #eee; padding: 1px 3px; font-family: monospace;">${tot > 0 ? tot.toFixed(2) : "-"}</td>
  `).join("");

  const opRole = lbb.operatorRole || (isVCO ? "Operator Filling" : "Operator Ayak");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>LBB - ${lbb.reportNo}</title>
      <style>
        @page { size: A4 landscape; margin: 8mm 8mm 8mm 8mm; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 4px; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .doc-title { font-size: 14px; font-weight: bold; text-align: center; margin: 4px 0 6px 0; text-transform: uppercase; text-decoration: underline; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 10px; }
        .meta-table td { padding: 2px 4px; vertical-align: top; }
        .grid-table { width: 100%; border-collapse: collapse; font-size: 9px; }
        .grid-header th { border: 1px solid #000; background: #f0f0f0; text-align: center; padding: 2px; font-size: 9px; }
        .footer-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
        .footer-table td { vertical-align: top; }
        .summary-box { border: 1px solid #000; padding: 6px; line-height: 1.5; font-size: 10px; }
        .sig-box { border: 1px solid #000; padding: 4px; text-align: center; min-height: 65px; display: flex; flex-direction: column; justify-content: space-between; }
        .sig-name { font-weight: bold; text-decoration: underline; margin-top: 35px; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 50%;">
            <div style="font-weight: bold; font-size: 12px;">CV. Manna Anugerah Sejahtera</div>
            <div style="font-size: 9px; color: #333;">CU 820674 D-11 • 104464OC • FLO-ID 43683</div>
          </td>
          <td style="width: 50%; text-align: right; font-size: 9px;">
            <div>Kode Form: <strong>${lbb.documentCode || "GDG-013-LBB"}</strong> • Revisi : <strong>00</strong></div>
            <div>No. LBB: <strong>${lbb.reportNo}</strong> ${lbb.bpbNo ? `(Ref BPB: ${lbb.bpbNo})` : ""}</div>
          </td>
        </tr>
      </table>

      <div class="doc-title">Laporan Permintaan Bahan Baku (LBB) — ${lbb.variantType || "GSKN"}</div>

      <table class="meta-table">
        <tr>
          <td style="width: 10%;">Tanggal</td>
          <td style="width: 23%;">: <strong>${lbb.reportDate}</strong></td>
          <td style="width: 12%;">No. Mesin / Mesh</td>
          <td style="width: 22%;">: ${lbb.machineNo || "-"} / ${lbb.meshSize || "-"}</td>
          <td style="width: 10%;">Customer</td>
          <td style="width: 23%;">: ${lbb.customerName || "-"}</td>
        </tr>
        <tr>
          <td>Kode Bahan</td>
          <td>: <strong style="font-family: monospace;">${lbb.materialCode}</strong></td>
          <td>Suplier</td>
          <td>: ${lbb.supplierName || "-"}</td>
          <td>Sertifikasi</td>
          <td>: <strong>${lbb.fairtradeStatus || "Fairtrade"}</strong></td>
        </tr>
        <tr>
          <td>Nama Barang</td>
          <td colspan="5">: <strong>${lbb.productName}</strong></td>
        </tr>
      </table>

      <table class="grid-table">
        <thead>
          <tr class="grid-header">
            <th colspan="2">Kode : ${lbb.materialCode}</th>
            <th colspan="2">Kode : ${lbb.materialCode}</th>
            <th colspan="2">Kode : ${lbb.materialCode}</th>
            <th colspan="2">Kode : ${lbb.materialCode}</th>
            <th colspan="2">Kode : ${lbb.materialCode}</th>
            <th colspan="2">Kode : ${lbb.materialCode}</th>
          </tr>
          <tr class="grid-header">
            <th>No</th><th>Berat (${uomLabel})</th>
            <th>No</th><th>Berat (${uomLabel})</th>
            <th>No</th><th>Berat (${uomLabel})</th>
            <th>No</th><th>Berat (${uomLabel})</th>
            <th>No</th><th>Berat (${uomLabel})</th>
            <th>No</th><th>Berat (${uomLabel})</th>
          </tr>
        </thead>
        <tbody>
          ${gridRowsHtml}
          <tr>
            ${totalsHtml}
          </tr>
        </tbody>
      </table>

      <table class="footer-table">
        <tr>
          <td style="width: 50%;">
            <div class="summary-box">
              <div><strong>Total Kemasan Terisi:</strong> ${lbb.totalBags} Kemasan</div>
              <div><strong>∑ Total Bruto:</strong> ${lbb.totalGrossWeight.toFixed(2)} ${uomLabel}</div>
              ${!isVCO ? `
                <div><strong>Berat Plastik per Kemasan:</strong> ${lbb.plasticTarePerBag.toFixed(3)} kg &nbsp;|&nbsp; <strong>Total Tara Plastik:</strong> ${lbb.totalPlasticTare.toFixed(3)} kg</div>
                <div><strong>∑ = Total Netto:</strong> <span style="font-size: 13px; font-weight: bold; background: #fffae6; padding: 1px 4px;">${lbb.totalNetWeight.toFixed(2)} ${uomLabel}</span></div>
              ` : `
                <div><strong>∑ = Total Netto:</strong> <span style="font-size: 13px; font-weight: bold; background: #fffae6; padding: 1px 4px;">${lbb.totalNetWeight.toFixed(2)} ${uomLabel}</span></div>
              `}
              <div style="font-size: 9px; color: #555; margin-top: 4px;">* Pilih salah satu yang sesuai &nbsp;|&nbsp; Revisi 00</div>
            </div>
          </td>
          <td style="width: 50%; padding-left: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; padding-right: 6px;">
                  <div class="sig-box">
                    <div><strong>Dibuat Oleh</strong><br/><small>${opRole}</small></div>
                    <div class="sig-name">${lbb.preparedBy || "..........................."}</div>
                    <div style="font-size: 9px;">Tgl. ${lbb.preparedDate || lbb.reportDate}</div>
                  </div>
                </td>
                <td style="width: 50%; padding-left: 6px;">
                  <div class="sig-box">
                    <div><strong>Diketahui oleh</strong><br/><small>Admin Produksi</small></div>
                    <div class="sig-name">${lbb.acknowledgedBy || "..........................."}</div>
                    <div style="font-size: 9px;">Tgl. ${lbb.acknowledgedDate || "................"}</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
