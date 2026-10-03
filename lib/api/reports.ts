import { apiClient, ApiResponse } from "./client";

export interface ChannelRevenue {
  channel: string;
  revenue: number;
}

export interface StatusRevenue {
  status: string;
  revenue: number;
}

export interface TopCustomer {
  customerName: string;
  totalValue: number;
}

export interface SalesPerformance {
  from?: string;
  to?: string;
  totalOrders: number;
  totalRevenue: number;
  revenueByChannel: ChannelRevenue[];
  revenueByStatus: StatusRevenue[];
  topCustomers: TopCustomer[];
}

export interface WarehouseValue {
  warehouseId: string;
  warehouseName: string;
  totalValue: number;
}

export interface CategoryValue {
  category: string;
  totalValue: number;
}

export interface LowStockItem {
  productSku: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  minStock: number;
}

export interface InventoryValuation {
  totalInventoryValue: number;
  byWarehouse: WarehouseValue[];
  byCategory: CategoryValue[];
  lowStockItems: LowStockItem[] | null;
}

export interface DepartmentHeadcount {
  department: string;
  count: number;
}

export interface StatusHeadcount {
  status: string;
  count: number;
}

export interface HRMSummary {
  totalHeadcount: number;
  byDepartment: DepartmentHeadcount[];
  byStatus: StatusHeadcount[];
  attendanceRatePct: number;
  attendanceRateNote?: string;
}

export interface ExecutiveSummary {
  salesRevenueThisMonth: number;
  totalInventoryValue: number;
  totalHeadcount: number;
  financeNote: string;
}

export const reportsApi = {
  getSalesPerformance: async (params?: { from?: string; to?: string }): Promise<ApiResponse<SalesPerformance>> => {
    return apiClient<SalesPerformance>("/reports/sales-performance", { params });
  },
  getInventoryValuation: async (): Promise<ApiResponse<InventoryValuation>> => {
    return apiClient<InventoryValuation>("/reports/inventory-valuation");
  },
  getHRMSummary: async (): Promise<ApiResponse<HRMSummary>> => {
    return apiClient<HRMSummary>("/reports/hrm-summary");
  },
  getExecutiveSummary: async (): Promise<ApiResponse<ExecutiveSummary>> => {
    return apiClient<ExecutiveSummary>("/reports/executive-summary");
  },
};
