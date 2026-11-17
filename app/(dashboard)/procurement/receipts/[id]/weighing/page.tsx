"use client";

import * as React from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Scale,
  CheckCircle2,
  AlertCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  procurementApi,
  GoodsReceiptItem,
  GoodsReceiptLineItem,
  BagEntryItem,
} from "@/lib/api/procurement";
import { productsApi, ProductItem } from "@/lib/api/products";

export default function WeighingModePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const receiptId = (Array.isArray(params?.id) ? params.id[0] : params?.id) as string;
  const lineId = searchParams.get("lineId") || "";

  const [receipt, setReceipt] = React.useState<GoodsReceiptItem | null>(null);
  const [line, setLine] = React.useState<GoodsReceiptLineItem | null>(null);
  const [productName, setProductName] = React.useState<string>("");
  const [entries, setEntries] = React.useState<BagEntryItem[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load GR and find matching line
  React.useEffect(() => {
    if (!receiptId) return;
    setIsLoading(true);
    procurementApi
      .getGoodsReceiptById(receiptId)
      .then(async (res) => {
        if (!res.success || !res.data) {
          throw new Error(res.message || "Gagal memuat detail LBM.");
        }
        setReceipt(res.data);

        // Find line
        const targetLine = lineId
          ? res.data.lines?.find((l) => l.id === lineId)
          : res.data.lines?.[0];

        if (!targetLine) {
          throw new Error("Baris barang tidak ditemukan.");
        }
        setLine(targetLine);

        // Load product name
        try {
          const pRes = await productsApi.list({ perPage: 200 });
          const prod = pRes.data?.find((p) => p.id === targetLine.productId);
          setProductName(prod?.name || `Produk #${targetLine.productId.slice(0, 8)}`);
        } catch {
          setProductName(`Produk #${targetLine.productId.slice(0, 8)}`);
        }

        const bEntries = targetLine.bagEntries || [];
        setEntries(bEntries);

        // Auto jump to first unfilled bag
        const firstEmptyIdx = bEntries.findIndex((e) => e.weightActual === null);
        if (firstEmptyIdx >= 0) {
          setCurrentIndex(firstEmptyIdx);
        } else {
          setCurrentIndex(0);
        }
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : "Gagal memuat data.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [receiptId, lineId]);

  // Focus input on row change
  React.useEffect(() => {
    if (!isLoading && entries.length > 0) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [currentIndex, isLoading, entries.length]);

  const currentEntry = entries[currentIndex];
  const targetWeight = line?.packageSize || 10;
  const currentDiff =
    currentEntry && currentEntry.weightActual !== null
      ? parseFloat((currentEntry.weightActual - targetWeight).toFixed(3))
      : null;

  // Handle weight change on current entry
  const handleWeightChange = (valueStr: string) => {
    const parsed = parseFloat(valueStr);
    const val = isNaN(parsed) || valueStr.trim() === "" ? null : parsed;

    setEntries((prev) =>
      prev.map((e, idx) => (idx === currentIndex ? { ...e, weightActual: val } : e))
    );
  };

  const handleNext = () => {
    if (currentIndex < entries.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNext();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    }
  };

  // Save all entries & return
  const handleSaveAndBack = async () => {
    if (!line) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await procurementApi.saveBagEntries(receiptId, {
        lineId: line.id,
        entries: entries.map((e) => ({
          rowNumber: e.rowNumber,
          weightActual: e.weightActual,
        })),
      });

      if (!res.success) {
        throw new Error(res.message || "Gagal menyimpan timbangan.");
      }

      router.push(`/procurement/receipts/${receiptId}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const filledCount = entries.filter((e) => e.weightActual !== null).length;
  const progressPercent = entries.length > 0 ? (filledCount / entries.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
        Memuat mode penimbangan karung...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <Scale className="h-10 w-10 text-slate-400 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Tabel Kemasan Belum Dibuat</h2>
        <p className="text-xs text-muted-foreground">
          Silakan kembali ke halaman detail LBM dan tentukan ukuran kemasan (kg) untuk membuat tabel
          timbangan terlebih dahulu.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/procurement/receipts/${receiptId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali ke Detail LBM
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/procurement/receipts/${receiptId}`)}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Detail LBM
        </Button>

        <span className="text-xs font-mono font-semibold text-slate-500">
          {receipt?.receiptNo}
        </span>
      </div>

      {/* Product Title */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
          <Scale className="h-3.5 w-3.5" /> Mode Input Satu per Satu
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{productName}</h1>
        <p className="text-xs text-muted-foreground">
          Target Kemasan: <strong>{targetWeight} kg</strong> &bull; Surat Jalan:{" "}
          <strong>{line?.weightNet} kg</strong>
        </p>
      </div>

      {/* Notification */}
      {errorMsg && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Weighing Card */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-xs uppercase font-bold text-brand-primary tracking-wider">
            Nomor Kemasan
          </div>
          <div className="text-5xl font-mono font-black text-slate-900">
            #{currentEntry?.rowNumber}
          </div>
          <div className="text-xs text-muted-foreground">
            dari <strong>{entries.length}</strong> kemasan sak
          </div>
        </div>

        {/* Big Input */}
        <div className="space-y-2">
          <div className="relative">
            <input
              ref={inputRef}
              type="number"
              step="0.001"
              value={currentEntry?.weightActual !== null ? currentEntry.weightActual : ""}
              onChange={(e) => handleWeightChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={targetWeight ? targetWeight.toFixed(2) : "0.00"}
              inputMode="decimal"
              autoComplete="off"
              className="w-full text-center text-4xl sm:text-5xl font-mono font-bold border-2 border-slate-300 rounded-xl px-4 py-6 text-slate-900 focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all placeholder:text-slate-300"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
              kg
            </span>
          </div>

          <p className="text-[11px] text-center text-muted-foreground">
            Tekan <strong>Enter</strong> atau <strong>Next</strong> untuk lanjut ke karung berikutnya
          </p>
        </div>

        {/* Diff Feedback */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Target Standar:</span>
            <span className="font-mono font-bold text-slate-800">{targetWeight.toFixed(3)} kg</span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 block text-[11px]">Selisih Toleransi:</span>
            {currentDiff === null ? (
              <span className="text-slate-400 font-mono">Belum diinput</span>
            ) : (
              <span
                className={`font-mono font-bold ${
                  Math.abs(currentDiff) < 0.001
                    ? "text-emerald-600"
                    : currentDiff > 0
                    ? "text-amber-600"
                    : "text-rose-600"
                }`}
              >
                {currentDiff > 0 ? `+${currentDiff.toFixed(3)}` : currentDiff.toFixed(3)} kg
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar & Counter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">
            Progress Pengisian: <strong>{filledCount}</strong> / {entries.length} kemasan
          </span>
          <span className="font-mono font-bold text-brand-primary">
            {progressPercent.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border">
          <div
            className="bg-brand-primary h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-12 text-sm font-semibold gap-1.5 border-slate-300"
          disabled={currentIndex === 0}
          onClick={handlePrev}
        >
          <ChevronLeft className="h-4 w-4" /> Sebelumnya
        </Button>

        <Button
          variant="gradient"
          className="h-12 text-sm font-semibold gap-1.5"
          disabled={currentIndex >= entries.length - 1}
          onClick={handleNext}
        >
          Berikutnya <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Save & Exit */}
      <div className="pt-2">
        <Button
          variant="outline"
          className="w-full h-10 text-xs font-semibold gap-2 text-slate-700 border-slate-300 hover:bg-slate-50"
          onClick={handleSaveAndBack}
          disabled={isSaving}
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Menyimpan Timbangan..." : "Simpan & Kembali ke Tabel Detail"}
        </Button>
      </div>
    </div>
  );
}
