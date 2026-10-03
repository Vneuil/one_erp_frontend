"use client";

import * as React from "react";
import { Play, CheckCircle2, Pause, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { manufacturingApi } from "@/lib/api/manufacturing";

interface ProductionLine {
  id?: string;
  line: string;
  activeMO: string;
  product: string;
  progress: number;
  target: number;
  completed: number;
  status: string;
}

function mapToLine(o: import("@/lib/api/manufacturing").ProductionOrderItem): ProductionLine {
  const progress = o.quantityToProduce > 0 ? Math.round((o.quantityCompleted / o.quantityToProduce) * 100) : 0;
  return {
    id: o.id,
    line: o.warehouseName || o.bomName,
    activeMO: `MO-${o.id.slice(0, 8).toUpperCase()}`,
    product: o.productName || o.bomName,
    progress,
    target: o.quantityToProduce,
    completed: o.quantityCompleted,
    status: o.status === "paused" ? "paused" : o.status === "completed" ? "completed" : "processing",
  };
}

export default function ProductionRunPage() {
  const [lines, setLines] = React.useState<ProductionLine[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    manufacturingApi
      .listProductionOrders()
      .then((res) => {
        const active = (res.data || []).filter((o) => o.status !== "planned" && o.status !== "cancelled");
        setLines(active.map(mapToLine));
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load production orders", err);
        setLoadError("Gagal memuat order produksi dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Only the server's response changes a line: a failed call must never look
  // like production progressed.
  const run = async (target: ProductionLine, call: (id: string) => Promise<{ data: import("@/lib/api/manufacturing").ProductionOrderItem }>, success: string) => {
    if (!target.id || busyId) return;
    setBusyId(target.id);
    setNotice(null);
    try {
      const res = await call(target.id);
      setLines((prev) => prev.map((l) => (l.id === target.id ? mapToLine(res.data) : l)));
      setNotice({ kind: "success", text: success });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Gagal memperbarui order produksi." });
    } finally {
      setBusyId(null);
    }
  };

  const handlePauseLine = (target: ProductionLine) =>
    run(
      target,
      (id) => (target.status === "paused" ? manufacturingApi.resumeProductionOrder(id) : manufacturingApi.pauseProductionOrder(id)),
      target.status === "paused" ? "Order produksi dilanjutkan." : "Order produksi dijeda."
    );

  const handleLogBatch = (target: ProductionLine) => {
    const qty = Math.min(1, Math.max(target.target - target.completed, 0)) || 1;
    return run(target, (id) => manufacturingApi.completeBatch(id, { quantityCompleted: qty }), `${qty} unit selesai dicatat.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Production Floor Execution"
        description="Real-time shop floor execution, line status tracking, and output milestone logging."
      />

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`px-3 py-2 rounded-lg border text-xs font-medium ${
            notice.kind === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {notice.text}
        </div>
      )}
      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : lines.length === 0 && !loadError ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Belum ada order produksi yang sedang berjalan.</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {lines.map((line) => (
          <Card key={line.id} className="hover:border-brand-primary/40 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-brand-primary" />
                  <CardTitle className="text-sm font-bold">{line.line}</CardTitle>
                </div>
                <StatusBadge status={line.status} />
              </div>
              <CardDescription className="font-mono text-xs text-brand-indigo font-bold pt-1">
                {line.activeMO}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Active Assembly:</p>
                <p className="text-sm font-semibold text-foreground">{line.product}</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Output Completed:</span>
                  <span className="text-brand-dark">{line.completed} / {line.target} Units ({line.progress}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-indigo"
                    style={{ width: `${line.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  disabled={busyId === line.id}
                  onClick={() => handlePauseLine(line)}
                >
                  <Pause className="h-3 w-3" /> {line.status === "paused" ? "Resume Line" : "Pause Line"}
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  className="h-8 gap-1 text-xs font-semibold"
                  disabled={busyId === line.id || line.status === "completed"}
                  onClick={() => handleLogBatch(line)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Log Batch Completion
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
