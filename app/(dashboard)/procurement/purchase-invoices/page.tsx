"use client";

import * as React from "react";
import { Plus, Wallet } from "lucide-react";
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
import { InvoiceAdjustmentsFields } from "@/components/shared/invoice-adjustments";
import { InvoiceAdjustments, noAdjustments, adjustmentPayload } from "@/lib/utils/invoice-amounts";
import { procurementApi, PurchaseInvoiceItem, PurchaseOrderItem } from "@/lib/api/procurement";
import { suppliersApi, SupplierItem } from "@/lib/api/suppliers";

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = React.useState<PurchaseInvoiceItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [suppliers, setSuppliers] = React.useState<SupplierItem[]>([]);
  const [pos, setPos] = React.useState<PurchaseOrderItem[]>([]);
  const [supplierId, setSupplierId] = React.useState("");
  const [purchaseOrderId, setPurchaseOrderId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [adjust, setAdjust] = React.useState<InvoiceAdjustments>(noAdjustments);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [payTarget, setPayTarget] = React.useState<PurchaseInvoiceItem | null>(null);
  const [payAmount, setPayAmount] = React.useState(0);
  const [payError, setPayError] = React.useState<string | null>(null);
  const [isPaying, setIsPaying] = React.useState(false);

  const loadInvoices = React.useCallback(() => {
    setIsLoading(true);
    procurementApi
      .listPurchaseInvoices()
      .then((res) => setInvoices(res.data || []))
      .catch((err) => {
        console.error("Failed to load purchase invoices", err);
        setLoadError("Gagal memuat data invoice pembelian dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadInvoices();
    suppliersApi
      .list({ perPage: 200 })
      .then((res) => setSuppliers(res.data || []))
      .catch((err) => console.warn("Failed to load suppliers", err));
    procurementApi
      .listPurchaseOrders({ perPage: 200 })
      .then((res) =>
        setPos(
          (res.data || []).filter((po) =>
            ["approved", "partially_received", "completed"].includes(po.status)
          )
        )
      )
      .catch((err) => console.warn("Failed to load purchase orders", err));
  }, [loadInvoices]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // POs eligible for invoicing against the currently selected supplier (or
  // all eligible POs if no supplier has been chosen yet).
  const eligiblePOs = pos.filter((po) => !supplierId || po.supplierId === supplierId);

  // Picking a PO auto-fills the supplier and total amount from that order,
  // mirroring how the Purchase Order form auto-fills lines from a Purchase
  // Request (see procurement/purchase-orders/page.tsx).
  const handleSelectPO = (id: string) => {
    setPurchaseOrderId(id);
    if (!id) return;
    const po = pos.find((p) => p.id === id);
    if (!po) return;
    setSupplierId(po.supplierId);
    setTotalAmount(po.totalAmount);
  };

  const handleRecordInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !dueDate || totalAmount <= 0) return;
    setFormError(null);
    try {
      await procurementApi.createPurchaseInvoice({
        supplierId,
        supplierName: selectedSupplier?.name,
        purchaseOrderId: purchaseOrderId || null,
        dueDate,
        totalAmount,
        ...adjustmentPayload(adjust),
      });
      loadInvoices();
      setIsNewOpen(false);
      setSupplierId("");
      setPurchaseOrderId("");
      setDueDate("");
      setTotalAmount(0);
      setAdjust(noAdjustments);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mencatat invoice.");
    }
  };

  const openPayDialog = (inv: PurchaseInvoiceItem) => {
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
      await procurementApi.recordInvoicePayment(payTarget.id, payAmount);
      setPayTarget(null);
      loadInvoices();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Gagal mencatat pembayaran.");
    } finally {
      setIsPaying(false);
    }
  };

  const columns: Column<PurchaseInvoiceItem>[] = [
    {
      key: "invoiceNumber",
      header: "Vendor Invoice No.",
      sortable: true,
      render: (vi) => <span className="font-mono text-xs font-bold text-brand-primary">{vi.invoiceNumber}</span>,
    },
    {
      key: "purchaseOrderNumber",
      header: "PO Reference",
      render: (vi) => <span className="font-mono text-xs text-brand-indigo">{vi.purchaseOrderNumber || "-"}</span>,
    },
    {
      key: "supplierName",
      header: "Vendor",
      sortable: true,
      render: (vi) => <span className="text-xs font-semibold text-foreground">{vi.supplierName}</span>,
    },
    {
      key: "dueDate",
      header: "Payment Due Date",
      render: (vi) => <span className="text-xs font-medium text-foreground">{vi.dueDate}</span>,
    },
    {
      key: "totalAmount",
      header: "Payable Amount",
      align: "right",
      sortable: true,
      render: (vi) => <MoneyDisplay amount={vi.totalAmount} className="text-xs font-bold" />,
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
      render: (vi) => (
        <MoneyDisplay
          amount={vi.outstanding}
          className={`text-xs font-bold ${vi.outstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (vi) => <StatusBadge status={vi.status} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (vi) =>
        vi.outstanding > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openPayDialog(vi)}
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
        title="Vendor Invoices (AP)"
        description="Verify 3-way matching between Purchase Order, Goods Receipt, and Vendor Invoices."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsNewOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Record Vendor Invoice
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
          data={invoices}
          searchKey="invoiceNumber"
          searchPlaceholder="Search vendor invoice number..."
        />
      )}

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Vendor Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordInvoice} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Purchase Order (opsional)</label>
              <select
                value={purchaseOrderId}
                onChange={(e) => handleSelectPO(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
              >
                <option value="">Tidak ada — isi manual</option>
                {eligiblePOs.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.orderNo} — {po.supplierName} ({po.status})
                  </option>
                ))}
              </select>
              {purchaseOrderId && (
                <p className="text-[11px] text-muted-foreground">
                  Vendor dan jumlah tagihan otomatis terisi dari PO ini — sesuaikan bila perlu.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Vendor</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
              >
                <option value="">Pilih supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Payment Due Date</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Jumlah sebelum diskon (Subtotal)</label>
                <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} required />
              </div>
            </div>
            <InvoiceAdjustmentsFields subtotal={totalAmount} value={adjust} onChange={setAdjust} additionalLabel="Ongkir / biaya masuk" vatKind="input" />
            {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold">
                Record Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Pembelian</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-mono font-bold text-brand-primary">{payTarget.invoiceNumber}</span>
                {" · "}
                {payTarget.supplierName}
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
