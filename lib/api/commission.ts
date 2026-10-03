import { apiClient, ApiResponse } from "./client";

export interface CommissionTier {
  minAmount: number;
  maxAmount: number;
  ratePercent: number;
}

export interface CommissionRule {
  id: string;
  companyId?: string | null;
  name: string;
  scope: string;
  ratePercent: number;
  tiers?: CommissionTier[];
  appliesTo: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateCommissionRuleInput {
  name: string;
  scope: string;
  ratePercent?: number;
  tiers?: CommissionTier[];
  appliesTo?: string;
  companyId?: string | null;
}

export interface CommissionRecord {
  id: string;
  companyId?: string | null;
  salespersonName: string;
  salesOrderId?: string | null;
  salesOrderNumber: string;
  salesOrderAmount: number;
  commissionRuleId?: string | null;
  calculatedCommissionAmount: number;
  status: string;
  period: string;
  createdAt?: string;
}

export interface CreateCommissionRecordInput {
  salespersonName: string;
  salesOrderId?: string | null;
  salesOrderNumber?: string;
  salesOrderAmount: number;
  commissionRuleId: string;
  period: string;
  companyId?: string | null;
}

export interface CommissionSummaryItem {
  salespersonName: string;
  recordCount: number;
  totalCommission: number;
}

export interface CommissionSummary {
  period: string;
  totalCommission: number;
  bySalesperson: CommissionSummaryItem[];
}

export const commissionApi = {
  listRules: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<CommissionRule[]>> => {
    return apiClient<CommissionRule[]>("/commission/rules", { params });
  },
  createRule: async (data: CreateCommissionRuleInput): Promise<ApiResponse<CommissionRule>> => {
    return apiClient<CommissionRule>("/commission/rules", { method: "POST", body: JSON.stringify(data) });
  },
  getRule: async (id: string): Promise<ApiResponse<CommissionRule>> => {
    return apiClient<CommissionRule>(`/commission/rules/${id}`);
  },

  listRecords: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<CommissionRecord[]>> => {
    return apiClient<CommissionRecord[]>("/commission/records", { params });
  },
  createRecord: async (data: CreateCommissionRecordInput): Promise<ApiResponse<CommissionRecord>> => {
    return apiClient<CommissionRecord>("/commission/records", { method: "POST", body: JSON.stringify(data) });
  },
  getRecord: async (id: string): Promise<ApiResponse<CommissionRecord>> => {
    return apiClient<CommissionRecord>(`/commission/records/${id}`);
  },
  approveRecord: async (id: string): Promise<ApiResponse<CommissionRecord>> => {
    return apiClient<CommissionRecord>(`/commission/records/${id}/approve`, { method: "POST" });
  },
  markRecordPaid: async (id: string): Promise<ApiResponse<CommissionRecord>> => {
    return apiClient<CommissionRecord>(`/commission/records/${id}/mark-paid`, { method: "POST" });
  },

  getSummary: async (period: string): Promise<ApiResponse<CommissionSummary>> => {
    return apiClient<CommissionSummary>("/commission/summary", { params: { period } });
  },
};
