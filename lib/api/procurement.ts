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
  category?: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  supervisorApprovedBy?: string;
  supervisorApprovedAt?: string;
  ownerApprovedBy?: string;
  ownerApprovedAt?: string;
  rejectionReason?: string;
  lines: PurchaseRequestLineItem[];
  createdAt?: string;
}

export interface CreatePurchaseRequestInput {
  // requestedBy is intentionally absent here - the backend always sets it
  // server-side from the authenticated caller and ignores any client value.
  department?: string;
  neededByDate?: string;
  category?: string;
  salesOrderId?: string;
  salesOrderNo?: string;
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
  category?: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  supervisorApprovedBy?: string;
  supervisorApprovedAt?: string;
  ownerApprovedBy?: string;
  ownerApprovedAt?: string;
  rejectionReason?: string;
  totalAmount: number;
  currency?: string;
  baseAmount?: number;
  createdByEmail?: string;
  freightScheme?: string;
  freightCost?: number;
  qualityNotes?: string;
  notes?: string;
  lines: PurchaseOrderLineItem[];
  createdAt?: string;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  supplierName?: string;
  notes?: string;
  purchaseRequestId?: string | null;
  salesOrderId?: string;
  salesOrderNo?: string;
  orderDate?: string;
  expectedDate?: string;
  requestedBy?: string;
  // Currency is the code the order's line items are denominated in.
  // Empty/omitted (or "IDR", the base currency) skips conversion entirely.
  currency?: string;
  freightScheme?: string;
  freightCost?: number;
  qualityNotes?: string;
  lines: PurchaseOrderLineInput[];
}

// Goods receipts

export interface GoodsReceiptLineInput {
  productId: string;
  quantityReceived: number;
  weightGross?: number;
  weightTare?: number;
  weightNet?: number;
  bagWeights?: string;
  /** Manual correction (kg, signed) on top of the per-sak total; reason is mandatory when non-zero. */
  weightAdjustment?: number;
  adjustmentReason?: string;
}

export interface GoodsReceiptLineItem extends GoodsReceiptLineInput {
  id: string;
  quantityOrderedReference: number;
  weightGross?: number;
  weightTare?: number;
  weightNet?: number;
  bagWeights?: string;
  weightDiffPo?: number;
}

export interface GoodsReceiptItem {
  id: string;
  receiptNo: string;
  documentCode?: string;
  purchaseOrderId: string;
  receivedDate: string;
  warehouseId?: string | null;
  receivedBy: string;
  status: string;
  deliveryNoteNo?: string;
  sugarCondition?: string;
  packageCondition?: string;
  plasticTare?: number;
  notes?: string;
  category?: string;
  supervisorApprovedBy?: string;
  supervisorApprovedAt?: string;
  ownerApprovedBy?: string;
  ownerApprovedAt?: string;
  rejectionReason?: string;
  lines: GoodsReceiptLineItem[];
  createdAt?: string;
}

