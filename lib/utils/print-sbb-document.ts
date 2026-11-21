import { RawMaterialStockItem } from "@/lib/api/raw-material-stock";

const STATUS_ID: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: "DRAFT", bg: "#e2e8f0", color: "#334155" },
  available: { label: "LOLOS / SIAP PRODUKSI", bg: "#dcfce7", color: "#166534" },
  quarantine: { label: "KARANTINA / HOLD", bg: "#fef3c7", color: "#92400e" },
  depleted: { label: "HABIS TERPAKAI", bg: "#e0e7ff", color: "#3730a3" },
  rejected: { label: "DITOLAK / REJECT", bg: "#fee2e2", color: "#991b1b" },
  voided: { label: "VOID / DIBATALKAN", bg: "#f1f5f9", color: "#64748b" },
};

const QC_STATUS_LABEL: Record<string, string> = {
  cleared: "Lolos (Cleared)",
  passed: "Lolos (Passed)",
  flagged: "Catatan (Flagged)",
  conditional: "Bersyarat (Conditional)",
  partial: "Sebagian (Partial)",
  rejected: "Ditolak (Rejected)",
  failed: "Gagal (Failed)",
  missing: "Belum Diisi",
  not_applicable: "N/A",
};

const EVENT_LABEL: Record<string, string> = {
  putaway: "Masuk Gudang (Put-Away)",
  qc_reject: "Reject QC",
  quarantine_release: "Rilis Karantina",
  location_update: "Pindah Rak / Pallet",
  bpb_reserve: "Alokasi BPB",
  bpb_issue: "Keluar Produksi (BPB/LBB)",
  production_return: "Retur dari Produksi",
  void: "Pembatalan (Void)",
};

