import { apiClient, apiClientDownload, ApiResponse } from "./client";

export type RequestStatus = "pending" | "approved" | "rejected";

export interface CorrectionItem {
  id: string;
  nip: string;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  reason: string;
  status: RequestStatus;
  requestedByEmail?: string;
  decidedBy?: string;
}

export interface ShiftItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface ShiftAssignmentItem {
  id: string;
  nip: string;
  date: string;
  shiftId: string;
}

export interface ShiftChangeItem {
  id: string;
  nip: string;
  employeeName: string;
  date: string;
  toShiftId: string;
  reason: string;
  status: RequestStatus;
  requestedByEmail?: string;
}

export interface OvertimeItem {
  id: string;
  nip: string;
  employeeName: string;
  date: string;
  minutes: number;
  source: "manual" | "auto";
  reason: string;
  status: RequestStatus;
  requestedByEmail?: string;
}

export interface EmployeeDocumentItem {
  id: string;
  employeeId: string;
  title: string;
  docType: string;
  fileRef: string;
  expiresOn?: string;
  notes?: string;
  /** Set when a file was uploaded (otherwise fileRef may hold a link). */
  fileName?: string;
  fileSize?: number;
}

export interface FeedbackSummary {
  count: number;
  overall: Record<string, number>;
  byRelationship: Record<string, Record<string, number>>;
  comments: string[];
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  department?: string;
  pinned: boolean;
  expiresOn?: string;
  createdByEmail?: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link?: string;
  readAt?: string | null;
  createdAt?: string;
}

export interface AttendanceSummaryRow {
  nip: string;
  employeeName: string;
  daysPresent: number;
  lateCount: number;
  workMinutes: number;
  corrections: number;
}

export interface EvidenceItem {
  id: string;
  claimId: string;
  title: string;
  fileRef: string;
  amount: number;
  uploadedByEmail?: string;
}

