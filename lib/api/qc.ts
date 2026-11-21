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

  // ─── Sieving Monitoring (MNA — Form QC-009-MNA.01) ─────────────────────────
  listSievingLogs: async (params?: { month?: string; machineNo?: string; category?: string }): Promise<ApiResponse<SievingMonitoringItem[]>> => {
    return apiClient<SievingMonitoringItem[]>("/qc/sieving/mna", { params });
  },
  getSievingLog: async (id: string): Promise<ApiResponse<SievingMonitoringItem>> => {
    return apiClient<SievingMonitoringItem>(`/qc/sieving/mna/${id}`);
  },
  createSievingLog: async (input: CreateSievingInput): Promise<ApiResponse<SievingMonitoringItem>> => {
    return apiClient<SievingMonitoringItem>("/qc/sieving/mna", { method: "POST", body: JSON.stringify(input) });
  },
  updateSievingLog: async (id: string, input: UpdateSievingInput): Promise<ApiResponse<SievingMonitoringItem>> => {
    return apiClient<SievingMonitoringItem>(`/qc/sieving/mna/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteSievingLog: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/sieving/mna/${id}`, { method: "DELETE" });
  },

  // ─── Magnet Trap (CMT — Form QC-038-CMT) ───────────────────────────────────
  listMagnetTrapLogs: async (params?: { month?: string; room?: string; machineNo?: string }): Promise<ApiResponse<MagnetTrapItem[]>> => {
    return apiClient<MagnetTrapItem[]>("/qc/sieving/cmt", { params });
  },
  getMagnetTrapLog: async (id: string): Promise<ApiResponse<MagnetTrapItem>> => {
    return apiClient<MagnetTrapItem>(`/qc/sieving/cmt/${id}`);
  },
  createMagnetTrapLog: async (input: CreateMagnetTrapInput): Promise<ApiResponse<MagnetTrapItem>> => {
    return apiClient<MagnetTrapItem>("/qc/sieving/cmt", { method: "POST", body: JSON.stringify(input) });
  },
  updateMagnetTrapLog: async (id: string, input: UpdateMagnetTrapInput): Promise<ApiResponse<MagnetTrapItem>> => {
    return apiClient<MagnetTrapItem>(`/qc/sieving/cmt/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteMagnetTrapLog: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/sieving/cmt/${id}`, { method: "DELETE" });
  },

  // ─── Mesh Bolt Monitoring (MNM — Form QC-010-MNM.01) ───────────────────────
  listMeshBoltLogs: async (params?: { month?: string; room?: string; machineNo?: string }): Promise<ApiResponse<MeshBoltMonitoringItem[]>> => {
    return apiClient<MeshBoltMonitoringItem[]>("/qc/sieving/mnm", { params });
  },
  getMeshBoltLog: async (id: string): Promise<ApiResponse<MeshBoltMonitoringItem>> => {
    return apiClient<MeshBoltMonitoringItem>(`/qc/sieving/mnm/${id}`);
  },
  createMeshBoltLog: async (input: CreateMeshBoltInput): Promise<ApiResponse<MeshBoltMonitoringItem>> => {
    return apiClient<MeshBoltMonitoringItem>("/qc/sieving/mnm", { method: "POST", body: JSON.stringify(input) });
  },
  updateMeshBoltLog: async (id: string, input: UpdateMeshBoltInput): Promise<ApiResponse<MeshBoltMonitoringItem>> => {
    return apiClient<MeshBoltMonitoringItem>(`/qc/sieving/mnm/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteMeshBoltLog: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/sieving/mnm/${id}`, { method: "DELETE" });
  },

  // ─── Oven Monitoring (MNO — Form QC-012-MNO.05) ────────────────────────────
  listOvenMonitoringLogs: async (params?: { month?: string; ovenNo?: string; batchNo?: string }): Promise<ApiResponse<OvenMonitoringItem[]>> => {
    return apiClient<OvenMonitoringItem[]>("/qc/oven/mno", { params });
  },
  getOvenMonitoringLog: async (id: string): Promise<ApiResponse<OvenMonitoringItem>> => {
    return apiClient<OvenMonitoringItem>(`/qc/oven/mno/${id}`);
  },
  createOvenMonitoringLog: async (input: CreateOvenMonitoringInput): Promise<ApiResponse<OvenMonitoringItem>> => {
    return apiClient<OvenMonitoringItem>("/qc/oven/mno", { method: "POST", body: JSON.stringify(input) });
  },
  updateOvenMonitoringLog: async (id: string, input: UpdateOvenMonitoringInput): Promise<ApiResponse<OvenMonitoringItem>> => {
    return apiClient<OvenMonitoringItem>(`/qc/oven/mno/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteOvenMonitoringLog: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/oven/mno/${id}`, { method: "DELETE" });
  },

  // ─── Needle Monitoring (MNJ — Form QC-011-MNJ.01) ──────────────────────────
  listNeedleLogs: async (params?: { month?: string; machineNo?: string }): Promise<ApiResponse<NeedleMonitoringItem[]>> => {
    return apiClient<NeedleMonitoringItem[]>("/qc/packing/mnj", { params });
  },
  getNeedleLog: async (id: string): Promise<ApiResponse<NeedleMonitoringItem>> => {
    return apiClient<NeedleMonitoringItem>(`/qc/packing/mnj/${id}`);
  },
  createNeedleLog: async (input: CreateNeedleInput): Promise<ApiResponse<NeedleMonitoringItem>> => {
    return apiClient<NeedleMonitoringItem>("/qc/packing/mnj", { method: "POST", body: JSON.stringify(input) });
  },
  updateNeedleLog: async (id: string, input: UpdateNeedleInput): Promise<ApiResponse<NeedleMonitoringItem>> => {
    return apiClient<NeedleMonitoringItem>(`/qc/packing/mnj/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteNeedleLog: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/packing/mnj/${id}`, { method: "DELETE" });
  },

  // ─── Scissor Monitoring (MNG — Form QC-011-MNJ.01 Sheet MNG) ────────────────
  listScissorLogs: async (params?: { month?: string; location?: string }): Promise<ApiResponse<ScissorMonitoringItem[]>> => {
    return apiClient<ScissorMonitoringItem[]>("/qc/packing/mng", { params });
  },
  getScissorLog: async (id: string): Promise<ApiResponse<ScissorMonitoringItem>> => {
    return apiClient<ScissorMonitoringItem>(`/qc/packing/mng/${id}`);
  },
  createScissorLog: async (input: CreateScissorInput): Promise<ApiResponse<ScissorMonitoringItem>> => {
    return apiClient<ScissorMonitoringItem>("/qc/packing/mng", { method: "POST", body: JSON.stringify(input) });
  },
  updateScissorLog: async (id: string, input: UpdateScissorInput): Promise<ApiResponse<ScissorMonitoringItem>> => {
    return apiClient<ScissorMonitoringItem>(`/qc/packing/mng/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteScissorLog: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/packing/mng/${id}`, { method: "DELETE" });
  },

  // ─── Metal Detector Cleaning (CPP — Form CPP) ───────────────────────────────
  listMetalCleaningLogs: async (params?: { month?: string; machineNo?: string; location?: string }): Promise<ApiResponse<MetalCleaningItem[]>> => {
    return apiClient<MetalCleaningItem[]>("/qc/metal-detector/cpp", { params });
  },
  getMetalCleaningLog: async (id: string): Promise<ApiResponse<MetalCleaningItem>> => {
    return apiClient<MetalCleaningItem>(`/qc/metal-detector/cpp/${id}`);
  },
  createMetalCleaningLog: async (input: CreateMetalCleaningInput): Promise<ApiResponse<MetalCleaningItem>> => {
    return apiClient<MetalCleaningItem>("/qc/metal-detector/cpp", { method: "POST", body: JSON.stringify(input) });
  },
  updateMetalCleaningLog: async (id: string, input: UpdateMetalCleaningInput): Promise<ApiResponse<MetalCleaningItem>> => {
    return apiClient<MetalCleaningItem>(`/qc/metal-detector/cpp/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteMetalCleaningLog: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/metal-detector/cpp/${id}`, { method: "DELETE" });
  },

  // ─── Metal Detector Verification (VMD — Form QC-017-VMD) ────────────────────
  listMetalVerificationLogs: async (params?: { month?: string; productType?: string; location?: string }): Promise<ApiResponse<MetalVerificationItem[]>> => {
    return apiClient<MetalVerificationItem[]>("/qc/metal-detector/vmd", { params });
  },
  getMetalVerificationLog: async (id: string): Promise<ApiResponse<MetalVerificationItem>> => {
    return apiClient<MetalVerificationItem>(`/qc/metal-detector/vmd/${id}`);
  },
  createMetalVerificationLog: async (input: CreateMetalVerificationInput): Promise<ApiResponse<MetalVerificationItem>> => {
    return apiClient<MetalVerificationItem>("/qc/metal-detector/vmd", { method: "POST", body: JSON.stringify(input) });
  },
  updateMetalVerificationLog: async (id: string, input: UpdateMetalVerificationInput): Promise<ApiResponse<MetalVerificationItem>> => {
    return apiClient<MetalVerificationItem>(`/qc/metal-detector/vmd/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteMetalVerificationLog: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/metal-detector/vmd/${id}`, { method: "DELETE" });
  },

  // ─── Finished Goods Inspection (PJD — Form QC-004-PJD.05) ───────────────────
  listFinishedGoodsLogs: async (params?: { month?: string; productName?: string; batchNo?: string; decision?: string }): Promise<ApiResponse<FinishedGoodsInspectionItem[]>> => {
    return apiClient<FinishedGoodsInspectionItem[]>("/qc/finished-goods/pjd", { params });
  },
  getFinishedGoodsLog: async (id: string): Promise<ApiResponse<FinishedGoodsInspectionItem>> => {
    return apiClient<FinishedGoodsInspectionItem>(`/qc/finished-goods/pjd/${id}`);
  },
  createFinishedGoodsLog: async (input: CreateFinishedGoodsInput): Promise<ApiResponse<FinishedGoodsInspectionItem>> => {
    return apiClient<FinishedGoodsInspectionItem>("/qc/finished-goods/pjd", { method: "POST", body: JSON.stringify(input) });
  },
  updateFinishedGoodsLog: async (id: string, input: UpdateFinishedGoodsInput): Promise<ApiResponse<FinishedGoodsInspectionItem>> => {
    return apiClient<FinishedGoodsInspectionItem>(`/qc/finished-goods/pjd/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteFinishedGoodsLog: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/finished-goods/pjd/${id}`, { method: "DELETE" });
  },

  // ─── Packaging Label Check (PLK — Form QC-018-PLK) ───────────────────────────
  listPackagingLabelChecks: async (params?: { month?: string; batchNo?: string; decision?: string }): Promise<ApiResponse<PackagingLabelCheckItem[]>> => {
    return apiClient<PackagingLabelCheckItem[]>("/qc/label-inspection/plk", { params });
  },
  getPackagingLabelCheck: async (id: string): Promise<ApiResponse<PackagingLabelCheckItem>> => {
    return apiClient<PackagingLabelCheckItem>(`/qc/label-inspection/plk/${id}`);
  },
  createPackagingLabelCheck: async (input: CreatePackagingLabelCheckInput): Promise<ApiResponse<PackagingLabelCheckItem>> => {
    return apiClient<PackagingLabelCheckItem>("/qc/label-inspection/plk", { method: "POST", body: JSON.stringify(input) });
  },
  updatePackagingLabelCheck: async (id: string, input: UpdatePackagingLabelCheckInput): Promise<ApiResponse<PackagingLabelCheckItem>> => {
    return apiClient<PackagingLabelCheckItem>(`/qc/label-inspection/plk/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deletePackagingLabelCheck: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/label-inspection/plk/${id}`, { method: "DELETE" });
  },

  // ─── Container Checklist (CCO — Form QC-008-CCO.02) ──────────────────────────
  listContainerChecklists: async (params?: { month?: string; containerNo?: string; destination?: string; decision?: string }): Promise<ApiResponse<ContainerChecklistItem[]>> => {
    return apiClient<ContainerChecklistItem[]>("/qc/container/cco", { params });
  },
  getContainerChecklist: async (id: string): Promise<ApiResponse<ContainerChecklistItem>> => {
    return apiClient<ContainerChecklistItem>(`/qc/container/cco/${id}`);
  },
  createContainerChecklist: async (input: CreateContainerChecklistInput): Promise<ApiResponse<ContainerChecklistItem>> => {
    return apiClient<ContainerChecklistItem>("/qc/container/cco", { method: "POST", body: JSON.stringify(input) });
  },
  updateContainerChecklist: async (id: string, input: UpdateContainerChecklistInput): Promise<ApiResponse<ContainerChecklistItem>> => {
    return apiClient<ContainerChecklistItem>(`/qc/container/cco/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  deleteContainerChecklist: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient<{ id: string }>(`/qc/container/cco/${id}`, { method: "DELETE" });
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

// ─── MNA (Sieving Monitoring Log) Interfaces ────────────────────────────────

export interface SievingMonitoringItem {
  id: string;
  documentNo: string;
  revisionCode: string;
  machineNo: string;
  checkMonth: string;
  checkDate: string;
  category: "Mentah" | "Matang" | string;
  productionOrderId?: string;
  productionStepId?: string;
  requisitionId?: string;
  productId?: string;
  productName: string;
  batchNo: string;
  ovenDate?: string;
  meshSize: string;
  initialCondition: string;
  initialFindings?: string;
  initialAction?: string;
  initialPicName: string;
  initialQcName?: string;
  initialQcPassed: boolean;
  finalCondition: string;
  finalFindings?: string;
  finalAction?: string;
  finalPicName: string;
  finalQcName?: string;
  finalQcPassed: boolean;
  overallStatus: "passed" | "failed" | "action_required" | string;
  notes?: string;
  createdAt: string;
}

export interface CreateSievingInput {
  machineNo: string;
  checkMonth?: string;
  checkDate: string;
  category?: string;
  productionOrderId?: string;
  productionStepId?: string;
  requisitionId?: string;
  productId?: string;
  productName: string;
  batchNo: string;
  ovenDate?: string;
  meshSize?: string;
  initialCondition?: string;
  initialFindings?: string;
  initialAction?: string;
  initialPicName: string;
  initialQcName?: string;
  initialQcPassed?: boolean;
  finalCondition?: string;
  finalFindings?: string;
  finalAction?: string;
  finalPicName: string;
  finalQcName?: string;
  finalQcPassed?: boolean;
  notes?: string;
}

export interface UpdateSievingInput {
  machineNo?: string;
  checkMonth?: string;
  checkDate?: string;
  category?: string;
  productionOrderId?: string;
  productionStepId?: string;
  requisitionId?: string;
  productId?: string;
  productName?: string;
  batchNo?: string;
  ovenDate?: string;
  meshSize?: string;
  initialCondition?: string;
  initialFindings?: string;
  initialAction?: string;
  initialPicName?: string;
  initialQcName?: string;
  initialQcPassed?: boolean;
  finalCondition?: string;
  finalFindings?: string;
  finalAction?: string;
  finalPicName?: string;
  finalQcName?: string;
  finalQcPassed?: boolean;
  overallStatus?: string;
  notes?: string;
}

// ─── CMT (Magnet Trap Log) Interfaces ───────────────────────────────────────

export interface MagnetTrapItem {
  id: string;
  documentNo: string;
  checkMonth: string;
  checkDate: string;
  room: string;
  machineNo: string;
  picResponsible: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo?: string;
  isClean: boolean;
  gaussPoint1: number;
  gaussPoint2: number;
  gaussPoint3: number;
  gaussPoint4: number;
  gaussPoint5: number;
  gaussAverage: number;
  isPowerSufficient: boolean;
  foreignMatterFound?: string;
  issues?: string;
  actionTaken?: string;
  picName: string;
  qcName?: string;
  qcPassed: boolean;
  qaVerifiedBy?: string;
  qaVerifiedAt?: string;
  overallStatus: "cleared" | "warning" | "replaced" | string;
  notes?: string;
  createdAt: string;
}

export interface CreateMagnetTrapInput {
  checkMonth?: string;
  checkDate: string;
  room?: string;
  machineNo: string;
  picResponsible: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo?: string;
  isClean?: boolean;
  gaussPoint1?: number;
  gaussPoint2?: number;
  gaussPoint3?: number;
  gaussPoint4?: number;
  gaussPoint5?: number;
  foreignMatterFound?: string;
  issues?: string;
  actionTaken?: string;
  picName: string;
  qcName?: string;
  qcPassed?: boolean;
  qaVerifiedBy?: string;
  notes?: string;
}

export interface UpdateMagnetTrapInput {
  checkMonth?: string;
  checkDate?: string;
  room?: string;
  machineNo?: string;
  picResponsible?: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo?: string;
  isClean?: boolean;
  gaussPoint1?: number;
  gaussPoint2?: number;
  gaussPoint3?: number;
  gaussPoint4?: number;
  gaussPoint5?: number;
  foreignMatterFound?: string;
  issues?: string;
  actionTaken?: string;
  picName?: string;
  qcName?: string;
  qcPassed?: boolean;
  qaVerifiedBy?: string;
  overallStatus?: string;
  notes?: string;
}

// ─── MNM (Mesh Bolt Monitoring Log) Interfaces ──────────────────────────────

export interface MeshBoltMonitoringItem {
  id: string;
  documentNo: string;
  checkMonth: string;
  checkDate: string;
  room: string;
  machineNo: string;
  meshSize: string;
  picResponsible: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo?: string;
  initialBoltCount: number;
  initialIsComplete: boolean;
  initialIsTight: boolean;
  initialCondition: string;
  initialFindings?: string;
  initialAction?: string;
  initialPicName: string;
  initialQcName?: string;
  finalBoltCount: number;
  finalIsComplete: boolean;
  finalIsTight: boolean;
  isCountMatched: boolean;
  finalFindings?: string;
  finalAction?: string;
  finalPicName: string;
  finalQcName?: string;
  qaVerifiedBy?: string;
  qaVerifiedAt?: string;
  overallStatus: "passed" | "hazard_alert" | string;
  notes?: string;
  createdAt: string;
}

export interface CreateMeshBoltInput {
  checkMonth?: string;
  checkDate: string;
  room?: string;
  machineNo: string;
  meshSize: string;
  picResponsible: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo?: string;
  initialBoltCount?: number;
  initialIsComplete?: boolean;
  initialIsTight?: boolean;
  initialCondition?: string;
  initialFindings?: string;
  initialAction?: string;
  initialPicName: string;
  initialQcName?: string;
  finalBoltCount?: number;
  finalIsComplete?: boolean;
  finalIsTight?: boolean;
  finalFindings?: string;
  finalAction?: string;
  finalPicName: string;
  finalQcName?: string;
  qaVerifiedBy?: string;
  notes?: string;
}

export interface UpdateMeshBoltInput {
  checkMonth?: string;
  checkDate?: string;
  room?: string;
  machineNo?: string;
  meshSize?: string;
  picResponsible?: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo?: string;
  initialBoltCount?: number;
  initialIsComplete?: boolean;
  initialIsTight?: boolean;
  initialCondition?: string;
  initialFindings?: string;
  initialAction?: string;
  initialPicName?: string;
  initialQcName?: string;
  finalBoltCount?: number;
  finalIsComplete?: boolean;
  finalIsTight?: boolean;
  finalFindings?: string;
  finalAction?: string;
  finalPicName?: string;
  finalQcName?: string;
  qaVerifiedBy?: string;
  overallStatus?: string;
  notes?: string;
}

// ─── MNO (Oven Monitoring Log) Interfaces ───────────────────────────────────

export interface OvenMonitoringItem {
  id: string;
  documentNo: string;
  revisionCode: string;
  checkMonth: string;
  checkDate: string;
  ovenNo: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo: string;
  productName: string;
  initialTemperature: number;
  initialTime: string;
  initialMoisture: number;
  stabilizedTime: string;
  processTemperature: number;
  processMoisture1?: number;
  processMoisture2?: number;
  processMoisture3?: number;
  processMoisture4?: number;
  finalTemperature: number;
  finalTime: string;
  finalMoisture: number;
  isTargetMoistureReached: boolean;
  issues?: string;
  actionTaken?: string;
  picName: string;
  qcVerifierName?: string;
  qcPassed: boolean;
  overallStatus: "passed" | "failed" | "re_oven" | string;
  notes?: string;
  createdAt: string;
}

export interface CreateOvenMonitoringInput {
  checkMonth?: string;
  checkDate: string;
  ovenNo: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo: string;
  productName: string;
  initialTemperature: number;
  initialTime: string;
  initialMoisture: number;
  stabilizedTime: string;
  processTemperature: number;
  processMoisture1?: number;
  processMoisture2?: number;
  processMoisture3?: number;
  processMoisture4?: number;
  finalTemperature: number;
  finalTime: string;
  finalMoisture: number;
  issues?: string;
  actionTaken?: string;
  picName: string;
  qcVerifierName?: string;
  qcPassed?: boolean;
  notes?: string;
}

export interface UpdateOvenMonitoringInput {
  checkMonth?: string;
  checkDate?: string;
  ovenNo?: string;
  productionOrderId?: string;
  productionStepId?: string;
  batchNo?: string;
  productName?: string;
  initialTemperature?: number;
  initialTime?: string;
  initialMoisture?: number;
  stabilizedTime?: string;
  processTemperature?: number;
  processMoisture1?: number;
  processMoisture2?: number;
  processMoisture3?: number;
  processMoisture4?: number;
  finalTemperature?: number;
  finalTime?: string;
  finalMoisture?: number;
  issues?: string;
  actionTaken?: string;
  picName?: string;
  qcVerifierName?: string;
  qcPassed?: boolean;
  overallStatus?: string;
  notes?: string;
}

// ─── MNJ (Needle Monitoring Log) Interfaces ─────────────────────────────────

export interface NeedleMonitoringItem {
  id: string;
  documentNo: string;
  revisionCode: string;
  checkMonth: string;
  checkDate: string;
  sewingMachineNo: string;
  picResponsible: string;
  initialIsPresent: boolean;
  initialCondition: string;
  initialAnalysis?: string;
  initialAction?: string;
  finalIsPresent: boolean;
  finalCondition: string;
  finalAnalysis?: string;
  finalAction?: string;
  needleStockInRoom: number;
  picName: string;
  qcVerifierName?: string;
  overallStatus: "passed" | "hazard_alert" | string;
  notes?: string;
  createdAt: string;
}

export interface CreateNeedleInput {
  checkMonth?: string;
  checkDate: string;
  sewingMachineNo: string;
  picResponsible: string;
  initialIsPresent?: boolean;
  initialCondition?: string;
  initialAnalysis?: string;
  initialAction?: string;
  finalIsPresent?: boolean;
  finalCondition?: string;
  finalAnalysis?: string;
  finalAction?: string;
  needleStockInRoom: number;
  picName: string;
  qcVerifierName?: string;
  notes?: string;
}

export interface UpdateNeedleInput {
  checkMonth?: string;
  checkDate?: string;
  sewingMachineNo?: string;
  picResponsible?: string;
  initialIsPresent?: boolean;
  initialCondition?: string;
  initialAnalysis?: string;
  initialAction?: string;
  finalIsPresent?: boolean;
  finalCondition?: string;
  finalAnalysis?: string;
  finalAction?: string;
  needleStockInRoom?: number;
  picName?: string;
  qcVerifierName?: string;
  overallStatus?: string;
  notes?: string;
}

// ─── MNG (Scissor Monitoring Log) Interfaces ────────────────────────────────

export interface ScissorMonitoringItem {
  id: string;
  documentNo: string;
  revisionCode: string;
  checkMonth: string;
  checkDate: string;
  location: string;
  picResponsible: string;
  initialCount: number;
  initialCondition: string;
  initialAnalysis?: string;
  initialAction?: string;
  finalCount: number;
  finalCondition: string;
  finalAnalysis?: string;
  finalAction?: string;
  isCountMatched: boolean;
  picName: string;
  qcVerifierName?: string;
  overallStatus: "passed" | "hazard_alert" | string;
  notes?: string;
  createdAt: string;
}

export interface CreateScissorInput {
  checkMonth?: string;
  checkDate: string;
  location?: string;
  picResponsible: string;
  initialCount: number;
  initialCondition?: string;
  initialAnalysis?: string;
  initialAction?: string;
  finalCount: number;
  finalCondition?: string;
  finalAnalysis?: string;
  finalAction?: string;
  picName: string;
  qcVerifierName?: string;
  notes?: string;
}

export interface UpdateScissorInput {
  checkMonth?: string;
  checkDate?: string;
  location?: string;
  picResponsible?: string;
  initialCount?: number;
  initialCondition?: string;
  initialAnalysis?: string;
  initialAction?: string;
  finalCount?: number;
  finalCondition?: string;
  finalAnalysis?: string;
  finalAction?: string;
  picName?: string;
  qcVerifierName?: string;
  overallStatus?: string;
  notes?: string;
}

// ─── CPP (Metal Detector Cleaning Log) Interfaces ───────────────────────────

export interface MetalCleaningItem {
  id: string;
  documentNo: string;
  checkMonth: string;
  checkDate: string;
  machineNo: string;
  location: string;
  cleaningType: string;
  sensorCleanliness: string;
  beltCleanliness: string;
  rejectBinCleanliness: string;
  physicalCondition: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  operatorName: string;
  qcInspectorName?: string;
  overallStatus: "passed" | "needs_cleaning" | "maintenance" | string;
  notes?: string;
  createdAt: string;
}

export interface CreateMetalCleaningInput {
  checkMonth?: string;
  checkDate: string;
  machineNo?: string;
  location?: string;
  cleaningType?: string;
  sensorCleanliness?: string;
  beltCleanliness?: string;
  rejectBinCleanliness?: string;
  physicalCondition?: string;
  startTime: string;
  endTime: string;
  totalHours?: number;
  operatorName: string;
  qcInspectorName?: string;
  notes?: string;
}

export interface UpdateMetalCleaningInput {
  checkMonth?: string;
  checkDate?: string;
  machineNo?: string;
  location?: string;
  cleaningType?: string;
  sensorCleanliness?: string;
  beltCleanliness?: string;
  rejectBinCleanliness?: string;
  physicalCondition?: string;
  startTime?: string;
  endTime?: string;
  totalHours?: number;
  operatorName?: string;
  qcInspectorName?: string;
  overallStatus?: string;
  notes?: string;
}

// ─── VMD (Metal Detector Verification Log) Interfaces ───────────────────────

export interface MetalVerificationItem {
  id: string;
  documentNo: string;
  revisionCode: string;
  checkMonth: string;
  checkDate: string;
  productType: "gula_semut" | "gula_cair" | string;
  location: string;
  packageCategory: string;
  monitoringRound: number;
  checkTime: string;

  feTestPieceSize: string;
  feAlarmTriggered: boolean;
  feConveyorStopped: boolean;
  fePassed: boolean;

  nonFeTestPieceSize: string;
  nonFeAlarmTriggered: boolean;
  nonFeConveyorStopped: boolean;
  nonFePassed: boolean;

  ssTestPieceSize: string;
  ssAlarmTriggered: boolean;
  ssConveyorStopped: boolean;
  ssPassed: boolean;

  isAllPiecesPassed: boolean;
  correctiveAction?: string;
  picName: string;
  qcVerifierName?: string;
  overallStatus: "passed" | "failed" | string;
  notes?: string;
  createdAt: string;
}

export interface CreateMetalVerificationInput {
  checkMonth?: string;
  checkDate: string;
  productType?: string;
  location?: string;
  packageCategory?: string;
  monitoringRound?: number;
  checkTime: string;

  feTestPieceSize?: string;
  feAlarmTriggered?: boolean;
  feConveyorStopped?: boolean;

  nonFeTestPieceSize?: string;
  nonFeAlarmTriggered?: boolean;
  nonFeConveyorStopped?: boolean;

  ssTestPieceSize?: string;
  ssAlarmTriggered?: boolean;
  ssConveyorStopped?: boolean;

  correctiveAction?: string;
  picName: string;
  qcVerifierName?: string;
  notes?: string;
}

export interface UpdateMetalVerificationInput {
  checkMonth?: string;
  checkDate?: string;
  productType?: string;
  location?: string;
  packageCategory?: string;
  monitoringRound?: number;
  checkTime?: string;

  feTestPieceSize?: string;
  feAlarmTriggered?: boolean;
  feConveyorStopped?: boolean;

  nonFeTestPieceSize?: string;
  nonFeAlarmTriggered?: boolean;
  nonFeConveyorStopped?: boolean;

  ssTestPieceSize?: string;
  ssAlarmTriggered?: boolean;
  ssConveyorStopped?: boolean;

  correctiveAction?: string;
  picName?: string;
  qcVerifierName?: string;
  overallStatus?: string;
  notes?: string;
}

// ─── PJD (Finished Goods Inspection Log) Interfaces ─────────────────────────

export interface FinishedGoodsInspectionItem {
  id: string;
  documentNo: string;
  revisionCode: string;
  checkMonth: string;
  checkDate: string;
  productName: string;
  batchNo: string;
  rawMaterialCode?: string;
  productionOrderId?: string;

  primaryPackaging: string;
  secondaryPackaging: string;
  netWeight: number;
  grossWeight: number;

  appearanceShape: string;
  aroma: string;
  colorScore: number;
  colorDescription?: string;
  taste: string;

  isFreeForeignMatter: boolean;
  foreignMatterNotes?: string;
  moistureContent: number;
  isMoistureStandard: boolean;

  inspectionDecision: "lolos" | "ditolak" | string;
  notes?: string;
  qcPersonnelName: string;
  qaVerifiedBy?: string;
  createdAt: string;
}

export interface CreateFinishedGoodsInput {
  checkMonth?: string;
  checkDate: string;
  productName: string;
  batchNo: string;
  rawMaterialCode?: string;
  productionOrderId?: string;

  primaryPackaging?: string;
  secondaryPackaging?: string;
  netWeight: number;
  grossWeight: number;

  appearanceShape?: string;
  aroma?: string;
  colorScore: number;
  colorDescription?: string;
  taste?: string;

  isFreeForeignMatter?: boolean;
  foreignMatterNotes?: string;
  moistureContent: number;

  inspectionDecision?: string;
  notes?: string;
  qcPersonnelName: string;
  qaVerifiedBy?: string;
}

export interface UpdateFinishedGoodsInput {
  checkMonth?: string;
  checkDate?: string;
  productName?: string;
  batchNo?: string;
  rawMaterialCode?: string;
  productionOrderId?: string;

  primaryPackaging?: string;
  secondaryPackaging?: string;
  netWeight?: number;
  grossWeight?: number;

  appearanceShape?: string;
  aroma?: string;
  colorScore?: number;
  colorDescription?: string;
  taste?: string;

  isFreeForeignMatter?: boolean;
  foreignMatterNotes?: string;
  moistureContent?: number;

  inspectionDecision?: string;
  notes?: string;
  qcPersonnelName?: string;
  qaVerifiedBy?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLK: Packaging Label Check Types (Form QC-018-PLK)
// ─────────────────────────────────────────────────────────────────────────────

export interface PackagingLabelCheckLineItem {
  id?: string;
  logId?: string;
  itemNo: number;
  itemName: string;
  itemCode: string;
  batchNo: string;
  buyerName?: string;
  packagingType?: string;
  stickerNo?: string;
  isBatchMatch: boolean;
  isExpiryMatch: boolean;
  isCertLogoMatch: boolean;
  isPrintQualityGood: boolean;
  isPositionAligned: boolean;
  inspectedQty: number;
  passedQty: number;
  rejectedQty: number;
  itemDecision: "lolos" | "ditolak" | string;
  correctiveAction?: string;
  notes?: string;
}

export interface PackagingLabelCheckItem {
  id: string;
  documentNo: string;
  checkDate: string;
  checkMonth: string;
  handoverReportId?: string;
  handoverReportNo?: string;
  batchNo?: string;
  fairtradeStatus: string;
  certification: string;
  qcInspectorName: string;
  qcInspectorSignDate?: string;
  qcSupervisorName?: string;
  qcSupervisorSignDate?: string;
  overallDecision: "lolos" | "ditolak" | string;
  notes?: string;
  items?: PackagingLabelCheckLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackagingLabelCheckInput {
  checkDate: string;
  checkMonth?: string;
  handoverReportId?: string;
  handoverReportNo?: string;
  batchNo?: string;
  fairtradeStatus?: string;
  certification?: string;
  qcInspectorName: string;
  qcInspectorSignDate?: string;
  qcSupervisorName?: string;
  qcSupervisorSignDate?: string;
  overallDecision?: string;
  notes?: string;
  items: PackagingLabelCheckLineItem[];
}

export interface UpdatePackagingLabelCheckInput {
  checkDate?: string;
  checkMonth?: string;
  batchNo?: string;
  fairtradeStatus?: string;
  certification?: string;
  qcInspectorName?: string;
  qcInspectorSignDate?: string;
  qcSupervisorName?: string;
  qcSupervisorSignDate?: string;
  overallDecision?: string;
  notes?: string;
  items?: PackagingLabelCheckLineItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CCO: Container Checklist Types (Form QC-008-CCO.02)
// ─────────────────────────────────────────────────────────────────────────────

export interface ContainerChecklistItem {
  id: string;
  documentNo: string;
  checkDate: string;
  checkMonth: string;

  idCardType: "KTP" | "SIM" | string;
  idCardNumber: string;
  driverName: string;
  birthDetails?: string;
  gender?: string;
  address?: string;
  religion?: string;
  maritalStatus?: string;
  cardValidity?: string;
  transporterCompany: string;
  vehicleLicensePlate: string;

  containerName: string;
  containerNumber: string;
  containerSize: "20ft" | "40ft" | "40ft HC" | string;
  sealNumber: string;
  shippingInstructionNo?: string;
  eirNumber?: string;
  erNumber?: string;

  cabinAreaStatus: "aman" | "mencurigakan" | string;
  underVehicleStatus: "aman" | "mencurigakan" | string;
  insideContainerStatus: "aman" | "mencurigakan" | string;
  suspiciousNotes?: string;

  floorCleanliness: "bersih" | "kotor" | string;
  rightWallCleanliness: "bersih" | "kotor" | string;
  leftWallCleanliness: "bersih" | "kotor" | string;
  roofCleanliness: "bersih" | "kotor" | string;
  doorCleanliness: "bersih" | "kotor" | string;
  cleanlinessNotes?: string;

  floorHoleStatus: "rapat" | "bocor" | string;
  rightWallHoleStatus: "rapat" | "bocor" | string;
  leftWallHoleStatus: "rapat" | "bocor" | string;
  roofHoleStatus: "rapat" | "bocor" | string;
  doorHoleStatus: "rapat" | "bocor" | string;
  holeNotes?: string;

  sealTime?: string;
  capTime?: string;
  departureTime?: string;
  palletDetails?: string;
  shipmentDestination: string;

  inspectorQc: string;
  qcSignDate?: string;
  verifierQa: string;
  qaSignDate?: string;
  overallDecision: "lolos" | "ditolak" | string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContainerChecklistInput {
  checkDate: string;
  checkMonth?: string;

  idCardType: string;
  idCardNumber: string;
  driverName: string;
  birthDetails?: string;
  gender?: string;
  address?: string;
  religion?: string;
  maritalStatus?: string;
  cardValidity?: string;
  transporterCompany: string;
  vehicleLicensePlate: string;

  containerName: string;
  containerNumber: string;
  containerSize: string;
  sealNumber: string;
  shippingInstructionNo?: string;
  eirNumber?: string;
  erNumber?: string;

  cabinAreaStatus: string;
  underVehicleStatus: string;
  insideContainerStatus: string;
  suspiciousNotes?: string;

  floorCleanliness: string;
  rightWallCleanliness: string;
  leftWallCleanliness: string;
  roofCleanliness: string;
  doorCleanliness: string;
  cleanlinessNotes?: string;

  floorHoleStatus: string;
  rightWallHoleStatus: string;
  leftWallHoleStatus: string;
  roofHoleStatus: string;
  doorHoleStatus: string;
  holeNotes?: string;

  sealTime?: string;
  capTime?: string;
  departureTime?: string;
  palletDetails?: string;
  shipmentDestination: string;

  inspectorQc: string;
  qcSignDate?: string;
  verifierQa: string;
  qaSignDate?: string;
  overallDecision?: string;
  notes?: string;
}

export interface UpdateContainerChecklistInput {
  checkDate?: string;
  checkMonth?: string;

  idCardType?: string;
  idCardNumber?: string;
  driverName?: string;
  birthDetails?: string;
  gender?: string;
  address?: string;
  religion?: string;
  maritalStatus?: string;
  cardValidity?: string;
  transporterCompany?: string;
  vehicleLicensePlate?: string;

  containerName?: string;
  containerNumber?: string;
  containerSize?: string;
  sealNumber?: string;
  shippingInstructionNo?: string;
  eirNumber?: string;
  erNumber?: string;

  cabinAreaStatus?: string;
  underVehicleStatus?: string;
  insideContainerStatus?: string;
  suspiciousNotes?: string;

  floorCleanliness?: string;
  rightWallCleanliness?: string;
  leftWallCleanliness?: string;
  roofCleanliness?: string;
  doorCleanliness?: string;
  cleanlinessNotes?: string;

  floorHoleStatus?: string;
  rightWallHoleStatus?: string;
  leftWallHoleStatus?: string;
  roofHoleStatus?: string;
  doorHoleStatus?: string;
  holeNotes?: string;

  sealTime?: string;
  capTime?: string;
  departureTime?: string;
  palletDetails?: string;
  shipmentDestination?: string;

  inspectorQc?: string;
  qcSignDate?: string;
  verifierQa?: string;
  qaSignDate?: string;
  overallDecision?: string;
  notes?: string;
}
