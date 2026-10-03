"use client";

import * as React from "react";
import {
  Gift,
  Search,
  IdCard,
  Phone,
  User,
  Settings2,
  Save,
  Loader2,
  Sparkles,
  History,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { loyaltyApi, LoyaltyMember, MemberCard } from "@/lib/api/loyalty";

export default function LoyaltyMembersPage() {
  const [phone, setPhone] = React.useState("");
  const [card, setCard] = React.useState<MemberCard | null>(null);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = React.useState(false);

  const [enrollName, setEnrollName] = React.useState("");
  const [isEnrolling, setIsEnrolling] = React.useState(false);
  const [enrollError, setEnrollError] = React.useState<string | null>(null);

  const [rupiahPerPoint, setRupiahPerPoint] = React.useState<number>(1000);
  const [isSavingConfig, setIsSavingConfig] = React.useState(false);
  const [configSaved, setConfigSaved] = React.useState(false);
  const [configError, setConfigError] = React.useState<string | null>(null);

  const [members, setMembers] = React.useState<LoyaltyMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);
  const [membersError, setMembersError] = React.useState<string | null>(null);

  const loadMembers = React.useCallback(() => {
    setIsLoadingMembers(true);
    loyaltyApi
      .listMembers()
      .then((res) => setMembers(res.data || []))
      .catch((err) => {
        console.error("Failed to load loyalty members", err);
        setMembersError("Gagal memuat daftar member.");
      })
      .finally(() => setIsLoadingMembers(false));
  }, []);

  React.useEffect(() => {
    loyaltyApi
      .getConfig()
      .then((res) => {
        if (res.data) setRupiahPerPoint(res.data.rupiahPerPoint);
      })
      .catch((err) => console.error("Failed to load loyalty config", err));
    loadMembers();
  }, [loadMembers]);

  const handleLookup = async () => {
    if (!phone.trim()) return;
    setIsLookingUp(true);
    setLookupError(null);
    setCard(null);
    try {
      const res = await loyaltyApi.lookupMember(phone.trim());
      setCard(res.data || null);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Kartu member tidak ditemukan.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleEnroll = async () => {
    if (!phone.trim()) return;
    setIsEnrolling(true);
    setEnrollError(null);
    try {
      await loyaltyApi.enrollMember({ phoneNumber: phone.trim(), name: enrollName.trim() || undefined });
      setEnrollName("");
      loadMembers();
      handleLookup();
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Gagal mendaftarkan member baru.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSaveConfig = async () => {
    if (rupiahPerPoint <= 0) return;
    setIsSavingConfig(true);
    setConfigError(null);
    setConfigSaved(false);
    try {
      const res = await loyaltyApi.updateConfig(rupiahPerPoint);
      if (res.data) setRupiahPerPoint(res.data.rupiahPerPoint);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : "Gagal menyimpan konfigurasi.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const columns: Column<LoyaltyMember>[] = [
    {
      key: "memberCode",
      header: "Kode Member",
      render: (row) => <span className="font-mono font-bold text-xs text-brand-dark">{row.memberCode}</span>,
    },
    {
      key: "name",
      header: "Nama",
      render: (row) => <span className="text-xs font-semibold text-foreground">{row.name}</span>,
    },
    {
      key: "phoneNumber",
      header: "No. HP",
      render: (row) => <span className="text-xs text-muted-foreground">{row.phoneNumber}</span>,
    },
    {
      key: "pointsBalance",
      header: "Poin",
      render: (row) => (
        <span className="text-xs font-black text-brand-primary">
          {row.pointsBalance.toLocaleString("id-ID")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Gift className="h-6 w-6 text-brand-primary" />
          <span>Loyalty Membership</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Kartu member virtual berbasis nomor telepon. Cek poin, daftarkan member baru, dan atur nilai konversi poin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lookup + Virtual Card */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Phone className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Masukkan nomor HP pelanggan..."
                    className="h-9 pl-9 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  />
                </div>
                <Button
                  onClick={handleLookup}
                  disabled={!phone.trim() || isLookingUp}
                  size="sm"
                  variant="gradient"
                  className="h-9 gap-1.5 text-xs font-bold shrink-0"
                >
                  {isLookingUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  <span>Cek Poin</span>
                </Button>
              </div>

              {lookupError && (
                <div className="space-y-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <p>{lookupError}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={enrollName}
                      onChange={(e) => setEnrollName(e.target.value)}
                      placeholder="Nama pelanggan (opsional)"
                      className="h-7 text-xs bg-white flex-1"
                    />
                    <Button
                      onClick={handleEnroll}
                      disabled={isEnrolling}
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-[11px] font-bold shrink-0 border-rose-300 text-rose-700 hover:bg-rose-100"
                    >
                      {isEnrolling ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                      <span>Daftarkan Member Baru</span>
                    </Button>
                  </div>
                  {enrollError && <p className="text-[11px] text-rose-700">{enrollError}</p>}
                </div>
              )}

              {card && (
                <div className="space-y-4">
                  {/* Virtual Membership Card */}
                  <div className="relative rounded-2xl p-5 bg-gradient-to-br from-brand-primary via-brand-purple to-brand-indigo text-white overflow-hidden shadow-lg">
                    <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
                    <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10" />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">ONE Loyalty Card</p>
                        <h3 className="text-lg font-black mt-0.5">{card.member.name}</h3>
                      </div>
                      <IdCard className="h-7 w-7 text-white/70" />
                    </div>
                    <div className="relative mt-6 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-white/70 font-semibold">No. Kartu</p>
                        <p className="font-mono font-bold text-sm tracking-wider">{card.member.memberCode}</p>
                        <p className="text-[11px] text-white/80 mt-1">{card.member.phoneNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/70 font-semibold">Saldo Poin</p>
                        <p className="text-2xl font-black">{card.member.pointsBalance.toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Point history */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <History className="h-3.5 w-3.5 text-brand-primary" />
                      <span>Riwayat Poin</span>
                    </div>
                    {card.transactions.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">Belum ada riwayat transaksi poin.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {card.transactions.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-slate-50/50 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-foreground">{t.description || t.type}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {new Date(t.createdAt).toLocaleString("id-ID")}
                                {t.salesOrderNumber && ` · ${t.salesOrderNumber}`}
                              </p>
                            </div>
                            <span className={`font-black ${t.points >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {t.points >= 0 ? "+" : ""}
                              {t.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!card && !lookupError && (
                <div className="py-10 text-center text-xs text-muted-foreground space-y-2">
                  <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p>Masukkan nomor HP untuk melihat kartu member dan poin loyalty.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Config */}
        <div className="space-y-4">
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Settings2 className="h-3.5 w-3.5 text-brand-primary" />
                <span>Konfigurasi Poin</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tentukan berapa Rupiah belanja setara 1 poin. Default: Rp 1.000 = 1 poin.
              </p>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Rp per 1 poin
                </label>
                <Input
                  type="number"
                  value={rupiahPerPoint || ""}
                  onChange={(e) => setRupiahPerPoint(Number(e.target.value))}
                  className="h-9 text-xs"
                  min={1}
                />
              </div>
              <Button
                onClick={handleSaveConfig}
                disabled={isSavingConfig || rupiahPerPoint <= 0}
                size="sm"
                variant="gradient"
                className="w-full h-9 gap-1.5 text-xs font-bold"
              >
                {isSavingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Simpan Konfigurasi</span>
              </Button>
              {configSaved && (
                <p className="text-[11px] text-emerald-600 font-semibold text-center">Konfigurasi tersimpan.</p>
              )}
              {configError && (
                <p className="text-[11px] text-rose-600 font-semibold text-center">{configError}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Total Member Terdaftar</span>
              <div className="text-2xl font-black text-brand-dark">{members.length}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Members list */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <User className="h-3.5 w-3.5 text-brand-primary" />
          <span>Daftar Member</span>
        </div>
        {membersError && (
          <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {membersError}
          </div>
        )}
        {isLoadingMembers ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat member...</div>
        ) : (
          <DataTable data={members} columns={columns} />
        )}
      </div>
    </div>
  );
}
