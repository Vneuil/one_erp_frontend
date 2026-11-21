import { apiClient, ApiResponse } from "./client";

export type RawStockStatus =
  | "draft"
  | "available"
  | "quarantine"
  | "depleted"
  | "rejected"
  | "voided";

export type RawStockSourceType =
  | "lbm"
  | "opening_balance"
  | "return_production"
  | "adjustment";

export interface QCCASSummary {
  id: string;
  checkDate: string;
  driverName: string;
  licensePlate?: string;
  vehicleType?: string;
  overallStatus: "cleared" | "flagged" | "rejected" | string;
  qcName?: string;
  qaName?: string;
}

export interface QCPBDSummary {
  id: string;
  checkDate: string;
  productName: string;
  batchNo?: string;
  totalBags: number;
  netWeight: number;
  acceptedWeight: number;
  rejectedWeight: number;
  sugarCondition?: string;
  packagingCondition?: string;
  moistureContent?: number;
  brixValue?: number;
  meshSize?: string;
  recommendedAction?: string;
  overallStatus: "passed" | "conditional" | "rejected" | string;
  qcName?: string;
  qaName?: string;
}

export interface QCPBKSummary {
  id: string;
  checkDate: string;
  itemName: string;
  materialType: string;
  totalQty: number;
  passedQty: number;
  failedQty: number;
  overallStatus: "passed" | "partial" | "failed" | string;
  qcName?: string;
  qaName?: string;
}

export interface LBMInboundLine {
  lineId: string;
  productId: string;
  productSku: string;
  productName: string;
  uom: string;
  organicType?: string;
  certifications?: string;
  lotNumber: string;
  weightGross?: number;
  weightTare?: number;
  weightNet: number;
  packageSize: number;
  bagCount: number;
}

export interface RawMaterialStockEntrySummaryRef {
  id: string;
  entryNo: string;
  productId: string;
  productName: string;
  batchNo: string;
  qtyReceived: number;
  status: RawStockStatus;
}

export interface LBMInboundContext {
  goodsReceiptId: string;
  lbmNo: string;
  poNo?: string;
  receivedDate: string;
  warehouseId?: string;
  warehouseName?: string;
  receivedBy?: string;
  status: string;
  deliveryNoteNo?: string;
  supplierId?: string;
  supplierName?: string;
  sugarCondition?: string;
  packageCondition?: string;
  notes?: string;
  lines: LBMInboundLine[];
  cas?: QCCASSummary;
  pbd?: QCPBDSummary;
  pbk?: QCPBKSummary;
  casStatus: string;
  pbdStatus: string;
  pbkStatus: string;
  qcGateReady: boolean;
  recommendedStatus: "available" | "quarantine" | "rejected" | string;
  existingEntries: RawMaterialStockEntrySummaryRef[];
}

export interface RawMaterialStockLogItem {
  id: string;
  entryId: string;
  eventType: string;
  refDocumentNo?: string;
  qtyDelta: number;
  packageDelta: number;
  balanceAfter: number;
  packagesAfter: number;
  actorName?: string;
  notes?: string;
  occurredAt: string;
}

