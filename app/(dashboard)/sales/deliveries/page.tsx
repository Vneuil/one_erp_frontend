"use client";

import * as React from "react";
import { Plus, Truck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { salesApi, DeliveryItem, SalesOrderItem, DeliveryLineInput } from "@/lib/api/sales";
import { productsApi, ProductItem } from "@/lib/api/products";
import { shippingMethodsApi, ShippingMethodItem } from "@/lib/api/shipping-methods";

// A Sales Order's channel string identifies a marketplace-synced order the
// same way sales-orders/page.tsx does - those are shipped via that
// marketplace's own ready-to-ship/pickup flow (see the Sales Orders page),
// not this warehouse-delivery form.
function isMarketplaceChannel(channel?: string): boolean {
  const ch = (channel || "").toLowerCase();
  return ["tiktok", "shopee", "blibli", "lazada", "tokopedia"].some((p) => ch.includes(p));
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = React.useState<DeliveryItem[]>([]);
  const [salesOrders, setSalesOrders] = React.useState<SalesOrderItem[]>([]);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [shippingMethods, setShippingMethods] = React.useState<ShippingMethodItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [salesOrderId, setSalesOrderId] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [carrier, setCarrier] = React.useState("");
  const [deliveryDate, setDeliveryDate] = React.useState("");
  const [lines, setLines] = React.useState<DeliveryLineInput[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [costTarget, setCostTarget] = React.useState<DeliveryItem | null>(null);
  const [costAmount, setCostAmount] = React.useState("");
  const [costCarrier, setCostCarrier] = React.useState("");
  const [costTracking, setCostTracking] = React.useState("");
  const [costPaidNow, setCostPaidNow] = React.useState(false);
  const [costError, setCostError] = React.useState<string | null>(null);
  const [costBusy, setCostBusy] = React.useState(false);

  const selectedOrder = salesOrders.find((so) => so.id === salesOrderId);
  const isMarketplaceOrder = isMarketplaceChannel(selectedOrder?.channel);

  // How much of each product on the selected order has already shipped
  // across every prior Delivery, so the form can show/enforce what's left.
  const shippedQtyByProduct = React.useMemo(() => {
    const shipped: Record<string, number> = {};
    if (!salesOrderId) return shipped;
    for (const d of deliveries) {
      if (d.salesOrderId !== salesOrderId) continue;
      for (const l of d.lines || []) {
        shipped[l.productId] = (shipped[l.productId] || 0) + l.quantity;
      }
    }
    return shipped;
  }, [deliveries, salesOrderId]);

  const remainingLines = React.useMemo(() => {
    if (!selectedOrder) return [];
    const orderedByProduct: Record<string, number> = {};
    for (const l of selectedOrder.lines || []) {
      orderedByProduct[l.productId] = (orderedByProduct[l.productId] || 0) + l.quantity;
    }
    return Object.entries(orderedByProduct).map(([productId, ordered]) => ({
      productId,
      ordered,
      remaining: Math.max(0, ordered - (shippedQtyByProduct[productId] || 0)),
    }));
  }, [selectedOrder, shippedQtyByProduct]);

  const updateLine = (index: number, patch: Partial<DeliveryLineInput>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const fetchDeliveries = React.useCallback(() => {
    salesApi
      .listDeliveries({ perPage: 100 })
      .then((res) => setDeliveries(res.data || []))
      .catch((err) => console.warn("Backend sales API unavailable", err));
  }, []);

  React.useEffect(() => {
    fetchDeliveries();
    salesApi
      .listOrders({ perPage: 100 })
      .then((res) => setSalesOrders(res.data || []))
      .catch((err) => console.warn("Failed to load sales orders for delivery form", err));
    productsApi
      .list({ perPage: 200 })
      .then((res) => setProducts(res.data || []))
      .catch((err) => console.warn("Failed to load products for delivery form", err));
    shippingMethodsApi
      .list({ perPage: 100 })
      .then((res) => setShippingMethods(res.data || []))
      .catch((err) => console.warn("Failed to load shipping methods for delivery form", err));
  }, [fetchDeliveries]);

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !salesOrderId || isMarketplaceOrder) return;
    if (
      lines.length === 0 ||
      lines.some((l) => {
        const remaining = remainingLines.find((r) => r.productId === l.productId)?.remaining ?? 0;
        return !l.productId || !Number.isFinite(l.quantity) || l.quantity <= 0 || l.quantity > remaining;
      })
    ) {
      setFormError("Isi minimal satu item dengan kuantitas yang valid dan tidak melebihi sisa kuantitas sales order.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await salesApi.createDelivery({ salesOrderId, customerName, carrier, deliveryDate, lines });
      fetchDeliveries();
      setIsCreateOpen(false);
      setSalesOrderId("");
      setCustomerName("");
      setCarrier("");
      setDeliveryDate("");
      setLines([]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat delivery note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCost = (d: DeliveryItem) => {
    setCostTarget(d);
    setCostAmount("");
    setCostCarrier(d.carrier || "");
    setCostTracking(d.trackingNumber || "");
    setCostPaidNow(false);
    setCostError(null);
  };

  const saveCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costTarget) return;
    setCostBusy(true);
    setCostError(null);
    try {
      await salesApi.recordShippingCost(costTarget.id, {
        amount: Number(costAmount) > 0 ? Number(costAmount) : undefined,
        carrier: costCarrier,
        trackingNumber: costTracking,
        paidNow: costPaidNow,
      });
      setCostTarget(null);
      fetchDeliveries();
    } catch (err) {
      setCostError(err instanceof Error ? err.message : "Gagal menyimpan biaya kirim.");
    } finally {
      setCostBusy(false);
    }
  };

  const columns: Column<DeliveryItem>[] = [
    {
      key: "deliveryNumber",
      header: "Delivery Order (DO)",
      sortable: true,
      render: (d) => <span className="font-mono text-xs font-bold text-brand-primary">{d.deliveryNumber}</span>,
    },
    {
      key: "soNumber",
      header: "Sales Order Ref",
      render: (d) => <span className="font-mono text-xs text-brand-indigo">{d.soNumber || "-"}</span>,
    },
    {
      key: "customerName",
      header: "Consignee / Customer",
      sortable: true,
      render: (d) => <span className="text-xs font-semibold text-foreground">{d.customerName}</span>,
    },
    {
      key: "deliveryDate",
      header: "Delivery Date",
      render: (d) => <span className="text-xs text-muted-foreground">{d.deliveryDate}</span>,
    },
    {
      key: "carrier",
      header: "Carrier / Transporter",
      render: (d) => (
        <span className="text-xs text-foreground flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-muted-foreground" /> {d.carrier || "-"}
        </span>
      ),
    },
    {
      key: "shippingCost",
      header: "Resi & Biaya Kirim",
      render: (d) => (
        <div className="text-xs space-y-0.5">
          {d.trackingNumber && <div className="font-mono">{d.trackingNumber}</div>}
          {(d.shippingCost ?? 0) > 0 ? (
            <div>
              <MoneyDisplay amount={d.shippingCost ?? 0} />{" "}
              <span className="text-[10px] text-muted-foreground">{d.shippingPaid ? "lunas" : "belum dibayar ke kurir"}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Belum dicatat</span>
          )}
          <button onClick={() => openCost(d)} className="text-[11px] font-semibold text-brand-primary underline cursor-pointer">
            {(d.shippingCost ?? 0) > 0 ? "Ubah resi" : "Catat biaya kirim"}
          </button>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (d) => <StatusBadge status={d.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Orders & Shipping"
        description="Manage warehouse outbound dispatches, waybills, and customer proof of deliveries."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Create Delivery Note
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={deliveries}
        searchKey="deliveryNumber"
        searchPlaceholder="Search delivery order number..."
      />

      <Dialog open={costTarget !== null} onOpenChange={(o) => !o && setCostTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resi & Biaya Kirim — {costTarget?.deliveryNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveCost} className="space-y-3 text-xs">
            {costError && <p role="alert" className="text-rose-700">{costError}</p>}
            <label className="block space-y-1 font-semibold">Kurir / ekspedisi<Input value={costCarrier} onChange={(e) => setCostCarrier(e.target.value)} /></label>
            <label className="block space-y-1 font-semibold">Nomor resi<Input value={costTracking} onChange={(e) => setCostTracking(e.target.value)} /></label>
            {(costTarget?.shippingCost ?? 0) > 0 ? (
              <p className="text-muted-foreground">Biaya kirim sudah dicatat dan dijurnal; hanya kurir dan resi yang bisa diubah.</p>
            ) : (
              <>
                <label className="block space-y-1 font-semibold">Biaya kirim dari kurir (Rp)<Input type="number" min={0} value={costAmount} onChange={(e) => setCostAmount(e.target.value)} placeholder="Kosongkan bila belum ada tagihan" /></label>
                <label className="flex items-center gap-1.5 font-semibold"><input type="checkbox" checked={costPaidNow} onChange={(e) => setCostPaidNow(e.target.checked)} /> Sudah dibayar tunai (jika tidak, dicatat sebagai hutang ke kurir)</label>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCostTarget(null)}>Batal</Button>
              <Button type="submit" size="sm" disabled={costBusy}>{costBusy ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Delivery Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDelivery} className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Sales Order Ref</label>
              <select
                value={salesOrderId}
                onChange={(e) => {
                  const so = salesOrders.find((s) => s.id === e.target.value);
                  setSalesOrderId(e.target.value);
                  if (so) setCustomerName(so.customerName);
                  setLines([]);
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

            {isMarketplaceOrder ? (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                Sales order ini berasal dari marketplace ({selectedOrder?.channel}). Gunakan tombol{" "}
                <strong>&quot;Mark Ready to Ship&quot;</strong> di halaman Sales Orders untuk memproses pickup lewat
                API marketplace terkait - bukan delivery note manual.
              </div>
            ) : selectedOrder ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Item Dikirim</label>
                <div className="rounded-lg border border-border bg-slate-50/60 p-3 space-y-2">
                  {lines.map((line, index) => {
                    const remaining = remainingLines.find((r) => r.productId === line.productId)?.remaining;
                    const product = products.find((p) => p.id === line.productId);
                    return (
                      <div key={index} className="grid grid-cols-[minmax(0,1fr)_90px_auto] gap-2 items-start">
                        <select
                          aria-label={`Delivery item ${index + 1}`}
                          value={line.productId}
                          required
                          className="h-9 w-full rounded-md border border-input bg-white px-2 text-xs"
                          onChange={(e) => updateLine(index, { productId: e.target.value, quantity: 0 })}
                        >
                          <option value="">Pilih produk...</option>
                          {remainingLines.filter((r) => r.remaining > 0).map((r) => {
                            const p = products.find((item) => item.id === r.productId);
                            return (
                              <option key={r.productId} value={r.productId}>
                                {p?.name || r.productId} (sisa {r.remaining})
                              </option>
                            );
                          })}
                        </select>
                        <Input
                          aria-label={`Delivery quantity ${index + 1}`}
                          type="number"
                          min="0.01"
                          max={remaining}
                          step="0.01"
                          value={line.quantity || ""}
                          onChange={(e) => updateLine(index, { quantity: e.target.valueAsNumber })}
                          required
                        />
                        <Button type="button" variant="ghost" size="sm" aria-label={`Remove delivery item ${index + 1}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {product && line.quantity > (remaining ?? 0) && (
                          <p className="col-span-3 text-[11px] text-rose-600">Melebihi sisa kuantitas ({remaining}).</p>
                        )}
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={remainingLines.every((r) => r.remaining <= 0)}
                    onClick={() => setLines((current) => [...current, { productId: "", quantity: 0 }])}
                  >
                    <Plus className="h-4 w-4 mr-1" />Add Item
                  </Button>
                  {remainingLines.length > 0 && remainingLines.every((r) => r.remaining <= 0) && (
                    <p className="text-xs text-muted-foreground">Sales order ini sudah dikirim sepenuhnya.</p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Consignee / Customer</label>
              <Input
                value={customerName}
                disabled
                readOnly
                placeholder="Pilih Sales Order untuk mengisi otomatis"
                title="Terkunci ke pelanggan pada Sales Order yang dipilih"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Carrier / Transporter</label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
              >
                <option value="">Pilih carrier / transporter...</option>
                {shippingMethods.map((sm) => (
                  <option key={sm.id} value={sm.carrier || sm.name}>
                    {sm.name} · {sm.carrier || "-"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Delivery Date</label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting || isMarketplaceOrder}>
                {isSubmitting ? "Menyimpan..." : "Create Delivery Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
