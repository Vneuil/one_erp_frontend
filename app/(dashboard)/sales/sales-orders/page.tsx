"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import {
  Plus,
  Download,
  Upload,
  Paperclip,
  Loader2,
  ExternalLink,
  FileSpreadsheet,
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
  Eye,
  Edit,
  Send,
  CreditCard,
  FileCheck,
  AlertCircle,
  AlertTriangle,
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
  customerPoNumber?: string;
  customerPoAttachment?: string;
  dpPaid?: boolean;
  dpPercent?: number;
  dpAmount?: number;
  invoiceDocType?: string;
  invoiceDocAttachment?: string;
  invoiceDocNumber?: string;
  shippingAddress?: string;
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
import { useConfirm, useAlert, usePrompt } from "@/components/shared/confirm-modal";
import { useAppStore } from "@/stores/app-store";
import { approvalApi, ApprovalRequest } from "@/lib/api/approval";
import { ApprovalTimeline, canUserApprove } from "@/components/shared/approval-timeline";

export default function SalesOrdersPage() {
  const { canApprove, canViewPrices } = useNavigationAccess();
  const mayApprove = canApprove("sales");
  const isOwn = useIsOwnDocument();
  const currentUser = useAppStore((s) => s.currentUser);
  const confirm = useConfirm();
  const alert = useAlert();
  const prompt = usePrompt();
  const [orders, setOrders] = React.useState<SalesOrder[]>([]);
  const [activeApprovals, setActiveApprovals] = React.useState<Record<string, ApprovalRequest>>({});
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = React.useState<string>("all");
  const [selectedOrder, setSelectedOrder] = React.useState<SalesOrder | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newCustomerId, setNewCustomerId] = React.useState("");
  const [customerPoNumber, setCustomerPoNumber] = React.useState("");
  const [customerPoAttachment, setCustomerPoAttachment] = React.useState("");
  const [isUploadingPoDoc, setIsUploadingPoDoc] = React.useState(false);
  const [uploadedPoFileName, setUploadedPoFileName] = React.useState<string | null>(null);
  const [uploadedPoFileSize, setUploadedPoFileSize] = React.useState<number | null>(null);
  const poFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDownloadingPoDoc, setIsDownloadingPoDoc] = React.useState(false);
  const [dpPaid, setDpPaid] = React.useState(false);
  const [dpPercent, setDpPercent] = React.useState<number>(30);
  const [dpAmount, setDpAmount] = React.useState("0");
  const [invoiceDocType, setInvoiceDocType] = React.useState<"CI" | "PI">("CI");
  const [invoiceDocNumber, setInvoiceDocNumber] = React.useState("");
  const [invoiceDocAttachment, setInvoiceDocAttachment] = React.useState("");
  const [isUploadingInvoiceDoc, setIsUploadingInvoiceDoc] = React.useState(false);
  const [uploadedInvoiceDocFileName, setUploadedInvoiceDocFileName] = React.useState<string | null>(null);
  const [uploadedInvoiceDocFileSize, setUploadedInvoiceDocFileSize] = React.useState<number | null>(null);
  const invoiceDocFileInputRef = React.useRef<HTMLInputElement>(null);

  // Post-approval CI / PI Upload states (when SO was approved without DP)
  const [isPostApprovalUploadOpen, setIsPostApprovalUploadOpen] = React.useState(false);
  const [postApprovalOrder, setPostApprovalOrder] = React.useState<SalesOrder | null>(null);
  const [postDocType, setPostDocType] = React.useState<"CI" | "PI">("CI");
  const [postDocNumber, setPostDocNumber] = React.useState("");
  const [postDocAttachment, setPostDocAttachment] = React.useState("");
  const [postDocFileName, setPostDocFileName] = React.useState<string | null>(null);
  const [postDocFileSize, setPostDocFileSize] = React.useState<number | null>(null);
  const [isUploadingPostDoc, setIsUploadingPostDoc] = React.useState(false);
  const [isSubmittingPostDoc, setIsSubmittingPostDoc] = React.useState(false);
  const postDocFileInputRef = React.useRef<HTMLInputElement>(null);
  const [shippingAddress, setShippingAddress] = React.useState("");
  const [shippingCourier, setShippingCourier] = React.useState("");
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
  const warehouseProducts = products.map((product) => {
    const stock = warehouseStock?.warehouseId === newWarehouseId
      ? warehouseStock.items.find((item) => item.productId === product.id && item.warehouseId === newWarehouseId)
      : undefined;
    return { ...product, stock: stock ? stock.available : 0 };
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

  const handleAddLine = async () => {
    if (!lineProductId) return;
    const product = warehouseProducts.find((p) => p.id === lineProductId);
    if (!product || stockLoading) return;
    const qty = Number(lineQty);
    if (!Number.isInteger(qty) || qty < 1) {
      await alert({
        title: "Jumlah Tidak Valid",
        message: "Masukkan jumlah pesanan yang valid (minimal 1).",
        variant: "warning",
      });
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

  const handlePoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      await alert({
        title: "Ukuran File Terlalu Besar",
        message: "Maksimal ukuran dokumen adalah 10 MB.",
        variant: "destructive",
      });
      if (poFileInputRef.current) poFileInputRef.current.value = "";
      return;
    }

    setIsUploadingPoDoc(true);
    try {
      const res = await salesApi.uploadAttachment(file);
      if (res.data) {
        setCustomerPoAttachment(res.data.key);
        setUploadedPoFileName(res.data.filename);
        setUploadedPoFileSize(res.data.size);
      }
    } catch (err) {
      await alert({
        title: "Gagal Mengunggah Dokumen",
        message: err instanceof Error ? err.message : "Gagal mengunggah dokumen ke Cloudflare R2.",
        variant: "destructive",
      });
      if (poFileInputRef.current) poFileInputRef.current.value = "";
    } finally {
      setIsUploadingPoDoc(false);
    }
  };

  const handleRemovePoFile = () => {
    setCustomerPoAttachment("");
    setUploadedPoFileName(null);
    setUploadedPoFileSize(null);
    if (poFileInputRef.current) poFileInputRef.current.value = "";
  };

  const handleDownloadAttachment = async (order: SalesOrder) => {
    if (!order.customerPoAttachment) return;

    // Backward compatibility jika berupa tautan eksternal
    if (order.customerPoAttachment.startsWith("http://") || order.customerPoAttachment.startsWith("https://")) {
      window.open(order.customerPoAttachment, "_blank", "noopener,noreferrer");
      return;
    }

    setIsDownloadingPoDoc(true);
    try {
      const res = await salesApi.downloadAttachment(order.id);
      if ("blob" in res) {
        const url = URL.createObjectURL(res.blob);
        const link = document.createElement("a");
        link.href = url;
        const keyParts = order.customerPoAttachment.split("/");
        const defaultName = keyParts[keyParts.length - 1] || `${order.orderNumber}-PO-Document`;
        link.download = res.filename || defaultName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await alert({
          title: "Gagal Mengunduh Dokumen",
          message: "Tidak dapat mengunduh dokumen dari storage.",
          variant: "destructive",
        });
      }
    } catch (err) {
      await alert({
        title: "Gagal Mengunduh Dokumen",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh dokumen dari Cloudflare R2.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPoDoc(false);
    }
  };

  const handleInvoiceDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      await alert({
        title: "Ukuran File Terlalu Besar",
        message: "Maksimal ukuran dokumen adalah 10 MB.",
        variant: "destructive",
      });
      if (invoiceDocFileInputRef.current) invoiceDocFileInputRef.current.value = "";
      return;
    }

    setIsUploadingInvoiceDoc(true);
    try {
      const res = await salesApi.uploadAttachment(file);
      if (res.data) {
        setInvoiceDocAttachment(res.data.key);
        setUploadedInvoiceDocFileName(res.data.filename);
        setUploadedInvoiceDocFileSize(res.data.size);
      }
    } catch (err) {
      await alert({
        title: "Gagal Mengunggah Dokumen",
        message: err instanceof Error ? err.message : "Gagal mengunggah dokumen ke Cloudflare R2.",
        variant: "destructive",
      });
      if (invoiceDocFileInputRef.current) invoiceDocFileInputRef.current.value = "";
    } finally {
      setIsUploadingInvoiceDoc(false);
    }
  };

  const handleRemoveInvoiceDoc = () => {
    setInvoiceDocAttachment("");
    setUploadedInvoiceDocFileName(null);
    setUploadedInvoiceDocFileSize(null);
    if (invoiceDocFileInputRef.current) invoiceDocFileInputRef.current.value = "";
  };

  const handleDownloadInvoiceAttachment = async (order: SalesOrder) => {
    if (!order.invoiceDocAttachment) return;

    if (order.invoiceDocAttachment.startsWith("http://") || order.invoiceDocAttachment.startsWith("https://")) {
      window.open(order.invoiceDocAttachment, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const res = await salesApi.downloadAttachmentByKey(order.invoiceDocAttachment);
      if ("blob" in res) {
        const url = URL.createObjectURL(res.blob);
        const link = document.createElement("a");
        link.href = url;
        const keyParts = order.invoiceDocAttachment.split("/");
        const defaultName = keyParts[keyParts.length - 1] || `${order.orderNumber}-${order.invoiceDocType || "Invoice"}-Document`;
        link.download = res.filename || defaultName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await alert({
          title: "Gagal Mengunduh Dokumen",
          message: "Tidak dapat mengunduh dokumen dari storage.",
          variant: "destructive",
        });
      }
    } catch (err) {
      await alert({
        title: "Gagal Mengunduh Dokumen",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh dokumen dari Cloudflare R2.",
        variant: "destructive",
      });
    }
  };

  const openPostApprovalUpload = (order: SalesOrder) => {
    setPostApprovalOrder(order);
    setPostDocType((order.invoiceDocType as "CI" | "PI") || "CI");
    setPostDocNumber(order.invoiceDocNumber || "");
    setPostDocAttachment(order.invoiceDocAttachment || "");
    setPostDocFileName(order.invoiceDocAttachment ? order.invoiceDocAttachment.split("/").pop() || null : null);
    setPostDocFileSize(null);
    if (postDocFileInputRef.current) postDocFileInputRef.current.value = "";
    setIsPostApprovalUploadOpen(true);
  };

  const handlePostDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      await alert({
        title: "Ukuran File Terlalu Besar",
        message: "Maksimal ukuran dokumen adalah 10 MB.",
        variant: "destructive",
      });
      if (postDocFileInputRef.current) postDocFileInputRef.current.value = "";
      return;
    }

    setIsUploadingPostDoc(true);
    try {
      const res = await salesApi.uploadAttachment(file);
      if (res.data) {
        setPostDocAttachment(res.data.key);
        setPostDocFileName(res.data.filename);
        setPostDocFileSize(res.data.size);
      }
    } catch (err) {
      await alert({
        title: "Gagal Mengunggah Dokumen",
        message: err instanceof Error ? err.message : "Gagal mengunggah dokumen ke Cloudflare R2.",
        variant: "destructive",
      });
      if (postDocFileInputRef.current) postDocFileInputRef.current.value = "";
    } finally {
      setIsUploadingPostDoc(false);
    }
  };

  const handleRemovePostDoc = () => {
    setPostDocAttachment("");
    setPostDocFileName(null);
    setPostDocFileSize(null);
    if (postDocFileInputRef.current) postDocFileInputRef.current.value = "";
  };

  const handleSavePostApprovalDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postApprovalOrder) return;
    if (!postDocAttachment) {
      await alert({
        title: "Dokumen Wajib Diunggah",
        message: "Silakan pilih dan unggah dokumen Commercial Invoice (CI) atau Proforma Invoice (PI) terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingPostDoc(true);
    try {
      await salesApi.attachInvoiceDocument(postApprovalOrder.id, {
        invoiceDocType: postDocType,
        invoiceDocNumber: postDocNumber || undefined,
        invoiceDocAttachment: postDocAttachment,
      });
      await alert({
        title: "Dokumen Berhasil Dilampirkan",
        message: `Dokumen ${postDocType} berhasil disimpan. Sales Order ${postApprovalOrder.orderNumber} sekarang memenuhi syarat dan dapat digunakan untuk pengadaan barang di PR.`,
      });
      setIsPostApprovalUploadOpen(false);
      setPostApprovalOrder(null);
      setCustomerReload((prev) => prev + 1);

      if (selectedOrder && selectedOrder.id === postApprovalOrder.id) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                invoiceDocType: postDocType,
                invoiceDocNumber: postDocNumber,
                invoiceDocAttachment: postDocAttachment,
              }
            : null
        );
      }
    } catch (err) {
      await alert({
        title: "Gagal Menyimpan Dokumen",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan dokumen.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPostDoc(false);
    }
  };

  const isEligibleForPR = (so: SalesOrder): boolean => {
    const isApproved = so.status === "confirmed" || so.status === "approved";
    const hasInvoiceDoc = Boolean(so.invoiceDocAttachment || so.customerPoAttachment);
    return isApproved && hasInvoiceDoc;
  };

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [previewFileType, setPreviewFileType] = React.useState<"image" | "pdf" | "other" | null>(null);

  React.useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    if (!selectedOrder?.customerPoAttachment) {
      setPreviewUrl(null);
      setPreviewFileType(null);
      setPreviewError(null);
      return;
    }

    const att = selectedOrder.customerPoAttachment;
    const cleanPath = att.split("?")[0];
    const ext = cleanPath.split(".").pop()?.toLowerCase() || "";
    const isImg = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
    const isPdf = ext === "pdf";
    const fileType = isImg ? "image" : isPdf ? "pdf" : "other";
    setPreviewFileType(fileType);

    // If external full URL and not a storage key
    if (att.startsWith("http://") || att.startsWith("https://")) {
      setPreviewUrl(att);
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    salesApi
      .downloadAttachment(selectedOrder.id)
      .then((res) => {
        if (cancelled) return;
        if ("blob" in res) {
          objectUrl = URL.createObjectURL(res.blob);
          setPreviewUrl(objectUrl);
        } else {
          setPreviewError("Gagal memuat dokumen dari storage");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : "Gagal memuat dokumen");
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedOrder?.id, selectedOrder?.customerPoAttachment]);

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
            deliveryDate: o.deliveryDate || "2026-09-05",
            shippingCourier: o.shippingCourier,
            shippingAddress: o.shippingAddress,
            customerPoNumber: o.customerPoNumber,
            customerPoAttachment: o.customerPoAttachment,
            dpPaid: o.dpPaid,
            dpPercent: o.dpPercent,
            dpAmount: o.dpAmount,
            invoiceDocType: o.invoiceDocType,
            invoiceDocAttachment: o.invoiceDocAttachment,
            invoiceDocNumber: o.invoiceDocNumber,
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

  const fetchApprovals = React.useCallback(() => {
    approvalApi
      .listRequests({ documentType: "sales_order", perPage: 100 })
      .then((res) => {
        const map: Record<string, ApprovalRequest> = {};
        (res.data || []).forEach((r) => {
          if (r.documentId && (!map[r.documentId] || r.status === "pending")) {
            map[r.documentId] = r;
          }
        });
        setActiveApprovals(map);
      })
      .catch((err) => console.warn("Failed to load approval requests for SOs", err));
  }, []);

  React.useEffect(() => {
    fetchOrders();
    fetchApprovals();
  }, [fetchOrders, fetchApprovals]);

  const handleSendForApproval = async (so: SalesOrder) => {
    const ok = await confirm({
      title: "Kirim untuk Approval",
      message: `Kirim Sales Order "${so.orderNumber}" untuk diajukan ke atasan sesuai hirarki approval?`,
      confirmText: "Kirim Sekarang",
      cancelText: "Batal",
      variant: "default",
    });
    if (!ok) return;

    setActingId(so.id);
    try {
      const res = await salesApi.submitOrder(so.id);
      fetchOrders();
      fetchApprovals();
      if (selectedOrder && selectedOrder.id === so.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: res.data?.status || "Confirmed" } : null));
      }
    } catch (err) {
      await alert({
        title: "Gagal Mengirim SO",
        message: err instanceof Error ? err.message : "Gagal mengirim Sales Order.",
        variant: "destructive",
      });
    } finally {
      setActingId(null);
    }
  };

  // Sales Orders routed through an admin-configured approval workflow (see
  // Approval Workflow settings) land in "pending_approval" - approving or
  // rejecting here mirrors Purchase Orders' same flow.
  const handleApproveOrder = async (so: SalesOrder) => {
    const ok = await confirm({
      title: "Setujui Sales Order",
      message: `Setujui Sales Order "${so.orderNumber}"?`,
      confirmText: "Setujui",
      variant: "default",
    });
    if (!ok) return;

    setActingId(so.id);
    try {
      await salesApi.approveOrder(so.id);
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      await alert({
        title: "Gagal Menyetujui SO",
        message: err instanceof Error ? err.message : "Gagal menyetujui Sales Order.",
        variant: "destructive",
      });
    } finally {
      setActingId(null);
    }
  };

  const handleRejectOrder = async (so: SalesOrder) => {
    const comments = await prompt({
      title: "Tolak Sales Order",
      message: `Masukkan alasan penolakan Sales Order "${so.orderNumber}":`,
      placeholder: "Tuliskan alasan penolakan (opsional)...",
      confirmText: "Tolak SO",
      cancelText: "Batal",
      variant: "destructive",
      inputType: "textarea",
    });
    if (comments === null) return;

    setActingId(so.id);
    try {
      await salesApi.rejectOrder(so.id, comments.trim());
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      await alert({
        title: "Gagal Menolak SO",
        message: err instanceof Error ? err.message : "Gagal menolak Sales Order.",
        variant: "destructive",
      });
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
    if (!newWarehouseId) {
      await alert({
        title: "Pilih Gudang",
        message: "Pilih gudang pemenuhan pesanan terlebih dahulu.",
        variant: "warning",
      });
      return;
    }
    if (customersLoading || customersError || !customer || orderLines.length === 0) {
      if (orderLines.length === 0) {
        await alert({
          title: "Item Kosong",
          message: "Tambahkan minimal 1 item barang ke pesanan.",
          variant: "warning",
        });
      }
      return;
    }

    if (dpPaid && !invoiceDocAttachment) {
      await alert({
        title: "Dokumen CI / PI Wajib Diunggah",
        message: "Karena DP sudah dicentang dibayarkan, Anda wajib memilih dan mengunggah dokumen Commercial Invoice (CI) atau Proforma Invoice (PI) sebelum mengajukan pesanan.",
        variant: "destructive",
      });
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

    const calculatedDp = Math.round((newTotalAmount * dpPercent) / 100);
    try {
      const res = await salesApi.createOrder({
        customerName: customer.name,
        totalAmount: newTotalAmount,
        warehouseId: newWarehouseId || undefined,
        customerPoNumber: customerPoNumber || undefined,
        customerPoAttachment: customerPoAttachment || undefined,
        dpPaid,
        dpPercent,
        dpAmount: calculatedDp,
        invoiceDocType: dpPaid ? invoiceDocType : undefined,
        invoiceDocAttachment: dpPaid ? invoiceDocAttachment : undefined,
        invoiceDocNumber: dpPaid ? invoiceDocNumber : undefined,
        shippingAddress: shippingAddress || undefined,
        shippingCourier: shippingCourier || undefined,
        deliveryDate: newDeliveryDate || undefined,
        status: "draft",
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
          deliveryDate: o.deliveryDate || newDeliveryDate || orderDate.slice(0, 10),
          shippingCourier: o.shippingCourier || shippingCourier,
          shippingAddress: o.shippingAddress || shippingAddress,
          totalAmount: o.totalAmount,
          paymentTerms: o.paymentStatus || "Pending",
          status: o.status || "Confirmed",
          customerPoNumber: o.customerPoNumber || customerPoNumber,
          customerPoAttachment: o.customerPoAttachment || customerPoAttachment,
          dpPaid: o.dpPaid ?? dpPaid,
          dpPercent: o.dpPercent ?? dpPercent,
          dpAmount: o.dpAmount ?? calculatedDp,
          invoiceDocType: o.invoiceDocType || (dpPaid ? invoiceDocType : undefined),
          invoiceDocAttachment: o.invoiceDocAttachment || (dpPaid ? invoiceDocAttachment : undefined),
          invoiceDocNumber: o.invoiceDocNumber || (dpPaid ? invoiceDocNumber : undefined),
          editable: true,
          items: itemsForDisplay,
        },
        ...orders,
      ]);
      loadCatalog();
    } catch (err) {
      console.warn("Failed to create sales order via API", err);
      await alert({
        title: "Gagal Membuat Pesanan",
        message: err instanceof Error ? err.message : "Gagal membuat pesanan. Coba lagi.",
        variant: "destructive",
      });
      return;
    }

    setIsCreateOpen(false);
    setNewCustomerId("");
    setCustomerPoNumber("");
    setCustomerPoAttachment("");
    setUploadedPoFileName(null);
    setUploadedPoFileSize(null);
    if (poFileInputRef.current) poFileInputRef.current.value = "";
    setInvoiceDocType("CI");
    setInvoiceDocNumber("");
    setInvoiceDocAttachment("");
    setUploadedInvoiceDocFileName(null);
    setUploadedInvoiceDocFileSize(null);
    if (invoiceDocFileInputRef.current) invoiceDocFileInputRef.current.value = "";
    setDpPaid(false);
    setDpPercent(30);
    setDpAmount("0");
    setShippingAddress("");
    setShippingCourier("");
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
          {so.customerPoNumber && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="inline-block px-1.5 py-0.2 rounded bg-blue-50 text-brand-primary text-[10px] font-mono border border-blue-200">
                PO Pembeli: {so.customerPoNumber}
              </span>
              {so.customerPoAttachment && (
                <button
                  type="button"
                  title="Unduh Lampiran Dokumen"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadAttachment(so);
                  }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-medium border border-emerald-200 transition-colors"
                >
                  <Paperclip className="h-3 w-3" />
                  <span>File</span>
                </button>
              )}
            </div>
          )}
          {!so.customerPoNumber && so.customerPoAttachment && (
            <div className="mt-0.5">
              <button
                type="button"
                title="Unduh Lampiran Dokumen"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadAttachment(so);
                }}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-medium border border-emerald-200 transition-colors"
              >
                <Paperclip className="h-3 w-3" />
                <span>Lampiran PO</span>
              </button>
            </div>
          )}
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
      render: (so) => {
        if (!canViewPrices("sales")) {
          return <span className="text-xs font-mono text-muted-foreground italic">*** (Rahasia)</span>;
        }
        return <MoneyDisplay amount={so.totalAmount} highlight className="text-xs font-bold" />;
      },
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
      header: "Status & DP",
      render: (so) => {
        const pct = so.dpPercent !== undefined ? so.dpPercent : (so.dpPaid ? 50 : 0);
        return (
          <div className="flex flex-col gap-1 items-start">
            <StatusBadge status={so.status} />
            {pct === 0 ? (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-medium border border-slate-300">
                Tanpa DP (0%)
              </span>
            ) : so.dpPaid ? (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-300">
                DP {pct}% Lunas {so.dpAmount ? `(Rp ${Math.round(so.dpAmount).toLocaleString("id-ID")})` : ""}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold border border-amber-300">
                Menunggu DP {pct}% {so.dpAmount ? `(Rp ${Math.round(so.dpAmount).toLocaleString("id-ID")})` : ""}
              </span>
            )}
            {so.invoiceDocAttachment ? (
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[9px] font-bold border border-blue-200 flex items-center gap-1">
                <FileCheck className="h-2.5 w-2.5 text-blue-600" />
                {so.invoiceDocType || "CI/PI"} Terlampir
              </span>
            ) : (so.status === "confirmed" || so.status === "approved") ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-bold border border-amber-300 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                Wajib Upload CI/PI
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "id",
      header: "Aksi",
      align: "right",
      render: (so) => {
        const isDraft = so.status === "draft";
        const isPending = so.status === "pending_approval";
        const canAct =
          isPending &&
          mayApprove &&
          !isOwn(so.createdByEmail) &&
          canUserApprove(
            currentUser?.role,
            currentUser?.email,
            so.createdByEmail,
            activeApprovals[so.id],
            so.status
          );

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-brand-primary"
              title="Lihat Detail & Timeline"
              onClick={() => setSelectedOrder(so)}
            >
              <Eye className="h-4 w-4" />
            </Button>

            {(so.status === "confirmed" || so.status === "approved") && !so.invoiceDocAttachment && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50/70 border-amber-300 hover:bg-amber-100"
                title="Wajib upload dokumen CI/PI sebelum dapat diproses ke PR"
                onClick={() => openPostApprovalUpload(so)}
              >
                <Upload className="h-3 w-3" /> Upload CI/PI
              </Button>
            )}

            {isDraft && so.editable && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Edit Draft SO"
                  onClick={() => handleOpenEditOrder(so)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[11px] font-semibold text-brand-primary border-brand-primary/30 hover:bg-brand-tint"
                  title="Kirim untuk Approval Atasan"
                  onClick={() => handleSendForApproval(so)}
                >
                  <Send className="h-3 w-3" /> Kirim
                </Button>
              </>
            )}

            {canAct && (
              <>
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

        <Card className="border-border shadow-xs hover:border-emerald-300 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-emerald-700 font-medium">B2B Quotations & Direct</p>
              <MoneyDisplay amount={metrics.b2bRev} className="text-lg font-bold text-emerald-950" />
              <p className="text-[11px] text-emerald-600 font-medium">
                {metrics.b2bCount} Commercial Contract Orders
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-brand-indigo flex items-center justify-center">
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

              {/* Additional Document & DP Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3 rounded-xl border border-border bg-slate-50/70">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Customer PO</span>
                  <span className="font-mono font-semibold text-foreground">
                    {selectedOrder.customerPoNumber || "-"}
                  </span>
                  {selectedOrder.customerPoAttachment && (
                    <button
                      type="button"
                      disabled={isDownloadingPoDoc}
                      onClick={() => handleDownloadAttachment(selectedOrder)}
                      className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-brand-primary hover:underline hover:text-brand-primary/80 disabled:opacity-50"
                    >
                      {isDownloadingPoDoc ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      <span>Unduh Dokumen PO</span>
                    </button>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Pengiriman</span>
                  <span className="font-semibold text-foreground">
                    {selectedOrder.shippingCourier || "Standar"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {selectedOrder.shippingAddress || `Kirim: ${selectedOrder.deliveryDate}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Ketentuan DP</span>
                  <span className="font-semibold text-foreground font-mono">
                    {selectedOrder.dpPercent != null ? `${selectedOrder.dpPercent}%` : selectedOrder.dpPaid ? "50%" : "0%"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Rp {(selectedOrder.dpAmount || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Status Uang Muka</span>
                  {selectedOrder.dpPaid ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-block mt-0.5">
                      DP Lunas
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold inline-block mt-0.5">
                      Belum Bayar DP
                    </span>
                  )}
                </div>
              </div>

              {/* CI / PI Invoice Document Box */}
              <div className="rounded-xl border border-border bg-slate-50/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-brand-primary" />
                    Dokumen Faktur (Commercial / Proforma Invoice)
                  </span>
                  {selectedOrder.invoiceDocAttachment ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {selectedOrder.invoiceDocType || "CI/PI"} Terlampir
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Belum Ada Dokumen
                    </span>
                  )}
                </div>

                {selectedOrder.invoiceDocAttachment ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-white text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-brand-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground block truncate text-xs">
                          {selectedOrder.invoiceDocType || "Invoice"}: {selectedOrder.invoiceDocNumber ? `Nomor ${selectedOrder.invoiceDocNumber}` : selectedOrder.invoiceDocAttachment.split("/").pop()}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Tersimpan di Cloudflare R2
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 px-2.5 text-brand-primary border-brand-primary/40 hover:bg-brand-tint"
                      onClick={() => handleDownloadInvoiceAttachment(selectedOrder)}
                    >
                      <Download className="h-3 w-3" /> Unduh Dokumen
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-[11px] text-amber-900">
                        Dokumen CI/PI wajib diunggah sebelum Sales Order ini dapat digunakan untuk pengadaan barang di PR.
                      </span>
                    </div>
                    {(selectedOrder.status === "confirmed" || selectedOrder.status === "approved") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="gradient"
                        className="h-7 text-[11px] gap-1 px-2.5 shrink-0"
                        onClick={() => openPostApprovalUpload(selectedOrder)}
                      >
                        <Upload className="h-3 w-3" /> Upload CI/PI
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Document Preview Box (When customerPoAttachment exists) */}
              {selectedOrder.customerPoAttachment && (
                <div className="rounded-xl border border-border bg-slate-50/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-brand-primary" />
                      Preview Dokumen Lampiran PO (Cloudflare R2)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {previewUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1 px-2 text-foreground bg-white"
                          onClick={() => window.open(previewUrl, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Buka di Tab Baru
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isDownloadingPoDoc}
                        className="h-7 text-[11px] gap-1 px-2 text-brand-primary border-brand-primary/30 hover:bg-brand-tint bg-white"
                        onClick={() => handleDownloadAttachment(selectedOrder)}
                      >
                        {isDownloadingPoDoc ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Unduh File
                      </Button>
                    </div>
                  </div>

                  {previewLoading && (
                    <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
                      <span className="text-xs font-medium">Memuat preview dokumen dari Cloudflare R2...</span>
                    </div>
                  )}

                  {previewError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                      <span>{previewError}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-rose-800 hover:bg-rose-100"
                        onClick={() => handleDownloadAttachment(selectedOrder)}
                      >
                        Coba Unduh Langsung
                      </Button>
                    </div>
                  )}

                  {!previewLoading && !previewError && previewUrl && (
                    <div className="space-y-2">
                      {previewFileType === "image" && (
                        <div className="flex items-center justify-center bg-slate-900/5 rounded-lg border border-border p-3 overflow-hidden">
                          <img
                            src={previewUrl}
                            alt="Lampiran PO Customer"
                            className="max-h-96 w-auto object-contain rounded-md shadow-sm"
                          />
                        </div>
                      )}

                      {previewFileType === "pdf" && (
                        <div className="w-full rounded-lg border border-border overflow-hidden bg-white shadow-sm">
                          <iframe
                            src={previewUrl}
                            title="Preview Dokumen PO"
                            className="w-full h-[480px] border-0"
                          />
                        </div>
                      )}

                      {previewFileType === "other" && (
                        <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-white text-xs">
                          <div className="flex items-center gap-2.5">
                            <FileSpreadsheet className="h-6 w-6 text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-semibold text-foreground block">
                                {selectedOrder.customerPoAttachment.split("/").pop()}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Format dokumen ini (Excel/Word/Data) dapat dibuka setelah diunduh ke perangkat Anda.
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="gradient"
                            onClick={() => handleDownloadAttachment(selectedOrder)}
                            className="h-7 text-xs shrink-0"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" /> Unduh Dokumen
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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
              {/* Interactive Timeline & Hierarchy Status */}
              <ApprovalTimeline
                documentType="sales_order"
                documentId={selectedOrder.id}
                creatorName={selectedOrder.createdByEmail}
                createdAt={selectedOrder.orderDate}
                currentStatus={selectedOrder.status}
              />

              {readyToShipError && <div role="alert" className="text-xs text-rose-700">{readyToShipError}</div>}
              
              <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                  Tutup
                </Button>

                <div className="flex items-center gap-2">
                  {/* Draft Actions */}
                  {selectedOrder.status === "draft" && selectedOrder.editable && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditOrder(selectedOrder)}
                      >
                        Edit Sales Order
                      </Button>
                      <Button
                        type="button"
                        variant="gradient"
                        size="sm"
                        onClick={() => handleSendForApproval(selectedOrder)}
                      >
                        Kirim untuk Approval
                      </Button>
                    </>
                  )}

                  {/* Approval Actions in Detail */}
                  {selectedOrder.status === "pending_approval" &&
                    mayApprove &&
                    !isOwn(selectedOrder.createdByEmail) &&
                    canUserApprove(
                      currentUser?.role,
                      currentUser?.email,
                      selectedOrder.createdByEmail,
                      activeApprovals[selectedOrder.id],
                      selectedOrder.status
                    ) && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={actingId === selectedOrder.id}
                          className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold"
                          onClick={() => handleRejectOrder(selectedOrder)}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Tolak
                        </Button>
                        <Button
                          type="button"
                          variant="gradient"
                          size="sm"
                          disabled={actingId === selectedOrder.id}
                          className="font-bold"
                          onClick={() => handleApproveOrder(selectedOrder)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Setujui
                        </Button>
                      </>
                    )}

                  {selectedOrder.status !== "draft" && selectedOrder.editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { window.location.href = "/sales/deliveries"; }}
                    >
                      Create Delivery
                    </Button>
                  )}
                  {(selectedOrder.status === "confirmed" || selectedOrder.status === "approved") && !selectedOrder.invoiceDocAttachment && (
                    <Button
                      type="button"
                      variant="gradient"
                      size="sm"
                      className="gap-1 font-semibold"
                      onClick={() => openPostApprovalUpload(selectedOrder)}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Dokumen CI / PI
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!isEligibleForPR(selectedOrder)}
                    title={
                      selectedOrder.status === "pending_approval"
                        ? "Menunggu Approval Manajemen terlebih dahulu"
                        : !selectedOrder.invoiceDocAttachment && !selectedOrder.customerPoAttachment
                        ? "Wajib upload dokumen CI/PI terlebih dahulu"
                        : "Buat PR Pengadaan untuk Sales Order ini"
                    }
                    className={`gap-1 font-semibold ${
                      isEligibleForPR(selectedOrder)
                        ? "border-brand-primary/30 text-brand-primary hover:bg-brand-tint"
                        : "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                    }`}
                    onClick={() => {
                      if (!isEligibleForPR(selectedOrder)) return;
                      window.location.href = `/procurement/purchase-requests?fromSoId=${selectedOrder.id}&fromSoNo=${selectedOrder.orderNumber}`;
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Buat PR Pengadaan
                  </Button>
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
                </div>
              </DialogFooter>
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
                          const stockInfo = warehouseProducts.find((p) => p.id === l.productId);
                          const isLowStock = (stockInfo?.stock ?? 0) < l.quantity;
                          return (
                            <tr key={l.productId}>
                              <td className="py-2 px-3">
                                <div>
                                  <span className="font-medium">{product?.name || l.productId}</span>
                                  {isLowStock && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200">
                                      Perlu Pengadaan (Stok: {stockInfo?.stock ?? 0})
                                    </span>
                                  )}
                                </div>
                              </td>
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
                  disabled={!newWarehouseId || stockLoading}
                  value={lineProductId}
                  onChange={(e) => setLineProductId(e.target.value)}
                  className="col-span-2 flex h-10 w-full flex-1 min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
                >
                  <option value="">{stockLoading ? "Memuat produk gudang..." : !newWarehouseId ? "Pilih gudang terlebih dahulu" : "Pilih produk..."}</option>
                  {warehouseProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok: {p.stock}{p.stock === 0 ? " — Pengadaan PR/PO" : ""})
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={1}
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                  className="w-16 shrink-0"
                />
                <Button type="button" variant="outline" size="sm" disabled={!lineProductId || stockLoading} onClick={handleAddLine} className="h-10 text-xs shrink-0">
                  Tambah
                </Button>
              </div>
              {stockError ? (
                <p role="alert" className="text-xs text-amber-600">Info stok gudang tidak dapat dimuat, Anda tetap dapat menambahkan produk untuk kebutuhan pengadaan.</p>
              ) : !stockLoading && newWarehouseId && warehouseProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada produk di master data.</p>
              ) : null}
            </div>

            {/* Customer Document / PO Info */}
            <div className="p-3 rounded-xl border border-border bg-slate-50/70 space-y-2.5">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-brand-primary" />
                Dokumen & Referensi PO Pembeli
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Nomor PO Pembeli (Customer PO)</label>
                  <Input
                    placeholder="Contoh: PO-CUST-2026/09/01"
                    value={customerPoNumber}
                    onChange={(e) => setCustomerPoNumber(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                    <span>Dokumen Lampiran PO (Cloudflare R2)</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Maks 10 MB</span>
                  </label>
                  <input
                    ref={poFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={handlePoFileUpload}
                    disabled={isUploadingPoDoc}
                  />
                  {customerPoAttachment ? (
                    <div className="flex items-center justify-between p-2 rounded-lg border border-emerald-200 bg-emerald-50/60 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0 truncate">
                          <span className="font-semibold text-emerald-950 block truncate text-[11px]">
                            {uploadedPoFileName || customerPoAttachment.split("/").pop()}
                          </span>
                          {uploadedPoFileSize != null && (
                            <span className="text-[10px] text-emerald-700 block">
                              {(uploadedPoFileSize / 1024).toFixed(1)} KB &bull; Tersimpan di Cloudflare R2
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePoFile}
                        className="h-6 px-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100/50 text-[11px] shrink-0"
                      >
                        <X className="h-3.5 w-3.5 mr-0.5" /> Hapus
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !isUploadingPoDoc && poFileInputRef.current?.click()}
                      className={`flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed cursor-pointer transition-colors text-xs ${
                        isUploadingPoDoc
                          ? "border-brand-primary bg-brand-tint/20 text-brand-primary cursor-wait"
                          : "border-border hover:border-brand-primary hover:bg-white bg-slate-50 text-muted-foreground"
                      }`}
                    >
                      {isUploadingPoDoc ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" />
                          <span className="text-[11px] font-medium text-brand-primary">Mengunggah ke Cloudflare R2...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[11px] font-medium text-muted-foreground">Pilih file dokumen PO (PDF, Word, Excel, Gambar)</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="p-3 rounded-xl border border-border bg-slate-50/70 space-y-2.5">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-brand-primary" />
                Informasi Pengiriman (Shipping)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Tanggal Pengiriman</label>
                  <Input
                    type="date"
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Kurir / Ekspedisi / Armada</label>
                  <Input
                    placeholder="Contoh: Truk Pabrik / JNE / Ambil Sendiri"
                    value={shippingCourier}
                    onChange={(e) => setShippingCourier(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Alamat Pengiriman</label>
                <Input
                  placeholder="Alamat lengkap penerima atau instruksi pengiriman"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            {/* Down Payment (DP) Slider 0-100% */}
            <div className="p-3 rounded-xl border border-border bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-brand-primary" />
                  Skema Down Payment (DP)
                </h4>
                <span className="text-xs font-bold font-mono text-brand-primary bg-white px-2 py-0.5 rounded border border-border">
                  {dpPercent}% (Rp {Math.round((newTotalAmount * dpPercent) / 100).toLocaleString("id-ID")})
                </span>
              </div>
              
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                  <span>0% (Net / COD)</span>
                  <span>Slider DP: {dpPercent}%</span>
                  <span>100% (Lunas Penuh)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={dpPercent}
                  onChange={(e) => setDpPercent(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  {[0, 20, 30, 50, 70, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDpPercent(preset)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        dpPercent === preset
                          ? "bg-brand-primary text-white font-bold"
                          : "bg-white border border-border text-foreground hover:bg-slate-100"
                      }`}
                    >
                      {preset === 0 ? "0% (COD)" : preset === 100 ? "100% (Lunas)" : `${preset}%`}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dpPaid}
                  onChange={(e) => setDpPaid(e.target.checked)}
                  className="h-3.5 w-3.5 accent-brand-primary rounded"
                />
                <span className="text-foreground font-medium">
                  Tandai uang muka (DP {dpPercent}%) sudah dibayarkan oleh customer
                </span>
              </label>

              {dpPaid ? (
                <div className="mt-3 p-3 rounded-lg border border-brand-primary/20 bg-brand-tint/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-brand-primary" />
                      Dokumen Faktur DP (Wajib CI atau PI)
                    </span>
                    <span className="text-[10px] bg-brand-primary text-white font-semibold px-2 py-0.5 rounded-full">
                      Wajib Dilampirkan
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Jenis Dokumen
                      </label>
                      <div className="flex items-center gap-3 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="invoiceDocType"
                            value="CI"
                            checked={invoiceDocType === "CI"}
                            onChange={() => setInvoiceDocType("CI")}
                            className="accent-brand-primary"
                          />
                          <span className="font-medium">Commercial Invoice (CI)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="invoiceDocType"
                            value="PI"
                            checked={invoiceDocType === "PI"}
                            onChange={() => setInvoiceDocType("PI")}
                            className="accent-brand-primary"
                          />
                          <span className="font-medium">Proforma Invoice (PI)</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Nomor Dokumen {invoiceDocType} (Opsional)
                      </label>
                      <Input
                        placeholder={`Contoh: ${invoiceDocType}-2026/001`}
                        value={invoiceDocNumber}
                        onChange={(e) => setInvoiceDocNumber(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      ref={invoiceDocFileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                      onChange={handleInvoiceDocUpload}
                      disabled={isUploadingInvoiceDoc}
                    />

                    {invoiceDocAttachment ? (
                      <div className="flex items-center justify-between p-2 rounded-lg border border-emerald-200 bg-emerald-50/70 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0 truncate">
                            <span className="font-semibold text-emerald-950 block truncate text-[11px]">
                              {uploadedInvoiceDocFileName || invoiceDocAttachment.split("/").pop()}
                            </span>
                            {uploadedInvoiceDocFileSize != null && (
                              <span className="text-[10px] text-emerald-700 block">
                                {(uploadedInvoiceDocFileSize / 1024).toFixed(1)} KB &bull; Tersimpan di Cloudflare R2
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveInvoiceDoc}
                          className="h-6 px-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100/50 text-[11px] shrink-0"
                        >
                          <X className="h-3.5 w-3.5 mr-0.5" /> Hapus
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => !isUploadingInvoiceDoc && invoiceDocFileInputRef.current?.click()}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed cursor-pointer transition-colors text-xs ${
                          isUploadingInvoiceDoc
                            ? "border-brand-primary bg-brand-tint/20 text-brand-primary cursor-wait"
                            : "border-brand-primary/50 hover:border-brand-primary hover:bg-brand-tint/10 bg-white text-brand-primary font-medium"
                        }`}
                      >
                        {isUploadingInvoiceDoc ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                            <span className="text-xs font-semibold">Mengunggah {invoiceDocType} ke Cloudflare R2...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-brand-primary" />
                            <span className="text-xs font-semibold">Pencet Tombol untuk Upload Dokumen {invoiceDocType}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Dokumen {invoiceDocType} ini akan dilampirkan bersama pengajuan pesanan dan dapat diakses saat proses persetujuan (Approval).
                  </p>
                </div>
              ) : (
                <div className="mt-2.5 p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 text-[11px] flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Pengajuan Approval Tanpa DP</span>
                    Karena uang muka (DP) belum dibayarkan, Sales Order ini akan diajukan ke Approval terlebih dahulu. Dokumen Commercial Invoice (CI) atau Proforma Invoice (PI) wajib diunggah setelah disetujui (Approved) sebelum dapat digunakan untuk pengadaan barang di PR.
                  </div>
                </div>
              )}
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

      {/* Upload Dokumen CI / PI Pasca-Approval Dialog */}
      <Dialog open={isPostApprovalUploadOpen} onOpenChange={setIsPostApprovalUploadOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-brand-primary" />
              Upload Dokumen CI / PI
            </DialogTitle>
          </DialogHeader>
          {postApprovalOrder && (
            <form onSubmit={handleSavePostApprovalDoc} className="space-y-4">
              <div className="p-3 rounded-lg border border-border bg-slate-50/70 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nomor Order:</span>
                  <span className="font-mono font-semibold">{postApprovalOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pelanggan:</span>
                  <span className="font-semibold">{postApprovalOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Nilai:</span>
                  <MoneyDisplay amount={postApprovalOrder.totalAmount} className="font-semibold" />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Pilih Jenis Dokumen Invoice <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="postDocType"
                        value="CI"
                        checked={postDocType === "CI"}
                        onChange={() => setPostDocType("CI")}
                        className="accent-brand-primary"
                      />
                      <span className="font-medium">Commercial Invoice (CI)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="postDocType"
                        value="PI"
                        checked={postDocType === "PI"}
                        onChange={() => setPostDocType("PI")}
                        className="accent-brand-primary"
                      />
                      <span className="font-medium">Proforma Invoice (PI)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Nomor Dokumen {postDocType} (Opsional)
                  </label>
                  <Input
                    placeholder={`Contoh: ${postDocType}-2026/001`}
                    value={postDocNumber}
                    onChange={(e) => setPostDocNumber(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1">
                    <span>File Dokumen {postDocType} <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-muted-foreground">Maks 10 MB</span>
                  </label>
                  <input
                    ref={postDocFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    onChange={handlePostDocUpload}
                    disabled={isUploadingPostDoc}
                  />

                  {postDocAttachment ? (
                    <div className="flex items-center justify-between p-2 rounded-lg border border-emerald-200 bg-emerald-50/70 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0 truncate">
                          <span className="font-semibold text-emerald-950 block truncate text-[11px]">
                            {postDocFileName || postDocAttachment.split("/").pop()}
                          </span>
                          {postDocFileSize != null && (
                            <span className="text-[10px] text-emerald-700 block">
                              {(postDocFileSize / 1024).toFixed(1)} KB &bull; Tersimpan di Cloudflare R2
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePostDoc}
                        className="h-6 px-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100/50 text-[11px] shrink-0"
                      >
                        <X className="h-3.5 w-3.5 mr-0.5" /> Hapus
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !isUploadingPostDoc && postDocFileInputRef.current?.click()}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed cursor-pointer transition-colors text-xs ${
                        isUploadingPostDoc
                          ? "border-brand-primary bg-brand-tint/20 text-brand-primary cursor-wait"
                          : "border-brand-primary/50 hover:border-brand-primary hover:bg-brand-tint/10 bg-white text-brand-primary font-medium"
                      }`}
                    >
                      {isUploadingPostDoc ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                          <span className="text-xs font-semibold">Mengunggah ke Cloudflare R2...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-brand-primary" />
                          <span className="text-xs font-semibold">Pencet Tombol untuk Upload Dokumen {postDocType}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/70 text-blue-900 text-[11px] flex items-start gap-2">
                <FileCheck className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                <div>
                  Setelah dokumen {postDocType} ini disimpan, Sales Order akan memiliki kelengkapan berkas faktur dan tombol pembuatan Purchase Requisition (PR) akan terbuka.
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPostApprovalUploadOpen(false)}
                  disabled={isSubmittingPostDoc}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  size="sm"
                  disabled={!postDocAttachment || isSubmittingPostDoc || isUploadingPostDoc}
                >
                  {isSubmittingPostDoc ? "Menyimpan..." : "Simpan & Buka Akses PR"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
