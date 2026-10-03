"use client";

import * as React from "react";
import { Building2, Save, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { useAppStore } from "@/stores/app-store";

export default function CompanySettingsPage() {
  const { currentCompany, setCompany } = useAppStore();
  const [saved, setSaved] = React.useState(false);
  const [form, setForm] = React.useState({
    name: currentCompany.name,
    code: currentCompany.code,
    taxId: "01.234.567.8-901.000",
    email: "corp@sentosa.co.id",
    phone: "021-8972000",
    address: "Kawasan Industri MM2100 Blok B-12, Cikarang Barat, Jawa Barat 17530",
    currency: "IDR",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCompany({
      ...currentCompany,
      name: form.name,
      code: form.code,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Company Profile & Legal Entity"
        description="Configure corporate identifiers, legal registration numbers, and base operational currency."
      />

      {saved && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Company profile updated successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-primary" /> Entity Identity
            </CardTitle>
            <CardDescription>Official business credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Company Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Company Code *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Tax ID / NPWP</label>
                <Input
                  value={form.taxId}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Base Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <option value="IDR">IDR - Indonesian Rupiah (Rp)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="SGD">SGD - Singapore Dollar (S$)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Corporate Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Registered Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={3}
                className="flex w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="gradient" className="gap-2 font-semibold">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
