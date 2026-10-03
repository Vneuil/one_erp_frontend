import { apiClient, ApiResponse } from "./client";

export interface TicketItem {
  id: string;
  companyId?: string | null;
  ticketNumber: string;
  subject: string;
  description: string;
  customerName: string;
  priority: string;
  status: string;
  category: string;
  assignedTo: string;
  slaDueAt: string;
  resolvedAt?: string | null;
  isOverdue: boolean;
  createdAt?: string;
}

export interface TicketReplyItem {
  id: string;
  ticketId: string;
  authorName: string;
  authorType: string;
  message: string;
  createdAt?: string;
}

export interface TicketSummary {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  overdueTickets: number;
  byPriority: Record<string, number>;
  avgResolutionHours: number;
}

export interface CreateTicketInput {
  subject: string;
  description?: string;
  customerName: string;
  priority: string;
  category: string;
  assignedTo?: string;
  companyId?: string | null;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  customerName?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
}

export interface ReplyInput {
  authorName: string;
  authorType: string;
  message: string;
}

export const supportApi = {
  listTickets: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<TicketItem[]>> => {
    return apiClient<TicketItem[]>("/support/tickets", { params });
  },
  getTicket: async (id: string): Promise<ApiResponse<TicketItem>> => {
    return apiClient<TicketItem>(`/support/tickets/${id}`);
  },
  createTicket: async (data: CreateTicketInput): Promise<ApiResponse<TicketItem>> => {
    return apiClient<TicketItem>("/support/tickets", { method: "POST", body: JSON.stringify(data) });
  },
  updateTicket: async (id: string, data: UpdateTicketInput): Promise<ApiResponse<TicketItem>> => {
    return apiClient<TicketItem>(`/support/tickets/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  updateStatus: async (id: string, status: string): Promise<ApiResponse<TicketItem>> => {
    return apiClient<TicketItem>(`/support/tickets/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
  },
  addReply: async (id: string, data: ReplyInput): Promise<ApiResponse<TicketReplyItem>> => {
    return apiClient<TicketReplyItem>(`/support/tickets/${id}/replies`, { method: "POST", body: JSON.stringify(data) });
  },
  listReplies: async (id: string): Promise<ApiResponse<TicketReplyItem[]>> => {
    return apiClient<TicketReplyItem[]>(`/support/tickets/${id}/replies`);
  },
  getSummary: async (): Promise<ApiResponse<TicketSummary>> => {
    return apiClient<TicketSummary>("/support/summary");
  },
};
