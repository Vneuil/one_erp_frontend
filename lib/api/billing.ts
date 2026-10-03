import { apiClient, ApiResponse } from "./client";

export interface SubscriptionInfo {
  companyId: string;
  planDurationMonths: number;
  pricePerMonth: number;
  totalPrice: number;
  status: "pending_activation" | "trial" | "pending_payment" | "active" | "expired" | string;
  trialEndsAt?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface PaymentResult {
  id: string;
  amount: number;
  checkoutUrl: string;
  status: string;
}

export const billingApi = {
  getSubscription: (companyId: string) =>
    apiClient<SubscriptionInfo>(`/platform/subscriptions/${companyId}`),

  choosePlan: (companyId: string, planDurationMonths: number) =>
    apiClient<SubscriptionInfo>(`/platform/subscriptions/${companyId}/plan`, {
      method: "POST",
      body: JSON.stringify({ planDurationMonths }),
    }),

  createPayment: (companyId: string) =>
    apiClient<PaymentResult>(`/platform/subscriptions/${companyId}/payment`, {
      method: "POST",
    }),
};
