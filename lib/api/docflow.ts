import { apiClient, apiClientDownload, ApiResponse } from "./client";

export interface FormItem {
  id: string;
  companyId?: string | null;
  title: string;
  description: string;
  fields: string;
  createdBy: string;
  status: string;
  responseCount: number;
  createdAt?: string;
}

export interface FormResponseItem {
  id: string;
  formId: string;
  submittedBy: string;
  answers: string;
  submittedAt: string;
  createdAt?: string;
}

export interface CreateFormInput {
  title: string;
  description?: string;
  fields?: string;
  createdBy: string;
  companyId?: string | null;
}

export interface SubmitResponseInput {
  submittedBy: string;
  answers: string;
}

export interface SignatureDocumentItem {
  id: string;
  companyId?: string | null;
  title: string;
  fileName: string;
  status: string;
  uploadedBy: string;
  uploadedAt: string;
  createdAt?: string;
}

export interface SignatureRequestItem {
  id: string;
  documentId: string;
  signerName: string;
  signerEmail: string;
  status: string;
  orderIndex: number;
  signedAt?: string | null;
  createdAt?: string;
}

export interface DocumentWithSigners extends SignatureDocumentItem {
  signers: SignatureRequestItem[];
}

export interface UploadDocumentInput {
  title: string;
  fileName: string;
  companyId?: string | null;
  file?: File;
}

export interface DocumentDownloadResult {
  blob: Blob;
  filename: string;
}

export interface AddSignerInput {
  signerName: string;
  signerEmail: string;
  orderIndex?: number;
}

export interface MeetingItem {
  id: string;
  companyId?: string | null;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  organizerName: string;
  meetingUrl: string;
  status: string;
  attendeeNames: string;
  createdAt?: string;
}

export interface MeetingNoteItem {
  id: string;
  meetingId: string;
  content: string;
  aiGenerated: boolean;
  createdAt?: string;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  organizerName: string;
  attendeeNames?: string;
  companyId?: string | null;
}

export const docflowApi = {
  // Forms
  listForms: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<FormItem[]>> => {
    return apiClient<FormItem[]>("/docflow/forms", { params });
  },
  getForm: async (id: string): Promise<ApiResponse<FormItem>> => {
    return apiClient<FormItem>(`/docflow/forms/${id}`);
  },
  createForm: async (data: CreateFormInput): Promise<ApiResponse<FormItem>> => {
    return apiClient<FormItem>("/docflow/forms", { method: "POST", body: JSON.stringify(data) });
  },
  publishForm: async (id: string): Promise<ApiResponse<FormItem>> => {
    return apiClient<FormItem>(`/docflow/forms/${id}/publish`, { method: "POST" });
  },
  submitResponse: async (id: string, data: SubmitResponseInput): Promise<ApiResponse<FormResponseItem>> => {
    return apiClient<FormResponseItem>(`/docflow/forms/${id}/responses`, { method: "POST", body: JSON.stringify(data) });
  },
  listResponses: async (id: string): Promise<ApiResponse<FormResponseItem[]>> => {
    return apiClient<FormResponseItem[]>(`/docflow/forms/${id}/responses`);
  },

  // Signatures
  listDocuments: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<SignatureDocumentItem[]>> => {
    return apiClient<SignatureDocumentItem[]>("/docflow/documents", { params });
  },
  getDocument: async (id: string): Promise<ApiResponse<DocumentWithSigners>> => {
    return apiClient<DocumentWithSigners>(`/docflow/documents/${id}`);
  },
  uploadDocument: async (data: UploadDocumentInput): Promise<ApiResponse<SignatureDocumentItem>> => {
    if (data.file) {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("title", data.title);
      if (data.companyId) formData.append("companyId", data.companyId);
      return apiClient<SignatureDocumentItem>("/docflow/documents", { method: "POST", body: formData });
    }
    return apiClient<SignatureDocumentItem>("/docflow/documents", { method: "POST", body: JSON.stringify(data) });
  },
  downloadDocument: async (id: string): Promise<DocumentDownloadResult | ApiResponse<SignatureDocumentItem>> => {
    const result = await apiClientDownload<SignatureDocumentItem>(`/docflow/documents/${id}/download`);
    if ("blob" in result) {
      return { blob: result.blob, filename: result.filename || "document" };
    }
    return result;
  },
  addSigner: async (documentId: string, data: AddSignerInput): Promise<ApiResponse<SignatureRequestItem>> => {
    return apiClient<SignatureRequestItem>(`/docflow/documents/${documentId}/signers`, { method: "POST", body: JSON.stringify(data) });
  },
  signRequest: async (requestId: string): Promise<ApiResponse<SignatureRequestItem>> => {
    return apiClient<SignatureRequestItem>(`/docflow/signature-requests/${requestId}/sign`, { method: "POST" });
  },
  declineRequest: async (requestId: string): Promise<ApiResponse<SignatureRequestItem>> => {
    return apiClient<SignatureRequestItem>(`/docflow/signature-requests/${requestId}/decline`, { method: "POST" });
  },

  // Meetings
  listMeetings: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<MeetingItem[]>> => {
    return apiClient<MeetingItem[]>("/docflow/meetings", { params });
  },
  getMeeting: async (id: string): Promise<ApiResponse<MeetingItem>> => {
    return apiClient<MeetingItem>(`/docflow/meetings/${id}`);
  },
  createMeeting: async (data: CreateMeetingInput): Promise<ApiResponse<MeetingItem>> => {
    return apiClient<MeetingItem>("/docflow/meetings", { method: "POST", body: JSON.stringify(data) });
  },
  updateMeetingStatus: async (id: string, status: string): Promise<ApiResponse<MeetingItem>> => {
    return apiClient<MeetingItem>(`/docflow/meetings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
  },
  addNote: async (id: string, content: string): Promise<ApiResponse<MeetingNoteItem>> => {
    return apiClient<MeetingNoteItem>(`/docflow/meetings/${id}/notes`, { method: "POST", body: JSON.stringify({ content }) });
  },
  listNotes: async (id: string): Promise<ApiResponse<MeetingNoteItem[]>> => {
    return apiClient<MeetingNoteItem[]>(`/docflow/meetings/${id}/notes`);
  },
  generateAiNote: async (id: string, audio?: File): Promise<ApiResponse<MeetingNoteItem>> => {
    if (audio) {
      const formData = new FormData();
      formData.append("audio", audio);
      return apiClient<MeetingNoteItem>(`/docflow/meetings/${id}/notes/generate`, { method: "POST", body: formData });
    }
    return apiClient<MeetingNoteItem>(`/docflow/meetings/${id}/notes/generate`, { method: "POST" });
  },
};
