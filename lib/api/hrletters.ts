import { apiClient, ApiResponse } from "./client";

export type LetterType = "contract" | "summons" | "reprimand" | "warning" | "termination" | "memo" | "overtime_order" | "mutation";
export type LetterStatus = "draft" | "issued" | "cancelled";

export interface LetterData {
  contractType?: "PKWT" | "PKWTT" | "Magang";
  position?: string;
  salary?: number;
  workplace?: string;
  probationMonths?: number;
  meetingDate?: string;
  meetingTime?: string;
  place?: string;
  reason?: string;
  violation?: string;
  validMonths?: number;
  consequence?: string;
  terminationReason?: string;
  lastWorkDay?: string;
  severance?: number;
  serviceAward?: number;
  compensationRights?: number;
  notes?: string;
  workDate?: string;
  startTime?: string;
  endTime?: string;
  tasks?: string;
  audienceAll?: boolean;
  audienceDepartment?: string;
  fromDepartment?: string;
  fromRole?: string;
  toDepartment?: string;
  toRole?: string;
  toManagerId?: string;
  applyToEmployee?: boolean;
}

export interface LetterRecipient {
  id: string;
  employeeId: string;
  name: string;
  nip: string;
  department: string;
}

export interface Letter {
  id: string;
  type: LetterType;
  status: LetterStatus;
  /** Assigned when the letter is issued. */
  number: string;
  date: string;
  subject: string;
  body: string;
  companyName: string;
  city: string;
  signerName: string;
  signerTitle: string;
  employeeId?: string;
  employeeName: string;
  nip: string;
  department: string;
  role: string;
  effectiveDate?: string;
  endDate?: string;
  level: number;
  data: LetterData;
  recipients?: LetterRecipient[];
  applied: boolean;
  appliedAt?: string;
  acknowledgedAt?: string;
  issuedAt?: string;
  cancelReason?: string;
}

export interface LetterInput {
  type: LetterType;
  date?: string;
  subject?: string;
  body?: string;
  companyName?: string;
  city?: string;
  signerName?: string;
  signerTitle?: string;
  employeeId?: string;
  effectiveDate?: string;
  endDate?: string;
  level?: number;
  data?: LetterData;
  recipientIds?: string[];
}

export interface EmployeeLetterSummary {
  employeeId: string;
  activeWarnings: Letter[];
  highestActiveLevel: number;
  mutations: Letter[];
  letters: Letter[];
  unacknowledged: number;
}

export interface ExpiringContract {
  letter: Letter;
  /** Negative when the contract has already ended. */
  daysLeft: number;
  status: "expiring" | "expired";
  employeeName: string;
}

export const hrLettersApi = {
  list: async (params?: { type?: LetterType; status?: LetterStatus; from?: string; to?: string; search?: string; employeeId?: string }): Promise<ApiResponse<Letter[]>> =>
    apiClient<Letter[]>("/hr-letters", { params }),
  get: async (id: string): Promise<ApiResponse<Letter>> => apiClient<Letter>(`/hr-letters/${id}`),
  create: async (data: LetterInput): Promise<ApiResponse<Letter>> => apiClient<Letter>("/hr-letters", { method: "POST", body: JSON.stringify(data) }),
  update: async (id: string, data: LetterInput): Promise<ApiResponse<Letter>> => apiClient<Letter>(`/hr-letters/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  preview: async (data: LetterInput): Promise<ApiResponse<{ body: string }>> => apiClient<{ body: string }>("/hr-letters/preview", { method: "POST", body: JSON.stringify(data) }),
  issue: async (id: string): Promise<ApiResponse<Letter>> => apiClient<Letter>(`/hr-letters/${id}/issue`, { method: "POST" }),
  cancel: async (id: string, reason: string): Promise<ApiResponse<Letter>> => apiClient<Letter>(`/hr-letters/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
  acknowledge: async (id: string): Promise<ApiResponse<Letter>> => apiClient<Letter>(`/hr-letters/${id}/acknowledge`, { method: "POST" }),
  apply: async (id: string): Promise<ApiResponse<Letter>> => apiClient<Letter>(`/hr-letters/${id}/apply`, { method: "POST" }),
  employeeSummary: async (employeeId: string): Promise<ApiResponse<EmployeeLetterSummary>> => apiClient<EmployeeLetterSummary>(`/hr-letters/employees/${employeeId}/summary`),
  expiringContracts: async (days = 60): Promise<ApiResponse<ExpiringContract[]>> => apiClient<ExpiringContract[]>("/hr-letters/contracts/expiring", { params: { days } }),
};
