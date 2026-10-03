import { apiClient, ApiResponse } from "./client";

export interface ApiKeyItem {
  id: string;
  companyId?: string | null;
  name: string;
  keyValue?: string;
  maskedKey: string;
  scopes: string;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface WebhookItem {
  id: string;
  companyId?: string | null;
  name: string;
  targetUrl: string;
  eventType: string;
  isActive: boolean;
  secret: string;
  createdAt: string;
}

export interface WebhookDeliveryItem {
  id: string;
  subscriptionId: string;
  eventType: string;
  payload: string;
  status: string;
  responseCode?: number | null;
  attemptedAt: string;
  responseBodySnippet?: string | null;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: string;
  companyId?: string | null;
}

export interface CreateWebhookInput {
  name: string;
  targetUrl: string;
  eventType: string;
  companyId?: string | null;
}

export interface UpdateWebhookInput {
  name?: string;
  targetUrl?: string;
  eventType?: string;
  isActive?: boolean;
}

export const EVENT_TYPES = [
  "sales.order.created",
  "inventory.stock.low",
  "procurement.po.approved",
  "finance.journal.posted",
  "hrm.employee.hired",
  "support.ticket.created",
];

export const integrationApi = {
  listApiKeys: async (): Promise<ApiResponse<ApiKeyItem[]>> => {
    return apiClient<ApiKeyItem[]>("/integration/api-keys");
  },
  createApiKey: async (data: CreateApiKeyInput): Promise<ApiResponse<ApiKeyItem>> => {
    return apiClient<ApiKeyItem>("/integration/api-keys", { method: "POST", body: JSON.stringify(data) });
  },
  revokeApiKey: async (id: string): Promise<ApiResponse<ApiKeyItem>> => {
    return apiClient<ApiKeyItem>(`/integration/api-keys/${id}/revoke`, { method: "PUT" });
  },
  listWebhooks: async (): Promise<ApiResponse<WebhookItem[]>> => {
    return apiClient<WebhookItem[]>("/integration/webhooks");
  },
  createWebhook: async (data: CreateWebhookInput): Promise<ApiResponse<WebhookItem>> => {
    return apiClient<WebhookItem>("/integration/webhooks", { method: "POST", body: JSON.stringify(data) });
  },
  updateWebhook: async (id: string, data: UpdateWebhookInput): Promise<ApiResponse<WebhookItem>> => {
    return apiClient<WebhookItem>(`/integration/webhooks/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  testWebhook: async (id: string): Promise<ApiResponse<WebhookDeliveryItem>> => {
    return apiClient<WebhookDeliveryItem>(`/integration/webhooks/${id}/test`, { method: "POST" });
  },
  listDeliveries: async (id: string): Promise<ApiResponse<WebhookDeliveryItem[]>> => {
    return apiClient<WebhookDeliveryItem[]>(`/integration/webhooks/${id}/deliveries`);
  },
};
