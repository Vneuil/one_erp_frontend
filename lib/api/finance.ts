import { apiClient, ApiResponse } from "./client";

// Accounts

export interface AccountItem {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string | null;
  isActive: boolean;
  /** Report category of a revenue/expense account: marketing | admin_general | non_operating | cogs. */
  category?: string;
  balance: number;
  currency: string;
  status: string;
  createdAt?: string;
}

export interface CreateAccountInput {
  code: string;
  name: string;
  type: string;
  parentId?: string | null;
  isActive?: boolean;
  category?: string;
}

// Journal entries

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalLineItem extends JournalLineInput {
  id: string;
}

export interface JournalEntryItem {
  id: string;
  entryNumber: string;
  date: string;
  memo: string;
  sourceDoc: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLineItem[];
  createdAt?: string;
}

export interface CreateJournalEntryInput {
  entryNumber?: string;
  date?: string;
  memo?: string;
  sourceDoc?: string;
  lines: JournalLineInput[];
}

// Payables

export interface PayableItem {
  id: string;
  supplierId?: string | null;
  vendorName: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  totalInvoice: number;
  paidAmount: number;
  outstanding: number;
  paymentTerms: string;
  status: string;
  /** Set when generated from a purchase invoice. */
  sourceDoc?: string;
  createdAt?: string;
}

export interface CreatePayableInput {
  supplierId?: string | null;
  vendorName: string;
  invoiceNo?: string;
  issueDate?: string;
  dueDate?: string;
  totalInvoice: number;
  paymentTerms?: string;
}

// Receivables

export interface ReceivableItem {
  id: string;
  customerId?: string | null;
  customerName: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  totalInvoice: number;
  paidAmount: number;
  outstanding: number;
  aging: string;
  status: string;
  /** Set when generated from a sales invoice. */
  sourceDoc?: string;
  createdAt?: string;
}

export interface CreateReceivableInput {
  customerId?: string | null;
  customerName: string;
  invoiceNo?: string;
  issueDate?: string;
  dueDate?: string;
  totalInvoice: number;
}

// Petty cash

export interface PettyCashFundItem {
  id: string;
  branchName: string;
  custodian: string;
  maxFloat: number;
  currentBalance: number;
  totalSpentThisMonth: number;
  lastReplenished: string;
  status: string;
  createdAt?: string;
}

export interface CreatePettyCashFundInput {
  branchName: string;
  custodian?: string;
  maxFloat: number;
}

export interface PettyCashTransactionItem {
  id: string;
  fundId: string;
  type: "in" | "out";
  amount: number;
  description: string;
  date: string;
  approvalStatus: string;
  createdByEmail?: string;
  createdAt?: string;
}

export interface CreatePettyCashTransactionInput {
  type: "in" | "out";
  amount: number;
  description?: string;
}

// Budgets

export interface BudgetItem {
  id: string;
  department: string;
  accountCategory: string;
  accountId?: string | null;
  period: string;
  allocatedBudget: number;
  actualSpent: number;
  variance: number;
  utilizationRate: number;
  status: string;
  createdAt?: string;
}

export interface CreateBudgetInput {
  department: string;
  accountCategory: string;
  accountId?: string | null;
  period: string;
  allocatedBudget: number;
}

// Reports

export interface TrialBalanceLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceReport {
  asOf: string;
  lines: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
}

export interface ProfitLossReport {
  from: string;
  to: string;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpense: number;
  netProfit: number;
}

export interface BalanceSheetReport {
  asOf: string;
  assets: number;
  liabilities: number;
  equity: number;
  /** Cumulative revenue minus expenses up to the report date. */
  retainedEarnings?: number;
  totalLiabilitiesAndEquity: number;
}

export interface CashFlowReport {
  from: string;
  to: string;
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
}

export interface AgingBucket {
  bucket: string;
  amount: number;
}

export interface AgingReport {
  asOf: string;
  buckets: AgingBucket[];
  total: number;
}

export interface CapitalTransactionItem {
  id: string;
  type: "injection" | "drawing";
  ownerName: string;
  amount: number;
  date: string;
  description?: string;
  paymentAccountCode: string;
  posted: boolean;
  createdByEmail?: string;
}

export interface OtherIncomeItem {
  id: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
  paymentAccountCode: string;
  posted: boolean;
}

export interface FinancialInsight {
  rule: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  refs?: string[];
}

// Cash / bank vouchers

export interface CashVoucherLineInput {
  accountCode: string;
  description?: string;
  amount: number;
}

export interface CashVoucherLine extends CashVoucherLineInput {
  id: string;
}

export interface CashVoucherItem {
  id: string;
  number: string;
  type: "receipt" | "payment";
  date: string;
  cashAccountCode: string;
  counterparty: string;
  description: string;
  total: number;
  posted: boolean;
  lines: CashVoucherLine[];
}

export interface CreateCashVoucherInput {
  type: "receipt" | "payment";
  date?: string;
  cashAccountCode?: string;
  counterparty?: string;
  description?: string;
  lines: CashVoucherLineInput[];
}

