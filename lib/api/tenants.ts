import { apiClient, ApiResponse } from "./client";

export interface TenantItem {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
}

export interface CreateTenantInput {
  name: string;
  code: string;
}

export interface SwitchTenantResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  tenant: TenantItem;
}

export const tenantsApi = {
  list: async (): Promise<ApiResponse<TenantItem[]>> => {
    return apiClient<TenantItem[]>("/tenants");
  },
  create: async (data: CreateTenantInput): Promise<ApiResponse<TenantItem>> => {
    return apiClient<TenantItem>("/tenants", { method: "POST", body: JSON.stringify(data) });
  },
  switch: async (tenantId: string): Promise<ApiResponse<SwitchTenantResult>> => {
    return apiClient<SwitchTenantResult>("/tenants/switch", {
      method: "POST",
      body: JSON.stringify({ tenantId }),
    });
  },
};
