"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Lock } from "lucide-react";
import { ProductionBatchRecord, PRODUCTION_STEPS } from "../_lib/production-flow-types";

interface StepSidebarProps {
  activeBatch: ProductionBatchRecord;
  currentStep: number;
  completedSteps: number[];
  onSelectStep: (stepId: number) => void;
  onBackToOverview: () => void;
}

export function StepSidebar({
  activeBatch,
  currentStep,
  completedSteps,
  onSelectStep,
  onBackToOverview,
}: StepSidebarProps) {
  const progressPct = Math.round((completedSteps.length / PRODUCTION_STEPS.length) * 100);

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="p-4 border-b border-border bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-[10px] font-mono">
            {activeBatch.batchNo}
          </Badge>
          <span className="text-[11px] font-bold text-blue-700">{progressPct}% Selesai</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="pt-2">
          <CardTitle className="text-xs font-bold text-foreground">
            Alur Kendali 10 Tahap (LBM ➔ LST)
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Tahap selanjutnya terkunci hingga tahap aktif selesai diisi &amp; diverifikasi.
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-2 space-y-1">
        {PRODUCTION_STEPS.map((step) => {
          const isDone = completedSteps.includes(step.id);
          const isCurr = currentStep === step.id;
          // Step 1 is always unlocked. Next step is unlocked ONLY if the previous step is completed.
          const isUnlocked = step.id === 1 || isDone || completedSteps.includes(step.id - 1);
          const isLocked = !isUnlocked;

          return (
            <button
              key={step.id}
              type="button"
              disabled={isLocked}
              onClick={() => {
                if (isUnlocked) onSelectStep(step.id);
              }}
              title={
                isLocked
                  ? `Tahap ${step.id} (${step.title}) terkunci. Selesaikan Tahap ${step.id - 1} terlebih dahulu.`
                  : step.title
              }
              className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-all border ${
                isCurr
                  ? "bg-blue-50 border-blue-300 text-blue-950 font-semibold shadow-xs cursor-pointer"
                  : isDone
                  ? "border-transparent hover:bg-slate-50 text-foreground cursor-pointer"
                  : isLocked
                  ? "border-transparent opacity-50 bg-slate-50/60 text-slate-400 cursor-not-allowed"
                  : "border-transparent text-muted-foreground hover:bg-slate-50 hover:text-foreground cursor-pointer"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 transition-colors ${
                  isDone
                    ? "bg-emerald-600 text-white"
                    : isCurr
                    ? "bg-blue-600 text-white ring-2 ring-blue-200"
                    : isLocked
                    ? "bg-slate-100 text-slate-400 border border-slate-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isLocked ? (
                  <Lock className="h-3 w-3 text-slate-400" />
                ) : (
                  step.id
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs truncate ${isLocked ? "text-slate-400 font-normal" : ""}`}>
                    {step.title}
                  </span>
                  {isDone ? (
                    <span className="text-[10px] text-emerald-600 font-bold shrink-0">Lolos</span>
                  ) : isLocked ? (
                    <span className="text-[9px] text-slate-400 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded font-mono shrink-0">
                      Terkunci
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="font-mono">{step.docCode}</span>
                  <span>•</span>
                  <span className="truncate">{step.owner}</span>
                </div>
              </div>
            </button>
          );
        })}

        <div className="pt-3 border-t border-border mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToOverview}
            className="w-full text-xs text-muted-foreground hover:text-foreground justify-start gap-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Pipeline Overview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
