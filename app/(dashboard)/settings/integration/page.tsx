"use client";

import * as React from "react";
import { Plug, Plus, KeyRound, Webhook, Send, CheckCircle2, XCircle, History, Store, RefreshCw, Unlink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import {
  integrationApi,
  ApiKeyItem,
  WebhookItem,
  WebhookDeliveryItem,
  EVENT_TYPES,
} from "@/lib/api/integration";
import {
  marketplaceApi,
  MarketplaceConnection,
  MarketplacePlatform,
} from "@/lib/api/marketplace";
import { omnichannelApi, ChannelConnection } from "@/lib/api/omnichannel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MARKETPLACES: { platform: MarketplacePlatform; label: string }[] = [
  { platform: "tiktok_shop", label: "TikTok Shop" },
  { platform: "shopee", label: "Shopee" },
  { platform: "lazada", label: "Lazada" },
];

const CONNECT_URL_FOR: Partial<Record<MarketplacePlatform, () => ReturnType<typeof marketplaceApi.getTikTokConnectUrl>>> = {
  tiktok_shop: marketplaceApi.getTikTokConnectUrl,
  shopee: marketplaceApi.getShopeeConnectUrl,
  lazada: marketplaceApi.getLazadaConnectUrl,
};

function MarketplaceConnectionsSection() {
  const [connections, setConnections] = React.useState<MarketplaceConnection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyPlatform, setBusyPlatform] = React.useState<MarketplacePlatform | null>(null);
  const [busyAction, setBusyAction] = React.useState<"connect" | "sync" | "disconnect" | null>(null);

  // Blibli has no OAuth redirect flow - the seller pastes these 4 values in
  // from their own Blibli Seller Center account instead of clicking through
  // a "Connect" redirect like TikTok Shop/Shopee.
  const [blibliForm, setBlibliForm] = React.useState({
    businessPartnerCode: "",
    mtaUsername: "",
    apiSellerKey: "",
    signatureKey: "",
  });

  const loadConnections = React.useCallback(() => {
    setLoading(true);
    marketplaceApi
      .listConnections()
      .then((res) => setConnections(res.data ?? []))
      .catch((err) => console.warn("Failed to load marketplace connections", err))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Surface the OAuth redirect result (see backend marketplace module's
  // callback handlers, which redirect here with these query params) as a
  // one-time alert, then strip them from the URL.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const marketplace = params.get("marketplace");
    const status = params.get("status");
    if (!marketplace || !status) return;

    const label = MARKETPLACES.find((m) => m.platform === marketplace)?.label || marketplace;
    if (status === "connected") {
      alert(`${label} connected successfully.`);
      loadConnections();
    } else if (status === "error") {
      alert(`Failed to connect ${label}: ${params.get("message") || "Unknown error"}`);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("marketplace");
    url.searchParams.delete("status");
    url.searchParams.delete("message");
    window.history.replaceState({}, "", url.toString());
  }, [loadConnections]);

  const connectionFor = (platform: MarketplacePlatform) =>
    connections.find((c) => c.platform === platform && c.status === "connected");

  const handleConnect = (platform: MarketplacePlatform) => {
    setBusyPlatform(platform);
    setBusyAction("connect");
    const getUrl = CONNECT_URL_FOR[platform];
    if (!getUrl) {
      setBusyPlatform(null);
      setBusyAction(null);
      return;
    }
    getUrl()
      .then((res) => {
        if (res.data?.authorizeUrl) {
          window.location.href = res.data.authorizeUrl;
        }
      })
      .catch((err) => {
        console.warn(`Failed to start ${platform} connect flow`, err);
        alert((err as Error).message || `Could not start the ${platform} connection. Please try again.`);
      })
      .finally(() => {
        setBusyPlatform(null);
        setBusyAction(null);
      });
  };

  const handleSync = (platform: MarketplacePlatform) => {
    setBusyPlatform(platform);
    setBusyAction("sync");
    marketplaceApi
      .sync(platform)
      .then((res) => {
        const r = res.data;
        alert(
          r
            ? `Sync complete: ${r.ordersFetched} orders fetched, ${r.ordersCreated} new Sales Orders created, ${r.ordersSkipped} already synced.` +
            (r.productsFetched ? ` Products: ${r.productsFetched} fetched, ${r.productsCreated ?? 0} created, ${r.productsUpdated ?? 0} updated.` : "")
            : "Sync completed."
        );
        loadConnections();
      })
      .catch((err) => {
        console.warn(`Failed to sync ${platform}`, err);
        alert((err as Error).message || `Failed to sync ${platform} orders.`);
      })
      .finally(() => {
        setBusyPlatform(null);
        setBusyAction(null);
      });
  };

  const handleConnectBlibli = () => {
    const { businessPartnerCode, mtaUsername, apiSellerKey } = blibliForm;
    if (!businessPartnerCode || !mtaUsername || !apiSellerKey) {
      alert("Business Partner Code, MTA Username and API Seller Key are required.");
      return;
    }
    setBusyPlatform("blibli");
    setBusyAction("connect");
    marketplaceApi
      .connectBlibli(blibliForm)
      .then(() => {
        alert("Blibli connected successfully.");
        setBlibliForm({ businessPartnerCode: "", mtaUsername: "", apiSellerKey: "", signatureKey: "" });
        loadConnections();
      })
      .catch((err) => {
        console.warn("Failed to connect Blibli", err);
        alert((err as Error).message || "Could not verify Blibli credentials. Please check the values and try again.");
      })
      .finally(() => {
        setBusyPlatform(null);
        setBusyAction(null);
      });
  };

  const handleDisconnect = (platform: MarketplacePlatform) => {
    if (!confirm(`Disconnect this marketplace? Sales Orders already synced will not be affected.`)) return;
    setBusyPlatform(platform);
    setBusyAction("disconnect");
    marketplaceApi
      .disconnect(platform)
      .then(() => loadConnections())
      .catch((err) => {
        console.warn(`Failed to disconnect ${platform}`, err);
        alert((err as Error).message || `Failed to disconnect ${platform}.`);
      })
      .finally(() => {
        setBusyPlatform(null);
        setBusyAction(null);
      });
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5">
          <Store className="h-4 w-4 text-brand-primary" /> Marketplace Connections
        </h3>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Connect a marketplace seller account to automatically sync its orders into Sales Orders.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MARKETPLACES.map(({ platform, label }) => {
          const conn = connectionFor(platform);
          const isBusy = busyPlatform === platform;
          return (
            <Card key={platform} className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-foreground">{label}</div>
                  {conn ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      Connected
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-500 border-slate-200">
                      Not connected
                    </span>
                  )}
                </div>

                {conn && (
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    {conn.shopName && <div>Shop: {conn.shopName}</div>}
                    <div>
                      Last sync: {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : "Never"}
                    </div>
                    {conn.lastSyncError && (
                      <div className="text-rose-600">Last sync error: {conn.lastSyncError}</div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  {!conn ? (
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={() => handleConnect(platform)}
                      disabled={loading || (isBusy && busyAction === "connect")}
                      className="h-8 gap-1.5 text-[11px] font-bold"
                    >
                      <Plug className="h-3.5 w-3.5" /> Connect
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSync(platform)}
                        disabled={isBusy && busyAction === "sync"}
                        className="h-8 gap-1.5 text-[11px] font-bold"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isBusy && busyAction === "sync" ? "animate-spin" : ""}`} />
                        Sync Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisconnect(platform)}
                        disabled={isBusy && busyAction === "disconnect"}
                        className="h-8 gap-1.5 text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        <Unlink className="h-3.5 w-3.5" /> Disconnect
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Blibli: no OAuth redirect flow, so this card renders a form
            (Business Partner Code / MTA Username / API Seller Key /
            Signature Key) with a "Save & Connect" button instead of the
            generic redirect "Connect" button used above. */}
        {(() => {
          const platform: MarketplacePlatform = "blibli";
          const conn = connectionFor(platform);
          const isBusy = busyPlatform === platform;
          return (
            <Card key={platform} className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-foreground">Blibli</div>
                  {conn ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      Connected
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-500 border-slate-200">
                      Not connected
                    </span>
                  )}
                </div>

                {conn && (
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    {conn.shopName && <div>Business Partner Code: {conn.shopName}</div>}
                    <div>
                      Last sync: {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : "Never"}
                    </div>
                    {conn.lastSyncError && (
                      <div className="text-rose-600">Last sync error: {conn.lastSyncError}</div>
                    )}
                  </div>
                )}

                {!conn ? (
                  <div className="space-y-1.5">
                    <Input
                      placeholder="Business Partner Code (e.g. SDC-60001)"
                      value={blibliForm.businessPartnerCode}
                      onChange={(e) => setBlibliForm((f) => ({ ...f, businessPartnerCode: e.target.value }))}
                      className="h-8 text-[11px]"
                    />
                    <Input
                      placeholder="MTA Username"
                      value={blibliForm.mtaUsername}
                      onChange={(e) => setBlibliForm((f) => ({ ...f, mtaUsername: e.target.value }))}
                      className="h-8 text-[11px]"
                    />
                    <Input
                      placeholder="API Seller Key"
                      value={blibliForm.apiSellerKey}
                      onChange={(e) => setBlibliForm((f) => ({ ...f, apiSellerKey: e.target.value }))}
                      className="h-8 text-[11px]"
                    />
                    <Input
                      placeholder="Signature Key (optional)"
                      value={blibliForm.signatureKey}
                      onChange={(e) => setBlibliForm((f) => ({ ...f, signatureKey: e.target.value }))}
                      className="h-8 text-[11px]"
                    />
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={handleConnectBlibli}
                      disabled={isBusy && busyAction === "connect"}
                      className="h-8 gap-1.5 text-[11px] font-bold w-full"
                    >
                      <Plug className="h-3.5 w-3.5" /> Save & Connect
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(platform)}
                      disabled={isBusy && busyAction === "sync"}
                      className="h-8 gap-1.5 text-[11px] font-bold"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isBusy && busyAction === "sync" ? "animate-spin" : ""}`} />
                      Sync Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnect(platform)}
                      disabled={isBusy && busyAction === "disconnect"}
                      className="h-8 gap-1.5 text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <Unlink className="h-3.5 w-3.5" /> Disconnect
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}

// WhatsApp, like Blibli, has no OAuth redirect flow - each tenant pastes
// their own Phone Number ID / Access Token / Business Account ID (from
// their own Meta WhatsApp Business Platform app) into a form instead, and
// the backend verifies them with a live call before marking the connection
// "connected" (see POST /omnichannel/connections/whatsapp).
function WhatsAppConnectionSection() {
  const [connections, setConnections] = React.useState<ChannelConnection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyAction, setBusyAction] = React.useState<"connect" | "disconnect" | null>(null);

  const [form, setForm] = React.useState<{
    phoneNumberId: string;
    accessToken: string;
    businessAccountId: string;
    scope: "tenant" | "company";
  }>({
    phoneNumberId: "",
    accessToken: "",
    businessAccountId: "",
    scope: "tenant",
  });

  const loadConnections = React.useCallback(() => {
    setLoading(true);
    omnichannelApi
      .listConnections()
      .then((res) => setConnections(res.data ?? []))
      .catch((err) => console.warn("Failed to load channel connections", err))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const conn = connections.find((c) => c.channel === "whatsapp" && c.status === "connected");

  const handleConnect = () => {
    const { phoneNumberId, accessToken } = form;
    if (!phoneNumberId || !accessToken) {
      alert("Phone Number ID and Access Token are required.");
      return;
    }
    setBusyAction("connect");
    omnichannelApi
      .connectWhatsApp(form)
      .then(() => {
        alert("WhatsApp connected successfully.");
        setForm({ phoneNumberId: "", accessToken: "", businessAccountId: "", scope: "tenant" });
        loadConnections();
      })
      .catch((err) => {
        console.warn("Failed to connect WhatsApp", err);
        alert((err as Error).message || "Could not verify WhatsApp credentials. Please check the values and try again.");
      })
      .finally(() => setBusyAction(null));
  };

  const handleDisconnect = () => {
    if (!confirm("Disconnect WhatsApp? Existing conversations will not be affected, but sending/receiving will stop until reconnected.")) return;
    setBusyAction("disconnect");
    omnichannelApi
      .disconnectChannel("whatsapp")
      .then(() => loadConnections())
      .catch((err) => {
        console.warn("Failed to disconnect WhatsApp", err);
        alert((err as Error).message || "Failed to disconnect WhatsApp.");
      })
      .finally(() => setBusyAction(null));
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-brand-primary" /> WhatsApp Connection
        </h3>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Connect your own WhatsApp Business Platform phone number to send and receive messages in the Omnichannel Inbox.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-foreground">WhatsApp Business</div>
              {conn ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                  Connected
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-500 border-slate-200">
                  Not connected
                </span>
              )}
            </div>

            {conn && (
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <div>Phone Number ID: {conn.phoneNumberId}</div>
                {conn.businessAccountId && <div>Business Account ID: {conn.businessAccountId}</div>}
                <div>
                  Berlaku untuk:{" "}
                  <span className="font-semibold text-foreground">
                    {conn.scope === "company" ? "Seluruh Company (semua tenant)" : "Tenant ini saja"}
                  </span>
                </div>
                <div>Connected: {conn.connectedAt ? new Date(conn.connectedAt).toLocaleString() : "-"}</div>
              </div>
            )}

            {!conn ? (
              <div className="space-y-1.5">
                <Input
                  placeholder="Phone Number ID"
                  value={form.phoneNumberId}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
                  className="h-8 text-[11px]"
                />
                <Input
                  placeholder="Access Token"
                  type="password"
                  value={form.accessToken}
                  onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                  className="h-8 text-[11px]"
                />
                <Input
                  placeholder="Business Account ID (optional)"
                  value={form.businessAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, businessAccountId: e.target.value }))}
                  className="h-8 text-[11px]"
                />
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-foreground">Berlaku untuk</label>
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="wa-scope"
                        checked={form.scope === "tenant"}
                        onChange={() => setForm((f) => ({ ...f, scope: "tenant" }))}
                      />
                      Tenant ini saja
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="wa-scope"
                        checked={form.scope === "company"}
                        onChange={() => setForm((f) => ({ ...f, scope: "company" }))}
                      />
                      Seluruh Company (dipakai bersama semua tenant)
                    </label>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={handleConnect}
                  disabled={loading || busyAction === "connect"}
                  className="h-8 gap-1.5 text-[11px] font-bold w-full"
                >
                  <Plug className="h-3.5 w-3.5" /> Save & Connect
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={busyAction === "disconnect"}
                  className="h-8 gap-1.5 text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <Unlink className="h-3.5 w-3.5" /> Disconnect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function IntegrationSettingsPage() {
  const [apiKeys, setApiKeys] = React.useState<ApiKeyItem[]>([]);
  const [webhooks, setWebhooks] = React.useState<WebhookItem[]>([]);
  const [loadError, setLoadError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const [isNewKeyOpen, setIsNewKeyOpen] = React.useState(false);
  const [keyName, setKeyName] = React.useState("");
  const [keyScopes, setKeyScopes] = React.useState("read:sales,read:inventory");

  const [isNewWebhookOpen, setIsNewWebhookOpen] = React.useState(false);
  const [webhookName, setWebhookName] = React.useState("");
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [webhookEvent, setWebhookEvent] = React.useState(EVENT_TYPES[0]);

  const [deliveriesFor, setDeliveriesFor] = React.useState<WebhookItem | null>(null);
  const [deliveries, setDeliveries] = React.useState<WebhookDeliveryItem[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = React.useState(false);
  const [testingId, setTestingId] = React.useState<string | null>(null);

  const loadData = React.useCallback(() => {
    setLoading(true);
    Promise.all([integrationApi.listApiKeys(), integrationApi.listWebhooks()])
      .then(([keysRes, webhooksRes]) => {
        setApiKeys(keysRes.data ?? []);
        setWebhooks(webhooksRes.data ?? []);
        setLoadError(false);
      })
      .catch((err) => {
        console.warn("Backend integration API unavailable", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;

    integrationApi
      .createApiKey({ name: keyName, scopes: keyScopes })
      .then(() => {
        loadData();
        setIsNewKeyOpen(false);
        setKeyName("");
      })
      .catch((err) => console.warn("Failed to create API key", err));
  };

  const handleRevokeKey = (id: string) => {
    integrationApi
      .revokeApiKey(id)
      .then(() => loadData())
      .catch((err) => console.warn("Failed to revoke API key", err));
  };

  const handleCreateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookName || !webhookUrl) return;

    integrationApi
      .createWebhook({ name: webhookName, targetUrl: webhookUrl, eventType: webhookEvent })
      .then(() => {
        loadData();
        setIsNewWebhookOpen(false);
        setWebhookName("");
        setWebhookUrl("");
      })
      .catch((err) => {
        console.warn("Failed to create webhook", err);
        alert((err as Error).message || "Failed to create webhook.");
      });
  };

  const handleTestWebhook = (webhook: WebhookItem) => {
    setTestingId(webhook.id);
    integrationApi
      .testWebhook(webhook.id)
      .then((res) => {
        const ok = res.data?.status === "delivered";
        alert(`Simulated delivery to "${webhook.name}": ${ok ? "Success (200)" : "Failed"}`);
      })
      .catch((err) => console.warn("Failed to test webhook", err))
      .finally(() => setTestingId(null));
  };

  const openDeliveries = (webhook: WebhookItem) => {
    setDeliveriesFor(webhook);
    setDeliveriesLoading(true);
    integrationApi
      .listDeliveries(webhook.id)
      .then((res) => setDeliveries(res.data ?? []))
      .catch((err) => {
        console.warn("Failed to load deliveries", err);
        setDeliveries([]);
      })
      .finally(() => setDeliveriesLoading(false));
  };

  const keyColumns: Column<ApiKeyItem>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="text-xs font-bold text-foreground">{row.name}</span>,
    },
    {
      key: "maskedKey",
      header: "Key",
      render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.maskedKey}</span>,
    },
    {
      key: "scopes",
      header: "Scopes",
      render: (row) => <span className="text-[11px] text-muted-foreground">{row.scopes}</span>,
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            row.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          {row.isActive ? "Active" : "Revoked"}
        </span>
      ),
    },
    {
      key: "lastUsedAt",
      header: "Last Used",
      render: (row) => (
        <span className="text-[11px] text-muted-foreground">
          {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "Never"}
        </span>
      ),
    },
    {
      key: "id",
      header: "",
      render: (row) =>
        row.isActive ? (
          <Button size="sm" variant="outline" onClick={() => handleRevokeKey(row.id)} className="h-7 px-2 text-[11px]">
            Revoke
          </Button>
        ) : null,
    },
  ];

  const webhookColumns: Column<WebhookItem>[] = [
    {
      key: "name",
      header: "Name & URL",
      render: (row) => (
        <div>
          <div className="font-bold text-xs text-foreground">{row.name}</div>
          <div className="text-[11px] text-muted-foreground font-mono truncate max-w-xs">{row.targetUrl}</div>
        </div>
      ),
    },
    {
      key: "eventType",
      header: "Event",
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-tint text-brand-primary border border-brand-primary/20 font-mono">
          {row.eventType}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            row.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "id",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTestWebhook(row)}
            disabled={testingId === row.id}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <Send className={`h-3 w-3 ${testingId === row.id ? "animate-pulse" : ""}`} />
            <span>Test</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => openDeliveries(row)} className="h-7 px-2 text-[11px] gap-1">
            <History className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Plug className="h-6 w-6 text-brand-primary" />
            <span>API & Webhook Integration</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola API key untuk akses programatik dan webhook untuk notifikasi event lintas modul.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          Could not load integration data from the server. Please try again later.
        </div>
      )}

      <MarketplaceConnectionsSection />

      <WhatsAppConnectionSection />

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5">
            <KeyRound className="h-4 w-4 text-brand-primary" /> API Keys
          </h3>
          <Button variant="gradient" size="sm" onClick={() => setIsNewKeyOpen(true)} className="h-8 gap-1.5 text-[11px] font-bold">
            <Plus className="h-3.5 w-3.5" /> Generate New Key
          </Button>
        </div>
        {!loading && !loadError && apiKeys.length === 0 && (
          <div className="text-xs text-muted-foreground bg-slate-50 border border-dashed border-border rounded-lg px-3 py-6 text-center">
            No API keys yet.
          </div>
        )}
        {(apiKeys.length > 0 || loading) && <DataTable data={apiKeys} columns={keyColumns} isLoading={loading} />}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5">
            <Webhook className="h-4 w-4 text-brand-primary" /> Webhook Subscriptions
          </h3>
          <Button variant="gradient" size="sm" onClick={() => setIsNewWebhookOpen(true)} className="h-8 gap-1.5 text-[11px] font-bold">
            <Plus className="h-3.5 w-3.5" /> New Webhook
          </Button>
        </div>
        {!loading && !loadError && webhooks.length === 0 && (
          <div className="text-xs text-muted-foreground bg-slate-50 border border-dashed border-border rounded-lg px-3 py-6 text-center">
            No webhook subscriptions yet.
          </div>
        )}
        {(webhooks.length > 0 || loading) && <DataTable data={webhooks} columns={webhookColumns} isLoading={loading} />}
      </div>

      <Dialog open={isNewKeyOpen} onOpenChange={setIsNewKeyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand-primary" />
              <span>Generate New API Key</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateKey} className="space-y-3.5 text-xs text-left">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Key Name *</label>
              <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. ERP Mobile App" className="h-9 text-xs" required />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-foreground">Scopes (comma-separated)</label>
              <Input value={keyScopes} onChange={(e) => setKeyScopes(e.target.value)} className="h-9 text-xs" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewKeyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm">
                Generate Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewWebhookOpen} onOpenChange={setIsNewWebhookOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Webhook className="h-4 w-4 text-brand-primary" />
              <span>New Webhook Subscription</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWebhook} className="space-y-3.5 text-xs text-left">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Name *</label>
              <Input value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder="e.g. Slack Notifier" className="h-9 text-xs" required />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-foreground">Target URL *</label>
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://example.com/webhook" className="h-9 text-xs" required />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-foreground">Event Type</label>
              <select
                value={webhookEvent}
                onChange={(e) => setWebhookEvent(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewWebhookOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm">
                Create Webhook
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {deliveriesFor && (
        <Dialog open={Boolean(deliveriesFor)} onOpenChange={() => setDeliveriesFor(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-brand-primary" />
                <span>Recent Deliveries — {deliveriesFor.name}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-xs max-h-80 overflow-y-auto">
              {deliveriesLoading && <div className="text-muted-foreground">Loading...</div>}
              {!deliveriesLoading && deliveries.length === 0 && (
                <div className="text-muted-foreground">No deliveries yet. Try sending a test event.</div>
              )}
              {deliveries.map((d) => (
                <div key={d.id} className="bg-slate-50 border border-border rounded-lg px-3 py-2 flex items-start gap-2">
                  {d.status === "delivered" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold text-foreground">
                      {d.eventType} — {d.responseCode ?? "N/A"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{new Date(d.attemptedAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeliveriesFor(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
