import { apiClient, ApiResponse } from "./client";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "staff";
  roleId?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "staff";
}

export const usersApi = {
  list: async (params?: { page?: number; perPage?: number }): Promise<ApiResponse<UserItem[]>> => {
    return apiClient<UserItem[]>("/users", { params });
  },
  create: async (data: CreateUserInput): Promise<ApiResponse<UserItem>> => {
    return apiClient<UserItem>("/users", { method: "POST", body: JSON.stringify(data) });
  },
  assignRole: async (id: string, roleId: string | null): Promise<ApiResponse<UserItem>> => {
    return apiClient<UserItem>(`/users/${id}/role`, { method: "PUT", body: JSON.stringify({ roleId }) });
  },
};
