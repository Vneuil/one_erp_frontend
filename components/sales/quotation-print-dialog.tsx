"use client";

import * as React from "react";
import Image from "next/image";
import { Printer, X, ExternalLink, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QuotationLine } from "@/lib/api/sales";
import { CustomerItem } from "@/lib/api/customers";
import { ProductItem } from "@/lib/api/products";
import { currencyApi, CurrencyItem } from "@/lib/api/currency";
import { terbilangCurrency, getCurrencyWord } from "@/lib/utils/terbilang";

export interface PrintableQuotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  paymentTerm?: string;
  vatRate?: number;
  vatAmount?: number;
  vatExempt?: boolean;
  totalAmount: number;
  currency?: string;
  status?: string;
  validUntil?: string;
  expiryDate?: string;
  createdAt?: string;
  issueDate?: string;
  notes?: string;
  parentQuotationId?: string;
  parentQuotationNumber?: string;
  revisionNumber?: number;
  isSuperseded?: boolean;
  lines?: QuotationLine[];
}

interface QuotationPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: PrintableQuotation | null;
  customers?: CustomerItem[];
  products?: ProductItem[];
  currencies?: CurrencyItem[];
}

function formatTanggalIndonesia(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const bulan = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

export function QuotationPrintDialog({
  open,
  onOpenChange,
  quotation,
  customers = [],
  products = [],
  currencies: initialCurrencies,
}: QuotationPrintDialogProps) {
  // Load master data currencies
  const [currencies, setCurrencies] = React.useState<CurrencyItem[]>(initialCurrencies || []);

  React.useEffect(() => {
    if (!initialCurrencies || initialCurrencies.length === 0) {
      currencyApi.list().then((r) => setCurrencies(r.data || [])).catch(() => undefined);
    } else {
      setCurrencies(initialCurrencies);
    }
  }, [initialCurrencies]);

  // Matching customer info from Master Data
  const customer = React.useMemo(() => {
    if (!quotation) return null;
    return customers.find(
      (c) =>
        c.name.toLowerCase().trim() === quotation.customerName.toLowerCase().trim() ||
        (quotation.customerName && c.name.toLowerCase().includes(quotation.customerName.toLowerCase()))
    );
  }, [quotation, customers]);

  // Customizable fields for fine-tuning before printing
  const [showCustomizer, setShowCustomizer] = React.useState(false);
  const [customUp, setCustomUp] = React.useState("");
  const [customRef, setCustomRef] = React.useState("");
  const [customDate, setCustomDate] = React.useState("");
  const [customCurrency, setCustomCurrency] = React.useState("IDR");
  const [customNotes, setCustomNotes] = React.useState("");
  const [deliveryTerm, setDeliveryTerm] = React.useState("Harga sampai Gudang Manna Semarang");

  // Sync default state when quotation changes
  React.useEffect(() => {
    if (quotation) {
      const up = customer?.contactPerson
        ? `Bpk. ${customer.contactPerson}`
        : "Bpk. Budi Jatmiko";
      setCustomUp(up);
      setCustomRef(quotation.parentQuotationNumber ? `Rev dari ${quotation.parentQuotationNumber}` : "");
      setCustomDate(formatTanggalIndonesia(quotation.createdAt || quotation.issueDate || new Date().toISOString()));
      setCustomCurrency(quotation.currency || "IDR");
      setCustomNotes(quotation.notes || "");
      setShowCustomizer(false);
    }
  }, [quotation, customer]);

  if (!quotation) return null;

  const handlePrint = () => {
    window.print();
  };

  const lines: QuotationLine[] = quotation.lines || [];
  const primaryUnit = lines.find((l) => l.unit)?.unit || "kg";
  const totalAmount = quotation.totalAmount || lines.reduce((acc, l) => acc + (l.quantity * l.unitPrice), 0);

  // Active currency details from master data
  const currencyObj = currencies.find((c) => c.code === customCurrency);
  const currencyLabel = currencyObj?.name || getCurrencyWord(customCurrency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[94vh] overflow-y-auto p-0 border-none bg-slate-100 sm:rounded-xl">
        {/* Accessible Dialog Header */}
        <div className="sr-only">
          <DialogTitle>Preview Cetak Quotation {quotation.quotationNumber}</DialogTitle>
          <DialogDescription>
            Pratinjau cetak dokumen penawaran harga resmi CV Manna Anugerah Sejahtera
          </DialogDescription>
        </div>

        {/* Top Control Bar (Hidden on print) */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur print:hidden">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Printer className="h-4 w-4 text-emerald-600" />
              Preview Quotation:{" "}
              <span className="font-mono text-emerald-700">{quotation.quotationNumber}</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
              {customCurrency}
            </span>
            {quotation.revisionNumber && quotation.revisionNumber > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Rev {quotation.revisionNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomizer(!showCustomizer)}
              className="gap-1.5 text-xs text-slate-700 hover:text-slate-900"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {showCustomizer ? "Sembunyikan Opsi" : "Sesuaikan UP & Ketentuan"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> Cetak / Simpan ke PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs hidden sm:inline-flex"
            >
              <a
                href={`/sales/quotations/${quotation.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Tab Penuh
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Optional Customizer Panel */}
        {showCustomizer && (
          <div className="bg-emerald-50/70 border-b border-emerald-200 px-6 py-3.5 text-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 print:hidden">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">UP (Nama Kontak):</label>
              <Input
                value={customUp}
                onChange={(e) => setCustomUp(e.target.value)}
                placeholder="Contoh: Bpk. Budi Jatmiko"
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ref # (Referensi):</label>
              <Input
                value={customRef}
                onChange={(e) => setCustomRef(e.target.value)}
                placeholder="Contoh: PO 070.1026"
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tanggal Dokumen:</label>
              <Input
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                placeholder="Contoh: 31 Okt 2026"
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mata Uang:</label>
              <select
                value={customCurrency}
                onChange={(e) => setCustomCurrency(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
              >
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
                    <option value="EUR">EUR (Euro)</option>
                    <option value="CNY">CNY (Chinese Yuan)</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Skema Pengiriman:</label>
              <Input
                value={deliveryTerm}
                onChange={(e) => setDeliveryTerm(e.target.value)}
                placeholder="Harga sampai Gudang Manna Semarang"
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="sm:col-span-2 md:col-span-5">
              <label className="font-semibold text-slate-700 block mb-1">Catatan Tambahan (NB):</label>
              <Textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Tambahkan syarat pembayaran atau catatan spesifikasi..."
                className="h-14 text-xs bg-white resize-none"
              />
            </div>
          </div>
        )}

        {/* Paper Container - Matches exact A4 standard layout of official PDF */}
        <div className="p-4 sm:p-8 flex justify-center bg-slate-200/70 print:p-0 print:bg-white">
          <div
            id="quotation-print-document"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 flex flex-col justify-between"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            <div>
              {/* Header: Logo Left, Company Info Right */}
              <div className="flex items-start justify-between border-b-0 pb-2">
                <div className="w-[180px] pt-1">
                  <Image
                    src="/logo.png"
                    alt="FOOD FOR LIFE manna"
                    width={160}
                    height={55}
                    className="h-auto w-[150px] object-contain"
                    priority
                  />
                </div>
                <div className="text-right space-y-0.5 text-black">
                  <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-black border-b border-black pb-0.5 inline-block">
                    CV. MANNA ANUGERAH SEJAHTERA
                  </h2>
                  <p className="text-[11px] leading-tight">
                    Kawasan Industri Candi. Jl. Gatot Subroto Blok 23/6A
                  </p>
                  <p className="text-[11px] leading-tight">
                    Semarang, Central Java - Indonesia
                  </p>
                  <p className="text-[11px] leading-tight">
                    Tel : +62 24 7626937
                  </p>
                  <p className="text-[11px] leading-tight">
                    Email : fenesohk@yahoo.com
                  </p>
                </div>
              </div>

              {/* Customer Box (Messrs) & Metadata */}
              <div className="flex items-start justify-between mt-6">
                <div className="w-[300px] sm:w-[340px]">
                  <span className="text-[11px] font-medium text-black block mb-1">
                    Messrs :
                  </span>
                  <div className="border border-black p-2.5 min-h-[72px] flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-xs text-black block">
                        {customer?.name || quotation.customerName}
                      </span>
                      {customer?.address && (
                        <span className="text-[10px] text-black block leading-tight mt-0.5">
                          {customer.address}
                          {customer.city ? `, ${customer.city}` : ""}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-black mt-2 block">
                      UP : {customUp || (customer?.contactPerson ? `Bpk. ${customer.contactPerson}` : "Bpk. Budi Jatmiko")}
                    </span>
                  </div>
                </div>

                <div className="text-left text-xs space-y-1.5 pt-3">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-black min-w-[45px]">Ref # :</span>
                    <span className="text-black font-mono">
                      {customRef || (quotation.parentQuotationNumber ? `Rev dari ${quotation.parentQuotationNumber}` : "-")}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-black min-w-[45px]">Date :</span>
                    <span className="text-black">
                      Semarang, {customDate || formatTanggalIndonesia(quotation.createdAt || quotation.issueDate)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center my-6">
                <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider underline underline-offset-4 text-black">
                  QUOTATION
                </h1>
                <h2 className="text-sm sm:text-base font-bold text-black mt-1">
                  {quotation.quotationNumber}
                </h2>
              </div>

              {/* Items Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse border border-black text-xs text-black">
                  <thead>
                    <tr className="border-b border-black font-bold">
                      <th className="border border-black p-2 text-left w-[48%] align-bottom">
                        Description of Content
                      </th>
                      <th className="border border-black p-2 text-center w-[14%] align-bottom">
                        <div>Qty</div>
                        <div className="text-[10px] font-normal lowercase">({primaryUnit})</div>
                      </th>
                      <th className="border border-black p-2 text-right w-[18%] align-bottom">
                        <div>Unit Price</div>
                        <div className="text-[10px] font-normal">{currencyLabel}</div>
                      </th>
                      <th className="border border-black p-2 text-right w-[20%] align-bottom">
                        <div>Total Amount</div>
                        <div className="text-[10px] font-normal">{currencyLabel}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length > 0 ? (
                      lines.map((l, idx) => {
                        const product = products.find((p) => p.id === l.productId);
                        const desc = l.description || product?.name || "Item Penawaran";
                        const subtotal = l.subtotal || l.quantity * l.unitPrice;
                        return (
                          <tr key={idx} className="border-b border-black">
                            <td className="border border-black p-2 text-left leading-relaxed">
                              {desc}
                            </td>
                            <td className="border border-black p-2 text-center font-mono">
                              {l.quantity > 0 ? l.quantity.toLocaleString("en-US") : "-"}
                            </td>
                            <td className="border border-black p-2 text-right font-mono">
                              {l.unitPrice > 0 ? l.unitPrice.toLocaleString("en-US") : "-"}
                            </td>
                            <td className="border border-black p-2 text-right font-mono">
                              {subtotal > 0 ? subtotal.toLocaleString("en-US") : "-"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="border border-black p-4 text-center text-slate-500">
                          Tidak ada rincian item.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black font-bold">
                      <td colSpan={3} className="border border-black p-2 text-left font-bold">
                        Total : amount in {currencyLabel}
                      </td>
                      <td className="border border-black p-2 text-right font-mono font-bold">
                        {totalAmount.toLocaleString("en-US")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Terbilang */}
              <div className="mt-3 text-xs text-black">
                <span className="font-semibold">Terbilang : </span>
                <span className="italic">{terbilangCurrency(totalAmount, customCurrency, currencyObj?.name)}</span>
              </div>

              {/* Notes / NB */}
              <div className="mt-6 text-xs text-black space-y-1">
                <p className="font-bold underline">NB :</p>
                <ol className="list-decimal list-inside space-y-0.5 text-black">
                  {(quotation.validUntil || quotation.expiryDate) && (
                    <li>
                      Masa Berlaku Penawaran : s/d {formatTanggalIndonesia(quotation.validUntil || quotation.expiryDate)}
                    </li>
                  )}
                  {quotation.paymentTerm && <li>Syarat Pembayaran (TOP) : {quotation.paymentTerm}</li>}
                  {deliveryTerm && <li>{deliveryTerm}</li>}
                  {customNotes && <li>{customNotes}</li>}
                </ol>
              </div>

              {/* Closing & Signature */}
              <div className="mt-8 text-xs text-black">
                <p>Terima kasih.</p>
                <p className="mt-4">Hormat kami,</p>
                <p className="font-semibold">CV. Manna Anugerah Sejahtera</p>

                {/* Signature image */}
                <div className="h-16 flex items-center pl-2 my-1 select-none">
                  <Image
                    src="/signature-steven.png"
                    alt="Steven Santoso Signature"
                    width={130}
                    height={55}
                    className="h-14 w-auto object-contain"
                  />
                </div>
                <div className="w-48 border-b border-black"></div>
                <p className="font-bold text-xs text-black mt-1 underline">
                  Steven Santoso
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Print Stylesheet for Browser window.print() */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #quotation-print-document,
            #quotation-print-document * {
              visibility: visible !important;
            }
            #quotation-print-document {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              min-height: auto !important;
              height: auto !important;
              margin: 0 !important;
              padding: 12mm 18mm !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
