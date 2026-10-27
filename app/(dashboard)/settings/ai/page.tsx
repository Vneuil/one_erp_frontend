"use client";

import * as React from "react";
import { Copy, KeyRound, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { aiApi, AiSettings, McpToken } from "@/lib/api/ai";
import { API_BASE_URL } from "@/lib/api/client";

export default function AiSettingsPage() {
  const [settings, setSettings] = React.useState<AiSettings | null>(null);
  const [provider, setProvider] = React.useState("");
  const [model, setModel] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [tokens, setTokens] = React.useState<McpToken[]>([]);
  const [tokenName, setTokenName] = React.useState("");
  const [newSecret, setNewSecret] = React.useState<string | null>(null);
  const [tokenError, setTokenError] = React.useState<string | null>(null);
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

  const loadTokens = React.useCallback(() => {
    aiApi
      .listMcpTokens()
      .then((res) => setTokens(res.data ?? []))
      .catch(() => setTokenError("Gagal memuat token MCP (hanya admin yang dapat mengelolanya)."));
  }, []);

  React.useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const mcpUrl = `${API_BASE_URL}/mcp`;

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;
    setTokenError(null);
    try {
      const res = await aiApi.createMcpToken(tokenName.trim());
      setNewSecret(res.data?.secret ?? null);
      setTokenName("");
      loadTokens();
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "Gagal membuat token.");
    }
  };

  const handleRevoke = async (t: McpToken) => {
    if (!confirm(`Cabut token "${t.name}"? Aplikasi yang memakainya akan kehilangan akses.`)) return;
    try {
      await aiApi.revokeMcpToken(t.id);
      loadTokens();
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "Gagal mencabut token.");
    }
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text);

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

      <Card>
        <CardContent className="p-6 space-y-4 text-xs">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Token MCP
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1">
              Hubungkan aplikasi AI lain (Claude, ChatGPT, Cursor, dll.) ke ERP lewat Model Context Protocol. Akses hanya-baca
              melalui laporan ERP, tidak langsung ke database.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold">URL server MCP</label>
            <div className="flex gap-2">
              <Input readOnly value={mcpUrl} className="h-10 text-xs font-mono" />
              <Button type="button" variant="outline" size="sm" onClick={() => copy(mcpUrl)} className="h-10 gap-1.5">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Kirim token sebagai header <code>Authorization: Bearer &lt;token&gt;</code>.
            </p>
          </div>

          {newSecret && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
              <p className="font-semibold text-amber-900">Salin token sekarang. Token tidak akan ditampilkan lagi.</p>
              <div className="flex gap-2">
                <Input readOnly value={newSecret} className="h-10 text-xs font-mono bg-white" />
                <Button type="button" variant="outline" size="sm" onClick={() => copy(newSecret)} className="h-10 gap-1.5">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setNewSecret(null)}>
                Sudah saya salin
              </Button>
            </div>
          )}

          <form onSubmit={handleCreateToken} className="flex gap-2 max-w-xl">
            <Input
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Nama token, mis. Claude Desktop"
              className="h-10 text-xs"
            />
            <Button type="submit" variant="gradient" size="sm" disabled={!tokenName.trim()} className="h-10">
              Buat token
            </Button>
          </form>

          {tokenError && <p className="text-red-600">{tokenError}</p>}

          <div className="divide-y divide-border rounded-lg border border-border">
            {tokens.length === 0 && <p className="p-3 text-muted-foreground">Belum ada token.</p>}
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 gap-3">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    ••••{t.hint} · dibuat {new Date(t.createdAt).toLocaleDateString("id-ID")} ·{" "}
                    {t.lastUsedAt ? `terakhir dipakai ${new Date(t.lastUsedAt).toLocaleString("id-ID")}` : "belum pernah dipakai"}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => handleRevoke(t)} className="gap-1.5">
                  <Trash2 className="h-4 w-4" /> Cabut
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
