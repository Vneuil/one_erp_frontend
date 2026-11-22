"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, ArrowLeft, Lock } from "lucide-react";
import { ProductionBatchRecord } from "../_lib/production-flow-types";
import { qcApi } from "@/lib/api/qc";

interface Step8QCFinishedProps {
  batch: ProductionBatchRecord;
  onUpdateBatch: (updates: Partial<ProductionBatchRecord>) => void;
  onNext: () => void;
  onPrev: () => void;
  isCompleted: boolean;
}

export function Step8QCFinished({
  batch,
  onUpdateBatch,
  onNext,
  onPrev,
  isCompleted,
}: Step8QCFinishedProps) {
  const [qcTaste, setQcTaste] = useState(batch.qcTaste || "Manis Gurih Khas Kelapa");
  const [qcAroma, setQcAroma] = useState(batch.qcAroma || "Wangi Karamel Bebas Apek");
  const [qcColor, setQcColor] = useState(batch.qcColor || "Coklat Keemasan");
  const [qcFinalMoisture, setQcFinalMoisture] = useState(batch.qcFinalMoisture || 1.6);
  const [qcOfficer, setQcOfficer] = useState(batch.verifiedByQc || "QC Release Officer");
  const [labelCheckPassed, setLabelCheckPassed] = useState(
    batch.labelCheckPassed !== undefined ? batch.labelCheckPassed : true
  );
  const [qcDecision, setQcDecision] = useState<"PASSED" | "HOLD" | "REJECTED">(
    batch.qcDecision || "PASSED"
  );
  const [isSaving, setIsSaving] = useState(false);

  const realFgKg = batch.fgOutputKg || (batch.rawInputKg ? Math.round(batch.rawInputKg * 0.985) : 5000);
  const realFgPcs = batch.fgOutputPcs || Math.floor(realFgKg / 25);
  const isStep8Valid = qcDecision === "PASSED" && labelCheckPassed;

  const handleSaveAndNext = async () => {
    if (!isStep8Valid) return;
    setIsSaving(true);
    try {
      await qcApi.createFinishedGoodsLog({
        checkDate: batch.date || new Date().toISOString().slice(0, 10),
        productName: batch.productName,
        batchNo: batch.batchNo,
        netWeight: realFgKg,
        grossWeight: realFgKg + (realFgPcs * 0.15),
        colorScore: 92,
        taste: qcTaste,
        aroma: qcAroma,
        moistureContent: qcFinalMoisture,
        inspectionDecision: qcDecision,
        qcPersonnelName: qcOfficer,
        notes: `Inspeksi PJD produk jadi batch ${batch.batchNo}.`,
      }).catch(() => {});

      if (labelCheckPassed) {
        await qcApi.createPackagingLabelCheck({
          checkDate: batch.date || new Date().toISOString().slice(0, 10),
          batchNo: batch.batchNo,
          qcInspectorName: qcOfficer,
          overallDecision: "PASSED",
          notes: `Inspeksi label PLK batch ${batch.batchNo} - Compliant.`,
          items: [
            {
              itemNo: 1,
              itemName: batch.productName,
              itemCode: batch.productCode,
              batchNo: batch.batchNo,
              isBatchMatch: true,
              isExpiryMatch: true,
              isCertLogoMatch: true,
              isPrintQualityGood: true,
              isPositionAligned: true,
              inspectedQty: realFgPcs,
              passedQty: realFgPcs,
              rejectedQty: 0,
              itemDecision: "PASSED",
            },
          ],
        }).catch(() => {});
      }
    } finally {
      setIsSaving(false);
      onUpdateBatch({
        qcTaste,
        qcAroma,
        qcColor,
        qcFinalMoisture,
        labelCheckPassed,
        qcDecision,
        verifiedByQc: qcOfficer,
        fgOutputKg: realFgKg,
        fgOutputPcs: realFgPcs,
      });
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Organoleptik PJD */}
        <Card>
          <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase text-foreground">
              Form QC-004-PJD.05 (Pemeriksaan Produk Jadi)
            </CardTitle>
            <Badge variant="success" className="text-xs">Uji Sensori &amp; Lab</Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1">Rasa (Taste):</label>
              <Input
                value={qcTaste}
                onChange={(e) => setQcTaste(e.target.value)}
                className="text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Aroma:</label>
              <Input
                value={qcAroma}
                onChange={(e) => setQcAroma(e.target.value)}
                className="text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Warna:</label>
              <Input
                value={qcColor}
                onChange={(e) => setQcColor(e.target.value)}
                className="text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Kadar Air Akhir Lab (%):</label>
              <Input
                type="number"
                step="0.1"
                value={qcFinalMoisture}
                onChange={(e) => setQcFinalMoisture(Number(e.target.value))}
                className="w-28 text-xs font-bold font-mono text-emerald-700"
              />
            </div>
          </CardContent>
        </Card>

        {/* Label PLK & Keputusan QC */}
        <Card>
          <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase text-foreground">
              Form QC-018-PLK (Label Kemasan)
            </CardTitle>
            <Badge variant="success" className="text-xs">Label Compliant</Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>No Batch &amp; Tanggal Best Before tercetak jelas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Barcode serial per kantong dapat di-scan</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Logo Organik EU &amp; Halal Indonesia tertera rapi</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <label className="text-muted-foreground block mb-1">Petugas QC Release:</label>
              <Input
                value={qcOfficer}
                onChange={(e) => setQcOfficer(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="pt-2 border-t border-border flex justify-between items-center">
              <span className="text-xs font-bold text-foreground">Keputusan QC:</span>
              <select
                value={qcDecision}
                onChange={(e) => setQcDecision(e.target.value as "PASSED" | "HOLD" | "REJECTED")}
                className="text-xs font-bold border border-input rounded px-2.5 py-1.5 bg-background text-emerald-700"
              >
                <option value="PASSED">RELEASED (LULUS MUTU)</option>
                <option value="HOLD">HOLD (UJI ULANG)</option>
                <option value="REJECTED">REJECTED (TOLAK)</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          className="gap-1 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Tahap 7 (Metal Detector)</span>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {!isStep8Valid ? (
            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              Keputusan QC wajib RELEASED (LULUS MUTU) &amp; label compliant untuk membuka Tahap 9.
            </span>
          ) : isCompleted ? (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Tahap 8 Selesai (QC Passed)
            </span>
          ) : null}

          <Button
            onClick={handleSaveAndNext}
            disabled={isSaving || !isStep8Valid}
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isStep8Valid ? (
              <>
                <span>{isSaving ? "Menyimpan Hasil QC..." : "Simpan & Lanjut ke Tahap 9 (LHP & QR)"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Tahap 9 Terkunci (QC Belum Rilis)</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
