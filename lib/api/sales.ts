import { apiClient, ApiResponse } from "./client";

export interface SalesOrderLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SalesOrderLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  /** Order value in the company base currency (IDR); what billing terms split. */
  baseAmount?: number;
  status: string;
  paymentStatus: string;
  channel: string;
  orderDate: string;
  createdByEmail?: string;
  marketplacePlatform?: string;
  marketplaceOrderId?: string;
  warehouseId?: string | null;
  lines?: SalesOrderLine[];
  createdAt?: string;
}

export interface UpdateSalesOrderInput {
  customerName: string;
  lines: SalesOrderLineInput[];
}

export interface CreateSalesOrderInput {
  orderNumber?: string;
  customerName: string;
  totalAmount: number;
  channel?: string;
  paymentStatus?: string;
  status?: string;
  warehouseId?: string;
  lines?: SalesOrderLineInput[];
}

export interface QuotationLineInput {
  productId?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface QuotationLine extends QuotationLineInput {
  id: string;
  subtotal: number;
}

export interface QuotationItem {
  leadId?: string;
  lines?: QuotationLine[];
  id: string;
  quotationNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  validUntil: string;
  createdAt?: string;
}

export interface CreateQuotationInput {
  leadId: string;
  lines: QuotationLineInput[];
  quotationNumber?: string;
  customerName: string;
  totalAmount: number;
  validUntil?: string;
}

export interface UpdateQuotationInput {
  lines: QuotationLineInput[];
  customerName: string;
  validUntil?: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  subtotal?: number;
  discountAmount?: number;
  additionalCost?: number;
  roundingAmount?: number;
  /** DPP and PPN; zero for invoices without PPN. */
  taxBase?: number;
  vatRate?: number;
  vatAmount?: number;
  paidAmount: number;
  outstanding: number;
  status: string;
  salesOrderId?: string | null;
  createdAt?: string;
}

export interface BillingTermItem {
  id: string;
  salesOrderId: string;
  seq: number;
  label: string;
  percent: number;
  amount: number;
  dueDate: string;
  invoiceId?: string | null;
  status: "scheduled" | "invoiced";
}

export interface BillingTermInput {
  label?: string;
  percent: number;
  dueDate?: string;
  dueInDays?: number;
}

export interface CreateInvoiceInput {
  invoiceNumber?: string;
  customerName: string;
  /** Amount before adjustments; also the final total when none are given. */
  totalAmount: number;
  discountPercent?: number;
  discountAmount?: number;
  additionalCost?: number;
  roundTo?: number;
  applyVat?: boolean;
  vatRate?: number;
  vatOtherValueBase?: boolean;
  dueDate?: string;
  salesOrderId?: string;
}

export interface DeliveryLineInput {
  productId: string;
  quantity: number;
}

export interface DeliveryLineItem extends DeliveryLineInput {
  id: string;
}

export interface DeliveryItem {
  id: string;
  deliveryNumber: string;
  salesOrderId?: string | null;
  soNumber: string;
  customerName: string;
  deliveryDate: string;
  carrier: string;
  status: string;
  trackingNumber?: string;
  shippingCost?: number;
  shippingPaid?: boolean;
  lines?: DeliveryLineItem[];
  createdAt?: string;
}

export interface CreateDeliveryInput {
  salesOrderId: string;
  customerName: string;
  carrier?: string;
  deliveryDate?: string;
  lines: DeliveryLineInput[];
}

// Sales down payments

export interface SalesDownPaymentItem {
  id: string;
  dpNumber: string;
  salesOrderId: string;
  salesOrderNumber?: string;
  customerName: string;
  amount: number;
  appliedAmount: number;
  remainingAmount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  notes?: string;
  createdAt?: string;
}

export interface CreateSalesDownPaymentInput {
  salesOrderId: string;
  customerName?: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
}

// Sales returns

export interface SalesReturnLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesReturnLineItem extends SalesReturnLineInput {
  id: string;
  subtotal: number;
}

export interface SalesReturnItem {
  id: string;
  returnNo: string;
  deliveryId: string;
  customerName: string;
  returnDate: string;
  reason: string;
  status: string;
  totalAmount: number;
  lines: SalesReturnLineItem[];
  createdAt?: string;
}

export interface CreateSalesReturnInput {
  deliveryId: string;
  returnDate?: string;
  reason?: string;
  lines: SalesReturnLineInput[];
}

export const salesApi = {
  recordShippingCost: async (id: string, data: { amount?: number; carrier?: string; trackingNumber?: string; paidNow?: boolean }): Promise<ApiResponse<DeliveryItem>> =>
    apiClient<DeliveryItem>(`/sales/deliveries/${id}/shipping-cost`, { method: "PUT", body: JSON.stringify(data) }),

  listBillingSchedule: async (orderId: string): Promise<ApiResponse<BillingTermItem[]>> =>
    apiClient<BillingTermItem[]>(`/sales/orders/${orderId}/billing-schedule`),
  setBillingSchedule: async (orderId: string, terms: BillingTermInput[]): Promise<ApiResponse<BillingTermItem[]>> =>
    apiClient<BillingTermItem[]>(`/sales/orders/${orderId}/billing-schedule`, { method: "PUT", body: JSON.stringify({ terms }) }),
  invoiceBillingTerm: async (termId: string): Promise<ApiResponse<InvoiceItem>> =>
    apiClient<InvoiceItem>(`/sales/billing-terms/${termId}/invoice`, { method: "POST" }),

  listOrders: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<SalesOrderItem[]>> => {
    return apiClient<SalesOrderItem[]>("/sales/orders", { params });
  },

  createOrder: async (data: CreateSalesOrderInput): Promise<ApiResponse<SalesOrderItem>> => {
    return apiClient<SalesOrderItem>("/sales/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateOrder: async (id: string, data: UpdateSalesOrderInput): Promise<ApiResponse<SalesOrderItem>> => {
    return apiClient<SalesOrderItem>(`/sales/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  approveOrder: async (id: string, comments?: string): Promise<ApiResponse<SalesOrderItem>> => {
    return apiClient<SalesOrderItem>(`/sales/orders/${id}/approve`, { method: "POST", body: JSON.stringify({ comments }) });
  },

  rejectOrder: async (id: string, comments?: string): Promise<ApiResponse<SalesOrderItem>> => {
    return apiClient<SalesOrderItem>(`/sales/orders/${id}/reject`, { method: "POST", body: JSON.stringify({ comments }) });
  },

  listQuotations: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<QuotationItem[]>> => {
    return apiClient<QuotationItem[]>("/sales/quotations", { params });
  },

  createQuotation: async (data: CreateQuotationInput): Promise<ApiResponse<QuotationItem>> => {
    return apiClient<QuotationItem>("/sales/quotations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateQuotation: async (id: string, data: UpdateQuotationInput): Promise<ApiResponse<QuotationItem>> => {
    return apiClient<QuotationItem>(`/sales/quotations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  convertQuotationToOrder: async (id: string): Promise<ApiResponse<SalesOrderItem>> => {
    return apiClient<SalesOrderItem>(`/sales/quotations/${id}/convert`, {
      method: "POST",
    });
  },

  listInvoices: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<InvoiceItem[]>> => {
    return apiClient<InvoiceItem[]>("/sales/invoices", { params });
  },

  createInvoice: async (data: CreateInvoiceInput): Promise<ApiResponse<InvoiceItem>> => {
    return apiClient<InvoiceItem>("/sales/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listDeliveries: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<DeliveryItem[]>> => {
    return apiClient<DeliveryItem[]>("/sales/deliveries", { params });
  },

  createDelivery: async (data: CreateDeliveryInput): Promise<ApiResponse<DeliveryItem>> => {
    return apiClient<DeliveryItem>("/sales/deliveries", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  recordInvoicePayment: async (id: string, amount: number): Promise<ApiResponse<InvoiceItem>> => {
    return apiClient<InvoiceItem>(`/sales/invoices/${id}/payments`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  },

  // Sales down payments
  listDownPayments: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<SalesDownPaymentItem[]>> => {
    return apiClient<SalesDownPaymentItem[]>("/sales/down-payments", { params });
  },
  createDownPayment: async (data: CreateSalesDownPaymentInput): Promise<ApiResponse<SalesDownPaymentItem>> => {
    return apiClient<SalesDownPaymentItem>("/sales/down-payments", { method: "POST", body: JSON.stringify(data) });
  },
  applyDownPayment: async (id: string, invoiceId: string): Promise<ApiResponse<SalesDownPaymentItem>> => {
    return apiClient<SalesDownPaymentItem>(`/sales/down-payments/${id}/apply`, {
      method: "POST",
      body: JSON.stringify({ invoiceId }),
    });
  },

  // Sales returns
  listReturns: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<SalesReturnItem[]>> => {
    return apiClient<SalesReturnItem[]>("/sales/returns", { params });
  },
  createReturn: async (data: CreateSalesReturnInput): Promise<ApiResponse<SalesReturnItem>> => {
    return apiClient<SalesReturnItem>("/sales/returns", { method: "POST", body: JSON.stringify(data) });
  },
};
