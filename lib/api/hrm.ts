import { apiClient, ApiResponse } from "./client";

export interface EmployeeItem {
  id: string;
  nip: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  contractType: string;
  joinDate: string;
  status: string;
  baseSalary: number;
  leaveQuotaDays?: number;
  leaveUsedDays?: number;
  leaveBalance?: number;
  /** PPh 21 tax status: TK/0..TK/3 or K/0..K/3. */
  ptkpStatus?: string;
  hasNpwp?: boolean;
  managerId?: string | null;
  createdAt?: string;
}

export interface OrgNode {
  id: string;
  nip: string;
  name: string;
  role: string;
  department: string;
  status: string;
  managerId?: string | null;
  directReports: number;
  teamSize: number;
  children: OrgNode[];
}

export interface Organization {
  roots: OrgNode[];
  total: number;
}

export interface TrainingHistoryItem {
  id: string;
  courseId: string;
  employeeId?: string | null;
  employeeName: string;
  enrolledDate: string;
  progressPercent: number;
  status: string;
  completedDate?: string | null;
  createdAt?: string;
}

export interface CreateEmployeeInput {
  nip: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  contractType?: string;
  joinDate?: string;
  baseSalary?: number;
  status?: string;
  ptkpStatus?: string;
  hasNpwp?: boolean;
}

export interface AttendanceItem {
  id: string;
  employeeName: string;
  nip: string;
  date: string;
  clockIn: string;
  clockOut: string;
  location: string;
  method: string;
  status: string;
  workMinutes?: number;
  latitude?: number;
  longitude?: number;
  photoRef?: string;
  createdAt?: string;
}

export interface ClockInInput {
  employeeName: string;
  nip: string;
  location?: string;
  method?: string;
  /** Required by the backend when the company has configured attendance locations. */
  latitude?: number;
  longitude?: number;
  photoRef?: string;
}

export interface ClockOutInput {
  nip: string;
  latitude?: number;
  longitude?: number;
  photoRef?: string;
}

export interface AttendanceLocationItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export interface CreateAttendanceLocationInput {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}

export const hrmApi = {
  listEmployees: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<EmployeeItem[]>> => {
    return apiClient<EmployeeItem[]>("/hrm/employees", { params });
  },

  organization: async (): Promise<ApiResponse<Organization>> => {
    return apiClient<Organization>("/hrm/organization");
  },
  updateEmployee: async (id: string, data: Partial<Omit<EmployeeItem, "id" | "nip">>): Promise<ApiResponse<EmployeeItem>> => {
    return apiClient<EmployeeItem>(`/hrm/employees/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  deleteEmployee: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/hrm/employees/${id}`, { method: "DELETE" });
  },

  createEmployee: async (data: CreateEmployeeInput): Promise<ApiResponse<EmployeeItem>> => {
    return apiClient<EmployeeItem>("/hrm/employees", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listAttendance: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<AttendanceItem[]>> => {
    return apiClient<AttendanceItem[]>("/hrm/attendance", { params });
  },

  getTrainingHistory: async (employeeId: string): Promise<ApiResponse<TrainingHistoryItem[]>> => {
    return apiClient<TrainingHistoryItem[]>(`/hrm/employees/${employeeId}/training-history`);
  },

  clockIn: async (data: ClockInInput): Promise<ApiResponse<AttendanceItem>> => {
    return apiClient<AttendanceItem>("/hrm/attendance/clock-in", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  clockOut: async (data: ClockOutInput): Promise<ApiResponse<AttendanceItem>> => {
    return apiClient<AttendanceItem>("/hrm/attendance/clock-out", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listAttendanceLocations: async (): Promise<ApiResponse<AttendanceLocationItem[]>> => {
    return apiClient<AttendanceLocationItem[]>("/hrm/attendance/locations");
  },

  createAttendanceLocation: async (data: CreateAttendanceLocationInput): Promise<ApiResponse<AttendanceLocationItem>> => {
    return apiClient<AttendanceLocationItem>("/hrm/attendance/locations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deleteAttendanceLocation: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/hrm/attendance/locations/${id}`, { method: "DELETE" });
  },
};
