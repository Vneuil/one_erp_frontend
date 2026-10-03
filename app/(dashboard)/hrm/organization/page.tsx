"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hrmApi, OrgNode, Organization } from "@/lib/api/hrm";

const matches = (n: OrgNode, q: string): boolean =>
  n.name.toLowerCase().includes(q) || n.role.toLowerCase().includes(q) || n.department.toLowerCase().includes(q) || n.children.some((c) => matches(c, q));

function Node({ node, q, depth }: { node: OrgNode; q: string; depth: number }) {
  const [open, setOpen] = React.useState(depth < 2);
  const kids = q ? node.children.filter((c) => matches(c, q)) : node.children;
  const expanded = q ? true : open;
  return (
    <li>
      <div className="flex items-center gap-2 py-1.5">
        {kids.length > 0 ? (
          <button onClick={() => setOpen(!open)} aria-label={expanded ? "Ciutkan" : "Buka"} className="p-0.5 text-muted-foreground cursor-pointer">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : <span className="w-5" />}
        <div className={`rounded-lg border px-3 py-1.5 bg-white ${node.status === "Resigned" ? "opacity-50" : ""}`}>
          <div className="text-xs font-bold">{node.name}</div>
          <div className="text-[10px] text-muted-foreground">{node.role} · {node.department}</div>
        </div>
        {node.teamSize > 0 && <span className="text-[10px] text-muted-foreground">{node.directReports} langsung · {node.teamSize} total</span>}
      </div>
      {expanded && kids.length > 0 && <ul className="ml-5 pl-3 border-l border-border">{kids.map((c) => <Node key={c.id} node={c} q={q} depth={depth + 1} />)}</ul>}
    </li>
  );
}

export default function OrganizationPage() {
  const [org, setOrg] = React.useState<Organization | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    hrmApi.organization().then((r) => alive && setOrg(r.data)).catch((e) => alive && setError(e instanceof Error ? e.message : "Gagal memuat struktur organisasi."));
    return () => {
      alive = false;
    };
  }, []);

  const q = search.trim().toLowerCase();
  const roots = org ? (q ? org.roots.filter((r) => matches(r, q)) : org.roots) : [];
  const flat = org && org.roots.length === org.total && org.roots.every((r) => r.children.length === 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-brand-dark flex items-center gap-2"><Network className="h-5 w-5" /> Struktur Organisasi</h1>
        <p className="text-xs text-muted-foreground">Garis pelaporan berdasarkan atasan langsung tiap karyawan. Atur atasan lewat <Link href="/hrm/employees" className="underline">Karyawan → Detail → Ubah</Link>.</p>
      </div>
      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      <Input placeholder="Cari nama, jabatan, atau departemen…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 max-w-sm text-xs" />
      <Card>
        <CardContent className="p-4">
          {!org ? <p className="text-xs text-muted-foreground">Memuat…</p> : roots.length === 0 ? <p className="text-xs text-muted-foreground">Tidak ada data.</p> : (
            <>
              {flat && <p className="mb-2 text-[11px] text-amber-700">Belum ada garis pelaporan. Tetapkan atasan langsung agar bagan terbentuk.</p>}
              <ul>{roots.map((r) => <Node key={r.id} node={r} q={q} depth={0} />)}</ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
