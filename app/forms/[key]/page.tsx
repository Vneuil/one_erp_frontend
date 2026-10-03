"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";

interface FormInfo {
  name: string;
  successMessage: string;
}

/** Public lead-capture form. No sign-in; the company is resolved from the form key on the server. */
export default function PublicLeadFormPage() {
  const { key } = useParams<{ key: string }>();
  const [info, setInfo] = React.useState<FormInfo | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "missing" | "sent">("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [values, setValues] = React.useState({ name: "", company: "", email: "", phone: "", message: "", website: "" });

  React.useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/public/lead-forms/${encodeURIComponent(key)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!alive) return;
        if (!res.ok || !body.data) {
          setState("missing");
          return;
        }
        setInfo(body.data);
        setState("ready");
      })
      .catch(() => alive && setState("missing"));
    return () => {
      alive = false;
    };
  }, [key]);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/public/lead-forms/${encodeURIComponent(key)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Gagal mengirim. Silakan coba lagi.");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <main className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {state === "loading" && <p className="text-sm text-slate-500">Memuat…</p>}
        {state === "missing" && <p className="text-sm text-slate-700">Formulir tidak ditemukan atau sudah tidak aktif.</p>}
        {state === "sent" && <p role="status" className="text-sm text-emerald-700">{info?.successMessage}</p>}
        {state === "ready" && info && (
          <form onSubmit={submit} className="space-y-3">
            <h1 className="text-lg font-bold text-slate-900">{info.name}</h1>
            <label className="block text-sm font-medium text-slate-700">Nama *<input required className={field} value={values.name} onChange={set("name")} maxLength={255} /></label>
            <label className="block text-sm font-medium text-slate-700">Perusahaan<input className={field} value={values.company} onChange={set("company")} maxLength={255} /></label>
            <label className="block text-sm font-medium text-slate-700">Email<input type="email" className={field} value={values.email} onChange={set("email")} /></label>
            <label className="block text-sm font-medium text-slate-700">Telepon / WhatsApp<input className={field} value={values.phone} onChange={set("phone")} /></label>
            <p className="text-xs text-slate-500">Isi email atau nomor telepon agar kami dapat menghubungi Anda.</p>
            <label className="block text-sm font-medium text-slate-700">Pesan<textarea rows={3} className={field} value={values.message} onChange={set("message")} maxLength={2000} /></label>
            {/* Honeypot: hidden from people, tempting to bots. */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
              <label>Website<input tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} /></label>
            </div>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Mengirim…" : "Kirim"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
