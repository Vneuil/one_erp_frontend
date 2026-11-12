import { apiClient, ApiResponse } from "./client";

export type CustomerType = "B2B" | "B2C";

export interface CustomerAddress {
  id?: string;
  label: string;
  recipientName?: string;
  phone?: string;
  address: string;
  city?: string;
  province?: string;
  postalCode?: string;
  isDefault: boolean;
}

export interface CustomerItem {
  id: string;
  code: string;
  /** B2B (perusahaan) -> B2B-0001, B2C (perorangan) -> B2C-0001 */
  customerType: CustomerType;
  name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  province?: string;
  postalCode?: string;
  /** NPWP (15/16 digits) and NIK (16 digits); the buyer identity on Faktur Pajak. */
  npwp?: string;
  nik?: string;
  segment: string;
  status: string;
  contactPerson?: string;
  contactPhone?: string;
  contactMobile?: string;
  contactWhatsapp?: string;
  /** Delivery addresses; may differ from the office address. */
  shippingAddresses: CustomerAddress[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomerInput {
  /** Leave empty to auto-generate B2B-NNNN / B2C-NNNN. */
  code?: string;
  customerType: CustomerType;
  name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  province?: string;
  postalCode?: string;
  npwp?: string;
  nik?: string;
  segment?: string;
  status?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactMobile?: string;
  contactWhatsapp?: string;
  shippingAddresses?: CustomerAddress[];
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

  /** Deactivate / reactivate (Manager+). Preferred over delete. */
  setStatus: async (id: string, status: "Active" | "Inactive"): Promise<ApiResponse<CustomerItem>> =>
    apiClient<CustomerItem>(`/customers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  delete: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/customers/${id}`, {
      method: "DELETE",
    });
  },
};
