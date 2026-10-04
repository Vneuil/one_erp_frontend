"use client";

import * as React from "react";
import { Plus, Download, Wallet } from "lucide-react";
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
import { downloadCsv } from "@/lib/utils/csv";
import { InvoiceAdjustmentsFields } from "@/components/shared/invoice-adjustments";
import { InvoiceAdjustments, noAdjustments, adjustmentPayload } from "@/lib/utils/invoice-amounts";
import { salesApi, InvoiceItem, SalesOrderItem } from "@/lib/api/sales";

export default function InvoicesPage() {
  const [invoices, setInvoices] = React.useState<InvoiceItem[]>([]);
  const [salesOrders, setSalesOrders] = React.useState<SalesOrderItem[]>([]);
  const [isIssueOpen, setIsIssueOpen] = React.useState(false);
  const [customerName, setCustomerName] = React.useState("");
  const [totalAmount, setTotalAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [adjust, setAdjust] = React.useState<InvoiceAdjustments>(noAdjustments);
  const [salesOrderId, setSalesOrderId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [payTarget, setPayTarget] = React.useState<InvoiceItem | null>(null);
  const [payAmount, setPayAmount] = React.useState(0);
  const [payError, setPayError] = React.useState<string | null>(null);
  const [isPaying, setIsPaying] = React.useState(false);

  const fetchInvoices = React.useCallback(() => {
    salesApi
      .listInvoices({ perPage: 100 })
      .then((res) => {
        setInvoices(res.data || []);
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load sales invoices", err);
        setLoadError("Gagal memuat data invoice penjualan dari server.");
      });
  }, []);

  React.useEffect(() => {
    fetchInvoices();
    salesApi
      .listOrders({ perPage: 100 })
      .then((res) => setSalesOrders(res.data || []))
      .catch((err) => console.warn("Failed to load sales orders for invoice form", err));
  }, [fetchInvoices]);

  const handleExport = () => {
    downloadCsv(
      "sales-invoices.csv",
      ["Invoice No.", "Customer", "Invoice Date", "Due Date", "Total", "Paid", "Status"],
      invoices.map((inv) => [
        inv.invoiceNumber,
        inv.customerName,
        inv.invoiceDate,
        inv.dueDate,
        inv.totalAmount,
        inv.paidAmount,
        inv.status,
      ])
    );
  };

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !totalAmount) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await salesApi.createInvoice({
        customerName,
        totalAmount: Number(totalAmount),
        ...adjustmentPayload(adjust),
        dueDate,
        salesOrderId: salesOrderId || undefined,
      });
      fetchInvoices();
      setIsIssueOpen(false);
      setCustomerName("");
      setTotalAmount("");
      setDueDate("");
      setAdjust(noAdjustments);
      setSalesOrderId("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menerbitkan invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPayDialog = (inv: InvoiceItem) => {
    setPayTarget(inv);
    setPayAmount(inv.outstanding);
    setPayError(null);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget || payAmount <= 0) return;
    setIsPaying(true);
    setPayError(null);
    try {
      await salesApi.recordInvoicePayment(payTarget.id, payAmount);
      setPayTarget(null);
      fetchInvoices();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Gagal mencatat pembayaran.");
    } finally {
      setIsPaying(false);
    }
  };

  const columns: Column<InvoiceItem>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice No.",
      sortable: true,
      render: (inv) => <span className="font-mono text-xs font-bold text-brand-primary">{inv.invoiceNumber}</span>,
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      render: (inv) => <span className="text-xs font-semibold text-foreground">{inv.customerName}</span>,
    },
    {
      key: "invoiceDate",
      header: "Invoice Date",
      render: (inv) => <span className="text-xs text-muted-foreground">{inv.invoiceDate}</span>,
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (inv) => <span className="text-xs font-medium text-foreground">{inv.dueDate}</span>,
    },
    {
      key: "totalAmount",
      header: "Invoice Total",
      align: "right",
      sortable: true,
      render: (inv) => <MoneyDisplay amount={inv.totalAmount} highlight className="text-xs font-bold" />,
    },
    {
      key: "vatAmount",
      header: "PPN",
      align: "right",
      render: (inv) =>
        inv.vatAmount ? <MoneyDisplay amount={inv.vatAmount} className="text-xs" /> : <span className="text-xs text-muted-foreground">-</span>,
    },
    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: (inv) => (
        <MoneyDisplay
          amount={inv.outstanding}
          className={`text-xs font-bold ${inv.outstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}
        />
      ),
    },
    {
      key: "status",
      header: "Payment Status",
      render: (inv) => <StatusBadge status={inv.status} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (inv) =>
        inv.outstanding > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openPayDialog(inv)}
            className="h-7 gap-1 text-[11px] font-bold"
          >
            <Wallet className="h-3 w-3" /> Bayar
          </Button>
        ) : (
          <span className="text-[11px] text-emerald-600 font-semibold">Lunas</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices & Billing"
        description="Monitor customer commercial tax invoices, due dates, and settlement status."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsIssueOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Issue Invoice
        </Button>
      </PageHeader>

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      <DataTable
        columns={columns}
        data={invoices}
        searchKey="invoiceNumber"
        searchPlaceholder="Search invoice number or customer..."
      />

      <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleIssueInvoice} className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Sales Order (opsional)</label>
              <select
                value={salesOrderId}
                onChange={(e) => {
                  const so = salesOrders.find((s) => s.id === e.target.value);
                  setSalesOrderId(e.target.value);
                  if (so) {
                    setCustomerName(so.customerName);
                    setTotalAmount(String(so.totalAmount));
                  }
                }}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
              >
                <option value="">Tanpa referensi Sales Order</option>
                {salesOrders.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.orderNumber} · {so.customerName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Customer Name</label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="PT Example Customer" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Jumlah sebelum diskon (Subtotal)</label>
              <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0" required />
            </div>
            <InvoiceAdjustmentsFields subtotal={Number(totalAmount) || 0} value={adjust} onChange={setAdjust} additionalLabel="Ongkir / biaya tambahan" />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsIssueOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Issue Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Penjualan</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-mono font-bold text-brand-primary">{payTarget.invoiceNumber}</span>
                {" · "}
                {payTarget.customerName}
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Sisa Tagihan</span>
                <MoneyDisplay amount={payTarget.outstanding} className="font-bold text-rose-600" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Jumlah Pembayaran</label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  max={payTarget.outstanding}
                  min={1}
                  required
                />
              </div>
              {payError && <p className="text-xs text-rose-600 font-semibold">{payError}</p>}
              <DialogFooter>
                <Button type="submit" variant="gradient" disabled={isPaying} className="text-xs font-semibold">
                  {isPaying ? "Memproses..." : "Catat Pembayaran"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
