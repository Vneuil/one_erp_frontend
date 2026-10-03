import { apiClient, ApiResponse } from "./client";

export interface JobVacancy {
  id: string;
  companyId?: string | null;
  title: string;
  department: string;
  employmentType: string;
  location: string;
  description: string;
  status: string;
  openingsCount: number;
  postedDate: string;
  createdAt?: string;
}

export interface CreateJobVacancyInput {
  title: string;
  department: string;
  employmentType?: string;
  location?: string;
  description?: string;
  openingsCount?: number;
  postedDate?: string;
  companyId?: string | null;
}

export interface UpdateJobVacancyInput {
  title?: string;
  department?: string;
  employmentType?: string;
  location?: string;
  description?: string;
  status?: string;
  openingsCount?: number;
  postedDate?: string;
}

export interface Candidate {
  id: string;
  companyId?: string | null;
  jobVacancyId: string;
  name: string;
  email: string;
  phone: string;
  resumeNote: string;
  source: string;
  appliedDate: string;
  stage: string;
  stageNotes: string;
  createdAt?: string;
}

export interface CreateCandidateInput {
  jobVacancyId: string;
  name: string;
  email?: string;
  phone?: string;
  resumeNote?: string;
  source?: string;
  appliedDate?: string;
  companyId?: string | null;
}

export interface AdvanceStageInput {
  stage: string;
  notes?: string;
}

export interface Interview {
  id: string;
  companyId?: string | null;
  candidateId: string;
  scheduledAt: string;
  interviewerName: string;
  status: string;
  feedbackNote: string;
  rating?: number | null;
  createdAt?: string;
}

export interface CreateInterviewInput {
  candidateId: string;
  scheduledAt: string;
  interviewerName: string;
  companyId?: string | null;
}

export interface UpdateInterviewInput {
  status?: string;
  feedbackNote?: string;
  rating?: number | null;
}

export const recruitmentApi = {
  listVacancies: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<JobVacancy[]>> => {
    return apiClient<JobVacancy[]>("/recruitment/vacancies", { params });
  },
  createVacancy: async (data: CreateJobVacancyInput): Promise<ApiResponse<JobVacancy>> => {
    return apiClient<JobVacancy>("/recruitment/vacancies", { method: "POST", body: JSON.stringify(data) });
  },
  getVacancy: async (id: string): Promise<ApiResponse<JobVacancy>> => {
    return apiClient<JobVacancy>(`/recruitment/vacancies/${id}`);
  },
  updateVacancy: async (id: string, data: UpdateJobVacancyInput): Promise<ApiResponse<JobVacancy>> => {
    return apiClient<JobVacancy>(`/recruitment/vacancies/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  listCandidates: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<Candidate[]>> => {
    return apiClient<Candidate[]>("/recruitment/candidates", { params });
  },
  createCandidate: async (data: CreateCandidateInput): Promise<ApiResponse<Candidate>> => {
    return apiClient<Candidate>("/recruitment/candidates", { method: "POST", body: JSON.stringify(data) });
  },
  getCandidate: async (id: string): Promise<ApiResponse<Candidate>> => {
    return apiClient<Candidate>(`/recruitment/candidates/${id}`);
  },
  advanceStage: async (id: string, data: AdvanceStageInput): Promise<ApiResponse<Candidate>> => {
    return apiClient<Candidate>(`/recruitment/candidates/${id}/advance-stage`, { method: "POST", body: JSON.stringify(data) });
  },
  hireCandidate: async (id: string): Promise<ApiResponse<Candidate>> => {
    return apiClient<Candidate>(`/recruitment/candidates/${id}/hire`, { method: "POST" });
  },

  listInterviews: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<Interview[]>> => {
    return apiClient<Interview[]>("/recruitment/interviews", { params });
  },
  createInterview: async (data: CreateInterviewInput): Promise<ApiResponse<Interview>> => {
    return apiClient<Interview>("/recruitment/interviews", { method: "POST", body: JSON.stringify(data) });
  },
  getInterview: async (id: string): Promise<ApiResponse<Interview>> => {
    return apiClient<Interview>(`/recruitment/interviews/${id}`);
  },
  updateInterview: async (id: string, data: UpdateInterviewInput): Promise<ApiResponse<Interview>> => {
    return apiClient<Interview>(`/recruitment/interviews/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
};
