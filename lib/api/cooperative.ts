import { apiClient, ApiResponse } from "./client";

export interface CooperativeLoan {
  id: string;
  companyId?: string | null;
  tenantId?: string | null;
  loanNo: string;
  employeeId?: string | null;
  employeeName: string;
  department: string;
  totalLoan: number;
  monthlyDeduction: number;
  remainingBalance: number;
  tenureMonths: number;
  monthsPaid: number;
  status: string; // active | completed | pending_approval
  createdAt?: string;
}

export interface CreateCooperativeLoanInput {
  // employeeId is the preferred way to create a loan: the backend derives
  // employeeName/department server-side from the real HRM record. Falling
  // back to free-typed employeeName is only kept for legacy callers.
  employeeId?: string;
  employeeName?: string;
  department?: string;
  totalLoan: number;
  monthlyDeduction?: number;
  tenureMonths: number;
}

export const cooperativeApi = {
  listLoans: async (params?: {
    page?: number;
    perPage?: number;
    search?: string;
  }): Promise<ApiResponse<CooperativeLoan[]>> => {
    return apiClient<CooperativeLoan[]>("/cooperative/loans", { params });
  },
  createLoan: async (
    data: CreateCooperativeLoanInput
  ): Promise<ApiResponse<CooperativeLoan>> => {
    return apiClient<CooperativeLoan>("/cooperative/loans", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  recordPayment: async (id: string): Promise<ApiResponse<CooperativeLoan>> => {
    return apiClient<CooperativeLoan>(`/cooperative/loans/${id}/record-payment`, {
      method: "POST",
    });
  },
};
