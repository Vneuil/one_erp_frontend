import { apiClient, ApiResponse } from "./client";

export type ParentType = "lead" | "deal" | "customer";

export interface InteractionItem {
  id: string;
  parentType: ParentType;
  parentId: string;
  kind: "call" | "meeting" | "email" | "whatsapp" | "visit" | "note";
  summary: string;
  occurredAt: string;
  createdByEmail?: string;
}

export interface SalesTaskItem {
  id: string;
  title: string;
  notes?: string;
  dueDate: string;
  priority: "low" | "normal" | "high";
  status: "open" | "done";
  assigneeEmail: string;
  parentType?: ParentType;
  parentId?: string;
  completedAt?: string | null;
  createdByEmail?: string;
}

export interface TaskBuckets {
  overdue: SalesTaskItem[];
  today: SalesTaskItem[];
  upcoming: SalesTaskItem[];
}

export interface CrmDocumentItem {
  id: string;
  parentType: ParentType;
  parentId: string;
  title: string;
  docType: string;
  fileRef: string;
  notes?: string;
  uploadedBy?: string;
  fileName?: string;
  fileSize?: number;
}

export interface CrmTagItem {
  id: string;
  name: string;
  color: string;
}

export interface CrmContactItem {
  id: string;
  name: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  companyName: string;
  leadId?: string | null;
  isPrimary: boolean;
  notes?: string;
}

export interface PipelineStageItem {
  id: string;
  key: string;
  name: string;
  position: number;
  probability: number;
  kind: "open" | "won" | "lost";
  isActive: boolean;
}

export interface LeadFormItem {
  id: string;
  key: string;
  name: string;
  source: string;
  defaultPic: string;
  successMessage: string;
  isActive: boolean;
  submissions: number;
}

export interface CrmAnalytics {
  from?: string;
  to?: string;
  funnel: { key: string; name: string; kind: string; count: number; value: number; weightedValue: number }[];
  totals: {
    open: number;
    openValue: number;
    weightedPipeline: number;
    won: number;
    wonValue: number;
    lost: number;
    lostValue: number;
    winRate: number;
    avgWonValue: number;
    avgCycleDays: number;
  };
  lostReasons: { reason: string; count: number; value: number }[];
  owners: { owner: string; open: number; openValue: number; won: number; wonValue: number; lost: number; winRate: number }[];
  leadSources: { source: string; leads: number; estimatedValue: number }[];
  tasks: { open: number; overdue: number; dueToday: number };
  staleDeals: { id: string; title: string; customer: string; value: number; owner: string; daysIdle: number }[];
}

const send = (method: string, data?: unknown) => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });

