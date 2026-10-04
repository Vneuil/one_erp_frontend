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

// Sales, purchase, sub-ledger and stock reports

export interface ProductSalesRow {
  rank: number;
  productId: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  avgPrice: number;
  cost: number;
  grossProfit: number;
  marginPct: number;
}

export interface SalesByProduct {
  from: string;
  to: string;
  rows: ProductSalesRow[];
  quantity: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  marginPct: number;
  note: string;
}

export interface DailyProductRow {
  date: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface DailyProductSales {
  from: string;
  to: string;
  rows: DailyProductRow[];
}

export interface CustomerSalesRow {
  rank: number;
  customer: string;
  orders: number;
  revenue: number;
  avgOrder: number;
  firstDate: string;
  lastDate: string;
  itemsRevenue: number;
  cost: number;
  grossProfit: number;
  marginPct: number;
}

export interface SalesByCustomer {
  from: string;
  to: string;
  rows: CustomerSalesRow[];
  orders: number;
  revenue: number;
  note: string;
}

export interface SalesPeriodRow {
  period: string;
  orders: number;
  revenue: number;
  activeDays: number;
  avgPerDay: number;
}

export interface SalesSummary {
  from: string;
  to: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  days: number;
  activeDays: number;
  avgPerDay: number;
  avgPerActiveDay: number;
  avgOrdersPerDay: number;
  daily: { date: string; orders: number; revenue: number }[];
  monthly: SalesPeriodRow[];
}

export interface CategoryMargin {
  category: string;
  quantity: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  marginPct: number;
}

export interface GrossMargin {
  from: string;
  to: string;
  ledger: {
    sales: number;
    discounts: number;
    additionalCharges: number;
    netSales: number;
    costOfGoodsSold: number;
    grossProfit: number;
    marginPct: number;
  };
  items: CategoryMargin;
  byCategory: CategoryMargin[];
  byProduct: ProductSalesRow[];
  note: string;
}

export interface PurchaseReport {
  from: string;
  to: string;
  invoices: {
    invoiceId: string;
    date: string;
    invoiceNumber: string;
    supplier: string;
    subtotal: number;
    discount: number;
    additionalCost: number;
    vat: number;
    total: number;
    paid: number;
    outstanding: number;
    status: string;
  }[];
  bySupplier: {
    rank: number;
    supplier: string;
    invoices: number;
    subtotal: number;
    discount: number;
    additionalCost: number;
    vat: number;
    total: number;
    paid: number;
    outstanding: number;
  }[];
  byProduct: { productId: string; sku: string; name: string; category: string; quantity: number; amount: number; avgPrice: number }[];
  total: number;
  vat: number;
  paid: number;
  outstanding: number;
  note: string;
}

export interface PartyBalanceRow {
  party: string;
  invoiced: number;
  paid: number;
  balance: number;
  openDocuments: number;
  oldestDue?: string;
}

export interface PartyBalances {
  asOf: string;
  rows: PartyBalanceRow[];
  totalInvoiced: number;
  totalPaid: number;
  totalBalance: number;
}

export interface PartyCardEntry {
  date: string;
  type: "invoice" | "payment";
  reference: string;
  description: string;
  dueDate?: string;
  charge: number;
  payment: number;
  balance: number;
  approximate?: boolean;
}

export interface PartyCard {
  party: string;
  from: string;
  to: string;
  openingBalance: number;
  entries: PartyCardEntry[];
  totalCharges: number;
  totalPayments: number;
  closingBalance: number;
}

export interface StockCardEntry {
  date: string;
  time: string;
  warehouse: string;
  type: string;
  reference: string;
  reason: string;
  batchNo?: string;
  in: number;
  out: number;
  balance: number;
}

export interface StockCard {
  productId: string;
  sku: string;
  productName: string;
  from: string;
  to: string;
  openingBalance: number;
  entries: StockCardEntry[];
  totalIn: number;
  totalOut: number;
  closingBalance: number;
}

export interface StockTransactions {
  from: string;
  to: string;
  rows: {
    date: string;
    time: string;
    sku: string;
    product: string;
    warehouse: string;
    type: string;
    reference: string;
    reason: string;
    batchNo?: string;
    createdBy?: string;
    quantity: number;
    balance: number;
    unitCost: number;
    value: number;
  }[];
  byType: { type: string; count: number; quantity: number; value: number }[];
  truncated: boolean;
  note: string;
}

export interface StockAging {
  asOf: string;
  bucketLabels: string[];
  rows: {
    sku: string;
    product: string;
    category: string;
    warehouse: string;
    buckets: number[];
    untracked: number;
    total: number;
    value: number;
    oldestDays: number;
    expired: number;
  }[];
  bucketTotals: number[];
  bucketValues: number[];
  untrackedQty: number;
  untrackedValue: number;
  totalQuantity: number;
  totalValue: number;
  note: string;
}

type Range = { from?: string; to?: string };

export const reportsApi = {
  salesSummary: async (p?: Range): Promise<ApiResponse<SalesSummary>> => apiClient<SalesSummary>("/reports/sales/summary", { params: p }),
  salesByProduct: async (p?: Range): Promise<ApiResponse<SalesByProduct>> => apiClient<SalesByProduct>("/reports/sales/by-product", { params: p }),
  salesByCustomer: async (p?: Range): Promise<ApiResponse<SalesByCustomer>> => apiClient<SalesByCustomer>("/reports/sales/by-customer", { params: p }),
  dailyProductSales: async (p?: Range): Promise<ApiResponse<DailyProductSales>> => apiClient<DailyProductSales>("/reports/sales/daily-product", { params: p }),
  grossMargin: async (p?: Range): Promise<ApiResponse<GrossMargin>> => apiClient<GrossMargin>("/reports/sales/gross-margin", { params: p }),
  purchaseReport: async (p?: Range): Promise<ApiResponse<PurchaseReport>> => apiClient<PurchaseReport>("/reports/purchases", { params: p }),
  partyBalances: async (kind: "ar" | "ap", p?: { asOf?: string; includeZero?: boolean }): Promise<ApiResponse<PartyBalances>> =>
    apiClient<PartyBalances>(`/reports/${kind}/balances`, { params: p }),
  partyCard: async (kind: "ar" | "ap", p: Range & { party: string }): Promise<ApiResponse<PartyCard>> =>
    apiClient<PartyCard>(`/reports/${kind}/card`, { params: p }),
  stockCard: async (p: Range & { productId: string; warehouseId?: string }): Promise<ApiResponse<StockCard>> =>
    apiClient<StockCard>("/reports/stock/card", { params: p }),
  stockTransactions: async (p?: Range & { type?: string; productId?: string; warehouseId?: string }): Promise<ApiResponse<StockTransactions>> =>
    apiClient<StockTransactions>("/reports/stock/transactions", { params: p }),
  stockAging: async (p?: { asOf?: string; warehouseId?: string }): Promise<ApiResponse<StockAging>> =>
    apiClient<StockAging>("/reports/stock/aging", { params: p }),

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
