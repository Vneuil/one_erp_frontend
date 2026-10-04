"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
export const monthStart = () => today().slice(0, 8) + "01";
export const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
export const thr = `${th} text-right`;
export const td = "px-3 py-1.5 text-xs";
export const tdr = `${td} text-right tabular-nums`;
export const selectCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-xs";

/**
 * Fetches a report whenever `key` changes. The result is tagged with the key it
 * was fetched for, so "loading" is derived (the stored result is stale) rather
 * than set synchronously from inside the effect.
 */
export function useReport<T>(key: string, fetcher: () => Promise<T>, enabled = true) {
  const [result, setResult] = React.useState<{ key: string; data: T | null; error: string | null } | null>(null);
  const fetchRef = React.useRef(fetcher);
  React.useEffect(() => {
    fetchRef.current = fetcher;
  });
  React.useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchRef
      .current()
      .then((data) => alive && setResult({ key, data, error: null }))
      .catch((e) => alive && setResult({ key, data: null, error: errText(e, "Gagal memuat laporan.") }));
    return () => {
      alive = false;
    };
  }, [key, enabled]);
  const current = result?.key === key ? result : null;
  return { data: enabled ? current?.data ?? null : null, error: enabled ? current?.error ?? null : null, loading: enabled && current === null };
}

export function RangeFilter({ from, to, onChange, children }: { from: string; to: string; onChange: (from: string, to: string) => void; children?: React.ReactNode }) {
  return (
    <Card className="border-border shadow-2xs print:hidden">
      <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <label className="space-y-1 text-xs font-semibold">Dari<Input type="date" value={from} max={to} onChange={(e) => e.target.value && onChange(e.target.value, to)} /></label>
        <label className="space-y-1 text-xs font-semibold">Sampai<Input type="date" value={to} min={from} onChange={(e) => e.target.value && onChange(from, e.target.value)} /></label>
        {children}
      </CardContent>
    </Card>
  );
}

export function Tabs<K extends string>({ value, onChange, tabs }: { value: K; onChange: (k: K) => void; tabs: readonly (readonly [K, string])[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 print:hidden">
      {tabs.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${value === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}>{l}</button>
      ))}
    </div>
  );
}

export function ReportState({ loading, error, empty }: { loading: boolean; error: string | null; empty?: string | false | null }) {
  return (
    <>
      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {loading && <div className="py-10 text-center text-xs text-muted-foreground">Memuat laporan...</div>}
      {!loading && !error && empty && <div className="py-10 text-center text-xs text-muted-foreground">{empty}</div>}
    </>
  );
}

export function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">{label}</div><div className="text-lg font-black">{children}</div></CardContent></Card>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>;
}
