import { apiClient, ApiResponse } from "./client";

// BOM

export interface BOMLineInput {
  componentProductId: string;
  quantityRequired: number;
  unit?: string;
}

export interface BOMProcessInput {
  name: string;
  standardMinutes?: number;
  /** Direct labour and factory overhead per standard hour, charged to Work in Process as units pass the step. */
  laborRatePerHour?: number;
  overheadRatePerHour?: number;
  notes?: string;
  isConditional?: boolean;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: number;
  actionOnCondition?: string;
  requiresQcPass?: boolean;
  qcProcessCode?: string;
}

export interface BOMProcessItem {
  id: string;
  sequence: number;
  name: string;
  standardMinutes: number;
  laborRatePerHour?: number;
  overheadRatePerHour?: number;
  notes?: string;
  isConditional?: boolean;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: number;
  actionOnCondition?: string;
  requiresQcPass?: boolean;
  qcProcessCode?: string;
}

export interface CreateBOMInput {
  productId: string;
  name: string;
  version?: string;
  isActive?: boolean;
  lines: BOMLineInput[];
  /** Routing: the production steps every unit goes through, in order. */
  processes?: BOMProcessInput[];
}

export interface BOMLineItem {
  id: string;
  componentProductId: string;
  componentSku: string;
  componentName: string;
  quantityRequired: number;
  unit: string;
}

export interface BOMItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  name: string;
  version: string;
  isActive: boolean;
  lines: BOMLineItem[];
  processes: BOMProcessItem[];
  createdAt?: string;
}

// Production orders

export interface CreateProductionOrderInput {
  bomId: string;
  quantityToProduce: number;
  warehouseId: string;
  plannedDate?: string;
  /** "backflush" (default): materials are consumed when a batch is completed. "issued": materials are issued to the order beforehand (Transaksi Stock). */
  materialMode?: "backflush" | "issued";
}

export interface ProductionStepItem {
  id: string;
  sequence: number;
  name: string;
  standardMinutes: number;
  quantityDone: number;
  /** Units that reached this step but have not finished it. */
  waitingQuantity: number;
  status: "pending" | "in_progress" | "done" | "skipped";
  startedDate?: string;
  completedDate?: string;
  isSkipped?: boolean;
  skipReason?: string;
  requiresQcPass?: boolean;
  qcProcessCode?: string;
  qcPassed?: boolean;
  qcInspectionId?: string;
}

export interface LogStepInput {
  quantity: number;
  date?: string;
  notes?: string;
}

export interface ProductionOrderItem {
  id: string;
  orderNumber: string;
  materialMode: "backflush" | "issued";
  steps: ProductionStepItem[];
  bomId: string;
  bomName: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantityToProduce: number;
  quantityCompleted: number;
  remainingQuantity: number;
  status: "planned" | "released" | "in_progress" | "paused" | "completed" | "cancelled";
  plannedDate: string;
  actualCompletionDate: string;
  createdAt?: string;
}

export interface CompleteBatchInput {
  quantityCompleted: number;
  completionDate?: string;
  notes?: string;
}

export interface ManufacturingDashboardSummary {
  activeBoms: number;
  ordersByStatus: Record<string, number>;
  unitsCompletedThisMonth: number;
  upcomingOrders: ProductionOrderItem[];
}

// Reports

export interface DailyReportDay {
  date: string;
  plannedOrders: { orderId: string; orderNumber: string; product: string; quantityToProduce: number; quantityCompleted: number; status: string }[];
  stepOutputs: { orderId: string; orderNumber: string; product: string; step?: string; quantity: number; notes?: string }[];
  completions: { orderId: string; orderNumber: string; product: string; quantity: number; notes?: string }[];
  plannedUnits: number;
  stepUnits: number;
  unitsCompleted: number;
}

export interface DailyProductionReport {
  from: string;
  to: string;
  days: DailyReportDay[];
  plannedUnits: number;
  stepUnits: number;
  unitsCompleted: number;
}

export interface OrderSummaryReport {
  from: string;
  to: string;
  orders: {
    orderId: string;
    orderNumber: string;
    product: string;
    status: string;
    plannedDate: string;
    quantityToProduce: number;
    quantityCompleted: number;
    progressPct: number;
    actualCompletionDate?: string;
    lateDays: number;
  }[];
  byStatus: Record<string, number>;
  byProduct: { product: string; sku: string; orders: number; planned: number; completed: number; completionPct: number }[];
  plannedUnits: number;
  completedUnits: number;
  completionPct: number;
  onTimeOrders: number;
  completedOrders: number;
  onTimePct: number;
}

export interface ProcessSummaryReport {
  from: string;
  to: string;
  rows: { process: string; units: number; orders: number; activeDays: number; avgUnitsPerDay: number; standardMinutes: number; waitingUnits: number }[];
  note: string;
}

