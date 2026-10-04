import { apiClient, ApiResponse } from "./client";

// Purchase requests

export interface PurchaseRequestLineInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface PurchaseRequestLineItem extends PurchaseRequestLineInput {
  id: string;
}

export interface PurchaseRequestItem {
  id: string;
  requestNo: string;
  requestedBy: string;
  department: string;
  neededByDate: string;
  status: string;
  lines: PurchaseRequestLineItem[];
  createdAt?: string;
}

export interface CreatePurchaseRequestInput {
  // requestedBy is intentionally absent here - the backend always sets it
  // server-side from the authenticated caller and ignores any client value.
  department?: string;
  neededByDate?: string;
  lines: PurchaseRequestLineInput[];
}

// Purchase orders

export interface PurchaseOrderLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderLineItem extends PurchaseOrderLineInput {
  id: string;
  subtotal: number;
  quantityReceived: number;
}

export interface PurchaseOrderItem {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierName: string;
  purchaseRequestId?: string | null;
  orderDate: string;
  expectedDate: string;
  status: string;
  totalAmount: number;
  currency?: string;
  baseAmount?: number;
  createdByEmail?: string;
  lines: PurchaseOrderLineItem[];
  createdAt?: string;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  supplierName?: string;
  purchaseRequestId?: string | null;
  orderDate?: string;
  expectedDate?: string;
  requestedBy?: string;
  // Currency is the code the order's line items are denominated in.
  // Empty/omitted (or "IDR", the base currency) skips conversion entirely.
  currency?: string;
  lines: PurchaseOrderLineInput[];
}

// Goods receipts

export interface GoodsReceiptLineInput {
  productId: string;
  quantityReceived: number;
}

export interface GoodsReceiptLineItem extends GoodsReceiptLineInput {
  id: string;
  quantityOrderedReference: number;
}

export interface GoodsReceiptItem {
  id: string;
  receiptNo: string;
  purchaseOrderId: string;
  receivedDate: string;
  warehouseId?: string | null;
  receivedBy: string;
  status: string;
  lines: GoodsReceiptLineItem[];
  createdAt?: string;
}

export interface CreateGoodsReceiptInput {
  purchaseOrderId: string;
  receivedDate?: string;
  warehouseId?: string | null;
  lines: GoodsReceiptLineInput[];
}

// Purchase invoices

export interface PurchaseInvoiceItem {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId?: string | null;
  purchaseOrderNumber?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  subtotal?: number;
  discountAmount?: number;
  additionalCost?: number;
  roundingAmount?: number;
  /** DPP and PPN Masukan; zero for invoices without PPN. */
  taxBase?: number;
  vatRate?: number;
  vatAmount?: number;
  vatCreditable?: boolean;
  paidAmount: number;
  outstanding: number;
  status: string;
  createdAt?: string;
}

export interface CreatePurchaseInvoiceInput {
  supplierId: string;
  supplierName?: string;
  purchaseOrderId?: string | null;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  /** Amount before adjustments; also the final total when none are given. */
  totalAmount: number;
  discountPercent?: number;
  discountAmount?: number;
  additionalCost?: number;
  roundTo?: number;
  applyVat?: boolean;
  vatRate?: number;
  vatOtherValueBase?: boolean;
  vatCreditable?: boolean;
}

// Purchase down payments

export interface PurchaseDownPaymentItem {
  id: string;
  dpNumber: string;
  purchaseOrderId: string;
  purchaseOrderNumber?: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  appliedAmount: number;
  remainingAmount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  notes?: string;
  createdAt?: string;
}

export interface CreateDownPaymentInput {
  purchaseOrderId: string;
  supplierId: string;
  supplierName?: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
}

// Purchase returns

export interface PurchaseReturnLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseReturnLineItem extends PurchaseReturnLineInput {
  id: string;
  subtotal: number;
}

export interface PurchaseReturnItem {
  id: string;
  returnNo: string;
  goodsReceiptId: string;
  supplierId: string;
  supplierName: string;
  returnDate: string;
  reason: string;
  status: string;
  totalAmount: number;
  lines: PurchaseReturnLineItem[];
  createdAt?: string;
}

export interface CreatePurchaseReturnInput {
  goodsReceiptId: string;
  returnDate?: string;
  reason?: string;
  lines: PurchaseReturnLineInput[];
}

