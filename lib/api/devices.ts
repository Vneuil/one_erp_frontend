import { apiClient, ApiResponse } from "./client";

export interface DeviceItem {
  id: string;
  companyId?: string | null;
  deviceSerial: string;
  name: string;
  deviceType: string;
  location: string;
  ipAddress: string;
  lastHeartbeat?: string | null;
  status: string;
  createdAt?: string;
}

export interface CreateDeviceInput {
  deviceSerial: string;
  name: string;
  deviceType?: string;
  location?: string;
  ipAddress?: string;
  companyId?: string | null;
}

export interface UpdateDeviceInput {
  name?: string;
  deviceType?: string;
  location?: string;
  ipAddress?: string;
  status?: string;
}

export const devicesApi = {
  listDevices: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<DeviceItem[]>> => {
    return apiClient<DeviceItem[]>("/devices", { params });
  },
  getDevice: async (id: string): Promise<ApiResponse<DeviceItem>> => {
    return apiClient<DeviceItem>(`/devices/${id}`);
  },
  createDevice: async (data: CreateDeviceInput): Promise<ApiResponse<DeviceItem>> => {
    return apiClient<DeviceItem>("/devices", { method: "POST", body: JSON.stringify(data) });
  },
  updateDevice: async (id: string, data: UpdateDeviceInput): Promise<ApiResponse<DeviceItem>> => {
    return apiClient<DeviceItem>(`/devices/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  pingDevice: async (id: string): Promise<ApiResponse<DeviceItem>> => {
    return apiClient<DeviceItem>(`/devices/${id}/ping`, { method: "POST" });
  },
};
