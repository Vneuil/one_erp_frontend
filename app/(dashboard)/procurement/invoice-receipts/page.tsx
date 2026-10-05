"use client";

import * as React from "react";
import { Plus, Receipt } from "lucide-react";
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
import { procurementApi, InvoiceReceiptItem } from "@/lib/api/procurement";

export default function InvoiceReceiptsPage() {
  const [receipts, setReceipts] = React.useState<InvoiceReceiptItem[]>([]);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [supplierId, setSupplierId] = React.useState("");
  const [supplierName, setSupplierName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<{ invoiceNo: string; amount: number; remarks: string }[]>([
    { invoiceNo: "", amount: 0, remarks: "" },
  ]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const loadReceipts = React.useCallback(() => {
    procurementApi
      .listInvoiceReceipts()
      .then((res) => setReceipts(res.data || []))
      .catch((err) => {
        console.error("Failed to load invoice receipts", err);
        setLoadError("Gagal memuat tanda terima nota dari server.");
      });
  }, []);

  React.useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || lines.length === 0 || isSubmitting) return;
    
    setIsSubmitting(true);
    setFormError(null);
    try {
      // In a real app, supplierId would come from a supplier picker. For now we mock it if empty.
      const sId = supplierId || "00000000-0000-0000-0000-000000000000";
      
      const res = await procurementApi.createInvoiceReceipt({
        date: new Date().toISOString().split("T")[0],
        supplierId: sId,
        supplierName,
        notes,
        lines,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal membuat tanda terima nota.");
      }
      setIsNewOpen(false);
      setSupplierId("");
      setSupplierName("");
      setNotes("");
      setLines([{ invoiceNo: "", amount: 0, remarks: "" }]);
      setNotice("Tanda terima nota berhasil dibuat.");
      loadReceipts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat tanda terima nota.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<InvoiceReceiptItem>[] = [
    {
      key: "receiptNo",
      header: "TTN Number",
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-bold text-brand-primary">{r.receiptNo}</span>,
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.date}</span>,
    },
    {
      key: "supplierName",
      header: "Supplier",
      sortable: true,
      render: (r) => <span className="text-xs font-semibold text-foreground">{r.supplierName}</span>,
    },
    {
      key: "notes",
      header: "Notes",
      render: (r) => <span className="text-xs text-muted-foreground">{r.notes || "-"}</span>,
    },
    {
      key: "id",
      header: "Total Invoices",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold">{r.lines?.length || 0} Invoices</span>
          <MoneyDisplay amount={r.lines?.reduce((sum, l) => sum + l.amount, 0) || 0} className="text-xs font-bold text-emerald-600" />
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tanda Terima Nota (Invoice Receipts)"
        description="Pencatatan penerimaan dokumen tagihan fisik (invoice/nota) dari supplier sebelum diproses menjadi Purchase Invoice."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => {
            setFormError(null);
            setIsNewOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Buat Tanda Terima
        </Button>
      </PageHeader>

      {notice && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {notice}
        </div>
      )}

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      <DataTable
        columns={columns}
        data={receipts}
        searchKey="receiptNo"
        searchPlaceholder="Cari nomor TTN atau supplier..."
      />

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-brand-primary" />
              <span>Buat Tanda Terima Nota (TTN)</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Supplier Name *</label>
                <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required placeholder="PT Supplier..." className="text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Notes</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan..." className="text-xs" />
              </div>
            </div>

            <div className="border rounded-md p-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Daftar Tagihan (Invoices)</label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setLines([...lines, { invoiceNo: "", amount: 0, remarks: "" }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Tambah Baris
                </Button>
              </div>
              
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input 
                    placeholder="No. Invoice" 
                    value={line.invoiceNo} 
                    onChange={(e) => {
                      const newLines = [...lines];
                      newLines[i].invoiceNo = e.target.value;
                      setLines(newLines);
                    }} 
                    required 
                    className="text-xs"
                  />
                  <Input 
                    type="number" 
                    placeholder="Nominal" 
                    value={line.amount || ""} 
                    onChange={(e) => {
                      const newLines = [...lines];
                      newLines[i].amount = Number(e.target.value);
                      setLines(newLines);
                    }} 
                    required 
                    className="text-xs w-32"
                  />
                  <Input 
                    placeholder="Keterangan (opsional)" 
                    value={line.remarks} 
                    onChange={(e) => {
                      const newLines = [...lines];
                      newLines[i].remarks = e.target.value;
                      setLines(newLines);
                    }} 
                    className="text-xs"
                  />
                  {lines.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="text-rose-500 h-8 px-2"
                      onClick={() => {
                        const newLines = [...lines];
                        newLines.splice(i, 1);
                        setLines(newLines);
                      }}
                    >
                      X
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>Batal</Button>
              <Button type="submit" variant="gradient" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Tanda Terima"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
