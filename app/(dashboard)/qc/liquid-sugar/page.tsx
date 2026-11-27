"use client";

import * as React from "react";
import { Droplets, Calendar, ArrowRight, Lock, Layers, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { qcApi, LiquidSugarFlowStatusItem } from "@/lib/api/qc";
import { FlowStepper, isStageUnlocked, isStageDone } from "./_components/flow-stepper";
import { Stage1PrepForms } from "./_components/stage-1-prep-forms";
import { Stage2PreProcessForms } from "./_components/stage-2-pre-process-forms";
import { Stage3MncForm } from "./_components/stage-3-mnc-form";
import { Stage4PjcForm } from "./_components/stage-4-pjc-form";
import { Stage5VhcForm } from "./_components/stage-5-vhc-form";

export default function QCLiquidSugarPage() {
  const [mode, setMode] = React.useState<"flow" | "register">("flow");
  const [month, setMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [batchNo, setBatchNo] = React.useState<string>("");
  const [activeStage, setActiveStage] = React.useState<number>(1);
  const [flowStatus, setFlowStatus] = React.useState<LiquidSugarFlowStatusItem | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const st = parseInt(sp.get("stage") || "", 10);
      if (st >= 1 && st <= 5) {
        setActiveStage(st);
        setMode("register");
      }
      const b = sp.get("batchNo");
      if (b) setBatchNo(b);
    }
  }, []);

  const fetchFlowStatus = React.useCallback(async () => {
    try {
      const res = await qcApi.getLiquidSugarFlowStatus({
        month: month || undefined,
        batchNo: batchNo.trim() || undefined,
      });
      setFlowStatus(res.data || null);
    } catch (err) {
      console.error("Error fetching liquid sugar flow status:", err);
    }
  }, [month, batchNo]);

  React.useEffect(() => {
    fetchFlowStatus();
  }, [fetchFlowStatus]);

  const handleSelectStage = (stageId: number) => {
    setNotice(null);
    if (!isStageUnlocked(stageId, mode, flowStatus)) {
      setNotice(
        `Tahap ${stageId} terkunci pada mode Alur Batch Berurutan. Selesaikan seluruh form di Tahap ${stageId - 1} terlebih dahulu (atau pindah ke mode Register Bulanan untuk melihat seluruh arsip).`
      );
      return;
    }
    setActiveStage(stageId);
  };

  const currentDone = isStageDone(activeStage, flowStatus);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Flow Gula Cair dari Gula Semut (QC End-to-End)"
        description="Alur 5 tahap (9 Form QC): Persiapan (MSS, PVK, VMD, CPP) → Pra-Masak (MSS, QC-011 MNP/MNB) → Pengolahan (MNC) → Produk Jadi (PJC) → Verifikasi Hasil Cuci (VHC)"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800">
            <Droplets className="h-3 w-3 mr-1 text-amber-600" />
            Ruang Gula Cair
          </Badge>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setMode("flow")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                mode === "flow" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Alur Batch Berurutan
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                mode === "register" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListChecks className="h-3.5 w-3.5" />
              Register Bulanan
            </button>
          </div>
        </div>
      </PageHeader>

      {/* Filter & Batch Selector Bar */}
      <Card className="border shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold text-muted-foreground">Bulan:</span>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 w-36 text-xs" />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-muted-foreground">Batch No:</span>
              <Input
                placeholder="Semua / Ketik Batch (misal: GC-2611-001)"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                className="h-8 w-60 text-xs font-mono"
                list="liquid-sugar-batches"
              />
              <datalist id="liquid-sugar-batches">
                {(flowStatus?.batchNumbers || []).map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              {batchNo && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setBatchNo("")}>
                  Reset
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              Progres Alur: <strong className="text-foreground font-mono">{flowStatus?.completedStagesCount ?? 0} / 5 Tahap</strong>
            </span>
            {activeStage < 5 && (
              <Button
                size="sm"
                variant={currentDone ? "default" : "outline"}
                disabled={mode === "flow" && !currentDone}
                onClick={() => handleSelectStage(activeStage + 1)}
                className={`h-8 text-xs gap-1.5 ${currentDone ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
              >
                {mode === "flow" && !currentDone ? (
                  <>
                    <Lock className="h-3 w-3" />
                    Selesaikan Tahap {activeStage}
                  </>
                ) : (
                  <>
                    Lanjut ke Tahap {activeStage + 1}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {notice && (
        <div role="alert" className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
          {notice}
        </div>
      )}

      {/* 5-Stage Stepper */}
      <FlowStepper activeStage={activeStage} mode={mode} flowStatus={flowStatus} onSelectStage={handleSelectStage} />

      {/* Active Stage Content */}
      <div className="pt-1">
        {activeStage === 1 && (
          <Stage1PrepForms month={month} batchNo={batchNo} flowStatus={flowStatus} onDataChanged={fetchFlowStatus} />
        )}
        {activeStage === 2 && (
          <Stage2PreProcessForms month={month} batchNo={batchNo} flowStatus={flowStatus} onDataChanged={fetchFlowStatus} />
        )}
        {activeStage === 3 && (
          <Stage3MncForm month={month} batchNo={batchNo} onDataChanged={fetchFlowStatus} />
        )}
        {activeStage === 4 && (
          <Stage4PjcForm month={month} batchNo={batchNo} onDataChanged={fetchFlowStatus} />
        )}
        {activeStage === 5 && (
          <Stage5VhcForm month={month} batchNo={batchNo} onDataChanged={fetchFlowStatus} />
        )}
      </div>
    </div>
  );
}
