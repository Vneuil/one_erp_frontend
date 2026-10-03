"use client";

import * as React from "react";
import { Plus, Download, Trash2, Pencil } from "lucide-react";
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
import { salesApi, QuotationLine, QuotationLineInput } from "@/lib/api/sales";

import { crmApi, LeadItem } from "@/lib/api/crm";
import { productsApi, ProductItem } from "@/lib/api/products";
import { ApiResponse } from "@/lib/api/client";

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
  customerName: string;
  issueDate: string;
  expiryDate: string;
  totalAmount: number;
  status: string;
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = React.useState<Quotation[]>([]);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [leadId, setLeadId] = React.useState("");
  const [customers, setCustomers] = React.useState<LeadItem[]>([]);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [referenceLoading, setReferenceLoading] = React.useState(false);
  const [referenceError, setReferenceError] = React.useState<string | null>(null);
  const customer = customers.find(item => item.id === leadId);
  const customerName = customer ? customer.company || customer.name : "";
  const loadReferences = React.useCallback(async () => {
    setReferenceLoading(true);
    setReferenceError(null);
    try {
      const [leads, items] = await Promise.all([allPages(crmApi.listLeads), allPages(productsApi.list)]);
      setCustomers(leads);
      setProducts(items);
    } catch (error) {
      setReferenceError(error instanceof Error ? error.message : "Gagal memuat CRM dan master barang");
    } finally { setReferenceLoading(false); }
  }, []);
  const [lines, setLines] = React.useState<QuotationLineInput[]>([{ productId: "", description: "", unit: "pcs", quantity: 1, unitPrice: 0 }]);
  const [selected, setSelected] = React.useState<Quotation | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isConverting, setIsConverting] = React.useState(false);
  const [convertError, setConvertError] = React.useState<string | null>(null);
  const subtotal = (line: QuotationLineInput) => Math.round(line.quantity * line.unitPrice * 100) / 100;
  const totalAmount = Math.round(lines.reduce((sum, line) => sum + subtotal(line), 0) * 100) / 100;
  const updateLine = (index: number, patch: Partial<QuotationLineInput>) => setLines(current => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  const [expiryDate, setExpiryDate] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editCustomerName, setEditCustomerName] = React.useState("");
  const [editLines, setEditLines] = React.useState<QuotationLineInput[]>([]);
  const [editValidUntil, setEditValidUntil] = React.useState("");
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const editSubtotal = (line: QuotationLineInput) => Math.round(line.quantity * line.unitPrice * 100) / 100;
  const editTotalAmount = Math.round(editLines.reduce((sum, line) => sum + editSubtotal(line), 0) * 100) / 100;
  const updateEditLine = (index: number, patch: Partial<QuotationLineInput>) => setEditLines(current => current.map((line, i) => i === index ? { ...line, ...patch } : line));

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
            customerName: q.customerName,
            issueDate: q.createdAt ? q.createdAt.slice(0, 10) : "",
            expiryDate: q.validUntil,
            totalAmount: q.totalAmount,
            status: q.status,
          }))
        );
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Gagal memuat quotation"));
  }, []);

  React.useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleExport = () => {
    downloadCsv(
      "sales-quotations.csv",
      ["Quotation No.", "Customer", "Date Issued", "Valid Until", "Total Estimate", "Status"],
      quotations.map((q) => [q.quotationNumber, q.customerName, q.issueDate, q.expiryDate, q.totalAmount, q.status])
    );
  };

  const handleAddQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (referenceLoading || referenceError || !customer || !customerName.trim() || lines.length === 0 || lines.some(line => !products.some(product => product.id === line.productId) || !line.description.trim() || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0) || !Number.isFinite(totalAmount) || totalAmount >= 1e13) {
      setFormError("Isi nama customer dan minimal satu item dengan kuantitas serta harga yang valid.");
      return;
    }

    const issueDate = new Date().toISOString().slice(0, 10);
    const validUntil = expiryDate || issueDate;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await salesApi.createQuotation({
        leadId,
        customerName: customerName.trim(),
        lines,
        totalAmount,
        validUntil,
      });
      fetchQuotations();
      setIsAddOpen(false);
      setLeadId("");
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

  const handleConvert = async (quotation: Quotation) => {
    setIsConverting(true);
    setConvertError(null);
    try {
      await salesApi.convertQuotationToOrder(quotation.id);
      fetchQuotations();
      setSelected(null);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : "Gagal mengonversi quotation menjadi sales order");
    } finally {
      setIsConverting(false);
    }
  };

  const columns: Column<Quotation>[] = [
    {
      key: "quotationNumber",
      header: "Quotation No.",
      sortable: true,
      render: (q) => <button className="font-mono text-xs font-bold text-brand-primary hover:underline" onClick={() => setSelected(q)}>{q.quotationNumber}</button>,
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      render: (q) => <span className="text-xs font-semibold text-foreground">{q.customerName}</span>,
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
      render: (q) => <MoneyDisplay amount={q.totalAmount} className="text-xs font-bold" />,
    },
    {
      key: "status",
      header: "Status",
      render: (q) => <StatusBadge status={q.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Quotations & Bids"
        description="Issue formal commercial offers, price negotiations, and quote conversions to orders."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => { setIsAddOpen(true); void loadReferences(); }}
        >
          <Plus className="h-3.5 w-3.5" /> New Quotation
        </Button>
      </PageHeader>

      {loadError && <div role="alert" className="text-sm text-rose-700">{loadError} <Button variant="outline" onClick={fetchQuotations}>Retry</Button></div>}
      <DataTable
        columns={columns}
        data={quotations}
        searchKey="quotationNumber"
        searchPlaceholder="Search quotation number or customer..."
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Quotation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddQuotation} className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Customer Name</label>
              <select aria-label="Customer CRM" value={leadId} onChange={e => setLeadId(e.target.value)} required disabled={referenceLoading || isSubmitting} className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm">
                <option value="">{referenceLoading ? "Memuat customer..." : "Pilih customer dari CRM"}</option>
                {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.company || customer.name} — {customer.name}</option>)}
              </select>
              {!referenceLoading && !referenceError && !customers.length && <p className="text-xs text-muted-foreground">Belum ada customer. Tambahkan data di CRM Leads terlebih dahulu.</p>}
              {referenceError && <div role="alert" className="text-xs text-rose-700">{referenceError} <Button type="button" variant="outline" size="sm" onClick={loadReferences}>Retry</Button></div>}
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
                    <span>Subtotal: <MoneyDisplay amount={Number.isFinite(subtotal(line)) ? subtotal(line) : 0} /></span>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Remove item ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines(current => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setLines(current => [...current, { productId: "", description: "", unit: "pcs", quantity: 1, unitPrice: 0 }])}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
              <div className="text-right font-semibold">Total Estimate: <MoneyDisplay amount={Number.isFinite(totalAmount) ? totalAmount : 0} /></div>
            </fieldset>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Valid Until</label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting || referenceLoading || !!referenceError || !customers.length || !products.length}>
                {isSubmitting ? "Menyimpan..." : "Create Quotation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.quotationNumber}</DialogTitle></DialogHeader>
          {selected && <>
            <div className="flex flex-wrap justify-between gap-3 text-sm"><div><p className="font-semibold">{selected.customerName}</p><p>Issued: {selected.issueDate} · Valid until: {selected.expiryDate}</p></div><StatusBadge status={selected.status} /></div>
            {selected.lines.length ? <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="p-2">Item / Description</th><th className="p-2 text-right">Quantity</th><th className="p-2">Unit</th><th className="p-2 text-right">Unit Price</th><th className="p-2 text-right">Subtotal</th></tr></thead>
              <tbody>{selected.lines.map(line => <tr key={line.id} className="border-b"><td className="p-2 whitespace-pre-wrap">{line.description}</td><td className="p-2 text-right">{line.quantity}</td><td className="p-2">{line.unit}</td><td className="p-2 text-right"><MoneyDisplay amount={line.unitPrice} /></td><td className="p-2 text-right"><MoneyDisplay amount={line.subtotal} /></td></tr>)}</tbody>
            </table></div> : <p className="text-sm text-muted-foreground">Quotation lama ini belum memiliki detail item.</p>}
            <div className="text-right font-semibold">Total Estimate: <MoneyDisplay amount={selected.totalAmount} /></div>
            {convertError && <div role="alert" className="text-xs text-rose-700">{convertError}</div>}
            {selected.status !== "Converted" && (
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleOpenEdit(selected)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  type="button"
                  variant="gradient"
                  size="sm"
                  disabled={isConverting}
                  onClick={() => handleConvert(selected)}
                >
                  {isConverting ? "Mengonversi..." : "Convert to Sales Order"}
                </Button>
              </DialogFooter>
            )}
          </>}
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
                    <span>Subtotal: <MoneyDisplay amount={Number.isFinite(editSubtotal(line)) ? editSubtotal(line) : 0} /></span>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Remove edit item ${index + 1}`} disabled={editLines.length === 1} onClick={() => setEditLines(current => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setEditLines(current => [...current, { productId: "", description: "", unit: "pcs", quantity: 1, unitPrice: 0 }])}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
              <div className="text-right font-semibold">Total Estimate: <MoneyDisplay amount={Number.isFinite(editTotalAmount) ? editTotalAmount : 0} /></div>
            </fieldset>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Valid Until</label>
              <Input type="date" value={editValidUntil} onChange={(e) => setEditValidUntil(e.target.value)} />
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
    </div>
  );
}
