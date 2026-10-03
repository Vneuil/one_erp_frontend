import { apiClient, ApiResponse } from "./client";
import { CompanyInfo } from "@/stores/app-store";

export interface CompanyMembership {
  id: string;
  code: string;
  name: string;
  role: string;
}

export interface SwitchCompanyResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    companyId?: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  };
}

export const authApi = {
  listCompanies: async (): Promise<ApiResponse<CompanyMembership[]>> => {
    return apiClient<CompanyMembership[]>("/auth/companies");
  },

  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    return apiClient<null>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (
    token: string,
    newPassword: string
  ): Promise<ApiResponse<null>> => {
    return apiClient<null>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  },

  switchCompany: async (companyId: string): Promise<ApiResponse<SwitchCompanyResult>> => {
    return apiClient<SwitchCompanyResult>("/auth/switch-company", {
      method: "POST",
      body: JSON.stringify({ companyId }),
    });
  },
};

export function membershipToCompanyInfo(m: CompanyMembership): CompanyInfo {
  return {
    id: m.id,
    code: m.code,
    name: m.name,
    currency: "IDR",
  };
}
