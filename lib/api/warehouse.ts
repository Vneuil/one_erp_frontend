import { apiClient, ApiResponse } from "./client";

// Pick waves

export interface PickWaveLineInput {
  productId: string;
  quantityToPick: number;
}

export interface CreatePickWaveInput {
  warehouseId: string;
  salesOrderId?: string;
  assignedTo?: string;
  lines?: PickWaveLineInput[];
}

export interface PickLineInput {
  productId: string;
  quantityPicked: number;
}

export interface RecordPickInput {
  lines: PickLineInput[];
}

export interface PickWaveLineItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  quantityToPick: number;
  quantityPicked: number;
}

export interface PickWaveItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  salesOrderId?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assignedTo: string;
  lines: PickWaveLineItem[];
  createdAt?: string;
}

// Packing sessions

export interface CreatePackingSessionInput {
  pickWaveId: string;
  notes?: string;
}

export interface CompletePackingSessionInput {
  packageCount?: number;
  notes?: string;
}

export interface PackingSessionItem {
  id: string;
  pickWaveId: string;
  status: "open" | "packing" | "completed";
  packageCount: number;
  notes: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

// Shipments

export interface CreateShipmentInput {
  pickWaveId: string;
  packingSessionId?: string;
  carrier?: string;
  trackingNumber?: string;
  destinationAddress?: string;
}

export interface ShipmentItem {
  id: string;
  pickWaveId: string;
  packingSessionId?: string;
  carrier: string;
  trackingNumber: string;
  status: "booked" | "dispatched" | "delivered" | "cancelled";
  destinationAddress: string;
  dispatchedAt?: string;
  createdAt?: string;
}

export const warehouseApi = {
  // Pick waves
  listPickWaves: async (params?: { page?: number; perPage?: number }): Promise<ApiResponse<PickWaveItem[]>> => {
    return apiClient<PickWaveItem[]>("/warehouse/pick-waves", { params });
  },
  getPickWave: async (id: string): Promise<ApiResponse<PickWaveItem>> => {
    return apiClient<PickWaveItem>(`/warehouse/pick-waves/${id}`);
  },
  createPickWave: async (data: CreatePickWaveInput): Promise<ApiResponse<PickWaveItem>> => {
    return apiClient<PickWaveItem>("/warehouse/pick-waves", { method: "POST", body: JSON.stringify(data) });
  },
  recordPick: async (id: string, data: RecordPickInput): Promise<ApiResponse<PickWaveItem>> => {
    return apiClient<PickWaveItem>(`/warehouse/pick-waves/${id}/pick`, { method: "POST", body: JSON.stringify(data) });
  },
  completePickWave: async (id: string): Promise<ApiResponse<PickWaveItem>> => {
    return apiClient<PickWaveItem>(`/warehouse/pick-waves/${id}/complete`, { method: "POST" });
  },
  cancelPickWave: async (id: string): Promise<ApiResponse<PickWaveItem>> => {
    return apiClient<PickWaveItem>(`/warehouse/pick-waves/${id}/cancel`, { method: "POST" });
  },

  // Packing sessions
  listPackingSessions: async (params?: { page?: number; perPage?: number }): Promise<ApiResponse<PackingSessionItem[]>> => {
    return apiClient<PackingSessionItem[]>("/warehouse/packing-sessions", { params });
  },
  createPackingSession: async (data: CreatePackingSessionInput): Promise<ApiResponse<PackingSessionItem>> => {
    return apiClient<PackingSessionItem>("/warehouse/packing-sessions", { method: "POST", body: JSON.stringify(data) });
  },
  completePackingSession: async (id: string, data: CompletePackingSessionInput): Promise<ApiResponse<PackingSessionItem>> => {
    return apiClient<PackingSessionItem>(`/warehouse/packing-sessions/${id}/complete`, { method: "POST", body: JSON.stringify(data) });
  },

  // Shipments
  listShipments: async (params?: { page?: number; perPage?: number }): Promise<ApiResponse<ShipmentItem[]>> => {
    return apiClient<ShipmentItem[]>("/warehouse/shipments", { params });
  },
  createShipment: async (data: CreateShipmentInput): Promise<ApiResponse<ShipmentItem>> => {
    return apiClient<ShipmentItem>("/warehouse/shipments", { method: "POST", body: JSON.stringify(data) });
  },
  dispatchShipment: async (id: string): Promise<ApiResponse<ShipmentItem>> => {
    return apiClient<ShipmentItem>(`/warehouse/shipments/${id}/dispatch`, { method: "POST" });
  },
};
