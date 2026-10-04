import type { OpnameCountRow } from "@/lib/api/inventory";
import { parseDelimited, parseNumber } from "@/lib/utils/csv-parse";

export type RowError = { row: number; sku: string; message: string };

/**
 * Reads a count sheet: a header row naming a SKU column and a counted-quantity
 * column (the "Hasil Hitung" of the template), then one row per SKU. Rows with
 * an empty count are skipped; rows with a non-numeric count are reported.
 */
export function parseCountSheet(text: string): { rows: OpnameCountRow[]; errors: RowError[] } {
  const table = parseDelimited(text);
  const rows: OpnameCountRow[] = [];
  const errors: RowError[] = [];
  if (table.length === 0) return { rows, errors: [{ row: 0, sku: "", message: "File kosong." }] };
  const header = table[0].map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => h.includes("sku"));
  const skuCol = hasHeader ? Math.max(0, header.findIndex((h) => h.includes("sku"))) : 0;
  let countCol = table[0].length - 1;
  if (hasHeader) {
    const idx = header.findIndex((h) => /hasil|hitung|counted|qty|jumlah/.test(h) && !/sistem|system/.test(h));
    if (idx >= 0) countCol = idx;
  } else if (table[0].length >= 2) countCol = 1;
  table.slice(hasHeader ? 1 : 0).forEach((r, i) => {
    const line = i + (hasHeader ? 2 : 1);
    const sku = r[skuCol] ?? "";
    const raw = (r[countCol] ?? "").trim();
    if (raw === "") return;
    const n = parseNumber(raw);
    if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) errors.push({ row: line, sku, message: `Hasil hitung "${raw}" bukan bilangan bulat ≥ 0.` });
    else rows.push({ sku, countedQty: n });
  });
  return { rows, errors };
}

