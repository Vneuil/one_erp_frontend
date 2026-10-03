"use client";

import * as React from "react";
import {
  MessageSquare,
  Send,
  RefreshCw,
  AlertCircle,
  Camera,
  MessageCircle,
  Store,
  Inbox,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  omnichannelApi,
  type Conversation,
  type ConversationThread,
  type OmnichannelChannel,
} from "@/lib/api/omnichannel";

interface ChannelTab {
  key: OmnichannelChannel | "all";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean;
}

const CHANNEL_TABS: ChannelTab[] = [
  { key: "all", label: "All Channels", icon: Inbox, connected: true },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, connected: true },
  { key: "instagram", label: "Instagram", icon: Camera, connected: false },
  { key: "messenger", label: "Messenger", icon: MessageCircle, connected: false },
  { key: "marketplace_shopee", label: "Shopee Chat", icon: Store, connected: false },
  { key: "marketplace_tiktok", label: "TikTok Shop Chat", icon: Store, connected: false },
];

const CHANNEL_BADGE_STYLES: Record<string, string> = {
  whatsapp: "bg-emerald-100 text-emerald-700 border-emerald-200",
  instagram: "bg-pink-100 text-pink-700 border-pink-200",
  messenger: "bg-blue-100 text-blue-700 border-blue-200",
  marketplace_shopee: "bg-orange-100 text-orange-700 border-orange-200",
  marketplace_tiktok: "bg-slate-100 text-slate-700 border-slate-200",
  manual: "bg-gray-100 text-gray-700 border-gray-200",
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}j`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}h`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function OmnichannelInboxPage() {
  const [activeChannel, setActiveChannel] = React.useState<ChannelTab["key"]>("all");
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = React.useState(true);
  const [listError, setListError] = React.useState<string | null>(null);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [thread, setThread] = React.useState<ConversationThread | null>(null);
  const [loadingThread, setLoadingThread] = React.useState(false);
  const [threadError, setThreadError] = React.useState<string | null>(null);

  const [replyText, setReplyText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);

  const activeTab = CHANNEL_TABS.find((t) => t.key === activeChannel) ?? CHANNEL_TABS[0];

  const loadConversations = React.useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const channelParam = activeChannel === "all" ? undefined : activeChannel;
      const res = await omnichannelApi.listConversations(channelParam);
      setConversations(res.data ?? []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load conversations");
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, [activeChannel]);

  React.useEffect(() => {
    if (!activeTab.connected) {
      setConversations([]);
      setLoadingList(false);
      setListError(null);
      return;
    }
    loadConversations();
  }, [loadConversations, activeTab.connected]);

  const loadThread = React.useCallback(async (conversationId: string) => {
    setLoadingThread(true);
    setThreadError(null);
    setSendError(null);
    try {
      const res = await omnichannelApi.getThread(conversationId);
      setThread(res.data ?? null);
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : "Failed to load conversation");
      setThread(null);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const handleSelect = (conv: Conversation) => {
    setSelectedId(conv.id);
    loadThread(conv.id);
  };

  const handleSend = async () => {
    if (!selectedId || !replyText.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await omnichannelApi.sendMessage(selectedId, replyText.trim());
      setReplyText("");
      await loadThread(selectedId);
      await loadConversations();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Omnichannel Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Unified conversations from WhatsApp, Instagram, Messenger, and marketplace chat.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadConversations} disabled={loadingList}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingList ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Channel tabs */}
      <div className="flex flex-wrap gap-2">
        {CHANNEL_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeChannel;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveChannel(tab.key);
                setSelectedId(null);
                setThread(null);
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {!tab.connected && (
                <span className="ml-1 text-[10px] uppercase opacity-70">Not connected</span>
              )}
            </button>
          );
        })}
      </div>

      {!activeTab.connected ? (
        <Card className="flex-1">
          <CardContent className="h-full flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{activeTab.label} is not connected yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                This channel requires its own app registration and credentials. Contact support to
                enable {activeTab.label} in Settings &gt; Integration.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-1 min-h-0 gap-4">
          {/* Conversation list */}
          <Card className="w-full max-w-sm flex flex-col min-h-0">
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-0">
              {loadingList ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : listError ? (
                <div className="p-4 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{listError}</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Belum ada percakapan</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {conversations.map((conv) => {
                    const badgeStyle =
                      CHANNEL_BADGE_STYLES[conv.channel] ?? CHANNEL_BADGE_STYLES.manual;
                    return (
                      <li key={conv.id}>
                        <button
                          onClick={() => handleSelect(conv)}
                          className={`w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors ${
                            selectedId === conv.id ? "bg-muted" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              {conv.externalContactName || conv.externalContactId}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {timeAgo(conv.lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${badgeStyle}`}
                            >
                              {conv.channelLabel}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] px-1">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {conv.lastMessagePreview || "—"}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Thread */}
          <Card className="flex-1 flex flex-col min-h-0">
            {!selectedId ? (
              <CardContent className="h-full flex flex-col items-center justify-center gap-2 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a conversation to view the thread
                </p>
              </CardContent>
            ) : (
              <>
                <div className="border-b px-4 py-3">
                  <p className="font-medium">
                    {thread?.conversation.externalContactName ||
                      thread?.conversation.externalContactId ||
                      "..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {thread?.conversation.channelLabel}
                  </p>
                </div>
                <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                  {loadingThread ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : threadError ? (
                    <div className="text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{threadError}</span>
                    </div>
                  ) : thread && thread.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                      <Inbox className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Belum ada pesan</p>
                    </div>
                  ) : (
                    thread?.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                            msg.direction === "outbound"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              msg.direction === "outbound"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {new Date(msg.sentAt).toLocaleString("id-ID")}
                            {msg.sentBy ? ` · ${msg.sentBy}` : ""}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
                <div className="border-t p-3">
                  {sendError && (
                    <div className="mb-2 text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{sendError}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a reply..."
                      disabled={sending}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button onClick={handleSend} disabled={sending || !replyText.trim()}>
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
