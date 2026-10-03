import { apiClient, ApiResponse } from "./client";

export interface PayslipLine {
  label: string;
  amount: number;
  note?: string;
}

export interface PayslipOvertime {
  date: string;
  minutes: number;
  amount: number;
}

export interface Payslip {
  entryId: string;
  period: string;
  employeeName: string;
  nip: string;
  department: string;
  status: string;
  bank?: string;
  accountMasked?: string;
  earnings: PayslipLine[];
  gross: number;
  deductions: PayslipLine[];
  totalDeductions: number;
  overtime: PayslipOvertime[];
  overtimeHours: number;
  takeHomePay: number;
}

export interface PayslipSummary {
  entryId: string;
  period: string;
  status: string;
  takeHomePay: number;
}

export const payslipApi = {
  mine: (): Promise<ApiResponse<PayslipSummary[]>> => apiClient("/hr-self/payslips"),
  get: (id: string): Promise<ApiResponse<Payslip>> => apiClient(`/hr-self/payslips/${id}`),
  /** HR route: any entry, behind the payroll permission. */
  getAsHr: (id: string): Promise<ApiResponse<Payslip>> => apiClient(`/payroll/entries/${id}/payslip`),
};
