"use client";

import * as React from "react";
import { Plus, Eye, FileText, CheckCircle2, MessageSquare, XCircle, Trash2, Download, Upload, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useConfirm, useAlert } from "@/components/shared/confirm-modal";
import { customersApi, CustomerItem } from "@/lib/api/customers";
import { productsApi, ProductItem, isProductActive } from "@/lib/api/products";
import { currencyApi, CurrencyItem } from "@/lib/api/currency";
import { pricingApi, PaymentTermItem } from "@/lib/api/pricing";
import { salesApi, customerPosApi, CustomerPOItem, CustomerPOLineInput } from "@/lib/api/sales";
import { usePermission } from "@/lib/hooks/use-permission";

const selectClass = "flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-xs";

export default function CustomerPOsPage() {
  const { canCreate: canCreateSales, canDelete: canDeleteSales } = usePermission("sales");
  const confirm = useConfirm();
  const alert = useAlert();

  const [items, setItems] = React.useState<CustomerPOItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // References
  const [customers, setCustomers] = React.useState<CustomerItem[]>([]);
  const [allProducts, setAllProducts] = React.useState<ProductItem[]>([]);
  const productMap = React.useMemo(() => new Map(allProducts.map((p) => [p.id, p])), [allProducts]);
  const products = React.useMemo(() => allProducts.filter(isProductActive), [allProducts]);
  const [currencies, setCurrencies] = React.useState<CurrencyItem[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedPo, setSelectedPo] = React.useState<CustomerPOItem | null>(null);

  // Form state
  const [paymentTerms, setPaymentTerms] = React.useState<PaymentTermItem[]>([]);
  const [paymentTermId, setPaymentTermId] = React.useState("");
  const [paymentTerm, setPaymentTerm] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [poNumber, setPoNumber] = React.useState("");
  const [poDate, setPoDate] = React.useState("");
  const [currency, setCurrency] = React.useState("IDR");
  const [attachmentKey, setAttachmentKey] = React.useState("");
  const [attachmentName, setAttachmentName] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<CustomerPOLineInput[]>([
    { productId: "", productName: "", unit: "pcs", quantity: 1, unitPrice: 0 },
  ]);
  const [saving, setSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerPosApi.list({ perPage: 100 });
      setItems(res.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar PO Masuk");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
    customersApi.list({ perPage: 200 }).then((r) => setCustomers((r.data || []).filter((c) => c.status?.toLowerCase() !== "inactive"))).catch(() => undefined);
    productsApi.list({ perPage: 500 }).then((r) => setAllProducts(r.data || [])).catch(() => undefined);
    currencyApi.list().then((r) => setCurrencies(r.data || [])).catch(() => undefined);
    pricingApi.listPaymentTerms().then((r) => setPaymentTerms(r.data || [])).catch(() => undefined);
  }, [loadData]);

  const resetForm = () => {
    setCustomerId("");
    setPaymentTermId("");
    setPaymentTerm("");
    setPoNumber("");
    setPoDate(new Date().toISOString().slice(0, 10));
    setCurrency("IDR");
    setAttachmentKey("");
    setAttachmentName("");
    setNotes("");
    setLines([{ productId: "", productName: "", unit: "pcs", quantity: 1, unitPrice: 0 }]);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const updateLine = (i: number, patch: Partial<CustomerPOLineInput>) => {
    setLines((prev) => prev.map((line, idx) => (idx === i ? { ...line, ...patch } : line)));
  };

  const onPickProduct = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    updateLine(i, {
      productId,
      productName: p?.name || "",
      unit: p?.unit || "pcs",
      unitPrice: p?.sellingPrice || 0,
    });
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await salesApi.uploadAttachment(file);
      setAttachmentKey(res.data.key);
      setAttachmentName(res.data.filename || file.name);
    } catch (err) {
      await alert({
        title: "Gagal Mengunggah Dokumen",
        message: err instanceof Error ? err.message : "Terjadi kesalahan upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    const selCust = customers.find((c) => c.id === customerId);
    if (!selCust || !poNumber.trim()) {
      await alert({ title: "Data Belum Lengkap", message: "Pilih pelanggan dan isi nomor PO Masuk.", variant: "warning" });
      return;
    }

    const validLines = lines.filter((l) => l.productName.trim() && l.quantity > 0);
    if (validLines.length === 0) {
      await alert({ title: "Barang Belum Diisi", message: "Isi minimal satu barang dengan kuantiti valid.", variant: "warning" });
      return;
    }

    setSaving(true);
    try {
      await customerPosApi.create({
        customerId: selCust.id,
        customerName: selCust.name,
        paymentTermId: paymentTermId || undefined,
        paymentTerm: paymentTerm || undefined,
        poNumber: poNumber.trim(),
        poDate: poDate || undefined,
        attachment: attachmentKey || undefined,
        currency,
        notes: notes || undefined,
        lines: validLines,
      });
      setIsCreateOpen(false);
      resetForm();
      void loadData();
      await alert({ title: "Berhasil", message: "PO Masuk dari pelanggan berhasil dicatat." });
    } catch (err) {
      await alert({ title: "Gagal Mencatat PO Masuk", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Flow Decision: Agree -> Go to Proforma Invoice (PI)
  const handleAgreeAndCreatePI = async (po: CustomerPOItem) => {
    const ok = await confirm({
      title: "Setujui PO Masuk (Agree)?",
      message: `Harga dan kuantiti pada ${po.poNumber} disetujui. Lanjutkan pembuatan Proforma Invoice (PI) untuk mengunci DP?`,
      confirmText: "Lanjut Buat PI",
    });
    if (!ok) return;

    try {
      await customerPosApi.agree(po.id);
      setSelectedPo(null);
      window.location.href = `/sales/trade-invoices?tab=PI&fromCustomerPoId=${po.id}`;
    } catch (err) {
      await alert({ title: "Gagal", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    }
  };

  // Flow Decision: Disagree -> Go to Quotation (Counter-Offer)
  const handleDisagreeAndCreateQuotation = async (po: CustomerPOItem) => {
    const ok = await confirm({
      title: "Ajukan Penawaran Balasan (Quotation)?",
      message: `Harga atau kuantiti pada ${po.poNumber} tidak disetujui (Disagree). Buat penawaran balasan (Quotation) dari pihak Manna untuk negosiasi ulang?`,
      confirmText: "Buat Quotation Balasan",
    });
    if (!ok) return;

    try {
      await customerPosApi.negotiate(po.id);
      setSelectedPo(null);
      const params = new URLSearchParams({
        new: "true",
        fromCustomerPoId: po.id,
        refPo: po.poNumber,
        customer: po.customerName,
      });
      window.location.href = `/sales/quotations?${params.toString()}`;
    } catch (err) {
      await alert({ title: "Gagal", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    }
  };

  // Cancel PO
  const handleCancelPO = async (po: CustomerPOItem) => {
    const ok = await confirm({
      title: "Batalkan PO Masuk?",
      message: `Batalkan pencatatan PO Masuk ${po.poNumber}? Transaksi ini tidak akan diproses lebih lanjut.`,
      confirmText: "Batalkan PO",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      await customerPosApi.cancel(po.id);
      setSelectedPo(null);
      void loadData();
    } catch (err) {
      await alert({ title: "Gagal", message: err instanceof Error ? err.message : "Kesalahan server", variant: "destructive" });
    }
  };

  const getStatusBadge = (po: CustomerPOItem) => {
    switch (po.status) {
      case "Agreed":
        return (
          <StatusBadge
            status="approved"
            label={po.tradeInvoiceNumber ? `Disetujui - PI (${po.tradeInvoiceNumber})` : "Disetujui (Agree)"}
          />
        );
      case "Negotiating":
        return (
          <StatusBadge
            status="pending"
            label={po.quotationNumber ? `Negosiasi (${po.quotationNumber})` : "Negosiasi (Quotation)"}
          />
        );
      case "Cancelled":
        return <StatusBadge status="cancelled" label="Dibatalkan" />;
      default:
        return <StatusBadge status="draft" label="Menunggu Review" />;
    }
  };

  const columns: Column<CustomerPOItem>[] = [
    {
      key: "poNumber",
      header: "Nomor PO Masuk",
      sortable: true,
      render: (i) => (
        <button
          type="button"
          className="font-mono text-xs font-bold text-brand-primary hover:underline text-left"
          onClick={() => setSelectedPo(i)}
        >
          {i.poNumber}
        </button>
      ),
    },
    {
      key: "poDate",
      header: "Tanggal PO",
      sortable: true,
      render: (i) => <span className="text-xs text-muted-foreground">{i.poDate || "-"}</span>,
    },
    {
      key: "customerName",
      header: "Pelanggan",
      sortable: true,
      render: (i) => <span className="text-xs font-semibold text-foreground">{i.customerName}</span>,
    },
    {
      key: "paymentTerm",
      header: "Termin (TOP)",
      render: (i) => <span className="text-xs text-foreground font-medium">{i.paymentTerm || "-"}</span>,
    },
    {
      key: "attachment",
      header: "Dokumen PO",
      render: (i) =>
        i.attachment ? (
          <a
            href={i.attachment.startsWith("http") ? i.attachment : `/api/attachments?key=${encodeURIComponent(i.attachment)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-brand-primary font-medium hover:underline"
          >
            <FileText className="h-3 w-3" /> Lampiran
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
    {
      key: "totalAmount",
      header: "Total Nilai",
      align: "right",
      sortable: true,
      render: (i) => <MoneyDisplay amount={i.totalAmount} currency={i.currency} className="text-xs font-bold" />,
    },
    {
      key: "status",
      header: "Status Alur",
      render: (i) => getStatusBadge(i),
    },
    {
      key: "id",
      header: "Aksi",
      render: (i) => (
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => setSelectedPo(i)}>
          <Eye className="h-3 w-3" /> Review
        </Button>
      ),
    },
  ];

  const displayedItems = React.useMemo(() => {
    if (allProducts.length === 0) return items;
    return items.filter((po) => {
      if (!po.lines || po.lines.length === 0) return true;
      return po.lines.every((l) => {
        if (!l.productId) return true;
        const p = productMap.get(l.productId);
        return p ? isProductActive(p) : false;
      });
    });
  }, [items, allProducts, productMap]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="PO Masuk (Purchase Order Pelanggan)"
        description="Penerimaan dan review Purchase Order dari pembeli. Tentukan apakah PO disetujui (Agree) untuk lanjut ke Proforma Invoice, atau ditolak/nego (Disagree) untuk diterbitkan Quotation balasan."
      >
        {canCreateSales && (
          <Button onClick={handleOpenCreate} variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> Catat PO Masuk
          </Button>
        )}
      </PageHeader>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={displayedItems}
        isLoading={loading}
        searchKey="poNumber"
        searchPlaceholder="Cari nomor PO atau nama pelanggan..."
      />

      {/* Modal Catat PO Masuk */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catat Purchase Order (PO Masuk) dari Pelanggan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePO} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Pelanggan *</label>
                <select
                  className={selectClass}
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    const c = customers.find((x) => x.id === e.target.value);
                    if (c?.paymentTermId) {
                      setPaymentTermId(c.paymentTermId);
                      setPaymentTerm(c.paymentTermName || "");
                    } else if (c?.paymentTermName) {
                      setPaymentTerm(c.paymentTermName);
                      const matched = paymentTerms.find((p) => p.name === c.paymentTermName);
                      if (matched) setPaymentTermId(matched.id);
                    }
                  }}
                  required
                >
                  <option value="">— Pilih Pelanggan —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Term of Payment (TOP)</label>
                <select
                  className={selectClass}
                  value={paymentTermId}
                  onChange={(e) => {
                    const pt = paymentTerms.find((p) => p.id === e.target.value);
                    setPaymentTermId(e.target.value);
                    setPaymentTerm(pt ? pt.name : "");
                  }}
                >
                  <option value="">-- Pilih TOP --</option>
                  {paymentTerms.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.days} hari)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Nomor PO Pembeli *</label>
                <Input
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="Contoh: PO 070.1026 - PBP"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tanggal Dokumen PO</label>
                <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Mata Uang</label>
                <select className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {currencies.length > 0 ? (
                    currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.name})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="IDR">IDR (Rupiah)</option>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="CNY">CNY (Chinese Yuan)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Upload Dokumen PO Masuk (Scan PDF / Foto)</label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                disabled={uploading}
                onChange={(e) => onUpload(e.target.files?.[0])}
              />
              {attachmentName && <span className="text-[11px] text-emerald-700 font-medium">Terunggah: {attachmentName}</span>}
            </div>

            {/* Line Items */}
            <div className="space-y-2 rounded-lg border border-border p-3">
              <label className="font-semibold text-foreground text-xs block">Rincian Barang &amp; Harga dari Pembeli *</label>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center rounded border p-2 bg-slate-50">
                  <div className="md:col-span-4">
                    <select
                      className={selectClass}
                      value={l.productId || ""}
                      onChange={(e) => onPickProduct(i, e.target.value)}
                    >
                      <option value="">— Pilih Produk Master —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      placeholder="Nama/Spek Barang di PO"
                      value={l.productName}
                      onChange={(e) => updateLine(i, { productName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      placeholder="Qty"
                      value={l.quantity}
                      onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Harga PO"
                      value={l.unitPrice}
                      onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="md:col-span-1 text-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 text-xs"
                onClick={() => setLines((prev) => [...prev, { productId: "", productName: "", unit: "pcs", quantity: 1, unitPrice: 0 }])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Barang
              </Button>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Catatan Tambahan</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="cth: Kemasan sak 25 kg, pengiriman akhir bulan"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={saving || uploading}>
                {saving ? "Menyimpan..." : "Simpan PO Masuk"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detail PO Masuk & Pengambilan Keputusan (Agree / Disagree) */}
      <Dialog open={!!selectedPo} onOpenChange={(open) => !open && setSelectedPo(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                PO Masuk: {selectedPo?.poNumber}
              </DialogTitle>
              {selectedPo && getStatusBadge(selectedPo)}
            </div>
          </DialogHeader>

          {selectedPo && (
            <div className="space-y-4 text-xs">
              {/* Infobox Status: Agreed & PI Issued */}
              {(selectedPo.status === "Agreed" || selectedPo.tradeInvoiceNumber) ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      PO Masuk Telah Disetujui (Agree) &amp; PI Diterbitkan
                    </h4>
                    <span className="text-[11px] font-semibold bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      PI Terbit
                    </span>
                  </div>
                  <p className="text-[12px] text-emerald-800 leading-relaxed">
                    PO ini telah disetujui. Dokumen <strong>Proforma Invoice (PI)</strong> telah resmi diterbitkan untuk penagihan Down Payment (DP) kepada pelanggan.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                    {selectedPo.tradeInvoiceNumber && (
                      <span className="font-semibold text-emerald-950 bg-white border border-emerald-200 px-2.5 py-1 rounded-md">
                        No. Proforma Invoice: <strong>{selectedPo.tradeInvoiceNumber}</strong>
                      </span>
                    )}
                    {selectedPo.quotationNumber && (
                      <span className="text-muted-foreground bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                        Melalui Penawaran: <strong>{selectedPo.quotationNumber}</strong>
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="gradient"
                      size="sm"
                      className="gap-1.5 font-semibold text-xs ml-auto bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        window.location.href = `/sales/trade-invoices?tab=PI${selectedPo.tradeInvoiceId ? `&viewId=${selectedPo.tradeInvoiceId}` : ""}`;
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Buka Dokumen Proforma Invoice (PI) &rarr;
                    </Button>
                  </div>
                </div>
              ) : (selectedPo.status === "Negotiating" || selectedPo.quotationNumber) ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-amber-600" />
                      PO Masuk Dalam Tahap Negosiasi (Quotation Balasan)
                    </h4>
                    <span className="text-[11px] font-semibold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                      Negosiasi Aktif
                    </span>
                  </div>
                  <p className="text-[12px] text-amber-900 leading-relaxed">
                    Harga atau kuantiti PO ini diajukan penawaran balasan (Quotation) oleh internal Manna. Segala revisi negosiasi dan persetujuan akhir (penerbitan PI) dilakukan di modul <strong>Quotations</strong>.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                    {selectedPo.quotationNumber && (
                      <span className="font-semibold text-amber-950 bg-white border border-amber-300 px-2.5 py-1 rounded-md">
                        No. Quotation Balasan: <strong>{selectedPo.quotationNumber}</strong>
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-semibold text-xs border-amber-400 text-amber-950 bg-white hover:bg-amber-100"
                      onClick={() => {
                        window.location.href = "/sales/quotations";
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-amber-700" /> Buka Modul Quotations (Lanjut / Revisi / Setujui Jadi PI) &rarr;
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-rose-600 hover:bg-rose-50 ml-auto"
                      onClick={() => handleCancelPO(selectedPo)}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Batalkan PO
                    </Button>
                  </div>
                </div>
              ) : selectedPo.status === "Cancelled" ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>PO Masuk ini telah <strong>dibatalkan</strong> dan tidak diproses lebih lanjut.</span>
                </div>
              ) : (
                <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4 space-y-2">
                  <h4 className="font-bold text-brand-primary text-sm">Keputusan Review PO Masuk (Agree or Disagree?)</h4>
                  <p className="text-muted-foreground text-[11px]">
                    Tinjau harga dan kuantiti yang diajukan oleh pembeli pada tabel di bawah. Pilih keputusan bisnis Anda:
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="gradient"
                      size="sm"
                      className="gap-1.5 font-semibold text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAgreeAndCreatePI(selectedPo)}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Setuju (Agree) → Terbitkan PI
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-semibold text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                      onClick={() => handleDisagreeAndCreateQuotation(selectedPo)}
                    >
                      <MessageSquare className="h-4 w-4 text-amber-700" /> Tidak Setuju → Buat Quotation Balasan
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 ml-auto"
                      onClick={() => handleCancelPO(selectedPo)}
                    >
                      <XCircle className="h-4 w-4" /> Batalkan PO
                    </Button>
                  </div>
                </div>
              )}

              {/* Data Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Pelanggan</span>
                  <span className="font-semibold text-foreground text-xs">{selectedPo.customerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tanggal PO</span>
                  <span className="font-semibold text-foreground text-xs">{selectedPo.poDate || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Mata Uang</span>
                  <span className="font-semibold text-foreground text-xs">{selectedPo.currency}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Dokumen PO</span>
                  {selectedPo.attachment ? (
                    <a
                      href={selectedPo.attachment.startsWith("http") ? selectedPo.attachment : `/api/attachments?key=${encodeURIComponent(selectedPo.attachment)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-primary font-semibold hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" /> Unduh Dokumen
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </div>

              {selectedPo.notes && (
                <div className="text-[11px] text-muted-foreground bg-white p-2 rounded border">
                  <strong>Catatan:</strong> {selectedPo.notes}
                </div>
              )}

              {/* Tabel Barang */}
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-left border-b font-semibold">
                    <tr>
                      <th className="p-2">Barang / Deskripsi</th>
                      <th className="p-2 text-right">Kuantiti</th>
                      <th className="p-2">Satuan</th>
                      <th className="p-2 text-right">Harga yang Diajukan ({selectedPo.currency})</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPo.lines.map((l, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2 font-medium">{l.productName}</td>
                        <td className="p-2 text-right font-mono">{l.quantity.toLocaleString("id-ID")}</td>
                        <td className="p-2">{l.unit}</td>
                        <td className="p-2 text-right font-mono">
                          {selectedPo.currency} {l.unitPrice.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right font-mono font-semibold">
                          {selectedPo.currency} {l.subtotal.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right text-sm font-bold">
                Total Nilai PO: {selectedPo.currency} {selectedPo.totalAmount.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

