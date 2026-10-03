import { apiClient, ApiResponse } from "./client";

export interface SupplierItem {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierInput {
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  status?: string;
}

export const suppliersApi = {
  list: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<SupplierItem[]>> => {
    return apiClient<SupplierItem[]>("/suppliers", { params });
  },

  getById: async (id: string): Promise<ApiResponse<SupplierItem>> => {
    return apiClient<SupplierItem>(`/suppliers/${id}`);
  },

  create: async (data: CreateSupplierInput): Promise<ApiResponse<SupplierItem>> => {
    return apiClient<SupplierItem>("/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<CreateSupplierInput>): Promise<ApiResponse<SupplierItem>> => {
    return apiClient<SupplierItem>(`/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/suppliers/${id}`, {
      method: "DELETE",
    });
  },
};