export const crmPlusApi = {
  interactions: (parentType: ParentType, parentId: string): Promise<ApiResponse<InteractionItem[]>> =>
    apiClient("/crm/interactions", { params: { parentType, parentId } }),
  logInteraction: (d: { parentType: ParentType; parentId: string; kind: string; summary: string; occurredAt?: string }): Promise<ApiResponse<InteractionItem>> =>
    apiClient("/crm/interactions", send("POST", d)),

  tasks: (params?: { status?: string; mine?: boolean; parentType?: ParentType; parentId?: string }): Promise<ApiResponse<SalesTaskItem[]>> =>
    apiClient("/crm/tasks", { params: { status: params?.status, mine: params?.mine ? "true" : undefined, parentType: params?.parentType, parentId: params?.parentId } }),
  reminders: (): Promise<ApiResponse<TaskBuckets>> => apiClient("/crm/tasks/reminders"),
  createTask: (d: { title: string; dueDate: string; notes?: string; priority?: string; assigneeEmail?: string; parentType?: ParentType; parentId?: string }): Promise<ApiResponse<SalesTaskItem>> =>
    apiClient("/crm/tasks", send("POST", d)),
  setTaskDone: (id: string, done: boolean): Promise<ApiResponse<SalesTaskItem>> => apiClient(`/crm/tasks/${id}/${done ? "done" : "reopen"}`, send("POST")),

  documents: (parentType: ParentType, parentId: string): Promise<ApiResponse<CrmDocumentItem[]>> =>
    apiClient("/crm/documents", { params: { parentType, parentId } }),
  addDocument: (d: { parentType: ParentType; parentId: string; title: string; docType: string; fileRef?: string; notes?: string }): Promise<ApiResponse<CrmDocumentItem>> =>
    apiClient("/crm/documents", send("POST", d)),
  uploadDocument: (d: { parentType: ParentType; parentId: string; title: string; docType: string; notes?: string }, file: File): Promise<ApiResponse<CrmDocumentItem>> => {
    const form = new FormData();
    form.append("file", file);
    form.append("parentType", d.parentType);
    form.append("parentId", d.parentId);
    form.append("title", d.title);
    form.append("docType", d.docType);
    if (d.notes) form.append("notes", d.notes);
    return apiClient("/crm/documents", { method: "POST", body: form });
  },
  deleteDocument: (id: string): Promise<ApiResponse<null>> => apiClient(`/crm/documents/${id}`, send("DELETE")),

  tags: (): Promise<ApiResponse<CrmTagItem[]>> => apiClient("/crm/tags"),
  createTag: (name: string, color?: string): Promise<ApiResponse<CrmTagItem>> => apiClient("/crm/tags", send("POST", { name, color })),
  deleteTag: (id: string): Promise<ApiResponse<null>> => apiClient(`/crm/tags/${id}`, send("DELETE")),
  tagsFor: (parentType: ParentType, parentId: string): Promise<ApiResponse<CrmTagItem[]>> => apiClient("/crm/tagged", { params: { parentType, parentId } }),
  setTag: (tagId: string, parentType: ParentType, parentId: string, on: boolean): Promise<ApiResponse<null>> =>
    apiClient(`/crm/tags/${tagId}/${on ? "assign" : "unassign"}`, send("PUT", { parentType, parentId })),
  taggedRecords: (tagId: string, parentType: ParentType): Promise<ApiResponse<string[]>> => apiClient(`/crm/tags/${tagId}/records`, { params: { parentType } }),

  contacts: (params?: { companyName?: string; leadId?: string }): Promise<ApiResponse<CrmContactItem[]>> => apiClient("/crm/contacts", { params }),
  createContact: (d: Partial<CrmContactItem> & { name: string }): Promise<ApiResponse<CrmContactItem>> => apiClient("/crm/contacts", send("POST", d)),
  updateContact: (id: string, d: Partial<CrmContactItem> & { name: string }): Promise<ApiResponse<CrmContactItem>> => apiClient(`/crm/contacts/${id}`, send("PUT", d)),
  deleteContact: (id: string): Promise<ApiResponse<null>> => apiClient(`/crm/contacts/${id}`, send("DELETE")),

  stages: (): Promise<ApiResponse<PipelineStageItem[]>> => apiClient("/crm/stages"),
  createStage: (d: { name: string; probability: number; kind?: string }): Promise<ApiResponse<PipelineStageItem>> => apiClient("/crm/stages", send("POST", d)),
  updateStage: (id: string, d: { name?: string; probability?: number; isActive?: boolean; position?: number }): Promise<ApiResponse<PipelineStageItem>> =>
    apiClient(`/crm/stages/${id}`, send("PUT", d)),
  deleteStage: (id: string): Promise<ApiResponse<null>> => apiClient(`/crm/stages/${id}`, send("DELETE")),

  leadForms: (): Promise<ApiResponse<LeadFormItem[]>> => apiClient("/crm/lead-forms"),
  createLeadForm: (d: { name: string; source?: string; defaultPic?: string; successMessage?: string }): Promise<ApiResponse<LeadFormItem>> =>
    apiClient("/crm/lead-forms", send("POST", d)),
  updateLeadForm: (id: string, d: Partial<Pick<LeadFormItem, "name" | "source" | "defaultPic" | "successMessage" | "isActive">>): Promise<ApiResponse<LeadFormItem>> =>
    apiClient(`/crm/lead-forms/${id}`, send("PUT", d)),
  deleteLeadForm: (id: string): Promise<ApiResponse<null>> => apiClient(`/crm/lead-forms/${id}`, send("DELETE")),

  startProject: (dealId: string): Promise<ApiResponse<{ projectId: string; projectCode: string }>> => apiClient(`/crm/deals/${dealId}/start-project`, send("POST")),
  analytics: (params?: { from?: string; to?: string }): Promise<ApiResponse<CrmAnalytics>> => apiClient("/crm/analytics", { params }),
};
