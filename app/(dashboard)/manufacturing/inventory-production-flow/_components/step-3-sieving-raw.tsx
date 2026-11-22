"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, CheckCircle2, Filter } from "lucide-react";
import { ProductionBatchRecord } from "../_lib/production-flow-types";
import { qcApi } from "@/lib/api/qc";

interface Step3SievingRawProps {
  batch: ProductionBatchRecord;
  onUpdateBatch: (updates: Partial<ProductionBatchRecord>) => void;
  onNext: () => void;
  onPrev: () => void;
  isCompleted: boolean;
}

export function Step3SievingRaw({
  batch,
  onUpdateBatch,
  onNext,
  onPrev,
  isCompleted,
}: Step3SievingRawProps) {
  const initialInput = batch.sievingRawInput || batch.rawInputKg || 5000;
  const initialBrontol = batch.rawBrontolReject !== undefined ? batch.rawBrontolReject : Math.round(initialInput * 0.006);
  const initialDust = batch.rawDustLoss !== undefined ? batch.rawDustLoss : Math.round(initialInput * 0.003);
  const initialClean = batch.rawCleanSugar !== undefined ? batch.rawCleanSugar : Math.max(0, initialInput - initialBrontol - initialDust);

  const [sievingRawInput, setSievingRawInput] = useState(initialInput);
  const [rawCleanSugar, setRawCleanSugar] = useState(initialClean);
  const [rawBrontolReject, setRawBrontolReject] = useState(initialBrontol);
  const [rawDustLoss, setRawDustLoss] = useState(initialDust);
  const [magnetTrapChecked, setMagnetTrapChecked] = useState(
    batch.magnetTrapChecked !== undefined ? batch.magnetTrapChecked : true
  );
  const [operatorPic, setOperatorPic] = useState(batch.handedOverBy || "Operator Ayak");
  const [isSaving, setIsSaving] = useState(false);

  const totalSusut = rawBrontolReject + rawDustLoss;

  const handleInputChange = (newInput: number) => {
    setSievingRawInput(newInput);
    const newBrontol = Math.round(newInput * 0.006);
    const newDust = Math.round(newInput * 0.003);
    setRawBrontolReject(newBrontol);
    setRawDustLoss(newDust);
    setRawCleanSugar(Math.max(0, newInput - newBrontol - newDust));
  };

  const handleBrontolChange = (newBrontol: number) => {
    setRawBrontolReject(newBrontol);
    setRawCleanSugar(Math.max(0, sievingRawInput - newBrontol - rawDustLoss));
  };

  const handleDustChange = (newDust: number) => {
    setRawDustLoss(newDust);
    setRawCleanSugar(Math.max(0, sievingRawInput - rawBrontolReject - newDust));
  };

  const handleSaveAndNext = async () => {
    setIsSaving(true);
    try {
      await qcApi.createSievingLog({
        checkDate: batch.date || new Date().toISOString().slice(0, 10),
        machineNo: "Mesin Ayak #1",
        category: "raw",
        meshSize: "Mesh 18",
        productName: batch.productName,
        batchNo: batch.batchNo,
        initialPicName: operatorPic,
        finalPicName: operatorPic,
        initialCondition: "Normal",
        notes: `Ayak mentah batch ${batch.batchNo}. Bersih: ${rawCleanSugar}kg, Brontol: ${rawBrontolReject}kg, Debu: ${rawDustLoss}kg. Magnet trap: ${magnetTrapChecked ? "Clean" : "Unchecked"}`,
      }).catch(() => {});

      if (magnetTrapChecked) {
        await qcApi.createMagnetTrapLog({
          checkDate: batch.date || new Date().toISOString().slice(0, 10),
          machineNo: "Mesin Ayak #1",
          picResponsible: "Produksi",
          picName: operatorPic,
          batchNo: batch.batchNo,
          isClean: true,
          notes: `Inspeksi magnet trap batch ${batch.batchNo} - Bersih bebas partikel logam (10.000 Gauss).`,
        }).catch(() => {});
      }
    } finally {
      setIsSaving(false);
      onUpdateBatch({
        sievingRawInput,
        rawCleanSugar,
        rawBrontolReject,
        rawDustLoss,
        magnetTrapChecked,
      });
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Form Ayak Mentah */}
        <Card>
          <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                Form QC-009-MNA.01 (Ayak Mentah)
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Mesin Ayak #1 (Mesh 18)
            </Badge>
          </CardHeader>

          <CardContent className="p-4 space-y-3 text-xs">
            <div>
              <label className="text-muted-foreground font-medium">Bahan Masuk Ayak (Kg):</label>
              <Input
                type="number"
                value={sievingRawInput}
                onChange={(e) => handleInputChange(Number(e.target.value))}
                className="text-sm font-semibold mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-muted-foreground font-medium">Hasil Lolos Ayak Bersih (Kg):</label>
              <Input
                type="number"
                value={rawCleanSugar}
                onChange={(e) => setRawCleanSugar(Number(e.target.value))}
                className="text-sm font-bold text-emerald-700 mt-1 font-mono"
              />
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Otomatis dihitung: Masuk ({sievingRawInput} Kg) - Susut ({totalSusut} Kg)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Magnet Trap */}
        <Card>
          <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Form QC-038-CMT (Magnet Trap)
            </CardTitle>
            <Badge variant={magnetTrapChecked ? "success" : "warning"} className="text-xs">
              {magnetTrapChecked ? "Clean / Bebas Logam" : "Belum Dicek"}
            </Badge>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Magnet trap 10.000 Gauss dipasang pada corong jatuh untuk menangkap serpihan besi sebelum proses lanjut ke oven.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="magnet"
                checked={magnetTrapChecked}
                onChange={(e) => setMagnetTrapChecked(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 cursor-pointer"
              />
              <label htmlFor="magnet" className="text-xs font-medium text-foreground cursor-pointer">
                Magnet Trap telah dibersihkan &amp; bebas partikel besi (10.000 Gauss)
              </label>
            </div>
            <div className="pt-2">
              <label className="text-[11px] text-muted-foreground block mb-1">Operator Penanggung Jawab:</label>
              <Input
                value={operatorPic}
                onChange={(e) => setOperatorPic(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Susut & Brontol Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground uppercase font-medium block">
              Brontol Mentah Reject (Kg)
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={rawBrontolReject}
                onChange={(e) => handleBrontolChange(Number(e.target.value))}
                className="w-28 text-base font-bold text-amber-700 font-mono"
              />
              <span className="text-xs font-semibold text-muted-foreground">Kg</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              Gumpalan basah tertahan di atas saringan
            </span>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground uppercase font-medium block">
              Susut Tercecer / Debu (Kg)
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={rawDustLoss}
                onChange={(e) => handleDustChange(Number(e.target.value))}
                className="w-28 text-base font-bold text-rose-700 font-mono"
              />
              <span className="text-xs font-semibold text-muted-foreground">Kg</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              Partikel halus pada dust collector
            </span>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground uppercase font-medium block">
              Total Susut Line 1
            </span>
            <h4 className="text-xl font-bold text-foreground mt-2 font-mono">{totalSusut} Kg</h4>
            <span className="text-[10px] text-muted-foreground font-semibold">
              {((totalSusut / (sievingRawInput || 1)) * 100).toFixed(2)}% dari total bahan masuk
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Navigasi */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          className="gap-1 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Tahap 2 (BPB)</span>
        </Button>

        <div className="flex items-center gap-3">
          {isCompleted && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Tahap 3 Selesai
            </span>
          )}
          <Button
            onClick={handleSaveAndNext}
            disabled={isSaving}
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <span>{isSaving ? "Menyimpan QC Log..." : "Simpan & Lanjut ke Tahap 4 (Kadar Air & Oven)"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
