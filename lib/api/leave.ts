import { apiClient, ApiResponse } from "./client";

export interface LeaveRequestItem {
  id: string;
  companyId?: string | null;
  employeeId: string;
  employeeName: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  approvedBy: string;
  createdAt?: string;
}

export interface CreateLeaveRequestInput {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays?: number;
  reason?: string;
}

export interface ApproveRejectLeaveInput {
  approvedBy: string;
}

export const leaveApi = {
  listLeaves: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<LeaveRequestItem[]>> => {
    return apiClient<LeaveRequestItem[]>("/leaves", { params });
  },
  createLeave: async (data: CreateLeaveRequestInput): Promise<ApiResponse<LeaveRequestItem>> => {
    return apiClient<LeaveRequestItem>("/leaves", { method: "POST", body: JSON.stringify(data) });
  },
  approveLeave: async (id: string, data: ApproveRejectLeaveInput): Promise<ApiResponse<LeaveRequestItem>> => {
    return apiClient<LeaveRequestItem>(`/leaves/${id}/approve`, { method: "POST", body: JSON.stringify(data) });
  },
  rejectLeave: async (id: string, data: ApproveRejectLeaveInput): Promise<ApiResponse<LeaveRequestItem>> => {
    return apiClient<LeaveRequestItem>(`/leaves/${id}/reject`, { method: "POST", body: JSON.stringify(data) });
  },
};
