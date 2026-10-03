import { apiClient, ApiResponse } from "./client";

// BOM

export interface BOMLineInput {
  componentProductId: string;
  quantityRequired: number;
  unit?: string;
}

export interface CreateBOMInput {
  productId: string;
  name: string;
  version?: string;
  isActive?: boolean;
  lines: BOMLineInput[];
}

export interface BOMLineItem {
  id: string;
  componentProductId: string;
  componentSku: string;
  componentName: string;
  quantityRequired: number;
  unit: string;
}

export interface BOMItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  name: string;
  version: string;
  isActive: boolean;
  lines: BOMLineItem[];
  createdAt?: string;
}

// Production orders

export interface CreateProductionOrderInput {
  bomId: string;
  quantityToProduce: number;
  warehouseId: string;
  plannedDate?: string;
}

export interface ProductionOrderItem {
  id: string;
  bomId: string;
  bomName: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantityToProduce: number;
  quantityCompleted: number;
  remainingQuantity: number;
  status: "planned" | "released" | "in_progress" | "paused" | "completed" | "cancelled";
  plannedDate: string;
  actualCompletionDate: string;
  createdAt?: string;
}

export interface CompleteBatchInput {
  quantityCompleted: number;
  completionDate?: string;
  notes?: string;
}

export interface ManufacturingDashboardSummary {
  activeBoms: number;
  ordersByStatus: Record<string, number>;
  unitsCompletedThisMonth: number;
  upcomingOrders: ProductionOrderItem[];
}

export const manufacturingApi = {
  getDashboardSummary: async (): Promise<ApiResponse<ManufacturingDashboardSummary>> => {
    return apiClient<ManufacturingDashboardSummary>("/manufacturing/dashboard");
  },

  // BOM
  listBOMs: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<BOMItem[]>> => {
    return apiClient<BOMItem[]>("/manufacturing/bom", { params });
  },
  getBOM: async (id: string): Promise<ApiResponse<BOMItem>> => {
    return apiClient<BOMItem>(`/manufacturing/bom/${id}`);
  },
  createBOM: async (data: CreateBOMInput): Promise<ApiResponse<BOMItem>> => {
    return apiClient<BOMItem>("/manufacturing/bom", { method: "POST", body: JSON.stringify(data) });
  },

  // Production orders
  listProductionOrders: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<ProductionOrderItem[]>> => {
    return apiClient<ProductionOrderItem[]>("/manufacturing/production-orders", { params });
  },
  getProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}`);
  },
  createProductionOrder: async (data: CreateProductionOrderInput): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>("/manufacturing/production-orders", { method: "POST", body: JSON.stringify(data) });
  },
  releaseProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}/release`, { method: "POST" });
  },
  pauseProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}/pause`, { method: "POST" });
  },
  resumeProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}/resume`, { method: "POST" });
  },
  cancelProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}/cancel`, { method: "POST" });
  },
  completeBatch: async (id: string, data: CompleteBatchInput): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}/complete-batch`, { method: "POST", body: JSON.stringify(data) });
  },
};
