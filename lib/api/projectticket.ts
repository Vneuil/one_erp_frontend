import { apiClient, ApiResponse } from "./client";

export interface ProjectTicketItem {
  id: string;
  ticketNo: string;
  projectCode: string;
  subject: string;
  customerName: string;
  category: string;
  priority: string;
  slaTargetHours: number;
  status: string;
  assignedTo: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProjectTicketInput {
  projectCode: string;
  subject: string;
  customerName: string;
  category?: string;
  priority?: string;
  slaTargetHours?: number;
  assignedTo?: string;
}

export const projectTicketApi = {
  list: async (params?: { page?: number; perPage?: number; status?: string }): Promise<ApiResponse<ProjectTicketItem[]>> => {
    return apiClient<ProjectTicketItem[]>("/project-tickets", { params });
  },

  getById: async (id: string): Promise<ApiResponse<ProjectTicketItem>> => {
    return apiClient<ProjectTicketItem>(`/project-tickets/${id}`);
  },

  create: async (data: CreateProjectTicketInput): Promise<ApiResponse<ProjectTicketItem>> => {
    return apiClient<ProjectTicketItem>("/project-tickets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (id: string, status: string): Promise<ApiResponse<ProjectTicketItem>> => {
    return apiClient<ProjectTicketItem>(`/project-tickets/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
};
