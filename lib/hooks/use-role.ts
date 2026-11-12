"use client";

import { useAppStore } from "@/stores/app-store";
import { canEditPrices, canManageMasterData, isSuperAdmin } from "@/lib/roles";

export function useRole() {
  const role = useAppStore((s) => s.currentUser.role);
  return {
    role,
    isSuperAdmin: isSuperAdmin(role),
    canManageMasterData: canManageMasterData(role),
    canEditPrices: canEditPrices(role),
  };
}
