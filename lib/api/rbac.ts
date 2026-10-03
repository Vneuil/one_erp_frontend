import { apiClient, ApiResponse } from "./client";

export interface RoleItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
}

export interface PermissionItem {
  module: string;
  canView: boolean;
  canManage: boolean;
  /** Allows approving/rejecting/paying/posting documents in this module (implies canManage). */
  canApprove?: boolean;
}

export interface RoleWithPermissions {
  role: RoleItem;
  permissions: PermissionItem[];
}

export const rbacApi = {
  listRoles: async (): Promise<ApiResponse<RoleItem[]>> => apiClient<RoleItem[]>("/rbac/roles"),

  createRole: async (name: string, description: string): Promise<ApiResponse<RoleItem>> =>
    apiClient<RoleItem>("/rbac/roles", { method: "POST", body: JSON.stringify({ name, description }) }),

  deleteRole: async (id: string): Promise<ApiResponse<null>> =>
    apiClient<null>(`/rbac/roles/${id}`, { method: "DELETE" }),

  getRolePermissions: async (id: string): Promise<ApiResponse<RoleWithPermissions>> =>
    apiClient<RoleWithPermissions>(`/rbac/roles/${id}/permissions`),

  setRolePermissions: async (id: string, permissions: PermissionItem[]): Promise<ApiResponse<PermissionItem[]>> =>
    apiClient<PermissionItem[]>(`/rbac/roles/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    }),

  listModules: async (): Promise<ApiResponse<string[]>> => apiClient<string[]>("/rbac/modules"),
};
