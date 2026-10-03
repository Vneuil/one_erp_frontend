import { apiClient, ApiResponse } from "./client";

export interface LoyaltyConfig {
  rupiahPerPoint: number;
}

export interface LoyaltyMember {
  id: string;
  memberCode: string;
  phoneNumber: string;
  name: string;
  pointsBalance: number;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  type: "earn" | "adjust" | "redeem";
  points: number;
  balanceAfter: number;
  description?: string;
  salesOrderNumber?: string;
  createdAt: string;
}

export interface MemberCard {
  member: LoyaltyMember;
  transactions: LoyaltyTransaction[];
}

export const loyaltyApi = {
  getConfig: async (): Promise<ApiResponse<LoyaltyConfig>> => {
    return apiClient<LoyaltyConfig>("/loyalty/config");
  },

  updateConfig: async (rupiahPerPoint: number): Promise<ApiResponse<LoyaltyConfig>> => {
    return apiClient<LoyaltyConfig>("/loyalty/config", {
      method: "PUT",
      body: JSON.stringify({ rupiahPerPoint }),
    });
  },

  lookupMember: async (phone: string): Promise<ApiResponse<MemberCard>> => {
    return apiClient<MemberCard>("/loyalty/members/lookup", {
      params: { phone },
    });
  },

  enrollMember: async (data: { phoneNumber: string; name?: string }): Promise<ApiResponse<LoyaltyMember>> => {
    return apiClient<LoyaltyMember>("/loyalty/members", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listMembers: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<LoyaltyMember[]>> => {
    return apiClient<LoyaltyMember[]>("/loyalty/members", { params });
  },
};
