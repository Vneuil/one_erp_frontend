import {
  LayoutDashboard,
  ClipboardCheck,
  Database,
  ShoppingCart,
  Receipt,
  BarChart3,
  Boxes,
  Warehouse,
  Factory,
  Wallet,
  Settings,
  Users2,
  Store,
  FolderKanban,
  UserCheck,
  Building,
  Smartphone,
  MessageSquare,
  Sparkles,
  GraduationCap,
  FileCheck,
  Percent,
  CreditCard,
  Target,
  LifeBuoy,
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
        badge: "AI",
      },
      {
        title: "Approval Center",
        href: "/approvals",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    group: "Sales & CRM",
    items: [
      {
        title: "CRM Hub",
        icon: Users2,
        items: [
          { title: "Leads & Prospects", href: "/crm/leads" },
          { title: "Deal Pipeline", href: "/crm/pipeline" },
          { title: "Sales Tasks", href: "/crm/tasks" },
          { title: "Contacts", href: "/crm/contacts" },
          { title: "CRM Intelligence", href: "/crm/analytics" },
          { title: "CRM Settings", href: "/crm/settings" },
          { title: "Omnichannel Inbox", href: "/crm/whatsapp", badge: "Live" },
        ],
      },
      {
        title: "Sales Orders",
        icon: ShoppingCart,
        items: [
          { title: "Quotations", href: "/sales/quotations" },
          { title: "Omnichannel Orders", href: "/sales/sales-orders", badge: "Live" },
          { title: "Deliveries", href: "/sales/deliveries" },
          { title: "Down Payments", href: "/sales/down-payments" },
          { title: "Sales Invoices", href: "/sales/invoices" },
          { title: "Billing Terms", href: "/sales/billing-terms" },
          { title: "Sales Returns", href: "/sales/returns" },
        ],
      },
      {
        title: "Point of Sale",
        icon: Store,
        items: [
          { title: "POS Cashier", href: "/pos", badge: "POS" },
          { title: "POS History", href: "/pos/transactions" },
          { title: "Loyalty Members", href: "/pos/loyalty" },
          { title: "POS Reports", href: "/pos/reports" },
          { title: "Sales Reports", href: "/reports/sales" },
          { title: "POS Settings", href: "/pos/settings" },
        ],
      },
      {
        title: "Commercials",
        icon: Percent,
        items: [
          { title: "Contracts", href: "/contracts" },
          { title: "Sales Commissions", href: "/commissions" },
        ],
      },
    ],
  },
  {
    group: "Supply Chain & Operations",
    items: [
      {
        title: "Master Data",
        icon: Database,
        items: [
          { title: "Products", href: "/master-data/products" },
          { title: "Barcode Labels", href: "/master-data/labels" },
          { title: "Categories & Units", href: "/master-data/categories-units" },
          { title: "Pricing & Terms", href: "/master-data/pricing-terms" },
          { title: "Customers", href: "/master-data/customers" },
          { title: "Suppliers", href: "/master-data/suppliers" },
          { title: "Salesmen", href: "/master-data/salesmen" },
          { title: "Warehouses", href: "/master-data/warehouses" },
          { title: "Shipping Methods", href: "/master-data/shipping-methods" },
        ],
      },
      {
        title: "Procurement",
        icon: Receipt,
        items: [
          { title: "Purchase Requests", href: "/procurement/purchase-requests" },
          { title: "Purchase Orders", href: "/procurement/purchase-orders" },
          { title: "Goods Receipts", href: "/procurement/receipts" },
          { title: "Down Payments", href: "/procurement/down-payments" },
          { title: "Vendor Invoices", href: "/procurement/purchase-invoices" },
          { title: "Purchase Returns", href: "/procurement/purchase-returns" },
          { title: "Purchase Reports", href: "/reports/purchases" },
        ],
      },
      {
        title: "Inventory",
        icon: Boxes,
        items: [
          { title: "Stock Overview", href: "/inventory/stock" },
          { title: "Movements", href: "/inventory/stock-movements" },
          { title: "Movement Summary", href: "/inventory/stock-movements/summary" },
          { title: "Batches & Expiry", href: "/inventory/batches" },
          { title: "Stock Transactions", href: "/inventory/stock-documents" },
          { title: "Stock Opname", href: "/inventory/stock-opname" },
          { title: "Transfers", href: "/inventory/transfers" },
          { title: "Stock Reports", href: "/inventory/reports" },
        ],
      },
      {
        title: "Warehouse WMS",
        icon: Warehouse,
        items: [
          { title: "Wave Picking", href: "/warehouse/picking" },
          { title: "Packing Station", href: "/warehouse/packing" },
          { title: "Shipping Manifests", href: "/warehouse/shipping" },
        ],
      },
      {
        title: "Manufacturing",
        icon: Factory,
        items: [
          { title: "Manufacturing Dashboard", href: "/manufacturing/dashboard" },
          { title: "Bill of Materials", href: "/manufacturing/bom" },
          { title: "Production Orders", href: "/manufacturing/production-orders" },
          { title: "Production Run", href: "/manufacturing/production" },
          { title: "Production Reports", href: "/manufacturing/reports" },
        ],
      },
    ],
  },
  {
    group: "Projects & Services",
    items: [
      {
        title: "Project Management",
        icon: FolderKanban,
        items: [
          { title: "All Projects (RAB/RAP)", href: "/projects" },
          { title: "Work Orders (SPK)", href: "/projects/work-orders" },
          { title: "Project Profitability", href: "/projects/profitability" },
          { title: "Kanban Board", href: "/projects/kanban" },
          { title: "Live Timesheet", href: "/projects/timesheet" },
          { title: "Service Tickets", href: "/projects/tickets" },
        ],
      },
      {
        title: "Dedicated Support",
        icon: LifeBuoy,
        href: "/support",
      },
    ],
  },
  {
    group: "Human Resources & Payroll",
    items: [
      {
        title: "HRM & Talent",
        icon: UserCheck,
        items: [
          { title: "HR Dashboard", href: "/hrm/dashboard" },
          { title: "Employees", href: "/hrm/employees" },
          { title: "Letters & Mutations", href: "/hrm/letters" },
          { title: "Organization Chart", href: "/hrm/organization" },
          { title: "Smart Attendance", href: "/hrm/attendance" },
          { title: "Attendance Locations", href: "/hrm/attendance-locations" },
          { title: "Leaves & Permissions", href: "/hrm/leaves" },
          { title: "Employee Requests", href: "/hrm/requests" },
          { title: "Team Approvals", href: "/hrm/team-approvals" },
          { title: "Shift Schedule", href: "/hrm/schedule" },
          { title: "Employee Documents", href: "/hrm/documents" },
          { title: "Field Visits", href: "/hrm/visits" },
          { title: "Canteen", href: "/hrm/canteen" },
          { title: "Cash Advances", href: "/hrm/cash-advances" },
          { title: "360° Feedback", href: "/hrm/feedback" },
          { title: "Announcements", href: "/hrm/announcements" },
          { title: "Payroll & PPh21", href: "/hrm/payroll", badge: "BCA" },
          { title: "My Payslips", href: "/hrm/my-payslips" },
          { title: "Reimbursements", href: "/hrm/reimbursements" },
          { title: "KPI Reviews", href: "/hrm/kpi" },
          { title: "Employee Cooperative", href: "/hrm/cooperative" },
        ],
      },
      {
        title: "Recruitment & LMS",
        icon: GraduationCap,
        items: [
          { title: "Recruitment Pipeline", href: "/recruitment" },
          { title: "LMS & Onboarding", href: "/lms" },
        ],
      },
      {
        title: "Goal & Target Management",
        icon: Target,
        href: "/goals",
      },
    ],
  },
  {
    group: "Finance, Banking & Assets",
    items: [
      {
        title: "Finance & Accounting",
        icon: Wallet,
        items: [
          { title: "Chart of Accounts", href: "/finance/accounts" },
          { title: "Journal Entries", href: "/finance/journal-entries" },
          { title: "Cash & Bank Vouchers", href: "/finance/cash-vouchers" },
          { title: "General Ledger", href: "/finance/general-ledger" },
          { title: "Daily Cash & Bank Report", href: "/finance/cash-book" },
          { title: "Receivables (AR)", href: "/finance/receivables" },
          { title: "Payables (AP)", href: "/finance/payables" },
          { title: "Receivable Card & Balances", href: "/finance/receivable-card" },
          { title: "Payable Card & Balances", href: "/finance/payable-card" },
          { title: "Budgets & Control", href: "/finance/budgets" },
          { title: "Petty Cash", href: "/finance/petty-cash" },
          { title: "Owner Funds & Other Income", href: "/finance/owner-funds" },
          { title: "Financial Reports", href: "/finance/reports" },
          { title: "Tax Invoices (Faktur Pajak)", href: "/finance/tax-invoices" },
          { title: "Tax Reports", href: "/finance/tax-reports" },
          { title: "Tax Settings", href: "/finance/tax-settings" },
          { title: "Expense & Non-Operating Reports", href: "/finance/expense-reports" },
        ],
      },
      {
        title: "Enterprise Reports",
        href: "/reports",
        icon: BarChart3,
      },
      {
        title: "Banking & Treasury",
        icon: Building,
        items: [
          { title: "Bank Accounts", href: "/banking/accounts" },
          { title: "Bank Reconciliation", href: "/banking/reconciliation" },
        ],
      },
      {
        title: "Enterprise Assets",
        icon: Smartphone,
        items: [
          { title: "Asset Registry", href: "/assets" },
          { title: "Asset Depreciation", href: "/assets/depreciation" },
          { title: "Device Terminals", href: "/devices" },
        ],
      },
    ],
  },
  {
    group: "Productivity & Tools",
    items: [
      {
        title: "Collaboration Tools",
        icon: MessageSquare,
        items: [
          { title: "ONE Chat", href: "/tools/chat" },
          { title: "Cloud Drive", href: "/tools/drive" },
          { title: "Meetings & AI Notes", href: "/tools/meetings", badge: "AI" },
          { title: "Dynamic Forms", href: "/tools/forms" },
          { title: "E-Signatures", href: "/tools/signatures" },
          { title: "Export Center", href: "/tools/exports" },
        ],
      },
    ],
  },
  {
    group: "System & Administration",
    items: [
      {
        title: "Settings",
        icon: Settings,
        items: [
          { title: "Company Profile", href: "/settings/company" },
          { title: "Tenants", href: "/settings/tenants" },
          { title: "Users", href: "/settings/users" },
          { title: "Roles", href: "/settings/roles" },
          { title: "Permissions", href: "/settings/permissions" },
          { title: "Activity Log", href: "/settings/activity-log" },
          { title: "Backend Logs", href: "/settings/system-logs" },
          { title: "Approval Workflows", href: "/settings/approval-workflows" },
          { title: "Currencies", href: "/settings/currencies" },
          { title: "API & Webhooks", href: "/settings/integration" },
        ],
      },
      {
        title: "Billing & Plans",
        icon: CreditCard,
        href: "/billing/subscription",
      },
    ],
  },
];
