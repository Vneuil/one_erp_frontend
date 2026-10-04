import { apiClient, ApiResponse } from "./client";

export type TaxDirection = "output" | "input";
export type TaxStatus = "draft" | "issued" | "cancelled" | "replaced";

export interface TaxInvoiceLine {
  id: string;
  position: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxBase: number;
  dppOtherValue: number;
  vatAmount: number;
}

export interface TaxInvoice {
  id: string;
  direction: TaxDirection;
  /** Internal document number. */
  number: string;
  /** Official Nomor Faktur Pajak. */
  taxNumber: string;
  status: TaxStatus;
  transactionCode: string;
  date: string;
  period: string;
  counterpartyName: string;
  counterpartyNpwp: string;
  counterpartyNik: string;
  counterpartyAddress: string;
  counterpartyEmail: string;
  sourceType: string;
  sourceId: string;
  sourceReference: string;
  taxBase: number;
  dppOtherValue: number;
  vatRate: number;
  vatAmount: number;
  replacesId?: string | null;
  revision: number;
  cancelReason?: string;
  notes?: string;
  issuedAt?: string | null;
  lines?: TaxInvoiceLine[];
}

export interface TaxSettings {
  taxpayerName: string;
  npwp: string;
  address: string;
  isPkp: boolean;
}

export interface SerialRange {
  id: string;
  prefix: string;
  start: number;
  end: number;
  next: number;
  width: number;
  isActive: boolean;
}

export interface UpdateTaxInvoiceInput {
  transactionCode?: string;
  date?: string;
  period?: string;
  counterpartyName?: string;
  counterpartyNpwp?: string;
  counterpartyNik?: string;
  counterpartyAddress?: string;
  counterpartyEmail?: string;
  taxNumber?: string;
  notes?: string;
}

export interface SalesBookRow {
  invoiceId: string;
  date: string;
  invoiceNumber: string;
  customerName: string;
  customerNpwp: string;
  customerNik: string;
  gross: number;
  discount: number;
  taxBase: number;
  vatAmount: number;
  total: number;
  taxInvoiceId?: string;
  taxInvoiceNumber?: string;
  taxNumber?: string;
  taxInvoiceStatus?: TaxStatus;
}

export interface SalesBook {
  from: string;
  to: string;
  rows: SalesBookRow[];
  count: number;
  gross: number;
  discount: number;
  taxBase: number;
  vatAmount: number;
  total: number;
  pendingFaktur: number;
}

export interface VATPeriod {
  period: string;
  outputVat: number;
  inputVat: number;
  net: number;
  outputWithoutFaktur: number;
  inputWithoutFaktur: number;
}

export interface VATSummary {
  from: string;
  to: string;
  periods: VATPeriod[];
  total: VATPeriod;
}

export interface CoretaxExport {
  from: string;
  to: string;
  headers: string[];
  rows: string[][];
  invoices: number;
  warnings: string[];
}

export const taxApi = {
  getSettings: async (): Promise<ApiResponse<TaxSettings>> => apiClient<TaxSettings>("/tax/settings"),
  updateSettings: async (data: TaxSettings): Promise<ApiResponse<TaxSettings>> =>
    apiClient<TaxSettings>("/tax/settings", { method: "PUT", body: JSON.stringify(data) }),

  listSerialRanges: async (): Promise<ApiResponse<SerialRange[]>> => apiClient<SerialRange[]>("/tax/serial-ranges"),
  createSerialRange: async (data: { prefix: string; start: number; end: number; width?: number }): Promise<ApiResponse<SerialRange>> =>
    apiClient<SerialRange>("/tax/serial-ranges", { method: "POST", body: JSON.stringify(data) }),
  setSerialRangeActive: async (id: string, isActive: boolean): Promise<ApiResponse<SerialRange>> =>
    apiClient<SerialRange>(`/tax/serial-ranges/${id}/active`, { method: "PUT", body: JSON.stringify({ isActive }) }),

  listInvoices: async (params?: { direction?: TaxDirection; status?: string; from?: string; to?: string; search?: string }): Promise<ApiResponse<TaxInvoice[]>> =>
    apiClient<TaxInvoice[]>("/tax/invoices", { params }),
  createFromSalesInvoice: async (data: { salesInvoiceId: string; transactionCode?: string; notes?: string }): Promise<ApiResponse<TaxInvoice>> =>
    apiClient<TaxInvoice>("/tax/invoices/from-sales-invoice", { method: "POST", body: JSON.stringify(data) }),
  createFromPurchaseInvoice: async (data: { purchaseInvoiceId: string; taxNumber?: string; date?: string; period?: string; notes?: string }): Promise<ApiResponse<TaxInvoice>> =>
    apiClient<TaxInvoice>("/tax/invoices/from-purchase-invoice", { method: "POST", body: JSON.stringify(data) }),
  updateDraft: async (id: string, data: UpdateTaxInvoiceInput): Promise<ApiResponse<TaxInvoice>> =>
    apiClient<TaxInvoice>(`/tax/invoices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  issue: async (id: string): Promise<ApiResponse<TaxInvoice>> => apiClient<TaxInvoice>(`/tax/invoices/${id}/issue`, { method: "POST" }),
  cancel: async (id: string, reason: string): Promise<ApiResponse<TaxInvoice>> =>
    apiClient<TaxInvoice>(`/tax/invoices/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
  replace: async (id: string): Promise<ApiResponse<TaxInvoice>> => apiClient<TaxInvoice>(`/tax/invoices/${id}/replace`, { method: "POST" }),
  setTaxNumber: async (id: string, taxNumber: string): Promise<ApiResponse<TaxInvoice>> =>
    apiClient<TaxInvoice>(`/tax/invoices/${id}/tax-number`, { method: "PUT", body: JSON.stringify({ taxNumber }) }),

  salesBook: async (from?: string, to?: string): Promise<ApiResponse<SalesBook>> =>
    apiClient<SalesBook>("/tax/reports/sales-book", { params: { from, to } }),
  vatSummary: async (from?: string, to?: string): Promise<ApiResponse<VATSummary>> =>
    apiClient<VATSummary>("/tax/reports/vat-summary", { params: { from, to } }),
  coretaxExport: async (from?: string, to?: string): Promise<ApiResponse<CoretaxExport>> =>
    apiClient<CoretaxExport>("/tax/invoices/coretax-export", { params: { from, to } }),
};