export const procurementApi = {
  // Purchase requests
  listPurchaseRequests: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<PurchaseRequestItem[]>> => {
    return apiClient<PurchaseRequestItem[]>("/procurement/requests", { params });
  },
  createPurchaseRequest: async (data: CreatePurchaseRequestInput): Promise<ApiResponse<PurchaseRequestItem>> => {
    return apiClient<PurchaseRequestItem>("/procurement/requests", { method: "POST", body: JSON.stringify(data) });
  },
  submitPurchaseRequest: async (id: string): Promise<ApiResponse<PurchaseRequestItem>> => {
    return apiClient<PurchaseRequestItem>(`/procurement/requests/${id}/submit`, { method: "POST" });
  },
  approvePurchaseRequest: async (id: string): Promise<ApiResponse<PurchaseRequestItem>> => {
    return apiClient<PurchaseRequestItem>(`/procurement/requests/${id}/approve`, { method: "POST" });
  },
  rejectPurchaseRequest: async (id: string): Promise<ApiResponse<PurchaseRequestItem>> => {
    return apiClient<PurchaseRequestItem>(`/procurement/requests/${id}/reject`, { method: "POST" });
  },

  // Purchase orders
  listPurchaseOrders: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<PurchaseOrderItem[]>> => {
    return apiClient<PurchaseOrderItem[]>("/procurement/orders", { params });
  },
  createPurchaseOrder: async (data: CreatePurchaseOrderInput): Promise<ApiResponse<PurchaseOrderItem>> => {
    return apiClient<PurchaseOrderItem>("/procurement/orders", { method: "POST", body: JSON.stringify(data) });
  },
  approvePurchaseOrder: async (id: string, comments?: string): Promise<ApiResponse<PurchaseOrderItem>> => {
    return apiClient<PurchaseOrderItem>(`/procurement/orders/${id}/approve`, { method: "POST", body: JSON.stringify({ comments }) });
  },
  rejectPurchaseOrder: async (id: string, comments?: string): Promise<ApiResponse<PurchaseOrderItem>> => {
    return apiClient<PurchaseOrderItem>(`/procurement/orders/${id}/reject`, { method: "POST", body: JSON.stringify({ comments }) });
  },
  cancelPurchaseOrder: async (id: string): Promise<ApiResponse<PurchaseOrderItem>> => {
    return apiClient<PurchaseOrderItem>(`/procurement/orders/${id}/cancel`, { method: "POST" });
  },

  // Goods receipts
  listGoodsReceipts: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<GoodsReceiptItem[]>> => {
    return apiClient<GoodsReceiptItem[]>("/procurement/receipts", { params });
  },
  createGoodsReceipt: async (data: CreateGoodsReceiptInput): Promise<ApiResponse<GoodsReceiptItem>> => {
    return apiClient<GoodsReceiptItem>("/procurement/receipts", { method: "POST", body: JSON.stringify(data) });
  },

  // Purchase invoices
  listPurchaseInvoices: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<PurchaseInvoiceItem[]>> => {
    return apiClient<PurchaseInvoiceItem[]>("/procurement/invoices", { params });
  },
  createPurchaseInvoice: async (data: CreatePurchaseInvoiceInput): Promise<ApiResponse<PurchaseInvoiceItem>> => {
    return apiClient<PurchaseInvoiceItem>("/procurement/invoices", { method: "POST", body: JSON.stringify(data) });
  },
  recordInvoicePayment: async (id: string, amount: number): Promise<ApiResponse<PurchaseInvoiceItem>> => {
    return apiClient<PurchaseInvoiceItem>(`/procurement/invoices/${id}/payments`, { method: "POST", body: JSON.stringify({ amount }) });
  },

  // Purchase down payments
  listDownPayments: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<PurchaseDownPaymentItem[]>> => {
    return apiClient<PurchaseDownPaymentItem[]>("/procurement/down-payments", { params });
  },
  createDownPayment: async (data: CreateDownPaymentInput): Promise<ApiResponse<PurchaseDownPaymentItem>> => {
    return apiClient<PurchaseDownPaymentItem>("/procurement/down-payments", { method: "POST", body: JSON.stringify(data) });
  },

  // Purchase returns
  listPurchaseReturns: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<PurchaseReturnItem[]>> => {
    return apiClient<PurchaseReturnItem[]>("/procurement/returns", { params });
  },
  createPurchaseReturn: async (data: CreatePurchaseReturnInput): Promise<ApiResponse<PurchaseReturnItem>> => {
    return apiClient<PurchaseReturnItem>("/procurement/returns", { method: "POST", body: JSON.stringify(data) });
  },
};
