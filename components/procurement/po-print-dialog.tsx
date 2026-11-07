"use client";

import * as React from "react";
import Image from "next/image";
import { Printer, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PurchaseOrderItem } from "@/lib/api/procurement";
import { ProductItem } from "@/lib/api/products";
import { SupplierItem } from "@/lib/api/suppliers";

interface PoPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrderItem | null;
  products: ProductItem[];
  suppliers: SupplierItem[];
}

/**
 * Converts a numeric amount to Indonesian Terbilang format.
 * E.g. 561600000 -> "Lima Ratus Enam Puluh Satu Juta Enam Ratus Ribu Rupiah"
 */
function angkaKeTerbilang(nilai: number): string {
  const bilangan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  function sebut(x: number): string {
    x = Math.floor(Math.abs(x));
    if (x < 12) {
      return bilangan[x];
    } else if (x < 20) {
      return sebut(x - 10) + " Belas";
    } else if (x < 100) {
      return sebut(Math.floor(x / 10)) + " Puluh " + sebut(x % 10);
    } else if (x < 200) {
      return "Seratus " + sebut(x - 100);
    } else if (x < 1000) {
      return sebut(Math.floor(x / 100)) + " Ratus " + sebut(x % 100);
    } else if (x < 2000) {
      return "Seribu " + sebut(x - 1000);
    } else if (x < 1000000) {
      return sebut(Math.floor(x / 1000)) + " Ribu " + sebut(x % 1000);
    } else if (x < 1000000000) {
      return sebut(Math.floor(x / 1000000)) + " Juta " + sebut(x % 1000000);
    } else if (x < 1000000000000) {
      return sebut(Math.floor(x / 1000000000)) + " Miliar " + sebut(x % 1000000000);
    } else if (x < 1000000000000000) {
      return sebut(Math.floor(x / 1000000000000)) + " Triliun " + sebut(x % 1000000000000);
    }
    return "";
  }

  if (!nilai || nilai === 0) return "Nol Rupiah";
  const hasil = sebut(nilai).replace(/\s+/g, " ").trim();
  return hasil ? `${hasil} Rupiah` : "Nol Rupiah";
}

