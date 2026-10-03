import { apiClient, ApiResponse } from "./client";

export interface ReimbursementClaim {
  id: string;
  companyId?: string | null;
  tenantId?: string | null;
  claimNo: string;
  requesterEmail?: string;
  employeeName: string;
  department: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  receiptAttached: boolean;
  status: string; // pending_approval | approved | paid | rejected
  createdAt?: string;
}

export interface CreateReimbursementClaimInput {
  employeeName: string;
  department?: string;
  category?: string;
  amount: number;
  description?: string;
  date?: string;
  receiptAttached?: boolean;
}

export const reimbursementApi = {
  listClaims: async (params?: {
    page?: number;
    perPage?: number;
    search?: string;
  }): Promise<ApiResponse<ReimbursementClaim[]>> => {
    return apiClient<ReimbursementClaim[]>("/reimbursements", { params });
  },
  createClaim: async (
    data: CreateReimbursementClaimInput
  ): Promise<ApiResponse<ReimbursementClaim>> => {
    return apiClient<ReimbursementClaim>("/reimbursements", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  approveClaim: async (id: string): Promise<ApiResponse<ReimbursementClaim>> => {
    return apiClient<ReimbursementClaim>(`/reimbursements/${id}/approve`, {
      method: "POST",
    });
  },
  rejectClaim: async (id: string): Promise<ApiResponse<ReimbursementClaim>> => {
    return apiClient<ReimbursementClaim>(`/reimbursements/${id}/reject`, {
      method: "POST",
    });
  },
  markPaid: async (id: string): Promise<ApiResponse<ReimbursementClaim>> => {
    return apiClient<ReimbursementClaim>(`/reimbursements/${id}/mark-paid`, {
      method: "POST",
    });
  },
};
