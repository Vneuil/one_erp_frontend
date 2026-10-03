import { apiClient, ApiResponse } from "./client";

export interface CreateCheckoutOrderInput {
  planCode: "spark" | "scale";
  billingCycle: "monthly" | "annual";
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface CreateCheckoutOrderResult {
  id: string;
  checkoutUrl: string;
}

export interface CheckoutOrderStatus {
  id: string;
  planCode: string;
  billingCycle: string;
  amountIdr: number;
  status: "pending" | "processing" | "paid" | "expired" | "failed";
}

export const checkoutApi = {
  // Public, unauthenticated - a prospective customer has no account yet.
  // The backend prices the plan/cycle itself; no amount is ever sent here.
  createOrder: async (data: CreateCheckoutOrderInput): Promise<ApiResponse<CreateCheckoutOrderResult>> => {
    return apiClient<CreateCheckoutOrderResult>("/checkout/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getOrderStatus: async (id: string): Promise<ApiResponse<CheckoutOrderStatus>> => {
    return apiClient<CheckoutOrderStatus>(`/checkout/orders/${id}`);
  },
};
