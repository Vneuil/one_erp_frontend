import { apiClient, ApiResponse } from "./client";

export interface ShippingMethodItem {
  id: string;
  code: string;
  name: string;
  carrier: string;
  estimatedDays: number;
  cost: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateShippingMethodInput {
  code: string;
  name: string;
  carrier: string;
  estimatedDays: number;
  cost: number;
  status?: string;
}

export const shippingMethodsApi = {
  list: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<ShippingMethodItem[]>> => {
    return apiClient<ShippingMethodItem[]>("/shipping-methods", { params });
  },

  create: async (data: CreateShippingMethodInput): Promise<ApiResponse<ShippingMethodItem>> => {
    return apiClient<ShippingMethodItem>("/shipping-methods", { method: "POST", body: JSON.stringify(data) });
  },

  update: async (id: string, data: Partial<CreateShippingMethodInput>): Promise<ApiResponse<ShippingMethodItem>> => {
    return apiClient<ShippingMethodItem>(`/shipping-methods/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/shipping-methods/${id}`, { method: "DELETE" });
  },
};
