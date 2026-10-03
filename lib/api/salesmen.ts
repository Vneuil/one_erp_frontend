import { apiClient, ApiResponse } from "./client";

export interface SalesmanItem {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  territory: string;
  commissionRate: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSalesmanInput {
  code: string;
  name: string;
  email: string;
  phone: string;
  territory: string;
  commissionRate: number;
  status?: string;
}

export const salesmenApi = {
  list: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<SalesmanItem[]>> => {
    return apiClient<SalesmanItem[]>("/salesmen", { params });
  },

  create: async (data: CreateSalesmanInput): Promise<ApiResponse<SalesmanItem>> => {
    return apiClient<SalesmanItem>("/salesmen", { method: "POST", body: JSON.stringify(data) });
  },

  update: async (id: string, data: Partial<CreateSalesmanInput>): Promise<ApiResponse<SalesmanItem>> => {
    return apiClient<SalesmanItem>(`/salesmen/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/salesmen/${id}`, { method: "DELETE" });
  },
};
