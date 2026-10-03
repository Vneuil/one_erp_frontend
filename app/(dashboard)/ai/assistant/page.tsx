"use client";

import * as React from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Zap,
  Boxes,
  ShoppingCart,
  Wallet,
  Building,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { reportsApi } from "@/lib/api/reports";
import { financeApi } from "@/lib/api/finance";
import { useAppStore } from "@/stores/app-store";

interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  quickActions?: { label: string; action: string }[];
}

const QUICK_ACTIONS = [
  { label: "Cek Status Stok Menipis", action: "cek_stok" },
  { label: "Ringkasan Penjualan Hari Ini", action: "cek_penjualan" },
  { label: "Status Piutang Klien (AR)", action: "cek_piutang" },
];

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const nowLabel = () =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date()) + " WIB";
const todayJakarta = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

const HELP_TEXT =
  "Saya belum memakai model AI; saya menampilkan ringkasan **data nyata** dari ERP untuk pertanyaan tentang:\n\n" +
  "• **stok** - nilai persediaan dan barang di bawah stok minimum\n" +
  "• **penjualan** - jumlah dan nilai pesanan hari ini\n" +
  "• **piutang** - umur piutang pelanggan (AR)\n\n" +
  "Coba ketik salah satu kata tersebut atau pilih tombol di bawah.";

/** Answers a question from live ERP data. Never invents figures: anything it cannot look up it says so. */
async function answerFromErp(query: string): Promise<{ content: string; actions?: typeof QUICK_ACTIONS }> {
  const lower = query.toLowerCase();

  if (lower.includes("stok") || lower.includes("stock") || lower.includes("inventaris")) {
    const res = await reportsApi.getInventoryValuation();
    const inv = res.data;
    const low = inv?.lowStockItems ?? [];
    const lines = [
      `Nilai persediaan total: **${rupiah(inv?.totalInventoryValue ?? 0)}**.`,
      ...(inv?.byWarehouse ?? []).map((w) => `• ${w.warehouseName}: ${rupiah(w.totalValue)}`),
      "",
      low.length
        ? `**${low.length} barang di bawah stok minimum:**\n` +
          low
            .slice(0, 8)
            .map((i) => `• ${i.productName} (${i.warehouseName}): ${i.quantity} tersisa, minimum ${i.minStock}`)
            .join("\n")
        : "Tidak ada barang di bawah stok minimum.",
    ];
    return { content: lines.join("\n") };
  }

  if (lower.includes("penjualan") || lower.includes("sales") || lower.includes("pesanan")) {
    const today = todayJakarta();
    const res = await reportsApi.getSalesPerformance({ from: today, to: today });
    const s = res.data;
    if (!s || s.totalOrders === 0) return { content: `Belum ada pesanan penjualan yang tercatat hari ini (${today}).` };
    return {
      content: [
        `Hari ini (${today}): **${s.totalOrders} pesanan**, total **${rupiah(s.totalRevenue)}**.`,
        "",
        ...(s.revenueByChannel ?? []).map((c) => `• ${c.channel}: ${rupiah(c.revenue)}`),
      ].join("\n"),
    };
  }

  if (lower.includes("piutang") || lower.includes("receivable") || lower === "ar" || lower.includes("(ar)")) {
    const res = await financeApi.arAging();
    const ar = res.data;
    if (!ar || ar.total === 0) return { content: "Tidak ada piutang pelanggan yang tercatat." };
    return {
      content: [`Total piutang: **${rupiah(ar.total)}** (per ${ar.asOf}).`, "", ...ar.buckets.map((b) => `• ${b.bucket}: ${rupiah(b.amount)}`)].join("\n"),
    };
  }

  return { content: HELP_TEXT, actions: QUICK_ACTIONS };
}

export default function AiAssistantPage() {
  const { currentUser } = useAppStore();
  const [messages, setMessages] = React.useState<AiChatMessage[]>(() => [
    {
      id: "ai-1",
      role: "assistant",
      content: `Halo ${currentUser.name || ""}! ${HELP_TEXT}`,
      timestamp: nowLabel(),
      quickActions: QUICK_ACTIONS,
    },
  ]);
  const [inputQuery, setInputQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [msgCounter, setMsgCounter] = React.useState(10);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isLoading) return;

    const nextId = msgCounter + 1;
    setMsgCounter(nextId + 1);
    setMessages((prev) => [...prev, { id: `user-${nextId}`, role: "user", content: query, timestamp: nowLabel() }]);
    if (!textToSend) setInputQuery("");
    setIsLoading(true);

    let reply: { content: string; actions?: typeof QUICK_ACTIONS };
    try {
      reply = await answerFromErp(query);
    } catch (err) {
      reply = { content: `Data tidak bisa diambil saat ini: ${err instanceof Error ? err.message : "kesalahan server"}.` };
    }
    setMessages((prev) => [
      ...prev,
      { id: `ai-${nextId + 1}`, role: "assistant", content: reply.content, timestamp: nowLabel(), quickActions: reply.actions },
    ]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] rounded-2xl border border-border bg-white overflow-hidden shadow-xs">
      {/* Top Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-brand-tint/60 via-purple-50/40 to-white">
        <div className="flex items-center gap-2.5 text-left">
          <div className="h-9 w-9 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xs font-black text-foreground flex items-center gap-1.5">
              <span>Asisten Data ERP</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-brand-indigo">
                Data nyata
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Ringkasan stok, penjualan, dan piutang langsung dari data ERP. Belum berbasis model AI.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Terhubung ke data ERP</span>
        </span>
      </div>

      {/* Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.role === "user"
                  ? "bg-brand-dark text-white"
                  : "bg-brand-tint text-brand-primary border border-brand-indigo/20"
              }`}
            >
              {msg.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>

            <div className={`space-y-2 max-w-xl text-left ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`p-4 rounded-2xl leading-relaxed whitespace-pre-line ${
                  msg.role === "user"
                    ? "bg-brand-primary text-white rounded-tr-xs shadow-xs"
                    : "bg-slate-50 border border-border text-foreground rounded-tl-xs"
                }`}
              >
                {msg.content}
              </div>

              {msg.quickActions && msg.quickActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {msg.quickActions.map((qa, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSend(qa.action)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-brand-indigo/30 text-brand-indigo hover:bg-brand-tint transition-all cursor-pointer shadow-2xs"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-muted-foreground block px-1">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-8 w-8 rounded-lg bg-brand-tint text-brand-primary flex items-center justify-center animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <span>ONE AI sedang menganalisis data bisnis...</span>
          </div>
        )}
      </div>

      {/* Input Prompt Box */}
      <div className="p-4 border-t border-border bg-slate-50/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          <Input
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Tanyakan status stok, omset hari ini, rekonsiliasi kas, atau rekomendasi operasional..."
            className="h-10 text-xs bg-white border-border"
          />

          <Button
            type="submit"
            variant="gradient"
            size="sm"
            disabled={!inputQuery.trim() || isLoading}
            className="h-10 px-4 text-xs font-bold gap-1.5 shadow-sm"
          >
            <Send className="h-4 w-4" />
            <span>Tanya AI</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