export interface CanteenItemT {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface CanteenOrderItem {
  id: string;
  nip: string;
  employeeName: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  date: string;
  status: "ordered" | "cancelled";
}

export interface CanteenTotal {
  nip: string;
  employeeName: string;
  orders: number;
  amount: number;
}

export interface VisitStopItem {
  id: string;
  nip: string;
  employeeName: string;
  date: string;
  seq: number;
  customerName: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: "planned" | "visited" | "skipped";
  checkInAt?: string;
  distanceM?: number;
  note?: string;
}

export interface VisitPlan {
  date: string;
  stops: VisitStopItem[];
  visited: number;
  plannedRouteMeters: number;
}

export interface CashAdvanceItem {
  id: string;
  nip: string;
  employeeName: string;
  amount: number;
  installments: number;
  startPeriod: string;
  reason: string;
  status: RequestStatus;
  requestedByEmail?: string;
  decidedBy?: string;
  monthly: number;
  outstanding: number;
  settled: boolean;
}

const json = (data: unknown) => ({ method: "POST", body: JSON.stringify(data) });

export interface TeamRequests {
  leaves: { id: string; employeeId: string; employeeName: string; type: string; startDate: string; endDate: string; totalDays: number; reason: string }[];
  corrections: CorrectionItem[];
  overtime: OvertimeItem[];
  shiftChanges: ShiftChangeItem[];
  advances: CashAdvanceItem[];
  total: number;
}
export type TeamKind = "leave" | "correction" | "overtime" | "shift-change" | "cash-advance";

export interface HRDashboard {
  asOf: string;
  headcount: number;
  byStatus: { name: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  byContract: { name: string; count: number }[];
  newJoiners30d: number;
  presentToday: number;
  lateToday: number;
  notClockedInYet: number;
  lateIncidentsMonth: number;
  overtimeHoursMonth: number;
  pending: { leaves: number; corrections: number; overtime: number; shiftChanges: number; advances: number; total: number };
  expiringDocuments: { documentId: string; employeeId: string; employeeName: string; title: string; docType: string; expiresOn: string; daysLeft: number }[];
}

export const hropsApi = {
  dashboard: (): Promise<ApiResponse<HRDashboard>> => apiClient("/hrm/dashboard"),
  uploadDocument: (employeeId: string, d: { title: string; docType: string; expiresOn?: string; notes?: string }, file: File): Promise<ApiResponse<EmployeeDocumentItem>> => {
    const form = new FormData();
    form.append("file", file);
    form.append("title", d.title);
    form.append("docType", d.docType);
    if (d.expiresOn) form.append("expiresOn", d.expiresOn);
    if (d.notes) form.append("notes", d.notes);
    return apiClient(`/hrm/employees/${employeeId}/documents`, { method: "POST", body: form });
  },
  // Line-manager approval (no HR approval right needed; limited to the caller's reports)
  teamRequests: (): Promise<ApiResponse<TeamRequests>> => apiClient("/hr-self/team/requests"),
  decideTeam: (kind: TeamKind, id: string, approve: boolean): Promise<ApiResponse<null>> =>
    apiClient(`/hr-self/team/${kind}/${id}/${approve ? "approve" : "reject"}`, json({})),
  // Cash advances (kasbon)
  myAdvances: (): Promise<ApiResponse<CashAdvanceItem[]>> => apiClient("/hr-self/cash-advances"),
  requestAdvance: (d: { amount: number; installments: number; startPeriod: string; reason?: string; nip?: string }): Promise<ApiResponse<CashAdvanceItem>> =>
    apiClient("/hr-self/cash-advances", json(d)),
  allAdvances: (status?: string): Promise<ApiResponse<CashAdvanceItem[]>> => apiClient("/hrm/cash-advances", { params: status ? { status } : undefined }),
  decideAdvance: (id: string, approve: boolean): Promise<ApiResponse<CashAdvanceItem>> => apiClient(`/hrm/cash-advances/${id}/${approve ? "approve" : "reject"}`, json({})),

  // Self-service (own records)
  requestCorrection: (d: { nip?: string; date: string; clockIn: string; clockOut?: string; reason: string }): Promise<ApiResponse<CorrectionItem>> =>
    apiClient("/hr-self/corrections", json(d)),
  myCorrections: (): Promise<ApiResponse<CorrectionItem[]>> => apiClient("/hr-self/corrections"),
  requestOvertime: (d: { nip?: string; date: string; minutes: number; reason?: string }): Promise<ApiResponse<OvertimeItem>> =>
    apiClient("/hr-self/overtime", json(d)),
  myOvertime: (period?: string): Promise<ApiResponse<OvertimeItem[]>> => apiClient("/hr-self/overtime", { params: { period } }),
  shifts: (): Promise<ApiResponse<ShiftItem[]>> => apiClient("/hr-self/shifts"),
  mySchedule: (period: string): Promise<ApiResponse<ShiftAssignmentItem[]>> => apiClient("/hr-self/schedule", { params: { period } }),
  requestShiftChange: (d: { nip?: string; date: string; toShiftId: string; reason?: string }): Promise<ApiResponse<ShiftChangeItem>> =>
    apiClient("/hr-self/shift-changes", json(d)),
  myShiftChanges: (): Promise<ApiResponse<ShiftChangeItem[]>> => apiClient("/hr-self/shift-changes"),
  submitFeedback: (d: {
    subjectId: string;
    relationship: string;
    period: string;
    communication: number;
    teamwork: number;
    leadership: number;
    reliability: number;
    comment?: string;
  }): Promise<ApiResponse<null>> => apiClient("/hr-self/feedback", json(d)),
  announcements: (): Promise<ApiResponse<AnnouncementItem[]>> => apiClient("/hr-self/announcements"),
  notifications: (unreadOnly = false): Promise<ApiResponse<{ items: NotificationItem[]; unread: number }>> =>
    apiClient("/hr-self/notifications", { params: { unread: unreadOnly ? "true" : undefined } }),
  markRead: (id: string): Promise<ApiResponse<null>> => apiClient(`/hr-self/notifications/${id}/read`, { method: "POST" }),
  markAllRead: (): Promise<ApiResponse<null>> => apiClient("/hr-self/notifications/read-all", { method: "POST" }),

  // HR administration and approvals
  corrections: (status?: string): Promise<ApiResponse<CorrectionItem[]>> => apiClient("/hrm/corrections", { params: { status } }),
  decideCorrection: (id: string, approve: boolean): Promise<ApiResponse<CorrectionItem>> =>
    apiClient(`/hrm/corrections/${id}/${approve ? "approve" : "reject"}`, { method: "POST" }),
  attendanceSummary: (period: string): Promise<ApiResponse<AttendanceSummaryRow[]>> =>
    apiClient("/hrm/attendance-summary", { params: { period } }),
  downloadAttendanceSummary: (period: string) => apiClientDownload("/hrm/attendance-summary", { params: { period, format: "csv" } }),

  createShift: (d: { name: string; startTime: string; endTime: string }): Promise<ApiResponse<ShiftItem>> => apiClient("/hrm/shifts", json(d)),
  assignShifts: (d: { shiftId: string; nips: string[]; dates: string[] }): Promise<ApiResponse<{ assigned: number }>> =>
    apiClient("/hrm/shifts/assign", json(d)),
  schedule: (period: string, nip?: string): Promise<ApiResponse<ShiftAssignmentItem[]>> => apiClient("/hrm/schedule", { params: { period, nip } }),
  shiftChanges: (status?: string): Promise<ApiResponse<ShiftChangeItem[]>> => apiClient("/hrm/shift-changes", { params: { status } }),
  decideShiftChange: (id: string, approve: boolean): Promise<ApiResponse<ShiftChangeItem>> =>
    apiClient(`/hrm/shift-changes/${id}/${approve ? "approve" : "reject"}`, { method: "POST" }),

  overtime: (params?: { period?: string; status?: string }): Promise<ApiResponse<OvertimeItem[]>> => apiClient("/hrm/overtime", { params }),
  detectOvertime: (period: string): Promise<ApiResponse<{ created: number }>> => apiClient("/hrm/overtime/detect", json({ period })),
  decideOvertime: (id: string, approve: boolean): Promise<ApiResponse<OvertimeItem>> =>
    apiClient(`/hrm/overtime/${id}/${approve ? "approve" : "reject"}`, { method: "POST" }),

  documents: (employeeId: string): Promise<ApiResponse<EmployeeDocumentItem[]>> => apiClient(`/hrm/employees/${employeeId}/documents`),
  addDocument: (employeeId: string, d: { title: string; docType: string; fileRef?: string; expiresOn?: string; notes?: string }): Promise<ApiResponse<EmployeeDocumentItem>> =>
    apiClient(`/hrm/employees/${employeeId}/documents`, json(d)),
  deleteDocument: (id: string): Promise<ApiResponse<null>> => apiClient(`/hrm/documents/${id}`, { method: "DELETE" }),
  feedbackSummary: (employeeId: string, period?: string): Promise<ApiResponse<FeedbackSummary>> =>
    apiClient(`/hrm/employees/${employeeId}/feedback-summary`, { params: { period } }),

  publishAnnouncement: (d: { title: string; body: string; department?: string; pinned?: boolean; expiresOn?: string }): Promise<ApiResponse<{ announcement: AnnouncementItem; notified: number }>> =>
    apiClient("/hrm/announcements", json(d)),
  deleteAnnouncement: (id: string): Promise<ApiResponse<null>> => apiClient(`/hrm/announcements/${id}`, { method: "DELETE" }),

  // Reimbursement evidence
  addEvidence: (d: { claimId: string; title: string; fileRef: string; amount?: number }): Promise<ApiResponse<EvidenceItem>> =>
    apiClient("/hr-self/reimbursement-evidence", json(d)),
  evidence: (claimId: string): Promise<ApiResponse<EvidenceItem[]>> => apiClient("/hr-self/reimbursement-evidence", { params: { claimId } }),

  // Canteen
  canteenMenu: (): Promise<ApiResponse<CanteenItemT[]>> => apiClient("/hr-self/canteen/menu"),
  canteenAllItems: (): Promise<ApiResponse<CanteenItemT[]>> => apiClient("/hrm/canteen/items", { params: { all: "true" } }),
  createCanteenItem: (d: { name: string; price: number }): Promise<ApiResponse<CanteenItemT>> => apiClient("/hrm/canteen/items", json(d)),
  updateCanteenItem: (id: string, d: { price?: number; isActive?: boolean }): Promise<ApiResponse<CanteenItemT>> =>
    apiClient(`/hrm/canteen/items/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  orderMeal: (d: { itemId: string; quantity: number; date?: string }): Promise<ApiResponse<CanteenOrderItem>> => apiClient("/hr-self/canteen/orders", json(d)),
  myMeals: (period: string): Promise<ApiResponse<{ orders: CanteenOrderItem[]; total: number }>> => apiClient("/hr-self/canteen/orders", { params: { period } }),
  cancelMeal: (id: string): Promise<ApiResponse<CanteenOrderItem>> => apiClient(`/hr-self/canteen/orders/${id}/cancel`, { method: "POST" }),
  canteenSummary: (period: string): Promise<ApiResponse<CanteenTotal[]>> => apiClient("/hrm/canteen/summary", { params: { period } }),

  // Field visits
  planVisits: (d: { date: string; stops: { customerName: string; address?: string; latitude: number; longitude: number; radiusMeters?: number }[] }): Promise<ApiResponse<VisitStopItem[]>> =>
    apiClient("/hr-self/visits", json(d)),
  myVisitPlan: (date: string): Promise<ApiResponse<VisitPlan>> => apiClient("/hr-self/visits", { params: { date } }),
  optimizeVisits: (d: { date: string; latitude: number; longitude: number }): Promise<ApiResponse<VisitPlan>> => apiClient("/hr-self/visits/optimize", json(d)),
  checkInVisit: (id: string, d: { latitude: number; longitude: number }): Promise<ApiResponse<VisitStopItem>> => apiClient(`/hr-self/visits/${id}/check-in`, json(d)),
  skipVisit: (id: string, reason: string): Promise<ApiResponse<VisitStopItem>> => apiClient(`/hr-self/visits/${id}/skip`, json({ reason })),
  teamVisits: (date: string, nip?: string): Promise<ApiResponse<VisitStopItem[]>> => apiClient("/hrm/visit-plans", { params: { date, nip } }),
};
