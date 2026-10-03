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
import { procurementApi, PurchaseDownPaymentItem, PurchaseOrderItem } from "@/lib/api/procurement";

export default function DownPaymentsPage() {
  const [downPayments, setDownPayments] = React.useState<PurchaseDownPaymentItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrderItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [selectedPoId, setSelectedPoId] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [paymentMethod, setPaymentMethod] = React.useState("Transfer Bank");
  const [notes, setNotes] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadData = React.useCallback(() => {
    setIsLoading(true);
    Promise.all([procurementApi.listDownPayments(), procurementApi.listPurchaseOrders()])
      .then(([dpRes, poRes]) => {
        setDownPayments(dpRes.data || []);
        setPurchaseOrders(poRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to load down payments", err);
        setLoadError("Gagal memuat data uang muka dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedPo = purchaseOrders.find((po) => po.id === selectedPoId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo || amount <= 0) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await procurementApi.createDownPayment({
        purchaseOrderId: selectedPo.id,
        supplierId: selectedPo.supplierId,
        supplierName: selectedPo.supplierName,
        amount,
        paymentMethod,
        notes,
      });
      loadData();
      setIsNewOpen(false);
      setSelectedPoId("");
      setAmount(0);
      setNotes("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mencatat uang muka.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<PurchaseDownPaymentItem>[] = [
    {
      key: "dpNumber",
      header: "No. Uang Muka",
      render: (dp) => <span className="font-mono text-xs font-bold text-brand-primary">{dp.dpNumber}</span>,
    },
    {
      key: "purchaseOrderNumber",
      header: "PO Reference",
      render: (dp) => <span className="font-mono text-xs text-brand-indigo">{dp.purchaseOrderNumber || "-"}</span>,
    },
    {
      key: "supplierName",
      header: "Vendor",
      render: (dp) => <span className="text-xs font-semibold text-foreground">{dp.supplierName}</span>,
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uang Muka Pembelian (Down Payment)"
        description="Catat pembayaran awal ke vendor terhadap Purchase Order sebelum invoice final terbit."
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
              <Wallet2 className="h-4 w-4 text-brand-primary" /> Catat Uang Muka Pembelian
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Purchase Order</label>
              <select
                value={selectedPoId}
                onChange={(e) => setSelectedPoId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                required
              >
                <option value="">Pilih Purchase Order...</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.orderNo} · {po.supplierName}
                  </option>
                ))}
              </select>
            </div>
            {selectedPo && (
              <div className="flex justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-border">
                <span className="text-muted-foreground">Total PO</span>
                <MoneyDisplay amount={selectedPo.totalAmount} className="font-bold" />
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
    </div>
  );
}
