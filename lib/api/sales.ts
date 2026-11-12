import { apiClient, apiClientDownload, ApiResponse } from "./client";

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
  customerPoNumber?: string;
  customerPoAttachment?: string;
  dpPaid?: boolean;
  dpPercent?: number;
  dpAmount?: number;
  invoiceDocType?: string;
  invoiceDocAttachment?: string;
  invoiceDocNumber?: string;
  shippingAddress?: string;
  shippingCourier?: string;
  deliveryDate?: string;
  packagingAvailability?: PackagingAvailability;
  coaStatus?: CoaStatus;
  productionStatus?: ProductionStatus;
  /** PPN switched off for this order (e.g. export). */
  vatExempt?: boolean;
  revision?: number;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  lines?: SalesOrderLine[];
  createdAt?: string;
}

export type PackagingAvailability = "pending" | "available" | "partial" | "unavailable";
export type CoaStatus = "not_required" | "pending" | "ready";
export type ProductionStatus = "not_started" | "in_production" | "completed";

export interface SalesOrderRevision {
  id: string;
  salesOrderId: string;
  revision: number;
  changedBy: string;
  reason: string;
  totalAmount: number;
  /** JSON of the previous line items. */
  linesJson: string;
  createdAt: string;
}

export interface UpdateSalesOrderInput {
  customerName: string;
  customerPoNumber?: string;
  customerPoAttachment?: string;
  dpPaid?: boolean;
  dpPercent?: number;
  dpAmount?: number;
  invoiceDocType?: string;
  invoiceDocAttachment?: string;
  invoiceDocNumber?: string;
  shippingAddress?: string;
  shippingCourier?: string;
  deliveryDate?: string;
  packagingAvailability?: PackagingAvailability;
  coaStatus?: CoaStatus;
  productionStatus?: ProductionStatus;
  vatExempt?: boolean;
  /** Required by the server when line items change on a submitted order. */
  revisionReason?: string;
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
  customerPoNumber?: string;
  customerPoAttachment?: string;
  dpPaid?: boolean;
  dpPercent?: number;
  dpAmount?: number;
  invoiceDocType?: string;
  invoiceDocAttachment?: string;
  invoiceDocNumber?: string;
  shippingAddress?: string;
  shippingCourier?: string;
  deliveryDate?: string;
  packagingAvailability?: PackagingAvailability;
  coaStatus?: CoaStatus;
  productionStatus?: ProductionStatus;
  vatExempt?: boolean;
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
  creditedAmount: number;
  vatAmount: number;
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

  getOrder: async (id: string): Promise<ApiResponse<SalesOrderItem>> => {
    return apiClient<SalesOrderItem>(`/sales/orders/${id}`);
  },

  createOrder: async (data: CreateSalesOrderInput): Promise<ApiResponse<SalesOrderItem>> => {
    return apiClient<SalesOrderItem>("/sales/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  uploadAttachment: async (
    file: File
  ): Promise<ApiResponse<{ key: string; filename: string; size: number; contentType: string }>> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<{ key: string; filename: string; size: number; contentType: string }>(
      "/sales/orders/upload-attachment",
      {
        method: "POST",
        body: formData,
      }
    );
  },

  downloadAttachment: async (
    orderId: string
  ): Promise<{ blob: Blob; filename: string | null } | ApiResponse<unknown>> => {
    return apiClientDownload(`/sales/orders/${orderId}/attachment`);
  },

  downloadAttachmentByKey: async (
    key: string
  ): Promise<{ blob: Blob; filename: string | null } | ApiResponse<unknown>> => {
    return apiClientDownload("/sales/orders/attachment/download", {
      params: { key },
    });
  },

  attachInvoiceDocument: async (
    orderId: string,
    data: { invoiceDocType: string; invoiceDocNumber?: string; invoiceDocAttachment: string }
  ): Promise<ApiResponse<SalesOrderItem>> => {
    return apiClient<SalesOrderItem>(`/sales/orders/${orderId}/invoice-document`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  downloadInvoiceAttachment: async (
    orderId: string
  ): Promise<{ blob: Blob; filename: string | null } | ApiResponse<unknown>> => {
    return apiClientDownload(`/sales/orders/${orderId}/invoice-attachment`);
  },

  updateOrder: async (id: string, data: UpdateSalesOrderInput): Promise<ApiResponse<SalesOrderItem>> => {
    return apiClient<SalesOrderItem>(`/sales/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  listOrderRevisions: async (id: string): Promise<ApiResponse<SalesOrderRevision[]>> =>
    apiClient<SalesOrderRevision[]>(`/sales/orders/${id}/revisions`),

  submitOrder: async (id: string): Promise<ApiResponse<SalesOrderItem>> => {
    return apiClient<SalesOrderItem>(`/sales/orders/${id}/submit`, {
      method: "POST",
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

// ---- PI / CI (Proforma / Commercial Invoice) - superadmin only ----

export type TradeKind = "PI" | "CI";

export interface TradeInvoiceLine {
  id?: string;
  productId?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}

export interface TradeInvoice {
  id: string;
  kind: TradeKind;
  number: string;
  salesOrderId?: string;
  quotationId?: string;
  parentId?: string;
  customerName: string;
  billingAddress?: string;
  shippingAddress?: string;
  currency: string;
  issueDate: string;
  paymentTerm?: string;
  incoterm?: string;
  notes?: string;
  vatExempt: boolean;
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  status: "draft" | "issued" | "cancelled";
  issuedBy?: string;
  issuedAt?: string;
  createdBy?: string;
  lines: TradeInvoiceLine[];
  createdAt?: string;
}

export interface CreateTradeInvoiceInput {
  kind: TradeKind;
  /** Exactly one source. */
  salesOrderId?: string;
  quotationId?: string;
  parentId?: string;
  customerName?: string;
  billingAddress?: string;
  shippingAddress?: string;
  currency?: string;
  paymentTerm?: string;
  incoterm?: string;
  notes?: string;
  vatExempt?: boolean;
  lines?: TradeInvoiceLine[];
}

export const tradeInvoicesApi = {
  list: (params?: { kind?: TradeKind; page?: number; perPage?: number; search?: string }): Promise<ApiResponse<TradeInvoice[]>> =>
    apiClient<TradeInvoice[]>("/sales/trade-invoices", { params }),
  get: (id: string): Promise<ApiResponse<TradeInvoice>> => apiClient<TradeInvoice>(`/sales/trade-invoices/${id}`),
  create: (data: CreateTradeInvoiceInput): Promise<ApiResponse<TradeInvoice>> =>
    apiClient<TradeInvoice>("/sales/trade-invoices", { method: "POST", body: JSON.stringify(data) }),
  issue: (id: string): Promise<ApiResponse<TradeInvoice>> =>
    apiClient<TradeInvoice>(`/sales/trade-invoices/${id}/issue`, { method: "POST" }),
  cancel: (id: string): Promise<ApiResponse<TradeInvoice>> =>
    apiClient<TradeInvoice>(`/sales/trade-invoices/${id}/cancel`, { method: "POST" }),
};
