import { apiClient, ApiResponse } from "./client";

// BOM

export interface BOMLineInput {
  componentProductId: string;
  quantityRequired: number;
  unit?: string;
}

export interface BOMProcessInput {
  name: string;
  standardMinutes?: number;
  notes?: string;
}

export interface BOMProcessItem {
  id: string;
  sequence: number;
  name: string;
  standardMinutes: number;
  notes?: string;
}

export interface CreateBOMInput {
  productId: string;
  name: string;
  version?: string;
  isActive?: boolean;
  lines: BOMLineInput[];
  /** Routing: the production steps every unit goes through, in order. */
  processes?: BOMProcessInput[];
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
  processes: BOMProcessItem[];
  createdAt?: string;
}

// Production orders

export interface CreateProductionOrderInput {
  bomId: string;
  quantityToProduce: number;
  warehouseId: string;
  plannedDate?: string;
  /** "backflush" (default): materials are consumed when a batch is completed. "issued": materials are issued to the order beforehand (Transaksi Stock). */
  materialMode?: "backflush" | "issued";
}

export interface ProductionStepItem {
  id: string;
  sequence: number;
  name: string;
  standardMinutes: number;
  quantityDone: number;
  /** Units that reached this step but have not finished it. */
  waitingQuantity: number;
  status: "pending" | "in_progress" | "done";
  startedDate?: string;
  completedDate?: string;
}

export interface LogStepInput {
  quantity: number;
  date?: string;
  notes?: string;
}

export interface ProductionOrderItem {
  id: string;
  orderNumber: string;
  materialMode: "backflush" | "issued";
  steps: ProductionStepItem[];
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

// Reports

export interface DailyReportDay {
  date: string;
  plannedOrders: { orderId: string; orderNumber: string; product: string; quantityToProduce: number; quantityCompleted: number; status: string }[];
  stepOutputs: { orderId: string; orderNumber: string; product: string; step?: string; quantity: number; notes?: string }[];
  completions: { orderId: string; orderNumber: string; product: string; quantity: number; notes?: string }[];
  plannedUnits: number;
  stepUnits: number;
  unitsCompleted: number;
}

export interface DailyProductionReport {
  from: string;
  to: string;
  days: DailyReportDay[];
  plannedUnits: number;
  stepUnits: number;
  unitsCompleted: number;
}

export interface OrderSummaryReport {
  from: string;
  to: string;
  orders: {
    orderId: string;
    orderNumber: string;
    product: string;
    status: string;
    plannedDate: string;
    quantityToProduce: number;
    quantityCompleted: number;
    progressPct: number;
    actualCompletionDate?: string;
    lateDays: number;
  }[];
  byStatus: Record<string, number>;
  byProduct: { product: string; sku: string; orders: number; planned: number; completed: number; completionPct: number }[];
  plannedUnits: number;
  completedUnits: number;
  completionPct: number;
  onTimeOrders: number;
  completedOrders: number;
  onTimePct: number;
}

export interface ProcessSummaryReport {
  from: string;
  to: string;
  rows: { process: string; units: number; orders: number; activeDays: number; avgUnitsPerDay: number; standardMinutes: number; waitingUnits: number }[];
  note: string;
}

export interface WIPReport {
  orders: {
    orderId: string;
    orderNumber: string;
    product: string;
    status: string;
    materialMode: string;
    quantityToProduce: number;
    quantityCompleted: number;
    steps: { name: string; done: number; waiting: number }[];
    unitsInWip: number;
    materialCostPerUnit: number;
    issuedValue: number;
    wipValue: number;
  }[];
  totalUnitsInWip: number;
  totalWipValue: number;
  ledgerBalance?: number;
  note: string;
}

export const manufacturingApi = {
  logStep: async (orderId: string, stepId: string, data: LogStepInput): Promise<ApiResponse<ProductionOrderItem>> =>
    apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${orderId}/steps/${stepId}/log`, { method: "POST", body: JSON.stringify(data) }),
  dailyReport: async (p?: { from?: string; to?: string }): Promise<ApiResponse<DailyProductionReport>> =>
    apiClient<DailyProductionReport>("/manufacturing/reports/daily", { params: p }),
  orderSummary: async (p?: { from?: string; to?: string }): Promise<ApiResponse<OrderSummaryReport>> =>
    apiClient<OrderSummaryReport>("/manufacturing/reports/order-summary", { params: p }),
  processSummary: async (p?: { from?: string; to?: string }): Promise<ApiResponse<ProcessSummaryReport>> =>
    apiClient<ProcessSummaryReport>("/manufacturing/reports/process-summary", { params: p }),
  wipReport: async (): Promise<ApiResponse<WIPReport>> => apiClient<WIPReport>("/manufacturing/reports/wip"),

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
