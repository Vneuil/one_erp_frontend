"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { ProductionBatchRecord } from "../_lib/production-flow-types";
import { qcApi } from "@/lib/api/qc";

interface Step5SievingCookedProps {
  batch: ProductionBatchRecord;
  onUpdateBatch: (updates: Partial<ProductionBatchRecord>) => void;
  onNext: () => void;
  onPrev: () => void;
  isCompleted: boolean;
}

export function Step5SievingCooked({
  batch,
  onUpdateBatch,
  onNext,
  onPrev,
  isCompleted,
}: Step5SievingCookedProps) {
  const baseInput = batch.rawCleanSugar || batch.rawInputKg || 5000;
  const initialClean = batch.cookedCleanSugar || batch.fgOutputKg || Math.round(baseInput * 0.995);
  const initialBrontol = batch.cookedBrontol !== undefined ? batch.cookedBrontol : Math.round(baseInput * 0.005);

  const [cookedCleanSugar, setCookedCleanSugar] = useState(initialClean);
  const [cookedBrontol, setCookedBrontol] = useState(initialBrontol);
  const [operatorPic, setOperatorPic] = useState(batch.handedOverBy || "Operator Ayak Matang");
  const [isSaving, setIsSaving] = useState(false);

  const handleCleanChange = (val: number) => {
    setCookedCleanSugar(val);
  };

  const handleBrontolChange = (val: number) => {
    setCookedBrontol(val);
  };

  const handleSaveAndNext = async () => {
    setIsSaving(true);
    const calculatedPcs = Math.floor(cookedCleanSugar / 25);
    try {
      await qcApi.createSievingLog({
        checkDate: batch.date || new Date().toISOString().slice(0, 10),
        machineNo: "Mesin Ayak #2",
        category: "cooked",
        meshSize: "Mesh 16",
        productName: batch.productName,
        batchNo: batch.batchNo,
        initialPicName: operatorPic,
        finalPicName: operatorPic,
        initialCondition: "Normal",
        notes: `Ayak matang batch ${batch.batchNo}. Gula siap kemas: ${cookedCleanSugar} kg, Brontol kering: ${cookedBrontol} kg.`,
      }).catch(() => {});
    } finally {
      setIsSaving(false);
      onUpdateBatch({
        cookedCleanSugar,
        cookedBrontol,
        fgOutputKg: cookedCleanSugar,
        fgOutputPcs: calculatedPcs,
      });
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono">
                QC-009-MNA.01
              </Badge>
              <Badge variant="success" className="text-xs">
                Mesin Ayak #2 (Matang)
              </Badge>
            </div>
            <CardTitle className="text-sm font-bold text-foreground">
              Monitoring Ayak Matang (Final Sizing sebelum Pengemasan)
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-4">
            Tahap pemisahan brontol kering matang dan pemastian keseragaman butiran gula semut dengan saringan mesh 16 sebelum masuk ke hopper ruang pengemasan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl">
              <label className="text-xs text-emerald-950 font-bold block mb-1">
                Gula Siap Kemas (Kg):
              </label>
              <Input
                type="number"
                value={cookedCleanSugar}
                onChange={(e) => handleCleanChange(Number(e.target.value))}
                className="text-lg font-bold text-emerald-700 bg-white font-mono"
              />
              <span className="text-[11px] text-emerald-700 mt-1 block">
                Butiran lolos mesh 16, bebas gumpalan dan siap dikemas ke {Math.floor(cookedCleanSugar / 25)} Sak (@ 25 Kg).
              </span>
            </div>

            <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl">
              <label className="text-xs text-amber-950 font-bold block mb-1">
                Brontol Matang Kering (Kg):
              </label>
              <Input
                type="number"
                value={cookedBrontol}
                onChange={(e) => handleBrontolChange(Number(e.target.value))}
                className="text-lg font-bold text-amber-700 bg-white font-mono"
              />
              <span className="text-[11px] text-amber-700 mt-1 block">
                Tertahan di atas saringan, dicatat sebagai produk sampingan / rework.
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Operator Pengawas:</span>
            <Input
              value={operatorPic}
              onChange={(e) => setOperatorPic(e.target.value)}
              className="w-56 text-xs h-7"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          className="gap-1 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Tahap 4 (Kadar Air)</span>
        </Button>

        <div className="flex items-center gap-3">
          {isCompleted && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Tahap 5 Selesai
            </span>
          )}
          <Button
            onClick={handleSaveAndNext}
            disabled={isSaving}
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <span>{isSaving ? "Menyimpan Log..." : "Simpan & Lanjut ke Tahap 6 (Packing & IoT Scale)"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
