"use client";

import * as React from "react";
import { BarChart3, DollarSign, Boxes, Users2, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  reportsApi,
  SalesPerformance,
  InventoryValuation,
  HRMSummary,
  ExecutiveSummary,
} from "@/lib/api/reports";
import { downloadCsv } from "@/lib/utils/csv";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

export default function EnterpriseReportsPage() {
  const [summary, setSummary] = React.useState<ExecutiveSummary | null>(null);
  const [sales, setSales] = React.useState<SalesPerformance | null>(null);
  const [inventory, setInventory] = React.useState<InventoryValuation | null>(null);
  const [hrm, setHrm] = React.useState<HRMSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);

  const loadData = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      reportsApi.getExecutiveSummary(),
      reportsApi.getSalesPerformance(),
      reportsApi.getInventoryValuation(),
      reportsApi.getHRMSummary(),
    ])
      .then(([summaryRes, salesRes, invRes, hrmRes]) => {
        setSummary(summaryRes.data ?? null);
        setSales(salesRes.data ?? null);
        setInventory(invRes.data ?? null);
        setHrm(hrmRes.data ?? null);
        setLoadError(false);
      })
      .catch((err) => {
        console.warn("Backend reports API unavailable", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const exportSales = () => {
    if (!sales) return;
    downloadCsv(
      "sales-performance.csv",
      ["Customer", "Total Value"],
      sales.topCustomers.map((c) => [c.customerName, c.totalValue])
    );
  };

  const exportInventory = () => {
    if (!inventory) return;
    downloadCsv(
      "inventory-valuation.csv",
      ["Warehouse", "Total Value"],
      inventory.byWarehouse.map((w) => [w.warehouseName, w.totalValue])
    );
  };

  const exportHrm = () => {
    if (!hrm) return;
    downloadCsv(
      "hrm-summary.csv",
      ["Department", "Headcount"],
      hrm.byDepartment.map((d) => [d.department, d.count])
    );
  };

  const maxChannelRevenue = Math.max(1, ...(sales?.revenueByChannel.map((c) => c.revenue) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-brand-primary" />
          <span>Enterprise Reporting Center</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Cross-module read-only reporting for sales, inventory, and HRM. For statutory finance reports, see Financial Reports.
        </p>
      </div>

      {loadError && (
        <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          Could not load reports from the server. Please try again later.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Sales Revenue (This Month)
            </span>
            <div className="text-2xl font-black text-foreground">
              {formatCurrency(summary?.salesRevenueThisMonth ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5" /> Total Inventory Value
            </span>
            <div className="text-2xl font-black text-foreground">
              {formatCurrency(summary?.totalInventoryValue ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Users2 className="h-3.5 w-3.5" /> Total Headcount
            </span>
            <div className="text-2xl font-black text-foreground">{summary?.totalHeadcount ?? 0}</div>
          </CardContent>
        </Card>
      </div>
      {summary?.financeNote && (
        <p className="text-[11px] text-muted-foreground italic">{summary.financeNote}</p>
      )}

      {/* Sales Performance */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Sales Performance</h2>
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={exportSales} disabled={!sales}>
            <Download className="h-3 w-3" /> Export CSV
          </Button>
        </div>

        {!loading && !loadError && (!sales || sales.totalOrders === 0) && (
          <div className="text-xs text-muted-foreground bg-slate-50 border border-dashed border-border rounded-lg px-3 py-6 text-center">
            No sales orders found.
          </div>
        )}

        {sales && sales.totalOrders > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-foreground">
                {sales.totalOrders} orders · {formatCurrency(sales.totalRevenue)} total revenue
              </div>
              <div className="text-[11px] text-muted-foreground font-semibold mt-2">Revenue by Channel</div>
              <div className="space-y-1.5">
                {sales.revenueByChannel.map((c) => (
                  <div key={c.channel} className="space-y-0.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground">{c.channel}</span>
                      <span className="text-muted-foreground">{formatCurrency(c.revenue)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-primary"
                        style={{ width: `${(c.revenue / maxChannelRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground font-semibold">Top 5 Customers</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] text-muted-foreground uppercase">
                    <th className="pb-1.5 font-semibold">Customer</th>
                    <th className="pb-1.5 font-semibold text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.topCustomers.map((c) => (
                    <tr key={c.customerName} className="border-t border-border">
                      <td className="py-1.5 text-foreground">{c.customerName}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{formatCurrency(c.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Valuation */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Inventory Valuation</h2>
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={exportInventory} disabled={!inventory}>
            <Download className="h-3 w-3" /> Export CSV
          </Button>
        </div>

        {!loading && !loadError && (!inventory || inventory.totalInventoryValue === 0) && (
          <div className="text-xs text-muted-foreground bg-slate-50 border border-dashed border-border rounded-lg px-3 py-6 text-center">
            No inventory stock data found.
          </div>
        )}

        {inventory && inventory.totalInventoryValue > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground font-semibold">
                Total Value: <span className="text-foreground font-bold">{formatCurrency(inventory.totalInventoryValue)}</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-semibold mt-2">By Warehouse</div>
              <div className="space-y-1">
                {inventory.byWarehouse.map((w) => (
                  <div key={w.warehouseId} className="flex justify-between text-[11px]">
                    <span className="text-foreground">{w.warehouseName}</span>
                    <span className="text-muted-foreground">{formatCurrency(w.totalValue)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground font-semibold">By Category</div>
              <div className="space-y-1">
                {inventory.byCategory.map((c) => (
                  <div key={c.category} className="flex justify-between text-[11px]">
                    <span className="text-foreground">{c.category}</span>
                    <span className="text-muted-foreground">{formatCurrency(c.totalValue)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" /> Low Stock Alerts
              </div>
              {(!inventory.lowStockItems || inventory.lowStockItems.length === 0) && (
                <div className="text-[11px] text-muted-foreground">No low stock items.</div>
              )}
              {inventory.lowStockItems && inventory.lowStockItems.length > 0 && (
                <div className="space-y-1">
                  {inventory.lowStockItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      <span className="text-foreground">{item.productName} ({item.warehouseName})</span>
                      <span className="text-amber-700 font-semibold">{item.quantity}/{item.minStock}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* HRM Summary */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">HRM Summary</h2>
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={exportHrm} disabled={!hrm}>
            <Download className="h-3 w-3" /> Export CSV
          </Button>
        </div>

        {!loading && !loadError && (!hrm || hrm.totalHeadcount === 0) && (
          <div className="text-xs text-muted-foreground bg-slate-50 border border-dashed border-border rounded-lg px-3 py-6 text-center">
            No employee data found.
          </div>
        )}

        {hrm && hrm.totalHeadcount > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground font-semibold">
                Total Headcount: <span className="text-foreground font-bold">{hrm.totalHeadcount}</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-semibold mt-2">By Department</div>
              <div className="space-y-1">
                {hrm.byDepartment.map((d) => (
                  <div key={d.department} className="flex justify-between text-[11px]">
                    <span className="text-foreground">{d.department}</span>
                    <span className="text-muted-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground font-semibold">Attendance Rate (This Month)</div>
              <div className="text-2xl font-black text-brand-dark">{hrm.attendanceRatePct.toFixed(1)}%</div>
              {hrm.attendanceRateNote && (
                <div className="text-[11px] text-muted-foreground italic">{hrm.attendanceRateNote}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
