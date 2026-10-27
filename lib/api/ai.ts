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

export interface McpToken {
  id: string;
  name: string;
  hint: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const aiApi = {
  listMcpTokens: async (): Promise<ApiResponse<McpToken[]>> => apiClient<McpToken[]>("/ai/mcp-tokens"),

  createMcpToken: async (name: string): Promise<ApiResponse<{ token: McpToken; secret: string }>> =>
    apiClient<{ token: McpToken; secret: string }>("/ai/mcp-tokens", { method: "POST", body: JSON.stringify({ name }) }),

  revokeMcpToken: async (id: string): Promise<ApiResponse<null>> =>
    apiClient<null>(`/ai/mcp-tokens/${id}`, { method: "DELETE" }),

  getSettings: async (): Promise<ApiResponse<AiSettings>> => apiClient<AiSettings>("/ai/settings"),

  saveSettings: async (provider: string, model: string, apiKey: string): Promise<ApiResponse<AiSettings>> =>
    apiClient<AiSettings>("/ai/settings", { method: "PUT", body: JSON.stringify({ provider, model, apiKey }) }),

  chat: async (messages: AiChatMessage[], context: string): Promise<ApiResponse<{ reply: string }>> =>
    apiClient<{ reply: string }>("/ai/chat", { method: "POST", body: JSON.stringify({ messages, context }) }),
};