// General ledger, cash book, expense breakdowns

export interface LedgerLine {
  date: string;
  entryNumber: string;
  memo: string;
  description: string;
  sourceDoc: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerAccount {
  accountId: string;
  code: string;
  name: string;
  type: string;
  openingBalance: number;
  lines: LedgerLine[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export interface CashBookDay {
  date: string;
  opening: number;
  in: number;
  out: number;
  closing: number;
}

export interface GeneralLedgerReport {
  from: string;
  to: string;
  accounts: LedgerAccount[];
  days?: CashBookDay[];
}

export interface AmountLine {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface ExpenseGroup {
  category: string;
  label: string;
  lines: AmountLine[];
  total: number;
}

export interface ExpenseBreakdownReport {
  from: string;
  to: string;
  groups: ExpenseGroup[];
  total: number;
}

export interface NonOperatingReport {
  from: string;
  to: string;
  income: AmountLine[];
  expenses: AmountLine[];
  totalIncome: number;
  totalExpenses: number;
  net: number;
}

export const financeApi = {
  insights: async (from?: string): Promise<ApiResponse<FinancialInsight[]>> =>
    apiClient<FinancialInsight[]>("/finance/reports/insights", { params: { from } }),

  // Accounts
  listAccounts: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<AccountItem[]>> => {
    return apiClient<AccountItem[]>("/finance/accounts", { params });
  },
  createAccount: async (data: CreateAccountInput): Promise<ApiResponse<AccountItem>> => {
    return apiClient<AccountItem>("/finance/accounts", { method: "POST", body: JSON.stringify(data) });
  },
  updateAccount: async (id: string, data: Partial<CreateAccountInput>): Promise<ApiResponse<AccountItem>> => {
    return apiClient<AccountItem>(`/finance/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  // Journal entries
  listJournalEntries: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<JournalEntryItem[]>> => {
    return apiClient<JournalEntryItem[]>("/finance/journal-entries", { params });
  },
  createJournalEntry: async (data: CreateJournalEntryInput): Promise<ApiResponse<JournalEntryItem>> => {
    return apiClient<JournalEntryItem>("/finance/journal-entries", { method: "POST", body: JSON.stringify(data) });
  },
  postJournalEntry: async (id: string): Promise<ApiResponse<JournalEntryItem>> => {
    return apiClient<JournalEntryItem>(`/finance/journal-entries/${id}/post`, { method: "POST" });
  },
  reverseJournalEntry: async (id: string): Promise<ApiResponse<JournalEntryItem>> => {
    return apiClient<JournalEntryItem>(`/finance/journal-entries/${id}/reverse`, { method: "POST" });
  },

  // Payables
  listPayables: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<PayableItem[]>> => {
    return apiClient<PayableItem[]>("/finance/payables", { params });
  },
  createPayable: async (data: CreatePayableInput): Promise<ApiResponse<PayableItem>> => {
    return apiClient<PayableItem>("/finance/payables", { method: "POST", body: JSON.stringify(data) });
  },
  recordPayablePayment: async (id: string, amount: number): Promise<ApiResponse<PayableItem>> => {
    return apiClient<PayableItem>(`/finance/payables/${id}/payments`, { method: "POST", body: JSON.stringify({ amount }) });
  },
  apAging: async (): Promise<ApiResponse<AgingReport>> => {
    return apiClient<AgingReport>("/finance/payables/aging");
  },

  // Receivables
  listReceivables: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<ReceivableItem[]>> => {
    return apiClient<ReceivableItem[]>("/finance/receivables", { params });
  },
  createReceivable: async (data: CreateReceivableInput): Promise<ApiResponse<ReceivableItem>> => {
    return apiClient<ReceivableItem>("/finance/receivables", { method: "POST", body: JSON.stringify(data) });
  },
  recordReceivablePayment: async (id: string, amount: number): Promise<ApiResponse<ReceivableItem>> => {
    return apiClient<ReceivableItem>(`/finance/receivables/${id}/payments`, { method: "POST", body: JSON.stringify({ amount }) });
  },
  arAging: async (): Promise<ApiResponse<AgingReport>> => {
    return apiClient<AgingReport>("/finance/receivables/aging");
  },

  // Petty cash
  listPettyCashFunds: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<PettyCashFundItem[]>> => {
    return apiClient<PettyCashFundItem[]>("/finance/petty-cash", { params });
  },
  createPettyCashFund: async (data: CreatePettyCashFundInput): Promise<ApiResponse<PettyCashFundItem>> => {
    return apiClient<PettyCashFundItem>("/finance/petty-cash", { method: "POST", body: JSON.stringify(data) });
  },
  createPettyCashTransaction: async (fundId: string, data: CreatePettyCashTransactionInput): Promise<ApiResponse<PettyCashFundItem>> => {
    return apiClient<PettyCashFundItem>(`/finance/petty-cash/${fundId}/transactions`, { method: "POST", body: JSON.stringify(data) });
  },
  listPettyCashTransactions: async (fundId: string): Promise<ApiResponse<PettyCashTransactionItem[]>> => {
    return apiClient<PettyCashTransactionItem[]>(`/finance/petty-cash/${fundId}/transactions`);
  },
  approvePettyCashTransaction: async (fundId: string, txId: string): Promise<ApiResponse<PettyCashFundItem>> => {
    return apiClient<PettyCashFundItem>(`/finance/petty-cash/${fundId}/transactions/${txId}/approve`, { method: "POST" });
  },
  rejectPettyCashTransaction: async (fundId: string, txId: string): Promise<ApiResponse<PettyCashFundItem>> => {
    return apiClient<PettyCashFundItem>(`/finance/petty-cash/${fundId}/transactions/${txId}/reject`, { method: "POST" });
  },

  // Budgets
  listBudgets: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<BudgetItem[]>> => {
    return apiClient<BudgetItem[]>("/finance/budgets", { params });
  },
  updateBudget: async (id: string, data: { department?: string; accountCategory?: string; allocatedBudget?: number }): Promise<ApiResponse<BudgetItem>> => {
    return apiClient<BudgetItem>(`/finance/budgets/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  deleteBudget: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/finance/budgets/${id}`, { method: "DELETE" });
  },
  createBudget: async (data: CreateBudgetInput): Promise<ApiResponse<BudgetItem>> => {
    return apiClient<BudgetItem>("/finance/budgets", { method: "POST", body: JSON.stringify(data) });
  },

  // Reports
  trialBalance: async (asOf?: string): Promise<ApiResponse<TrialBalanceReport>> => {
    return apiClient<TrialBalanceReport>("/finance/reports/trial-balance", { params: { asOf } });
  },
  profitAndLoss: async (from?: string, to?: string): Promise<ApiResponse<ProfitLossReport>> => {
    return apiClient<ProfitLossReport>("/finance/reports/profit-loss", { params: { from, to } });
  },
  balanceSheet: async (asOf?: string): Promise<ApiResponse<BalanceSheetReport>> => {
    return apiClient<BalanceSheetReport>("/finance/reports/balance-sheet", { params: { asOf } });
  },
  cashFlow: async (from?: string, to?: string): Promise<ApiResponse<CashFlowReport>> => {
    return apiClient<CashFlowReport>("/finance/reports/cash-flow", { params: { from, to } });
  },

  // Owner capital & other income
  listCapital: async (params?: { type?: string; period?: string }): Promise<ApiResponse<CapitalTransactionItem[]>> =>
    apiClient<CapitalTransactionItem[]>("/finance/capital", { params }),
  recordCapital: async (
    kind: "injection" | "drawing",
    data: { ownerName: string; amount: number; date?: string; description?: string; paymentAccountCode?: string }
  ): Promise<ApiResponse<CapitalTransactionItem>> =>
    apiClient<CapitalTransactionItem>(`/finance/capital/${kind === "injection" ? "injections" : "drawings"}`, { method: "POST", body: JSON.stringify(data) }),
  listOtherIncome: async (params?: { category?: string; period?: string }): Promise<ApiResponse<OtherIncomeItem[]>> =>
    apiClient<OtherIncomeItem[]>("/finance/other-income", { params }),
  recordOtherIncome: async (
    data: { category: string; amount: number; date?: string; description?: string; paymentAccountCode?: string }
  ): Promise<ApiResponse<OtherIncomeItem>> =>
    apiClient<OtherIncomeItem>("/finance/other-income", { method: "POST", body: JSON.stringify(data) }),

  // Cash / bank vouchers
  listCashVouchers: async (params?: { type?: string; from?: string; to?: string }): Promise<ApiResponse<CashVoucherItem[]>> =>
    apiClient<CashVoucherItem[]>("/finance/cash-vouchers", { params }),
  createCashVoucher: async (data: CreateCashVoucherInput): Promise<ApiResponse<CashVoucherItem>> =>
    apiClient<CashVoucherItem>("/finance/cash-vouchers", { method: "POST", body: JSON.stringify(data) }),

  // Statutory reports
  generalLedger: async (params?: { accountId?: string; from?: string; to?: string }): Promise<ApiResponse<GeneralLedgerReport>> =>
    apiClient<GeneralLedgerReport>("/finance/reports/general-ledger", { params }),
  cashBook: async (params?: { accountCode?: string; from?: string; to?: string }): Promise<ApiResponse<GeneralLedgerReport>> =>
    apiClient<GeneralLedgerReport>("/finance/reports/cash-book", { params }),
  expenseBreakdown: async (from?: string, to?: string): Promise<ApiResponse<ExpenseBreakdownReport>> =>
    apiClient<ExpenseBreakdownReport>("/finance/reports/expense-breakdown", { params: { from, to } }),
  nonOperating: async (from?: string, to?: string): Promise<ApiResponse<NonOperatingReport>> =>
    apiClient<NonOperatingReport>("/finance/reports/non-operating", { params: { from, to } }),
};
