"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ArrowRight, CheckCircle2, TrendingUp, Layers } from "lucide-react";
import { ProductionBatchRecord } from "../_lib/production-flow-types";

interface BatchKPICardsProps {
  batches: ProductionBatchRecord[];
}

export function BatchKPICards({ batches }: BatchKPICardsProps) {
  const activeBatchesCount = batches.filter((b) => b.status !== "final").length;
  const totalRawInput = batches.reduce((acc, b) => acc + (b.rawInputKg || 0), 0);
  const totalFGOutput = batches.reduce((acc, b) => acc + (b.fgOutputKg || 0), 0);
  const avgYield = totalRawInput > 0 ? ((totalFGOutput / totalRawInput) * 100).toFixed(1) : "98.5";
  const completedFinalBatches = batches.filter((b) => b.status === "final").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="border border-border shadow-xs">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Batch Aktif</span>
            <h4 className="text-xl font-bold text-foreground">{activeBatchesCount} Batch</h4>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-xs">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Bahan Masuk (LBM)</span>
            <h4 className="text-xl font-bold text-foreground">{totalRawInput.toLocaleString()} Kg</h4>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-xs">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Produk Jadi (FG)</span>
            <h4 className="text-xl font-bold text-foreground">{totalFGOutput.toLocaleString()} Kg</h4>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-xs">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Rata-rata Yield</span>
            <h4 className="text-xl font-bold text-foreground">{avgYield}%</h4>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-xs">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-lg shrink-0">
            <ArrowRight className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Handover (LST Final)</span>
            <h4 className="text-xl font-bold text-foreground">{completedFinalBatches} Dokumen</h4>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
