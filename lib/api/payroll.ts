import { apiClient, ApiResponse } from "./client";

export interface PayrollEntry {
  id: string;
  period: string;
  employeeId?: string | null;
  nip: string;
  employeeName: string;
  department: string;
  baseSalary: number;
  allowance: number;
  overtimePay: number;
  deductionTax: number;
  deductionCoop: number;
  deductionAbsence?: number;
  deductionCanteen?: number;
  deductionAdvance?: number;
  deductionLate?: number;
  unpaidDays?: number;
  lateCount?: number;
  takeHomePay: number;
  status: string;
  paymentBank: string;
  bankAccount: string;
  /** "manual" = PPh 21 typed in; "auto" = estimated by the backend from PTKP status. */
  taxMethod: "manual" | "auto";
  ptkpStatus?: string;
  createdAt?: string;
}

export interface CreatePayrollEntryInput {
  period: string;
  // employeeId is the preferred way to create an entry: the backend
  // auto-fills NIP/EmployeeName/Department/BaseSalary from the HRM record,
  // and DeductionCoop from the employee's active cooperative loans. Passing
  // a non-zero baseSalary/deductionCoop still overrides the auto-fill.
  employeeId?: string;
  nip?: string;
  employeeName?: string;
  department?: string;
  baseSalary?: number;
  allowance?: number;
  overtimePay?: number;
  deductionTax?: number;
  deductionCoop?: number;
  paymentBank?: string;
  bankAccount?: string;
  /** "auto" ignores deductionTax and estimates PPh 21. Defaults to "manual" on the server. */
  taxMethod?: "manual" | "auto";
}

export interface PayrollPolicy {
  workDaysPerMonth: number;
  latePenaltyPerIncident: number;
  deductUnpaidLeave: boolean;
}

export const payrollApi = {
  getPolicy: async (): Promise<ApiResponse<PayrollPolicy>> => apiClient<PayrollPolicy>("/payroll/policy"),
  updatePolicy: async (data: PayrollPolicy): Promise<ApiResponse<PayrollPolicy>> =>
    apiClient<PayrollPolicy>("/payroll/policy", { method: "PUT", body: JSON.stringify(data) }),

  listEntries: async (params?: {
    page?: number;
    perPage?: number;
    search?: string;
    period?: string;
  }): Promise<ApiResponse<PayrollEntry[]>> => {
    return apiClient<PayrollEntry[]>("/payroll/entries", { params });
  },

  createEntry: async (
    data: CreatePayrollEntryInput
  ): Promise<ApiResponse<PayrollEntry>> => {
    return apiClient<PayrollEntry>("/payroll/entries", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  calculatePeriod: async (
    period: string
  ): Promise<ApiResponse<PayrollEntry[]>> => {
    return apiClient<PayrollEntry[]>("/payroll/entries/calculate", {
      method: "POST",
      body: JSON.stringify({ period }),
    });
  },

  updateEntryStatus: async (
    id: string,
    status: string
  ): Promise<ApiResponse<PayrollEntry>> => {
    return apiClient<PayrollEntry>(`/payroll/entries/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
};
