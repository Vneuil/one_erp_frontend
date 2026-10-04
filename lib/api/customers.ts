import { apiClient, ApiResponse } from "./client";

export interface CustomerItem {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  /** NPWP (15/16 digits) and NIK (16 digits); the buyer identity on Faktur Pajak. */
  npwp?: string;
  nik?: string;
  segment: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomerInput {
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  npwp?: string;
  nik?: string;
  segment: string;
  status?: string;
}

export const customersApi = {
  list: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<CustomerItem[]>> => {
    return apiClient<CustomerItem[]>("/customers", { params });
  },

  getById: async (id: string): Promise<ApiResponse<CustomerItem>> => {
    return apiClient<CustomerItem>(`/customers/${id}`);
  },

  create: async (data: CreateCustomerInput): Promise<ApiResponse<CustomerItem>> => {
    return apiClient<CustomerItem>("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<CreateCustomerInput>): Promise<ApiResponse<CustomerItem>> => {
    return apiClient<CustomerItem>(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/customers/${id}`, {
      method: "DELETE",
    });
  },
};
