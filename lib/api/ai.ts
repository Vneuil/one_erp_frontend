import { apiClient, ApiResponse } from "./client";

export interface AiProviderInfo {
  id: string;
  name: string;
  defaultModel: string;
}

export interface AiSettings {
  provider: string;
  model: string;
  hasApiKey: boolean;
  keyHint: string;
  providers: AiProviderInfo[];
}

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const aiApi = {
  getSettings: async (): Promise<ApiResponse<AiSettings>> => apiClient<AiSettings>("/ai/settings"),

  saveSettings: async (provider: string, model: string, apiKey: string): Promise<ApiResponse<AiSettings>> =>
    apiClient<AiSettings>("/ai/settings", { method: "PUT", body: JSON.stringify({ provider, model, apiKey }) }),

  chat: async (messages: AiChatMessage[], context: string): Promise<ApiResponse<{ reply: string }>> =>
    apiClient<{ reply: string }>("/ai/chat", { method: "POST", body: JSON.stringify({ messages, context }) }),
};
