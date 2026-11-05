"use client";

import * as React from "react";
import { CheckCircle2, Clock, XCircle, FileText, Send, UserCheck, ShieldAlert } from "lucide-react";
import { approvalApi, ApprovalRequest, ApprovalStep } from "@/lib/api/approval";

export interface ApprovalTimelineProps {
  documentType: "purchase_request" | "purchase_order" | "sales_order";
  documentId: string;
  creatorName?: string;
  creatorEmail?: string;
  createdAt?: string;
  currentStatus: string;
  rejectionReason?: string;
}

export function canUserApprove(
  userRole?: string,
  userEmail?: string,
  creatorEmail?: string,
  approvalRequest?: ApprovalRequest | null,
  currentStatus?: string
): boolean {
  if (!userRole) return false;
  const status = (currentStatus || "").toLowerCase();
  const isPending =
    status === "pending_approval" ||
    status === "pending" ||
    status === "submitted" ||
    status === "pending_supervisor" ||
    status === "pending_owner";
  if (!isPending) return false;

  // Segregation of Duties: Creator cannot approve their own document
  if (userEmail && creatorEmail && userEmail.toLowerCase().trim() === creatorEmail.toLowerCase().trim()) {
    return false;
  }

  // If there is an active approval request with steps from dynamic workflow:
  if (approvalRequest && approvalRequest.steps && approvalRequest.steps.length > 0) {
    if (approvalRequest.status !== "pending") return false;
    const currentStep = approvalRequest.steps.find((s) => s.levelOrder === approvalRequest.currentLevel);
    if (!currentStep) return false;
    return currentStep.approverRole.toLowerCase() === userRole.toLowerCase();
  }

  // Fallback for documents awaiting approval without a workflow:
  if (status === "pending_supervisor") {
    return userRole.toLowerCase() === "manager" || userRole.toLowerCase() === "supervisor";
  }
  if (status === "pending_owner") {
    return userRole.toLowerCase() === "admin";
  }

  // In pending_approval or submitted without an approval workflow:
  // Only admin has authority as fallback; Manager cannot approve without workflow assignment
  return userRole.toLowerCase() === "admin";
}

