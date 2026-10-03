"use client";

import * as React from "react";
import { Plus, Wallet2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { salesApi, SalesDownPaymentItem, SalesOrderItem, InvoiceItem } from "@/lib/api/sales";

export default function SalesDownPaymentsPage() {
  const [downPayments, setDownPayments] = React.useState<SalesDownPaymentItem[]>([]);
  const [salesOrders, setSalesOrders] = React.useState<SalesOrderItem[]>([]);
  const [invoices, setInvoices] = React.useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [selectedSoId, setSelectedSoId] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [paymentMethod, setPaymentMethod] = React.useState("Transfer Bank");
  const [notes, setNotes] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [applyTarget, setApplyTarget] = React.useState<SalesDownPaymentItem | null>(null);
  const [applyInvoiceId, setApplyInvoiceId] = React.useState("");
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);

  const loadData = React.useCallback(() => {
    setIsLoading(true);
    Promise.all([salesApi.listDownPayments(), salesApi.listOrders(), salesApi.listInvoices()])
      .then(([dpRes, soRes, invRes]) => {
        setDownPayments(dpRes.data || []);
        setSalesOrders(soRes.data || []);
        setInvoices(invRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to load sales down payments", err);
        setLoadError("Gagal memuat data uang muka penjualan dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSo = salesOrders.find((so) => so.id === selectedSoId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSo || amount <= 0) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await salesApi.createDownPayment({
        salesOrderId: selectedSo.id,
        customerName: selectedSo.customerName,
        amount,
        paymentMethod,
        notes,
      });
      loadData();
      setIsNewOpen(false);
      setSelectedSoId("");
      setAmount(0);
      setNotes("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mencatat uang muka.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openApplyDialog = (dp: SalesDownPaymentItem) => {
    setApplyTarget(dp);
    setApplyInvoiceId("");
    setApplyError(null);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyTarget || !applyInvoiceId) return;
    setIsApplying(true);
    setApplyError(null);
    try {
      await salesApi.applyDownPayment(applyTarget.id, applyInvoiceId);
      setApplyTarget(null);
      loadData();
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Gagal menerapkan uang muka ke invoice.");
    } finally {
      setIsApplying(false);
    }
  };

  const columns: Column<SalesDownPaymentItem>[] = [
    {
      key: "dpNumber",
      header: "No. Uang Muka",
      render: (dp) => <span className="font-mono text-xs font-bold text-brand-primary">{dp.dpNumber}</span>,
    },
    {
      key: "salesOrderNumber",
      header: "SO Reference",
      render: (dp) => <span className="font-mono text-xs text-brand-indigo">{dp.salesOrderNumber || "-"}</span>,
    },
    {
      key: "customerName",
      header: "Pelanggan",
      render: (dp) => <span className="text-xs font-semibold text-foreground">{dp.customerName}</span>,
    },
    {
      key: "paymentDate",
      header: "Tanggal Bayar",
      render: (dp) => <span className="text-xs text-muted-foreground">{dp.paymentDate}</span>,
    },
    {
      key: "amount",
      header: "Jumlah DP",
      align: "right",
      render: (dp) => <MoneyDisplay amount={dp.amount} className="text-xs font-bold" />,
    },
    {
      key: "remainingAmount",
      header: "Sisa Belum Terpakai",
      align: "right",
      render: (dp) => (
        <MoneyDisplay
          amount={dp.remainingAmount}
          className={`text-xs font-bold ${dp.remainingAmount > 0 ? "text-amber-600" : "text-emerald-600"}`}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (dp) => <StatusBadge status={dp.status} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (dp) =>
        dp.remainingAmount > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openApplyDialog(dp)}
            className="h-7 gap-1 text-[11px] font-bold"
          >
            Terapkan ke Invoice
          </Button>
        ) : (
          <span className="text-[11px] text-emerald-600 font-semibold">Terpakai Penuh</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uang Muka Penjualan (Down Payment)"
        description="Catat pembayaran awal dari pelanggan terhadap Sales Order sebelum invoice final terbit."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsNewOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Catat Uang Muka
        </Button>
      </PageHeader>

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <DataTable
          columns={columns}
          data={downPayments}
          searchKey="dpNumber"
          searchPlaceholder="Cari nomor uang muka..."
        />
      )}

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Wallet2 className="h-4 w-4 text-brand-primary" /> Catat Uang Muka Penjualan
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Sales Order</label>
              <select
                value={selectedSoId}
                onChange={(e) => setSelectedSoId(e.target.value)}
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
            {selectedSo && (
              <div className="flex justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-border">
                <span className="text-muted-foreground">Total SO</span>
                <MoneyDisplay amount={selectedSo.totalAmount} className="font-bold" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Jumlah Uang Muka</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required min={1} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                >
                  <option>Transfer Bank</option>
                  <option>Cash</option>
                  <option>Giro</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Catatan (opsional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referensi bukti transfer, dll." />
            </div>
            {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
            <DialogFooter>
              <Button type="submit" variant="gradient" disabled={isSubmitting} className="text-xs font-semibold">
                {isSubmitting ? "Menyimpan..." : "Catat Uang Muka"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!applyTarget} onOpenChange={(open) => !open && setApplyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terapkan Uang Muka ke Invoice</DialogTitle>
          </DialogHeader>
          {applyTarget && (
            <form onSubmit={handleApply} className="space-y-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-mono font-bold text-brand-primary">{applyTarget.dpNumber}</span>
                {" · "}
                {applyTarget.customerName}
              </div>
              <div className="flex justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-border">
                <span className="text-muted-foreground">Sisa Belum Terpakai</span>
                <MoneyDisplay amount={applyTarget.remainingAmount} className="font-bold text-amber-600" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Invoice Tujuan</label>
                <select
                  value={applyInvoiceId}
                  onChange={(e) => setApplyInvoiceId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                  required
                >
                  <option value="">Pilih Invoice...</option>
                  {invoices
                    .filter((inv) => inv.customerName === applyTarget.customerName && inv.outstanding > 0)
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} · Sisa {inv.outstanding.toLocaleString("id-ID")}
                      </option>
                    ))}
                </select>
              </div>
              {applyError && <p className="text-xs text-rose-600 font-semibold">{applyError}</p>}
              <DialogFooter>
                <Button type="submit" variant="gradient" disabled={isApplying} className="text-xs font-semibold">
                  {isApplying ? "Memproses..." : "Terapkan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
