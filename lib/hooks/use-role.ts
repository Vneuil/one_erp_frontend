"use client";

import { useAppStore } from "@/stores/app-store";
import { canEditPrices, canManageMasterData, canSeeSalesPrices, canUseTradeDocs, isSuperAdmin } from "@/lib/roles";
import { useNavigationAccess } from "@/providers/navigation-access";

export function useRole() {
  const role = useAppStore((s) => s.currentUser.role);
  const { roleName } = useNavigationAccess();
  return {
    role,
    roleName,
    isSuperAdmin: isSuperAdmin(role) || isSuperAdmin(roleName),
    canManageMasterData: canManageMasterData(role) || canManageMasterData(roleName),
    canEditPrices: canEditPrices(role) || canEditPrices(roleName),
    /** PI/CI menu: superadmin, admin, accountants. */
    canUseTradeDocs: canUseTradeDocs(role) || canUseTradeDocs(roleName),
    /** Staff never see selling prices. */
    canSeePrices: canSeeSalesPrices(role) || canSeeSalesPrices(roleName),
  };
}
