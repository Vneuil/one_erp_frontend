export interface StepDef {
  id: number;
  code: string;
  title: string;
  docCode: string;
  owner: string;
  pageHref: string;
  description: string;
}

export const PRODUCTION_STEPS: StepDef[] = [
  {
    id: 1,
    code: "LBM",
    title: "Inbound & LBM",
    docCode: "GD-007-LBM",
    owner: "Gudang Bahan Baku",
    pageHref: "/procurement/receipts",
    description: "Penerimaan bahan baku dengan timbangan presisi 2 desimal & slip tanda terima harga tersembunyi.",
  },
  {
    id: 2,
    code: "BPB",
    title: "Permintaan Bahan (BPB)",
    docCode: "PR-09",
    owner: "Produksi",
    pageHref: "/manufacturing/requisitions",
    description: "Form serah terima bahan PR-09 & scanning barcode pengeluaran dari gudang ke WIP ayak.",
  },
  {
    id: 3,
    code: "AYAK_1",
    title: "Ayak Mentah & Magnet Trap",
    docCode: "QC-009-MNA & QC-038-CMT",
    owner: "Produksi & QC",
    pageHref: "/qc/sieving",
    description: "Monitoring proses ayak mentah, pembersihan magnet trap, dan pencatatan brontol/susut.",
  },
  {
    id: 4,
    code: "OVEN",
    title: "Cek Kadar Air & Oven",
    docCode: "QC-012-MNO.05 & LHO",
    owner: "QC & Operator Oven",
    pageHref: "/manufacturing/oven",
    description: "Evaluasi kadar air: jika > 2.0% wajib oven; jika ≤ 2.0% dilewati (jalur cepat ke Ayak Matang).",
  },
  {
    id: 5,
    code: "AYAK_2",
    title: "Ayak Matang (Sieving 2)",
    docCode: "QC-009-MNA.01",
    owner: "Produksi",
    pageHref: "/qc/sieving",
    description: "Pemisahan brontol kering matang & pemastian keutuhan mesh screen sebelum pengemasan.",
  },
  {
    id: 6,
    code: "PACKING",
    title: "Ruang Packing & IoT Scale",
    docCode: "QC-011-MNJ.01 & Scale IoT",
    owner: "Operator Packing & QC",
    pageHref: "/qc/packing",
    description: "Pengecekan jarum/gunting utuh & penimbangan dengan tombol konfirmasi 'Settle Weight'.",
  },
  {
    id: 7,
    code: "METAL",
    title: "Metal Detector CCP 1",
    docCode: "QC-017-VMD & CPP",
    owner: "QA/QC Lead",
    pageHref: "/qc/metal-detector",
    description: "Critical Control Point (CCP 1): Verifikasi 3 test piece (Fe 1.5mm, Non-Fe 2.0mm, SS 2.5mm).",
  },
  {
    id: 8,
    code: "PJD",
    title: "Pemeriksaan Produk Jadi",
    docCode: "QC-004-PJD.05 & QC-018-PLK",
    owner: "QC Release Officer",
    pageHref: "/qc/finished-goods",
    description: "Organoleptik rasa, aroma, warna, kelarutan, cek label kemasan & keputusan rilis mutu (PASSED).",
  },
  {
    id: 9,
    code: "LHP",
    title: "Laporan Hasil Produksi",
    docCode: "PRO-002-LHP & Bulk QR",
    owner: "Admin Produksi",
    pageHref: "/manufacturing/lhp",
    description: "Rekap yield/susut, penomoran palet, dan auto-generate bulk serial stiker QR (cth: 26N48PW001-850).",
  },
  {
    id: 10,
    code: "LST",
    title: "Laporan Serah Terima (LST)",
    docCode: "GDG-009-LST / QA-044-LST",
    owner: "Produksi ➔ Gudang FG",
    pageHref: "/inventory/lst",
    description: "Penyerahan fisik barang jadi ke Gudang FG, verifikasi QC, tanda tangan, dan penguncian status Final.",
  },
];