export interface RawMaterialStockItem {
  id: string;
  entryNo: string;
  documentCode: string;
  entryDate: string;
  sourceType: RawStockSourceType;
  goodsReceiptId?: string;
  lbmNo?: string;
  poNo?: string;
  deliveryNoteNo?: string;
  supplierId?: string;
  supplierName?: string;
  productId: string;
  productSku: string;
  productName: string;
  batchNo: string;
  casCheckId?: string;
  casStatus: string;
  pbdCheckId?: string;
  pbdStatus: string;
  pbkCheckId?: string;
  pbkStatus: string;
  moistureContent?: number;
  brixValue?: number;
  meshSize?: string;
  qcRecommendation?: string;
  organicStatus: string;
  halalStatus: string;
  kosherStatus: string;
  certifications?: string;
  qualityGrade: string;
  uom: string;
  packageUnit: string;
  qtyLbm: number;
  qtyReceived: number;
  qtyRejected: number;
  totalPackages: number;
  avgWeightPerPackage: number;
  qtyReserved: number;
  qtyIssued: number;
  qtyRemaining: number;
  remainingPackages: number;
  warehouseId: string;
  warehouseName: string;
  storageZone: string;
  rackLocation?: string;
  palletNo?: string;
  productionDate?: string;
  expiryDate?: string;
  expiryStatus: "expired" | "expiring_soon" | "ok" | "no_expiry" | string;
  daysToExpiry?: number;
  storageCondition: string;
  status: RawStockStatus;
  handedOverBy?: string;
  receivedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  stockSynced: boolean;
  stockAddedBySbb: boolean;
  notes?: string;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;
  logs?: RawMaterialStockLogItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterialStockSummary {
  totalEntries: number;
  draftCount: number;
  availableCount: number;
  quarantineCount: number;
  depletedCount: number;
  rejectedCount: number;
  totalAvailableQty: number;
  totalAvailablePackages: number;
  totalQuarantineQty: number;
  organicAvailableQty: number;
  conventionalAvailableQty: number;
  expiringSoonCount: number;
  expiredCount: number;
}

export interface CreateRawMaterialStockInput {
  entryDate: string;
  sourceType: RawStockSourceType;
  goodsReceiptId?: string;
  lbmNo?: string;
  poNo?: string;
  deliveryNoteNo?: string;
  supplierId?: string;
  supplierName?: string;
  productId: string;
  productSku?: string;
  productName?: string;
  batchNo: string;
  casCheckId?: string;
  casStatus?: string;
  pbdCheckId?: string;
  pbdStatus?: string;
  pbkCheckId?: string;
  pbkStatus?: string;
  moistureContent?: number;
  brixValue?: number;
  meshSize?: string;
  qcRecommendation?: string;
  organicStatus?: string;
  halalStatus?: string;
  kosherStatus?: string;
  certifications?: string;
  qualityGrade?: string;
  uom?: string;
  packageUnit?: string;
  qtyLbm?: number;
  qtyReceived: number;
  qtyRejected?: number;
  totalPackages?: number;
  warehouseId: string;
  storageZone?: string;
  rackLocation?: string;
  palletNo?: string;
  productionDate?: string;
  expiryDate?: string;
  storageCondition?: string;
  handedOverBy?: string;
  receivedBy?: string;
  notes?: string;
  postImmediately?: boolean;
  targetStatus?: "available" | "quarantine" | "rejected";
}

export interface UpdateRawMaterialStockInput {
  entryDate?: string;
  batchNo?: string;
  pbkStatus?: string;
  moistureContent?: number;
  brixValue?: number;
  meshSize?: string;
  qcRecommendation?: string;
  organicStatus?: string;
  halalStatus?: string;
  kosherStatus?: string;
  certifications?: string;
  qualityGrade?: string;
  uom?: string;
  packageUnit?: string;
  qtyLbm?: number;
  qtyReceived?: number;
  qtyRejected?: number;
  totalPackages?: number;
  warehouseId?: string;
  storageZone?: string;
  rackLocation?: string;
  palletNo?: string;
  productionDate?: string;
  expiryDate?: string;
  storageCondition?: string;
  handedOverBy?: string;
  receivedBy?: string;
  notes?: string;
}

export const rawMaterialStockApi = {
  getLbmContext: async (goodsReceiptId: string): Promise<ApiResponse<LBMInboundContext>> =>
    apiClient<LBMInboundContext>(`/inventory/raw-material-stock/lbm-context/${goodsReceiptId}`),

  getSummary: async (warehouseId?: string): Promise<ApiResponse<RawMaterialStockSummary>> =>
    apiClient<RawMaterialStockSummary>("/inventory/raw-material-stock/summary", {
      params: { warehouseId: warehouseId || undefined },
    }),

  listAvailable: async (params?: {
    productId?: string;
    warehouseId?: string;
  }): Promise<ApiResponse<RawMaterialStockItem[]>> =>
    apiClient<RawMaterialStockItem[]>("/inventory/raw-material-stock/available", {
      params,
    }),

  list: async (params?: {
    status?: string;
    warehouseId?: string;
    productId?: string;
    storageZone?: string;
    organicStatus?: string;
    lbmNo?: string;
    goodsReceiptId?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
  }): Promise<ApiResponse<RawMaterialStockItem[]>> =>
    apiClient<RawMaterialStockItem[]>("/inventory/raw-material-stock", { params }),

  getById: async (id: string): Promise<ApiResponse<RawMaterialStockItem>> =>
    apiClient<RawMaterialStockItem>(`/inventory/raw-material-stock/${id}`),

  create: async (data: CreateRawMaterialStockInput): Promise<ApiResponse<RawMaterialStockItem>> =>
    apiClient<RawMaterialStockItem>("/inventory/raw-material-stock", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: async (
    id: string,
    data: UpdateRawMaterialStockInput
  ): Promise<ApiResponse<RawMaterialStockItem>> =>
    apiClient<RawMaterialStockItem>(`/inventory/raw-material-stock/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  post: async (
    id: string,
    data?: { targetStatus?: "available" | "quarantine" | "rejected"; approvedBy?: string; notes?: string }
  ): Promise<ApiResponse<RawMaterialStockItem>> =>
    apiClient<RawMaterialStockItem>(`/inventory/raw-material-stock/${id}/post`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),

  releaseQuarantine: async (
    id: string,
    data: { decision: "available" | "rejected"; approvedBy?: string; notes: string }
  ): Promise<ApiResponse<RawMaterialStockItem>> =>
    apiClient<RawMaterialStockItem>(`/inventory/raw-material-stock/${id}/release`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  void: async (id: string, reason: string): Promise<ApiResponse<RawMaterialStockItem>> =>
    apiClient<RawMaterialStockItem>(`/inventory/raw-material-stock/${id}/void`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  delete: async (id: string): Promise<ApiResponse<null>> =>
    apiClient<null>(`/inventory/raw-material-stock/${id}`, {
      method: "DELETE",
    }),
};
