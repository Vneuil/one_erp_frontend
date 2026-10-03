import type { NavGroup } from "@/config/navigation";
import type { PermissionItem } from "@/lib/api/rbac";

// API path segments mirror the backend RBAC middleware, including legacy exemptions.
const routeModules: Record<string, string[]> = {
  "/crm/whatsapp": ["omnichannel"], "/pos/loyalty": ["loyalty"],
  "/master-data/products": ["products"], "/master-data/categories-units": ["product-categories", "units-of-measure"],
  "/master-data/pricing-terms": ["payment-terms", "customer-types", "tax-rates"],
  "/master-data/customers": ["customers"], "/master-data/suppliers": ["suppliers"],
  "/master-data/salesmen": ["salesmen"], "/master-data/warehouses": ["warehouses"],
  "/master-data/shipping-methods": ["shipping-methods"],
  "/tools/chat": ["collaboration"], "/tools/drive": ["collaboration"],
  "/tools/meetings": ["docflow"], "/tools/forms": ["docflow"], "/tools/signatures": ["docflow"], "/tools/exports": ["collaboration"],
  "/settings/users": ["users"], "/settings/activity-log": ["activity-logs"],
  "/settings/approval-workflows": ["approval"], "/settings/currencies": ["currencies"],
  "/settings/integration": ["integration"], "/approvals": ["approval"],
};
const exempt = ["/dashboard", "/profile", "/billing/subscription", "/settings/roles", "/settings/permissions", "/settings/tenants", "/settings/company", "/ai/assistant"];
export function canViewRoute(href: string, permissions: PermissionItem[] | null): boolean {
  if (permissions === null || exempt.includes(href)) return true;
  const modules = routeModules[href] ?? [href.split("/")[1]];
  return modules.every((module) => permissions.some((p) => p.module === module && p.canView));
}
export function filterNavigation(navigation: NavGroup[], permissions: PermissionItem[] | null): NavGroup[] {
  return navigation.map((group) => ({ ...group, items: group.items.flatMap((item) => {
    if (item.items) {
      const children = item.items.filter((sub) => canViewRoute(sub.href, permissions));
      return children.length ? [{ ...item, items: children }] : [];
    }
    return item.href && canViewRoute(item.href, permissions) ? [item] : [];
  }) })).filter((group) => group.items.length > 0);
}

// Mirrors the backend ApprovalGate (rbac.mayApprove) so the UI only offers
// approval actions the server would accept. The server stays authoritative.
export function canApproveModule(
  module: string,
  account: { role: string; roleId?: string | null },
  permissions: PermissionItem[] | null,
): boolean {
  const role = account.role.toLowerCase();
  if (role === "admin") return true;
  if (account.roleId) return permissions?.some((p) => p.module === module && p.canApprove === true) ?? false;
  return role === "manager";
}
