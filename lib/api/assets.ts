import { apiClient, ApiResponse } from "./client";

export interface AssetItem {
  id: string;
  companyId?: string | null;
  assetCode: string;
  name: string;
  category: string;
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  usefulLifeYears: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  status: string;
  createdAt?: string;
}

export interface CreateAssetInput {
  assetCode?: string;
  name: string;
  category: string;
  location?: string;
  purchaseDate?: string;
  purchasePrice: number;
  usefulLifeYears: number;
  companyId?: string | null;
}

export interface UpdateAssetInput {
  name?: string;
  category?: string;
  location?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  usefulLifeYears?: number;
}

export const assetsApi = {
  listAssets: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<AssetItem[]>> => {
    return apiClient<AssetItem[]>("/assets", { params });
  },
  getAsset: async (id: string): Promise<ApiResponse<AssetItem>> => {
    return apiClient<AssetItem>(`/assets/${id}`);
  },
  createAsset: async (data: CreateAssetInput): Promise<ApiResponse<AssetItem>> => {
    return apiClient<AssetItem>("/assets", { method: "POST", body: JSON.stringify(data) });
  },
  updateAsset: async (id: string, data: UpdateAssetInput): Promise<ApiResponse<AssetItem>> => {
    return apiClient<AssetItem>(`/assets/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  updateAssetStatus: async (id: string, status: string): Promise<ApiResponse<AssetItem>> => {
    return apiClient<AssetItem>(`/assets/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
  },
  recalculateDepreciation: async (id: string): Promise<ApiResponse<AssetItem>> => {
    return apiClient<AssetItem>(`/assets/${id}/recalculate-depreciation`, { method: "POST" });
  },
  recalculateAllDepreciation: async (): Promise<ApiResponse<AssetItem[]>> => {
    return apiClient<AssetItem[]>("/assets/recalculate-all", { method: "POST" });
  },
};
