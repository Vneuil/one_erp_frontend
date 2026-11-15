"use client";

import * as React from "react";
import { navigationConfig, type NavGroup } from "@/config/navigation";
import { apiClient } from "@/lib/api/client";
import { rbacApi, type PermissionItem } from "@/lib/api/rbac";
import { useAppStore, type UserInfo, type CompanyInfo } from "@/stores/app-store";
import { useTranslation } from "@/lib/i18n/translations";
import { canUseTradeDocs } from "@/lib/roles";
import {
  filterNavigation,
  canViewRoute,
  canCreateModule,
  canEditModule,
  canDeleteModule,
  canSubmitModule,
  canApproveModule,
  canViewPricesModule,
  canEditPricesModule,
} from "@/lib/navigation-access";

interface AccessContextType {
  navigation: NavGroup[];
  canView: (href: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  canSubmit: (module: string) => boolean;
  canApprove: (module: string) => boolean;
  canViewPrices: (module: string) => boolean;
  canEditPrices: (module: string) => boolean;
  roleName: string | null;
}

const AccessContext = React.createContext<AccessContextType>({
  navigation: [],
  canView: () => false,
  canCreate: () => false,
  canEdit: () => false,
  canDelete: () => false,
  canSubmit: () => false,
  canApprove: () => false,
  canViewPrices: () => false,
  canEditPrices: () => false,
  roleName: null,
});
export const useNavigationAccess = () => React.useContext(AccessContext);

export function NavigationAccessProvider({ children }: { children: React.ReactNode }) {
  const { token, setUser, setCompany } = useAppStore();
  const { isIndonesian } = useTranslation();
  const [permissions, setPermissions] = React.useState<PermissionItem[] | null>([]);
  const [account, setAccount] = React.useState<{ role: string; roleId?: string | null }>({ role: "" });
  const [roleName, setRoleName] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    let cancelled = false;
    setReady(false); setFailed(false);
    (async () => {
      const result = await apiClient<{ user: UserInfo & { roleId?: string }; company?: CompanyInfo }>("/auth/me");
      if (!result.success || !result.data?.user) throw new Error("Unable to load account");
      const { user, company } = result.data;
      let granted: PermissionItem[] | null = null;
      let resolvedRoleName: string | null = null;
      if (user.role.toLowerCase() !== "admin" && user.roleId) {
        const role = await rbacApi.getRolePermissions(user.roleId);
        if (!role.success) throw new Error(role.message);
        granted = role.data.permissions;
        resolvedRoleName = role.data.role?.name ?? null;
      }
      if (cancelled) return;
      setUser(user); if (company) setCompany(company);
      setPermissions(granted); setAccount({ role: user.role, roleId: user.roleId }); setRoleName(resolvedRoleName); setReady(true);
    })().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [token, attempt, setUser, setCompany]);
  const value = React.useMemo(() => ({
    navigation: filterNavigation(navigationConfig, permissions).map((g) => ({ ...g, items: g.items.map((it) => it.items ? { ...it, items: it.items.filter((sub) => !sub.superAdminOnly || canUseTradeDocs(account.role) || canUseTradeDocs(roleName)) } : it) })),
    canView: (href: string) => canViewRoute(href, permissions),
    canCreate: (module: string) => canCreateModule(module, account, permissions),
    canEdit: (module: string) => canEditModule(module, account, permissions),
    canDelete: (module: string) => canDeleteModule(module, account, permissions),
    canSubmit: (module: string) => canSubmitModule(module, account, permissions),
    canApprove: (module: string) => canApproveModule(module, account, permissions),
    canViewPrices: (module: string) => canViewPricesModule(module, account, permissions),
    canEditPrices: (module: string) => canEditPricesModule(module, account, permissions),
    roleName,
  }), [permissions, account, roleName]);
  if (failed) return <div role="alert" className="p-6 space-y-3"><p>{isIndonesian ? "Gagal memuat akun dan izin akses." : "Unable to load your account and permissions."}</p><button className="underline" onClick={() => setAttempt((n) => n + 1)}>{isIndonesian ? "Coba lagi" : "Retry"}</button><a className="block underline" href="/login">{isIndonesian ? "Masuk kembali" : "Sign in again"}</a></div>;
  if (!ready) return <p role="status" className="p-6">{isIndonesian ? "Memuat akun…" : "Loading account…"}</p>;
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}
