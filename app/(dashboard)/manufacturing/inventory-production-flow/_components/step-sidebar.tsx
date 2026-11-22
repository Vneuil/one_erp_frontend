"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
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
            Klik tahap di bawah untuk memeriksa formulir &amp; riwayat uji mutu.
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-2 space-y-1">
        {PRODUCTION_STEPS.map((step) => {
          const isDone = completedSteps.includes(step.id);
          const isCurr = currentStep === step.id;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step.id)}
              className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-all cursor-pointer border ${
                isCurr
                  ? "bg-blue-50 border-blue-300 text-blue-950 font-semibold shadow-xs"
                  : isDone
                  ? "border-transparent hover:bg-slate-50 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-slate-50 hover:text-foreground"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 transition-colors ${
                  isDone
                    ? "bg-emerald-600 text-white"
                    : isCurr
                    ? "bg-blue-600 text-white ring-2 ring-blue-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : step.id}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs truncate">{step.title}</span>
                  {isDone && (
                    <span className="text-[10px] text-emerald-600 font-bold shrink-0">Lolos</span>
                  )}
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
