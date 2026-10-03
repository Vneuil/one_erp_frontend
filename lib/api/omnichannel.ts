import { apiClient, ApiResponse } from "./client";

export type OmnichannelChannel =
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "marketplace_shopee"
  | "marketplace_tiktok"
  | "manual";

export interface Conversation {
  id: string;
  channel: OmnichannelChannel;
  channelLabel: string;
  externalContactId: string;
  externalContactName: string;
  lastMessagePreview: string;
  lastMessageAt?: string | null;
  unreadCount: number;
  status: string;
}

export interface Message {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  sentAt: string;
  sentBy?: string;
}

export interface ConversationThread {
  conversation: Conversation;
  messages: Message[];
}

export type ConnectionScope = "tenant" | "company";

export interface ChannelConnection {
  channel: OmnichannelChannel;
  channelLabel: string;
  scope: ConnectionScope;
  phoneNumberId?: string;
  businessAccountId?: string;
  displayName?: string;
  status: string;
  connectedAt: string;
}

export const omnichannelApi = {
  listConversations: async (channel?: OmnichannelChannel): Promise<ApiResponse<Conversation[]>> => {
    return apiClient<Conversation[]>("/omnichannel/conversations", {
      params: channel ? { channel } : undefined,
    });
  },
  getThread: async (conversationId: string): Promise<ApiResponse<ConversationThread>> => {
    return apiClient<ConversationThread>(`/omnichannel/conversations/${conversationId}/messages`);
  },
  sendMessage: async (conversationId: string, content: string): Promise<ApiResponse<Message>> => {
    return apiClient<Message>(`/omnichannel/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
  listConnections: async (): Promise<ApiResponse<ChannelConnection[]>> => {
    return apiClient<ChannelConnection[]>("/omnichannel/connections");
  },
  // WhatsApp has no OAuth redirect flow - the tenant pastes their own
  // Phone Number ID / Access Token / Business Account ID (from their own
  // Meta WhatsApp Business Platform app) into a form instead, mirroring
  // marketplace's connectBlibli.
  connectWhatsApp: async (payload: {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId?: string;
    scope: ConnectionScope;
  }): Promise<ApiResponse<ChannelConnection>> => {
    return apiClient<ChannelConnection>("/omnichannel/connections/whatsapp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  disconnectChannel: async (channel: OmnichannelChannel): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/omnichannel/connections/${channel}/disconnect`, { method: "POST" });
  },
};
