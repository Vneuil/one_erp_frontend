"use client";

import * as React from "react";
import { CheckCircle2, Lock, CircleDot } from "lucide-react";
import { LiquidSugarFlowStatusItem } from "@/lib/api/qc";

export interface LiquidSugarStageDef {
  id: number;
  title: string;
  subtitle: string;
  forms: string[];
}

export const LIQUID_SUGAR_STAGES: LiquidSugarStageDef[] = [
  {
    id: 1,
    title: "Tahap 1: Persiapan & Verifikasi Awal",
    subtitle: "4 Form QC wajib sebelum proses pra-masak",
    forms: ["QC-057-MSS (Tahap 1)", "QC-041-PVK", "QC-017-VMD (Gula Cair)", "PRO-007-CPP (R. Gula Cair)"],
  },
  {
    id: 2,
    title: "Tahap 2: Sterilisasi Lanjutan & Pra-Masak",
    subtitle: "2 Form QC setelah 4 form Tahap 1 selesai",
    forms: ["QC-057-MSS (Tahap 2)", "QC-011-MNP & QC-011-MNB"],
  },
  {
    id: 3,
    title: "Tahap 3: Monitoring Pengolahan",
    subtitle: "Pemasakan & CCP Suhu Heating 90–95°C",
    forms: ["QC-014-MNC"],
  },
  {
    id: 4,
    title: "Tahap 4: Produk Jadi Gula Cair",
    subtitle: "Uji organoleptik, Brix, pH, Kadar Air & rilis",
    forms: ["QC-015-PJC Rev. 02"],
  },
  {
    id: 5,
    title: "Tahap 5: Verifikasi Hasil Cuci",
    subtitle: "Sanitasi tangki & sirkulasi pipa Ruang Gula Cair",
    forms: ["QC-055-VHC Rev. 00"],
  },
];

interface FlowStepperProps {
  activeStage: number;
  mode: "flow" | "register";
  flowStatus: LiquidSugarFlowStatusItem | null;
  onSelectStage: (stageId: number) => void;
}

export function isStageUnlocked(
  stageId: number,
  mode: "flow" | "register",
  status: LiquidSugarFlowStatusItem | null
): boolean {
  if (mode === "register" || stageId <= 1) return true;
  if (!status) return false;
  if (stageId === 2) return status.stage1Done;
  if (stageId === 3) return status.stage1Done && status.stage2Done;
  if (stageId === 4) return status.stage1Done && status.stage2Done && status.stage3Done;
  if (stageId === 5) return status.stage1Done && status.stage2Done && status.stage3Done && status.stage4Done;
  return false;
}

export function isStageDone(stageId: number, status: LiquidSugarFlowStatusItem | null): boolean {
  if (!status) return false;
  switch (stageId) {
    case 1:
      return status.stage1Done;
    case 2:
      return status.stage2Done;
    case 3:
      return status.stage3Done;
    case 4:
      return status.stage4Done;
    case 5:
      return status.stage5Done;
    default:
      return false;
  }
}

export function stageCounterBadge(stageId: number, status: LiquidSugarFlowStatusItem | null): string {
  if (!status) return stageId === 1 ? "0/4" : stageId === 2 ? "0/2" : "0/1";
  switch (stageId) {
    case 1: {
      const n =
        (status.mssStage1Count > 0 ? 1 : 0) +
        (status.pvkCount > 0 ? 1 : 0) +
        (status.vmdCount > 0 ? 1 : 0) +
        (status.cppCount > 0 ? 1 : 0);
      return `${n}/4 Form`;
    }
    case 2: {
      const n = (status.mssStage2Count > 0 ? 1 : 0) + (status.qc011Done ? 1 : 0);
      return `${n}/2 Form`;
    }
    case 3:
      return status.mncCount > 0 ? "1/1 Form" : "0/1 Form";
    case 4:
      return status.pjcCount > 0 ? "1/1 Form" : "0/1 Form";
    case 5:
      return status.vhcCount > 0 ? "1/1 Form" : "0/1 Form";
    default:
      return "";
  }
}

export function FlowStepper({ activeStage, mode, flowStatus, onSelectStage }: FlowStepperProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {LIQUID_SUGAR_STAGES.map((st) => {
        const done = isStageDone(st.id, flowStatus);
        const unlocked = isStageUnlocked(st.id, mode, flowStatus);
        const isActive = activeStage === st.id;
        const badgeText = stageCounterBadge(st.id, flowStatus);

        return (
          <button
            key={st.id}
            type="button"
            onClick={() => onSelectStage(st.id)}
            className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
              isActive
                ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/40 shadow-sm"
                : done
                ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-400"
                : unlocked
                ? "border-border bg-card hover:border-amber-300"
                : "border-dashed border-slate-300 bg-slate-50/70 opacity-75 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  done
                    ? "bg-emerald-100 text-emerald-800"
                    : isActive
                    ? "bg-amber-600 text-white"
                    : unlocked
                    ? "bg-muted text-foreground"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : unlocked ? (
                  <CircleDot className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                Tahap {st.id}
              </span>
              <span className="text-[11px] font-mono font-semibold text-muted-foreground">{badgeText}</span>
            </div>

            <div>
              <div className="text-xs font-bold text-foreground leading-snug">{st.title.replace(/^Tahap \d+: /, "")}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{st.subtitle}</div>
            </div>

            <div className="flex flex-wrap gap-1 pt-1">
              {st.forms.map((f) => (
                <span
                  key={f}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-background/80 border border-border/70 text-muted-foreground font-mono"
                >
                  {f}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