export interface WIPReport {
  orders: {
    orderId: string;
    orderNumber: string;
    product: string;
    status: string;
    materialMode: string;
    quantityToProduce: number;
    quantityCompleted: number;
    steps: { name: string; done: number; waiting: number }[];
    unitsInWip: number;
    materialCostPerUnit: number;
    issuedValue: number;
    materialValue?: number;
    laborValue?: number;
    overheadValue?: number;
    wipValue: number;
  }[];
  totalUnitsInWip: number;
  totalWipValue: number;
  totalMaterialValue?: number;
  totalLaborValue?: number;
  totalOverheadValue?: number;
  ledgerBalance?: number;
  note: string;
}

export interface ProductionStepLogItem {
  id: string;
  orderId: string;
  stepId: string;
  quantity: number;
  date: string;
  notes?: string;
  createdBy?: string;
  voided: boolean;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  createdAt?: string;
}

export interface ProductionBatchItem {
  id: string;
  productionOrderId: string;
  quantityCompleted: number;
  completionDate: string;
  notes?: string;
  voided: boolean;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
}

export const manufacturingApi = {
  listBatches: async (orderId: string): Promise<ApiResponse<ProductionBatchItem[]>> =>
    apiClient<ProductionBatchItem[]>(`/manufacturing/production-orders/${orderId}/batches`),
  voidBatch: async (orderId: string, batchId: string, reason: string): Promise<ApiResponse<ProductionOrderItem>> =>
    apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${orderId}/batches/${batchId}/void`, { method: "POST", body: JSON.stringify({ reason }) }),
  listStepLogs: async (orderId: string): Promise<ApiResponse<ProductionStepLogItem[]>> =>
    apiClient<ProductionStepLogItem[]>(`/manufacturing/production-orders/${orderId}/step-logs`),
  voidStepLog: async (orderId: string, logId: string, reason: string): Promise<ApiResponse<ProductionOrderItem>> =>
    apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${orderId}/step-logs/${logId}/void`, { method: "POST", body: JSON.stringify({ reason }) }),
  logStep: async (orderId: string, stepId: string, data: LogStepInput): Promise<ApiResponse<ProductionOrderItem>> =>
    apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${orderId}/steps/${stepId}/log`, { method: "POST", body: JSON.stringify(data) }),
  dailyReport: async (p?: { from?: string; to?: string }): Promise<ApiResponse<DailyProductionReport>> =>
    apiClient<DailyProductionReport>("/manufacturing/reports/daily", { params: p }),
  orderSummary: async (p?: { from?: string; to?: string }): Promise<ApiResponse<OrderSummaryReport>> =>
    apiClient<OrderSummaryReport>("/manufacturing/reports/order-summary", { params: p }),
  processSummary: async (p?: { from?: string; to?: string }): Promise<ApiResponse<ProcessSummaryReport>> =>
    apiClient<ProcessSummaryReport>("/manufacturing/reports/process-summary", { params: p }),
  wipReport: async (): Promise<ApiResponse<WIPReport>> => apiClient<WIPReport>("/manufacturing/reports/wip"),

  getDashboardSummary: async (): Promise<ApiResponse<ManufacturingDashboardSummary>> => {
    return apiClient<ManufacturingDashboardSummary>("/manufacturing/dashboard");
  },

  // BOM
  listBOMs: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<BOMItem[]>> => {
    return apiClient<BOMItem[]>("/manufacturing/bom", { params });
  },
  getBOM: async (id: string): Promise<ApiResponse<BOMItem>> => {
    return apiClient<BOMItem>(`/manufacturing/bom/${id}`);
  },
  createBOM: async (data: CreateBOMInput): Promise<ApiResponse<BOMItem>> => {
    return apiClient<BOMItem>("/manufacturing/bom", { method: "POST", body: JSON.stringify(data) });
  },

  // Production orders
  listProductionOrders: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<ProductionOrderItem[]>> => {
    return apiClient<ProductionOrderItem[]>("/manufacturing/production-orders", { params });
  },
  getProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}`);
  },
  createProductionOrder: async (data: CreateProductionOrderInput): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>("/manufacturing/production-orders", { method: "POST", body: JSON.stringify(data) });
  },
  releaseProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}/release`, { method: "POST" });
  },
  pauseProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}/pause`, { method: "POST" });
  },
  resumeProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}/resume`, { method: "POST" });
  },
  cancelProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}/cancel`, { method: "POST" });
  },
  completeBatch: async (id: string, data: CompleteBatchInput): Promise<ApiResponse<ProductionOrderItem>> => {
    return apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${id}/complete-batch`, { method: "POST", body: JSON.stringify(data) });
  },

  // Conditional Routing & QC Gate
  evaluateConditions: async (orderId: string, conditionField: string, value: number): Promise<ApiResponse<ProductionOrderItem>> =>
    apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${orderId}/evaluate-conditions`, { method: "POST", body: JSON.stringify({ conditionField, value }) }),
  setStepQCPass: async (orderId: string, stepId: string, qcInspectionId: string, isPassed: boolean): Promise<ApiResponse<ProductionOrderItem>> =>
    apiClient<ProductionOrderItem>(`/manufacturing/production-orders/${orderId}/steps/${stepId}/qc-pass`, { method: "POST", body: JSON.stringify({ qcInspectionId, isPassed }) }),

  // Batch Genealogy & Traceability (BR-62)
  getBackwardTraceability: async (fgBatchNo: string): Promise<ApiResponse<BatchGenealogyItem[]>> =>
    apiClient<BatchGenealogyItem[]>(`/manufacturing/traceability/backward/${encodeURIComponent(fgBatchNo)}`),
  getForwardTraceability: async (materialBatchNo: string): Promise<ApiResponse<BatchGenealogyItem[]>> =>
    apiClient<BatchGenealogyItem[]>(`/manufacturing/traceability/forward/${encodeURIComponent(materialBatchNo)}`),

  // Material Requisitions (BPB, PBPK, LPC)
  listRequisitions: async (params?: { type?: string; status?: string }): Promise<ApiResponse<MaterialRequisitionItem[]>> =>
    apiClient<MaterialRequisitionItem[]>("/manufacturing/requisitions", { params }),
  getRequisition: async (id: string): Promise<ApiResponse<MaterialRequisitionItem>> =>
    apiClient<MaterialRequisitionItem>(`/manufacturing/requisitions/${id}`),
  createRequisition: async (input: CreateRequisitionInput): Promise<ApiResponse<MaterialRequisitionItem>> =>
    apiClient<MaterialRequisitionItem>("/manufacturing/requisitions", { method: "POST", body: JSON.stringify(input) }),
  updateRequisitionStatus: async (id: string, input: UpdateRequisitionStatusInput): Promise<ApiResponse<void>> =>
    apiClient<void>(`/manufacturing/requisitions/${id}/status`, { method: "PUT", body: JSON.stringify(input) }),

  // Oven Logs (LHO)
  listOvenLogs: async (params?: { date?: string; ovenNumber?: string }): Promise<ApiResponse<OvenProductionLogItem[]>> =>
    apiClient<OvenProductionLogItem[]>("/manufacturing/oven-logs", { params }),
  getOvenLog: async (id: string): Promise<ApiResponse<OvenProductionLogItem>> =>
    apiClient<OvenProductionLogItem>(`/manufacturing/oven-logs/${id}`),
  createOvenLog: async (input: CreateOvenLogInput): Promise<ApiResponse<OvenProductionLogItem>> =>
    apiClient<OvenProductionLogItem>("/manufacturing/oven-logs", { method: "POST", body: JSON.stringify(input) }),
};

