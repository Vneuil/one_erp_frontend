export interface InvoiceAdjustments {
  discountType: "percent" | "amount";
  discountValue: number;
  additionalCost: number;
  /** Rounding step for the final total (0 = off). */
  roundTo: number;
  /** Add PPN on top of (subtotal - discount + additional cost). */
  applyVat: boolean;
  /** DPP nilai lain (11/12 of the price), the default for non-luxury goods: effective PPN 11%. */
  vatOtherValueBase: boolean;
  /** Purchases only: the PPN is creditable (PPN Masukan) rather than part of the cost. */
  vatCreditable: boolean;
}

export const noAdjustments: InvoiceAdjustments = {
  discountType: "percent", discountValue: 0, additionalCost: 0, roundTo: 0,
  applyVat: false, vatOtherValueBase: true, vatCreditable: true,
};

/** Statutory PPN rate (since 2025). Mirrors finance.StatutoryVATRate on the server. */
export const VAT_RATE = 12;

export interface InvoiceAmounts {
  subtotal: number;
  discount: number;
  additionalCost: number;
  rounding: number;
  /** DPP: subtotal - discount + additional cost. */
  taxBase: number;
  vat: number;
  total: number;
  error?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Live preview of the final invoice total. Mirrors the backend's ComputeInvoiceAmounts. */
export function previewInvoiceAmounts(subtotal: number, a: InvoiceAdjustments): InvoiceAmounts {
  const base: InvoiceAmounts = { subtotal, discount: 0, additionalCost: 0, rounding: 0, taxBase: subtotal, vat: 0, total: subtotal };
  if (!(subtotal > 0)) return base;
  if (a.discountValue < 0 || a.additionalCost < 0 || a.roundTo < 0 || (a.discountType === "percent" && a.discountValue > 100)) {
    return { ...base, error: "Nilai diskon, biaya tambahan, dan pembulatan tidak valid." };
  }
  const discount = a.discountType === "percent" ? r2((subtotal * a.discountValue) / 100) : a.discountValue;
  if (discount > subtotal) return { ...base, error: "Diskon melebihi jumlah invoice." };
  const taxBase = r2(subtotal - discount + a.additionalCost);
  const vat = a.applyVat ? r2((a.vatOtherValueBase ? r2((taxBase * 11) / 12) : taxBase) * VAT_RATE / 100) : 0;
  let total = r2(taxBase + vat);
  let rounding = 0;
  if (a.roundTo > 0) {
    rounding = r2(Math.round(total / a.roundTo) * a.roundTo - total);
    total = r2(total + rounding);
  }
  return { subtotal, discount, additionalCost: a.additionalCost, rounding, taxBase, vat, total };
}

/** Fields to spread into the create-invoice request body. Omits zeros so the server treats it as an unadjusted invoice. */
export function adjustmentPayload(a: InvoiceAdjustments) {
  return {
    discountPercent: a.discountType === "percent" && a.discountValue > 0 ? a.discountValue : undefined,
    discountAmount: a.discountType === "amount" && a.discountValue > 0 ? a.discountValue : undefined,
    additionalCost: a.additionalCost > 0 ? a.additionalCost : undefined,
    roundTo: a.roundTo > 0 ? a.roundTo : undefined,
    applyVat: a.applyVat ? true : undefined,
    vatOtherValueBase: a.applyVat ? a.vatOtherValueBase : undefined,
    vatCreditable: a.applyVat ? a.vatCreditable : undefined,
  };
}
