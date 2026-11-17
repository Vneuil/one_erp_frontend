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

  // Packaging Quality Check (PBK - QC-003)
  listPackagingChecks: async (params?: { month?: string; lbmNo?: string }): Promise<ApiResponse<PackagingCheckItem[]>> => {
    return apiClient<PackagingCheckItem[]>("/qc/packaging", { params });
  },
  getPackagingCheck: async (id: string): Promise<ApiResponse<PackagingCheckItem>> => {
    return apiClient<PackagingCheckItem>(`/qc/packaging/${id}`);
  },
  createPackagingCheck: async (input: CreatePackagingCheckInput): Promise<ApiResponse<PackagingCheckItem>> => {
    return apiClient<PackagingCheckItem>("/qc/packaging", { method: "POST", body: JSON.stringify(input) });
  },
  updatePackagingCheck: async (id: string, input: UpdatePackagingCheckInput): Promise<ApiResponse<PackagingCheckItem>> => {
    return apiClient<PackagingCheckItem>(`/qc/packaging/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deletePackagingCheck: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/packaging/${id}`, { method: "DELETE" });
  },

  // Supplier Armada Check (CAS - QC-007)
  listArmadaChecks: async (params?: { date?: string; lbmNo?: string }): Promise<ApiResponse<ArmadaCheckItem[]>> => {
    return apiClient<ArmadaCheckItem[]>("/qc/armada", { params });
  },
  getArmadaCheck: async (id: string): Promise<ApiResponse<ArmadaCheckItem>> => {
    return apiClient<ArmadaCheckItem>(`/qc/armada/${id}`);
  },
  createArmadaCheck: async (input: CreateArmadaCheckInput): Promise<ApiResponse<ArmadaCheckItem>> => {
    return apiClient<ArmadaCheckItem>("/qc/armada", { method: "POST", body: JSON.stringify(input) });
  },
  updateArmadaCheck: async (id: string, input: UpdateArmadaCheckInput): Promise<ApiResponse<ArmadaCheckItem>> => {
    return apiClient<ArmadaCheckItem>(`/qc/armada/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteArmadaCheck: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/armada/${id}`, { method: "DELETE" });
  },

  // Raw Material Incoming Check (PBD - QC-001)
  listIncomingChecks: async (params?: { date?: string; lbmNo?: string }): Promise<ApiResponse<IncomingCheckItem[]>> => {
    return apiClient<IncomingCheckItem[]>("/qc/incoming", { params });
  },
  getIncomingCheck: async (id: string): Promise<ApiResponse<IncomingCheckItem>> => {
    return apiClient<IncomingCheckItem>(`/qc/incoming/${id}`);
  },
  createIncomingCheck: async (input: CreateIncomingCheckInput): Promise<ApiResponse<IncomingCheckItem>> => {
    return apiClient<IncomingCheckItem>("/qc/incoming", { method: "POST", body: JSON.stringify(input) });
  },
  updateIncomingCheck: async (id: string, input: UpdateIncomingCheckInput): Promise<ApiResponse<IncomingCheckItem>> => {
    return apiClient<IncomingCheckItem>(`/qc/incoming/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteIncomingCheck: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/incoming/${id}`, { method: "DELETE" });
  },
};

export const qcFormsApi = qcApi;

// ─── PBK (QC-003) Types ─────────────────────────────────────────────────────