export interface ScaleWeightRow {
  gross: number;
  tare: number;
  net: number;
}

export interface ProductionBatchRecord {
  id: string;
  productionOrderId?: string;
  orderNumber?: string;
  batchNo: string;
  date: string;
  productId?: string;
  productName: string;
  productCode: string;
  supplierId?: string;
  supplier: string;
  supplierCode: string;
  buyerId?: string;
  buyerName?: string;
  certification: string;
  fairtradeStatus: string;
  rawInputKg: number;
  fgOutputPcs: number;
  fgOutputKg: number;
  currentStage: number; // 1-10
  completedStages: number[];
  moisturePercent: number;
  ovenRequired: boolean;
  status: "in_progress" | "handover_ready" | "final";
  poId?: string;
  poNo?: string;
  lbmId?: string;
  lbmNo: string;
  requisitionId?: string;
  requisitionNo?: string;
  rawMaterialStockId?: string;
  lstId?: string;
  lstNo: string;
  lstStatus?: "draft" | "verified_qc" | "accepted_warehouse" | "rejected" | "final";
  palletCount: number;

  // Form specific state
  deliveryNoteNo?: string;
  scaleWeights?: ScaleWeightRow[];
  packagingQty?: number;
  scannedBarcode?: string;
  sievingRawInput?: number;
  rawCleanSugar?: number;
  rawBrontolReject?: number;
  rawDustLoss?: number;
  magnetTrapChecked?: boolean;
  cookedCleanSugar?: number;
  cookedBrontol?: number;
  needleCheckOk?: boolean;
  scissorCheckOk?: boolean;
  scaleDisplay?: number;
  isScaleSettled?: boolean;
  weightPerBag?: number;
  packedBagsCount?: number;
  metalFePassed?: boolean;
  metalNonFePassed?: boolean;
  metalSsPassed?: boolean;
  metalCleaningOk?: boolean;
  qcDecision?: "PASSED" | "HOLD" | "REJECTED";
  qcTaste?: string;
  qcAroma?: string;
  qcColor?: string;
  qcFinalMoisture?: number;
  labelCheckPassed?: boolean;
  bulkSerials?: string[];
  handoverDate?: string;
  handedOverBy?: string;
  receivedBy?: string;
  verifiedByQc?: string;
}

export function createDefaultBatchRecord(
  overrides?: Partial<ProductionBatchRecord>
): ProductionBatchRecord {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const idStr = `batch-${Date.now()}`;
  return {
    id: idStr,
    batchNo: overrides?.batchNo || `BATCH-${dateStr.replace(/-/g, "")}`,
    date: dateStr,
    productName: overrides?.productName || "",
    productCode: overrides?.productCode || "",
    supplier: overrides?.supplier || "",
    supplierCode: overrides?.supplierCode || "",
    buyerName: overrides?.buyerName || "",
    certification: overrides?.certification || "Standar Mutu",
    fairtradeStatus: overrides?.fairtradeStatus || "NON FAIRTRADE",
    rawInputKg: overrides?.rawInputKg || 0,
    fgOutputPcs: overrides?.fgOutputPcs || 0,
    fgOutputKg: overrides?.fgOutputKg || 0,
    currentStage: overrides?.currentStage || 1,
    completedStages: overrides?.completedStages || [],
    moisturePercent: overrides?.moisturePercent || 1.8,
    ovenRequired: overrides?.ovenRequired || false,
    status: overrides?.status || "in_progress",
    poId: overrides?.poId || "",
    poNo: overrides?.poNo || "",
    lbmNo: overrides?.lbmNo || "",
    lstNo: overrides?.lstNo || "",
    palletCount: overrides?.palletCount || 0,
    ...overrides,
  };
}

export const INITIAL_BATCHES: ProductionBatchRecord[] = [];
