"use client";

import * as React from "react";
import { navigationConfig, type NavGroup } from "@/config/navigation";
import { apiClient } from "@/lib/api/client";
import { rbacApi, type PermissionItem } from "@/lib/api/rbac";
import { useAppStore, type UserInfo, type CompanyInfo } from "@/stores/app-store";
import { useTranslation } from "@/lib/i18n/translations";
import { filterNavigation, canViewRoute, canApproveModule } from "@/lib/navigation-access";

const AccessContext = React.createContext<{ navigation: NavGroup[]; canView: (href: string) => boolean; canApprove: (module: string) => boolean }>({ navigation: [], canView: () => false, canApprove: () => false });
export const useNavigationAccess = () => React.useContext(AccessContext);

export function NavigationAccessProvider({ children }: { children: React.ReactNode }) {
  const { token, setUser, setCompany } = useAppStore();
  const { isIndonesian } = useTranslation();
  const [permissions, setPermissions] = React.useState<PermissionItem[] | null>([]);
  const [account, setAccount] = React.useState<{ role: string; roleId?: string | null }>({ role: "" });
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
      if (user.role.toLowerCase() !== "admin" && user.roleId) {
        const role = await rbacApi.getRolePermissions(user.roleId);
        if (!role.success) throw new Error(role.message);
        granted = role.data.permissions;
      }
      if (cancelled) return;
      setUser(user); if (company) setCompany(company);
      setPermissions(granted); setAccount({ role: user.role, roleId: user.roleId }); setReady(true);
    })().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [token, attempt, setUser, setCompany]);
  const value = React.useMemo(() => ({
    navigation: filterNavigation(navigationConfig, permissions),
    canView: (href: string) => canViewRoute(href, permissions),
    canApprove: (module: string) => canApproveModule(module, account, permissions),
  }), [permissions, account]);
  if (failed) return <div role="alert" className="p-6 space-y-3"><p>{isIndonesian ? "Gagal memuat akun dan izin akses." : "Unable to load your account and permissions."}</p><button className="underline" onClick={() => setAttempt((n) => n + 1)}>{isIndonesian ? "Coba lagi" : "Retry"}</button><a className="block underline" href="/login">{isIndonesian ? "Masuk kembali" : "Sign in again"}</a></div>;
  if (!ready) return <p role="status" className="p-6">{isIndonesian ? "Memuat akun…" : "Loading account…"}</p>;
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}
