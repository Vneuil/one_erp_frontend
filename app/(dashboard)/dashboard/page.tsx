"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  Boxes,
  Truck,
  Download,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { formatNumber } from "@/lib/utils";
import { downloadCsv } from "@/lib/utils/csv";
import { salesApi, SalesOrderItem } from "@/lib/api/sales";
import { inventoryApi, StockLevelItem } from "@/lib/api/inventory";
import { financeApi, ReceivableItem } from "@/lib/api/finance";
import { reportsApi, SalesPerformance } from "@/lib/api/reports";

import { useNavigationAccess } from "@/providers/navigation-access";
import { fetchAllPages } from "@/lib/api/pagination";
import { useTranslation } from "@/lib/i18n/translations";

const dashboardCopy = {
  "id": {
    "text0": "Dashboard Operasional",
    "text1": "Ringkasan pesanan, persediaan, dan piutang dari seluruh data yang tersedia.",
    "text2": "Ekspor Pesanan",
    "text3": "Lihat Pesanan Penjualan",
    "text4": "Total Nilai Pesanan",
    "text5": "pesanan penjualan",
    "text6": "Pesanan Belum Selesai",
    "text7": "Pesanan",
    "text8": "Nilai:",
    "text9": "Peringatan Stok Rendah",
    "text10": "Posisi Stok",
    "text11": "Perlu pengadaan stok",
    "text12": "Semua stok dalam kondisi aman",
    "text13": "Piutang Belum Lunas",
    "text14": "tagihan menunggu pembayaran",
    "text15": "Nilai Pesanan per Status",
    "text16": "Nilai pesanan untuk seluruh status, termasuk draf dan pembatalan.",
    "text17": "Belum ada data penjualan untuk ditampilkan.",
    "text18": "Akses Cepat",
    "text19": "Akses ke daftar transaksi dan proses operasional",
    "text20": "Lihat Penawaran",
    "text21": "Kelola penawaran harga pelanggan",
    "text22": "Lihat Pesanan Pembelian",
    "text23": "Kelola pembelian dari pemasok",
    "text24": "Stock Opname",
    "text25": "Cocokkan stok fisik gudang",
    "text26": "Lihat Pengiriman",
    "text27": "Pantau pesanan keluar dan resi pengiriman",
    "text28": "Pesanan Penjualan Terbaru",
    "text29": "Pesanan pelanggan terbaru di tenant aktif",
    "text30": "Lihat Semua →",
    "text31": "Belum ada pesanan penjualan.",
    "text32": "Stok Kritis",
    "text33": "Stok pada atau di bawah batas minimum",
    "text34": "Persediaan →",
    "text35": "Semua stok dalam kondisi aman.",
    "text36": "Minimum:",
    "text37": "Memuat dashboard...",
    "errorOrders": "Gagal memuat data pesanan",
    "errorStock": "Gagal memuat status stok",
    "errorFinance": "Gagal memuat data piutang",
    "errorReports": "Gagal memuat performa penjualan",
    "retryBtn": "Coba lagi"
  },
  "en": {
    "text0": "Operations Dashboard",
    "text1": "Overview of orders, inventory and receivables across all available records.",
    "text2": "Export Orders",
    "text3": "View Sales Orders",
    "text4": "Total Order Value",
    "text5": "total sales orders",
    "text6": "Open Sales Orders",
    "text7": "Orders",
    "text8": "Value:",
    "text9": "Low Stock Alerts",
    "text10": "Stock Positions",
    "text11": "Requires replenishment",
    "text12": "All stock levels healthy",
    "text13": "Unpaid Invoices (AR)",
    "text14": "invoices awaiting payment",
    "text15": "Order Value by Status",
    "text16": "Order value across all statuses, including drafts and cancellations.",
    "text17": "No sales data to display.",
    "text18": "Quick Operations",
    "text19": "Open transaction lists and operational workflows",
    "text20": "View Quotations",
    "text21": "Draft pricing proposal for client",
    "text22": "View Purchase Orders",
    "text23": "Procure materials from vendor",
    "text24": "Stock Opname Audit",
    "text25": "Reconcile physical warehouse stock",
    "text26": "View Shipments",
    "text27": "Track outbound orders and airway bills",
    "text28": "Recent Sales Orders",
    "text29": "Latest customer orders in the active tenant",
    "text30": "View All →",
    "text31": "No sales orders yet.",
    "text32": "Critical Stock Items",
    "text33": "Stock at or below its minimum level",
    "text34": "Inventory →",
    "text35": "All stock levels are healthy.",
    "text36": "Min:",
    "text37": "Loading dashboard…",
    "errorOrders": "Failed to load orders",
    "errorStock": "Failed to load stock levels",
    "errorFinance": "Failed to load receivables",
    "errorReports": "Failed to load sales performance",
    "retryBtn": "Retry"
  }
};

const OPEN_ORDER_STATUSES = ["draft", "pending", "confirmed", "processing"];

