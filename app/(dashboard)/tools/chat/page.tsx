"use client";

import * as React from "react";
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  Users,
  Search,
  CheckCheck,
  Building,
  UserCheck,
  Hash,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collaborationApi } from "@/lib/api/collaboration";
import { useAppStore } from "@/stores/app-store";

interface ChatMessage {
  id: string;
  sender: string;
  avatar?: string;
  isSelf: boolean;
  content: string;
  timestamp: string;
  attachmentName?: string;
  failed?: boolean;
}

interface ChannelItem {
  id: string;
  name: string;
  type: "channel" | "dm";
  unreadCount?: number;
  subtitle: string;
}

export default function OneChatPage() {
  const { currentUser } = useAppStore();
  const [channels, setChannels] = React.useState<ChannelItem[]>([]);
  const [selectedChannelId, setSelectedChannelId] = React.useState("");
  const [messages, setMessages] = React.useState<Record<string, ChatMessage[]>>({});
  const [inputText, setInputText] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];
  const channelMessages = messages[selectedChannelId] || [];

  React.useEffect(() => {
    collaborationApi
      .listConversations()
      .then(async (res) => {
        const mappedChannels: ChannelItem[] = (res.data || []).map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type === "group" ? "channel" : "dm",
          subtitle: c.participantNames,
        }));
        setChannels(mappedChannels);
        if (mappedChannels.length === 0) return;
        setSelectedChannelId(mappedChannels[0].id);

        const messagesByConversation: Record<string, ChatMessage[]> = {};
        await Promise.all(
          mappedChannels.map(async (chan) => {
            try {
              const msgRes = await collaborationApi.listMessages(chan.id);
              messagesByConversation[chan.id] = (msgRes.data || []).map((m) => ({
                id: m.id,
                sender: m.senderName,
                isSelf: m.senderName === currentUser.name,
                content: m.content,
                timestamp: new Date(m.sentAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
                attachmentName: m.attachmentName || undefined,
              }));
            } catch (err) {
              console.warn("Failed to load messages for conversation", chan.id, err);
            }
          })
        );
        setMessages(messagesByConversation);
      })
      .catch((err) => {
        console.error("Failed to load conversations", err);
      });
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const content = inputText;
    setInputText("");

    try {
      const res = await collaborationApi.sendMessage(selectedChannelId, {
        senderName: currentUser.name,
        content,
      });
      const m = res.data;
      const newMsg: ChatMessage = {
        id: m.id,
        sender: m.senderName,
        isSelf: true,
        content: m.content,
        timestamp: new Date(m.sentAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      };
      setMessages((prev) => ({ ...prev, [selectedChannelId]: [...(prev[selectedChannelId] || []), newMsg] }));
    } catch {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: currentUser.name,
        isSelf: true,
        content: `${content} (Gagal terkirim)`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        failed: true,
      };
      setMessages((prev) => ({ ...prev, [selectedChannelId]: [...(prev[selectedChannelId] || []), newMsg] }));
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      // A chat message only stores the attachment's name, so the file itself must
      // be stored somewhere real first: it goes to ONE Drive, where the channel
      // can find it. Without this the message would advertise a file that was
      // never uploaded anywhere.
      await collaborationApi.uploadFile({
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedBy: currentUser.name,
        file,
      });
      const res = await collaborationApi.sendMessage(selectedChannelId, {
        senderName: currentUser.name,
        content: "Lampiran diunggah ke ONE Drive.",
        attachmentName: file.name,
      });
      const m = res.data;
      const newMsg: ChatMessage = {
        id: m.id,
        sender: m.senderName,
        isSelf: true,
        content: m.content,
        timestamp: new Date(m.sentAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        attachmentName: m.attachmentName || undefined,
      };
      setMessages((prev) => ({ ...prev, [selectedChannelId]: [...(prev[selectedChannelId] || []), newMsg] }));
    } catch {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: currentUser.name,
        isSelf: true,
        content: "Gagal mengirim lampiran dokumen. Silakan coba lagi.",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        failed: true,
      };
      setMessages((prev) => ({ ...prev, [selectedChannelId]: [...(prev[selectedChannelId] || []), newMsg] }));
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-6.5rem)] rounded-2xl border border-border bg-white overflow-hidden shadow-xs">
      {/* LEFT SIDEBAR: Channels & Direct Messages */}
      <div className="w-full md:w-72 border-r border-border flex flex-col justify-between bg-slate-50/60">
        <div className="p-3.5 border-b border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-brand-primary" />
              <span>ONE Chat Internal</span>
            </h2>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
              Online
            </span>
          </div>

          <div className="relative">
            <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari percakapan..."
              className="h-8 pl-7 text-[11px] bg-white border-border"
            />
          </div>
        </div>

        {/* Channel Lists */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
          {/* Group Channels */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">
              Kanal Tim (Channels)
            </span>
            {channels
              .filter((c) => c.type === "channel")
              .map((chan) => (
                <button
                  key={chan.id}
                  onClick={() => setSelectedChannelId(chan.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                    selectedChannelId === chan.id
                      ? "bg-brand-tint text-brand-primary font-bold shadow-2xs"
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{chan.name}</span>
                  </div>
                  {chan.unreadCount && (
                    <span className="h-4 min-w-4 px-1 rounded-full bg-brand-primary text-white text-[9px] font-bold flex items-center justify-center">
                      {chan.unreadCount}
                    </span>
                  )}
                </button>
              ))}
          </div>

          {/* Direct Messages */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">
              Pesan Langsung (DM)
            </span>
            {channels
              .filter((c) => c.type === "dm")
              .map((dm) => (
                <button
                  key={dm.id}
                  onClick={() => setSelectedChannelId(dm.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                    selectedChannelId === dm.id
                      ? "bg-brand-tint text-brand-primary font-bold shadow-2xs"
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="truncate">{dm.name}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* User Status Footer */}
        <div className="p-3 border-t border-border bg-white flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-tint text-brand-primary font-bold flex items-center justify-center text-xs">
            NT
          </div>
          <div className="text-left leading-tight min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground truncate">{currentUser.name}</p>
            <span className="text-[10px] text-muted-foreground capitalize">{currentUser.role}</span>
          </div>
        </div>
      </div>

      {/* RIGHT MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col justify-between bg-white">
        {/* Chat Top Bar */}
        <div className="p-3.5 border-b border-border flex items-center justify-between bg-slate-50/40">
          <div className="flex items-center gap-2 text-left">
            {activeChannel?.type === "channel" ? (
              <Hash className="h-5 w-5 text-brand-primary" />
            ) : (
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
            )}
            <div>
              <h3 className="text-xs font-bold text-foreground">{activeChannel?.name ?? "Belum ada percakapan"}</h3>
              <p className="text-[10px] text-muted-foreground">{activeChannel?.subtitle ?? "Mulai percakapan baru untuk memulai"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Terenkripsi End-to-End</span>
          </div>
        </div>

        {/* Chat Messages Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {channelMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                <span className="font-bold text-foreground">{msg.sender}</span>
                <span>• {msg.timestamp}</span>
              </div>

              <div
                className={`max-w-md p-3 rounded-2xl text-left leading-relaxed ${
                  msg.isSelf
                    ? "bg-brand-primary text-white rounded-tr-xs shadow-xs"
                    : "bg-slate-100 text-foreground rounded-tl-xs"
                }`}
              >
                <p>{msg.content}</p>

                {msg.attachmentName && (
                  <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 text-[11px] ${
                    msg.isSelf ? "bg-white/15 text-white" : "bg-white text-brand-dark border border-border"
                  }`}>
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="font-semibold truncate">{msg.attachmentName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {channelMessages.length === 0 && (
            <div className="py-16 text-center text-xs text-muted-foreground">
              Belum ada percakapan di ruang ini. Mulai obrolan pertama Anda!
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-slate-50/60 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelected}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={activeChannel ? `Ketik pesan ke #${activeChannel.name}...` : "Pilih percakapan terlebih dahulu..."}
            className="h-9 text-xs bg-white"
          />

          <Button type="submit" variant="gradient" size="sm" className="h-9 px-3 text-xs font-bold gap-1">
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kirim</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
