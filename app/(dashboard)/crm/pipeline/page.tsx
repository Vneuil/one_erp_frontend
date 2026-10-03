"use client";

import * as React from "react";
import {
  Kanban,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Building,
  UserCheck,
  TrendingUp,
  Award,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { crmApi, DealItem as ApiDeal } from "@/lib/api/crm";
import { salesApi } from "@/lib/api/sales";
import { crmPlusApi, PipelineStageItem } from "@/lib/api/crmplus";
import { CrmActivityPanel } from "@/components/crm/activity-panel";
import { useAppStore } from "@/stores/app-store";

type StageId = string;

interface DealItem {
  id: string;
  title: string;
  customer: string;
  value: number;
  probability: number;
  stage: StageId;
  pic: string;
  expectedClosing: string;
  lostReason?: string;
  projectId?: string | null;
}

interface StageView {
  id: StageId;
  label: string;
  kind: "open" | "won" | "lost";
  probability: number;
  color: string;
  badgeStyle: string;
}

const OPEN_STYLES = [
  { color: "border-blue-300 bg-blue-50/40", badgeStyle: "bg-blue-100 text-blue-800" },
  { color: "border-purple-300 bg-purple-50/40", badgeStyle: "bg-purple-100 text-purple-800" },
  { color: "border-amber-300 bg-amber-50/40", badgeStyle: "bg-amber-100 text-amber-800" },
  { color: "border-sky-300 bg-sky-50/40", badgeStyle: "bg-sky-100 text-sky-800" },
  { color: "border-indigo-300 bg-indigo-50/40", badgeStyle: "bg-indigo-100 text-indigo-800" },
];
const WON_STYLE = { color: "border-emerald-300 bg-emerald-50/40", badgeStyle: "bg-emerald-100 text-emerald-800" };
const LOST_STYLE = { color: "border-rose-200 bg-rose-50/30", badgeStyle: "bg-rose-100 text-rose-800" };

/** Turns the configured pipeline into board columns; colours follow the stage kind and order. */
function toStageViews(items: PipelineStageItem[]): StageView[] {
  let open = 0;
  return [...items]
    .filter((s) => s.isActive)
    .sort((a, b) => a.position - b.position)
    .map((s, i) => {
      const style = s.kind === "won" ? WON_STYLE : s.kind === "lost" ? LOST_STYLE : OPEN_STYLES[open++ % OPEN_STYLES.length];
      return { id: s.key, label: `${i + 1}. ${s.name}`, kind: s.kind, probability: s.probability, ...style };
    });
}

// Shown until the company's own pipeline loads (and kept if it cannot be loaded).
const FALLBACK_STAGES: StageView[] = toStageViews([
  { id: "1", key: "discovery", name: "Discovery", position: 1, probability: 30, kind: "open", isActive: true },
  { id: "2", key: "quotation", name: "Quotation", position: 2, probability: 60, kind: "open", isActive: true },
  { id: "3", key: "negotiation", name: "Negotiation", position: 3, probability: 80, kind: "open", isActive: true },
  { id: "4", key: "won", name: "Won", position: 4, probability: 100, kind: "won", isActive: true },
  { id: "5", key: "lost", name: "Lost", position: 5, probability: 0, kind: "lost", isActive: true },
]);




export default function DealPipelinePage() {
  const { currentUser } = useAppStore();
  const [deals, setDeals] = React.useState<DealItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [stages, setStages] = React.useState<StageView[]>(FALLBACK_STAGES);
  const [selectedDeal, setSelectedDeal] = React.useState<DealItem | null>(null);
  const [isNewDealOpen, setIsNewDealOpen] = React.useState(false);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = React.useState<StageId | null>(null);

  // New Deal State
  const [newTitle, setNewTitle] = React.useState("");
  const [newCustomer, setNewCustomer] = React.useState("");
  const [newValue, setNewValue] = React.useState(0);
  const [newStage, setNewStage] = React.useState<StageId>("");
  const [newClosing, setNewClosing] = React.useState("");

  const loadDeals = React.useCallback(
    () =>
      crmApi
        .listDeals({ perPage: 100 })
        .then((res) => {
          setDeals(
            (res.data || []).map((d: ApiDeal) => ({
              id: d.id,
              title: d.title,
              customer: d.customer,
              value: d.value,
              probability: d.probability,
              stage: d.stage as StageId,
              pic: d.pic,
              expectedClosing: d.expectedClosing,
              lostReason: d.lostReason,
              projectId: d.projectId,
            }))
          );
          setPageError(null);
        })
        .catch((err) => {
          console.error("Failed to load deals", err);
          setPageError("Gagal memuat data deal dari server.");
        })
        .finally(() => setIsLoading(false)),
    []
  );

  React.useEffect(() => {
    loadDeals();
    crmPlusApi
      .stages()
      .then((res) => {
        const views = toStageViews(res.data || []);
        if (views.length > 0) setStages(views);
      })
      .catch((err) => {
        console.error("Failed to load pipeline stages", err);
        setPageError("Gagal memuat konfigurasi tahap pipeline; memakai tahap bawaan.");
      });
  }, [loadDeals]);

  const stageById = (id: StageId) => stages.find((s) => s.id === id);
  const kindOf = (id: StageId) => stageById(id)?.kind ?? (id === "won" ? "won" : id === "lost" ? "lost" : "open");
  // Losing a deal needs a reason (the server insists too); null means the user cancelled.
  const askLostReason = (stageId: StageId): string | null | undefined => {
    if (kindOf(stageId) !== "lost") return undefined;
    const reason = window.prompt("Alasan deal ini tidak berlanjut? (wajib, dipakai untuk analisis kalah-menang)");
    return reason && reason.trim() ? reason.trim() : null;
  };

  const probabilityForStage = (stage: StageId) => stageById(stage)?.probability ?? 30;

  // The stage only changes when the server confirms it.
  const moveDealStage = async (dealId: string, nextStage: StageId) => {
    setPageError(null);
    const lostReason = askLostReason(nextStage);
    if (lostReason === null) return;
    try {
      const res = await crmApi.updateDealStage(dealId, nextStage, lostReason);
      const updated = res.data;
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage: updated.stage as StageId, probability: updated.probability, lostReason: updated.lostReason } : d))
      );
      setSelectedDeal((prev) =>
        prev && prev.id === dealId ? { ...prev, stage: updated.stage as StageId, probability: updated.probability } : prev
      );
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Gagal memindahkan deal ke tahap baru.");
    }
  };

  const handleDragStart = (dealId: string) => (e: React.DragEvent) => {
    setDraggedId(dealId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dealId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStage(null);
  };

  // Reorders `deals` so the dragged card lands in `targetStage`, positioned
  // immediately before `beforeId` (or at the end of that stage's column when
  // beforeId is null) - drop targets are always a stage + a neighbor card,
  // so the same handler covers both "move up/down" and "move left/right".
  const reorderDeals = (dealId: string, targetStage: StageId, beforeId: string | null) => {
    setDeals((prev) => {
      const dragged = prev.find((d) => d.id === dealId);
      if (!dragged) return prev;
      const withoutDragged = prev.filter((d) => d.id !== dealId);
      const movedDeal: DealItem = {
        ...dragged,
        stage: targetStage,
        probability: targetStage === dragged.stage ? dragged.probability : probabilityForStage(targetStage),
      };
      const insertAt =
        beforeId !== null ? withoutDragged.findIndex((d) => d.id === beforeId) : -1;
      if (insertAt === -1) {
        withoutDragged.push(movedDeal);
      } else {
        withoutDragged.splice(insertAt, 0, movedDeal);
      }
      return withoutDragged;
    });
    if (selectedDeal && selectedDeal.id === dealId) {
      setSelectedDeal({ ...selectedDeal, stage: targetStage });
    }
  };

  const handleDrop = (targetStage: StageId, beforeId: string | null) => (e: React.DragEvent) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain") || draggedId;
    setDragOverStage(null);
    setDraggedId(null);
    if (!dealId) return;

    const dragged = deals.find((d) => d.id === dealId);
    const stageChanged = dragged && dragged.stage !== targetStage;
    if (!stageChanged) {
      reorderDeals(dealId, targetStage, beforeId);
      return;
    }
    const lostReason = askLostReason(targetStage);
    if (lostReason === null) return; // cancelled: the card stays where it is

    reorderDeals(dealId, targetStage, beforeId);
    {
      crmApi.updateDealStage(dealId, targetStage, lostReason).then((res) => {
        setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, lostReason: res.data.lostReason } : d)));
      }).catch((err) => {
        // The card was moved optimistically; put it back where the server has it.
        setPageError(err instanceof Error ? err.message : "Gagal menyimpan perpindahan tahap deal.");
        loadDeals();
      });
    }
  };

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);

  const handleCreateSalesOrder = async (deal: DealItem) => {
    setIsCreatingOrder(true);
    setOrderError(null);
    try {
      await salesApi.createOrder({
        customerName: deal.customer,
        totalAmount: deal.value,
        channel: "Direct B2B",
        status: "Confirmed",
      });
      setNotice(`Sales Order berhasil dibuat dari deal ${deal.id}.`);
      setSelectedDeal(null);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Gagal membuat Sales Order dari deal ini.");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const [isStartingProject, setIsStartingProject] = React.useState(false);
  const handleStartProject = async (deal: DealItem) => {
    setIsStartingProject(true);
    setOrderError(null);
    try {
      const res = await crmPlusApi.startProject(deal.id);
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, projectId: res.data.projectId } : d)));
      setSelectedDeal((prev) => (prev && prev.id === deal.id ? { ...prev, projectId: res.data.projectId } : prev));
      setNotice(`Proyek ${res.data.projectCode} dibuat dari deal "${deal.title}".`);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Gagal membuat proyek dari deal ini.");
    } finally {
      setIsStartingProject(false);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCustomer || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await crmApi.createDeal({
        title: newTitle,
        customer: newCustomer,
        value: Number(newValue) || 0,
        stage: newStage || undefined,
        expectedClosing: newClosing,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal membuat opportunity penjualan.");
      }
      const d = res.data;
      setDeals([
        {
          id: d.id,
          title: d.title,
          customer: d.customer,
          value: d.value,
          probability: d.probability,
          stage: d.stage as StageId,
          pic: d.pic,
          expectedClosing: d.expectedClosing,
        },
        ...deals,
      ]);
      setIsNewDealOpen(false);
      setNewTitle("");
      setNewCustomer("");
      setNotice("Sales opportunity baru berhasil ditambahkan.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat opportunity. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeals = deals.filter((d) => kindOf(d.stage) === "open");
  const totalPipeline = openDeals.reduce((acc, curr) => acc + curr.value, 0);
  const totalWeighted = openDeals.reduce((acc, curr) => acc + (curr.value * curr.probability) / 100, 0);
  const totalWon = deals.filter((d) => kindOf(d.stage) === "won").reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Kanban className="h-6 w-6 text-brand-primary" />
            <span>Pipeline Penjualan & Deal CRM</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Visualisasikan perjalanan sales opportunity, peluang closing, probabilitas nilai transaksi, dan histori deal.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => {
            setFormError(null);
            setIsNewDealOpen(true);
          }}
          className="h-9 gap-1.5 text-xs font-bold shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Tambah Opportunity Deal</span>
        </Button>
      </div>

      {notice && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {notice}
        </div>
      )}

      {pageError && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {pageError}
        </div>
      )}
      {isLoading && <div className="py-6 text-center text-xs text-muted-foreground">Memuat data...</div>}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Pipeline Aktif</span>
            <div className="text-2xl font-black text-brand-dark">
              <MoneyDisplay amount={totalPipeline} />
            </div>
            <span className="text-[11px] text-muted-foreground">Peluang yang sedang berjalan</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Estimasi Bobot Probabilitas (Weighted)</span>
            <div className="text-2xl font-black text-brand-indigo">
              <MoneyDisplay amount={totalWeighted} />
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Forecast Realistis Bulan Ini
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Nilai Deal Won</span>
            <div className="text-2xl font-black text-emerald-600">
              <MoneyDisplay amount={totalWon} />
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Award className="h-3 w-3 text-amber-500" /> Berhasil Closing
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 gap-3.5 overflow-x-auto min-h-[500px] pb-2 md:[grid-template-columns:var(--stage-cols)]" style={{ "--stage-cols": `repeat(${stages.length},minmax(240px,1fr))` } as React.CSSProperties}>
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.id);
          const stageTotal = stageDeals.reduce((acc, curr) => acc + curr.value, 0);

          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverStage(stage.id);
              }}
              onDragLeave={() => setDragOverStage((prev) => (prev === stage.id ? null : prev))}
              onDrop={handleDrop(stage.id, null)}
              className={`rounded-xl border ${stage.color} p-3 flex flex-col justify-between space-y-3 min-w-0 transition-shadow ${
                dragOverStage === stage.id ? "ring-2 ring-brand-primary/60 shadow-md" : ""
              }`}
            >
              {/* Stage Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{stage.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${stage.badgeStyle}`}>
                    {stageDeals.length}
                  </span>
                </div>
                <div className="text-[11px] font-mono font-bold text-muted-foreground">
                  <MoneyDisplay amount={stageTotal} />
                </div>
              </div>

              {/* Deal Cards Container */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={handleDragStart(deal.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverStage(stage.id);
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDrop(stage.id, deal.id)(e);
                    }}
                    onClick={() => setSelectedDeal(deal)}
                    className={`p-3 bg-white rounded-lg border border-border shadow-2xs hover:border-brand-primary/50 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing space-y-2 text-left group ${
                      draggedId === deal.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="min-w-0 break-all text-[10px] font-mono font-bold text-brand-dark bg-brand-tint px-1.5 py-0.5 rounded">
                        {deal.id}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
                        {deal.probability}% win
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-brand-primary transition-colors">
                      {deal.title}
                    </h4>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                      <Building className="h-3 w-3 shrink-0" />
                      <span className="truncate">{deal.customer}</span>
                    </div>

                    <div className="pt-1 flex items-center justify-between border-t border-border/70 text-xs font-bold text-foreground">
                      <MoneyDisplay amount={deal.value} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] text-muted-foreground pt-0.5">
                      <span>PIC: {deal.pic}</span>
                      <span>{deal.expectedClosing}</span>
                    </div>

                    {deal.lostReason && (
                      <div className="text-[10px] text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-200">
                        Alasan: {deal.lostReason}
                      </div>
                    )}
                  </div>
                ))}

                {stageDeals.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground/60 border border-dashed border-border rounded-lg">
                    Kosong
                  </div>
                )}
              </div>

              {/* Column Footer Action */}
              <button
                type="button"
                onClick={() => {
                  setNewStage(stage.id);
                  setIsNewDealOpen(true);
                }}
                className="w-full py-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Tambah di Tahap Ini
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Detail & Pindah Stage */}
      {selectedDeal && (
        <Dialog open={Boolean(selectedDeal)} onOpenChange={() => setSelectedDeal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Kanban className="h-4 w-4 text-brand-primary" />
                <span>Detail Opportunity Deal: {selectedDeal.id}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-border space-y-2">
                <h3 className="text-sm font-bold text-foreground">{selectedDeal.title}</h3>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{selectedDeal.customer}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground font-medium">Nilai Proyek:</span>
                  <span className="text-base font-black text-brand-dark">
                    <MoneyDisplay amount={selectedDeal.value} />
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-foreground">Pindahkan Tahap Pipeline:</label>
                <div className="grid grid-cols-2 gap-2">
                  {stages.map((st) => (
                    <Button
                      key={st.id}
                      type="button"
                      variant={selectedDeal.stage === st.id ? "gradient" : "outline"}
                      size="sm"
                      onClick={() => moveDealStage(selectedDeal.id, st.id)}
                      className={`text-xs h-8 ${st.kind === "won" ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300" : st.kind === "lost" ? "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300" : ""}`}
                    >
                      {st.label}
                    </Button>
                  ))}
                </div>
              </div>

              {kindOf(selectedDeal.stage) === "won" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  {orderError && (
                    <div role="alert" className="text-xs text-rose-700">{orderError}</div>
                  )}
                  <Button
                    type="button"
                    variant="gradient"
                    size="sm"
                    disabled={isCreatingOrder}
                    onClick={() => handleCreateSalesOrder(selectedDeal)}
                    className="w-full text-xs h-9 font-bold"
                  >
                    {isCreatingOrder ? "Membuat Sales Order..." : "Buat Sales Order"}
                  </Button>
                  {selectedDeal.projectId ? (
                    <p className="text-[11px] text-emerald-700 font-semibold">Proyek sudah dibuat dari deal ini.</p>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isStartingProject}
                      onClick={() => handleStartProject(selectedDeal)}
                      className="w-full text-xs h-9 font-bold"
                    >
                      {isStartingProject ? "Membuat proyek..." : "Mulai Proyek dari Deal Ini"}
                    </Button>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <CrmActivityPanel parentType="deal" parentId={selectedDeal.id} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedDeal(null)}
                className="text-xs h-9"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Buat Opportunity Baru */}
      <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Tambah Sales Opportunity Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateDeal} className="space-y-3.5 text-xs">
            {formError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Judul Proyek / Kebutuhan *</label>
              <Input
                placeholder="Contoh: Suplai Bahan Baku Batch Q4"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Nama Pelanggan / Akun *</label>
              <Input
                placeholder="Contoh: PT Sentosa Logistik"
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Estimasi Nilai (IDR)</label>
                <Input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Tahap Awal</label>
                <select
                  value={newStage || stages.find((st) => st.kind === "open")?.id || ""}
                  onChange={(e) => setNewStage(e.target.value as StageId)}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  {stages.filter((st) => st.kind !== "lost").map((st) => (
                    <option key={st.id} value={st.id}>{st.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Target Tanggal Closing</label>
              <Input
                type="date"
                value={newClosing}
                onChange={(e) => setNewClosing(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewDealOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Simpan Opportunity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
