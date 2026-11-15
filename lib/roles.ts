// Role helpers shared by the UI. The backend is the source of truth (it rejects
// the call with 403); these only decide what to show.
//
// "Superadmin" (Ko Steven) and the admin seated next to him (Mba Nadin) both
// carry the legacy `admin` account role. Anything else is Manager / Staff.

const SUPER = new Set(["admin", "superadmin", "owner"]);
const MANAGER = new Set(["admin", "superadmin", "owner", "manager"]);

export const isSuperAdmin = (role?: string | null) => SUPER.has((role ?? "").toLowerCase());

/** Manager and above: may deactivate / delete master data. */
export const canManageMasterData = (role?: string | null) => MANAGER.has((role ?? "").toLowerCase());

/**
 * Master Produk carries standard cost and selling prices.
 */
export const SHOW_PRICE_IN_PRODUCT_MASTER = true;

// Mirrors the backend (actor.TradeDocRoles / MaySeePrices). The server stays authoritative.
const TRADE_DOCS = new Set([
  "admin",
  "superadmin",
  "owner",
  "finance",
  "akuntan",
  "accountant",
  "accounting",
  "sales",
  "salesman",
  "sales_staff",
  "sales_admin",
  "salesperson",
]);

/** PI/CI menu and price entry: superadmin, admin, accountants, and sales. */
export const canUseTradeDocs = (role?: string | null) => TRADE_DOCS.has((role ?? "").toLowerCase());

/** Prices live on the Sales Order and can be entered/edited during create and edit. */
export const canEditPrices = (role?: string | null) => true;

/** Staff only get the work instruction; selling prices are shown to managers and the trade-doc roles. */
export const canSeeSalesPrices = (role?: string | null) => canUseTradeDocs(role) || (role ?? "").toLowerCase() === "manager";
