import { apiClient, ApiResponse } from "./client";

export interface GoalItem {
  id: string;
  companyId?: string | null;
  title: string;
  description: string;
  goalType: string;
  ownerName: string;
  category: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  progressPercent: number;
  createdAt?: string;
}

export interface GoalCheckInItem {
  id: string;
  goalId: string;
  valueRecorded: number;
  note: string;
  checkedInDate: string;
  createdAt?: string;
}

export interface GoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  missedGoals: number;
  cancelledGoals: number;
  averageProgress: number;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  goalType: string;
  ownerName: string;
  category: string;
  targetValue: number;
  unit?: string;
  periodStart: string;
  periodEnd: string;
  companyId?: string | null;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  goalType?: string;
  ownerName?: string;
  category?: string;
  targetValue?: number;
  unit?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface CheckInInput {
  valueRecorded: number;
  note?: string;
  checkedInDate?: string;
}

export const goalApi = {
  listGoals: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<GoalItem[]>> => {
    return apiClient<GoalItem[]>("/goals", { params });
  },
  getGoal: async (id: string): Promise<ApiResponse<GoalItem>> => {
    return apiClient<GoalItem>(`/goals/${id}`);
  },
  createGoal: async (data: CreateGoalInput): Promise<ApiResponse<GoalItem>> => {
    return apiClient<GoalItem>("/goals", { method: "POST", body: JSON.stringify(data) });
  },
  updateGoal: async (id: string, data: UpdateGoalInput): Promise<ApiResponse<GoalItem>> => {
    return apiClient<GoalItem>(`/goals/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  checkIn: async (id: string, data: CheckInInput): Promise<ApiResponse<GoalItem>> => {
    return apiClient<GoalItem>(`/goals/${id}/check-in`, { method: "POST", body: JSON.stringify(data) });
  },
  completeGoal: async (id: string): Promise<ApiResponse<GoalItem>> => {
    return apiClient<GoalItem>(`/goals/${id}/complete`, { method: "POST" });
  },
  getSummary: async (): Promise<ApiResponse<GoalSummary>> => {
    return apiClient<GoalSummary>("/goals/summary");
  },
};
