import { apiClient, ApiResponse } from "./client";

export interface BudgetItem {
  id: string;
  projectId: string;
  kind: "rab" | "rap";
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export interface BudgetCategoryRow {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  usedPct: number;
  over: boolean;
}

export interface BudgetSummary {
  rab: number;
  rap: number;
  plannedMargin: number;
  plannedMarginPct: number;
  actual: number;
  projectedMargin: number;
  categories: BudgetCategoryRow[];
  unplannedSpend: number;
  overBudget: boolean;
}

export interface BudgetView {
  items: BudgetItem[];
  summary: BudgetSummary;
}

export interface BudgetLineInput {
  kind: string;
  category: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
}

export interface CostEntryItem {
  id: string;
  category: string;
  description?: string;
  amount: number;
  date: string;
  createdByEmail?: string;
}

export type WorkOrderStatus = "draft" | "issued" | "in_progress" | "completed" | "cancelled";

export interface WorkOrderItem {
  id: string;
  number: string;
  projectId?: string | null;
  salesOrderId?: string | null;
  customerName: string;
  title: string;
  scope?: string;
  contractValue: number;
  startDate?: string;
  dueDate?: string;
  assignedTo?: string;
  status: WorkOrderStatus;
  progressPct: number;
  createdByEmail?: string;
  issuedBy?: string;
}

const send = (method: string, data?: unknown) => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });

export interface ProfitRow {
  projectId: string; code: string; name: string; customer: string; status: string; progress: number;
  revenue: number; plannedCost: number; actualCost: number; earnedRevenue: number; profitToDate: number;
  forecastProfit: number; forecastMarginPct: number; lossMaking: boolean;
}
export interface ProfitReport { rows: ProfitRow[]; revenue: number; actualCost: number; profitToDate: number; forecastProfit: number }

export const projectCostApi = {
  profitability: (): Promise<ApiResponse<ProfitReport>> => apiClient("/project-profitability"),
  budget: (projectId: string): Promise<ApiResponse<BudgetView>> => apiClient(`/projects/${projectId}/budget`),
  importBudget: (projectId: string, mode: "append" | "replace", lines: BudgetLineInput[]): Promise<ApiResponse<{ added: number }>> =>
    apiClient(`/projects/${projectId}/budget/import`, send("POST", { mode, lines })),
  deleteBudgetLine: (projectId: string, lineId: string): Promise<ApiResponse<null>> => apiClient(`/projects/${projectId}/budget/${lineId}`, send("DELETE")),
  costs: (projectId: string): Promise<ApiResponse<CostEntryItem[]>> => apiClient(`/projects/${projectId}/costs`),
  recordCost: (projectId: string, d: { category: string; amount: number; description?: string; date?: string }): Promise<ApiResponse<CostEntryItem>> =>
    apiClient(`/projects/${projectId}/costs`, send("POST", d)),
  deleteCost: (projectId: string, costId: string): Promise<ApiResponse<null>> => apiClient(`/projects/${projectId}/costs/${costId}`, send("DELETE")),

  workOrders: (params?: { status?: string; projectId?: string }): Promise<ApiResponse<WorkOrderItem[]>> => apiClient("/project-work-orders", { params }),
  createWorkOrder: (d: Partial<WorkOrderItem> & { customerName: string; title: string }): Promise<ApiResponse<WorkOrderItem>> => apiClient("/project-work-orders", send("POST", d)),
  advanceWorkOrder: (id: string, action: "issue" | "start" | "complete" | "cancel"): Promise<ApiResponse<WorkOrderItem>> =>
    apiClient(`/project-work-orders/${id}/${action}`, send("POST")),
  setWorkOrderProgress: (id: string, progress: number): Promise<ApiResponse<WorkOrderItem>> => apiClient(`/project-work-orders/${id}/progress`, send("PUT", { progress })),
};
