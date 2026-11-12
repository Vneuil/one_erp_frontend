import { apiClient, ApiResponse } from "./client";

export type ParameterType = "numeric" | "boolean";
export type InspectionStatus = "pending" | "passed" | "failed" | "hold" | "voided";
export type TargetType = "goods_receipt" | "production_order" | "production_step";

export interface QCParameterItem {
  id: string;
  productId?: string;
  processCode: string;
  name: string;
  paramType: ParameterType;
  unitOfMeasure?: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  tolerance?: number;
  isGate: boolean;
  isMandatory: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQCParameterInput {
  productId?: string;
  processCode: string;
  name: string;
  paramType: ParameterType;
  unitOfMeasure?: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  tolerance?: number;
  isGate?: boolean;
  isMandatory?: boolean;
  description?: string;
}

export interface UpdateQCParameterInput {
  processCode?: string;
  name?: string;
  paramType?: ParameterType;
  unitOfMeasure?: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  tolerance?: number;
  isGate?: boolean;
  isMandatory?: boolean;
  description?: string;
}

export interface QCInspectionItemResult {
  id: string;
  parameterId: string;
  parameterName: string;
  paramType: ParameterType;
  numericValue?: number;
  booleanValue?: boolean;
  isPassed: boolean;
  notes?: string;
}

export interface QCInspectionItem {
  id: string;
  inspectionNo: string;
  targetType: TargetType;
  targetId: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo: string;
  productId: string;
  inspectorId: string;
  inspectorName: string;
  inspectedAt: string;
  testingTool?: string;
  iteration: number;
  overallStatus: InspectionStatus;
  notes?: string;
  sugarCondition?: string;
  packageCondition?: string;
  isVoided: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;
  items: QCInspectionItemResult[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateQCInspectionItemInput {
  parameterId: string;
  numericValue?: number;
  booleanValue?: boolean;
  notes?: string;
}

export interface CreateQCInspectionInput {
  targetType: TargetType;
  targetId: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo: string;
  productId: string;
  testingTool?: string;
  notes?: string;
  sugarCondition?: string;
  packageCondition?: string;
  items: CreateQCInspectionItemInput[];
}

export interface VoidQCInspectionInput {
  reason: string;
}

export interface QCStats {
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  voidedInspections: number;
  passRate: number;
}

export interface PersonalHygieneCheckItem {
  id: string;
  checkDate: string;
  shift: string;
  line: string;
  employeeName: string;
  workWearClean: boolean;
  hairNet: boolean;
  nailsClean: boolean;
  noJewelry: boolean;
  workShoesClean: boolean;
  handWashing: boolean;
  healthFit: boolean;
  isPassed: boolean;
  actionTaken?: string;
  inspectorName: string;
  notes?: string;
  createdAt: string;
}

export interface CreateHygieneCheckInput {
  checkDate: string;
  shift: string;
  line: string;
  employeeName: string;
  workWearClean: boolean;
  hairNet: boolean;
  nailsClean: boolean;
  noJewelry: boolean;
  workShoesClean: boolean;
  handWashing: boolean;
  healthFit: boolean;
  isPassed?: boolean;
  actionTaken?: string;
  inspectorName?: string;
  notes?: string;
}

export interface PreOpSanitationCheckItem {
  id: string;
  checkDate: string;
  checkTime: string;
  shift: string;
  room: string;
  floorClean: boolean;
  wallCeilingClean: boolean;
  equipmentSanitized: boolean;
  trashBinClosed: boolean;
  lightingProtected: boolean;
  pestControlIntact: boolean;
  gaussReading?: number;
  metalTrapClean?: boolean;
  status: "approved" | "hold" | "action_required";
  notes?: string;
  inspectorName: string;
  supervisorName?: string;
  createdAt: string;
}

export interface CreatePreOpCheckInput {
  checkDate: string;
  checkTime: string;
  shift: string;
  room: string;
  floorClean: boolean;
  wallCeilingClean: boolean;
  equipmentSanitized: boolean;
  trashBinClosed: boolean;
  lightingProtected: boolean;
  pestControlIntact: boolean;
  gaussReading?: number;
  metalTrapClean?: boolean;
  status?: string;
  notes?: string;
  inspectorName?: string;
  supervisorName?: string;
}

export const qcApi = {
  // Parameters
  listParameters: async (params?: { productId?: string; processCode?: string }): Promise<ApiResponse<QCParameterItem[]>> => {
    return apiClient<QCParameterItem[]>("/qc/parameters", { params });
  },

  getParameter: async (id: string): Promise<ApiResponse<QCParameterItem>> => {
    return apiClient<QCParameterItem>(`/qc/parameters/${id}`);
  },

  createParameter: async (input: CreateQCParameterInput): Promise<ApiResponse<QCParameterItem>> => {
    return apiClient<QCParameterItem>("/qc/parameters", { method: "POST", body: JSON.stringify(input) });
  },

  updateParameter: async (id: string, input: UpdateQCParameterInput): Promise<ApiResponse<QCParameterItem>> => {
    return apiClient<QCParameterItem>(`/qc/parameters/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },

  deleteParameter: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/parameters/${id}`, { method: "DELETE" });
  },

  // Inspections
  listInspections: async (params?: {
    batchNo?: string;
    targetType?: TargetType;
    targetId?: string;
    productionOrderId?: string;
    productId?: string;
    status?: InspectionStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    perPage?: number;
  }): Promise<ApiResponse<QCInspectionItem[]>> => {
    return apiClient<QCInspectionItem[]>("/qc/inspections", { params });
  },

  getInspection: async (id: string): Promise<ApiResponse<QCInspectionItem>> => {
    return apiClient<QCInspectionItem>(`/qc/inspections/${id}`);
  },

  createInspection: async (input: CreateQCInspectionInput): Promise<ApiResponse<QCInspectionItem>> => {
    return apiClient<QCInspectionItem>("/qc/inspections", { method: "POST", body: JSON.stringify(input) });
  },

  voidInspection: async (id: string, input: VoidQCInspectionInput): Promise<ApiResponse<QCInspectionItem>> => {
    return apiClient<QCInspectionItem>(`/qc/inspections/${id}/void`, { method: "POST", body: JSON.stringify(input) });
  },

  getStats: async (): Promise<ApiResponse<QCStats>> => {
    return apiClient<QCStats>("/qc/stats");
  },

  // Personal Hygiene (CPH)
  listHygieneChecks: async (params?: { date?: string; line?: string }): Promise<ApiResponse<PersonalHygieneCheckItem[]>> => {
    return apiClient<PersonalHygieneCheckItem[]>("/qc/hygiene", { params });
  },
  createHygieneCheck: async (input: CreateHygieneCheckInput): Promise<ApiResponse<PersonalHygieneCheckItem>> => {
    return apiClient<PersonalHygieneCheckItem>("/qc/hygiene", { method: "POST", body: JSON.stringify(input) });
  },
  deleteHygieneCheck: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/hygiene/${id}`, { method: "DELETE" });
  },

  // Pre-Op Sanitation (SSO)
  listPreOpChecks: async (params?: { date?: string; room?: string }): Promise<ApiResponse<PreOpSanitationCheckItem[]>> => {
    return apiClient<PreOpSanitationCheckItem[]>("/qc/preop", { params });
  },
  createPreOpCheck: async (input: CreatePreOpCheckInput): Promise<ApiResponse<PreOpSanitationCheckItem>> => {
    return apiClient<PreOpSanitationCheckItem>("/qc/preop", { method: "POST", body: JSON.stringify(input) });
  },
  deletePreOpCheck: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/preop/${id}`, { method: "DELETE" });
  },
};
