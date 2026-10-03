import { apiClient, ApiResponse } from "./client";

// Warehouses

export interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  address: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateWarehouseInput {
  code: string;
  name: string;
  address?: string;
  isActive?: boolean;
}

// Stock levels

export interface StockLevelItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reserved: number;
  available: number;
  minStock: number;
  maxStock: number;
  bufferStatus?: string;
  updatedAt?: string;
}

export interface AdjustStockInput {
  productId: string;
  warehouseId: string;
  quantity: number;
  reason?: string;
  reference?: string;
  createdBy?: string;
}

export interface SetBufferStockInput {
  productId: string;
  warehouseId: string;
  minStock: number;
  maxStock: number;
}

// Movements

export interface MovementItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  type: "in" | "out" | "adjustment" | "transfer_in" | "transfer_out";
  quantity: number;
  balance: number;
  reference: string;
  reason: string;
  createdBy: string;
  createdAt?: string;
}

// Transfers

export interface CreateTransferInput {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  requestedBy?: string;
  notes?: string;
}

export interface TransferItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  quantity: number;
  status: "pending" | "in_transit" | "completed" | "cancelled";
  requestedBy: string;
  notes: string;
  createdAt?: string;
}

// Stock opname

export interface CreateOpnameInput {
  warehouseId: string;
  auditDate?: string;
  productIds?: string[];
}

export interface CountOpnameLineInput {
  productId: string;
  countedQty: number;
}

export interface OpnameLineItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  counted: boolean;
}

export interface OpnameItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  auditDate: string;
  status: "draft" | "in_progress" | "completed";
  lines: OpnameLineItem[];
  createdAt?: string;
}

export interface StockBatchItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  batchNo: string;
  expiryDate?: string;
  receivedAt: string;
  initialQty: number;
  quantity: number;
  status: "expired" | "expiring_soon" | "ok" | "no_expiry";
  daysToExpiry?: number;
}

export const inventoryApi = {
  listBatches: async (params?: { productId?: string; warehouseId?: string; all?: boolean }): Promise<ApiResponse<StockBatchItem[]>> =>
    apiClient<StockBatchItem[]>("/inventory/batches", { params: { productId: params?.productId, warehouseId: params?.warehouseId, all: params?.all ? "true" : undefined } }),
  expiringBatches: async (days = 30): Promise<ApiResponse<StockBatchItem[]>> => apiClient<StockBatchItem[]>("/inventory/batches/expiring", { params: { days } }),
  receiveBatch: async (data: { productId: string; warehouseId: string; batchNo: string; expiryDate?: string; quantity: number; reference?: string }): Promise<ApiResponse<StockBatchItem>> =>
    apiClient<StockBatchItem>("/inventory/batches/receive", { method: "POST", body: JSON.stringify(data) }),
  writeOffBatch: async (id: string, reason: string): Promise<ApiResponse<StockBatchItem>> =>
    apiClient<StockBatchItem>(`/inventory/batches/${id}/write-off`, { method: "POST", body: JSON.stringify({ reason }) }),

  // Warehouses
  listWarehouses: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<WarehouseItem[]>> => {
    return apiClient<WarehouseItem[]>("/inventory/warehouses", { params });
  },
  createWarehouse: async (data: CreateWarehouseInput): Promise<ApiResponse<WarehouseItem>> => {
    return apiClient<WarehouseItem>("/inventory/warehouses", { method: "POST", body: JSON.stringify(data) });
  },
  updateWarehouse: async (id: string, data: Partial<CreateWarehouseInput>): Promise<ApiResponse<WarehouseItem>> => {
    return apiClient<WarehouseItem>(`/inventory/warehouses/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  deleteWarehouse: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/inventory/warehouses/${id}`, { method: "DELETE" });
  },

  // Stock levels
  listStockLevels: async (params?: { page?: number; perPage?: number }): Promise<ApiResponse<StockLevelItem[]>> => {
    return apiClient<StockLevelItem[]>("/inventory/stock-levels", { params });
  },
  adjustStock: async (data: AdjustStockInput): Promise<ApiResponse<StockLevelItem>> => {
    return apiClient<StockLevelItem>("/inventory/stock-levels/adjust", { method: "POST", body: JSON.stringify(data) });
  },

  setBufferStock: async (data: SetBufferStockInput): Promise<ApiResponse<StockLevelItem>> => {
    return apiClient<StockLevelItem>("/inventory/stock-levels/buffer", { method: "POST", body: JSON.stringify(data) });
  },

  // Movements
  listMovements: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<MovementItem[]>> => {
    return apiClient<MovementItem[]>("/inventory/movements", { params });
  },

  movementSummary: async (params: { from: string; to: string; warehouseId?: string }): Promise<ApiResponse<MovementSummary>> => {
    return apiClient<MovementSummary>("/inventory/movements/summary", { params });
  },

  // Transfers
  listTransfers: async (params?: { page?: number; perPage?: number }): Promise<ApiResponse<TransferItem[]>> => {
    return apiClient<TransferItem[]>("/inventory/transfers", { params });
  },
  createTransfer: async (data: CreateTransferInput): Promise<ApiResponse<TransferItem>> => {
    return apiClient<TransferItem>("/inventory/transfers", { method: "POST", body: JSON.stringify(data) });
  },
  completeTransfer: async (id: string): Promise<ApiResponse<TransferItem>> => {
    return apiClient<TransferItem>(`/inventory/transfers/${id}/complete`, { method: "POST" });
  },
  cancelTransfer: async (id: string): Promise<ApiResponse<TransferItem>> => {
    return apiClient<TransferItem>(`/inventory/transfers/${id}/cancel`, { method: "POST" });
  },

  // Stock opname
  listOpnames: async (params?: { page?: number; perPage?: number }): Promise<ApiResponse<OpnameItem[]>> => {
    return apiClient<OpnameItem[]>("/inventory/opname", { params });
  },
  getOpname: async (id: string): Promise<ApiResponse<OpnameItem>> => {
    return apiClient<OpnameItem>(`/inventory/opname/${id}`);
  },
  createOpname: async (data: CreateOpnameInput): Promise<ApiResponse<OpnameItem>> => {
    return apiClient<OpnameItem>("/inventory/opname", { method: "POST", body: JSON.stringify(data) });
  },
  countOpnameLine: async (id: string, data: CountOpnameLineInput): Promise<ApiResponse<OpnameItem>> => {
    return apiClient<OpnameItem>(`/inventory/opname/${id}/count`, { method: "POST", body: JSON.stringify(data) });
  },
  finalizeOpname: async (id: string): Promise<ApiResponse<OpnameItem>> => {
    return apiClient<OpnameItem>(`/inventory/opname/${id}/finalize`, { method: "POST" });
  },
};

export interface MovementSummaryRow {
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  opening: number;
  received: number;
  issued: number;
  adjustments: number;
  closing: number;
}

export interface MovementSummary {
  from: string;
  to: string;
  rows: MovementSummaryRow[];
  totalReceived: number;
  totalIssued: number;
}
