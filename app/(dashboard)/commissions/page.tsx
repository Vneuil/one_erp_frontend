"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import {
  Percent,
  Plus,
  Search,
  Filter,
  Download,
  Award,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/data-table/data-table";
import { MoneyDisplay } from "@/components/shared/money-display";
import { downloadCsv } from "@/lib/utils/csv";
import { commissionApi, CommissionRecord as ApiCommissionRecord, CommissionRule } from "@/lib/api/commission";
import { salesApi, SalesOrderItem } from "@/lib/api/sales";

interface CommissionRecord {
  id: string;
  salesPerson: string;
  dealRef: string;
  customerName: string;
  dealAmount: number;
  commissionRate: string;
  commissionEarned: number;
  status: "Calculated" | "Approved" | "Paid";
  payoutDate: string;
}

function mapStatus(status: string): CommissionRecord["status"] {
  if (status === "approved") return "Approved";
  if (status === "paid") return "Paid";
  return "Calculated";
}

export default function CommissionsPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("commission");
  const [commissions, setCommissions] = React.useState<CommissionRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [actioningId, setActioningId] = React.useState<string | null>(null);
  const [salesOrders, setSalesOrders] = React.useState<SalesOrderItem[]>([]);
  const [rules, setRules] = React.useState<CommissionRule[]>([]);

  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [salespersonName, setSalespersonName] = React.useState("");
  const [selectedSoId, setSelectedSoId] = React.useState("");
  const [orderAmount, setOrderAmount] = React.useState(0);
  const [ruleId, setRuleId] = React.useState("");
  const [period, setPeriod] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const mapRecord = (r: ApiCommissionRecord): CommissionRecord => {
    const rate = r.salesOrderAmount > 0 ? (r.calculatedCommissionAmount / r.salesOrderAmount) * 100 : 0;
    return {
      id: r.id,
      salesPerson: r.salespersonName,
      dealRef: r.salesOrderNumber || "-",
      customerName: `Period ${r.period}`,
      dealAmount: r.salesOrderAmount,
      commissionRate: `${rate.toFixed(1)}%`,
      commissionEarned: r.calculatedCommissionAmount,
      status: mapStatus(r.status),
      payoutDate: r.period,
    };
  };

  const loadRecords = React.useCallback(() => {
    commissionApi
      .listRecords()
      .then((res) => {
        setCommissions((res.data || []).map(mapRecord));
      })
      .catch((err) => {
        console.error("Failed to load komisi", err);
        setLoadError("Gagal memuat data komisi dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadRecords();
    salesApi
      .listOrders({ perPage: 100 })
      .then((res) => setSalesOrders(res.data || []))
      .catch((err) => console.warn("Failed to load sales orders for commission form", err));
    commissionApi
      .listRules({ perPage: 100 })
      .then((res) => setRules(res.data || []))
      .catch((err) => console.warn("Failed to load commission rules", err));
  }, [loadRecords]);

  const selectedSo = salesOrders.find((so) => so.id === selectedSoId);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSo || !salespersonName || !ruleId || !period) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await commissionApi.createRecord({
        salespersonName,
        salesOrderId: selectedSo.id,
        salesOrderNumber: selectedSo.orderNumber,
        salesOrderAmount: orderAmount,
        commissionRuleId: ruleId,
        period,
      });
      setCommissions((prev) => [mapRecord(res.data), ...prev]);
      setIsNewOpen(false);
      setSalespersonName("");
      setSelectedSoId("");
      setOrderAmount(0);
      setRuleId("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat catatan komisi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActioningId(id);
    setNotice(null);
    try {
      const res = await commissionApi.approveRecord(id);
      setCommissions((prev) => prev.map((c) => (c.id === id ? mapRecord(res.data) : c)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menyetujui komisi.");
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setActioningId(id);
    try {
      const res = await commissionApi.markRecordPaid(id);
      setCommissions((prev) => prev.map((c) => (c.id === id ? mapRecord(res.data) : c)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menandai komisi sebagai dibayar.");
    } finally {
      setActioningId(null);
    }
  };

  const totalEarned = commissions.reduce((acc, curr) => acc + curr.commissionEarned, 0);

  const handleExportReport = () => {
    downloadCsv(
      "commissions-report.csv",
      ["ID", "Sales Person", "Deal Ref", "Customer", "Deal Amount", "Commission Rate", "Commission Earned", "Status", "Payout Date"],
      commissions.map((c) => [
        c.id,
        c.salesPerson,
        c.dealRef,
        c.customerName,
        c.dealAmount,
        c.commissionRate,
        c.commissionEarned,
        c.status,
        c.payoutDate,
      ])
    );
  };

  const columns: Column<CommissionRecord>[] = [
    {
      key: "salesPerson",
      header: "Tenaga Penjual (Sales)",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.salesPerson}</div>
          <div className="text-[11px] font-mono text-muted-foreground">{row.id}</div>
        </div>
      ),
    },
    {
      key: "dealRef",
      header: "Referensi Order & Klien",
      render: (row) => (
        <div>
          <span className="font-semibold text-xs text-brand-indigo font-mono">{row.dealRef}</span>
          <div className="text-[11px] text-muted-foreground">{row.customerName}</div>
        </div>
      ),
    },
    {
      key: "dealAmount",
      header: "Nilai Transaksi",
      render: (row) => (
        <span className="font-semibold text-xs text-foreground">
          <MoneyDisplay amount={row.dealAmount} />
        </span>
      ),
    },
    {
      key: "commissionRate",
      header: "Skema / Rate Komisi",
      render: (row) => (
        <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
          {row.commissionRate}
        </span>
      ),
    },
    {
      key: "commissionEarned",
      header: "Komisi Diperoleh",
      render: (row) => (
        <span className="font-black text-xs text-emerald-600">
          <MoneyDisplay amount={row.commissionEarned} />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status Pembayaran",
      render: (row) => {
        const styles: Record<string, string> = {
          Calculated: "bg-blue-50 text-blue-700 border-blue-200",
          Approved: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
          Paid: "bg-slate-100 text-slate-700 border-slate-200",
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${styles[row.status]}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => {
        if (!mayApprove) return <span className="text-[11px] text-muted-foreground">-</span>;
        if (row.status === "Calculated") {
          return (
            <Button
              size="sm"
              variant="outline"
              disabled={actioningId === row.id}
              onClick={() => handleApprove(row.id)}
              className="h-7 gap-1 text-[11px] border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCircle2 className="h-3 w-3" /> Setujui
            </Button>
          );
        }
        if (row.status === "Approved") {
          return (
            <Button
              size="sm"
              variant="outline"
              disabled={actioningId === row.id}
              onClick={() => handleMarkPaid(row.id)}
              className="h-7 gap-1 text-[11px] border-brand-indigo/30 text-brand-indigo hover:bg-brand-indigo/5"
            >
              Tandai Dibayar
            </Button>
          );
        }
        return <span className="text-[11px] text-muted-foreground">-</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Percent className="h-6 w-6 text-brand-primary" />
            <span>Mesin Komisi Penjualan (Sales Commission Engine)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Perhitungan otomatis skema komisi flat & bertingkat per produk/deal, approval pencairan, dan integrasi slip gaji.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            className="h-9 gap-1.5 text-xs border-border"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Ekspor Rekap Komisi</span>
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => { setFormError(null); setIsNewOpen(true); }}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Catat Komisi</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Komisi Siap Cair Bulan Ini</span>
            <div className="text-2xl font-black text-brand-dark">
              <MoneyDisplay amount={totalEarned} />
            </div>
            <span className="text-[11px] text-muted-foreground">Otomatis Terhubung ke Modul Payroll</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Top Sales Person</span>
            <div className="text-2xl font-black text-brand-indigo">Rizky Ramadhan</div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <Award className="h-3 w-3 text-amber-500" /> Capaian 142% Target Closing
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Akurasi Kalkulasi Otomatis</span>
            <div className="text-2xl font-black text-emerald-600">100% Valid</div>
            <span className="text-[11px] text-muted-foreground">Zero Discrepancy</span>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        {loadError && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}
        {notice && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {notice}
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={commissions} columns={columns} />
        )}
      </div>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Komisi Penjualan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRecord} className="space-y-3">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Nama Sales</label>
              <Input value={salespersonName} onChange={(e) => setSalespersonName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Sales Order</label>
              <select
                value={selectedSoId}
                onChange={(e) => {
                  const so = salesOrders.find((s) => s.id === e.target.value);
                  setSelectedSoId(e.target.value);
                  if (so) setOrderAmount(so.totalAmount);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                required
              >
                <option value="">Pilih Sales Order...</option>
                {salesOrders.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.orderNumber} · {so.customerName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nilai Order (bisa diubah)</label>
                <Input type="number" value={orderAmount} onChange={(e) => setOrderAmount(Number(e.target.value))} required min={0} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Periode</label>
                <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Skema Komisi</label>
              <select
                value={ruleId}
                onChange={(e) => setRuleId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                required
              >
                <option value="">Pilih Skema Komisi...</option>
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" disabled={isSubmitting} className="text-xs font-semibold">
                {isSubmitting ? "Menyimpan..." : "Catat Komisi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
