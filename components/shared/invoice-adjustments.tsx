"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { MoneyDisplay } from "@/components/shared/money-display";
import { InvoiceAdjustments, previewInvoiceAmounts } from "@/lib/utils/invoice-amounts";

interface Props {
  subtotal: number;
  value: InvoiceAdjustments;
  onChange: (next: InvoiceAdjustments) => void;
  /** Label for the additional-cost field, e.g. "Ongkir / biaya lain". */
  additionalLabel?: string;
  /** "output" = sales (PPN Keluaran); "input" = purchases (PPN Masukan, can be marked creditable). */
  vatKind?: "output" | "input";
}

/** Discount, additional cost and rounding inputs with a live breakdown of the final total. */
export function InvoiceAdjustmentsFields({ subtotal, value, onChange, additionalLabel = "Biaya tambahan (ongkir, dll.)", vatKind = "output" }: Props) {
  const amounts = previewInvoiceAmounts(subtotal, value);
  const set = (patch: Partial<InvoiceAdjustments>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Diskon</label>
          <div className="flex gap-1.5">
            <select
              value={value.discountType}
              onChange={(e) => set({ discountType: e.target.value as InvoiceAdjustments["discountType"] })}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="Jenis diskon"
            >
              <option value="percent">%</option>
              <option value="amount">Rp</option>
            </select>
            <Input type="number" min={0} value={value.discountValue || ""} onChange={(e) => set({ discountValue: Number(e.target.value) })} placeholder="0" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">{additionalLabel}</label>
          <Input type="number" min={0} value={value.additionalCost || ""} onChange={(e) => set({ additionalCost: Number(e.target.value) })} placeholder="0" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Pembulatan total</label>
        <select
          value={value.roundTo}
          onChange={(e) => set({ roundTo: Number(e.target.value) })}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value={0}>Tanpa pembulatan</option>
          <option value={100}>Ke Rp100 terdekat</option>
          <option value={500}>Ke Rp500 terdekat</option>
          <option value={1000}>Ke Rp1.000 terdekat</option>
        </select>
      </div>
      <div className="space-y-1.5 rounded-md bg-slate-50 p-2.5">
        <label className="flex items-center gap-2 text-xs font-medium text-foreground">
          <input type="checkbox" checked={value.applyVat} onChange={(e) => set({ applyVat: e.target.checked })} />
          {vatKind === "output" ? "Kenakan PPN 12%" : "Invoice memuat PPN Masukan 12%"}
        </label>
        {value.applyVat && (
          <>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <input type="checkbox" checked={value.vatOtherValueBase} onChange={(e) => set({ vatOtherValueBase: e.target.checked })} />
              DPP nilai lain (11/12 dari harga, PPN efektif 11%)
            </label>
            {vatKind === "input" && (
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <input type="checkbox" checked={value.vatCreditable} onChange={(e) => set({ vatCreditable: e.target.checked })} />
                Dapat dikreditkan (didukung Faktur Pajak Masukan); jika tidak, PPN masuk ke harga pokok
              </label>
            )}
          </>
        )}
      </div>
      {amounts.error ? (
        <p role="alert" className="text-xs text-rose-700">{amounts.error}</p>
      ) : (
        <dl className="text-xs space-y-0.5">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd><MoneyDisplay amount={amounts.subtotal} /></dd></div>
          {amounts.discount > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Diskon</dt><dd>−<MoneyDisplay amount={amounts.discount} /></dd></div>}
          {amounts.additionalCost > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Biaya tambahan</dt><dd>+<MoneyDisplay amount={amounts.additionalCost} /></dd></div>}
          {amounts.vat > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">PPN (DPP <MoneyDisplay amount={amounts.taxBase} />)</dt><dd>+<MoneyDisplay amount={amounts.vat} /></dd></div>}
          {amounts.rounding !== 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Pembulatan</dt><dd>{amounts.rounding > 0 ? "+" : "−"}<MoneyDisplay amount={Math.abs(amounts.rounding)} /></dd></div>}
          <div className="flex justify-between font-bold border-t border-border pt-1"><dt>Total ditagihkan</dt><dd><MoneyDisplay amount={amounts.total} /></dd></div>
        </dl>
      )}
    </div>
  );
}
