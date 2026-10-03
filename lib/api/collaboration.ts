import { apiClient, apiClientDownload, ApiResponse } from "./client";

export interface ConversationItem {
  id: string;
  name: string;
  type: string;
  participantNames: string;
  createdAt?: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderName: string;
  content: string;
  attachmentName?: string | null;
  sentAt: string;
}

export interface CreateConversationInput {
  name: string;
  type: string;
  participantNames: string;
}

export interface SendMessageInput {
  senderName: string;
  content: string;
  attachmentName?: string | null;
}

export interface FolderItem {
  id: string;
  name: string;
  parentFolderId?: string | null;
  createdAt?: string;
}

export interface FileItem {
  id: string;
  folderId?: string | null;
  name: string;
  sizeBytes: number;
  mimeType: string;
  uploadedBy: string;
  createdAt?: string;
}

export interface FileDownloadItem extends FileItem {
  content: string;
}

export interface CreateFolderInput {
  name: string;
  parentFolderId?: string | null;
}

export interface UploadFileInput {
  folderId?: string | null;
  name: string;
  sizeBytes: number;
  mimeType: string;
  uploadedBy: string;
  file?: File;
}

export interface FileDownloadResult {
  blob: Blob;
  filename: string;
}

export interface ExportJobItem {
  id: string;
  datasetName: string;
  format: string;
  status: string;
  requestedBy: string;
  rowCount?: number | null;
  completedAt?: string | null;
  createdAt?: string;
}

export interface ExportJobDownloadItem extends ExportJobItem {
  content: string;
}

export interface CreateExportJobInput {
  datasetName: string;
  format: string;
  requestedBy: string;
}

export const collaborationApi = {
  listConversations: async (): Promise<ApiResponse<ConversationItem[]>> => {
    return apiClient<ConversationItem[]>("/collaboration/conversations");
  },
  createConversation: async (data: CreateConversationInput): Promise<ApiResponse<ConversationItem>> => {
    return apiClient<ConversationItem>("/collaboration/conversations", { method: "POST", body: JSON.stringify(data) });
  },
  listMessages: async (conversationId: string): Promise<ApiResponse<MessageItem[]>> => {
    return apiClient<MessageItem[]>(`/collaboration/conversations/${conversationId}/messages`);
  },
  sendMessage: async (conversationId: string, data: SendMessageInput): Promise<ApiResponse<MessageItem>> => {
    return apiClient<MessageItem>(`/collaboration/conversations/${conversationId}/messages`, { method: "POST", body: JSON.stringify(data) });
  },

  listFolders: async (): Promise<ApiResponse<FolderItem[]>> => {
    return apiClient<FolderItem[]>("/collaboration/folders");
  },
  createFolder: async (data: CreateFolderInput): Promise<ApiResponse<FolderItem>> => {
    return apiClient<FolderItem>("/collaboration/folders", { method: "POST", body: JSON.stringify(data) });
  },
  deleteFolder: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/collaboration/folders/${id}`, { method: "DELETE" });
  },
  listFiles: async (folderId?: string): Promise<ApiResponse<FileItem[]>> => {
    return apiClient<FileItem[]>("/collaboration/files", { params: folderId ? { folderId } : undefined });
  },
  uploadFile: async (data: UploadFileInput): Promise<ApiResponse<FileItem>> => {
    if (data.file) {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("uploadedBy", data.uploadedBy);
      if (data.folderId) formData.append("folderId", data.folderId);
      return apiClient<FileItem>("/collaboration/files", { method: "POST", body: formData });
    }
    return apiClient<FileItem>("/collaboration/files", { method: "POST", body: JSON.stringify(data) });
  },
  downloadFile: async (id: string): Promise<FileDownloadResult | ApiResponse<FileDownloadItem>> => {
    const result = await apiClientDownload<FileDownloadItem>(`/collaboration/files/${id}/download`);
    if ("blob" in result) {
      return { blob: result.blob, filename: result.filename || "download" };
    }
    return result;
  },
  deleteFile: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/collaboration/files/${id}`, { method: "DELETE" });
  },

  listExportJobs: async (): Promise<ApiResponse<ExportJobItem[]>> => {
    return apiClient<ExportJobItem[]>("/collaboration/export-jobs");
  },
  createExportJob: async (data: CreateExportJobInput): Promise<ApiResponse<ExportJobItem>> => {
    return apiClient<ExportJobItem>("/collaboration/export-jobs", { method: "POST", body: JSON.stringify(data) });
  },
  runExportJob: async (id: string): Promise<ApiResponse<ExportJobItem>> => {
    return apiClient<ExportJobItem>(`/collaboration/export-jobs/${id}/run`, { method: "POST" });
  },
  downloadExportJob: async (id: string): Promise<ApiResponse<ExportJobDownloadItem>> => {
    return apiClient<ExportJobDownloadItem>(`/collaboration/export-jobs/${id}/download`);
  },
};
