import { apiClient, ApiResponse } from "./client";

export type MarketplacePlatform = "tiktok_shop" | "shopee" | "blibli" | "lazada";

export interface MarketplaceConnection {
  platform: MarketplacePlatform;
  shopId: string;
  shopName: string;
  status: "connected" | "disconnected";
  connectedAt: string;
  accessExpiresAt: string;
  lastSyncAt?: string | null;
  lastSyncError?: string;
}

export interface MarketplaceSyncResult {
  platform: MarketplacePlatform;
  ordersFetched: number;
  ordersCreated: number;
  ordersSkipped: number;
  productsFetched?: number;
  productsCreated?: number;
  productsUpdated?: number;
}

export const marketplaceApi = {
  listConnections: async (): Promise<ApiResponse<MarketplaceConnection[]>> => {
    return apiClient<MarketplaceConnection[]>("/marketplace/connections");
  },
  getTikTokConnectUrl: async (): Promise<ApiResponse<{ authorizeUrl: string }>> => {
    return apiClient<{ authorizeUrl: string }>("/marketplace/tiktok/connect");
  },
  getShopeeConnectUrl: async (): Promise<ApiResponse<{ authorizeUrl: string }>> => {
    return apiClient<{ authorizeUrl: string }>("/marketplace/shopee/connect");
  },
  getLazadaConnectUrl: async (): Promise<ApiResponse<{ authorizeUrl: string }>> => {
    return apiClient<{ authorizeUrl: string }>("/marketplace/lazada/connect");
  },
  // Blibli has no OAuth redirect flow - the seller pastes their own
  // Business Partner Code / MTA Username / API Seller Key / Signature Key
  // (from their Blibli Seller Center account) into a form instead of being
  // redirected to Blibli's site.
  connectBlibli: async (payload: {
    businessPartnerCode: string;
    mtaUsername: string;
    apiSellerKey: string;
    signatureKey?: string;
  }): Promise<ApiResponse<MarketplaceConnection>> => {
    return apiClient<MarketplaceConnection>("/marketplace/blibli/connect", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  sync: async (platform: MarketplacePlatform): Promise<ApiResponse<MarketplaceSyncResult>> => {
    return apiClient<MarketplaceSyncResult>(`/marketplace/${platform}/sync`, { method: "POST" });
  },
  disconnect: async (platform: MarketplacePlatform): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/marketplace/${platform}/disconnect`, { method: "POST" });
  },
  // Marks a marketplace-synced Sales Order ready for pickup via that
  // marketplace's own fulfillment API, and records the resulting Delivery.
  markOrderReadyToShip: async (salesOrderId: string): Promise<ApiResponse<unknown>> => {
    return apiClient<unknown>(`/marketplace/orders/${salesOrderId}/ready-to-ship`, { method: "POST" });
  },
};