function esc(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Cetak Dokumen Resmi GDG-002-SBB — Form Stok Gudang Bahan Baku (A4).
 */
export function printSBBForm(item: RawMaterialStockItem): void {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Gagal membuka jendela cetak. Izinkan popup pada browser Anda.");
    return;
  }

  const st = STATUS_ID[item.status] || { label: item.status.toUpperCase(), bg: "#f1f5f9", color: "#334155" };
  const logs = item.logs || [];

  const logRowsHtml =
    logs.length > 0
      ? logs
          .map(
            (l, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td style="text-align:center;">${esc(l.occurredAt?.slice(0, 10) || "-")}</td>
            <td>${esc(EVENT_LABEL[l.eventType] || l.eventType)}</td>
            <td style="font-family:monospace;">${esc(l.refDocumentNo || "-")}</td>
            <td style="text-align:right; color:#15803d; font-weight:bold;">${l.qtyDelta > 0 ? `+${l.qtyDelta.toLocaleString("id-ID")}` : "-"}</td>
            <td style="text-align:right; color:#b91c1c; font-weight:bold;">${l.qtyDelta < 0 ? l.qtyDelta.toLocaleString("id-ID") : "-"}</td>
            <td style="text-align:right; font-weight:bold;">${l.balanceAfter.toLocaleString("id-ID")} ${esc(item.uom)}</td>
            <td style="text-align:center;">${l.packagesAfter} ${esc(item.packageUnit)}</td>
            <td>${esc(l.actorName || "-")}</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="9" style="text-align:center; color:#64748b; padding:10px;">Belum ada riwayat mutasi tercatat.</td></tr>`;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>FORM STOK GUDANG BAHAN BAKU - ${esc(item.entryNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 1cm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #0f172a; line-height: 1.35; }
    .kop { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
    .kop-left strong { font-size: 11.5pt; display: block; }
    .kop-left span { font-size: 8pt; color: #334155; }
    .kop-right { text-align: right; font-size: 8.5pt; font-weight: bold; }
    .doc-title { text-align: center; border: 2px solid #000; padding: 7px; margin: 8px 0 12px; background: #f8fafc; }
    .doc-title h1 { margin: 0; font-size: 12pt; letter-spacing: 0.4px; }
    .doc-title p { margin: 2px 0 0; font-size: 9pt; color: #475569; }
    .status-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-weight: bold; font-size: 8.5pt; background: ${st.bg}; color: ${st.color}; border: 1px solid ${st.color}; }
    .section-title { font-weight: bold; font-size: 9pt; text-transform: uppercase; background: #e2e8f0; padding: 4px 8px; border: 1px solid #334155; margin-top: 10px; }
    table.grid { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    table.grid td, table.grid th { border: 1px solid #334155; padding: 4px 6px; vertical-align: top; }
    table.grid th { background: #f1f5f9; font-size: 8.2pt; text-align: left; }
    .lbl { font-weight: bold; width: 19%; background: #f8fafc; }
    .val { width: 31%; }
    .mono { font-family: monospace; font-weight: bold; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; margin-top: 28px; text-align: center; page-break-inside: avoid; }
    .sig-line { border-top: 1px solid #000; margin-top: 48px; padding-top: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="kop">
    <div class="kop-left">
      <strong>CV. MANNA ANUGERAH SEJAHTERA</strong>
      <span>CU 820674 D-11 &bull; 104464OC &bull; FLO-ID 43683</span>
    </div>
    <div class="kop-right">
      ${esc(item.documentCode || "GDG-002-SBB")}<br/>
      Revisi 00
    </div>
  </div>

  <div class="doc-title">
    <h1>FORMULIR PENERIMAAN &amp; STOK GUDANG BAHAN BAKU</h1>
    <p>No. Dokumen: <span class="mono">${esc(item.entryNo)}</span> &nbsp;|&nbsp; Status: <span class="status-pill">${esc(st.label)}</span></p>
  </div>

  <div class="section-title">1. Identitas Bahan Baku &amp; Referensi Masuk</div>
  <table class="grid">
    <tr>
      <td class="lbl">Tanggal Masuk</td><td class="val">${esc(item.entryDate)}</td>
      <td class="lbl">Sumber Masuk</td><td class="val">${esc(item.sourceType.toUpperCase())}</td>
    </tr>
    <tr>
      <td class="lbl">No. LBM / GRN</td><td class="val mono">${esc(item.lbmNo || "-")}</td>
      <td class="lbl">No. PO / Surat Jalan</td><td class="val">${esc(item.poNo || "-")} / ${esc(item.deliveryNoteNo || "-")}</td>
    </tr>
    <tr>
      <td class="lbl">Supplier / Asal</td><td class="val">${esc(item.supplierName || "-")}</td>
      <td class="lbl">Kode Lot / Batch</td><td class="val mono" style="font-size:10pt; color:#0f766e;">${esc(item.batchNo)}</td>
    </tr>
    <tr>
      <td class="lbl">Nama Bahan Baku</td><td class="val"><strong>${esc(item.productName)}</strong></td>
      <td class="lbl">SKU Produk</td><td class="val mono">${esc(item.productSku || "-")}</td>
    </tr>
  </table>

  <div class="section-title">2. Verifikasi 3 Form QC &amp; Spesifikasi Mutu / Sertifikasi</div>
  <table class="grid">
    <tr>
      <td class="lbl">QC-007-CAS (Armada)</td><td class="val"><strong>${esc(QC_STATUS_LABEL[item.casStatus] || item.casStatus)}</strong></td>
      <td class="lbl">Klasifikasi Organik</td><td class="val"><strong>${esc(item.organicStatus)}</strong></td>
    </tr>
    <tr>
      <td class="lbl">QC-001-PBD (Bahan Datang)</td><td class="val"><strong>${esc(QC_STATUS_LABEL[item.pbdStatus] || item.pbdStatus)}</strong></td>
      <td class="lbl">Halal / Kosher</td><td class="val">${esc(item.halalStatus)} / ${esc(item.kosherStatus)}</td>
    </tr>
    <tr>
      <td class="lbl">QC-003-PBK (Kemasan)</td><td class="val"><strong>${esc(QC_STATUS_LABEL[item.pbkStatus] || item.pbkStatus)}</strong></td>
      <td class="lbl">Sertifikasi / Grade</td><td class="val">${esc(item.certifications || "-")} (${esc(item.qualityGrade)})</td>
    </tr>
    <tr>
      <td class="lbl">Kadar Air / Brix / Mesh</td>
      <td class="val">${item.moistureContent != null ? `${item.moistureContent}%` : "-"} / ${item.brixValue != null ? `${item.brixValue} °Bx` : "-"} / ${esc(item.meshSize || "-")}</td>
      <td class="lbl">Rekomendasi QC</td>
      <td class="val">${esc(item.qcRecommendation || "-")}</td>
    </tr>
  </table>

  <div class="section-title">3. Kuantitas Fisik &amp; Lokasi Penyimpanan (Put-Away)</div>
  <table class="grid">
    <tr>
      <td class="lbl">Qty Netto LBM</td><td class="val mono">${item.qtyLbm.toLocaleString("id-ID")} ${esc(item.uom)}</td>
      <td class="lbl">Gudang Tujuan</td><td class="val"><strong>${esc(item.warehouseName || "-")}</strong></td>
    </tr>
    <tr>
      <td class="lbl">Qty Diterima Gudang</td><td class="val mono" style="color:#15803d;">${item.qtyReceived.toLocaleString("id-ID")} ${esc(item.uom)} (${item.totalPackages} ${esc(item.packageUnit)})</td>
      <td class="lbl">Zona Penyimpanan</td><td class="val"><strong>${esc(item.storageZone)}</strong></td>
    </tr>
    <tr>
      <td class="lbl">Qty Reject / Karantina</td><td class="val mono" style="color:#b91c1c;">${item.qtyRejected.toLocaleString("id-ID")} ${esc(item.uom)}</td>
      <td class="lbl">Rak / Pallet</td><td class="val mono">${esc(item.rackLocation || "-")} / ${esc(item.palletNo || "-")}</td>
    </tr>
    <tr>
      <td class="lbl">Saldo Sisa Aktif</td><td class="val mono" style="font-size:10pt;">${item.qtyRemaining.toLocaleString("id-ID")} ${esc(item.uom)} (${item.remainingPackages} ${esc(item.packageUnit)})</td>
      <td class="lbl">Best Before / Kondisi</td><td class="val">${esc(item.expiryDate || "-")} (${esc(item.storageCondition)})</td>
    </tr>
    <tr>
      <td class="lbl">Catatan Gudang</td><td colspan="3">${esc(item.notes || "-")}</td>
    </tr>
  </table>

  <div class="section-title">4. Kartu Mutasi Lot Bahan Baku (KSB Mini)</div>
  <table class="grid">
    <thead>
      <tr>
        <th style="width:4%; text-align:center;">No</th>
        <th style="width:11%; text-align:center;">Tanggal</th>
        <th style="width:20%;">Aktivitas</th>
        <th style="width:14%;">No. Ref</th>
        <th style="width:10%; text-align:right;">Masuk</th>
        <th style="width:10%; text-align:right;">Keluar</th>
        <th style="width:12%; text-align:right;">Saldo</th>
        <th style="width:9%; text-align:center;">Kemasan</th>
        <th style="width:10%;">PIC</th>
      </tr>
    </thead>
    <tbody>
      ${logRowsHtml}
    </tbody>
  </table>

  <div class="signatures">
    <div>
      <div>Diserahkan Oleh (QC / Inbound)</div>
      <div class="sig-line">( ${esc(item.handedOverBy || "Petugas QC")} )</div>
    </div>
    <div>
      <div>Diterima Oleh (Admin Gudang)</div>
      <div class="sig-line">( ${esc(item.receivedBy || "Admin Gudang")} )</div>
    </div>
    <div>
      <div>Diketahui / Disetujui (Kepala Gudang)</div>
      <div class="sig-line">( ${esc(item.approvedBy || "Kepala Gudang")} )</div>
    </div>
  </div>

  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
  win.document.close();
}

/**
 * Cetak Label Identitas Pallet / Karung Lot (siap tempel di tumpukan bahan baku gudang).
 */
export function printPalletTag(item: RawMaterialStockItem): void {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Gagal membuka jendela cetak. Izinkan popup pada browser Anda.");
    return;
  }

  const st = STATUS_ID[item.status] || { label: item.status.toUpperCase(), bg: "#f1f5f9", color: "#334155" };

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>LABEL PALLET LOT - ${esc(item.batchNo)}</title>
  <style>
    @page { size: A5 landscape; margin: 0.7cm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
    .card { border: 3px solid #000; padding: 14px; border-radius: 6px; }
    .banner { text-align: center; padding: 8px; font-size: 16pt; font-weight: 900; letter-spacing: 1px; background: ${st.bg}; color: ${st.color}; border: 2px solid ${st.color}; margin-bottom: 10px; }
    .lot-box { text-align: center; border: 2px dashed #0f172a; padding: 8px; margin-bottom: 10px; background: #f8fafc; }
    .lot-label { font-size: 9pt; text-transform: uppercase; color: #475569; font-weight: bold; }
    .lot-code { font-family: monospace; font-size: 24pt; font-weight: 900; letter-spacing: 2px; color: #0f766e; }
    .badges { display: flex; gap: 8px; justify-content: center; margin-bottom: 10px; flex-wrap: wrap; }
    .tag { padding: 3px 10px; border: 1.5px solid #0f172a; font-weight: bold; font-size: 9.5pt; border-radius: 4px; background: #fff; }
    .tag-org { background: #ecfdf5; border-color: #047857; color: #065f46; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    td { border: 1px solid #334155; padding: 5px 8px; }
    .k { font-weight: bold; background: #f1f5f9; width: 24%; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display:flex; justify-content:space-between; font-size:8.5pt; font-weight:bold; margin-bottom:6px;">
      <span>CV. MANNA ANUGERAH SEJAHTERA &bull; LABEL IDENTITAS BAHAN BAKU</span>
      <span>${esc(item.entryNo)} (${esc(item.documentCode)})</span>
    </div>
    <div class="banner">${esc(st.label)}</div>
    <div class="lot-box">
      <div class="lot-label">KODE LOT / BATCH BAHAN BAKU</div>
      <div class="lot-code">${esc(item.batchNo)}</div>
    </div>
    <div class="badges">
      <span class="tag tag-org">${esc(item.organicStatus.toUpperCase())}</span>
      <span class="tag">${esc(item.halalStatus.toUpperCase())}</span>
      <span class="tag">${esc(item.kosherStatus.toUpperCase())}</span>
      <span class="tag">ZONA: ${esc(item.storageZone)}</span>
      <span class="tag">RAK: ${esc(item.rackLocation || "-")} &bull; PALLET: ${esc(item.palletNo || "-")}</span>
    </div>
    <table>
      <tr>
        <td class="k">Nama Bahan</td><td colspan="3"><strong>${esc(item.productName)}</strong> (${esc(item.productSku)})</td>
      </tr>
      <tr>
        <td class="k">Supplier</td><td>${esc(item.supplierName || "-")}</td>
        <td class="k">Ref. LBM</td><td style="font-family:monospace; font-weight:bold;">${esc(item.lbmNo || "-")}</td>
      </tr>
      <tr>
        <td class="k">Qty Masuk / Sisa</td><td><strong>${item.qtyRemaining.toLocaleString("id-ID")} / ${item.qtyReceived.toLocaleString("id-ID")} ${esc(item.uom)}</strong> (${item.remainingPackages} ${esc(item.packageUnit)})</td>
        <td class="k">Tgl Masuk / Exp</td><td>${esc(item.entryDate)} / <strong>${esc(item.expiryDate || "-")}</strong></td>
      </tr>
      <tr>
        <td class="k">Kadar Air / Mesh</td><td><strong>${item.moistureContent != null ? `${item.moistureContent}%` : "-"}</strong> / ${esc(item.meshSize || "-")}</td>
        <td class="k">Rekomendasi QC</td><td><strong>${esc(item.qcRecommendation || "-")}</strong></td>
      </tr>
    </table>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
  win.document.close();
}
