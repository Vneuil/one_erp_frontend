"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Gift, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PublicFooter } from "@/components/layout/public-footer";
import { useTranslation } from "@/lib/i18n/translations";

export default function PricingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white text-foreground selection:bg-brand-tint selection:text-brand-indigo font-sans">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink-0">
            <Image
              src="/logo.png"
              alt="ONE ERP Logo"
              width={42}
              height={42}
              priority
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shadow-md shadow-purple-500/20 object-contain group-hover:scale-105 transition-transform shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg sm:text-xl tracking-tight text-foreground">ONE</span>
                <span className="hidden sm:inline-block text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-brand-tint text-brand-indigo border border-brand-indigo/20">
                  {t.landing.superAppTag}
                </span>
              </div>
              <span className="hidden sm:block text-[10px] text-muted-foreground font-semibold -mt-0.5 tracking-tight truncate">
                {t.landing.subTag}
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-muted-foreground">
            <Link href="/#workflow" className="hover:text-brand-primary transition-colors">
              {t.landing.navFeatures}
            </Link>
            <Link href="/#omnichannel" className="hover:text-brand-primary transition-colors">
              {t.landing.navOmnichannel}
            </Link>
            <Link href="/#modules" className="hover:text-brand-primary transition-colors">
              {t.landing.navModules}
            </Link>
            <Link href="/pricing" className="text-brand-primary transition-colors">
              {t.landing.navPricing}
            </Link>
            <Link href="/faq" className="hover:text-brand-primary transition-colors">
              {t.landing.navFaq}
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <LanguageSwitcher variant="pill" />
            <Button asChild variant="gradient" size="sm" className="h-9 sm:h-10 px-2.5 sm:px-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold shadow-md shadow-purple-500/20 shrink-0">
              <Link href="/login">
                <span className="whitespace-nowrap">{t.landing.signIn}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-4 text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-indigo bg-brand-tint px-3 py-1 rounded-full">
          <Tag className="h-3.5 w-3.5" />
          {t.landing.pricingTag}
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          {t.landing.pricingTitle}
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">{t.landing.pricingSubtitle}</p>
      </section>

      {/* Free Trial Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-4">
        <div className="rounded-2xl bg-gradient-to-br from-brand-dark via-[#421670] to-brand-indigo p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="hidden sm:flex h-11 w-11 rounded-xl bg-white/15 items-center justify-center shrink-0">
              <Gift className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Klaim Free Trial 14 Hari, Semua Paket
              </h3>
              <p className="text-xs sm:text-sm text-purple-200">
                Book meeting singkat bersama tim Divine terlebih dahulu — free trial langsung aktif setelah sesi konsultasi.
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="h-11 px-6 text-sm font-bold bg-white text-brand-dark hover:bg-slate-100 shadow-lg shrink-0">
            <Link href="/contact" className="gap-2">
              <span>Book Meeting Sekarang</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Spark Plan */}
          <Card className="border-border shadow-xs">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">Spark</h3>
                <p className="text-xs text-muted-foreground">
                  Untuk UMKM & toko online yang mulai merapikan operasional.
                </p>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-foreground">Rp999rb</span>
                  <span className="text-xs font-semibold text-muted-foreground">{t.landing.pricingPerMonth}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Rp9.999rb/tahun &middot; {t.landing.pricingAnnualNote}
                </p>
                <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5" />
                  {t.landing.pricingTrialNote}
                </p>
              </div>
              <Button asChild variant="outline" className="w-full h-11 font-bold">
                <Link href="/contact">{t.landing.pricingCtaStandard}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full h-11 font-bold">
                <Link href="/checkout?plan=spark">{t.landing.pricingCtaCheckout}</Link>
              </Button>
              <ul className="space-y-2.5 text-xs text-muted-foreground pt-1">
                {[
                  "Pesanan Penjualan Omnichannel (TikTok, Shopee, POS)",
                  "Inventaris & Multi-Gudang Real-Time",
                  "Pengadaan & Pembelian Vendor",
                  "Akuntansi Dasar (COA, Jurnal, Laporan Keuangan)",
                  "Hingga 25 Pengguna Aktif",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Scale Plan */}
          <Card className="border-2 border-brand-primary shadow-lg shadow-purple-500/15 relative lg:-translate-y-2">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-wide bg-brand-primary text-white px-3 py-1 rounded-full shadow-md">
              {t.landing.pricingMostPopular}
            </span>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">Scale</h3>
                <p className="text-xs text-muted-foreground">
                  Untuk pabrik & distributor dengan proses manufaktur dan gudang skala menengah.
                </p>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-foreground">Rp2.499rb</span>
                  <span className="text-xs font-semibold text-muted-foreground">{t.landing.pricingPerMonth}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Rp24.999rb/tahun &middot; {t.landing.pricingAnnualNote}
                </p>
                <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5" />
                  {t.landing.pricingTrialNote}
                </p>
              </div>
              <Button asChild variant="gradient" className="w-full h-11 font-bold shadow-md shadow-purple-500/20">
                <Link href="/contact">{t.landing.pricingCtaStandard}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full h-11 font-bold">
                <Link href="/checkout?plan=scale">{t.landing.pricingCtaCheckout}</Link>
              </Button>
              <ul className="space-y-2.5 text-xs text-muted-foreground pt-1">
                {[
                  "Semua fitur paket Spark",
                  "Modul Manufaktur Lengkap (BOM, Surat Perintah Kerja)",
                  "IIoT Konektivitas Mesin Lantai Produksi",
                  "Monitoring OEE (Overall Equipment Effectiveness)",
                  "Manajemen Gudang Lanjutan (Picking, Packing, WMS)",
                  "Hingga 100 Pengguna Aktif",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Infinite Plan */}
          <Card className="border-border shadow-xs">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">Infinite</h3>
                <p className="text-xs text-muted-foreground">
                  Custom build mengikuti proses bisnis unik perusahaan Anda.
                </p>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">{t.landing.pricingCustomStart}</span>
                  <span className="text-3xl font-black text-foreground">Rp5jt</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Skema investasi disesuaikan lingkup proyek</p>
              </div>
              <Button asChild variant="outline" className="w-full h-11 font-bold">
                <Link href="/contact">{t.landing.pricingCtaCustom}</Link>
              </Button>
              <ul className="space-y-2.5 text-xs text-muted-foreground pt-1">
                {[
                  "Semua fitur paket Scale",
                  "Pengembangan Modul Sesuai Proses Bisnis Spesifik",
                  "Integrasi Sistem Pihak Ketiga & Legacy",
                  "Dedicated Onboarding & Prioritas Dukungan",
                  "Pengguna Tanpa Batas",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-indigo shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
