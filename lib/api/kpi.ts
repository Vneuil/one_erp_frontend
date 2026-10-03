import { apiClient, ApiResponse } from "./client";

export interface KpiReviewItem {
  id: string;
  companyId?: string | null;
  employeeName: string;
  department: string;
  period: string;
  targetScore: number;
  actualScore: number;
  weightFormula: string;
  grade: string;
  status: string;
  evaluator: string;
  createdAt?: string;
}

export interface CreateKpiReviewInput {
  employeeName: string;
  department?: string;
  period: string;
  targetScore: number;
  actualScore: number;
  weightFormula?: string;
  evaluator?: string;
}

export interface UpdateKpiStatusInput {
  status: string;
}

export const kpiApi = {
  listKpiReviews: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<KpiReviewItem[]>> => {
    return apiClient<KpiReviewItem[]>("/kpi", { params });
  },
  createKpiReview: async (data: CreateKpiReviewInput): Promise<ApiResponse<KpiReviewItem>> => {
    return apiClient<KpiReviewItem>("/kpi", { method: "POST", body: JSON.stringify(data) });
  },
  updateKpiStatus: async (id: string, data: UpdateKpiStatusInput): Promise<ApiResponse<KpiReviewItem>> => {
    return apiClient<KpiReviewItem>(`/kpi/${id}/status`, { method: "PUT", body: JSON.stringify(data) });
  },
};
