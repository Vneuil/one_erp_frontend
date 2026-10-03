import { apiClient, ApiResponse } from "./client";

export interface PaymentTermItem {
  id: string;
  name: string;
  days: number;
}

export interface CustomerTypeItem {
  id: string;
  name: string;
}

export interface TaxRateItem {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
}

export const pricingApi = {
  listPaymentTerms: async (): Promise<ApiResponse<PaymentTermItem[]>> => apiClient<PaymentTermItem[]>("/payment-terms"),
  createPaymentTerm: async (name: string, days: number): Promise<ApiResponse<PaymentTermItem>> =>
    apiClient<PaymentTermItem>("/payment-terms", { method: "POST", body: JSON.stringify({ name, days }) }),
  updatePaymentTerm: async (id: string, name: string, days: number): Promise<ApiResponse<PaymentTermItem>> =>
    apiClient<PaymentTermItem>(`/payment-terms/${id}`, { method: "PUT", body: JSON.stringify({ name, days }) }),
  deletePaymentTerm: async (id: string): Promise<ApiResponse<null>> =>
    apiClient<null>(`/payment-terms/${id}`, { method: "DELETE" }),

  listCustomerTypes: async (): Promise<ApiResponse<CustomerTypeItem[]>> => apiClient<CustomerTypeItem[]>("/customer-types"),
  createCustomerType: async (name: string): Promise<ApiResponse<CustomerTypeItem>> =>
    apiClient<CustomerTypeItem>("/customer-types", { method: "POST", body: JSON.stringify({ name }) }),
  updateCustomerType: async (id: string, name: string): Promise<ApiResponse<CustomerTypeItem>> =>
    apiClient<CustomerTypeItem>(`/customer-types/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteCustomerType: async (id: string): Promise<ApiResponse<null>> =>
    apiClient<null>(`/customer-types/${id}`, { method: "DELETE" }),

  listTaxRates: async (): Promise<ApiResponse<TaxRateItem[]>> => apiClient<TaxRateItem[]>("/tax-rates"),
  createTaxRate: async (name: string, rate: number, isDefault: boolean): Promise<ApiResponse<TaxRateItem>> =>
    apiClient<TaxRateItem>("/tax-rates", { method: "POST", body: JSON.stringify({ name, rate, isDefault }) }),
  updateTaxRate: async (id: string, name: string, rate: number, isDefault: boolean): Promise<ApiResponse<TaxRateItem>> =>
    apiClient<TaxRateItem>(`/tax-rates/${id}`, { method: "PUT", body: JSON.stringify({ name, rate, isDefault }) }),
  deleteTaxRate: async (id: string): Promise<ApiResponse<null>> =>
    apiClient<null>(`/tax-rates/${id}`, { method: "DELETE" }),
};