export default function DashboardPage() {
  const { canView } = useNavigationAccess();
  const showSales = canView("/sales/sales-orders");
  const showStock = canView("/inventory/stock");
  const showFinance = canView("/finance/receivables");
  const showReports = canView("/reports");
  const { isIndonesian } = useTranslation();
  const copy = isIndonesian ? dashboardCopy.id : dashboardCopy.en;
  const [attempt, setAttempt] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<SalesOrderItem[]>([]);
  const [stockLevels, setStockLevels] = React.useState<StockLevelItem[]>([]);
  const [receivables, setReceivables] = React.useState<ReceivableItem[]>([]);
  const [performance, setPerformance] = React.useState<SalesPerformance | null>(null);

  const [ordersError, setOrdersError] = React.useState(false);
  const [stockError, setStockError] = React.useState(false);
  const [financeError, setFinanceError] = React.useState(false);
  const [reportsError, setReportsError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOrdersError(false);
    setStockError(false);
    setFinanceError(false);
    setReportsError(false);

    Promise.allSettled([
      showSales ? fetchAllPages(salesApi.listOrders) : Promise.resolve([]),
      showStock ? fetchAllPages(inventoryApi.listStockLevels) : Promise.resolve([]),
      showFinance ? fetchAllPages(financeApi.listReceivables) : Promise.resolve([]),
      showReports ? reportsApi.getSalesPerformance().then((res) => {
        if (!res.success || !res.data) throw new Error(res.message);
        return res.data;
      }) : Promise.resolve(null),
    ]).then(([ordersRes, stockRes, finRes, repRes]) => {
      if (cancelled) return;
      if (ordersRes.status === "fulfilled") {
        setOrders(ordersRes.value);
      } else {
        setOrdersError(true);
      }

      if (stockRes.status === "fulfilled") {
        setStockLevels(stockRes.value);
      } else {
        setStockError(true);
      }

      if (finRes.status === "fulfilled") {
        setReceivables(finRes.value);
      } else {
        setFinanceError(true);
      }

      if (repRes.status === "fulfilled") {
        setPerformance(repRes.value);
      } else {
        setReportsError(true);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [attempt, showSales, showStock, showFinance, showReports]);

  const openOrders = orders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status?.toLowerCase()));
  const openOrdersValue = openOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const lowStockItems = stockLevels.filter((s) => s.available <= s.minStock);
  const unpaidReceivables = receivables.filter((r) => r.status?.toLowerCase() !== "paid");
  const unpaidTotal = unpaidReceivables.reduce((sum, r) => sum + r.outstanding, 0);
  const recentOrders = [...orders]
    .sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || ""))
    .slice(0, 5);
  const criticalStock = [...lowStockItems]
    .sort((a, b) => a.available - b.available)
    .slice(0, 5);

  const chartData = performance?.revenueByStatus?.map((s) => ({ name: s.status, revenue: s.revenue })) ?? [];

  const handleExportReport = () => {
    downloadCsv(
      "sales-orders.csv",
      isIndonesian ? ["Nomor Pesanan", "Pelanggan", "Tanggal", "Nilai", "Status"] : ["Order Number", "Customer", "Date", "Amount", "Status"],
      orders.map((o) => [o.orderNumber, o.customerName, o.orderDate, o.totalAmount, o.status])
    );
  };

  const allFailed = (
    (!showSales || ordersError) &&
    (!showStock || stockError) &&
    (!showFinance || financeError) &&
    (!showReports || reportsError)
  );

  if (allFailed && !loading) return (
    <div role="alert" className="space-y-3 p-6 border rounded-xl">
      <p>{isIndonesian ? "Dashboard belum dapat dimuat. Periksa koneksi atau izin akses Anda." : "Unable to load the dashboard. Check your connection or access permissions."}</p>
      <Button onClick={() => setAttempt((n) => n + 1)}>{copy.retryBtn}</Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />{copy.text37}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={copy.text0}
        description={copy.text1}
      >
        <Button disabled={!showSales || orders.length === 0} variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExportReport}>
          <Download className="h-3.5 w-3.5" />
          {copy.text2}
        </Button>
        {showSales && <Button asChild variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
          <Link href="/sales/sales-orders">
            <ShoppingCart className="h-3.5 w-3.5" />
            {copy.text3}
          </Link>
        </Button>}
      </PageHeader>

      {/* 4 Key Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        {showReports && <Card className="hover:border-brand-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {copy.text4}
              </span>
              <div className="h-9 w-9 rounded-lg bg-brand-tint text-brand-primary flex items-center justify-center shadow-xs">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              {reportsError ? (
                <div>
                  <h3 className="text-sm font-bold text-rose-600">{copy.errorReports}</h3>
                  <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline mt-1 cursor-pointer">
                    {copy.retryBtn}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-foreground">
                    <MoneyDisplay amount={performance?.totalRevenue ?? 0} />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {performance?.totalOrders ?? 0} {copy.text5}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Card 2: Open Sales Orders */}
        {showSales && <Card className="hover:border-brand-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {copy.text6}
              </span>
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center shadow-xs">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              {ordersError ? (
                <div>
                  <h3 className="text-sm font-bold text-rose-600">{copy.errorOrders}</h3>
                  <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline mt-1 cursor-pointer">
                    {copy.retryBtn}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-foreground">{openOrders.length} {copy.text7}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {copy.text8} <MoneyDisplay amount={openOrdersValue} className="font-semibold" />
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Card 3: Critical Inventory */}
        {showStock && <Card className="hover:border-brand-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {copy.text9}
              </span>
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              {stockError ? (
                <div>
                  <h3 className="text-sm font-bold text-rose-600">{copy.errorStock}</h3>
                  <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline mt-1 cursor-pointer">
                    {copy.retryBtn}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-foreground">{lowStockItems.length} {copy.text10}</h3>
                  <p className="text-xs text-amber-700 font-medium mt-1">
                    {lowStockItems.length > 0 ? copy.text11 : copy.text12}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Card 4: Pending Invoices */}
        {showFinance && <Card className="hover:border-brand-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {copy.text13}
              </span>
              <div className="h-9 w-9 rounded-lg bg-purple-50 text-brand-indigo flex items-center justify-center shadow-xs">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              {financeError ? (
                <div>
                  <h3 className="text-sm font-bold text-rose-600">{copy.errorFinance}</h3>
                  <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline mt-1 cursor-pointer">
                    {copy.retryBtn}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-foreground">
                    <MoneyDisplay amount={unpaidTotal} />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {unpaidReceivables.length} {copy.text14}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>}
      </div>

      {/* Analytics Chart & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Status Chart */}
        {showReports && <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">{copy.text15}</CardTitle>
              <CardDescription>{copy.text16}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  {copy.text17}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECE7F3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6C6680" }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#6C6680" }}
                      tickFormatter={(val: number) => (val >= 1_000_000 ? `${(val / 1_000_000).toFixed(0)}${isIndonesian ? "jt" : "M"}` : String(val))}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "0.75rem",
                        border: "1px solid #ECE7F3",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                        fontSize: "12px",
                      }}
                      formatter={(val) => [new Intl.NumberFormat(isIndonesian ? "id-ID" : "en-US", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val)), isIndonesian ? "Nilai Pesanan" : "Order Value"]}
                    />
                    <Bar dataKey="revenue" fill="#9A20D6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Quick Operations Actions */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-bold">{copy.text18}</CardTitle>
            <CardDescription>{copy.text19}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-2.5">
            {canView("/sales/quotations") && <Link
              href="/sales/quotations"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-brand-primary/40 hover:bg-brand-tint/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-brand-indigo">
                    {copy.text20}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{copy.text21}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-indigo" />
            </Link>}

            {canView("/procurement/purchase-orders") && <Link
              href="/procurement/purchase-orders"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-brand-primary/40 hover:bg-brand-tint/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-50 text-brand-indigo flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-brand-indigo">
                    {copy.text22}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{copy.text23}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-indigo" />
            </Link>}

            {canView("/inventory/stock-opname") && <Link
              href="/inventory/stock-opname"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-brand-primary/40 hover:bg-brand-tint/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Boxes className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-brand-indigo">
                    {copy.text24}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{copy.text25}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-indigo" />
            </Link>}

            {canView("/warehouse/shipping") && <Link
              href="/warehouse/shipping"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-brand-primary/40 hover:bg-brand-tint/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-brand-indigo">
                    {copy.text26}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{copy.text27}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-indigo" />
            </Link>}
          </CardContent>
        </Card>
      </div>

      {/* Two Columns: Recent Sales Orders and Critical Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        {showSales && <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">{copy.text28}</CardTitle>
              <CardDescription>{copy.text29}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-brand-primary">
              <Link href="/sales/sales-orders">{copy.text30}</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {ordersError ? (
              <div className="p-4 text-xs text-rose-600 space-y-1">
                <p className="font-semibold">{copy.errorOrders}</p>
                <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline cursor-pointer">
                  {copy.retryBtn}
                </button>
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4">{copy.text31}</p>
            ) : (
              <div className="divide-y divide-border">
                {recentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between p-4 hover:bg-brand-tint/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">{ord.orderNumber}</span>
                        <StatusBadge status={ord.status} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{ord.customerName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-foreground">
                        <MoneyDisplay amount={ord.totalAmount} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Stock Alerts */}
        {showStock && <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">{copy.text32}</CardTitle>
              <CardDescription>{copy.text33}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-brand-primary">
              <Link href="/inventory/stock">{copy.text34}</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {stockError ? (
              <div className="p-4 text-xs text-rose-600 space-y-1">
                <p className="font-semibold">{copy.errorStock}</p>
                <button onClick={() => setAttempt((n) => n + 1)} className="text-[11px] text-brand-primary underline cursor-pointer">
                  {copy.retryBtn}
                </button>
              </div>
            ) : criticalStock.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4">{copy.text35}</p>
            ) : (
              <div className="divide-y divide-border">
                {criticalStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 hover:bg-brand-tint/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-brand-indigo">
                          {item.productSku}
                        </span>
                        <StatusBadge status={item.available <= 0 ? "out_of_stock" : "low_stock"} />
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{item.productName}</p>
                      <p className="text-[11px] text-muted-foreground">{item.warehouseName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-rose-600">
                        {formatNumber(item.available)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {copy.text36} {item.minStock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>}
      </div>
    </div>
  );
}
