"use client";

import * as React from "react";
import { productsApi, ProductItem } from "@/lib/api/products";
import { useReport } from "@/components/reports/report-ui";

/**
 * Searchable product choices for forms with several product pickers. The API
 * returns at most 100 products per request, so the list follows a search box,
 * and every product the user has picked is remembered so its label survives a new search.
 */
export function useProductOptions() {
  const [search, setSearch] = React.useState("");
  const [known, setKnown] = React.useState<Record<string, ProductItem>>({});
  const found = useReport(`products|${search}`, () => productsApi.list({ perPage: 100, search: search || undefined }).then((r) => r.data || []));
  const options = React.useMemo(() => {
    const byId = new Map<string, ProductItem>(Object.entries(known));
    (found.data ?? []).forEach((p) => byId.set(p.id, p));
    return [...byId.values()].sort((a, b) => a.sku.localeCompare(b.sku));
  }, [found.data, known]);
  const pick = React.useCallback(
    (id: string) => {
      const p = options.find((o) => o.id === id);
      if (p) setKnown((k) => ({ ...k, [p.id]: p }));
    },
    [options]
  );
  return { search, setSearch, options, known, pick, error: found.error };
}
