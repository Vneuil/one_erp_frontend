"use client";

import * as React from "react";
import { Plus, Download, Trash2, Pencil, XCircle, Copy, FilePlus2, X, CheckCircle2, History, Layers, AlertCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { MoneyDisplay } from "@/components/shared/money-display";
import { downloadCsv } from "@/lib/utils/csv";
import { salesApi, customerPosApi, CustomerPOItem, QuotationLine, QuotationLineInput } from "@/lib/api/sales";
import { customersApi, CustomerItem } from "@/lib/api/customers";
import { productsApi, ProductItem, isProductActive } from "@/lib/api/products";
import { currencyApi, CurrencyItem } from "@/lib/api/currency";
import { pricingApi, PaymentTermItem, TaxRateItem } from "@/lib/api/pricing";
import { ApiResponse } from "@/lib/api/client";
import { QuotationPrintDialog } from "@/components/sales/quotation-print-dialog";
import { usePermission } from "@/lib/hooks/use-permission";

async function allPages<T>(fetchPage: (params: { page: number; perPage: number }) => Promise<ApiResponse<T[]>>) {
  const items: T[] = [];
  let page = 1;
  while (true) {
    const response = await fetchPage({ page, perPage: 100 });
    items.push(...response.data);
    if (!response.meta || page >= response.meta.totalPages) return items;
    page++;
  }
}

interface Quotation {
  lines: QuotationLine[];
  id: string;
  quotationNumber: string;
  customerId?: string;
  customerName: string;
  paymentTermId?: string;
  paymentTerm?: string;
  taxRateId?: string;
  vatRate?: number;
  vatAmount?: number;
  vatExempt?: boolean;
  issueDate: string;
  expiryDate: string;
  totalAmount: number;
  currency?: string;
  status: string;
  notes?: string;
  cancellationReason?: string;
  parentQuotationId?: string;
  parentQuotationNumber?: string;
  revisionNumber?: number;
  isSuperseded?: boolean;
  customerPoId?: string;
  customerPoNumber?: string;
}

function QuotationStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "converted" || s === "pi_issued") {
    return (
      <Badge variant="success" className="gap-1 text-[11px] font-semibold">
        <CheckCircle2 className="h-3 w-3" /> PI Terbit
      </Badge>
    );
  }
  if (s === "revised") {
    return (
      <Badge variant="warning" className="gap-1 text-[11px] font-semibold">
        <History className="h-3 w-3" /> Direvisi
      </Badge>
    );
  }
  if (s === "cancelled") {
    return (
      <Badge variant="destructive" className="gap-1 text-[11px] font-semibold">
        <XCircle className="h-3 w-3" /> Batal
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-[11px] font-semibold border-blue-300 bg-blue-50 text-blue-700">
      Aktif (Diajukan)
    </Badge>
  );
}

