"use client";

import * as React from "react";
import { ClipboardCheck, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { approvalApi, ApprovalRequest } from "@/lib/api/approval";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  purchase_order: "Pesanan Pembelian",
  sales_order: "Pesanan Penjualan",
};

export default function ApprovalCenterPage() {
  const [requests, setRequests] = React.useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);

  const loadRequests = React.useCallback(() => {
    setIsLoading(true);
    approvalApi
      .listMyPendingApprovals()
      .then((res) => setRequests(res.data || []))
      .catch((err) => {
        console.error("Failed to load pending approvals", err);
        setLoadError("Gagal memuat daftar approval dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (req: ApprovalRequest) => {
    setActingId(req.id);
    try {
      await approvalApi.approveStep(req.id);
      loadRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyetujui dokumen.");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (req: ApprovalRequest) => {
    const comments = prompt("Alasan penolakan (opsional):") || "";
    setActingId(req.id);
    try {
      await approvalApi.rejectStep(req.id, comments);
      loadRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menolak dokumen.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-brand-primary" />
          <span>Pusat Persetujuan (Approval Center)</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Dokumen yang menunggu persetujuan Anda saat ini.
        </p>
      </div>

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
          <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p>Tidak ada dokumen yang menunggu persetujuan Anda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const currentStep = req.steps.find((s) => s.levelOrder === req.currentLevel);
            return (
              <Card key={req.id} className="border-border shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-primary">{req.documentNumber}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-tint text-brand-primary">
                        {DOCUMENT_TYPE_LABELS[req.documentType] || req.documentType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Diajukan oleh {req.requesterName || "-"} · Level {req.currentLevel} dari {req.steps.length} ({currentStep?.approverRole})
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <MoneyDisplay amount={req.amount} className="text-sm font-black text-brand-dark" />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actingId === req.id}
                        onClick={() => handleReject(req)}
                        className="h-8 gap-1 text-xs font-bold border-rose-300 text-rose-700 hover:bg-rose-50"
                      >
                        <X className="h-3.5 w-3.5" /> Tolak
                      </Button>
                      <Button
                        size="sm"
                        variant="gradient"
                        disabled={actingId === req.id}
                        onClick={() => handleApprove(req)}
                        className="h-8 gap-1 text-xs font-bold"
                      >
                        <Check className="h-3.5 w-3.5" /> Setujui
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
