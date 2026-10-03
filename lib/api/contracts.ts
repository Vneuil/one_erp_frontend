import { apiClient, ApiResponse } from "./client";

export interface ContractItem {
  id: string;
  companyId?: string | null;
  contractNumber: string;
  partyType: string;
  partyId?: string | null;
  partyName: string;
  title: string;
  description: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  status: string;
  paymentTerms: string;
  attachments: string;
  renewedFromId?: string | null;
  needsAttention: boolean;
  createdAt?: string;
}

export interface CreateContractInput {
  contractNumber?: string;
  partyType: string;
  partyId?: string | null;
  partyName: string;
  title: string;
  description?: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  paymentTerms?: string;
  attachments?: string;
  companyId?: string | null;
}

export interface UpdateContractInput {
  partyType?: string;
  partyId?: string | null;
  partyName?: string;
  title?: string;
  description?: string;
  contractValue?: number;
  startDate?: string;
  endDate?: string;
  paymentTerms?: string;
  attachments?: string;
}

export const contractsApi = {
  listContracts: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<ContractItem[]>> => {
    return apiClient<ContractItem[]>("/contracts", { params });
  },
  getContract: async (id: string): Promise<ApiResponse<ContractItem>> => {
    return apiClient<ContractItem>(`/contracts/${id}`);
  },
  createContract: async (data: CreateContractInput): Promise<ApiResponse<ContractItem>> => {
    return apiClient<ContractItem>("/contracts", { method: "POST", body: JSON.stringify(data) });
  },
  updateContract: async (id: string, data: UpdateContractInput): Promise<ApiResponse<ContractItem>> => {
    return apiClient<ContractItem>(`/contracts/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  updateContractStatus: async (id: string, status: string): Promise<ApiResponse<ContractItem>> => {
    return apiClient<ContractItem>(`/contracts/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
  },
  renewContract: async (id: string): Promise<ApiResponse<ContractItem>> => {
    return apiClient<ContractItem>(`/contracts/${id}/renew`, { method: "POST" });
  },
  listExpiringSoon: async (): Promise<ApiResponse<ContractItem[]>> => {
    return apiClient<ContractItem[]>("/contracts/expiring-soon");
  },
};