export default function QuotationsPage() {
  const { canCreate: canCreateSales } = usePermission("sales");
  const [quotations, setQuotations] = React.useState<Quotation[]>([]);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // Sumber Pelanggan: dari Master Pelanggan, dari PO Masuk, atau Input Manual
  const [sourceType, setSourceType] = React.useState<"customer" | "po" | "manual">("customer");
  const [customerId, setCustomerId] = React.useState("");
  const [selectedPoId, setSelectedPoId] = React.useState("");
  const [manualCustomerName, setManualCustomerName] = React.useState("");

  const [customers, setCustomers] = React.useState<CustomerItem[]>([]);
  const [customerPOs, setCustomerPOs] = React.useState<CustomerPOItem[]>([]);
  const [allProducts, setAllProducts] = React.useState<ProductItem[]>([]);
  const productMap = React.useMemo(() => new Map(allProducts.map((p) => [p.id, p])), [allProducts]);
  const products = React.useMemo(() => allProducts.filter(isProductActive), [allProducts]);
  const [currencies, setCurrencies] = React.useState<CurrencyItem[]>([]);
  const [currency, setCurrency] = React.useState("IDR");
  const [referenceLoading, setReferenceLoading] = React.useState(false);
  const [referenceError, setReferenceError] = React.useState<string | null>(null);

  const selectedCustomer = customers.find((item) => item.id === customerId);
  const customerName = (
    sourceType === "po"
      ? (customerPOs.find((p) => p.id === selectedPoId)?.customerName || manualCustomerName)
      : sourceType === "customer"
      ? (selectedCustomer?.name || manualCustomerName)
      : manualCustomerName
  ).trim();

  const [paymentTerms, setPaymentTerms] = React.useState<PaymentTermItem[]>([]);
  const [taxRates, setTaxRates] = React.useState<TaxRateItem[]>([]);
  const [paymentTermId, setPaymentTermId] = React.useState("");
  const [paymentTerm, setPaymentTerm] = React.useState("");
  const [taxRateId, setTaxRateId] = React.useState("");
  const [vatRate, setVatRate] = React.useState(11);
  const [applyVat, setApplyVat] = React.useState(true);

  const loadReferences = React.useCallback(async () => {
    setReferenceLoading(true);
    setReferenceError(null);
    try {
      const [custRes, poRes, items, curRes, ptRes, trRes] = await Promise.all([
        customersApi.list({ perPage: 200 }),
        customerPosApi.list({ perPage: 100 }),
        allPages(productsApi.list),
        currencyApi.list().catch(() => ({ data: [] })),
        pricingApi.listPaymentTerms().catch(() => ({ data: [] })),
        pricingApi.listTaxRates().catch(() => ({ data: [] })),
      ]);
      setCustomers((custRes.data || []).filter((c) => c.status?.toLowerCase() !== "inactive"));
      setCustomerPOs(poRes.data || []);
      setAllProducts(items);
      setCurrencies(curRes.data || []);
      setPaymentTerms(ptRes.data || []);
      const trList = trRes.data || [];
      setTaxRates(trList);
      const defTr = trList.find((t) => t.isDefault) || trList[0];
      if (defTr) {
        setTaxRateId((prev) => prev || defTr.id);
        setVatRate((prev) => (prev !== 11 ? prev : defTr.rate));
      }
    } catch (error) {
      setReferenceError(error instanceof Error ? error.message : "Gagal memuat master pelanggan, barang, dan mata uang");
    } finally {
      setReferenceLoading(false);
    }
  }, []);
  const [lines, setLines] = React.useState<QuotationLineInput[]>([{ productId: "", description: "", unit: "pcs", quantity: 1, unitPrice: 0 }]);
  const [selected, setSelected] = React.useState<Quotation | null>(null);
  const [printingQuotation, setPrintingQuotation] = React.useState<Quotation | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isConverting, setIsConverting] = React.useState(false);
  const [convertError, setConvertError] = React.useState<string | null>(null);
  const subtotal = (line: QuotationLineInput) => Math.round(line.quantity * line.unitPrice * 100) / 100;
  const totalAmount = Math.round(lines.reduce((sum, line) => sum + subtotal(line), 0) * 100) / 100;
  const vatAmount = applyVat ? Math.round(totalAmount * (vatRate / 100) * 100) / 100 : 0;
  const grandTotal = totalAmount + vatAmount;
  const updateLine = (index: number, patch: Partial<QuotationLineInput>) => setLines(current => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  const [expiryDate, setExpiryDate] = React.useState("");
  const [refPoNumber, setRefPoNumber] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editCustomerName, setEditCustomerName] = React.useState("");
  const [editLines, setEditLines] = React.useState<QuotationLineInput[]>([]);
  const [editCurrency, setEditCurrency] = React.useState("IDR");
  const [editValidUntil, setEditValidUntil] = React.useState("");
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const editSubtotal = (line: QuotationLineInput) => Math.round(line.quantity * line.unitPrice * 100) / 100;
  const editTotalAmount = Math.round(editLines.reduce((sum, line) => sum + editSubtotal(line), 0) * 100) / 100;
  const updateEditLine = (index: number, patch: Partial<QuotationLineInput>) => setEditLines(current => current.map((line, i) => i === index ? { ...line, ...patch } : line));

  const [revisingQuotation, setRevisingQuotation] = React.useState<Quotation | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<Quotation | null>(null);
  const [cancelReason, setCancelReason] = React.useState("");
  const [isCancelSubmitting, setIsCancelSubmitting] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [showRevisedHistory, setShowRevisedHistory] = React.useState(false);

  const fetchQuotations = React.useCallback(() => {
    salesApi
      .listQuotations({ perPage: 100 })
      .then((res) => {
        setLoadError(null);
        setQuotations(
          (res.data || []).map((q) => ({
            id: q.id,
            lines: q.lines || [],
            quotationNumber: q.quotationNumber,
            customerId: q.customerId,
            customerName: q.customerName,
            paymentTermId: q.paymentTermId,
            paymentTerm: q.paymentTerm,
            taxRateId: q.taxRateId,
            vatRate: q.vatRate,
            vatAmount: q.vatAmount,
            vatExempt: q.vatExempt,
            issueDate: q.createdAt ? q.createdAt.slice(0, 10) : "",
            expiryDate: q.validUntil,
            totalAmount: q.totalAmount,
            currency: q.currency,
            status: q.status,
            notes: q.notes,
            cancellationReason: q.cancellationReason,
            parentQuotationId: q.parentQuotationId,
            parentQuotationNumber: q.parentQuotationNumber,
            revisionNumber: q.revisionNumber,
            isSuperseded: q.isSuperseded,
            customerPoId: q.customerPoId,
            customerPoNumber: q.customerPoNumber,
          }))
        );
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Gagal memuat quotation"));
  }, []);

  const supersededCount = React.useMemo(
    () => quotations.filter((q) => q.isSuperseded || q.status === "Revised").length,
    [quotations]
  );

  const displayedQuotations = React.useMemo(
    () =>
      quotations.filter((q) => {
        if (!showRevisedHistory && (q.isSuperseded || q.status === "Revised")) return false;
        if (allProducts.length === 0) return true;
        if (!q.lines || q.lines.length === 0) return true;
        return q.lines.every((l) => {
          if (!l.productId) return true;
          const p = productMap.get(l.productId);
          return p ? isProductActive(p) : false;
        });
      }),
    [quotations, showRevisedHistory, allProducts, productMap]
  );

  React.useEffect(() => {
    fetchQuotations();
    productsApi.list({ perPage: 500 }).then((res) => setAllProducts(res.data || [])).catch(() => undefined);
  }, [fetchQuotations]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("new") === "true") {
        setIsAddOpen(true);
        void loadReferences();
      }
    }
  }, [loadReferences]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fromPoId = params.get("fromCustomerPoId");
      const custParam = params.get("customer");
      const refPoParam = params.get("refPo");

      if (fromPoId) {
        setSourceType("po");
        setSelectedPoId(fromPoId);
        if (refPoParam) setRefPoNumber(refPoParam);
        if (custParam) setManualCustomerName(custParam);

        customerPosApi.get(fromPoId).then((res) => {
          if (res.data) {
            const po = res.data;
            if (po.poNumber) setRefPoNumber(po.poNumber);
            if (po.customerName) setManualCustomerName(po.customerName);
            if (po.lines && po.lines.length > 0) {
              setLines(
                po.lines.map((l) => ({
                  productId: l.productId || "",
                  description: l.productName,
                  unit: l.unit || "pcs",
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                }))
              );
            }
          }
        }).catch(() => undefined);
      } else if (custParam) {
        setManualCustomerName(custParam);
        if (refPoParam) setRefPoNumber(refPoParam);
      }
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined" && customers.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const custParam = params.get("customer");
      if (custParam && !customerId) {
        const found = customers.find((c) => c.name.toLowerCase().includes(custParam.toLowerCase()));
        if (found) {
          setSourceType("customer");
          setCustomerId(found.id);
        }
      }
    }
  }, [customers, customerId]);

  const handleExport = () => {
    downloadCsv(
      "sales-quotations.csv",
      ["Quotation No.", "Customer", "Date Issued", "Valid Until", "Total Estimate", "Status"],
      quotations.map((q) => [q.quotationNumber, q.customerName, q.issueDate, q.expiryDate, q.totalAmount, q.status])
    );
  };

  const handleAddQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      referenceLoading ||
      referenceError ||
      !customerName ||
      lines.length === 0 ||
      lines.some(
        (line) =>
          !products.some((product) => product.id === line.productId) ||
          !line.description.trim() ||
          !Number.isFinite(line.quantity) ||
          line.quantity <= 0 ||
          !Number.isFinite(line.unitPrice) ||
          line.unitPrice < 0
      ) ||
      !Number.isFinite(totalAmount) ||
      totalAmount >= 1e13
    ) {
      setFormError("Isi nama customer dan minimal satu item dengan kuantitas serta harga yang valid.");
      return;
    }

    const issueDate = new Date().toISOString().slice(0, 10);
    const validUntil = expiryDate || issueDate;
    const notes = revisingQuotation
      ? `Revisi dari ${revisingQuotation.quotationNumber}`
      : refPoNumber
      ? `Menjawab PO Masuk #${refPoNumber}`
      : "";

    setIsSubmitting(true);
    setFormError(null);
    try {
      const resolvedCustomerPoId = (sourceType === "po" && selectedPoId) ? selectedPoId : (revisingQuotation?.customerPoId || undefined);
      const resolvedCustomerPoNumber = refPoNumber || (revisingQuotation?.customerPoNumber || undefined);

      await salesApi.createQuotation({
        customerId: customerId || undefined,
        customerName,
        customerPoId: resolvedCustomerPoId,
        customerPoNumber: resolvedCustomerPoNumber,
        paymentTermId: paymentTermId || undefined,
        paymentTerm: paymentTerm || undefined,
        taxRateId: taxRateId || undefined,
        vatRate: applyVat ? vatRate : 0,
        vatAmount,
        vatExempt: !applyVat,
        lines,
        totalAmount: grandTotal,
        currency: currency || "IDR",
        validUntil,
        notes,
        parentQuotationId: revisingQuotation ? revisingQuotation.id : undefined,
        parentQuotationNumber: revisingQuotation ? revisingQuotation.quotationNumber : undefined,
        revisionNumber: revisingQuotation ? (revisingQuotation.revisionNumber || 0) + 1 : 0,
      });

      // Jika ini adalah revisi, tandai quotation lama sebagai "Revised" dan isSuperseded = true agar ter-trace & ter-hide
      if (revisingQuotation) {
        try {
          await salesApi.updateQuotation(revisingQuotation.id, {
            status: "Revised",
            isSuperseded: true,
            notes: `Telah direvisi oleh penawaran baru`,
          });
        } catch {
          // ignore status update error
        }
      }

      fetchQuotations();
      setIsAddOpen(false);
      setRevisingQuotation(null);
      setCustomerId("");
      setSelectedPoId("");
      setManualCustomerName("");
      setRefPoNumber("");
      setCurrency("IDR");
      setLines([{ productId: "", description: "", unit: "pcs", quantity: 1, unitPrice: 0 }]);
      setExpiryDate("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (quotation: Quotation) => {
    setEditingId(quotation.id);
    setEditCustomerName(quotation.customerName);
    setEditCurrency(quotation.currency || "IDR");
    setEditValidUntil(quotation.expiryDate);
    setEditLines(
      quotation.lines.length
        ? quotation.lines.map(line => ({ productId: line.productId, description: line.description, unit: line.unit, quantity: line.quantity, unitPrice: line.unitPrice }))
        : [{ productId: "", description: "", unit: "pcs", quantity: 1, unitPrice: 0 }]
    );
    setEditError(null);
    setIsEditOpen(true);
    void loadReferences();
  };

  const handleUpdateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || referenceLoading || referenceError || !editCustomerName.trim() || editLines.length === 0 || editLines.some(line => !products.some(product => product.id === line.productId) || !line.description.trim() || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0) || !Number.isFinite(editTotalAmount) || editTotalAmount >= 1e13) {
      setEditError("Isi nama customer dan minimal satu item dengan kuantitas serta harga yang valid.");
      return;
    }

    setIsEditSubmitting(true);
    setEditError(null);
    try {
      await salesApi.updateQuotation(editingId, {
        customerName: editCustomerName.trim(),
        lines: editLines,
        currency: editCurrency || "IDR",
        validUntil: editValidUntil,
      });
      fetchQuotations();
      setIsEditOpen(false);
      setEditingId(null);
      setSelected(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal memperbarui quotation");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleRevise = (quotation: Quotation) => {
    setRevisingQuotation(quotation);
    setCurrency(quotation.currency || "IDR");
    if (quotation.customerPoId) {
      setSourceType("po");
      setSelectedPoId(quotation.customerPoId);
      setRefPoNumber(quotation.customerPoNumber || "");
    } else {
      // Match customer from Master Pelanggan
      const matchedCustomer = customers.find(
        (c) => c.name.toLowerCase() === quotation.customerName.toLowerCase()
      );
      if (matchedCustomer) {
        setSourceType("customer");
        setCustomerId(matchedCustomer.id);
      } else {
        setSourceType("manual");
        setManualCustomerName(quotation.customerName);
      }
      if (quotation.customerPoNumber) {
        setRefPoNumber(quotation.customerPoNumber);
      }
    }
    // Prefill lines
    setLines(
      quotation.lines.length
        ? quotation.lines.map((line) => ({
            productId: line.productId || "",
            description: line.description,
            unit: line.unit,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          }))
        : [{ productId: "", description: "", unit: "pcs", quantity: 1, unitPrice: 0 }]
    );
    setExpiryDate(quotation.expiryDate || "");
    setFormError(null);
    setSelected(null);
    setIsAddOpen(true);
    void loadReferences();
  };

  const handleOpenCancel = (quotation: Quotation) => {
    setCancelTarget(quotation);
    setCancelReason("");
    setCancelError(null);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setIsCancelSubmitting(true);
    setCancelError(null);
    try {
      await salesApi.cancelQuotation(cancelTarget.id, cancelReason.trim());
      fetchQuotations();
      setCancelTarget(null);
      if (selected?.id === cancelTarget.id) {
        setSelected(null);
      }
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Gagal membatalkan penawaran");
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  const columns: Column<Quotation>[] = [
    {
      key: "quotationNumber",
      header: "Quotation No.",
      sortable: true,
      render: (q) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              className="font-mono text-xs font-bold text-brand-primary hover:underline text-left"
              onClick={() => setSelected(q)}
            >
              {q.quotationNumber}
            </button>
            {q.revisionNumber && q.revisionNumber > 0 ? (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-full">
                Rev {q.revisionNumber}
              </span>
            ) : null}
            {q.isSuperseded && (
              <span className="text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-300 px-1.5 py-0.2 rounded-full">
                Arsip
              </span>
            )}
          </div>
          {q.customerPoNumber ? (
            <span
              className="text-[10px] text-emerald-700 font-semibold block truncate max-w-[200px]"
              title={`Menjawab PO Masuk #${q.customerPoNumber}`}
            >
              PO: #{q.customerPoNumber}
            </span>
          ) : null}
          {q.parentQuotationNumber ? (
            <span
              className="text-[10px] text-amber-800 font-medium block truncate max-w-[200px]"
              title={`Revisi dari ${q.parentQuotationNumber}`}
            >
              Ref: {q.parentQuotationNumber}
            </span>
          ) : q.notes ? (
            <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]" title={q.notes}>
              {q.notes}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      render: (q) => <span className="text-xs font-semibold text-foreground">{q.customerName}</span>,
    },
    {
      key: "paymentTerm",
      header: "Termin (TOP)",
      render: (q) => <span className="text-xs text-foreground font-medium">{q.paymentTerm || "-"}</span>,
    },
    {
      key: "issueDate",
      header: "Date Issued",
      render: (q) => <span className="text-xs text-muted-foreground">{q.issueDate}</span>,
    },
    {
      key: "expiryDate",
      header: "Valid Until",
      render: (q) => <span className="text-xs text-foreground font-medium">{q.expiryDate}</span>,
    },
    {
      key: "totalAmount",
      header: "Total Estimate",
      align: "right",
      sortable: true,
      render: (q) => <MoneyDisplay amount={q.totalAmount} currency={q.currency || "IDR"} className="text-xs font-bold" />,
    },
    {
      key: "status",
      header: "Status",
      render: (q) => <QuotationStatusBadge status={q.status} />,
    },
    {
      key: "actions",
      header: "Tindak Lanjut Internal Manna",
      align: "right",
      render: (q) => {
        const isActionable = q.status !== "Converted" && q.status !== "Cancelled" && q.status !== "Revised" && !q.isSuperseded;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px] gap-1 text-slate-700 hover:bg-slate-100 border-slate-300 shadow-2xs"
              onClick={(e) => {
                e.stopPropagation();
                setPrintingQuotation(q);
              }}
              title="Cetak atau simpan ke PDF dokumen penawaran harga resmi"
            >
              <Printer className="h-3 w-3 text-emerald-600" /> PDF
            </Button>
            {isActionable ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="gradient"
                  className="h-7 px-2 text-[11px] gap-1 font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    const custPoParam = q.customerPoId ? `&fromCustomerPoId=${q.customerPoId}` : "";
                    window.location.href = `/sales/trade-invoices?tab=PI&fromQuotationId=${q.id}${custPoParam}`;
                  }}
                  title="Pembeli sepakat (Agree): Lanjut terbitkan Proforma Invoice dengan DP (0-100%)"
                >
                  <FilePlus2 className="h-3 w-3" /> Jadi PI
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px] gap-1 text-amber-700 hover:bg-amber-50 border-amber-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevise(q);
                  }}
                  title="Ada negosiasi harga/kuantiti: Terbitkan penawaran revisi baru (dokumen lama otomatis disembunyikan)"
                >
                  <Copy className="h-3 w-3" /> Revisi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px] gap-1 text-rose-600 hover:bg-rose-50 border-rose-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCancel(q);
                  }}
                  title="Kesepakatan tidak tercapai: Batalkan penawaran ini dengan alasan"
                >
                  <XCircle className="h-3 w-3" /> Batal
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setSelected(q)}
              >
                Lihat Detail
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penawaran Penjualan"
        description="Terbitkan penawaran resmi, negosiasi harga, dan konversi penawaran menjadi pesanan."
      >
        {supersededCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`h-9 gap-1.5 text-xs font-medium transition-colors ${
              showRevisedHistory ? "bg-amber-50 text-amber-900 border-amber-300" : "text-muted-foreground"
            }`}
            onClick={() => setShowRevisedHistory((prev) => !prev)}
            title="Sembunyikan atau tampilkan dokumen penawaran lama yang telah direvisi"
          >
            <History className="h-3.5 w-3.5" />
            {showRevisedHistory
              ? `Sembunyikan Versi Lama (${supersededCount})`
              : `Tampilkan Riwayat Revisi (${supersededCount})`}
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        {canCreateSales && (
          <Button
            variant="gradient"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold"
            onClick={() => { setIsAddOpen(true); void loadReferences(); }}
          >
            <Plus className="h-3.5 w-3.5" /> New Quotation
          </Button>
        )}
      </PageHeader>

      {loadError && <div role="alert" className="text-sm text-rose-700">{loadError} <Button variant="outline" onClick={fetchQuotations}>Retry</Button></div>}
      <DataTable
        columns={columns}
        data={displayedQuotations}
        searchKey="quotationNumber"
        searchPlaceholder="Search quotation number or customer..."
      />

      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) setRevisingQuotation(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {revisingQuotation ? `Revisi Penawaran (${revisingQuotation.quotationNumber})` : "New Quotation"}
            </DialogTitle>
          </DialogHeader>
          {revisingQuotation && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 flex items-center justify-between">
              <div>
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <History className="h-4 w-4 text-amber-700" /> Mode Revisi Penawaran (Tawar-Menawar):
                </span>
                <p className="text-[11px] text-amber-800 mt-1">
                  Merevisi penawaran <strong>{revisingQuotation.quotationNumber}</strong> ({revisingQuotation.customerName}). Sesuaikan harga atau kuantiti baru yang disepakati. Penawaran sebelumnya otomatis ditandai &quot;Direvisi&quot; agar seluruh riwayat tawar-menawar ter-trace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevisingQuotation(null)}
                className="text-amber-700 hover:text-amber-900 ml-2"
                title="Batal mode revisi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {refPoNumber && !revisingQuotation && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-center justify-between">
              <div>
                <span className="font-semibold">Penawaran Balasan (Counter-Offer / PO Masuk Tidak Sesuai):</span>
                <p className="text-[11px] text-amber-700">Menjawab PO Pembeli #{refPoNumber}. Masukkan kuantiti dan harga baru yang disanggupi pihak Manna.</p>
              </div>
              <button
                type="button"
                onClick={() => setRefPoNumber("")}
                className="text-amber-700 hover:text-amber-900"
                title="Hapus referensi PO"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <form onSubmit={handleAddQuotation} className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {formError}
              </div>
            )}
            {/* Sumber Referensi Customer */}
            <div className="space-y-2 rounded-xl border border-border/80 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Referensi Pembeli / Customer <span className="text-rose-500">*</span>
                </label>
                <div className="inline-flex rounded-lg border border-border bg-white p-0.5 text-xs shadow-xs">
                  <button
                    type="button"
                    onClick={() => setSourceType("customer")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                      sourceType === "customer"
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Master Pelanggan
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType("po")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                      sourceType === "po"
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Dari PO Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType("manual")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                      sourceType === "manual"
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Input Manual
                  </button>
                </div>
              </div>

              {sourceType === "customer" && (
                <div className="space-y-1.5">
                  <select
                    aria-label="Master Pelanggan"
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      const c = customers.find((item) => item.id === e.target.value);
                      if (c) {
                        setManualCustomerName(c.name);
                        if (c.paymentTermId) {
                          setPaymentTermId(c.paymentTermId);
                          setPaymentTerm(c.paymentTermName || "");
                        } else if (c.paymentTermName) {
                          setPaymentTerm(c.paymentTermName);
                          const matched = paymentTerms.find((p) => p.name === c.paymentTermName);
                          if (matched) setPaymentTermId(matched.id);
                        }
                      }
                    }}
                    required={sourceType === "customer"}
                    disabled={referenceLoading || isSubmitting}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <option value="">{referenceLoading ? "Memuat master pelanggan..." : "-- Pilih dari Master Pelanggan --"}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code ? `[${c.code}] ` : ""}{c.name}
                      </option>
                    ))}
                  </select>
                  {!referenceLoading && !referenceError && !customers.length && (
                    <p className="text-xs text-muted-foreground">
                      Belum ada data di Master Pelanggan. Anda juga dapat memilih opsi &quot;Dari PO Masuk&quot; atau &quot;Input Manual&quot;.
                    </p>
                  )}
                </div>
              )}

              {sourceType === "po" && (
                <div className="space-y-1.5">
                  <select
                    aria-label="PO Masuk"
                    value={selectedPoId}
                    onChange={(e) => {
                      const poId = e.target.value;
                      setSelectedPoId(poId);
                      const po = customerPOs.find((p) => p.id === poId);
                      if (po) {
                        setManualCustomerName(po.customerName);
                        setRefPoNumber(po.poNumber);
                        if (po.paymentTermId) {
                          setPaymentTermId(po.paymentTermId);
                          setPaymentTerm(po.paymentTerm || "");
                        } else if (po.paymentTerm) {
                          setPaymentTerm(po.paymentTerm);
                          const matched = paymentTerms.find((p) => p.name === po.paymentTerm);
                          if (matched) setPaymentTermId(matched.id);
                        }
                        if (po.taxRateId) {
                          setTaxRateId(po.taxRateId);
                          if (po.vatRate) setVatRate(po.vatRate);
                        }
                        if (po.currency) setCurrency(po.currency);
                        if (po.lines && po.lines.length > 0) {
                          setLines(
                            po.lines.map((l) => ({
                              productId: l.productId || "",
                              description: l.productName,
                              unit: l.unit || "pcs",
                              quantity: l.quantity,
                              unitPrice: l.unitPrice,
                            }))
                          );
                        }
                      }
                    }}
                    required={sourceType === "po"}
                    disabled={referenceLoading || isSubmitting}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <option value="">{referenceLoading ? "Memuat PO Masuk..." : "-- Pilih Dokumen PO Masuk --"}</option>
                    {customerPOs.map((po) => (
                      <option key={po.id} value={po.id}>
                        PO #{po.poNumber} — {po.customerName} ({po.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Memilih PO Masuk akan otomatis mengisi nama pelanggan, nomor referensi PO, dan memuat daftar item barang untuk dinegosiasikan.
                  </p>
                </div>
              )}

              {sourceType === "manual" && (
                <div className="space-y-1.5">
                  <Input
                    aria-label="Customer Name Manual"
                    placeholder="Masukkan nama calon pembeli / perusahaan..."
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    required={sourceType === "manual"}
                    disabled={isSubmitting}
                    className="h-10 bg-white text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Gunakan opsi ini jika calon pembeli adalah prospek baru yang belum terdaftar di Master Pelanggan.
                  </p>
                </div>
              )}

              {customerName && (
                <div className="text-xs text-brand-primary font-medium flex items-center gap-1.5 pt-0.5">
                  <span>Customer Terpilih:</span>
                  <span className="font-bold underline decoration-brand-primary/40">{customerName}</span>
                </div>
              )}

              {referenceError && (
                <div role="alert" className="text-xs text-rose-700 flex items-center justify-between">
                  <span>{referenceError}</span>
                  <Button type="button" variant="outline" size="sm" onClick={loadReferences} className="h-6 text-xs px-2">
                    Coba Lagi
                  </Button>
                </div>
              )}
            </div>
            <fieldset disabled={isSubmitting} className="space-y-3">
              <legend className="text-sm font-semibold mb-2">Quotation Items</legend>
              {!referenceLoading && !referenceError && !products.length && <p className="text-xs text-muted-foreground">Belum ada barang. Tambahkan barang di Master Data terlebih dahulu.</p>}
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-2 md:grid-cols-12 gap-2 rounded-lg border p-3">
                  <label className="col-span-2 md:col-span-4 text-xs">Item / Description
                    <select aria-label={`Item ${index + 1}`} value={line.productId || ""} required disabled={referenceLoading} className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm" onChange={e => {
                      const product = products.find(item => item.id === e.target.value);
                      updateLine(index, { productId: product?.id || "", description: product?.name || "", unit: product?.unit || "pcs", unitPrice: product?.sellingPrice || 0 });
                    }}>
                      <option value="">{referenceLoading ? "Memuat barang..." : "Pilih barang"}</option>
                      {products.map(product => <option key={product.id} value={product.id}>{product.sku} — {product.name}</option>)}
                    </select>
                  </label>
                  <label className="md:col-span-2 text-xs">Quantity
                    <Input aria-label={`Quantity ${index + 1}`} type="number" min="0.01" max="9999999999999.99" step="0.01" value={line.quantity} onChange={e => updateLine(index, { quantity: e.target.valueAsNumber })} required />
                  </label>
                  <label className="md:col-span-2 text-xs">Unit
                    <Input aria-label={`Unit ${index + 1}`} value={line.unit} maxLength={50} readOnly placeholder="pcs" required />
                  </label>
                  <label className="col-span-2 md:col-span-4 text-xs">Unit Price
                    <Input aria-label={`Unit price ${index + 1}`} type="number" min="0" max="9999999999999.99" step="0.01" value={line.unitPrice} onChange={e => updateLine(index, { unitPrice: e.target.valueAsNumber })} required />
                  </label>
                  <div className="col-span-2 md:col-span-12 flex items-center justify-between text-sm">
                    <span>Subtotal: <MoneyDisplay amount={Number.isFinite(subtotal(line)) ? subtotal(line) : 0} currency={currency} /></span>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Remove item ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines(current => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setLines(current => [...current, { productId: "", description: "", unit: "pcs", quantity: 1, unitPrice: 0 }])}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyVat}
                    onChange={(e) => setApplyVat(e.target.checked)}
                    className="h-3.5 w-3.5 accent-brand-primary"
                  />
                  <span className="text-foreground font-medium">Kena PPN {vatRate}% <span className="text-muted-foreground font-normal">(nonaktifkan untuk ekspor)</span></span>
                </label>
                <div className="text-right space-y-0.5 font-semibold">
                  <div className="text-muted-foreground text-xs font-normal">Subtotal: <MoneyDisplay amount={Number.isFinite(totalAmount) ? totalAmount : 0} currency={currency} /></div>
                  {applyVat && (
                    <div className="text-muted-foreground text-xs font-normal">
                      PPN {vatRate}%: +<MoneyDisplay amount={vatAmount} currency={currency} />
                    </div>
                  )}
                  <div className="text-sm font-bold text-foreground">Total Estimate: <MoneyDisplay amount={Number.isFinite(grandTotal) ? grandTotal : 0} currency={currency} /></div>
                </div>
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Term of Payment (TOP)</label>
                <select
                  value={paymentTermId}
                  onChange={(e) => {
                    const pt = paymentTerms.find((p) => p.id === e.target.value);
                    setPaymentTermId(e.target.value);
                    setPaymentTerm(pt ? pt.name : "");
                  }}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="">-- Pilih TOP --</option>
                  {paymentTerms.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.days} hari)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Tarif Pajak (PPN)</label>
                <select
                  value={taxRateId}
                  onChange={(e) => {
                    const tr = taxRates.find((t) => t.id === e.target.value);
                    setTaxRateId(e.target.value);
                    if (tr) setVatRate(tr.rate);
                  }}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  disabled={!applyVat}
                >
                  <option value="">-- Pilih Tarif Pajak --</option>
                  {taxRates.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.name} ({tr.rate}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Mata Uang (Currency)</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {currencies.length > 0 ? (
                    currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name} {c.symbol ? `(${c.symbol})` : ""}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="IDR">IDR — Indonesian Rupiah (Rp)</option>
                      <option value="USD">USD — US Dollar ($)</option>
                      <option value="EUR">EUR — Euro (€)</option>
                      <option value="CNY">CNY — Chinese Yuan (¥)</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Valid Until</label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting || referenceLoading || !!referenceError || !customerName || !products.length}>
                {isSubmitting ? "Menyimpan..." : "Create Quotation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="font-mono text-base">{selected?.quotationNumber}</DialogTitle>
              {selected && <QuotationStatusBadge status={selected.status} />}
            </div>
          </DialogHeader>
          {selected && <>
            <div className="flex flex-wrap justify-between gap-3 text-sm pb-2 border-b">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base text-foreground">{selected.customerName}</p>
                  {selected.revisionNumber && selected.revisionNumber > 0 ? (
                    <Badge variant="warning" className="text-[10px] font-bold">
                      Revisi ke-{selected.revisionNumber}
                    </Badge>
                  ) : null}
                  {selected.isSuperseded && (
                    <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700">
                      Dokumen Diarsipkan (Telah Direvisi)
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tanggal Terbit: {selected.issueDate} · Berlaku Hingga: {selected.expiryDate}
                </p>
                {selected.customerPoNumber && (
                  <p className="text-xs text-emerald-800 mt-1 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block mr-1">
                    <Layers className="h-3 w-3 inline mr-1 text-emerald-600" />Menjawab PO Masuk: #{selected.customerPoNumber}
                  </p>
                )}
                {selected.notes && (
                  <p className="text-xs text-blue-700 mt-1 font-medium bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md inline-block mr-1">
                    <History className="h-3 w-3 inline mr-1" />{selected.notes}
                  </p>
                )}
                {selected.cancellationReason && (
                  <p className="text-xs text-rose-700 mt-1 font-medium bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md inline-block">
                    <AlertCircle className="h-3 w-3 inline mr-1" />Alasan Batal: {selected.cancellationReason}
                  </p>
                )}
              </div>
            </div>

            {/* Kotak Riwayat Referensi: Jika dokumen ini adalah revisi dari quotation sebelumnya */}
            {selected.parentQuotationNumber && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-amber-900">
                    <History className="h-4 w-4 text-amber-700" /> Referensi Versi Penawaran Sebelumnya:
                  </span>
                  <span className="text-[11px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                    Versi Asal: {selected.parentQuotationNumber}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Penawaran ini merupakan revisi lanjutan dari dokumen <strong>{selected.parentQuotationNumber}</strong>. Dokumen lama otomatis disembunyikan dari daftar utama dan diarsipkan sebagai referensi negosiasi.
                </p>
                {selected.parentQuotationId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100 mt-1 gap-1"
                    onClick={() => {
                      const parent = quotations.find((q) => q.id === selected.parentQuotationId);
                      if (parent) {
                        setSelected(parent);
                      }
                    }}
                  >
                    <Layers className="h-3.5 w-3.5" /> Buka Rincian Versi Sebelumnya ({selected.parentQuotationNumber})
                  </Button>
                )}
              </div>
            )}

            {/* Kotak Dokumen Lama (Telah Direvisi): Jika staf membuka dokumen lama yang sudah ter-superseded */}
            {(selected.isSuperseded || selected.status === "Revised") && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-blue-900">
                    <Layers className="h-4 w-4 text-blue-700" /> Dokumen Versi Lama (Telah Direvisi):
                  </span>
                  <Badge variant="warning">Arsip Riwayat</Badge>
                </div>
                <p className="text-[11px] text-blue-800">
                  Dokumen ini telah direvisi dan disembunyikan dari daftar utama penawaran.
                </p>
                {(() => {
                  const newerQuotation = quotations.find((q) => q.parentQuotationId === selected.id);
                  return newerQuotation ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="gradient"
                      className="h-7 text-xs gap-1 mt-1 font-semibold"
                      onClick={() => setSelected(newerQuotation)}
                    >
                      Buka Versi Terbaru ({newerQuotation.quotationNumber}) →
                    </Button>
                  ) : null;
                })()}
              </div>
            )}

            {selected.lines.length ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="p-2.5">Item / Deskripsi</th>
                      <th className="p-2.5 text-right">Kuantiti</th>
                      <th className="p-2.5">Satuan</th>
                      <th className="p-2.5 text-right">Harga Satuan</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map(line => (
                      <tr key={line.id} className="border-b last:border-b-0 hover:bg-slate-50/50">
                        <td className="p-2.5 font-medium whitespace-pre-wrap">{line.description}</td>
                        <td className="p-2.5 text-right">{line.quantity}</td>
                        <td className="p-2.5 text-muted-foreground">{line.unit}</td>
                        <td className="p-2.5 text-right"><MoneyDisplay amount={line.unitPrice} currency={selected.currency || "IDR"} /></td>
                        <td className="p-2.5 text-right font-semibold"><MoneyDisplay amount={line.subtotal} currency={selected.currency || "IDR"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Quotation ini belum memiliki rincian item barang.</p>
            )}

            <div className="text-right text-base font-bold flex items-center justify-end gap-2">
              <span className="text-sm font-normal text-muted-foreground">Total Penawaran:</span>
              <MoneyDisplay amount={selected.totalAmount} currency={selected.currency || "IDR"} />
            </div>

            {/* Kotak Tindak Lanjut Keputusan Internal Staf Manna */}
            <div className="rounded-xl border border-border bg-slate-50/80 p-4 space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-brand-primary" />
                    Tindak Lanjut Penawaran (Keputusan Internal Staf Manna)
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Seluruh proses dikerjakan oleh staf internal Manna. Pilih keputusan setelah menindaklanjuti penawaran ini dengan pembeli:
                  </p>
                </div>
              </div>

              {selected.status !== "Converted" && selected.status !== "Cancelled" && selected.status !== "Revised" ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Opsi 1: Jadi PI */}
                  <button
                    type="button"
                    onClick={() => {
                      const custPoParam = selected.customerPoId ? `&fromCustomerPoId=${selected.customerPoId}` : "";
                      window.location.href = `/sales/trade-invoices?tab=PI&fromQuotationId=${selected.id}${custPoParam}`;
                    }}
                    className="flex flex-col items-start text-left p-3 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 hover:border-emerald-500 transition-all shadow-xs group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700 mb-1">
                      <FilePlus2 className="h-4 w-4" /> 1. Lanjut Jadi PI (Agree)
                    </div>
                    <p className="text-[11px] text-muted-foreground group-hover:text-emerald-950">
                      Pembeli sepakat harga &amp; kuantiti. Terbitkan Proforma Invoice resmi dan tetapkan DP (0-100%).
                    </p>
                  </button>

                  {/* Opsi 2: Revisi Quotation */}
                  <button
                    type="button"
                    onClick={() => handleRevise(selected)}
                    className="flex flex-col items-start text-left p-3 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 hover:border-amber-500 transition-all shadow-xs group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800 mb-1">
                      <Copy className="h-4 w-4" /> 2. Revisi Quotation
                    </div>
                    <p className="text-[11px] text-muted-foreground group-hover:text-amber-950">
                      Pembeli menawar harga atau kuantiti. Buat penawaran baru revisi, riwayat lama tetap tersimpan.
                    </p>
                  </button>

                  {/* Opsi 3: Batalkan Penawaran */}
                  <button
                    type="button"
                    onClick={() => handleOpenCancel(selected)}
                    className="flex flex-col items-start text-left p-3 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 hover:border-rose-500 transition-all shadow-xs group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700 mb-1">
                      <XCircle className="h-4 w-4" /> 3. Batalkan Penawaran
                    </div>
                    <p className="text-[11px] text-muted-foreground group-hover:text-rose-950">
                      Tidak ada kesepakatan atau transaksi dibatalkan. Tercatat alasan pembatalan untuk analisis.
                    </p>
                  </button>
                </div>
              ) : (
                <div className="rounded-lg p-3 text-xs bg-white border border-border">
                  {selected.status === "Converted" && (
                    <div className="text-emerald-700 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Penawaran ini telah disepakati (Agree) dan telah diterbitkan Proforma Invoice (PI).</span>
                    </div>
                  )}
                  {selected.status === "Revised" && (
                    <div className="text-amber-800 font-semibold flex items-center gap-2">
                      <History className="h-4 w-4" />
                      <span>Penawaran ini telah direvisi menjadi penawaran baru untuk negosiasi ulang harga/kuantiti.</span>
                    </div>
                  )}
                  {selected.status === "Cancelled" && (
                    <div>
                      <p className="text-rose-700 font-semibold flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        <span>Penawaran ini telah dibatalkan.</span>
                      </p>
                      {selected.cancellationReason && (
                        <p className="text-slate-600 text-xs mt-1.5 pl-6">
                          Alasan Pembatalan: <span className="font-medium italic text-slate-800">{selected.cancellationReason}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 mt-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  onClick={() => {
                    setPrintingQuotation(selected);
                  }}
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak / Export PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleOpenEdit(selected)}
                  disabled={selected.status === "Converted" || selected.status === "Cancelled" || selected.status === "Revised"}
                >
                  <Pencil className="h-3.5 w-3.5" /> Koreksi / Edit Teks
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-700 flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Batalkan Penawaran
            </DialogTitle>
          </DialogHeader>
          {cancelTarget && (
            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-900 space-y-1">
                <p>
                  Anda akan membatalkan penawaran <strong>{cancelTarget.quotationNumber}</strong> untuk pelanggan{" "}
                  <strong>{cancelTarget.customerName}</strong>.
                </p>
                <p className="text-[11px] text-rose-700">
                  Keputusan ini akan dicatat dan ter-trace di sistem untuk bahan analisis evaluasi penjualan.
                </p>
              </div>

              {cancelError && (
                <div role="alert" className="p-2.5 rounded-lg bg-rose-100 text-rose-800 text-xs font-semibold">
                  {cancelError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Alasan Pembatalan <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Pembeli menolak harga penawaran dan negosiasi buntu, atau pembeli menunda pengadaan..."
                  required
                  rows={3}
                  className="text-xs"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelTarget(null)}
                  disabled={isCancelSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={isCancelSubmitting || !cancelReason.trim()}
                  className="gap-1.5"
                >
                  {isCancelSubmitting ? "Membatalkan..." : "Konfirmasi Batalkan Penawaran"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quotation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateQuotation} className="space-y-4">
            {editError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {editError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Customer Name</label>
              <Input
                aria-label="Customer Name"
                value={editCustomerName}
                onChange={(e) => setEditCustomerName(e.target.value)}
                required
                disabled={isEditSubmitting}
              />
            </div>
            <fieldset disabled={isEditSubmitting} className="space-y-3">
              <legend className="text-sm font-semibold mb-2">Quotation Items</legend>
              {!referenceLoading && !referenceError && !products.length && <p className="text-xs text-muted-foreground">Belum ada barang. Tambahkan barang di Master Data terlebih dahulu.</p>}
              {editLines.map((line, index) => (
                <div key={index} className="grid grid-cols-2 md:grid-cols-12 gap-2 rounded-lg border p-3">
                  <label className="col-span-2 md:col-span-4 text-xs">Item / Description
                    <select aria-label={`Edit item ${index + 1}`} value={line.productId || ""} required disabled={referenceLoading} className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm" onChange={e => {
                      const product = products.find(item => item.id === e.target.value);
                      updateEditLine(index, { productId: product?.id || "", description: product?.name || "", unit: product?.unit || "pcs", unitPrice: product?.sellingPrice ?? line.unitPrice });
                    }}>
                      <option value="">{referenceLoading ? "Memuat barang..." : "Pilih barang"}</option>
                      {products.map(product => <option key={product.id} value={product.id}>{product.sku} — {product.name}</option>)}
                    </select>
                  </label>
                  <label className="md:col-span-2 text-xs">Quantity
                    <Input aria-label={`Edit quantity ${index + 1}`} type="number" min="0.01" max="9999999999999.99" step="0.01" value={line.quantity} onChange={e => updateEditLine(index, { quantity: e.target.valueAsNumber })} required />
                  </label>
                  <label className="md:col-span-2 text-xs">Unit
                    <Input aria-label={`Edit unit ${index + 1}`} value={line.unit} maxLength={50} readOnly placeholder="pcs" required />
                  </label>
                  <label className="col-span-2 md:col-span-4 text-xs">Unit Price
                    <Input aria-label={`Edit unit price ${index + 1}`} type="number" min="0" max="9999999999999.99" step="0.01" value={line.unitPrice} onChange={e => updateEditLine(index, { unitPrice: e.target.valueAsNumber })} required />
                  </label>
                  <div className="col-span-2 md:col-span-12 flex items-center justify-between text-sm">
                    <span>Subtotal: <MoneyDisplay amount={Number.isFinite(editSubtotal(line)) ? editSubtotal(line) : 0} currency={editCurrency} /></span>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Remove edit item ${index + 1}`} disabled={editLines.length === 1} onClick={() => setEditLines(current => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setEditLines(current => [...current, { productId: "", description: "", unit: "pcs", quantity: 1, unitPrice: 0 }])}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
              <div className="text-right font-semibold">Total Estimate: <MoneyDisplay amount={Number.isFinite(editTotalAmount) ? editTotalAmount : 0} currency={editCurrency} /></div>
            </fieldset>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Mata Uang (Currency)</label>
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {currencies.length > 0 ? (
                    currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name} {c.symbol ? `(${c.symbol})` : ""}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="IDR">IDR — Indonesian Rupiah (Rp)</option>
                      <option value="USD">USD — US Dollar ($)</option>
                      <option value="EUR">EUR — Euro (€)</option>
                      <option value="CNY">CNY — Chinese Yuan (¥)</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Valid Until</label>
                <Input type="date" value={editValidUntil} onChange={(e) => setEditValidUntil(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isEditSubmitting || referenceLoading || !!referenceError || !products.length}>
                {isEditSubmitting ? "Menyimpan..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <QuotationPrintDialog
        open={!!printingQuotation}
        onOpenChange={(open) => !open && setPrintingQuotation(null)}
        quotation={printingQuotation}
        customers={customers}
        products={products}
        currencies={currencies}
      />
    </div>
  );
}
