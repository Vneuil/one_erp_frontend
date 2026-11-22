"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Flame, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { ProductionBatchRecord } from "../_lib/production-flow-types";
import { manufacturingApi } from "@/lib/api/manufacturing";

interface Step4MoistureOvenProps {
  batch: ProductionBatchRecord;
  onUpdateBatch: (updates: Partial<ProductionBatchRecord>) => void;
  onNext: () => void;
  onPrev: () => void;
  isCompleted: boolean;
}

export function Step4MoistureOven({
  batch,
  onUpdateBatch,
  onNext,
  onPrev,
  isCompleted,
}: Step4MoistureOvenProps) {
  const [moisturePercent, setMoisturePercent] = useState(batch.moisturePercent || 1.8);
  const [operatorName, setOperatorName] = useState(batch.handedOverBy || "Operator Oven");
  const [isSaving, setIsSaving] = useState(false);

  const ovenRequired = moisturePercent > 2.0;

  const handleSaveAndNext = async () => {
    setIsSaving(true);
    try {
      if (ovenRequired) {
        await manufacturingApi.createOvenLog({
          date: batch.date || new Date().toISOString().slice(0, 10),
          shift: "1",
          ovenNumber: "Oven Line #1",
          operatorName: operatorName,
          orderNumber: batch.batchNo,
          notes: `Pengeringan batch ${batch.batchNo}. Kadar air awal ${moisturePercent}% -> target 1.6%.`,
          cycles: [
            {
              cycleNumber: 1,
              timeIn: "08:00",
              timeOut: "09:30",
              temperature: 75,
              trayWeight: 5,
              paperWeight: 0.2,
              grossInWeight: 105.2,
              grossOutWeight: 104.1,
              netWetWeight: 100,
              netDryWeight: 98.9,
              moistureLossPercent: Number((moisturePercent - 1.6).toFixed(2)),
              moistureContent: 1.6,
            },
          ],
        }).catch(() => {});
      }
    } finally {
      setIsSaving(false);
      onUpdateBatch({
        moisturePercent,
        ovenRequired,
      });
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border">
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs font-mono">
                  QC-012-MNO.05 &amp; LHO
                </Badge>
                <Badge variant={ovenRequired ? "destructive" : "success"} className="text-xs">
                  {ovenRequired ? "Oven Wajib" : "Lolos Uji Kadar Air"}
                </Badge>
              </div>
              <h5 className="text-sm font-bold text-foreground">
                Pengukuran Kadar Air (Moisture Content Analysis)
              </h5>
              <p className="text-xs text-muted-foreground mt-0.5">
                Batas ambang mutu: Jika &gt; 2.0% ➔ Wajib masuk Oven. Jika ≤ 2.0% ➔ Otomatis lewati oven (Jalur Cepat).
              </p>
            </div>

            <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-lg border border-border">
              <span className="text-xs font-semibold text-foreground">Hasil Uji Lab:</span>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={moisturePercent}
                  onChange={(e) => setMoisturePercent(Number(e.target.value))}
                  className="w-24 text-center font-bold text-base pr-6 font-mono"
                />
                <span className="absolute right-2 top-2 text-xs text-muted-foreground font-bold">%</span>
              </div>
            </div>
          </div>

          {ovenRequired ? (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 flex items-start gap-3">
              <Flame className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-2 w-full">
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  Routing Otomatis: Wajib Proses Oven (LHO &amp; MNO)
                </span>
                <p className="text-xs">
                  Kadar air <strong>{moisturePercent}%</strong> melebihi batas 2.0%. Batch dialihkan untuk dipanaskan
                  pada suhu 70–80°C selama 90–120 menit untuk menjaga stabilitas simpan dan kepatuhan SNI/Organik.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-medium text-amber-900">Operator Oven:</span>
                  <Input
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-48 text-xs h-7 bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                  Jalur Cepat (Fast-Track) — Lewati Oven
                </span>
                <p className="text-xs">
                  Kadar air <strong>{moisturePercent}%</strong> memenuhi standar (≤ 2.0%). Proses oven
                  dilewati secara otomatis langsung ke Ayak Matang (Final Sizing), menghemat energi dan waktu siklus.
                </p>
              </div>
            </div>
          )}
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
          <span>Kembali ke Tahap 3 (Ayak Mentah)</span>
        </Button>

        <div className="flex items-center gap-3">
          {isCompleted && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Tahap 4 Selesai
            </span>
          )}
          <Button
            onClick={handleSaveAndNext}
            disabled={isSaving}
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <span>{isSaving ? "Menyimpan Log Oven..." : "Simpan & Lanjut ke Tahap 5 (Ayak Matang)"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
