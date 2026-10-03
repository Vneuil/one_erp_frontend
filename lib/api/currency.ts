import { apiClient, ApiResponse } from "./client";

export interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
}

export interface ExchangeRateItem {
  id: string;
  currencyCode: string;
  rateDate: string;
  rateToBase: number;
  createdAt: string;
}

export interface ConvertResult {
  originalAmount: number;
  originalCurrency: string;
  baseAmount: number;
  baseCurrency: string;
  rateToBase: number;
  rateDate: string;
}

export const currencyApi = {
  list: async (): Promise<ApiResponse<CurrencyItem[]>> => apiClient<CurrencyItem[]>("/currencies"),

  create: async (code: string, name: string, symbol: string): Promise<ApiResponse<CurrencyItem>> =>
    apiClient<CurrencyItem>("/currencies", { method: "POST", body: JSON.stringify({ code, name, symbol }) }),

  remove: async (id: string): Promise<ApiResponse<null>> =>
    apiClient<null>(`/currencies/${id}`, { method: "DELETE" }),

  convert: async (amount: number, currency: string, asOfDate?: string): Promise<ApiResponse<ConvertResult>> =>
    apiClient<ConvertResult>("/currencies/convert", { method: "POST", body: JSON.stringify({ amount, currency, asOfDate }) }),

  listRates: async (currencyCode?: string): Promise<ApiResponse<ExchangeRateItem[]>> =>
    apiClient<ExchangeRateItem[]>("/exchange-rates", { params: currencyCode ? { currencyCode } : undefined }),

  setRate: async (currencyCode: string, rateToBase: number, rateDate?: string): Promise<ApiResponse<ExchangeRateItem>> =>
    apiClient<ExchangeRateItem>("/exchange-rates", { method: "POST", body: JSON.stringify({ currencyCode, rateToBase, rateDate }) }),
};
