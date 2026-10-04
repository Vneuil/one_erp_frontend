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

export interface DepreciationReportLine {
  assetId: string;
  assetCode: string;
  name: string;
  category: string;
  purchaseDate: string;
  status: string;
  cost: number;
  usefulLifeYears: number;
  monthlyDepreciation: number;
  postedInPeriod: number;
  accumulatedPosted: number;
  bookValue: number;
  unpostedMonths: number;
}

export interface DepreciationReport {
  period: string;
  lines: DepreciationReportLine[];
  totalCost: number;
  totalPostedInPeriod: number;
  totalAccumulated: number;
  totalBookValue: number;
}

export interface DepreciationPostResult {
  period: string;
  postedCount: number;
  totalAmount: number;
  alreadyPosted: number;
  items: { assetId: string; assetCode: string; name: string; period: string; amount: number }[];
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
  depreciationReport: async (period?: string): Promise<ApiResponse<DepreciationReport>> => {
    return apiClient<DepreciationReport>("/assets/depreciation/report", { params: { period } });
  },
  postDepreciation: async (period: string, catchUp: boolean): Promise<ApiResponse<DepreciationPostResult>> => {
    return apiClient<DepreciationPostResult>("/assets/depreciation/post", { method: "POST", body: JSON.stringify({ period, catchUp }) });
  },
};