export interface PackagingCheckItem {
  id: string;
  checkMonth: string; // YYYY-MM
  goodsReceiptId?: string;
  lbmNo?: string;
  checkDate: string; // YYYY-MM-DD
  supplierId?: string;
  supplierName: string;
  itemName: string;
  itemCode?: string;
  materialType: string;
  baseColor?: string;
  dimension?: string;
  totalQty: number;
  sampleQty: number;
  passedQty: number;
  passedCondition?: string;
  failedQty: number;
  failedCondition?: string;
  overallStatus: "passed" | "failed" | "partial";
  qcName?: string;
  qcDate?: string;
  qaName?: string;
  qaDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePackagingCheckInput {
  checkMonth: string;
  goodsReceiptId?: string;
  lbmNo?: string;
  checkDate: string;
  supplierId?: string;
  supplierName: string;
  itemName: string;
  itemCode?: string;
  materialType: string;
  baseColor?: string;
  dimension?: string;
  totalQty: number;
  sampleQty: number;
  passedQty: number;
  passedCondition?: string;
  failedQty: number;
  failedCondition?: string;
  qcName?: string;
  qaName?: string;
  notes?: string;
}

export interface UpdatePackagingCheckInput {
  checkMonth?: string;
  goodsReceiptId?: string;
  lbmNo?: string;
  checkDate?: string;
  supplierId?: string;
  supplierName?: string;
  itemName?: string;
  itemCode?: string;
  materialType?: string;
  baseColor?: string;
  dimension?: string;
  totalQty?: number;
  sampleQty?: number;
  passedQty?: number;
  passedCondition?: string;
  failedQty?: number;
  failedCondition?: string;
  qcName?: string;
  qaName?: string;
  notes?: string;
}

// ─── CAS (QC-007) Types ─────────────────────────────────────────────────────

export interface ArmadaCheckItem {
  id: string;
  goodsReceiptId?: string;
  lbmNo?: string;
  checkDate: string; // YYYY-MM-DD
  idNumber?: string;
  driverName: string;
  birthPlace?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  religion?: string;
  maritalStatus?: string;
  idExpiry?: string;
  companyOrigin?: string;
  cargoDesc?: string;
  licensePlate?: string;
  vehicleType?: string;
  cabinSafe: boolean;
  undercarriageSafe: boolean;
  cargoAreaSafe: boolean;
  floorClean: boolean;
  wallRightClean: boolean;
  wallLeftClean: boolean;
  ceilingClean: boolean;
  doorClean: boolean;
  overallStatus: "cleared" | "flagged" | "rejected";
  qcName?: string;
  qcDate?: string;
  qaName?: string;
  qaDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateArmadaCheckInput {
  goodsReceiptId?: string;
  lbmNo?: string;
  checkDate: string;
  idNumber?: string;
  driverName: string;
  birthPlace?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  religion?: string;
  maritalStatus?: string;
  idExpiry?: string;
  companyOrigin?: string;
  cargoDesc?: string;
  licensePlate?: string;
  vehicleType?: string;
  cabinSafe: boolean;
  undercarriageSafe: boolean;
  cargoAreaSafe: boolean;
  floorClean: boolean;
  wallRightClean: boolean;
  wallLeftClean: boolean;
  ceilingClean: boolean;
  doorClean: boolean;
  qcName?: string;
  qaName?: string;
  notes?: string;
}

export interface UpdateArmadaCheckInput {
  goodsReceiptId?: string;
  lbmNo?: string;
  checkDate?: string;
  idNumber?: string;
  driverName?: string;
  birthPlace?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  religion?: string;
  maritalStatus?: string;
  idExpiry?: string;
  companyOrigin?: string;
  cargoDesc?: string;
  licensePlate?: string;
  vehicleType?: string;
  cabinSafe?: boolean;
  undercarriageSafe?: boolean;
  cargoAreaSafe?: boolean;
  floorClean?: boolean;
  wallRightClean?: boolean;
  wallLeftClean?: boolean;
  ceilingClean?: boolean;
  doorClean?: boolean;
  qcName?: string;
  qaName?: string;
  notes?: string;
}

// ─── PBD (QC-001) Types ─────────────────────────────────────────────────────

export interface IncomingCheckItem {
  id: string;
  goodsReceiptId?: string;
  lbmNo?: string;
  checkDate: string; // YYYY-MM-DD
  checkMonth: string; // YYYY-MM
  supplierId?: string;
  supplierName: string;
  deliveryNoteNo?: string;
  poNo?: string;
  productName: string;
  batchNo?: string;
  totalBags: number;
  sampleBags: number;
  grossWeight: number;
  netWeight: number;
  acceptedWeight: number;
  rejectedWeight: number;
  sugarCondition: string;
  colorAppearance?: string;
  aromaFlavor?: string;
  foreignMatterClean: boolean;
  packagingCondition?: string;
  moistureContent?: number;
  brixValue?: number;
  meshSize?: string;
  recommendedAction?: string;
  overallStatus: "passed" | "conditional" | "rejected";
  qcName?: string;
  qcDate?: string;
  qaName?: string;
  qaDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateIncomingCheckInput {
  goodsReceiptId?: string;
  lbmNo?: string;
  checkDate: string;
  checkMonth?: string;
  supplierId?: string;
  supplierName: string;
  deliveryNoteNo?: string;
  poNo?: string;
  productName: string;
  batchNo?: string;
  totalBags?: number;
  sampleBags?: number;
  grossWeight?: number;
  netWeight?: number;
  acceptedWeight?: number;
  rejectedWeight?: number;
  sugarCondition: string;
  colorAppearance?: string;
  aromaFlavor?: string;
  foreignMatterClean?: boolean;
  packagingCondition?: string;
  moistureContent?: number;
  brixValue?: number;
  meshSize?: string;
  recommendedAction?: string;
  qcName?: string;
  qaName?: string;
  notes?: string;
}

export interface UpdateIncomingCheckInput {
  goodsReceiptId?: string;
  lbmNo?: string;
  checkDate?: string;
  checkMonth?: string;
  supplierId?: string;
  supplierName?: string;
  deliveryNoteNo?: string;
  poNo?: string;
  productName?: string;
  batchNo?: string;
  totalBags?: number;
  sampleBags?: number;
  grossWeight?: number;
  netWeight?: number;
  acceptedWeight?: number;
  rejectedWeight?: number;
  sugarCondition?: string;
  colorAppearance?: string;
  aromaFlavor?: string;
  foreignMatterClean?: boolean;
  packagingCondition?: string;
  moistureContent?: number;
  brixValue?: number;
  meshSize?: string;
  recommendedAction?: string;
  qcName?: string;
  qaName?: string;
  notes?: string;
}