export interface BatchGenealogyItem {
  id: string;
  parentBatchNo: string;
  parentProductId: string;
  parentProductName?: string;
  childBatchNo: string;
  childProductId: string;
  childProductName?: string;
  productionOrderId: string;
  orderNumber?: string;
  quantityUsed: number;
  uom?: string;
  recordedAt: string;
}

export type RequisitionType = "raw_material" | "packaging" | "liquid_sugar";

export interface MaterialRequisitionLineItem {
  id?: string;
  productId: string;
  productName: string;
  batchNo?: string;
  quantityRequested: number;
  quantityIssued: number;
  quantityUsed: number;
  quantityReject: number;
  quantityReturned: number;
  uom: string;
  notes?: string;
}

export interface LiquidSugarDispensingItem {
  id?: string;
  jerryCanNo: number;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  brix?: number;
  aromaColor?: string;
  notes?: string;
}

export interface MaterialRequisitionItem {
  id: string;
  requestNo: string;
  requisitionType: RequisitionType;
  productionOrderId?: string;
  orderNumber?: string;
  requestDate: string;
  department: string;
  requestedBy: string;
  issuedBy?: string;
  status: "draft" | "submitted" | "issued" | "completed" | "cancelled";
  notes?: string;
  lines?: MaterialRequisitionLineItem[];
  dispensingItems?: LiquidSugarDispensingItem[];
  createdAt: string;
}

export interface CreateRequisitionInput {
  requisitionType: RequisitionType;
  productionOrderId?: string;
  orderNumber?: string;
  requestDate: string;
  department: string;
  requestedBy?: string;
  notes?: string;
  lines?: MaterialRequisitionLineItem[];
  dispensingItems?: LiquidSugarDispensingItem[];
}

export interface UpdateRequisitionStatusInput {
  status: string;
  issuedBy?: string;
}

export interface OvenCycleItem {
  id?: string;
  cycleNumber: number;
  timeIn: string;
  timeOut: string;
  temperature: number;
  trayWeight: number;
  paperWeight: number;
  grossInWeight: number;
  grossOutWeight: number;
  netWetWeight: number;
  netDryWeight: number;
  moistureLossPercent: number;
  moistureContent?: number;
  notes?: string;
}

export interface OvenProductionLogItem {
  id: string;
  logNo: string;
  productionOrderId?: string;
  orderNumber?: string;
  date: string;
  ovenNumber: string;
  operatorName: string;
  shift: string;
  totalCycles: number;
  totalWetWeight: number;
  totalDryWeight: number;
  avgMoistureLoss: number;
  notes?: string;
  cycles?: OvenCycleItem[];
  createdAt: string;
}

export interface CreateOvenLogInput {
  productionOrderId?: string;
  orderNumber?: string;
  date: string;
  ovenNumber: string;
  operatorName?: string;
  shift: string;
  notes?: string;
  cycles: OvenCycleItem[];
}

