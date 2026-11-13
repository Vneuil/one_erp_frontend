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

/** Prices live on the Sales Order and are entered by superadmin / admin only. */
export const canEditPrices = (role?: string | null) => canUseTradeDocs(role);

/**
 * Master Produk no longer carries prices (feedback Tim Manna, 12 Nov 2026):
 * prices are typed per line on the Sales Order by superadmin / admin.
 * The product record keeps its cost/selling price columns for existing reports;
 * flip this on only if the master price columns ever need to come back.
 */
export const SHOW_PRICE_IN_PRODUCT_MASTER = false;

// Mirrors the backend (actor.TradeDocRoles / MaySeePrices). The server stays authoritative.
const TRADE_DOCS = new Set(["admin", "superadmin", "owner", "finance", "akuntan", "accountant", "accounting"]);

/** PI/CI menu and price entry: superadmin, admin and the accountants. */
export const canUseTradeDocs = (role?: string | null) => TRADE_DOCS.has((role ?? "").toLowerCase());

/** Staff only get the work instruction; selling prices are shown to managers and the trade-doc roles. */
export const canSeeSalesPrices = (role?: string | null) => canUseTradeDocs(role) || (role ?? "").toLowerCase() === "manager";
