"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { aiApi, AiSettings } from "@/lib/api/ai";

export default function AiSettingsPage() {
  const [settings, setSettings] = React.useState<AiSettings | null>(null);
  const [provider, setProvider] = React.useState("");
  const [model, setModel] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    aiApi
      .getSettings()
      .then((res) => {
        const s = res.data;
        if (!s) return;
        setSettings(s);
        setProvider(s.provider || s.providers[0]?.id || "");
        setModel(s.model || (s.provider ? "" : s.providers[0]?.defaultModel) || "");
      })
      .catch(() => setMessage({ ok: false, text: "Gagal memuat pengaturan AI dari server." }));
  }, []);

  const selected = settings?.providers.find((p) => p.id === provider);

  const handleProviderChange = (id: string) => {
    setProvider(id);
    setModel(settings?.providers.find((p) => p.id === id)?.defaultModel ?? "");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await aiApi.saveSettings(provider, model, apiKey);
      if (res.data) setSettings(res.data);
      setApiKey("");
      setMessage({ ok: true, text: "Pengaturan AI tersimpan." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menyimpan pengaturan AI." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Setting AI" description="Pilih model bahasa (LLM) dan API key untuk Asisten AI." />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-4 max-w-xl text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold">Penyedia LLM</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-xs"
              >
                {settings?.providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold">Model</label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={selected?.defaultModel}
                className="h-10 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Kosongkan untuk memakai model bawaan penyedia.</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold">API Key</label>
              <Input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings?.hasApiKey ? `Tersimpan (${settings.keyHint}) - isi untuk mengganti` : "Tempel API key"}
                className="h-10 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Disimpan terenkripsi di server dan tidak pernah ditampilkan kembali.
              </p>
            </div>

            {message && (
              <p className={message.ok ? "text-emerald-700" : "text-red-600"}>{message.text}</p>
            )}

            <Button type="submit" variant="gradient" size="sm" disabled={isSaving || !provider} className="gap-1.5">
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Menyimpan..." : "Simpan"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
