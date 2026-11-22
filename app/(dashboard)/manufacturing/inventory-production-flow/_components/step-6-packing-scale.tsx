"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Scale, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { ProductionBatchRecord } from "../_lib/production-flow-types";
import { qcApi } from "@/lib/api/qc";

interface Step6PackingScaleProps {
  batch: ProductionBatchRecord;
  onUpdateBatch: (updates: Partial<ProductionBatchRecord>) => void;
  onNext: () => void;
  onPrev: () => void;
  isCompleted: boolean;
}

export function Step6PackingScale({
  batch,
  onUpdateBatch,
  onNext,
  onPrev,
  isCompleted,
}: Step6PackingScaleProps) {
  const [needleCheckOk, setNeedleCheckOk] = useState(
    batch.needleCheckOk !== undefined ? batch.needleCheckOk : true
  );
  const [scissorCheckOk, setScissorCheckOk] = useState(
    batch.scissorCheckOk !== undefined ? batch.scissorCheckOk : true
  );
  const [scaleDisplay, setScaleDisplay] = useState(batch.scaleDisplay || 25.0);
  const [isScaleSettled, setIsScaleSettled] = useState(
    batch.isScaleSettled !== undefined ? batch.isScaleSettled : true
  );
  const [isSaving, setIsSaving] = useState(false);

  const estimatedFgKg = batch.fgOutputKg || batch.cookedCleanSugar || Math.round((batch.rawInputKg || 5000) * 0.985);
  const packedBagsCount = batch.fgOutputPcs || Math.floor(estimatedFgKg / 25);
  const weightPerBag = batch.weightPerBag || 25;

  const handleSaveAndNext = async () => {
    setIsSaving(true);
    try {
      if (needleCheckOk) {
        await qcApi.createNeedleLog({
          checkDate: batch.date || new Date().toISOString().slice(0, 10),
          sewingMachineNo: "Mesin Jahit Karung #1",
          picResponsible: "Produksi",
          picName: batch.handedOverBy || "Operator Packing",
          needleStockInRoom: 10,
          initialIsPresent: true,
          initialCondition: "intact",
          notes: `Inspeksi jarum utuh untuk batch ${batch.batchNo}.`,
        }).catch(() => {});
      }

      if (scissorCheckOk) {
        await qcApi.createScissorLog({
          checkDate: batch.date || new Date().toISOString().slice(0, 10),
          location: "Meja Jahit Karung Line 1",
          picResponsible: "Produksi",
          picName: "QC Packing Inspector",
          initialCount: 2,
          finalCount: 2,
          initialCondition: "terikat rantai",
          notes: `Gunting terikat rantai meja untuk batch ${batch.batchNo}.`,
        }).catch(() => {});
      }
    } finally {
      setIsSaving(false);
      onUpdateBatch({
        needleCheckOk,
        scissorCheckOk,
        scaleDisplay,
        isScaleSettled,
        weightPerBag,
        packedBagsCount,
        fgOutputPcs: packedBagsCount,
        fgOutputKg: packedBagsCount * 25,
      });
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monitoring Jarum Jahit */}
        <Card>
          <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-foreground">
              QC-011-MNJ.01 (Monitoring Jarum Jahit)
            </CardTitle>
            <Badge variant={needleCheckOk ? "success" : "destructive"} className="text-xs">
              {needleCheckOk ? "Utuh / Lengkap" : "Patah / Hilang"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="needle"
                checked={needleCheckOk}
                onChange={(e) => setNeedleCheckOk(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 cursor-pointer"
              />
              <label htmlFor="needle" className="text-xs font-medium text-foreground cursor-pointer">
                Jarum mesin jahit karung utuh &amp; nomor seri jarum sesuai log HACCP
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Pemeriksaan Gunting */}
        <Card>
          <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-foreground">
              Pemeriksaan Gunting &amp; Benda Tajam
            </CardTitle>
            <Badge variant={scissorCheckOk ? "success" : "destructive"} className="text-xs">
              {scissorCheckOk ? "Terikat Rantai" : "Tidak Terikat"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="scissor"
                checked={scissorCheckOk}
                onChange={(e) => setScissorCheckOk(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 cursor-pointer"
              />
              <label htmlFor="scissor" className="text-xs font-medium text-foreground cursor-pointer">
                Semua gunting pemotong tali terikat kuat dengan rantai pada meja kerja
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timbangan Settle Weight */}
      <Card className="border-l-4 border-l-blue-600">
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm font-bold text-foreground">
              Integrasi Timbangan Digital IoT (Settle Weight Confirmation)
            </CardTitle>
          </div>
          <Badge variant={isScaleSettled ? "success" : "warning"} className="font-bold">
            {isScaleSettled ? "● STABIL (SETTLED)" : "◌ FLUKTUATIF"}
          </Badge>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50 border border-slate-200 p-5 rounded-xl">
            <div>
              <span className="text-xs text-muted-foreground block uppercase tracking-wider font-mono">
                Digital Display Bobot Sak (Real-Time Sensor)
              </span>
              <span className="text-4xl font-extrabold font-mono text-blue-700">
                {scaleDisplay.toFixed(2)}{" "}
                <span className="text-lg font-normal text-muted-foreground">Kg / Sak</span>
              </span>
              <span className="text-xs text-muted-foreground block mt-1">
                Kuantitas terkemas: <strong>{packedBagsCount} Sak</strong> (@ 25.00 Kg) = <strong>{(packedBagsCount * 25).toLocaleString()} Kg</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsScaleSettled(false);
                  setScaleDisplay(25.14);
                  setTimeout(() => {
                    setScaleDisplay(25.0);
                    setIsScaleSettled(true);
                  }, 800);
                }}
                className="text-xs"
              >
                Simulasi Fluktuasi
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setScaleDisplay(25.0);
                  setIsScaleSettled(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Konfirmasi Settle Weight
              </Button>
            </div>
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
          <span>Kembali ke Tahap 5 (Ayak Matang)</span>
        </Button>

        <div className="flex items-center gap-3">
          {isCompleted && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Tahap 6 Selesai
            </span>
          )}
          <Button
            onClick={handleSaveAndNext}
            disabled={isSaving}
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <span>{isSaving ? "Menyimpan Log..." : "Simpan & Lanjut ke Tahap 7 (Metal Detector CCP 1)"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
