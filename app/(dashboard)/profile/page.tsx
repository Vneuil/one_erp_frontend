"use client";

import { useAppStore } from "@/stores/app-store";
import { useTranslation } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/shared/page-header";

export default function ProfilePage() {
  const { currentUser, currentCompany } = useAppStore();
  const { t, isIndonesian } = useTranslation();
  return <div className="space-y-6">
    <PageHeader title={t.header.myProfile} description={isIndonesian ? "Informasi akun yang sedang masuk." : "Your signed-in account details."} />
    <dl className="rounded-xl border bg-white p-6 space-y-4">
      {[[isIndonesian ? "Nama" : "Name", currentUser.name], ["Email", currentUser.email], [isIndonesian ? "Peran" : "Role", currentUser.role], [isIndonesian ? "Perusahaan" : "Company", currentCompany.name]].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-medium break-words">{value}</dd></div>)}
    </dl>
  </div>;
}