function formatTanggalIndonesia(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

export function PoPrintDialog({ open, onOpenChange, po, products, suppliers }: PoPrintDialogProps) {
  if (!po) return null;

  const supplier = suppliers.find((s) => s.id === po.supplierId || s.name === po.supplierName);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-none bg-slate-100 sm:rounded-xl">
        {/* Accessible Dialog Header */}
        <div className="sr-only">
          <DialogTitle>Preview Cetak Purchase Order {po.orderNo}</DialogTitle>
          <DialogDescription>Pratinjau cetak dokumen PO resmi CV Manna Anugerah Sejahtera</DialogDescription>
        </div>

        {/* Top Control Bar (Hidden on print) */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur print:hidden">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Printer className="h-4 w-4 text-brand-primary" />
              Preview Cetak Dokumen: <span className="font-mono text-brand-primary">{po.orderNo}</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Approved
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="gradient"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> Cetak Dokumen (Print / PDF)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Tutup
            </Button>
          </div>
        </div>

        {/* Paper Container - Matches exact A4 standard layout of existing PO */}
        <div className="p-4 sm:p-8 flex justify-center bg-slate-200/70 print:p-0 print:bg-white">
          <div
            id="po-print-document"
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
                  <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-black">
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

              {/* Vendor / Supplier Box & Metadata */}
              <div className="flex items-start justify-between mt-6">
                <div className="w-[280px] sm:w-[320px]">
                  <span className="text-[11px] font-medium text-black block mb-1">
                    Messrs :
                  </span>
                  <div className="border border-black p-2.5 min-h-[64px] flex flex-col justify-between">
                    <span className="font-bold text-xs text-black">
                      {supplier?.name || po.supplierName}
                    </span>
                    <span className="text-[11px] font-bold text-black mt-2">
                      UP : {supplier?.contactPerson ? `Bpk. ${supplier.contactPerson}` : "Bpk. Budi Jatmiko"}
                    </span>
                  </div>
                </div>

                <div className="text-left text-xs space-y-1.5 pt-3">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-black">Ref # :</span>
                    <span className="text-black font-mono">
                      {po.salesOrderNo ? `SO: ${po.salesOrderNo}` : (po.purchaseRequestId ? `PR: ${po.purchaseRequestId.slice(0, 8)}` : "")}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-black">Date :</span>
                    <span className="text-black">
                      Semarang, {formatTanggalIndonesia(po.orderDate || po.createdAt)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center my-6">
                <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider underline underline-offset-4 text-black">
                  PURCHASE ORDER
                </h1>
                <h2 className="text-sm sm:text-base font-bold text-black mt-1">
                  {po.orderNo}
                </h2>
              </div>

              {/* Items Table */}
              <div className="mt-4">
                <table className="w-full border-collapse border border-black text-xs text-black">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="border border-black p-2 text-left font-bold w-[48%]">
                        Description of Content
                      </th>
                      <th className="border border-black p-2 text-center font-bold w-[12%]">
                        Qty
                        <span className="block text-[10px] font-normal text-black">kg</span>
                      </th>
                      <th className="border border-black p-2 text-right font-bold w-[20%]">
                        Unit Price
                        <span className="block text-[10px] font-normal text-black">Rupiah</span>
                      </th>
                      <th className="border border-black p-2 text-right font-bold w-[20%]">
                        Total Amount
                        <span className="block text-[10px] font-normal text-black">Rupiah</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.lines && po.lines.length > 0 ? (
                      po.lines.map((l, idx) => {
                        const product = products.find((p) => p.id === l.productId);
                        const subtotal = l.subtotal || l.quantity * l.unitPrice;
                        return (
                          <tr key={idx} className="border-b border-black">
                            <td className="border border-black p-2 text-left">
                              {product?.name || l.productId}
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
                        <td colSpan={4} className="border border-black p-4 text-center text-muted-foreground">
                          Tidak ada rincian item.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black font-bold">
                      <td colSpan={3} className="border border-black p-2 text-left font-bold">
                        Total : amount in Rupiah
                      </td>
                      <td className="border border-black p-2 text-right font-mono font-bold">
                        {po.totalAmount.toLocaleString("en-US")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Terbilang */}
              <div className="mt-3 text-xs text-black">
                <span className="font-semibold">Terbilang : </span>
                <span className="italic">{angkaKeTerbilang(po.totalAmount)}</span>
              </div>

              {/* Notes / NB */}
              <div className="mt-6 text-xs text-black space-y-1">
                <p className="font-bold underline">NB :</p>
                <ol className="list-decimal list-inside space-y-0.5 text-black">
                  <li>{po.qualityNotes || "Kering Oven"}</li>
                  <li>
                    {po.freightScheme?.toLowerCase() === "loco"
                      ? "Pengambilan Mandiri (Loco)"
                      : "Harga sampai Gudang Manna Semarang"}
                  </li>
                  {po.notes && <li>{po.notes}</li>}
                </ol>
              </div>

              {/* Closing & Signature */}
              <div className="mt-8 text-xs text-black">
                <p>Terima kasih.</p>
                <p className="mt-4">Hormat kami,</p>
                <p className="font-semibold">CV. Manna Anugerah Sejahtera</p>

                {/* Signature line / stamp */}
                <div className="h-16 flex items-center pl-4 my-1 select-none">
                  <span
                    className="italic text-2xl text-slate-800 tracking-wider font-serif"
                    style={{ fontFamily: "'Brush Script MT', cursive, Georgia, serif" }}
                  >
                    Steven S.
                  </span>
                </div>
                <div className="w-48 border-b border-black"></div>
                <p className="font-bold text-xs text-black mt-1">
                  {po.ownerApprovedBy || "Steven Santoso"}
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
            #po-print-document,
            #po-print-document * {
              visibility: visible !important;
            }
            #po-print-document {
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

