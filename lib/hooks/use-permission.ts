"use client";

import { useNavigationAccess } from "@/providers/navigation-access";

export function usePermission(module: string) {
  const {
    canView: checkView,
    canCreate: checkCreate,
    canEdit: checkEdit,
    canDelete: checkDelete,
    canSubmit: checkSubmit,
    canApprove: checkApprove,
    canViewPrices: checkViewPrices,
    canEditPrices: checkEditPrices,
    roleName,
  } = useNavigationAccess();

  const canCreate = checkCreate(module);
  const canEdit = checkEdit(module);
  const canDelete = checkDelete(module);
  const canSubmit = checkSubmit(module);
  const canApprove = checkApprove(module);
  const canViewPrices = checkViewPrices(module);
  const canEditPrices = checkEditPrices(module);

  return {
    canView: true, // If component renders within an authorized route
    canCreate,
    canEdit,
    canDelete,
    canSubmit,
    canApprove,
    canViewPrices,
    canEditPrices,
    canManage: canCreate && canEdit,
    roleName,
  };
}
