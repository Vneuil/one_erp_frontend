"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import {
  Plus,
  Download,
  RefreshCw,
  ShoppingBag,
  Store,
  FileText,
  PenTool,
  CheckCircle2,
  Truck,
  Building2,
  ChevronRight,
  TrendingUp,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import {
  ChannelBadge,
  OrderSourceType,
  MarketplacePlatform,
} from "@/components/shared/channel-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/utils/csv";

interface SalesOrderItem {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  source: OrderSourceType;
  platform?: MarketplacePlatform;
  storeName?: string;
  externalOrderId?: string;
  quotationRef?: string;
  posBranch?: string;
  posCashier?: string;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  shippingCourier?: string;
  trackingNumber?: string;
  totalAmount: number;
  paymentTerms: string;
  status: string;
  createdByEmail?: string;
  items: SalesOrderItem[];
  // editable mirrors the backend's own restriction in UpdateOrder: only
  // orders with neither a marketplace origin nor a POS channel may be
  // edited - marketplace orders must stay in sync with their source, and
  // POS sales are completed, already-paid transactions.
  editable: boolean;
}

import { salesApi, SalesOrderItem as ApiSO, SalesOrderLineInput } from "@/lib/api/sales";
import { useIsOwnDocument } from "@/lib/hooks/use-own-document";
import { marketplaceApi } from "@/lib/api/marketplace";
import { productsApi, ProductItem } from "@/lib/api/products";
import { inventoryApi, WarehouseItem, StockLevelItem } from "@/lib/api/inventory";
import { customersApi, CustomerItem } from "@/lib/api/customers";

