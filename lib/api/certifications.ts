import { apiClient, ApiResponse } from "./client";

export type CertEffectiveStatus = "active" | "suspended" | "revoked" | "expired" | "not_yet_valid";

export interface CertificateItem {
  id: string;
  scheme: string;
  number: string;
  issuer?: string;
  supplierId?: string;
  productId?: string;
  validFrom?: string;
  validUntil: string;
  /** Stored status: active | suspended | revoked. */
  status: "active" | "suspended" | "revoked";
  /** What to act on. A certificate turns "expired" by itself the day after validUntil. */
  effectiveStatus: CertEffectiveStatus;
  daysLeft?: number;
  suspendReason?: string;
  suspendedBy?: string;
  attachment?: string;
  notes?: string;
}

export interface CertificateInput {
  scheme: string;
  number: string;
  issuer?: string;
  supplierId?: string;
  productId?: string;
  validFrom?: string;
  validUntil: string;
  attachment?: string;
  notes?: string;
}

export interface SupplierEligibility {
  supplierId: string;
  active: string[];
  suspended: string[];
  expired: string[];
}

export interface LotTrace {
  lot: string;
  found: boolean;
  receipts: { receiptNo: string; receivedDate: string; orderNo: string; supplierId?: string; supplierName: string; productId: string; quantity: number; lotNumber: string }[];
  receiptQc: TraceInspection[];
  usedIn: { orderNumber: string; childBatchNo: string; childProduct: string; quantityUsed: number; recordedAt: string }[];
  finishedBatches: string[];
  finishedQc: TraceInspection[];
  supplierCertificates: CertificateItem[];
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

export const certificationsApi = {
  schemes: (): Promise<ApiResponse<string[]>> => apiClient<string[]>("/certifications/schemes"),
  list: (params?: { supplierId?: string; productId?: string; scheme?: string }): Promise<ApiResponse<CertificateItem[]>> =>
    apiClient<CertificateItem[]>("/certifications", { params }),
  eligibility: (scheme?: string): Promise<ApiResponse<SupplierEligibility[]>> =>
    apiClient<SupplierEligibility[]>("/certifications/eligibility", { params: { scheme } }),
  create: (data: CertificateInput): Promise<ApiResponse<CertificateItem>> =>
    apiClient<CertificateItem>("/certifications", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: CertificateInput): Promise<ApiResponse<CertificateItem>> =>
    apiClient<CertificateItem>(`/certifications/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  suspend: (id: string, reason: string): Promise<ApiResponse<CertificateItem>> =>
    apiClient<CertificateItem>(`/certifications/${id}/suspend`, { method: "POST", body: JSON.stringify({ reason }) }),
  resume: (id: string): Promise<ApiResponse<CertificateItem>> =>
    apiClient<CertificateItem>(`/certifications/${id}/resume`, { method: "POST" }),
  revoke: (id: string, reason: string): Promise<ApiResponse<CertificateItem>> =>
    apiClient<CertificateItem>(`/certifications/${id}/revoke`, { method: "POST", body: JSON.stringify({ reason }) }),
  traceLot: (lot: string): Promise<ApiResponse<LotTrace>> =>
    apiClient<LotTrace>(`/traceability/lot/${encodeURIComponent(lot)}`),
};
