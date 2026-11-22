"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ProductionBatchRecord } from "../_lib/production-flow-types";
import { qcApi } from "@/lib/api/qc";

interface Step7MetalDetectorProps {
  batch: ProductionBatchRecord;
  onUpdateBatch: (updates: Partial<ProductionBatchRecord>) => void;
  onNext: () => void;
  onPrev: () => void;
  isCompleted: boolean;
}

export function Step7MetalDetector({
  batch,
  onUpdateBatch,
  onNext,
  onPrev,
  isCompleted,
}: Step7MetalDetectorProps) {
  const [metalFePassed, setMetalFePassed] = useState(
    batch.metalFePassed !== undefined ? batch.metalFePassed : true
  );
  const [metalNonFePassed, setMetalNonFePassed] = useState(
    batch.metalNonFePassed !== undefined ? batch.metalNonFePassed : true
  );
  const [metalSsPassed, setMetalSsPassed] = useState(
    batch.metalSsPassed !== undefined ? batch.metalSsPassed : true
  );
  const [metalCleaningOk, setMetalCleaningOk] = useState(
    batch.metalCleaningOk !== undefined ? batch.metalCleaningOk : true
  );
  const [qaInspector, setQaInspector] = useState(batch.verifiedByQc || "QA/QC Lead");
  const [isSaving, setIsSaving] = useState(false);

  const allPassed = metalFePassed && metalNonFePassed && metalSsPassed && metalCleaningOk;

  const handleSaveAndNext = async () => {
    setIsSaving(true);
    try {
      await qcApi.createMetalVerificationLog({
        checkDate: batch.date || new Date().toISOString().slice(0, 10),
        checkTime: "09:00",
        location: "Ruang Packing Line 1",
        feTestPieceSize: "1.5mm",
        feAlarmTriggered: metalFePassed,
        feConveyorStopped: metalFePassed,
        nonFeTestPieceSize: "2.0mm",
        nonFeAlarmTriggered: metalNonFePassed,
        nonFeConveyorStopped: metalNonFePassed,
        ssTestPieceSize: "2.5mm",
        ssAlarmTriggered: metalSsPassed,
        ssConveyorStopped: metalSsPassed,
        picName: qaInspector,
        notes: `Verifikasi CCP 1 batch ${batch.batchNo}.`,
      }).catch(() => {});

      if (metalCleaningOk) {
        await qcApi.createMetalCleaningLog({
          checkDate: batch.date || new Date().toISOString().slice(0, 10),
          machineNo: "Metal Detector Conveyor #1",
          startTime: "08:00",
          endTime: "08:30",
          sensorCleanliness: "clean",
          rejectBinCleanliness: "empty",
          operatorName: batch.handedOverBy || "Operator Packing",
          notes: `Aperture bersih & bin kosong untuk batch ${batch.batchNo}.`,
        }).catch(() => {});
      }
    } finally {
      setIsSaving(false);
      onUpdateBatch({
        metalFePassed,
        metalNonFePassed,
        metalSsPassed,
        metalCleaningOk,
        verifiedByQc: qaInspector,
      });
      onNext();
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 rounded-lg text-rose-700 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-950 uppercase">
              Critical Control Point (CCP 1) — Form QC-017-VMD
            </h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Verifikasi sensitivitas metal detector wajib dilakukan setiap pergantian batch atau shift kerja (SOP HACCP).
            </p>
          </div>
        </div>
        <Badge variant="destructive" className="text-xs shrink-0 font-mono">
          Mandatory CCP Gate
        </Badge>
      </div>

      <div>
        <h5 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5">
          Hasil Uji Test Piece Logam Standar:
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-slate-50/70 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold block text-foreground">Fe (Besi) 1.5mm</span>
              <span className="text-[11px] text-muted-foreground">Certified Test Piece</span>
            </div>
            <button
              type="button"
              onClick={() => setMetalFePassed(!metalFePassed)}
              className="cursor-pointer"
            >
              <Badge variant={metalFePassed ? "success" : "destructive"} className="text-xs font-mono">
                {metalFePassed ? "✓ Terdeteksi" : "✗ Gagal"}
              </Badge>
            </button>
          </div>

          <div className="rounded-lg border border-border bg-slate-50/70 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold block text-foreground">Non-Fe 2.0mm</span>
              <span className="text-[11px] text-muted-foreground">Certified Test Piece</span>
            </div>
            <button
              type="button"
              onClick={() => setMetalNonFePassed(!metalNonFePassed)}
              className="cursor-pointer"
            >
              <Badge variant={metalNonFePassed ? "success" : "destructive"} className="text-xs font-mono">
                {metalNonFePassed ? "✓ Terdeteksi" : "✗ Gagal"}
              </Badge>
            </button>
          </div>

          <div className="rounded-lg border border-border bg-slate-50/70 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold block text-foreground">SS 316 2.5mm</span>
              <span className="text-[11px] text-muted-foreground">Certified Test Piece</span>
            </div>
            <button
              type="button"
              onClick={() => setMetalSsPassed(!metalSsPassed)}
              className="cursor-pointer"
            >
              <Badge variant={metalSsPassed ? "success" : "destructive"} className="text-xs font-mono">
                {metalSsPassed ? "✓ Terdeteksi" : "✗ Gagal"}
              </Badge>
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 bg-white space-y-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="metalClean"
            checked={metalCleaningOk}
            onChange={(e) => setMetalCleaningOk(e.target.checked)}
            className="h-4 w-4 mt-0.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="metalClean" className="text-xs font-medium text-foreground cursor-pointer">
            Aperture head bebas debu gula &amp; reject bin telah diperiksa kosong oleh tim QA (Form CPP Sesuai Standar HACCP).
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border text-xs">
          <span className="text-muted-foreground">Petugas Verifikasi QA/QC:</span>
          <Input
            value={qaInspector}
            onChange={(e) => setQaInspector(e.target.value)}
            className="w-56 text-xs h-7"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          className="gap-1 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Tahap 6 (Packing)</span>
        </Button>

        <div className="flex items-center gap-3">
          {isCompleted && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Tahap 7 Selesai (CCP Passed)
            </span>
          )}
          <Button
            onClick={handleSaveAndNext}
            disabled={isSaving || !allPassed}
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <span>{isSaving ? "Menyimpan Verifikasi..." : "Simpan & Lanjut ke Tahap 8 (QC Produk Jadi)"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
