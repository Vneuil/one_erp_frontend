import { apiClient, ApiResponse } from "./client";
import type { PosSettings } from "@/lib/utils/pos-totals";

export interface POSTransactionItem {
  id: string;
  orderNo: string;
  outlet: string;
  cashier: string;
  customer: string;
  totalItems: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  refundedAmount?: number;
  amountTendered?: number;
  changeAmount?: number;
  cashierEmail?: string;
  voidReason?: string;
  lines?: POSTransactionLine[];
  salesOrderId?: string;
  salesOrderNumber?: string;
  loyaltyMemberCode?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsBalance?: number;
  createdAt: string;
}

export interface POSTransactionLine {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  refundedQty: number;
}

export interface POSRefundItem {
  id: string;
  kind: "refund" | "void";
  amount: number;
  taxAmount: number;
  reason: string;
  restocked: boolean;
  processedBy?: string;
  createdAt: string;
}

export interface SalesReport {
  from: string;
  to: string;
  days: SalesReportDay[];
  totals: SalesReportDay;
  byPayment: { name: string; transactions: number; amount: number }[];
  byCashier: { name: string; transactions: number; amount: number }[];
  topProducts: { name: string; sku: string; quantity: number; revenue: number }[];
}

export interface SalesReportDay {
  date: string;
  transactions: number;
  itemsSold: number;
  grossSales: number;
  discounts: number;
  tax: number;
  refunds: number;
  netSales: number;
  voided: number;
}

export interface CheckoutLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CheckoutInput {
  outlet?: string;
  cashier?: string;
  customer?: string;
  customerPhone?: string;
  totalItems: number;
  /** Optional for cart sales: the server computes it and rejects a total that disagrees. */
  totalAmount?: number;
  paymentMethod: string;
  discountAmount?: number;
  amountTendered?: number;
  warehouseId?: string;
  lines?: CheckoutLineInput[];
}

export const posApi = {
  listTransactions: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<POSTransactionItem[]>> => {
    return apiClient<POSTransactionItem[]>("/pos/transactions", { params });
  },

  checkout: async (data: CheckoutInput): Promise<ApiResponse<POSTransactionItem>> => {
    return apiClient<POSTransactionItem>("/pos/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getTransaction: async (id: string): Promise<ApiResponse<POSTransactionItem>> => apiClient<POSTransactionItem>(`/pos/transactions/${id}`),
  voidTransaction: async (id: string, reason: string): Promise<ApiResponse<POSTransactionItem>> =>
    apiClient<POSTransactionItem>(`/pos/transactions/${id}/void`, { method: "POST", body: JSON.stringify({ reason }) }),
  refund: async (id: string, data: { lines: { lineId: string; quantity: number }[]; reason: string; restock?: boolean }): Promise<ApiResponse<POSTransactionItem>> =>
    apiClient<POSTransactionItem>(`/pos/transactions/${id}/refund`, { method: "POST", body: JSON.stringify(data) }),
  listRefunds: async (id: string): Promise<ApiResponse<POSRefundItem[]>> => apiClient<POSRefundItem[]>(`/pos/transactions/${id}/refunds`),
  getSettings: async (): Promise<ApiResponse<PosSettings>> => apiClient<PosSettings>("/pos/settings"),
  updateSettings: async (data: PosSettings): Promise<ApiResponse<PosSettings>> => apiClient<PosSettings>("/pos/settings", { method: "PUT", body: JSON.stringify(data) }),
  salesReport: async (params: { from?: string; to?: string; outlet?: string }): Promise<ApiResponse<SalesReport>> =>
    apiClient<SalesReport>("/pos/reports/sales", { params }),
};
