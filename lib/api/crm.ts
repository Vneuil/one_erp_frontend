import { apiClient, ApiResponse } from "./client";

export interface LeadItem {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  segment: string;
  source: string;
  estimatedValue: number;
  status: string;
  pic: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeadInput {
  name: string;
  company: string;
  email?: string;
  phone?: string;
  segment?: string;
  source?: string;
  estimatedValue: number;
  status?: string;
  pic?: string;
}

export const crmApi = {
  listLeads: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<LeadItem[]>> => {
    return apiClient<LeadItem[]>("/crm/leads", { params });
  },

  createLead: async (data: CreateLeadInput): Promise<ApiResponse<LeadItem>> => {
    return apiClient<LeadItem>("/crm/leads", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateLeadStatus: async (id: string, status: string): Promise<ApiResponse<LeadItem>> => {
    return apiClient<LeadItem>(`/crm/leads/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  deleteLead: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/crm/leads/${id}`, {
      method: "DELETE",
    });
  },

  listDeals: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<DealItem[]>> => {
    return apiClient<DealItem[]>("/crm/deals", { params });
  },

  createDeal: async (data: CreateDealInput): Promise<ApiResponse<DealItem>> => {
    return apiClient<DealItem>("/crm/deals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateDealStage: async (id: string, stage: string, lostReason?: string): Promise<ApiResponse<DealItem>> => {
    return apiClient<DealItem>(`/crm/deals/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage, lostReason }),
    });
  },
};

export interface DealItem {
  id: string;
  title: string;
  customer: string;
  value: number;
  probability: number;
  stage: string;
  pic: string;
  expectedClosing: string;
  lostReason?: string;
  leadId?: string | null;
  projectId?: string | null;
  closedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDealInput {
  title: string;
  customer: string;
  value: number;
  stage?: string;
  pic?: string;
  expectedClosing?: string;
}
