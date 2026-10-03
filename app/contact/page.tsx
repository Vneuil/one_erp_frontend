"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CalendarCheck, CheckCircle2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PublicFooter } from "@/components/layout/public-footer";
import { cn } from "@/lib/utils";

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const preferredMeetingAtRaw = formData.get("preferredMeetingAt") as string;

    const payload = {
      name: formData.get("name") as string,
      companyName: formData.get("companyName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      packageInterest: formData.get("packageInterest") as string,
      preferredMeetingAt: preferredMeetingAtRaw
        ? new Date(preferredMeetingAtRaw).toISOString()
        : "",
      notes: (formData.get("notes") as string) || "",
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ABC_API_URL || "http://localhost:4000/api/v1"}/public/leads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        throw new Error("Gagal mengirim permintaan meeting");
      }

      setSubmitted(true);
    } catch {
      setError("Gagal mengirim permintaan meeting. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-foreground selection:bg-brand-tint selection:text-brand-indigo font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="ONE ERP Logo"
              width={34}
              height={34}
              priority
              className="h-8 w-8 rounded-lg shadow-md shadow-purple-500/20 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="font-black text-lg tracking-tight text-foreground">ONE ERP</span>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="pill" />
            <Button asChild variant="gradient" size="sm" className="h-9 px-4 text-xs font-bold">
              <Link href="/login">Masuk</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Back link */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Paket Harga</span>
        </Link>
      </div>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-6 text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-indigo bg-brand-tint px-3 py-1 rounded-full">
          <Gift className="h-3.5 w-3.5" />
          Free Trial 14 Hari
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Book Meeting untuk Klaim Free Trial Anda
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Isi form di bawah ini untuk menjadwalkan sesi singkat bersama tim Divine. Setelah meeting,
          akses free trial ONE ERP akan langsung diaktifkan untuk perusahaan Anda.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { step: "1", text: "Isi data perusahaan & jadwal meeting" },
            { step: "2", text: "Konsultasi kebutuhan bisnis bersama tim Divine" },
            { step: "3", text: "Free trial 14 hari langsung aktif" },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-border bg-slate-50/60 p-4 flex items-start gap-3">
              <div className="h-7 w-7 rounded-lg bg-brand-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                {s.step}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">{s.text}</p>
            </div>
          ))}
        </div>

        <Card className="border-border shadow-md">
          <CardContent className="p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Permintaan Meeting Terkirim</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Tim Divine akan menghubungi Anda dalam 1 hari kerja untuk konfirmasi jadwal meeting dan
                  aktivasi free trial.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center gap-2 pb-1">
                  <CalendarCheck className="h-4 w-4 text-brand-primary" />
                  <h2 className="text-sm font-bold text-foreground">Detail Meeting & Perusahaan</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Nama Lengkap</label>
                    <Input name="name" required placeholder="Nama Anda" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Nama Perusahaan</label>
                    <Input name="companyName" required placeholder="PT Contoh Sejahtera" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Email Kerja</label>
                    <Input name="email" required type="email" placeholder="nama@perusahaan.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">No. WhatsApp</label>
                    <Input name="phone" required type="tel" placeholder="08xxxxxxxxxx" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Paket yang Diminati</label>
                    <select
                      name="packageInterest"
                      required
                      defaultValue=""
                      className={cn(
                        "flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
                      )}
                    >
                      <option value="" disabled>
                        Pilih paket
                      </option>
                      <option value="spark">Spark</option>
                      <option value="scale">Scale</option>
                      <option value="infinite">Infinite</option>
                      <option value="unsure">Belum tahu, ingin konsultasi</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Jadwal Meeting yang Diinginkan</label>
                    <Input name="preferredMeetingAt" required type="datetime-local" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Catatan Tambahan (Opsional)</label>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Ceritakan sedikit tentang proses bisnis atau kebutuhan Anda..."
                    className="flex w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary transition-colors resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs font-semibold text-rose-600 text-center">{error}</p>
                )}

                <Button type="submit" variant="gradient" size="lg" className="w-full h-12 font-bold shadow-md shadow-purple-500/20" disabled={submitting}>
                  {submitting ? "Mengirim..." : "Ajukan Meeting & Klaim Free Trial"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Tanpa kartu kredit. Free trial hanya diaktifkan setelah sesi meeting terkonfirmasi.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      <PublicFooter />
    </div>
  );
}
