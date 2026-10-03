"use client";

import * as React from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigationAccess } from "@/providers/navigation-access";
import { hropsApi, AnnouncementItem, NotificationItem } from "@/lib/api/hrops";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const fmt = (iso?: string) => (iso ? iso.slice(0, 16).replace("T", " ") : "");

export default function AnnouncementsPage() {
  const { canApprove } = useNavigationAccess();
  // Publishing needs write access to HR; approvers are the roles that have it.
  const canPublish = canApprove("hrm");

  const [tab, setTab] = React.useState<"announcements" | "notifications">("announcements");
  const [items, setItems] = React.useState<AnnouncementItem[]>([]);
  const [notes, setNotes] = React.useState<NotificationItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [expiresOn, setExpiresOn] = React.useState("");
  const [pinned, setPinned] = React.useState(false);

  const load = React.useCallback(() => Promise.all([hropsApi.announcements(), hropsApi.notifications()]), []);

  React.useEffect(() => {
    let alive = true;
    load()
      .then(([a, n]) => {
        if (!alive) return;
        setItems(a.data || []);
        setNotes(n.data.items || []);
        setUnread(n.data.unread || 0);
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load]);

  const run = async (action: () => Promise<unknown>, okText?: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      const [a, n] = await load();
      setItems(a.data || []);
      setNotes(n.data.items || []);
      setUnread(n.data.unread || 0);
      if (okText) setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-brand-primary" />
          <span>Pengumuman & Notifikasi</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Pengumuman perusahaan (semua karyawan atau satu departemen). Setiap pengumuman juga masuk ke kotak notifikasi penerimanya.
        </p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <div className="flex gap-1.5">
        {(["announcements", "notifications"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${tab === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}
          >
            {k === "announcements" ? "Pengumuman" : `Notifikasi${unread ? ` (${unread})` : ""}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : tab === "announcements" ? (
        <div className="space-y-4">
          {canPublish && (
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="text-xs font-bold">Publikasikan pengumuman</div>
                <Input placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea
                  placeholder="Isi pengumuman"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <label className="space-y-1 text-xs font-semibold">
                    Departemen (kosong = semua)
                    <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-semibold">
                    Berlaku sampai
                    <Input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold pb-2">
                    <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Sematkan di atas
                  </label>
                  <Button
                    size="sm"
                    disabled={busy || !title.trim() || !body.trim()}
                    onClick={() =>
                      run(async () => {
                        const r = await hropsApi.publishAnnouncement({ title, body, department: department || undefined, expiresOn: expiresOn || undefined, pinned });
                        setTitle("");
                        setBody("");
                        setNotice(`Pengumuman dipublikasikan; ${r.data.notified} karyawan diberi notifikasi.`);
                      })
                    }
                    className="h-9 text-xs font-bold"
                  >
                    Publikasikan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {items.length === 0 && <p className="text-xs text-muted-foreground">Belum ada pengumuman.</p>}
          {items.map((a) => (
            <Card key={a.id} className={`shadow-2xs ${a.pinned ? "border-brand-primary" : "border-border"}`}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-bold text-sm">
                    {a.pinned && "📌 "}
                    {a.title}
                  </div>
                  {canPublish && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => hropsApi.deleteAnnouncement(a.id), "Pengumuman dihapus.")} className="h-7 px-2 text-[11px] text-rose-600 border-rose-200">
                      Hapus
                    </Button>
                  )}
                </div>
                <p className="text-xs whitespace-pre-wrap">{a.body}</p>
                <p className="text-[10px] text-muted-foreground">
                  {a.department ? `Departemen ${a.department}` : "Semua karyawan"} · {fmt(a.createdAt)}
                  {a.expiresOn ? ` · sampai ${a.expiresOn}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" disabled={busy || unread === 0} onClick={() => run(() => hropsApi.markAllRead())} className="h-8 text-xs font-bold">
              Tandai semua dibaca
            </Button>
          </div>
          {notes.length === 0 && <p className="text-xs text-muted-foreground">Tidak ada notifikasi.</p>}
          {notes.map((n) => (
            <Card key={n.id} className={`shadow-2xs ${n.readAt ? "border-border opacity-70" : "border-brand-primary"}`}>
              <CardContent className="p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold">{n.title}</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground">{fmt(n.createdAt)}</p>
                </div>
                {!n.readAt && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => hropsApi.markRead(n.id))} className="h-7 px-2 text-[11px]">
                    Tandai dibaca
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
