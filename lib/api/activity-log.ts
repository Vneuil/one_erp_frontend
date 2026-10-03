import { apiClient, ApiResponse } from "./client";

export interface ActivityLogItem {
  id: string;
  userEmail: string;
  method: string;
  path: string;
  module: string;
  statusCode: number;
  ipAddress?: string;
  createdAt: string;
}

export const activityLogApi = {
  list: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<ActivityLogItem[]>> => {
    return apiClient<ActivityLogItem[]>("/activity-logs", { params });
  },
};
