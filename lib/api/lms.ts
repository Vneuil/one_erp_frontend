import { apiClient, ApiResponse } from "./client";

export interface Course {
  id: string;
  companyId?: string | null;
  title: string;
  description: string;
  category: string;
  instructorName: string;
  durationHours: number;
  status: string;
  enrolledCount: number;
  createdAt?: string;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  category?: string;
  instructorName?: string;
  durationHours?: number;
  companyId?: string | null;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  category?: string;
  instructorName?: string;
  durationHours?: number;
  status?: string;
}

export interface Enrollment {
  id: string;
  companyId?: string | null;
  courseId: string;
  employeeId?: string | null;
  employeeName: string;
  enrolledDate: string;
  progressPercent: number;
  status: string;
  completedDate?: string | null;
  createdAt?: string;
}

export interface CreateEnrollmentInput {
  courseId: string;
  // employeeId should reference a real employee (see lib/api/hrm.ts). When
  // set, the backend derives employeeName server-side from that record.
  employeeId?: string;
  employeeName?: string;
  enrolledDate?: string;
  companyId?: string | null;
}

export interface Quiz {
  id: string;
  companyId?: string | null;
  courseId: string;
  title: string;
  passingScorePercent: number;
  createdAt?: string;
}

export interface CreateQuizInput {
  courseId: string;
  title: string;
  passingScorePercent?: number;
  companyId?: string | null;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  employeeName: string;
  scorePercent: number;
  passed: boolean;
  attemptedDate: string;
  createdAt?: string;
}

export interface CreateQuizAttemptInput {
  employeeName: string;
  scorePercent: number;
  attemptedDate?: string;
}

export interface Certificate {
  id: string;
  enrollmentId: string;
  certificateNumber: string;
  issuedDate: string;
  createdAt?: string;
}

export const lmsApi = {
  listCourses: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<Course[]>> => {
    return apiClient<Course[]>("/lms/courses", { params });
  },
  getCourse: async (id: string): Promise<ApiResponse<Course>> => {
    return apiClient<Course>(`/lms/courses/${id}`);
  },
  createCourse: async (data: CreateCourseInput): Promise<ApiResponse<Course>> => {
    return apiClient<Course>("/lms/courses", { method: "POST", body: JSON.stringify(data) });
  },
  updateCourse: async (id: string, data: UpdateCourseInput): Promise<ApiResponse<Course>> => {
    return apiClient<Course>(`/lms/courses/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  listEnrollments: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<Enrollment[]>> => {
    return apiClient<Enrollment[]>("/lms/enrollments", { params });
  },
  getEnrollment: async (id: string): Promise<ApiResponse<Enrollment>> => {
    return apiClient<Enrollment>(`/lms/enrollments/${id}`);
  },
  createEnrollment: async (data: CreateEnrollmentInput): Promise<ApiResponse<Enrollment>> => {
    return apiClient<Enrollment>("/lms/enrollments", { method: "POST", body: JSON.stringify(data) });
  },
  updateProgress: async (id: string, progressPercent: number): Promise<ApiResponse<Enrollment>> => {
    return apiClient<Enrollment>(`/lms/enrollments/${id}/progress`, { method: "PUT", body: JSON.stringify({ progressPercent }) });
  },
  completeEnrollment: async (id: string): Promise<ApiResponse<Enrollment>> => {
    return apiClient<Enrollment>(`/lms/enrollments/${id}/complete`, { method: "POST" });
  },

  listQuizzes: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<Quiz[]>> => {
    return apiClient<Quiz[]>("/lms/quizzes", { params });
  },
  createQuiz: async (data: CreateQuizInput): Promise<ApiResponse<Quiz>> => {
    return apiClient<Quiz>("/lms/quizzes", { method: "POST", body: JSON.stringify(data) });
  },
  createQuizAttempt: async (quizId: string, data: CreateQuizAttemptInput): Promise<ApiResponse<QuizAttempt>> => {
    return apiClient<QuizAttempt>(`/lms/quizzes/${quizId}/attempts`, { method: "POST", body: JSON.stringify(data) });
  },

  listCertificates: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<Certificate[]>> => {
    return apiClient<Certificate[]>("/lms/certificates", { params });
  },
};
