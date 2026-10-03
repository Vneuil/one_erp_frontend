"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Boxes,
  Factory,
  Store,
  ChevronRight,
  Layers,
  CheckCircle2,
  Building2,
  AlertTriangle,
  Users2,
  MonitorSmartphone,
  FolderKanban,
  UserCheck,
  GraduationCap,
  Landmark,
  MessageSquare,
  Settings,
  ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChannelBadge } from "@/components/shared/channel-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PublicFooter } from "@/components/layout/public-footer";
import { useTranslation } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

interface LandingModule {
  title: string;
  icon: LucideIcon;
  description: string;
  features: string[];
}

export default function LandingPage() {
  const { t, isEnglish } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<"orders" | "stock" | "automation">("orders");
  const [selectedModule, setSelectedModule] = React.useState<LandingModule | null>(null);

  const modules: LandingModule[] = isEnglish
    ? [
        { title: "Sales & CRM", icon: Users2, description: "Manage leads, customer relationships, quotations, and omnichannel sales in one flow.", features: ["Leads and deal pipeline", "Quotations and sales orders", "Deliveries, invoices, and returns", "Contracts and sales commissions"] },
        { title: "POS & Omnichannel", icon: MonitorSmartphone, description: "Unify retail cashier transactions and marketplace orders in real time.", features: ["POS cashier and transaction history", "Marketplace order synchronization", "Loyalty members", "Unified customer and order data"] },
        { title: t.nav.procurement, icon: Store, description: "Control purchasing from internal requests through vendor invoicing.", features: ["Purchase requests and approvals", "Purchase orders", "Goods receipts", "Vendor invoices and purchase returns"] },
        { title: t.nav.inventory, icon: Boxes, description: "Keep accurate stock across every warehouse, branch, and sales channel.", features: ["Real-time stock overview", "Stock movements", "Stock opname", "Inter-warehouse transfers"] },
        { title: t.nav.warehouseOps, icon: Layers, description: "Speed up fulfillment with structured picking, packing, and shipping operations.", features: ["Wave picking", "Packing station", "Barcode-ready workflows", "Shipping manifests"] },
        { title: t.nav.manufacturing, icon: Factory, description: "Plan and monitor production from material recipes to shop-floor execution.", features: ["Manufacturing dashboard", "Bill of Materials (BOM)", "Production orders", "Production run and material consumption"] },
        { title: "Projects & Services", icon: FolderKanban, description: "Track project budgets, work progress, time, and customer service requests.", features: ["Project RAB/RAP", "Kanban board", "Live timesheets", "Service tickets"] },
        { title: "HRIS & Payroll", icon: UserCheck, description: "Manage employee administration, attendance, payroll, and performance.", features: ["Employee database", "Smart attendance and leave", "Payroll and PPh 21", "Reimbursements, KPI, and cooperative"] },
        { title: "Recruitment & LMS", icon: GraduationCap, description: "Run hiring pipelines and employee learning from one workspace.", features: ["Recruitment pipeline", "Candidate tracking", "LMS and training", "Employee onboarding"] },
        { title: "Finance, Banking & Assets", icon: Landmark, description: "Connect accounting, treasury, reporting, and company asset control.", features: ["COA and journal entries", "Receivables, payables, and budgets", "Bank accounts and reconciliation", "Asset and device registry"] },
        { title: "Collaboration & Productivity", icon: MessageSquare, description: "Give teams shared tools for communication, files, meetings, and documents.", features: ["ONE Chat and Cloud Drive", "Meetings with AI notes", "Dynamic forms", "E-signatures and export center"] },
        { title: "Administration & Workflows", icon: Settings, description: "Configure access, approvals, integrations, and company controls centrally.", features: ["Users, roles, and permissions", "Approval workflows", "Activity log", "API and webhooks"] },
      ]
    : [
        { title: "Penjualan & CRM", icon: Users2, description: "Kelola prospek, relasi pelanggan, penawaran, dan penjualan omnichannel dalam satu alur.", features: ["Prospek dan deal pipeline", "Penawaran dan pesanan penjualan", "Pengiriman, faktur, dan retur", "Kontrak dan komisi sales"] },
        { title: "POS & Omnichannel", icon: MonitorSmartphone, description: "Satukan transaksi kasir retail dan pesanan marketplace secara real-time.", features: ["Kasir POS dan riwayat transaksi", "Sinkronisasi pesanan marketplace", "Loyalty member", "Data pelanggan dan pesanan terpadu"] },
        { title: t.nav.procurement, icon: Store, description: "Kontrol pembelian dari permintaan internal hingga faktur vendor.", features: ["Permintaan pembelian dan approval", "Pesanan pembelian", "Penerimaan barang", "Faktur vendor dan retur pembelian"] },
        { title: t.nav.inventory, icon: Boxes, description: "Jaga akurasi stok di seluruh gudang, cabang, dan channel penjualan.", features: ["Ringkasan stok real-time", "Mutasi stok", "Stock opname", "Transfer antar gudang"] },
        { title: t.nav.warehouseOps, icon: Layers, description: "Percepat fulfillment dengan proses picking, packing, dan pengiriman yang terstruktur.", features: ["Wave picking", "Pos pengepakan", "Alur kerja barcode", "Manifest ekspedisi"] },
        { title: t.nav.manufacturing, icon: Factory, description: "Rencanakan dan pantau produksi dari resep bahan hingga eksekusi lantai pabrik.", features: ["Dashboard manufaktur", "Bill of Materials (BOM)", "Surat perintah kerja", "Eksekusi produksi dan konsumsi bahan"] },
        { title: "Proyek & Layanan", icon: FolderKanban, description: "Pantau anggaran proyek, progres kerja, waktu, dan permintaan layanan pelanggan.", features: ["Proyek RAB/RAP", "Board Kanban", "Timesheet real-time", "Tiket layanan"] },
        { title: "HRIS & Penggajian", icon: UserCheck, description: "Kelola administrasi karyawan, kehadiran, payroll, dan kinerja.", features: ["Database karyawan", "Smart attendance dan cuti", "Payroll dan PPh 21", "Reimbursement, KPI, dan koperasi"] },
        { title: "Rekrutmen & LMS", icon: GraduationCap, description: "Jalankan proses rekrutmen dan pembelajaran karyawan dalam satu workspace.", features: ["Pipeline rekrutmen", "Pelacakan kandidat", "LMS dan pelatihan", "Onboarding karyawan"] },
        { title: "Keuangan, Bank & Aset", icon: Landmark, description: "Hubungkan akuntansi, treasury, laporan, dan kontrol aset perusahaan.", features: ["COA dan jurnal", "Piutang, hutang, dan anggaran", "Rekening dan rekonsiliasi bank", "Registri aset dan perangkat"] },
        { title: "Kolaborasi & Produktivitas", icon: MessageSquare, description: "Bekali tim dengan alat komunikasi, file, meeting, dan dokumen bersama.", features: ["ONE Chat dan Cloud Drive", "Meeting dengan catatan AI", "Form dinamis", "Tanda tangan elektronik dan export center"] },
        { title: "Administrasi & Workflow", icon: Settings, description: "Atur akses, approval, integrasi, dan kontrol perusahaan secara terpusat.", features: ["Pengguna, role, dan permission", "Approval workflow", "Activity log", "API dan webhook"] },
      ];

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
            <a href="#workflow" className="hover:text-brand-primary transition-colors">
              {t.landing.navFeatures}
            </a>
            <a href="#omnichannel" className="hover:text-brand-primary transition-colors">
              {t.landing.navOmnichannel}
            </a>
            <a href="#modules" className="hover:text-brand-primary transition-colors">
              {t.landing.navModules}
            </a>
            <Link href="/pricing" className="hover:text-brand-primary transition-colors">
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

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        {/* Hero background illustration */}
        <div
          className="absolute inset-0 z-0 pointer-events-none bg-no-repeat bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('/hero-bg.svg')" }}
        />
        {/* Subtle background gradient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[480px] bg-gradient-to-b from-brand-tint/60 via-purple-50/40 to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-7">
          {/* Main Hero Headline (3 Distinct Lines) */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] space-y-1">
            <span className="block text-foreground">
              {t.landing.heroLine1}
            </span>
            <span className="block bg-gradient-to-r from-brand-primary via-brand-purple to-brand-indigo bg-clip-text text-transparent">
              {t.landing.heroLine2}
            </span>
            <span className="block bg-gradient-to-r from-brand-indigo via-brand-primary to-brand-blue bg-clip-text text-transparent">
              {t.landing.heroLine3}
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-3xl mx-auto text-base sm:text-lg text-muted-foreground font-normal leading-relaxed">
            {t.landing.heroDescription}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild variant="gradient" size="lg" className="h-12 px-7 text-sm font-bold shadow-lg shadow-purple-500/25">
              <Link href="/login" className="gap-2">
                <span>{t.landing.ctaPrimary}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 text-sm font-semibold border-border hover:bg-slate-50">
              <a href="#workflow">{t.landing.ctaSecondary}</a>
            </Button>
          </div>

          {/* Trust points */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-brand-primary" />
              {t.landing.heroProof1}
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              {t.landing.heroProof2}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {t.landing.heroProof3}
            </span>
          </div>

          {/* Interactive Live ERP System Preview Mockup */}
          <div className="pt-8 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-border/90 bg-white p-2 sm:p-3 shadow-2xl shadow-purple-900/10 text-left">
              {/* Mockup Top Window Bar */}
              <div className="rounded-xl border border-border bg-slate-50 p-3 sm:p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground font-semibold">
                      https://one.divine.co.id
                    </span>
                  </div>

                  {/* Interactive Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-border self-start sm:self-auto text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab("orders")}
                      className={cn(
                        "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer",
                        activeTab === "orders"
                          ? "bg-brand-primary text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.landing.tabOrders}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("stock")}
                      className={cn(
                        "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer",
                        activeTab === "stock"
                          ? "bg-brand-primary text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.landing.tabStock}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("automation")}
                      className={cn(
                        "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer",
                        activeTab === "automation"
                          ? "bg-brand-primary text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.landing.tabAutomation}
                    </button>
                  </div>
                </div>

                {/* Tab 1: Omnichannel Orders Table Mockup */}
                {activeTab === "orders" && (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-border animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Pesanan Masuk Hari Ini (Omnichannel)</h4>
                        <p className="text-[11px] text-muted-foreground">Sinkronisasi otomatis dengan TikTok Shop, Shopee, Tokopedia, Lazada, Blibli, POS, dan Penawaran B2B</p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        148 Pesanan Baru
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground text-left font-semibold">
                            <th className="pb-2">No. Pesanan</th>
                            <th className="pb-2">Kanal Penjualan</th>
                            <th className="pb-2">Pelanggan</th>
                            <th className="pb-2">Total Nilai</th>
                            <th className="pb-2">Status Operasional</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-medium">
                          <tr>
                            <td className="py-2.5 font-mono font-bold text-foreground">SO-2026-0845</td>
                            <td className="py-2.5">
                              <ChannelBadge source="marketplace" platform="tiktok" storeName="TikTok Shop Official" />
                            </td>
                            <td className="py-2.5">Rizky Firmansyah</td>
                            <td className="py-2.5"><MoneyDisplay amount={4850000} /></td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                                Siap Diambil Gudang
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-mono font-bold text-foreground">SO-2026-0844</td>
                            <td className="py-2.5">
                              <ChannelBadge source="marketplace" platform="shopee" storeName="Shopee Mall" />
                            </td>
                            <td className="py-2.5">Hendrik Gunawan</td>
                            <td className="py-2.5"><MoneyDisplay amount={18750000} /></td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold text-[11px]">
                                Sedang Dipacking
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-mono font-bold text-foreground">SO-2026-0843</td>
                            <td className="py-2.5">
                              <ChannelBadge source="quotation" externalId="QUO-2026-012" storeName="B2B Kontrak" />
                            </td>
                            <td className="py-2.5">PT Maju Bersama Sentosa</td>
                            <td className="py-2.5"><MoneyDisplay amount={110000000} /></td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                                Disetujui & Terjadwal
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-mono font-bold text-foreground">SO-2026-0842</td>
                            <td className="py-2.5">
                              <ChannelBadge source="pos" externalId="POS-CKR-01" storeName="POS Kasir #01" />
                            </td>
                            <td className="py-2.5">Walk-in Customer</td>
                            <td className="py-2.5"><MoneyDisplay amount={3250000} /></td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                Selesai & Lunas
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 2: Stock & Warehouses Mockup */}
                {activeTab === "stock" && (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-border animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Status Inventaris Multi-Gudang</h4>
                        <p className="text-[11px] text-muted-foreground">Monitoring ketersediaan stok fisik di Gudang Pusat Cikarang & Hub Surabaya</p>
                      </div>
                      <span className="text-[11px] font-bold text-brand-primary bg-brand-tint px-2.5 py-1 rounded-md">
                        3 Gudang Terhubung
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1">
                        <span className="text-[11px] text-muted-foreground font-semibold">Gudang Utama Cikarang</span>
                        <div className="text-lg font-black text-foreground">24.580 Unit</div>
                        <span className="text-[11px] text-emerald-600 font-semibold">● 98.2% Kapasitas Terisi</span>
                      </div>
                      <div className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1">
                        <span className="text-[11px] text-muted-foreground font-semibold">Hub Distribusi Surabaya</span>
                        <div className="text-lg font-black text-foreground">8.420 Unit</div>
                        <span className="text-[11px] text-emerald-600 font-semibold">● Stok Siap Kirim</span>
                      </div>
                      <div className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1">
                        <span className="text-[11px] text-muted-foreground font-semibold">Peringatan Minimum Stok</span>
                        <div className="text-lg font-black text-amber-600">3 SKU Menipis</div>
                        <span className="text-[11px] text-amber-700 font-semibold">Perlu restok ke vendor</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: AI Automation Mockup */}
                {activeTab === "automation" && (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-border animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Log Otomasi Sistem & Peringatan Dini</h4>
                        <p className="text-[11px] text-muted-foreground">Tindakan proaktif yang dieksekusi otomatis oleh sistem tanpa input manual</p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        Otomasi Aktif
                      </span>
                    </div>

                    <div className="space-y-2 pt-1 text-xs">
                      <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-200/70 flex items-start gap-3">
                        <CheckCircle2 className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-brand-dark">Pencocokan Faktur 3-Arah Berhasil</span>
                          <p className="text-muted-foreground mt-0.5">PO-2026-0041, Surat Penerimaan Barang (GR), dan Faktur Vendor telah cocok 100%. Jurnal hutang dagang terbit otomatis.</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-900">Draf Purchase Request Otomatis Terbit</span>
                          <p className="text-muted-foreground mt-0.5">Bahan baku Corrugated Box B-02 mendekati safety stock buffer (sisa 180 pcs). Sistem menyiapkan draf PO ke PT Kemasan Jaya.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Omnichannel Marketplace Integration Strip */}
      <section id="omnichannel" className="py-14 border-y border-border bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {t.landing.omnichannelTitle}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t.landing.omnichannelSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
            <ChannelBadge source="marketplace" platform="tiktok" storeName="TikTok Shop Official" />
            <ChannelBadge source="marketplace" platform="shopee" storeName="Shopee Mall" />
            <ChannelBadge source="marketplace" platform="tokopedia" storeName="Tokopedia Store" />
            <ChannelBadge source="marketplace" platform="lazada" storeName="Lazada Store" />
            <ChannelBadge source="marketplace" platform="blibli" storeName="Blibli Store" />
            <ChannelBadge source="pos" storeName="Retail POS Outlets" />
            <ChannelBadge source="quotation" storeName="B2B Contracts" />
            <ChannelBadge source="manual" storeName="Backoffice Sales" />
          </div>
        </div>
      </section>

      {/* Practical How It Works Workflow Section */}
      <section id="workflow" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-indigo">
            Alur Operasional Terpadu
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t.landing.howItWorksTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.landing.howItWorksSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border hover:border-brand-primary/40 transition-all shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-foreground">{t.landing.step1Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.landing.step1Desc}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-brand-primary/40 transition-all shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-brand-primary flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-foreground">{t.landing.step2Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.landing.step2Desc}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-brand-primary/40 transition-all shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-foreground">{t.landing.step3Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.landing.step3Desc}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-brand-primary/40 transition-all shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h3 className="text-base font-bold text-foreground">{t.landing.step4Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.landing.step4Desc}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Complete Modules Suite Section */}
      <section id="modules" className="py-20 bg-slate-50/60 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-indigo">
              Modul Perusahaan
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {t.landing.modulesTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.landing.modulesDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  className="rounded-2xl border border-border bg-white p-6 space-y-3 hover:border-brand-primary/40 hover:shadow-md transition-all"
                >
                  <div className="h-10 w-10 rounded-xl bg-brand-tint text-brand-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">{mod.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedModule(mod)}
                      className="text-xs font-bold text-brand-primary hover:text-brand-indigo inline-flex items-center gap-1"
                    >
                      <span>{t.landing.moduleExplore}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Button asChild variant="gradient" size="lg" className="h-12 px-8 text-sm font-bold shadow-lg shadow-purple-500/25">
              <Link href="/pricing" className="gap-2">
                <span>{t.landing.navPricing}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={selectedModule !== null} onOpenChange={(open) => !open && setSelectedModule(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {selectedModule && (
            <>
              <div className="p-6 sm:p-8 border-b border-border bg-gradient-to-br from-brand-tint/70 to-white">
                <DialogHeader>
                  <div className="h-11 w-11 rounded-xl bg-brand-primary text-white flex items-center justify-center mb-3 shadow-md shadow-purple-500/20">
                    <selectedModule.icon className="h-5 w-5" />
                  </div>
                  <DialogTitle className="text-2xl font-extrabold tracking-tight">
                    {selectedModule.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed max-w-2xl">
                    {selectedModule.description}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-6 p-6 sm:p-8">
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-4">{t.landing.moduleFeatureTitle}</h4>
                  <ul className="space-y-3">
                    {selectedModule.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="min-h-56 rounded-2xl border-2 border-dashed border-brand-primary/25 bg-gradient-to-br from-slate-50 to-brand-tint/40 flex flex-col items-center justify-center text-center p-8">
                  <div className="h-12 w-12 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center mb-3">
                    <ImageIcon className="h-6 w-6 text-brand-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{t.landing.moduleScreenshotPlaceholder}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedModule.title}</p>
                </div>
              </div>

              <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex justify-end">
                <Button asChild variant="gradient" className="font-bold">
                  <Link href="/contact" className="gap-2">
                    {t.landing.moduleCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom CTA Banner */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-brand-dark via-[#421670] to-brand-indigo p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <span className="text-[11px] uppercase font-bold tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white">
              ONE ERP Console
            </span>
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {t.landing.bannerTitle}
            </h3>
            <p className="text-sm text-purple-200">
              {t.landing.bannerDesc}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button asChild size="lg" className="h-12 px-8 text-sm font-bold bg-white text-brand-dark hover:bg-slate-100 shadow-lg">
              <Link href="/login">{t.landing.signIn}</Link>
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
