"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import { Plus, Download, Check, X, Eye, Edit, Send } from "lucide-react";
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
import { approvalApi, ApprovalRequest } from "@/lib/api/approval";
import { useIsOwnDocument } from "@/lib/hooks/use-own-document";
import { useAppStore } from "@/stores/app-store";
import { useConfirm, useAlert, usePrompt } from "@/components/shared/confirm-modal";
import { ApprovalTimeline, canUserApprove } from "@/components/shared/approval-timeline";

export default function PurchaseOrdersPage() {
  const { canApprove, canViewPrices } = useNavigationAccess();
  const mayApprove = canApprove("procurement");
  const isOwn = useIsOwnDocument();
  const currentUser = useAppStore((s) => s.currentUser);
  const confirm = useConfirm();
  const alert = useAlert();
  const prompt = usePrompt();
  const [pos, setPos] = React.useState<PurchaseOrderItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // Active approvals map by PO id
  const [activeApprovals, setActiveApprovals] = React.useState<Record<string, ApprovalRequest>>({});

  // Create Modal state
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
  const [freightScheme, setFreightScheme] = React.useState("franco");
  const [freightCost, setFreightCost] = React.useState("0");
  const [qualityNotes, setQualityNotes] = React.useState("Kering oven, kadar air standar pabrik Manna.");

  // Detail Modal state (All statuses with Timeline)
  const [selectedPo, setSelectedPo] = React.useState<PurchaseOrderItem | null>(null);

  // Edit Modal state (Draft only)
  const [editingPo, setEditingPo] = React.useState<PurchaseOrderItem | null>(null);
  const [editSupplierId, setEditSupplierId] = React.useState("");
  const [editExpectedDate, setEditExpectedDate] = React.useState("");
  const [editFreightScheme, setEditFreightScheme] = React.useState("franco");
  const [editFreightCost, setEditFreightCost] = React.useState("0");
  const [editQualityNotes, setEditQualityNotes] = React.useState("");
  const [editLines, setEditLines] = React.useState<PurchaseOrderLineInput[]>([]);
  const [editLineProductId, setEditLineProductId] = React.useState("");
  const [editLineQty, setEditLineQty] = React.useState("1");
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);

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

  const fetchApprovals = React.useCallback(() => {
    approvalApi
      .listRequests({ documentType: "purchase_order", perPage: 100 })
      .then((res) => {
        const map: Record<string, ApprovalRequest> = {};
        (res.data || []).forEach((r) => {
          if (r.documentId && (!map[r.documentId] || r.status === "pending")) {
            map[r.documentId] = r;
          }
        });
        setActiveApprovals(map);
      })
      .catch((err) => console.warn("Failed to load approval requests for POs", err));
  }, []);

  React.useEffect(() => {
    fetchPOs();
    fetchApprovals();
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
  }, [fetchPOs, fetchApprovals]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

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

  const handleAddLine = async () => {
    if (!lineProductId) return;
    const qty = Number(lineQty) || 1;
    const product = products.find((p) => p.id === lineProductId);
    let price = product?.costPrice || 0;
    if (supplierId) {
      try {
        const last = await procurementApi.getLastPOPrice(supplierId, lineProductId);
        if (last.data && last.data.lastPrice > 0) {
          price = last.data.lastPrice;
        }
      } catch (e) {
        // use fallback
      }
    }
    setPoLines((prev) => {
      const existing = prev.find((l) => l.productId === lineProductId);
      if (existing) {
        return prev.map((l) => (l.productId === lineProductId ? { ...l, quantity: l.quantity + qty } : l));
      }
      return [...prev, { productId: lineProductId, quantity: qty, unitPrice: price }];
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
    const pricesAllowed = canViewPrices("procurement");
    downloadCsv(
      "purchase-orders.csv",
      ["PO Number", "Vendor", "Order Date", "Expected Delivery", "Freight Scheme", "Freight Cost", "Total Cost", "Status"],
      pos.map((po) => [
        po.orderNo,
        po.supplierName,
        po.orderDate,
        po.expectedDate,
        po.freightScheme || "franco",
        pricesAllowed ? (po.freightCost ?? 0) : "***",
        pricesAllowed ? po.totalAmount : "***",
        po.status,
      ])
    );
  };

  // Create PO - Starts as DRAFT
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
        freightScheme,
        freightCost: Number(freightCost) || 0,
        qualityNotes,
        lines: poLines,
      });
      fetchPOs();
      setIsNewOpen(false);
      setSupplierId("");
      setPrId("");
      setExpectedDate("");
      setCurrency("");
      setPoLines([]);
      setNotice("Draft Purchase Order berhasil dibuat.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat purchase order.");
    }
  };

  // Send for approval (Draft -> Pending Approval)
  const handleSendForApproval = async (po: PurchaseOrderItem) => {
    const ok = await confirm({
      title: "Kirim untuk Approval",
      message: `Kirim Purchase Order "${po.orderNo}" untuk diajukan ke atasan sesuai hirarki approval?`,
      confirmText: "Kirim Sekarang",
      cancelText: "Batal",
      variant: "default",
    });
    if (!ok) return;

    try {
      await procurementApi.submitPurchaseOrder(po.id);
      fetchPOs();
      fetchApprovals();
      if (selectedPo && selectedPo.id === po.id) {
        setSelectedPo((prev) => (prev ? { ...prev, status: "pending_approval" } : null));
      }
      setNotice(`Purchase Order "${po.orderNo}" berhasil diajukan untuk approval atasan.`);
    } catch (err) {
      await alert({
        title: "Gagal Mengirim PO",
        message: err instanceof Error ? err.message : "Gagal mengirim Purchase Order.",
        variant: "destructive",
      });
    }
  };

  // Open Edit Dialog (Draft only)
  const handleOpenEdit = (po: PurchaseOrderItem) => {
    setEditingPo(po);
    setEditSupplierId(po.supplierId || "");
    setEditExpectedDate(po.expectedDate || "");
    setEditFreightScheme(po.freightScheme || "franco");
    setEditFreightCost(String(po.freightCost || 0));
    setEditQualityNotes(po.qualityNotes || "");
    setEditLines(
      (po.lines || []).map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      }))
    );
    setEditLineProductId("");
    setEditLineQty("1");
    setEditError(null);
  };

  const handleEditAddLine = async () => {
    if (!editLineProductId) return;
    const qty = Number(editLineQty) || 1;
    const product = products.find((p) => p.id === editLineProductId);
    const price = product?.costPrice || 0;
    setEditLines((prev) => {
      const existing = prev.find((l) => l.productId === editLineProductId);
      if (existing) {
        return prev.map((l) => (l.productId === editLineProductId ? { ...l, quantity: l.quantity + qty } : l));
      }
      return [...prev, { productId: editLineProductId, quantity: qty, unitPrice: price }];
    });
    setEditLineProductId("");
    setEditLineQty("1");
  };

  const handleEditRemoveLine = (productId: string) => {
    setEditLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const handleEditLinePriceChange = (productId: string, unitPrice: number) => {
    setEditLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, unitPrice } : l)));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPo) return;
    if (editLines.length === 0) {
      setEditError("Tambahkan minimal 1 item barang.");
      return;
    }
    if (editLines.some((l) => l.unitPrice <= 0)) {
      setEditError("Setiap item harus punya harga satuan lebih dari 0.");
      return;
    }
    setIsEditSubmitting(true);
    setEditError(null);
    try {
      const supp = suppliers.find((s) => s.id === editSupplierId);
      await procurementApi.updatePurchaseOrder(editingPo.id, {
        supplierId: editSupplierId,
        supplierName: supp?.name || editingPo.supplierName,
        expectedDate: editExpectedDate,
        freightScheme: editFreightScheme,
        freightCost: Number(editFreightCost) || 0,
        qualityNotes: editQualityNotes,
        lines: editLines,
      });
      fetchPOs();
      setEditingPo(null);
      setNotice(`Purchase Order "${editingPo.orderNo}" berhasil diperbarui.`);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal menyimpan perubahan PO.");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleApprove = async (po: PurchaseOrderItem) => {
    const ok = await confirm({
      title: "Setujui Purchase Order",
      message: `Setujui Purchase Order "${po.orderNo}"?`,
      confirmText: "Setujui",
      variant: "default",
    });
    if (!ok) return;

    setActingId(po.id);
    try {
      await procurementApi.approvePurchaseOrder(po.id);
      fetchPOs();
      fetchApprovals();
      if (selectedPo && selectedPo.id === po.id) {
        setSelectedPo((prev) => (prev ? { ...prev, status: "approved" } : null));
      }
      setNotice(`Purchase Order "${po.orderNo}" berhasil disetujui.`);
    } catch (err) {
      await alert({
        title: "Gagal Menyetujui PO",
        message: err instanceof Error ? err.message : "Gagal menyetujui PO.",
        variant: "destructive",
      });
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (po: PurchaseOrderItem) => {
    const comments = await prompt({
      title: "Tolak Purchase Order",
      message: `Masukkan alasan penolakan Purchase Order "${po.orderNo}":`,
      placeholder: "Tuliskan alasan penolakan (opsional)...",
      confirmText: "Tolak PO",
      cancelText: "Batal",
      variant: "destructive",
      inputType: "textarea",
    });
    if (comments === null) return;

    setActingId(po.id);
    try {
      await procurementApi.rejectPurchaseOrder(po.id, comments.trim());
      fetchPOs();
      fetchApprovals();
      if (selectedPo && selectedPo.id === po.id) {
        setSelectedPo((prev) => (prev ? { ...prev, status: "rejected" } : null));
      }
      setNotice(`Purchase Order "${po.orderNo}" telah ditolak.`);
    } catch (err) {
      await alert({
        title: "Gagal Menolak PO",
        message: err instanceof Error ? err.message : "Gagal menolak PO.",
        variant: "destructive",
      });
    } finally {
      setActingId(null);
    }
  };

  const columns: Column<PurchaseOrderItem>[] = [
    {
      key: "orderNo",
      header: "PO Number",
      sortable: true,
      render: (po) => (
        <button
          type="button"
          onClick={() => setSelectedPo(po)}
          className="font-mono text-xs font-bold text-brand-primary hover:underline cursor-pointer text-left"
        >
          {po.orderNo}
        </button>
      ),
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
        if (!canViewPrices("procurement")) {
          return <span className="text-xs font-mono text-muted-foreground italic">*** (Rahasia)</span>;
        }
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
      align: "right",
      render: (po) => {
        const isDraft = (po.status || "").toLowerCase() === "draft";
        const isPending = (po.status || "").toLowerCase() === "pending_approval";
        const canAct =
          isPending &&
          mayApprove &&
          !isOwn(po.createdByEmail) &&
          canUserApprove(
            currentUser?.role,
            currentUser?.email,
            po.createdByEmail,
            activeApprovals[po.id],
            po.status
          );

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Detail Button - Always Available */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-brand-primary"
              title="Lihat Detail & Timeline"
              onClick={() => setSelectedPo(po)}
            >
              <Eye className="h-4 w-4" />
            </Button>

            {/* Draft Actions: Edit & Kirim untuk Approval */}
            {isDraft && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Edit Draft PO"
                  onClick={() => handleOpenEdit(po)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[11px] font-semibold text-brand-primary border-brand-primary/30 hover:bg-brand-tint"
                  title="Kirim untuk Approval Atasan"
                  onClick={() => handleSendForApproval(po)}
                >
                  <Send className="h-3 w-3" /> Kirim
                </Button>
              </>
            )}

            {/* Approval Actions: Only when Pending and user is authorized */}
            {canAct && (
              <>
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
              </>
            )}
          </div>
        );
      },
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
      {notice && (
        <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-950">×</button>
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
          onRowClick={(item) => setSelectedPo(item)}
        />
      )}

      {/* Create PO Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Purchase Order (Draft)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePO} className="min-w-0 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Vendor / Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
              >
                <option value="">Pilih vendor...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Sumber Purchase Request (Opsional)</label>
              <select
                value={prId}
                onChange={(e) => handleSelectPR(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
              >
                <option value="">Pilih PR (hanya yang sudah disetujui)...</option>
                {approvedPRs.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.requestNo} — {pr.department} ({pr.lines?.length || 0} items)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Expected Delivery</label>
                <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Mata Uang</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
                >
                  <option value="">IDR (Rupiah)</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Skema Ongkir</label>
                <select
                  value={freightScheme}
                  onChange={(e) => setFreightScheme(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
                >
                  <option value="franco">Franco (Ongkir Ditanggung Vendor)</option>
                  <option value="loco">Loco (Ongkir Ditanggung Pembeli)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Biaya Ongkir (Rp)</label>
                <Input
                  type="number"
                  min={0}
                  value={freightCost}
                  disabled={freightScheme === "franco"}
                  onChange={(e) => setFreightCost(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Syarat Mutu / Standar Kualitas</label>
              <Input value={qualityNotes} onChange={(e) => setQualityNotes(e.target.value)} placeholder="Standar mutu..." />
            </div>

            {/* Line items */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Item Pesanan</label>
              <div className="rounded-lg border border-border bg-slate-50/60 p-3 space-y-3">
                {poLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Belum ada item. Pilih produk di bawah atau pilih PR di atas.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border bg-white overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="py-1.5 px-3 text-left font-medium">Produk</th>
                          <th className="py-1.5 px-3 text-center font-medium">Qty</th>
                          <th className="py-1.5 px-3 text-right font-medium">Harga Satuan</th>
                          <th className="py-1.5 px-3 text-right font-medium">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {poLines.map((l) => {
                          const product = products.find((p) => p.id === l.productId);
                          return (
                            <tr key={l.productId}>
                              <td className="py-2 px-3">
                                <div className="font-medium text-foreground">{product?.name || l.productId}</div>
                                {product?.sku && <div className="text-[10px] text-muted-foreground font-mono">{product.sku}</div>}
                              </td>
                              <td className="py-2 px-3 text-center font-semibold">{l.quantity}x</td>
                              <td className="py-2 px-3 text-right">
                                <Input
                                  type="number"
                                  min={1}
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
                Simpan Sebagai Draft
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit PO Dialog (Draft only) */}
      <Dialog open={!!editingPo} onOpenChange={(open) => !open && setEditingPo(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order ({editingPo?.orderNo})</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="min-w-0 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Vendor / Supplier</label>
              <select
                value={editSupplierId}
                onChange={(e) => setEditSupplierId(e.target.value)}
                required
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Expected Delivery</label>
                <Input type="date" value={editExpectedDate} onChange={(e) => setEditExpectedDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Skema Ongkir</label>
                <select
                  value={editFreightScheme}
                  onChange={(e) => setEditFreightScheme(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
                >
                  <option value="franco">Franco (Ditanggung Vendor)</option>
                  <option value="loco">Loco (Ditanggung Pembeli)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Biaya Ongkir (Rp)</label>
                <Input
                  type="number"
                  min={0}
                  value={editFreightCost}
                  disabled={editFreightScheme === "franco"}
                  onChange={(e) => setEditFreightCost(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Syarat Mutu</label>
                <Input value={editQualityNotes} onChange={(e) => setEditQualityNotes(e.target.value)} />
              </div>
            </div>

            {/* Line items in Edit */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Item Pesanan</label>
              <div className="rounded-lg border border-border bg-slate-50/60 p-3 space-y-3">
                {editLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Belum ada item.</p>
                ) : (
                  <div className="rounded-lg border border-border bg-white overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="py-1.5 px-3 text-left font-medium">Produk</th>
                          <th className="py-1.5 px-3 text-center font-medium">Qty</th>
                          <th className="py-1.5 px-3 text-right font-medium">Harga Satuan</th>
                          <th className="py-1.5 px-3 text-right font-medium">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {editLines.map((l) => {
                          const product = products.find((p) => p.id === l.productId);
                          return (
                            <tr key={l.productId}>
                              <td className="py-2 px-3">
                                <div className="font-medium text-foreground">{product?.name || l.productId}</div>
                                {product?.sku && <div className="text-[10px] text-muted-foreground font-mono">{product.sku}</div>}
                              </td>
                              <td className="py-2 px-3 text-center font-semibold">{l.quantity}x</td>
                              <td className="py-2 px-3 text-right">
                                <Input
                                  type="number"
                                  min={1}
                                  value={l.unitPrice}
                                  onChange={(e) => handleEditLinePriceChange(l.productId, Number(e.target.value))}
                                  className="h-7 w-24 text-xs text-right"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleEditRemoveLine(l.productId)}
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
                  </div>
                )}

                <div className="flex gap-1.5">
                  <select
                    value={editLineProductId}
                    onChange={(e) => setEditLineProductId(e.target.value)}
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
                    value={editLineQty}
                    onChange={(e) => setEditLineQty(e.target.value)}
                    className="w-16 shrink-0 bg-white"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleEditAddLine} className="h-10 text-xs shrink-0 bg-white">
                    Tambah
                  </Button>
                </div>
              </div>
            </div>

            {editError && <p className="text-xs text-rose-600 font-semibold">{editError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingPo(null)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" disabled={isEditSubmitting} className="text-xs font-semibold">
                {isEditSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog with Full Information & Approval Timeline */}
      <Dialog open={!!selectedPo} onOpenChange={(open) => !open && setSelectedPo(null)}>
        {selectedPo && (
          <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 space-y-4">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <span>{selectedPo.orderNo}</span>
                    <StatusBadge status={selectedPo.status} />
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground pt-0.5">
                    Tanggal Order: {selectedPo.orderDate} • Dibuat oleh: {selectedPo.createdByEmail || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">Total Komitmen</span>
                  <MoneyDisplay amount={selectedPo.totalAmount} currency={selectedPo.currency} highlight className="text-base font-bold" />
                </div>
              </div>
            </DialogHeader>

            {/* General Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-border">
              <div>
                <span className="text-muted-foreground text-[11px] block">Vendor</span>
                <span className="font-semibold text-foreground">{selectedPo.supplierName}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Estimasi Pengiriman</span>
                <span className="font-semibold text-foreground">{selectedPo.expectedDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Skema Ongkir</span>
                <span className="font-semibold capitalize text-foreground">{selectedPo.freightScheme || "Franco"}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Status Dokumen</span>
                <span className="font-semibold capitalize text-foreground">{selectedPo.status}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-foreground">Rincian Item Pesanan Pembelian</h4>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-3 text-left font-semibold">Nama Produk</th>
                      <th className="py-2 px-3 text-center font-semibold">Qty</th>
                      <th className="py-2 px-3 text-right font-semibold">Harga Satuan</th>
                      <th className="py-2 px-3 text-right font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedPo.lines && selectedPo.lines.length > 0 ? (
                      selectedPo.lines.map((l, idx) => {
                        const product = products.find((p) => p.id === l.productId);
                        return (
                          <tr key={idx}>
                            <td className="py-2 px-3">
                              <span className="font-medium text-foreground">{product?.name || l.productId}</span>
                              {product?.sku && (
                                <span className="block text-[10px] text-muted-foreground font-mono">{product.sku}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-semibold">{l.quantity}x</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">
                              <MoneyDisplay amount={l.unitPrice} />
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-foreground">
                              <MoneyDisplay amount={l.subtotal || l.quantity * l.unitPrice} />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-3 text-center text-muted-foreground">
                          Rincian item tidak tersedia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interactive Timeline & Hierarchy Status */}
            <ApprovalTimeline
              documentType="purchase_order"
              documentId={selectedPo.id}
              creatorName={selectedPo.createdByEmail}
              createdAt={selectedPo.orderDate}
              currentStatus={selectedPo.status}
            />

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedPo(null)}>
                Tutup
              </Button>

              <div className="flex items-center gap-2">
                {/* Draft Actions */}
                {(selectedPo.status || "").toLowerCase() === "draft" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs font-semibold"
                      onClick={() => {
                        const toEdit = selectedPo;
                        setSelectedPo(null);
                        handleOpenEdit(toEdit);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit Draft
                    </Button>
                    <Button
                      variant="gradient"
                      size="sm"
                      className="gap-1.5 text-xs font-semibold"
                      onClick={() => handleSendForApproval(selectedPo)}
                    >
                      <Send className="h-3.5 w-3.5" /> Kirim untuk Approval
                    </Button>
                  </>
                )}

                {/* Approval Actions in Detail */}
                {(selectedPo.status || "").toLowerCase() === "pending_approval" &&
                  mayApprove &&
                  !isOwn(selectedPo.createdByEmail) &&
                  canUserApprove(
                    currentUser?.role,
                    currentUser?.email,
                    selectedPo.createdByEmail,
                    activeApprovals[selectedPo.id],
                    selectedPo.status
                  ) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actingId === selectedPo.id}
                        className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                        onClick={() => handleReject(selectedPo)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Tolak
                      </Button>
                      <Button
                        variant="gradient"
                        size="sm"
                        disabled={actingId === selectedPo.id}
                        className="text-xs font-bold"
                        onClick={() => handleApprove(selectedPo)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Setujui
                      </Button>
                    </>
                  )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