export interface CreateGoodsReceiptInput {
  purchaseOrderId: string;
  receivedDate?: string;
  warehouseId?: string | null;
  deliveryNoteNo?: string;
  sugarCondition?: string;
  packageCondition?: string;
  plasticTare?: number;
  notes?: string;
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
  category?: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  supervisorApprovedBy?: string;
  supervisorApprovedAt?: string;
  ownerApprovedBy?: string;
  ownerApprovedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export interface CreatePurchaseInvoiceInput {
  supplierId: string;
  supplierName?: string;
  notes?: string;
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
  category?: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  supervisorApprovedBy?: string;
  supervisorApprovedAt?: string;
  ownerApprovedBy?: string;
  ownerApprovedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export interface CreateDownPaymentInput {
  purchaseOrderId: string;
  supplierId: string;
  supplierName?: string;
  notes?: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
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
  category?: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  supervisorApprovedBy?: string;
  supervisorApprovedAt?: string;
  ownerApprovedBy?: string;
  ownerApprovedAt?: string;
  rejectionReason?: string;
  totalAmount: number;
  creditedAmount: number;
  vatAmount: number;
  lines: PurchaseReturnLineItem[];
  createdAt?: string;
}

export interface CreatePurchaseReturnInput {
  goodsReceiptId: string;
  returnDate?: string;
  reason?: string;
  lines: PurchaseReturnLineInput[];
}

// Invoice receipts

export interface InvoiceReceiptLineInput {
  purchaseInvoiceId?: string | null;
  invoiceNo: string;
  amount: number;
  remarks?: string;
}

export interface InvoiceReceiptLineItem extends InvoiceReceiptLineInput {
  id: string;
}

export interface InvoiceReceiptItem {
  id: string;
  receiptNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  status: string;
  notes?: string;
  category?: string;
  supervisorApprovedBy?: string;
  supervisorApprovedAt?: string;
  ownerApprovedBy?: string;
  ownerApprovedAt?: string;
  rejectionReason?: string;
  lines: InvoiceReceiptLineItem[];
  createdAt?: string;
}

export interface CreateInvoiceReceiptInput {
  date?: string;
  supplierId: string;
  supplierName?: string;
  notes?: string;
  lines: InvoiceReceiptLineInput[];
}

export const procurementApi = {
  // Purchase requests
  listPurchaseRequests: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<PurchaseRequestItem[]>> => {
    return apiClient<PurchaseRequestItem[]>("/procurement/requests", { params });
  },
  getPurchaseRequest: async (id: string): Promise<ApiResponse<PurchaseRequestItem>> => {
    return apiClient<PurchaseRequestItem>(`/procurement/requests/${id}`);
  },
  createPurchaseRequest: async (data: CreatePurchaseRequestInput): Promise<ApiResponse<PurchaseRequestItem>> => {
    return apiClient<PurchaseRequestItem>("/procurement/requests", { method: "POST", body: JSON.stringify(data) });
  },
  updatePurchaseRequest: async (id: string, data: Partial<CreatePurchaseRequestInput>): Promise<ApiResponse<PurchaseRequestItem>> => {
    return apiClient<PurchaseRequestItem>(`/procurement/requests/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  submitPurchaseRequest: async (id: string): Promise<ApiResponse<PurchaseRequestItem>> => {
    return apiClient<PurchaseRequestItem>(`/procurement/requests/${id}/submit`, { method: "POST" });
  },
  approvePurchaseRequest: async (id: string, comments?: string): Promise<ApiResponse<PurchaseRequestItem>> => {
    return apiClient<PurchaseRequestItem>(`/procurement/requests/${id}/approve`, { method: "POST", body: JSON.stringify({ comments }) });
  },
  rejectPurchaseRequest: async (id: string, comments?: string): Promise<ApiResponse<PurchaseRequestItem>> => {
    return apiClient<PurchaseRequestItem>(`/procurement/requests/${id}/reject`, { method: "POST", body: JSON.stringify({ comments }) });
  },

  // Purchase orders
  getLastPOPrice: async (supplierId: string, productId: string): Promise<ApiResponse<{ supplierId: string; productId: string; lastPrice: number }>> => {
    return apiClient<{ supplierId: string; productId: string; lastPrice: number }>("/procurement/orders/last-price", { params: { supplierId, productId } });
  },
  listPurchaseOrders: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<PurchaseOrderItem[]>> => {
    return apiClient<PurchaseOrderItem[]>("/procurement/orders", { params });
  },
  getPurchaseOrder: async (id: string): Promise<ApiResponse<PurchaseOrderItem>> => {
    return apiClient<PurchaseOrderItem>(`/procurement/orders/${id}`);
  },
  createPurchaseOrder: async (data: CreatePurchaseOrderInput): Promise<ApiResponse<PurchaseOrderItem>> => {
    return apiClient<PurchaseOrderItem>("/procurement/orders", { method: "POST", body: JSON.stringify(data) });
  },
  updatePurchaseOrder: async (id: string, data: Partial<CreatePurchaseOrderInput>): Promise<ApiResponse<PurchaseOrderItem>> => {
    return apiClient<PurchaseOrderItem>(`/procurement/orders/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  submitPurchaseOrder: async (id: string): Promise<ApiResponse<PurchaseOrderItem>> => {
    return apiClient<PurchaseOrderItem>(`/procurement/orders/${id}/submit`, { method: "POST" });
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

  // Invoice receipts
  listInvoiceReceipts: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<InvoiceReceiptItem[]>> => {
    return apiClient<InvoiceReceiptItem[]>("/procurement/invoice-receipts", { params });
  },
  createInvoiceReceipt: async (data: CreateInvoiceReceiptInput): Promise<ApiResponse<InvoiceReceiptItem>> => {
    return apiClient<InvoiceReceiptItem>("/procurement/invoice-receipts", { method: "POST", body: JSON.stringify(data) });
  },
};
