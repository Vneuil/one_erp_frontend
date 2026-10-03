"use client";

import * as React from "react";
import Link from "next/link";
import { Factory, ClipboardList, PackageCheck, CalendarClock, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { manufacturingApi, ManufacturingDashboardSummary } from "@/lib/api/manufacturing";

export default function ManufacturingDashboardPage() {
  const [summary, setSummary] = React.useState<ManufacturingDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    manufacturingApi
      .getDashboardSummary()
      .then((res) => setSummary(res.data || null))
      .catch((err) => {
        console.error("Failed to load manufacturing dashboard", err);
        setLoadError("Gagal memuat dashboard manufaktur dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const ordersByStatus = summary?.ordersByStatus || {};
  const totalOrders = Object.values(ordersByStatus).reduce((a, b) => a + b, 0);
  const inProgress = ordersByStatus["in_progress"] || 0;
  const planned = (ordersByStatus["planned"] || 0) + (ordersByStatus["released"] || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Factory className="h-6 w-6 text-brand-primary" />
          <span>Manufacturing Dashboard</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Ringkasan BOM aktif, status produksi, dan jadwal produksi mendatang.
        </p>
      </div>

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-brand-primary" /> BOM Aktif
                </span>
                <div className="text-2xl font-black text-brand-dark">{summary?.activeBoms ?? 0}</div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Factory className="h-3.5 w-3.5 text-amber-500" /> Sedang Diproduksi
                </span>
                <div className="text-2xl font-black text-amber-600">{inProgress}</div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-brand-indigo" /> Terjadwal
                </span>
                <div className="text-2xl font-black text-brand-indigo">{planned}</div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-emerald-600" /> Unit Selesai Bulan Ini
                </span>
                <div className="text-2xl font-black text-emerald-600">{summary?.unitsCompletedThisMonth ?? 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="border-border shadow-2xs lg:col-span-1">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-xs font-bold text-foreground">Order Produksi per Status</h3>
                {totalOrders === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">Belum ada order produksi.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(ordersByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between text-xs">
                        <StatusBadge status={status} />
                        <span className="font-bold text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-2xs lg:col-span-2">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground">Order Produksi Mendatang</h3>
                  <Link
                    href="/manufacturing/production-orders"
                    className="text-[11px] font-semibold text-brand-primary hover:underline flex items-center gap-0.5"
                  >
                    Lihat Semua <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                {!summary?.upcomingOrders?.length ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">Tidak ada order mendatang.</p>
                ) : (
                  <div className="space-y-2">
                    {summary.upcomingOrders.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-slate-50/40 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{o.productName || o.bomName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {o.quantityToProduce} unit · {o.plannedDate || "Belum dijadwalkan"}
                          </p>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
