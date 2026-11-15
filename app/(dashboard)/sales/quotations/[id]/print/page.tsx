"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { salesApi, QuotationItem, QuotationLine } from "@/lib/api/sales";
import { customersApi, CustomerItem } from "@/lib/api/customers";
import { productsApi, ProductItem } from "@/lib/api/products";
import { currencyApi, CurrencyItem } from "@/lib/api/currency";
import { terbilangCurrency, getCurrencyWord } from "@/lib/utils/terbilang";

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

export default function QuotationPrintPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const autoPrint = searchParams.get("auto") === "true";

  const [loading, setLoading] = React.useState(true);
  const [quotation, setQuotation] = React.useState<QuotationItem | null>(null);
  const [customer, setCustomer] = React.useState<CustomerItem | null>(null);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [currencies, setCurrencies] = React.useState<CurrencyItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [qRes, cRes, pRes, curRes] = await Promise.all([
          salesApi.getQuotation(id),
          customersApi.list({ page: 1, perPage: 100 }),
          productsApi.list({ page: 1, perPage: 100 }),
          currencyApi.list().catch(() => ({ data: [] })),
        ]);

        if (!active) return;
        const q = qRes.data;
        setQuotation(q);
        setProducts(pRes.data || []);
        setCurrencies(curRes.data || []);

        const matchedCustomer = (cRes.data || []).find(
          (c) =>
            c.name.toLowerCase().trim() === q.customerName.toLowerCase().trim() ||
            (q.customerName && c.name.toLowerCase().includes(q.customerName.toLowerCase()))
        );
        setCustomer(matchedCustomer || null);

        if (autoPrint) {
          setTimeout(() => {
            window.print();
          }, 600);
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Gagal memuat dokumen penawaran";
        setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
    return () => {
      active = false;
    };
  }, [id, autoPrint]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-semibold text-slate-700">Menyiapkan dokumen Quotation...</p>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
        <div className="max-w-md bg-white p-6 rounded-xl border border-red-200 shadow-sm text-center">
          <p className="text-red-600 font-bold mb-2">Gagal Menampilkan Dokumen</p>
          <p className="text-xs text-slate-600 mb-4">{error || "Data quotation tidak ditemukan."}</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/sales/quotations">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali ke Quotations
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const lines: QuotationLine[] = quotation.lines || [];
  const primaryUnit = lines.find((l) => l.unit)?.unit || "kg";
  const totalAmount = quotation.totalAmount || lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);

  const currencyCode = quotation.currency || "IDR";
  const currencyObj = currencies.find((c) => c.code === currencyCode);
  const currencyLabel = currencyObj?.name || getCurrencyWord(currencyCode);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900">
      {/* Top Controls Toolbar (Hidden on print) */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/sales/quotations">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali
            </Link>
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <h1 className="text-sm font-bold text-slate-800">
            Quotation: <span className="font-mono text-emerald-700">{quotation.quotationNumber}</span>
          </h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            {currencyCode}
          </span>
          {quotation.revisionNumber && quotation.revisionNumber > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Rev {quotation.revisionNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Printer className="h-4 w-4" /> Cetak / Simpan ke PDF
          </Button>
        </div>
      </div>

      {/* A4 Paper Canvas */}
      <div className="p-4 sm:p-10 flex justify-center print:p-0">
        <div
          id="quotation-print-document"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-2xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 flex flex-col justify-between"
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
                    UP : {customer?.contactPerson ? `Bpk. ${customer.contactPerson}` : "Bpk. Budi Jatmiko"}
                  </span>
                </div>
              </div>

              <div className="text-left text-xs space-y-1.5 pt-3">
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-black min-w-[45px]">Ref # :</span>
                  <span className="text-black font-mono">
                    {quotation.parentQuotationNumber ? `Rev dari ${quotation.parentQuotationNumber}` : "-"}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-black min-w-[45px]">Date :</span>
                  <span className="text-black">
                    Semarang, {formatTanggalIndonesia(quotation.createdAt)}
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
              <span className="italic">{terbilangCurrency(totalAmount, currencyCode, currencyObj?.name)}</span>
            </div>

            {/* Notes / NB */}
            <div className="mt-6 text-xs text-black space-y-1">
              <p className="font-bold underline">NB :</p>
              <ol className="list-decimal list-inside space-y-0.5 text-black">
                {quotation.validUntil && (
                  <li>
                    Masa Berlaku Penawaran : s/d {formatTanggalIndonesia(quotation.validUntil)}
                  </li>
                )}
                <li>Harga sampai Gudang Manna Semarang</li>
                {quotation.notes && <li>{quotation.notes}</li>}
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
    </div>
  );
}