export function ApprovalTimeline({
  documentType,
  documentId,
  creatorName,
  createdAt,
  currentStatus,
  rejectionReason,
}: ApprovalTimelineProps) {
  const [request, setRequest] = React.useState<ApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    if (!documentId) return;

    setIsLoading(true);
    approvalApi
      .getActiveRequestForDocument(documentType, documentId)
      .then((res) => {
        if (isMounted) setRequest(res.data || null);
      })
      .catch((err) => {
        console.warn("Failed to load approval request for timeline", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [documentType, documentId, currentStatus]);

  const normStatus = (currentStatus || "").toLowerCase();
  const isDraft = normStatus === "draft";
  const isPending =
    normStatus === "pending_approval" ||
    normStatus === "pending" ||
    normStatus === "submitted" ||
    normStatus === "pending_supervisor" ||
    normStatus === "pending_owner";
  const isApproved = normStatus === "approved" || normStatus === "confirmed";
  const isRejected = normStatus === "rejected";

  const steps: ApprovalStep[] = request?.steps || [];

  return (
    <div className="rounded-xl border border-border bg-slate-50/60 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-primary" />
          <h4 className="text-xs font-bold text-foreground">Timeline & Riwayat Approval Hirarki</h4>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          {isDraft && "Status Saat Ini: Draft"}
          {isPending && "Status Saat Ini: Menunggu Approval Atasan"}
          {isApproved && "Status Saat Ini: Selesai Disetujui"}
          {isRejected && "Status Saat Ini: Ditolak"}
        </span>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
          Memuat riwayat tahapan approval...
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {/* Step 1: Draft Creation */}
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-6 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-white">
              <FileText className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">1. Dokumen Dibuat (Draft)</p>
                {createdAt && <span className="text-[10px] text-muted-foreground">{createdAt}</span>}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dibuat oleh <span className="font-medium text-foreground">{creatorName || "Pengguna"}</span>
              </p>
            </div>
          </div>

          {/* Step 2: Submission */}
          <div className="relative flex items-start gap-3">
            <div
              className={`absolute -left-6 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                isDraft
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <Send className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">2. Pengajuan untuk Approval</p>
              <p className="text-[11px] text-muted-foreground">
                {isDraft
                  ? "Dokumen masih dalam bentuk Draft dan belum diajukan."
                  : "Dokumen telah diajukan dan masuk ke dalam antrean persetujuan atasan."}
              </p>
            </div>
          </div>

          {/* Step 3..N: Hierarchy Steps */}
          {steps.length > 0 ? (
            steps.map((step, idx) => {
              const isCurrent = isPending && step.levelOrder === request?.currentLevel;
              const isDone = step.status === "approved";
              const isStepRejected = step.status === "rejected";
              const isWaiting = step.status === "pending" && !isCurrent;

              let iconBg = "bg-slate-100 text-slate-500";
              let Icon = UserCheck;
              let label = `Menunggu giliran (Level ${step.levelOrder})`;

              if (isDone) {
                iconBg = "bg-emerald-100 text-emerald-700";
                Icon = CheckCircle2;
                label = `Disetujui oleh ${step.actedByName || "Approver"}${
                  step.actedAt ? ` pada ${step.actedAt.slice(0, 10)}` : ""
                }`;
              } else if (isStepRejected) {
                iconBg = "bg-rose-100 text-rose-700";
                Icon = XCircle;
                label = `Ditolak oleh ${step.actedByName || "Approver"}${
                  step.actedAt ? ` pada ${step.actedAt.slice(0, 10)}` : ""
                }`;
              } else if (isCurrent) {
                iconBg = "bg-amber-100 text-amber-800 animate-pulse";
                Icon = Clock;
                label = `Sedang Menunggu Persetujuan (Level ${step.levelOrder})`;
              }

              return (
                <div key={step.id || idx} className="relative flex items-start gap-3">
                  <div className={`absolute -left-6 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${iconBg}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">
                        {idx + 3}. Persetujuan Tingkat {step.levelOrder} ({step.approverRole.toUpperCase()})
                      </p>
                      {step.actedAt && (
                        <span className="text-[10px] text-muted-foreground">{step.actedAt.slice(0, 10)}</span>
                      )}
                    </div>
                    <p className={`text-[11px] ${isCurrent ? "font-semibold text-amber-800" : "text-muted-foreground"}`}>
                      {label}
                    </p>
                    {step.comments && (
                      <div className="mt-1 rounded bg-white p-2 border border-border text-[11px] text-foreground">
                        <span className="font-semibold text-muted-foreground">Catatan: </span>
                        {step.comments}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            // Fallback when no workflow levels are configured yet
            !isDraft && (
              <div className="relative flex items-start gap-3">
                <div
                  className={`absolute -left-6 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                    isApproved
                      ? "bg-emerald-100 text-emerald-700"
                      : isRejected
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <UserCheck className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">3. Verifikasi Atasan</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isApproved
                      ? "Dokumen telah disetujui langsung oleh atasan / admin."
                      : isRejected
                      ? "Dokumen telah ditolak oleh atasan / admin."
                      : "Menunggu tindakan persetujuan dari atasan atau admin."}
                  </p>
                </div>
              </div>
            )
          )}

          {/* Final Status Step */}
          {(isApproved || isRejected) && (
            <div className="relative flex items-start gap-3">
              <div
                className={`absolute -left-6 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                  isApproved ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                }`}
              >
                {isApproved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold ${isApproved ? "text-emerald-700" : "text-rose-700"}`}>
                  {isApproved ? "Hasil Akhir: Disetujui Sepenuhnya (Approved)" : "Hasil Akhir: Ditolak (Rejected)"}
                </p>
                {isRejected && (rejectionReason || request?.steps?.find((s) => s.comments)?.comments) && (
                  <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                    Alasan Penolakan: {rejectionReason || request?.steps?.find((s) => s.comments)?.comments}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

