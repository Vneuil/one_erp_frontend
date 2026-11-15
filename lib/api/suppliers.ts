import { apiClient, ApiResponse } from "./client";

export interface SupplierItem {
  id: string;
  code: string;
  batchCode?: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  /** PRD | PCK | ATK ... the family the code VD-<type>-<seq> is built from. */
  vendorType?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  /** Name of a master Payment Term, e.g. "Net 30". */
  paymentTerm?: string;
  /** NPWP (15/16 digits) and NIK (16 digits); the seller identity on Faktur Pajak Masukan. */
  npwp?: string;
  nik?: string;
  category: string;
  status: string;
  codes?: SupplierCodeItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierCodeItem {
  id: string;
  supplierId: string;
  supplierName?: string;
  code: string;
  vendorType: string;
  batchCode?: string;
  description?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierCodeInput {
  supplierId: string;
  code?: string;
  vendorType: string;
  batchCode?: string;
  description?: string;
  status?: string;
}

export interface UpdateSupplierCodeInput {
  code?: string;
  vendorType?: string;
  batchCode?: string;
  description?: string;
  status?: string;
}

export interface VendorTypeOption {
  code: string;
  label: string;
}

export interface CreateSupplierInput {
  /** Leave empty to auto-generate VD-<vendorType>-NNN. */
  code?: string;
  vendorType?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  paymentTerm?: string;
  batchCode?: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  npwp?: string;
  nik?: string;
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

  types: async (): Promise<ApiResponse<VendorTypeOption[]>> => apiClient<VendorTypeOption[]>("/suppliers/types"),

  setStatus: async (id: string, status: "Active" | "Inactive"): Promise<ApiResponse<SupplierItem>> =>
    apiClient<SupplierItem>(`/suppliers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  delete: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/suppliers/${id}`, {
      method: "DELETE",
    });
  },
};

export const supplierCodesApi = {
  list: async (params?: { supplierId?: string; vendorType?: string }): Promise<ApiResponse<SupplierCodeItem[]>> => {
    return apiClient<SupplierCodeItem[]>("/supplier-codes", { params });
  },

  create: async (data: CreateSupplierCodeInput): Promise<ApiResponse<SupplierCodeItem>> => {
    return apiClient<SupplierCodeItem>("/supplier-codes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: UpdateSupplierCodeInput): Promise<ApiResponse<SupplierCodeItem>> => {
    return apiClient<SupplierCodeItem>(`/supplier-codes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  setStatus: async (id: string, status: "Active" | "Inactive"): Promise<ApiResponse<SupplierCodeItem>> =>
    apiClient<SupplierCodeItem>(`/supplier-codes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  delete: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/supplier-codes/${id}`, {
      method: "DELETE",
    });
  },
};