export default function SalesOrdersPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("sales");
  const isOwn = useIsOwnDocument();
  const [orders, setOrders] = React.useState<SalesOrder[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = React.useState<string>("all");
  const [selectedOrder, setSelectedOrder] = React.useState<SalesOrder | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newCustomerId, setNewCustomerId] = React.useState("");
  const [customers, setCustomers] = React.useState<CustomerItem[]>([]);
  const [customersLoading, setCustomersLoading] = React.useState(false);
  const [customersError, setCustomersError] = React.useState(false);
  const [customerReload, setCustomerReload] = React.useState(0);
  const [newDeliveryDate, setNewDeliveryDate] = React.useState("");
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [newWarehouseId, setNewWarehouseId] = React.useState("");
  const [orderLines, setOrderLines] = React.useState<SalesOrderLineInput[]>([]);
  const [lineProductId, setLineProductId] = React.useState("");
  const [lineQty, setLineQty] = React.useState("1");
  const [warehouseStock, setWarehouseStock] = React.useState<{ warehouseId: string; items: StockLevelItem[]; error: boolean } | null>(null);
  const [stockReload, setStockReload] = React.useState(0);
  const stockLoading = !!newWarehouseId && warehouseStock?.warehouseId !== newWarehouseId;
  const stockError = warehouseStock?.warehouseId === newWarehouseId && warehouseStock.error;
  const warehouseProducts = products.flatMap((product) => {
    const stock = warehouseStock?.warehouseId === newWarehouseId
      ? warehouseStock.items.find((item) => item.productId === product.id && item.warehouseId === newWarehouseId)
      : undefined;
    return stock && stock.available > 0 ? [{ ...product, stock: stock.available }] : [];
  });

  React.useEffect(() => {
    if (!isCreateOpen || !newWarehouseId) return;
    let cancelled = false;
    const loadStock = async () => {
      try {
        const items: StockLevelItem[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await inventoryApi.listStockLevels({ page, perPage: 100 });
          if (cancelled) return;
          items.push(...(res.data || []).filter((item) => item.warehouseId === newWarehouseId));
          totalPages = res.meta?.totalPages || 1;
          page += 1;
        } while (page <= totalPages);
        setWarehouseStock({ warehouseId: newWarehouseId, items, error: false });
      } catch {
        if (!cancelled) setWarehouseStock({ warehouseId: newWarehouseId, items: [], error: true });
      }
    };
    void loadStock();
    return () => { cancelled = true; };
  }, [isCreateOpen, newWarehouseId, stockReload]);

  const resetCustomerOptions = () => {
    setCustomersLoading(true);
    setCustomersError(false);
    setCustomers([]);
  };

  React.useEffect(() => {
    if (!isCreateOpen) return;
    let cancelled = false;
    const loadCustomers = async () => {
      try {
        const allCustomers: CustomerItem[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await customersApi.list({ page, perPage: 100 });
          if (cancelled) return;
          allCustomers.push(...(res.data || []));
          totalPages = res.meta?.totalPages || 1;
          page += 1;
        } while (page <= totalPages);
        setCustomers(allCustomers);
        setNewCustomerId((id) => allCustomers.some((customer) => customer.id === id) ? id : "");
      } catch {
        if (!cancelled) setCustomersError(true);
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    };
    void loadCustomers();
    return () => { cancelled = true; };
  }, [isCreateOpen, customerReload]);

  const loadCatalog = React.useCallback(() => {
    (async () => {
      const allProducts: ProductItem[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await productsApi.list({ page, perPage: 100 });
        allProducts.push(...(res.data || []));
        totalPages = res.meta?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);
      setProducts(allProducts);
    })()
      .catch((err) => console.warn("Failed to load products for SO line items", err));
    inventoryApi
      .listWarehouses({ perPage: 50 })
      .then((res) => {
        const list = res.data || [];
        setWarehouses(list);
        if (list.length > 0) setNewWarehouseId((prev) => prev || list[0].id);
      })
      .catch((err) => console.warn("Failed to load warehouses for SO", err));
  }, []);

  React.useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const [applyPpn, setApplyPpn] = React.useState(true);
  const [discountPercent, setDiscountPercent] = React.useState("0");

  const subtotalAmount = React.useMemo(
    () => orderLines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
    [orderLines]
  );
  const discountAmount = React.useMemo(
    () => Math.round((subtotalAmount * (Number(discountPercent) || 0)) / 100),
    [subtotalAmount, discountPercent]
  );
  const ppnAmount = React.useMemo(
    () => (applyPpn ? Math.round((subtotalAmount - discountAmount) * 0.11) : 0),
    [subtotalAmount, discountAmount, applyPpn]
  );
  const newTotalAmount = subtotalAmount - discountAmount + ppnAmount;

  const handleAddLine = () => {
    if (!lineProductId) return;
    const product = warehouseProducts.find((p) => p.id === lineProductId);
    if (!product || stockLoading || stockError) return;
    const qty = Number(lineQty);
    const existingQty = orderLines.find((line) => line.productId === lineProductId)?.quantity || 0;
    if (!Number.isInteger(qty) || qty < 1 || existingQty + qty > product.stock) {
      alert("Jumlah pesanan melebihi stok tersedia di gudang atau jumlah tidak valid.");
      return;
    }
    setOrderLines((prev) => {
      const existing = prev.find((l) => l.productId === lineProductId);
      if (existing) {
        return prev.map((l) => (l.productId === lineProductId ? { ...l, quantity: l.quantity + qty } : l));
      }
      return [...prev, { productId: product.id, quantity: qty, unitPrice: product.sellingPrice }];
    });
    setLineProductId("");
    setLineQty("1");
  };

  const handleRemoveLine = (productId: string) => {
    setOrderLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const [actingId, setActingId] = React.useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<SalesOrder | null>(null);
  const [editCustomerName, setEditCustomerName] = React.useState("");
  const [editLines, setEditLines] = React.useState<SalesOrderLineInput[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const editTotalAmount = editLines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const updateEditLine = (index: number, patch: Partial<SalesOrderLineInput>) =>
    setEditLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const handleOpenEditOrder = (so: SalesOrder) => {
    setEditingOrder(so);
    setEditCustomerName(so.customerName);
    setEditLines(so.items.map((item) => ({ productId: item.productId, quantity: item.qty, unitPrice: item.unitPrice })));
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingOrder ||
      !editCustomerName.trim() ||
      editLines.length === 0 ||
      editLines.some((line) => !products.some((product) => product.id === line.productId) || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0)
    ) {
      setEditError("Isi nama customer dan minimal satu item dengan produk, kuantitas, serta harga yang valid.");
      return;
    }

    setIsEditSubmitting(true);
    setEditError(null);
    try {
      await salesApi.updateOrder(editingOrder.id, {
        customerName: editCustomerName.trim(),
        lines: editLines,
      });
      fetchOrders();
      setIsEditOpen(false);
      setEditingOrder(null);
      setSelectedOrder(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal memperbarui sales order");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const fetchOrders = React.useCallback(() => {
    salesApi
      .listOrders()
      .then((res) => {
                  const live: SalesOrder[] = (res.data || []).map((o: ApiSO) => {
            const ch = o.channel?.toLowerCase() || "";
            const platform: MarketplacePlatform | undefined = ch.includes("tiktok")
              ? "tiktok"
              : ch.includes("shopee")
                ? "shopee"
                : ch.includes("blibli")
                  ? "blibli"
                  : ch.includes("lazada")
                    ? "lazada"
                    : ch.includes("tokopedia")
                      ? "tokopedia"
                      : undefined;
            const isPos = ch === "pos";
            return {
            id: o.id,
            orderNumber: o.orderNumber,
            createdByEmail: o.createdByEmail,
            source: platform ? "marketplace" : isPos ? "pos" : "quotation",
            platform,
            externalOrderId: o.marketplaceOrderId,
            customerName: o.customerName,
            orderDate: o.orderDate || "2026-09-02",
            deliveryDate: "2026-09-05",
            totalAmount: o.totalAmount,
            paymentTerms: o.paymentStatus || "Paid",
            status: o.status.toLowerCase(),
            // Editable mirrors the backend's own UpdateOrder restriction:
            // neither a marketplace-synced order nor a POS sale may be
            // edited here (see usecase.UpdateOrder for why).
            editable: !platform && !isPos,
            items: (o.lines || []).map((l) => {
              const product = products.find((p) => p.id === l.productId);
              return {
                productId: l.productId,
                sku: product?.sku || l.productId.slice(0, 8),
                name: product?.name || `Produk ${l.productId.slice(0, 8)}`,
                qty: l.quantity,
                unitPrice: l.unitPrice,
                subtotal: l.subtotal,
              };
            }),
            };
          });
          setOrders(live);
      })
      .catch((err) => {
        console.error("Failed to load sales orders", err);
        setLoadError("Gagal memuat sales order dari server.");
      });
  }, [products]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Sales Orders routed through an admin-configured approval workflow (see
  // Approval Workflow settings) land in "pending_approval" - approving or
  // rejecting here mirrors Purchase Orders' same flow.
  const handleApproveOrder = async (so: SalesOrder) => {
    setActingId(so.id);
    try {
      await salesApi.approveOrder(so.id);
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyetujui Sales Order.");
    } finally {
      setActingId(null);
    }
  };

  const handleRejectOrder = async (so: SalesOrder) => {
    const comments = prompt("Alasan penolakan (opsional):") || "";
    setActingId(so.id);
    try {
      await salesApi.rejectOrder(so.id, comments);
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menolak Sales Order.");
    } finally {
      setActingId(null);
    }
  };

  const [isMarkingReadyToShip, setIsMarkingReadyToShip] = React.useState<string | null>(null);
  const [readyToShipError, setReadyToShipError] = React.useState<string | null>(null);

  const handleMarkReadyToShip = async (so: SalesOrder) => {
    setIsMarkingReadyToShip(so.id);
    setReadyToShipError(null);
    try {
      await marketplaceApi.markOrderReadyToShip(so.id);
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      setReadyToShipError(err instanceof Error ? err.message : "Gagal menandai order siap pickup di marketplace.");
    } finally {
      setIsMarkingReadyToShip(null);
    }
  };

  // Filter orders by channel tab
  const filteredOrders = React.useMemo(() => {
    if (selectedChannel === "all") return orders;
    if (selectedChannel === "marketplace") {
      return orders.filter((so) => so.source === "marketplace");
    }
    return orders.filter((so) => so.source === selectedChannel);
  }, [selectedChannel, orders]);

  // Channel metrics
  const metrics = React.useMemo(() => {
    const totalRev = orders.reduce((sum, so) => sum + so.totalAmount, 0);
    const marketplaceOrders = orders.filter((so) => so.source === "marketplace");
    const marketplaceRev = marketplaceOrders.reduce((sum, so) => sum + so.totalAmount, 0);
    const posOrders = orders.filter((so) => so.source === "pos");
    const posRev = posOrders.reduce((sum, so) => sum + so.totalAmount, 0);
    const b2bOrders = orders.filter(
      (so) => so.source === "quotation" || so.source === "manual"
    );
    const b2bRev = b2bOrders.reduce((sum, so) => sum + so.totalAmount, 0);

    return {
      totalRev,
      totalCount: orders.length,
      marketplaceRev,
      marketplaceCount: marketplaceOrders.length,
      posRev,
      posCount: posOrders.length,
      b2bRev,
      b2bCount: b2bOrders.length,
    };
  }, [orders]);

  const handleExportOrders = () => {
    downloadCsv(
      "sales-orders.csv",
      ["SO Number", "Source", "Customer", "Order Date", "Total Amount", "Payment Terms", "Status"],
      filteredOrders.map((so) => [
        so.orderNumber,
        so.source,
        so.customerName,
        so.orderDate,
        so.totalAmount,
        so.paymentTerms,
        so.status,
      ])
    );
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((item) => item.id === newCustomerId);
    if (!newWarehouseId || stockLoading || stockError || orderLines.some((line) => {
      const product = warehouseProducts.find((item) => item.id === line.productId);
      return !product || line.quantity > product.stock;
    })) {
      alert("Periksa produk dan stok tersedia di gudang yang dipilih.");
      return;
    }
    if (customersLoading || customersError || !customer || orderLines.length === 0) {
      if (orderLines.length === 0) alert("Tambahkan minimal 1 item barang ke pesanan.");
      return;
    }

    const orderDate = new Date().toISOString().slice(0, 16).replace("T", " ");
    const itemsForDisplay: SalesOrderItem[] = orderLines.map((l) => {
      const product = products.find((p) => p.id === l.productId);
      return {
        productId: l.productId,
        sku: product?.sku || "-",
        name: product?.name || l.productId,
        qty: l.quantity,
        unitPrice: l.unitPrice,
        subtotal: l.quantity * l.unitPrice,
      };
    });

    try {
      const res = await salesApi.createOrder({
        customerName: customer.name,
        totalAmount: newTotalAmount,
        warehouseId: newWarehouseId || undefined,
        lines: orderLines,
      });
      const o = res.data;
      setOrders([
        {
          id: o.id,
          orderNumber: o.orderNumber,
          createdByEmail: o.createdByEmail,
          source: "manual",
          customerName: o.customerName,
          orderDate: o.orderDate || orderDate,
          deliveryDate: newDeliveryDate || orderDate.slice(0, 10),
          totalAmount: o.totalAmount,
          paymentTerms: o.paymentStatus || "Pending",
          status: o.status?.toLowerCase() || "processing",
          editable: true,
          items: itemsForDisplay,
        },
        ...orders,
      ]);
      loadCatalog();
    } catch (err) {
      console.warn("Failed to create sales order via API", err);
      alert("Gagal membuat pesanan (kemungkinan stok tidak cukup di gudang terpilih). Coba lagi.");
      return;
    }

    setIsCreateOpen(false);
    setNewCustomerId("");
    setNewDeliveryDate("");
    setOrderLines([]);
    setDiscountPercent("0");
    setApplyPpn(true);
  };

  const handleSyncMarketplace = async () => {
    setIsSyncing(true);
    setSyncSuccessMessage(null);
    try {
      const conns = (await marketplaceApi.listConnections()).data || [];
      const connected = conns.filter((c) => c.status === "connected");
      if (connected.length === 0) {
        setSyncSuccessMessage("No marketplace connected. Connect one from Settings > Integrations.");
      } else {
        const parts: string[] = [];
        for (const c of connected) {
          try {
            const r = (await marketplaceApi.sync(c.platform)).data;
            parts.push(`${c.platform} (${r?.ordersCreated ?? 0} new orders${r?.productsFetched ? `, ${r.productsFetched} products` : ""})`);
          } catch (err) {
            parts.push(`${c.platform} (failed: ${err instanceof Error ? err.message : "error"})`);
          }
        }
        setSyncSuccessMessage(`Marketplace sync: ${parts.join(", ")}`);
        fetchOrders();
      }
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncSuccessMessage(null), 8000);
    }
  };

  const columns: Column<SalesOrder>[] = [
    {
      key: "orderNumber",
      header: "SO Number",
      sortable: true,
      render: (so) => (
        <button
          type="button"
          onClick={() => setSelectedOrder(so)}
          className="text-left font-mono text-xs font-bold text-brand-primary hover:underline flex items-center gap-1 group cursor-pointer"
        >
          <span className="flex flex-col">
            <span>{so.orderNumber}</span>
            {so.externalOrderId && (
              <span className="text-[10px] font-normal text-muted-foreground">Order ID: {so.externalOrderId}</span>
            )}
          </span>
          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ),
    },
    {
      key: "source",
      header: "Order Channel / Source",
      sortable: true,
      render: (so) => (
        <div className="flex flex-col gap-1">
          <ChannelBadge
            source={so.source}
            platform={so.platform}
            storeName={so.storeName || so.posBranch}
            externalId={so.externalOrderId || so.quotationRef}
          />
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer / Buyer",
      sortable: true,
      render: (so) => (
        <div>
          <span className="text-xs font-semibold text-foreground block">{so.customerName}</span>
          {so.shippingCourier && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Truck className="h-3 w-3" /> {so.shippingCourier}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "orderDate",
      header: "Order Date",
      sortable: true,
      render: (so) => <span className="text-xs text-muted-foreground">{so.orderDate}</span>,
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      align: "right",
      sortable: true,
      render: (so) => <MoneyDisplay amount={so.totalAmount} highlight className="text-xs font-bold" />,
    },
    {
      key: "paymentTerms",
      header: "Payment Method / Terms",
      render: (so) => (
        <span className="text-xs text-muted-foreground font-medium">{so.paymentTerms}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (so) => <StatusBadge status={so.status} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (so) =>
        so.status === "pending_approval" && mayApprove && !isOwn(so.createdByEmail) ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              disabled={actingId === so.id}
              onClick={() => handleRejectOrder(so)}
              className="h-7 gap-1 text-[11px] font-bold border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              <X className="h-3 w-3" /> Tolak
            </Button>
            <Button
              size="sm"
              variant="gradient"
              disabled={actingId === so.id}
              onClick={() => handleApproveOrder(so)}
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
        title="Omnichannel Sales Orders"
        description="Unified order processing across Marketplaces (TikTok Shop, Shopee, Blibli, Lazada, Tokopedia), POS retail outlets, approved Quotations, and manual entries."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncMarketplace}
          disabled={isSyncing}
          className="h-9 gap-1.5 text-xs border-brand-primary/30 text-brand-primary hover:bg-brand-tint hover:text-brand-indigo"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing Marketplaces..." : "Sync Marketplace APIs"}
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExportOrders}>
          <Download className="h-3.5 w-3.5" /> Export Orders
        </Button>
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => { resetCustomerOptions(); setWarehouseStock(null); setIsCreateOpen(true); }}
        >
          <Plus className="h-3.5 w-3.5" /> Create Sales Order
        </Button>
      </PageHeader>

      {syncSuccessMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* Omnichannel Channel Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-xs hover:border-brand-primary/40 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">All Omnichannel Revenue</p>
              <MoneyDisplay amount={metrics.totalRev} className="text-lg font-bold text-brand-dark" />
              <p className="text-[11px] text-muted-foreground">{metrics.totalCount} Confirmed Orders</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-brand-tint text-brand-primary flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-orange-300 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-orange-700 font-medium">Marketplace E-Commerce</p>
              <MoneyDisplay amount={metrics.marketplaceRev} className="text-lg font-bold text-orange-950" />
              <p className="text-[11px] text-orange-600 font-medium">
                {metrics.marketplaceCount} Orders (TikTok / Shopee / Blibli / Lazada)
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-blue-300 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-blue-700 font-medium">POS Retail Outlets</p>
              <MoneyDisplay amount={metrics.posRev} className="text-lg font-bold text-blue-950" />
              <p className="text-[11px] text-blue-600 font-medium">
                {metrics.posCount} Direct POS Transactions
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-purple-300 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-purple-700 font-medium">B2B Quotations & Direct</p>
              <MoneyDisplay amount={metrics.b2bRev} className="text-lg font-bold text-purple-950" />
              <p className="text-[11px] text-purple-600 font-medium">
                {metrics.b2bCount} Commercial Contract Orders
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-brand-indigo flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Switcher Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-1 overflow-x-auto">
        {[
          { id: "all", label: "All Channels", icon: TrendingUp },
          { id: "marketplace", label: "Marketplace (TikTok / Shopee / Blibli / Lazada)", icon: ShoppingBag },
          { id: "pos", label: "POS Retail Stores", icon: Store },
          { id: "quotation", label: "Quotation Conversions", icon: FileText },
          { id: "manual", label: "Manual Direct Entry", icon: PenTool },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedChannel === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedChannel(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-brand-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Data Table */}
      {loadError && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}
        <DataTable
        columns={columns}
        data={filteredOrders}
        searchKey="orderNumber"
        searchPlaceholder="Search order no, customer, or marketplace ID..."
        onRowClick={(item) => setSelectedOrder(item)}
      />

      {/* Order Source Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <span>{selectedOrder.orderNumber}</span>
                    <StatusBadge status={selectedOrder.status} />
                  </DialogTitle>
                  <DialogDescription className="text-xs pt-0.5">
                    Created on {selectedOrder.orderDate}
                  </DialogDescription>
                </div>
                <ChannelBadge
                  source={selectedOrder.source}
                  platform={selectedOrder.platform}
                  storeName={selectedOrder.storeName || selectedOrder.posBranch}
                />
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Channel Specific Origin Meta Box */}
              <div className="rounded-xl border border-border bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-border/60 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-brand-primary" />
                    Channel Origin Information
                  </span>
                  <span className="uppercase text-[10px] font-mono tracking-wider px-2 py-0.5 bg-white border border-border rounded">
                    Source: {selectedOrder.source}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  {selectedOrder.source === "marketplace" && (
                    <>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Marketplace</span>
                        <span className="font-semibold capitalize text-foreground">
                          {selectedOrder.platform}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">External Order ID</span>
                        <span className="font-mono font-semibold text-brand-primary">
                          {selectedOrder.externalOrderId}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Store Account</span>
                        <span className="font-semibold text-foreground">{selectedOrder.storeName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Logistics Courier</span>
                        <span className="font-semibold text-foreground">{selectedOrder.shippingCourier}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Airwaybill / Resi</span>
                        <span className="font-mono font-semibold text-foreground">
                          {selectedOrder.trackingNumber || "Pending Booking"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Settlement Method</span>
                        <span className="font-semibold text-emerald-700">{selectedOrder.paymentTerms}</span>
                      </div>
                    </>
                  )}

                  {selectedOrder.source === "quotation" && (
                    <>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Quotation Reference</span>
                        <span className="font-mono font-semibold text-brand-indigo">
                          {selectedOrder.quotationRef}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Customer Entity</span>
                        <span className="font-semibold text-foreground">{selectedOrder.customerName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Payment Terms</span>
                        <span className="font-semibold text-foreground">{selectedOrder.paymentTerms}</span>
                      </div>
                    </>
                  )}

                  {selectedOrder.source === "pos" && (
                    <>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Retail Branch</span>
                        <span className="font-semibold text-foreground">{selectedOrder.posBranch}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Cashier / Register</span>
                        <span className="font-semibold text-foreground">{selectedOrder.posCashier}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Payment Gateway</span>
                        <span className="font-semibold text-foreground">{selectedOrder.paymentTerms}</span>
                      </div>
                    </>
                  )}

                  {selectedOrder.source === "manual" && (
                    <>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Input Method</span>
                        <span className="font-semibold text-foreground">Direct Backoffice Admin</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Customer Account</span>
                        <span className="font-semibold text-foreground">{selectedOrder.customerName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Payment Terms</span>
                        <span className="font-semibold text-foreground">{selectedOrder.paymentTerms}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Items Line Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground">Ordered Line Items</h4>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold">SKU & Item Name</th>
                        <th className="py-2 px-3 text-center font-semibold">Qty</th>
                        <th className="py-2 px-3 text-right font-semibold">Unit Price</th>
                        <th className="py-2 px-3 text-right font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <span className="font-mono font-bold text-brand-primary block">
                              {item.sku}
                            </span>
                            <span className="text-foreground">{item.name}</span>
                          </td>
                          <td className="py-2 px-3 text-center font-semibold">{item.qty}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">
                            <MoneyDisplay amount={item.unitPrice} />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">
                            <MoneyDisplay amount={item.subtotal} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Fulfilled via:{" "}
                  <strong className="text-foreground">
                    {selectedOrder.shippingCourier || "Internal Fleet"}
                  </strong>
                </span>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Order Grand Total:</span>
                  <MoneyDisplay
                    amount={selectedOrder.totalAmount}
                    highlight
                    className="text-base font-bold"
                  />
                </div>
              </div>
              {readyToShipError && <div role="alert" className="text-xs text-rose-700">{readyToShipError}</div>}
              {(selectedOrder.editable || selectedOrder.source === "marketplace") && (
                <DialogFooter>
                  {selectedOrder.editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditOrder(selectedOrder)}
                    >
                      Edit Sales Order
                    </Button>
                  )}
                  {selectedOrder.editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { window.location.href = "/sales/deliveries"; }}
                    >
                      Create Delivery
                    </Button>
                  )}
                  {selectedOrder.source === "marketplace" && (
                    <Button
                      type="button"
                      variant="gradient"
                      size="sm"
                      disabled={isMarkingReadyToShip === selectedOrder.id}
                      onClick={() => handleMarkReadyToShip(selectedOrder)}
                    >
                      {isMarkingReadyToShip === selectedOrder.id ? "Memproses..." : "Mark Ready to Ship (Pickup)"}
                    </Button>
                  )}
                </DialogFooter>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Create Sales Order Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Sales Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrder} className="min-w-0 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="sales-order-customer" className="text-xs font-medium text-foreground">Customer</label>
              <select
                id="sales-order-customer"
                value={newCustomerId}
                onChange={(e) => setNewCustomerId(e.target.value)}
                required
                disabled={customersLoading || customersError || customers.length === 0}
                className="flex h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-50"
              >
                <option value="">{customersLoading ? "Memuat customer..." : "Pilih customer dari master data..."}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.code} — {customer.name}</option>
                ))}
              </select>
              {customersError ? (
                <p role="alert" className="text-xs text-rose-600">
                  Gagal memuat master customer. <button type="button" className="underline" onClick={() => { resetCustomerOptions(); setCustomerReload((value) => value + 1); }}>Coba lagi</button>
                </p>
              ) : !customersLoading && customers.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada customer. Tambahkan di <a href="/master-data/customers" className="underline">Master Data Customer</a> terlebih dahulu.</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sales-order-warehouse" className="text-xs font-medium text-foreground">Warehouse (stok akan dipotong dari sini)</label>
              <select
                id="sales-order-warehouse"
                value={newWarehouseId}
                onChange={(e) => {
                  setNewWarehouseId(e.target.value);
                  setWarehouseStock(null);
                  setLineProductId("");
                  setLineQty("1");
                  setOrderLines([]);
                }}
                className="flex h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
              >
                {warehouses.length === 0 && <option value="">Tidak ada gudang tersedia</option>}
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Mengganti gudang akan mengosongkan item pesanan.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Item Pesanan</label>

              <div className="rounded-lg border border-border overflow-x-auto">
                {orderLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 px-3">
                    Belum ada item. Pilih produk di bawah lalu klik &quot;Tambah&quot; — Anda bisa menambah lebih dari satu item.
                  </p>
                ) : (
                  <>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-border">
                        {orderLines.map((l) => {
                          const product = products.find((p) => p.id === l.productId);
                          return (
                            <tr key={l.productId}>
                              <td className="py-2 px-3">{product?.name || l.productId}</td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">{l.quantity}x</td>
                              <td className="py-2 px-3 text-right font-semibold whitespace-nowrap">
                                Rp {(l.quantity * l.unitPrice).toLocaleString("id-ID")}
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
                    <div className="px-3 py-2 bg-slate-50 border-t border-border text-xs space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal ({orderLines.length} item)</span>
                        <span>Rp {subtotalAmount.toLocaleString("id-ID")}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Diskon ({discountPercent}%)</span>
                          <span>- Rp {discountAmount.toLocaleString("id-ID")}</span>
                        </div>
                      )}
                      {applyPpn && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>PPN 11%</span>
                          <span>+ Rp {ppnAmount.toLocaleString("id-ID")}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/70">
                        <span>Total</span>
                        <span>Rp {newTotalAmount.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyPpn}
                    onChange={(e) => setApplyPpn(e.target.checked)}
                    className="h-3.5 w-3.5 accent-brand-primary"
                  />
                  <span className="text-foreground font-medium">Kena PPN 11%</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground font-medium">Diskon</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-16 h-8 text-xs"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 sm:flex">
                <select
                  aria-label="Produk gudang"
                  disabled={!newWarehouseId || stockLoading || !!stockError}
                  value={lineProductId}
                  onChange={(e) => setLineProductId(e.target.value)}
                  className="col-span-2 flex h-10 w-full flex-1 min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
                >
                  <option value="">{stockLoading ? "Memuat produk gudang..." : !newWarehouseId ? "Pilih gudang terlebih dahulu" : "Pilih produk..."}</option>
                  {warehouseProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Stok tersedia: {p.stock})</option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={1}
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                  className="w-16 shrink-0"
                />
                <Button type="button" variant="outline" size="sm" disabled={!lineProductId || stockLoading || !!stockError} onClick={handleAddLine} className="h-10 text-xs shrink-0">
                  Tambah
                </Button>
              </div>
              {stockError ? (
                <p role="alert" className="text-xs text-rose-600">Gagal memuat stok gudang. <button type="button" className="underline" onClick={() => { setWarehouseStock(null); setStockReload((value) => value + 1); }}>Muat ulang stok</button></p>
              ) : !stockLoading && newWarehouseId && warehouseProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tidak ada produk dengan stok tersedia di gudang ini.</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Delivery Date</label>
              <Input type="date" value={newDeliveryDate} onChange={(e) => setNewDeliveryDate(e.target.value)} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={customersLoading || customersError || !customers.some((customer) => customer.id === newCustomerId)}>
                Create Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Sales Order Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Edit Sales Order {editingOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOrder} className="min-w-0 space-y-3">
            {editError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {editError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Customer Name</label>
              <Input
                value={editCustomerName}
                onChange={(e) => setEditCustomerName(e.target.value)}
                required
                disabled={isEditSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Item Pesanan</label>
              <div className="rounded-lg border border-border bg-slate-50/60 p-3 space-y-3">
                {editLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 rounded-lg border bg-white p-3">
                    <label className="col-span-2 text-xs">Produk
                      <select
                        aria-label={`Edit order item ${index + 1}`}
                        value={line.productId}
                        required
                        disabled={isEditSubmitting}
                        className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                        onChange={(e) => {
                          const product = products.find((p) => p.id === e.target.value);
                          updateEditLine(index, { productId: product?.id || "", unitPrice: product?.sellingPrice ?? line.unitPrice });
                        }}
                      >
                        <option value="">Pilih produk</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs">Quantity
                      <Input
                        aria-label={`Edit order quantity ${index + 1}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateEditLine(index, { quantity: e.target.valueAsNumber })}
                        required
                        disabled={isEditSubmitting}
                      />
                    </label>
                    <label className="text-xs">Unit Price
                      <Input
                        aria-label={`Edit order unit price ${index + 1}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateEditLine(index, { unitPrice: e.target.valueAsNumber })}
                        required
                        disabled={isEditSubmitting}
                      />
                    </label>
                    <div className="col-span-2 flex items-center justify-between text-xs">
                      <span>Subtotal: <MoneyDisplay amount={line.quantity * line.unitPrice || 0} /></span>
                      <button
                        type="button"
                        disabled={editLines.length === 1 || isEditSubmitting}
                        onClick={() => setEditLines((current) => current.filter((_, i) => i !== index))}
                        className="text-rose-600 hover:underline text-[11px] font-medium disabled:opacity-40"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isEditSubmitting}
                  onClick={() => setEditLines((current) => [...current, { productId: "", quantity: 1, unitPrice: 0 }])}
                >
                  <Plus className="h-4 w-4 mr-1" />Add Item
                </Button>
                <div className="text-right text-sm font-semibold">Total: <MoneyDisplay amount={Number.isFinite(editTotalAmount) ? editTotalAmount : 0} /></div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isEditSubmitting}>
                {isEditSubmitting ? "Menyimpan..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
