"use client";

import * as React from "react";
import { hrmApi, EmployeeItem } from "@/lib/api/hrm";
import { useReport } from "@/components/reports/report-ui";

/**
 * Searchable employee choices. The API returns at most 100 employees per
 * request, so the list follows a search box, and every employee picked is
 * remembered so labels and details survive a new search.
 */
export function useEmployeeOptions() {
  const [search, setSearch] = React.useState("");
  const [known, setKnown] = React.useState<Record<string, EmployeeItem>>({});
  const found = useReport(`employees|${search}`, () => hrmApi.listEmployees({ perPage: 100, search: search || undefined }).then((r) => r.data || []));
  const options = React.useMemo(() => {
    const byId = new Map<string, EmployeeItem>(Object.entries(known));
    (found.data ?? []).forEach((e) => byId.set(e.id, e));
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [found.data, known]);
  const remember = React.useCallback((e: EmployeeItem) => setKnown((k) => ({ ...k, [e.id]: e })), []);
  return { search, setSearch, options, known, remember, loading: found.loading, error: found.error };
}
