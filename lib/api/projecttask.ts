import { apiClient, ApiResponse } from "./client";

export interface ChecklistItem {
  id: string;
  taskId: string;
  text: string;
  done: boolean;
  createdAt?: string;
}

export interface ProjectTaskItem {
  id: string;
  projectCode: string;
  title: string;
  assignee: string;
  priority: string;
  status: string;
  dueDate: string;
  checklist?: ChecklistItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProjectTaskInput {
  projectCode: string;
  title: string;
  assignee?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  checklist?: { text: string }[];
}

export const projectTaskApi = {
  list: async (params?: { page?: number; perPage?: number; projectCode?: string; status?: string }): Promise<ApiResponse<ProjectTaskItem[]>> => {
    return apiClient<ProjectTaskItem[]>("/project-tasks", { params });
  },

  getById: async (id: string): Promise<ApiResponse<ProjectTaskItem>> => {
    return apiClient<ProjectTaskItem>(`/project-tasks/${id}`);
  },

  create: async (data: CreateProjectTaskInput): Promise<ApiResponse<ProjectTaskItem>> => {
    return apiClient<ProjectTaskItem>("/project-tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (id: string, status: string): Promise<ApiResponse<ProjectTaskItem>> => {
    return apiClient<ProjectTaskItem>(`/project-tasks/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  addChecklistItem: async (id: string, text: string): Promise<ApiResponse<ChecklistItem>> => {
    return apiClient<ChecklistItem>(`/project-tasks/${id}/checklist`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  toggleChecklistItem: async (itemId: string): Promise<ApiResponse<ChecklistItem>> => {
    return apiClient<ChecklistItem>(`/project-tasks/checklist/${itemId}/toggle`, {
      method: "PUT",
    });
  },
};
