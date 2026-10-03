import { apiClient, ApiResponse } from "./client";

export interface SystemLogEntry {
  id: string;
  time: string;
  status: number;
  method: string;
  path: string;
  message: string;
  requestId?: string;
  userEmail?: string;
}

interface SystemLogsResponse {
  entries: SystemLogEntry[];
  count: number;
}

export const systemLogsApi = {
  // Admin-only: the caller's own company's most recent captured server
  // errors (500s and panics), newest first. See internal/foundation/logstore
  // on the backend for how these are captured and tenant-scoped.
  list: async (params?: { limit?: number }): Promise<ApiResponse<SystemLogsResponse>> => {
    return apiClient<SystemLogsResponse>("/system-logs", { params });
  },
};
