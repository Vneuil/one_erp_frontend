export interface PosSettings {
  taxPercent: number;
  taxInclusive: boolean;
  roundTo: number;
  defaultOutlet: string;
  receiptHeader: string;
  receiptFooter: string;
  nonCashAccountCode: string;
}

export const defaultPosSettings: PosSettings = {
  taxPercent: 0,
  taxInclusive: true,
  roundTo: 0,
  defaultOutlet: "Outlet Utama",
  receiptHeader: "",
  receiptFooter: "",
  nonCashAccountCode: "",
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface SaleTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/** Mirrors the server's ComputeSale so the cashier sees exactly what will be charged. */
export function computeSale(subtotal: number, discount: number, s: PosSettings): SaleTotals {
  const net = r2(subtotal - discount);
  const rate = s.taxPercent / 100;
  let tax: number;
  let total: number;
  if (s.taxInclusive) {
    total = net;
    tax = r2(net - net / (1 + rate));
  } else {
    tax = r2(net * rate);
    total = r2(net + tax);
  }
  if (s.roundTo > 0) total = r2(Math.round(total / s.roundTo) * s.roundTo);
  return { subtotal: r2(subtotal), discount: r2(discount), tax, total };
}
