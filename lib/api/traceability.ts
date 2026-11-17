import { apiClient, ApiResponse } from "./client";

export interface SupplierCertInfo {
  id: string;
  scheme: string;
  number: string;
  issuer?: string;
  supplierId?: string;
  validFrom?: string;
  validUntil: string;
  status: string;
  effectiveStatus: string;
}

export interface LotTrace {
  lot: string;
  found: boolean;
  receipts: {
    receiptNo: string;
    receivedDate: string;
    orderNo: string;
    supplierId?: string;
    supplierName: string;
    productId: string;
    quantity: number;
    lotNumber: string;
  }[];
  receiptQc: TraceInspection[];
  usedIn: {
    orderNumber: string;
    childBatchNo: string;
    childProduct: string;
    quantityUsed: number;
    recordedAt: string;
  }[];
  finishedBatches: string[];
  finishedQc: TraceInspection[];
  supplierCertificates: SupplierCertInfo[];
  gaps?: string[];
}

export interface TraceInspection {
  inspectionNo: string;
  batchNo: string;
  targetType: string;
  overallStatus: string;
  inspectedAt: string;
  isVoided: boolean;
}

export const traceabilityApi = {
  traceLot: (lot: string): Promise<ApiResponse<LotTrace>> =>
    apiClient<LotTrace>(`/traceability/lot/${encodeURIComponent(lot)}`),
};
