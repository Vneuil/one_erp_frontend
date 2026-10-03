import { apiClient, ApiResponse } from "./client";

export interface WorkflowLevel {
  levelOrder: number;
  approverRole: string;
}

export interface Workflow {
  id: string;
  documentType: string;
  name: string;
  minAmount: number;
  isActive: boolean;
  levels: WorkflowLevel[];
  createdAt: string;
}

export interface CreateWorkflowInput {
  documentType: string;
  name: string;
  minAmount: number;
  levels: WorkflowLevel[];
}

export interface ApprovalStep {
  id: string;
  levelOrder: number;
  approverRole: string;
  status: "pending" | "approved" | "rejected";
  actedByName?: string;
  actedAt?: string;
  comments?: string;
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  documentType: string;
  documentId: string;
  documentNumber: string;
  amount: number;
  requesterName: string;
  status: "pending" | "approved" | "rejected";
  currentLevel: number;
  steps: ApprovalStep[];
  createdAt: string;
}

export const approvalApi = {
  listWorkflows: async (documentType?: string): Promise<ApiResponse<Workflow[]>> =>
    apiClient<Workflow[]>("/approval/workflows", { params: documentType ? { documentType } : undefined }),

  createWorkflow: async (data: CreateWorkflowInput): Promise<ApiResponse<Workflow>> =>
    apiClient<Workflow>("/approval/workflows", { method: "POST", body: JSON.stringify(data) }),

  deleteWorkflow: async (id: string): Promise<ApiResponse<null>> =>
    apiClient<null>(`/approval/workflows/${id}`, { method: "DELETE" }),

  listMyPendingApprovals: async (): Promise<ApiResponse<ApprovalRequest[]>> =>
    apiClient<ApprovalRequest[]>("/approval/requests/pending"),

  listRequests: async (params?: { page?: number; perPage?: number; documentType?: string }): Promise<ApiResponse<ApprovalRequest[]>> =>
    apiClient<ApprovalRequest[]>("/approval/requests", { params }),

  approveStep: async (requestId: string, comments?: string): Promise<ApiResponse<ApprovalRequest>> =>
    apiClient<ApprovalRequest>(`/approval/requests/${requestId}/approve`, { method: "POST", body: JSON.stringify({ comments }) }),

  rejectStep: async (requestId: string, comments?: string): Promise<ApiResponse<ApprovalRequest>> =>
    apiClient<ApprovalRequest>(`/approval/requests/${requestId}/reject`, { method: "POST", body: JSON.stringify({ comments }) }),
};
