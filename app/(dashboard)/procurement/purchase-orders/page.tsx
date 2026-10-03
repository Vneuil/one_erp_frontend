"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import { Plus, Download, Check, X } from "lucide-react";
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
import { procurementApi, PurchaseOrderItem, PurchaseOrderLineInput, PurchaseRequestItem } from "@/lib/api/procurement";
import { suppliersApi, SupplierItem } from "@/lib/api/suppliers";
import { productsApi, ProductItem } from "@/lib/api/products";
import { currencyApi, CurrencyItem } from "@/lib/api/currency";
import { useIsOwnDocument } from "@/lib/hooks/use-own-document";
import { useAppStore } from "@/stores/app-store";

export default function PurchaseOrdersPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("procurement");
  const isOwn = useIsOwnDocument();
  const currentUser = useAppStore((s) => s.currentUser);
  const [pos, setPos] = React.useState<PurchaseOrderItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);

  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [suppliers, setSuppliers] = React.useState<SupplierItem[]>([]);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [approvedPRs, setApprovedPRs] = React.useState<PurchaseRequestItem[]>([]);
  const [supplierId, setSupplierId] = React.useState("");
  const [prId, setPrId] = React.useState("");
  const [expectedDate, setExpectedDate] = React.useState("");
  const [currencies, setCurrencies] = React.useState<CurrencyItem[]>([]);
  const [currency, setCurrency] = React.useState("");
  const [poLines, setPoLines] = React.useState<PurchaseOrderLineInput[]>([]);
  const [lineProductId, setLineProductId] = React.useState("");
  const [lineQty, setLineQty] = React.useState("1");
  const [formError, setFormError] = React.useState<string | null>(null);

  const fetchPOs = React.useCallback(() => {
    setIsLoading(true);
    procurementApi
      .listPurchaseOrders()
      .then((res) => setPos(res.data || []))
      .catch((err) => {
        console.error("Failed to load purchase orders", err);
        setLoadError("Gagal memuat data pesanan pembelian dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    fetchPOs();
    suppliersApi
      .list({ perPage: 200 })
      .then((res) => setSuppliers(res.data || []))
      .catch((err) => console.warn("Failed to load suppliers", err));
    productsApi
      .list({ perPage: 500 })
      .then((res) => setProducts(res.data || []))
      .catch((err) => console.warn("Failed to load products", err));
    procurementApi
      .listPurchaseRequests({ perPage: 100 })
      .then((res) => setApprovedPRs((res.data || []).filter((pr) => pr.status === "approved")))
      .catch((err) => console.warn("Failed to load purchase requests", err));
    currencyApi
      .list()
      .then((res) => setCurrencies(res.data || []))
      .catch((err) => console.warn("Failed to load currencies", err));
  }, [fetchPOs]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // Picking a PR auto-fills the line items from its requested products,
  // priced at each product's current cost price (the PR itself carries no
  // price - it's just a request for quantity of a product).
  const handleSelectPR = (id: string) => {
    setPrId(id);
    if (!id) return;
    const pr = approvedPRs.find((p) => p.id === id);
    if (!pr) return;
    const lines: PurchaseOrderLineInput[] = pr.lines.map((l) => {
      const product = products.find((p) => p.id === l.productId);
      return { productId: l.productId, quantity: l.quantity, unitPrice: product?.costPrice || 0 };
    });
    setPoLines(lines);
  };

  const handleAddLine = () => {
    if (!lineProductId) return;
    const qty = Number(lineQty) || 1;
    const product = products.find((p) => p.id === lineProductId);
    setPoLines((prev) => {
      const existing = prev.find((l) => l.productId === lineProductId);
      if (existing) {
        return prev.map((l) => (l.productId === lineProductId ? { ...l, quantity: l.quantity + qty } : l));
      }
      return [...prev, { productId: lineProductId, quantity: qty, unitPrice: product?.costPrice || 0 }];
    });
    setLineProductId("");
    setLineQty("1");
  };

  const handleRemoveLine = (productId: string) => {
    setPoLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const handleLinePriceChange = (productId: string, unitPrice: number) => {
    setPoLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, unitPrice } : l)));
  };

  const totalAmount = poLines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const handleExport = () => {
    downloadCsv(
      "purchase-orders.csv",
      ["PO Number", "Vendor", "Order Date", "Expected Delivery", "Total Cost", "Status"],
      pos.map((po) => [po.orderNo, po.supplierName, po.orderDate, po.expectedDate, po.totalAmount, po.status])
    );
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !expectedDate) return;
    if (poLines.length === 0) {
      setFormError("Tambahkan minimal 1 item barang, atau pilih Purchase Request untuk mengisi otomatis.");
      return;
    }
    if (poLines.some((l) => l.unitPrice <= 0)) {
      setFormError("Setiap item harus punya harga satuan lebih dari 0.");
      return;
    }
    setFormError(null);
    try {
      await procurementApi.createPurchaseOrder({
        supplierId,
        supplierName: selectedSupplier?.name,
        purchaseRequestId: prId || null,
        expectedDate,
        requestedBy: currentUser?.name || currentUser?.email,
        currency: currency || undefined,
        lines: poLines,
      });
      fetchPOs();
      setIsNewOpen(false);
      setSupplierId("");
      setPrId("");
      setExpectedDate("");
      setCurrency("");
      setPoLines([]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat purchase order.");
    }
  };

  const handleApprove = async (po: PurchaseOrderItem) => {
    setActingId(po.id);
    try {
      await procurementApi.approvePurchaseOrder(po.id);
      fetchPOs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyetujui PO.");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (po: PurchaseOrderItem) => {
    const comments = prompt("Alasan penolakan (opsional):") || "";
    setActingId(po.id);
    try {
      await procurementApi.rejectPurchaseOrder(po.id, comments);
      fetchPOs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menolak PO.");
    } finally {
      setActingId(null);
    }
  };

  const columns: Column<PurchaseOrderItem>[] = [
    {
      key: "orderNo",
      header: "PO Number",
      sortable: true,
      render: (po) => <span className="font-mono text-xs font-bold text-brand-primary">{po.orderNo}</span>,
    },
    {
      key: "supplierName",
      header: "Vendor / Supplier",
      sortable: true,
      render: (po) => <span className="text-xs font-semibold text-foreground">{po.supplierName}</span>,
    },
    {
      key: "orderDate",
      header: "Order Date",
      render: (po) => <span className="text-xs text-muted-foreground">{po.orderDate}</span>,
    },
    {
      key: "expectedDate",
      header: "Expected Delivery",
      render: (po) => <span className="text-xs font-medium text-foreground">{po.expectedDate}</span>,
    },
    {
      key: "totalAmount",
      header: "Total Cost",
      align: "right",
      sortable: true,
      render: (po) => {
        const hasForeignCurrency = po.currency && po.currency !== "IDR";
        return (
          <div className="flex flex-col items-end">
            <MoneyDisplay
              amount={po.totalAmount}
              currency={hasForeignCurrency ? po.currency : undefined}
              className="text-xs font-bold text-foreground"
            />
            {hasForeignCurrency && po.baseAmount != null && (
              <span className="text-[11px] text-muted-foreground">
                ≈ Rp {po.baseAmount.toLocaleString("id-ID")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (po) => <StatusBadge status={po.status} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (po) =>
        mayApprove && !isOwn(po.createdByEmail) && (po.status === "pending_approval" || po.status === "draft" || po.status === "submitted") ? (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={actingId === po.id}
              onClick={() => handleReject(po)}
              className="h-7 gap-1 text-[11px] font-bold border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              <X className="h-3 w-3" /> Tolak
            </Button>
            <Button
              size="sm"
              variant="gradient"
              disabled={actingId === po.id}
              onClick={() => handleApprove(po)}
              className="h-7 gap-1 text-[11px] font-bold"
            >
              <Check className="h-3 w-3" /> Setujui
            </Button>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders (PO)"
        description="Issue formal procurement contracts to vendors, monitor fulfillment, and review payment commitments."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsNewOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Create Purchase Order
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
          data={pos}
          searchKey="orderNo"
          searchPlaceholder="Search PO number or vendor..."
        />
      )}

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePO} className="min-w-0 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Dari Purchase Request (opsional)</label>
              <select
                value={prId}
                onChange={(e) => handleSelectPR(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
              >
                <option value="">Tidak ada — isi item manual</option>
                {approvedPRs.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.requestNo} — {pr.department} ({pr.lines.length} item)
                  </option>
                ))}
              </select>
              {prId && (
                <p className="text-[11px] text-muted-foreground">
                  Item di bawah otomatis terisi dari PR ini. Harga satuan diambil dari harga pokok produk — sesuaikan bila perlu.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Vendor / Supplier</label>
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
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Expected Delivery</label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Mata Uang (opsional)</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
              >
                <option value="">Default (IDR)</option>
                {currencies.filter((c) => !c.isBase).map((c) => (
                  <option key={c.id} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
              {currency && (
                <p className="text-[11px] text-muted-foreground">
                  Total akan dikonversi ke IDR menggunakan kurs terbaru pada tanggal order.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Item Barang</label>
              <div className="rounded-lg border border-border bg-slate-50/60 p-3 space-y-3">
                {poLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Belum ada item. Pilih Purchase Request di atas, atau tambah produk manual di bawah.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border bg-white overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-border">
                        {poLines.map((l) => {
                          const product = products.find((p) => p.id === l.productId);
                          return (
                            <tr key={l.productId}>
                              <td className="py-2 px-3">{product?.name || l.productId}</td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">{l.quantity}x</td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                <Input
                                  type="number"
                                  min={0}
                                  value={l.unitPrice}
                                  onChange={(e) => handleLinePriceChange(l.productId, Number(e.target.value))}
                                  className="h-7 w-24 text-xs text-right"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(l.productId)}
                                  className="text-rose-600 hover:underline text-[11px] font-medium"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="flex justify-between items-center px-3 py-2 bg-slate-50 border-t border-border text-xs font-bold">
                      <span>Total</span>
                      <span>Rp {totalAmount.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-1.5">
                  <select
                    value={lineProductId}
                    onChange={(e) => setLineProductId(e.target.value)}
                    className="flex h-10 flex-1 min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
                  >
                    <option value="">Pilih produk...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    value={lineQty}
                    onChange={(e) => setLineQty(e.target.value)}
                    className="w-16 shrink-0 bg-white"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddLine} className="h-10 text-xs shrink-0 bg-white">
                    Tambah
                  </Button>
                </div>
              </div>
            </div>

            {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold">
                Create PO
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
