"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, HelpCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PublicFooter } from "@/components/layout/public-footer";
import { useTranslation } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

interface FaqItem {
  category: string;
  q: string;
  a: string;
}

const faqItems: FaqItem[] = [
  {
    category: "Umum",
    q: "Apa itu ONE ERP?",
    a: "ONE ERP adalah platform manajemen bisnis all-in-one yang mencakup Penjualan, Inventaris, Keuangan, Procurement, HRM, CRM, POS, dan lainnya dalam satu sistem terpadu, dirancang untuk bisnis di Indonesia.",
  },
  {
    category: "Umum",
    q: "Apakah data perusahaan saya aman dan terpisah dari perusahaan lain?",
    a: "Ya. ONE ERP menggunakan arsitektur multi-tenant di mana setiap perusahaan memiliki database-nya sendiri yang sepenuhnya terisolasi — data Anda tidak pernah bercampur dengan tenant lain.",
  },
  {
    category: "Langganan & Harga",
    q: "Bagaimana skema harga ONE ERP?",
    a: "Harga langganan dikunci pada saat Anda pertama kali berlangganan. Jika harga naik di kemudian hari, kenaikan tersebut hanya berlaku untuk pelanggan baru — pelanggan lama tetap membayar harga awal selama langganan berjalan.",
  },
  {
    category: "Langganan & Harga",
    q: "Apa yang terjadi jika masa langganan saya habis?",
    a: "Akses ke data bisnis akan dibatasi sementara hingga langganan diperpanjang. Data Anda tetap tersimpan aman dan akan langsung aktif kembali setelah pembayaran perpanjangan dikonfirmasi.",
  },
  {
    category: "Integrasi Marketplace",
    q: "Apakah ONE ERP bisa terhubung ke TikTok Shop dan Shopee?",
    a: "Bisa. Dari menu Settings > Integration, Anda dapat menghubungkan toko TikTok Shop atau Shopee dengan satu klik (OAuth), lalu order dari marketplace tersebut otomatis tersinkron sebagai Sales Order di ONE ERP.",
  },
  {
    category: "Integrasi Marketplace",
    q: "Apakah saya perlu memasukkan API key toko saya sendiri?",
    a: "Tidak. Anda cukup klik \"Connect\" dan menyetujui otorisasi di halaman resmi TikTok Shop/Shopee — tidak ada API key atau konfigurasi teknis yang perlu dimasukkan secara manual.",
  },
  {
    category: "Dukungan",
    q: "Bagaimana cara menghubungi dukungan teknis?",
    a: "Gunakan menu Support di dalam aplikasi untuk membuat tiket, atau hubungi tim kami melalui kontak resmi yang tertera di halaman perusahaan Anda.",
  },
];

const categories = Array.from(new Set(faqItems.map((f) => f.category)));

export default function FaqPage() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);
  const [activeCategory, setActiveCategory] = React.useState<string>("Semua");

  const filtered =
    activeCategory === "Semua"
      ? faqItems
      : faqItems.filter((f) => f.category === activeCategory);

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
            <Link href="/pricing" className="hover:text-brand-primary transition-colors">
              {t.landing.navPricing}
            </Link>
            <Link href="/faq" className="text-brand-primary transition-colors">
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
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-6 text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-indigo bg-brand-tint px-3 py-1 rounded-full">
          <HelpCircle className="h-3.5 w-3.5" />
          Pusat Bantuan
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Pertanyaan yang Sering Diajukan
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Temukan jawaban seputar penggunaan ONE ERP, langganan, integrasi marketplace, dan lainnya.
        </p>
      </section>

      {/* Category filter */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-2 pb-8">
        {["Semua", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors",
              activeCategory === cat
                ? "bg-brand-primary text-white border-brand-primary shadow-sm shadow-purple-500/20"
                : "bg-white text-muted-foreground border-border hover:border-brand-primary/40 hover:text-brand-primary"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ list */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 space-y-3">
        {filtered.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={item.q}
              className="rounded-xl border border-border bg-white overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left"
              >
                <span className="text-sm font-bold text-foreground">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1">
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* CTA */}
      <section className="pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl bg-gradient-to-br from-brand-dark via-[#421670] to-brand-indigo p-8 text-white text-center space-y-4 shadow-xl">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Masih ada pertanyaan lain?
            </h3>
            <p className="text-sm text-purple-200 max-w-md mx-auto">
              Tim kami siap membantu Anda memulai dengan ONE ERP.
            </p>
            <Button asChild size="lg" className="h-11 px-8 text-sm font-bold bg-white text-brand-dark hover:bg-slate-100 shadow-lg">
              <Link href="/login">Masuk ke Konsol</Link>
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
