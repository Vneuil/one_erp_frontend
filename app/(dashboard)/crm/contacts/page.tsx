"use client";

import * as React from "react";
import { Contact } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { crmPlusApi, CrmContactItem } from "@/lib/api/crmplus";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function CrmContactsPage() {
  const [contacts, setContacts] = React.useState<CrmContactItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const [name, setName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [job, setJob] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [primary, setPrimary] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    crmPlusApi
      .contacts()
      .then((r) => alive && setContacts(r.data || []))
      .catch((e) => alive && setError(errText(e, "Gagal memuat kontak.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setContacts((await crmPlusApi.contacts()).data || []);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const q = search.trim().toLowerCase();
  const shown = contacts.filter((c) => !q || [c.name, c.companyName, c.email, c.phone].some((v) => (v ?? "").toLowerCase().includes(q)));
  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Contact className="h-6 w-6 text-brand-primary" />
          <span>Kontak & Perusahaan</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Orang-orang di perusahaan prospek atau pelanggan Anda. Satu perusahaan hanya punya satu kontak utama.</p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold">Nama<Input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Perusahaan<Input value={company} onChange={(e) => setCompany(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Jabatan<Input value={job} onChange={(e) => setJob(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Email<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Telepon<Input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Kontak utama</label>
            <Button size="sm" disabled={busy || !name.trim() || !company.trim()} onClick={() => run(async () => { await crmPlusApi.createContact({ name, companyName: company, jobTitle: job, email, phone, isPrimary: primary }); setName(""); setJob(""); setEmail(""); setPhone(""); setPrimary(false); })} className="h-8 text-xs font-bold w-full">Tambah</Button>
          </div>
        </CardContent>
      </Card>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, perusahaan, email, telepon…" className="h-9 max-w-sm text-xs" />

      <Card className="border-border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["Nama", "Perusahaan", "Jabatan", "Email", "Telepon", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td className={td} colSpan={6}>Memuat data...</td></tr>}
              {!loading && shown.length === 0 && <tr><td className={td} colSpan={6}>Belum ada kontak.</td></tr>}
              {shown.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className={`${td} font-semibold`}>{c.name}{c.isPrimary && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-brand-tint text-brand-primary text-[10px] font-bold">Utama</span>}</td>
                  <td className={td}>{c.companyName}</td><td className={td}>{c.jobTitle || "-"}</td><td className={td}>{c.email || "-"}</td><td className={td}>{c.phone || "-"}</td>
                  <td className={td}>
                    <div className="flex gap-1.5">
                      {!c.isPrimary && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => crmPlusApi.updateContact(c.id, { ...c, isPrimary: true }))} className="h-7 px-2 text-[11px]">Jadikan utama</Button>}
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => window.confirm(`Hapus kontak ${c.name}?`) && run(() => crmPlusApi.deleteContact(c.id))} className="h-7 px-2 text-[11px] text-rose-600 border-rose-200">Hapus</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
