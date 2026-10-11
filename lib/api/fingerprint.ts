import { apiClient, ApiResponse } from "./client";

export type FingerprintProtocol = "adms" | "generic";

export interface FingerprintDevice {
  id: string;
  serial: string;
  name: string;
  location: string;
  vendor: string;
  protocol: FingerprintProtocol;
  active: boolean;
  allowedIp: string;
  lastSeenAt?: string;
  lastPunchAt?: string;
  lastIp?: string;
}

export interface RegisteredDevice {
  device: FingerprintDevice;
  /** Shown once, only when a machine is registered or its token is rotated. */
  token?: string;
}

export interface FingerprintPinMap {
  id: string;
  pin: string;
  nip: string;
  employeeName: string;
}

export interface FingerprintPunch {
  id: string;
  deviceSerial: string;
  pin: string;
  punchedAt: string;
  date: string;
  nip: string;
  employeeName: string;
  resolved: boolean;
}

export interface IngestResult {
  received: number;
  stored: number;
  duplicates: number;
  unresolved: number;
  daysSynced: number;
}

export interface DeviceInput {
  serial?: string;
  name: string;
  location?: string;
  vendor?: string;
  protocol?: FingerprintProtocol;
  allowedIp?: string;
  active?: boolean;
}

export const fingerprintApi = {
  listDevices: async (): Promise<ApiResponse<FingerprintDevice[]>> => apiClient<FingerprintDevice[]>("/fingerprint/devices"),
  registerDevice: async (data: DeviceInput): Promise<ApiResponse<RegisteredDevice>> =>
    apiClient<RegisteredDevice>("/fingerprint/devices", { method: "POST", body: JSON.stringify(data) }),
  updateDevice: async (serial: string, data: DeviceInput): Promise<ApiResponse<FingerprintDevice>> =>
    apiClient<FingerprintDevice>(`/fingerprint/devices/${encodeURIComponent(serial)}`, { method: "PUT", body: JSON.stringify(data) }),
  rotateToken: async (serial: string): Promise<ApiResponse<RegisteredDevice>> =>
    apiClient<RegisteredDevice>(`/fingerprint/devices/${encodeURIComponent(serial)}/rotate-token`, { method: "POST" }),
  deleteDevice: async (serial: string): Promise<ApiResponse<null>> =>
    apiClient<null>(`/fingerprint/devices/${encodeURIComponent(serial)}`, { method: "DELETE" }),

  listPinMaps: async (): Promise<ApiResponse<FingerprintPinMap[]>> => apiClient<FingerprintPinMap[]>("/fingerprint/pin-maps"),
  mapPin: async (pin: string, nip: string): Promise<ApiResponse<{ mapping: FingerprintPinMap; reprocessed: IngestResult }>> =>
    apiClient("/fingerprint/pin-maps", { method: "POST", body: JSON.stringify({ pin, nip }) }),
  deletePinMap: async (id: string): Promise<ApiResponse<null>> => apiClient<null>(`/fingerprint/pin-maps/${id}`, { method: "DELETE" }),

  listPunches: async (params?: { unresolved?: boolean; from?: string; to?: string }): Promise<ApiResponse<FingerprintPunch[]>> =>
    apiClient<FingerprintPunch[]>("/fingerprint/punches", { params: { unresolved: params?.unresolved ? "true" : undefined, from: params?.from, to: params?.to } }),
  importPunches: async (rows: { pin: string; time: string }[], label?: string): Promise<ApiResponse<{ result: IngestResult; problems: string[] }>> =>
    apiClient("/fingerprint/import", { method: "POST", body: JSON.stringify({ rows, label }) }),
  reprocess: async (): Promise<ApiResponse<IngestResult>> => apiClient<IngestResult>("/fingerprint/reprocess", { method: "POST" }),
};
