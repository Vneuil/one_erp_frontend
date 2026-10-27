import {
  LayoutDashboard,
  Database,
  ShoppingCart,
  Receipt,
  Boxes,
  Factory,
  Wallet,
  Settings,
  UserCheck,
  Building2,
  Sparkles,
  LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  href: string;
  badge?: string;
}

export interface NavItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
  items?: NavSubItem[];
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const navigationConfig: NavGroup[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // OVERVIEW
  // ─────────────────────────────────────────────────────────────────────────────
  {
    group: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "AI Assistant",
        href: "/ai/assistant",
        icon: Sparkles,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SUPPLY CHAIN
  // ─────────────────────────────────────────────────────────────────────────────
  {
    group: "Supply Chain",
    items: [
      {
        title: "Master Data",
        icon: Database,
        items: [
          { title: "Produk", href: "/master-data/products" },
          { title: "Kategori & Satuan", href: "/master-data/categories-units" },
          { title: "Pelanggan", href: "/master-data/customers" },
          { title: "Supplier", href: "/master-data/suppliers" },
          { title: "Gudang", href: "/master-data/warehouses" },
        ],
      },
      {
        title: "Pembelian",
        icon: Receipt,
        items: [
          { title: "Order Pembelian", href: "/procurement/purchase-orders" },
          { title: "Penerimaan Barang", href: "/procurement/receipts" },
          { title: "Tanda Terima Nota", href: "/procurement/invoice-receipts" },
          { title: "Retur Pembelian", href: "/procurement/purchase-returns" },
          { title: "Pelunasan Hutang", href: "/procurement/down-payments" },
          { title: "Laporan Pembelian", href: "/reports/purchases" },
        ],
      },
      {
        title: "Penjualan",
        icon: ShoppingCart,
        items: [
          { title: "Order Penjualan", href: "/sales/sales-orders" },
          { title: "Nota / Invoice", href: "/sales/invoices" },
          { title: "Retur Penjualan", href: "/sales/returns" },
          { title: "Pelunasan Piutang", href: "/sales/down-payments" },
          { title: "Laporan Penjualan", href: "/reports/sales" },
        ],
      },
      {
        title: "Stock & Inventory",
        icon: Boxes,
        items: [
          { title: "Kartu Stock / Mutasi", href: "/inventory/stock-movements" },
          { title: "Laporan Persediaan", href: "/inventory/stock" },
          { title: "Transaksi Stock", href: "/inventory/stock-documents" },
          { title: "Stock Opname", href: "/inventory/stock-opname" },
          { title: "Analisa Umur Stock", href: "/inventory/reports" },
          { title: "Penerimaan Barang Jadi", href: "/inventory/transfers" },
        ],
      },
      {
        title: "Produksi",
        icon: Factory,
        items: [
          { title: "Bill of Material", href: "/manufacturing/bom" },
          { title: "Order Produksi", href: "/manufacturing/production-orders" },
          { title: "Layar Produksi", href: "/manufacturing/production" },
          { title: "Laporan Produksi", href: "/manufacturing/reports" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // KEUANGAN & AKUNTANSI
  // ─────────────────────────────────────────────────────────────────────────────
  {
    group: "Keuangan & Akuntansi",
    items: [
      {
        title: "Akuntansi",
        icon: Wallet,
        items: [
          { title: "Daftar Akun", href: "/finance/accounts" },
          { title: "Memorial / Adjustment", href: "/finance/journal-entries" },
          { title: "Kas & Bank", href: "/finance/cash-vouchers" },
          { title: "Kas Bon Sementara (KBS)", href: "/finance/petty-cash" },
          { title: "Buku Besar", href: "/finance/general-ledger" },
          { title: "Laporan Kas / Bank Harian", href: "/finance/cash-book" },
          { title: "Neraca", href: "/finance/reports" },
          { title: "Laba / Rugi", href: "/finance/expense-reports" },
          { title: "Kartu & Saldo Piutang", href: "/finance/receivable-card" },
          { title: "Pelunasan Piutang (AR)", href: "/finance/receivables" },
          { title: "Kartu & Saldo Hutang", href: "/finance/payable-card" },
          { title: "Pelunasan Hutang (AP)", href: "/finance/payables" },
          { title: "Faktur Pajak", href: "/finance/tax-invoices" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AKTIVA / FIXED ASSET
  // ─────────────────────────────────────────────────────────────────────────────
  {
    group: "Aktiva",
    items: [
      {
        title: "Fixed Asset",
        icon: Building2,
        items: [
          { title: "Daftar Aktiva", href: "/assets" },
          { title: "Pembelian & Penjualan Aktiva", href: "/assets/purchase" },
          { title: "Laporan Penyusutan", href: "/assets/depreciation" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SDM & PERSONALIA
  // ─────────────────────────────────────────────────────────────────────────────
  {
    group: "SDM & Personalia",
    items: [
      {
        title: "Absensi & Personalia",
        icon: UserCheck,
        items: [
          { title: "Karyawan", href: "/hrm/employees" },
          { title: "Absensi (Fingerprint)", href: "/hrm/fingerprint" },
          { title: "Mutasi Karyawan", href: "/hrm/letters" },
          { title: "Surat Perintah Lembur", href: "/hrm/schedule" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMINISTRASI & SISTEM
  // ─────────────────────────────────────────────────────────────────────────────
  {
    group: "Administrasi",
    items: [
      {
        title: "Pengaturan",
        icon: Settings,
        items: [
          { title: "Profil Perusahaan", href: "/settings/company" },
          { title: "Pengguna", href: "/settings/users" },
          { title: "Role & Hak Akses", href: "/settings/roles" },
          { title: "Permissions", href: "/settings/permissions" },
          { title: "Log Aktivitas", href: "/settings/activity-log" },
          { title: "System Logs", href: "/settings/system-logs" },
          { title: "Setting AI", href: "/settings/ai" },
        ],
      },
    ],
  },
];
