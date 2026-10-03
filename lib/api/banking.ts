import { apiClient, ApiResponse } from "./client";

// Bank accounts

export interface BankAccountItem {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  currency: string;
  currentBalance: number;
  branch: string;
  linkedGlAccountId?: string | null;
  status: string;
  unreconciledCount: number;
  createdAt?: string;
}

export interface CreateBankAccountInput {
  bankName: string;
  accountNumber: string;
  accountHolder?: string;
  currency?: string;
  branch?: string;
  linkedGlAccountId?: string | null;
  status?: string;
}

// Statement lines

export interface StatementLineItem {
  id: string;
  bankAccountId: string;
  transactionDate: string;
  description: string;
  amount: number;
  isReconciled: boolean;
  reconciledAt?: string | null;
  matchedJournalLineId?: string | null;
  createdAt?: string;
}

export interface CreateStatementLineInput {
  transactionDate?: string;
  description?: string;
  amount: number;
}

// Reconciliation

export interface ReconcileSummary {
  matchedCount: number;
  unreconciledCount: number;
}

export const bankingApi = {
  // Bank accounts
  listBankAccounts: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<BankAccountItem[]>> => {
    return apiClient<BankAccountItem[]>("/banking/accounts", { params });
  },
  createBankAccount: async (data: CreateBankAccountInput): Promise<ApiResponse<BankAccountItem>> => {
    return apiClient<BankAccountItem>("/banking/accounts", { method: "POST", body: JSON.stringify(data) });
  },
  getBankAccount: async (id: string): Promise<ApiResponse<BankAccountItem>> => {
    return apiClient<BankAccountItem>(`/banking/accounts/${id}`);
  },

  // Statement lines
  listStatementLines: async (bankAccountId: string, params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<StatementLineItem[]>> => {
    return apiClient<StatementLineItem[]>(`/banking/accounts/${bankAccountId}/statement-lines`, { params });
  },
  importStatementLines: async (bankAccountId: string, lines: CreateStatementLineInput[]): Promise<ApiResponse<StatementLineItem[]>> => {
    return apiClient<StatementLineItem[]>(`/banking/accounts/${bankAccountId}/statement-lines/import`, {
      method: "POST",
      body: JSON.stringify({ lines }),
    });
  },

  // Reconciliation
  autoReconcile: async (bankAccountId: string): Promise<ApiResponse<ReconcileSummary>> => {
    return apiClient<ReconcileSummary>(`/banking/accounts/${bankAccountId}/reconcile`, { method: "POST" });
  },
  manualMatch: async (statementLineId: string, journalLineId: string): Promise<ApiResponse<StatementLineItem>> => {
    return apiClient<StatementLineItem>(`/banking/statement-lines/${statementLineId}/match`, {
      method: "POST",
      body: JSON.stringify({ journalLineId }),
    });
  },
};
