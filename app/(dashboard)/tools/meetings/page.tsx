"use client";

import * as React from "react";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  Sparkles,
  FileText,
  CheckCircle2,
  Download,
  Building,
  Loader2,
  Mic,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { docflowApi } from "@/lib/api/docflow";
import { useAppStore } from "@/stores/app-store";

interface MeetingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  participants: string[];
  meetingLink: string;
  rawNotes?: string;
  aiSummary?: {
    overview: string;
    keyDecisions: string[];
    actionItems: { task: string; assignee: string; deadline: string }[];
    aiGenerated?: boolean;
  };
}

export default function MeetingsPage() {
  const { currentUser } = useAppStore();
  const [meetings, setMeetings] = React.useState<MeetingItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = React.useState<MeetingItem | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const [isNewMeetingOpen, setIsNewMeetingOpen] = React.useState(false);
  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);

  // New Meeting Form
  const [newTitle, setNewTitle] = React.useState("");
  const [newDate, setNewDate] = React.useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()));
  const [newTime, setNewTime] = React.useState("09:00");

  React.useEffect(() => {
    docflowApi
      .listMeetings()
      .then((res) => {
        const mapped: MeetingItem[] = res.data.map((m) => ({
          id: m.id,
          title: m.title,
          date: (m.scheduledAt || "").slice(0, 10),
          time: m.scheduledAt
            ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date(m.scheduledAt)) + " WIB"
            : "",
          participants: m.attendeeNames ? m.attendeeNames.split(",").map((p) => p.trim()) : [],
          meetingLink: m.meetingUrl,
          rawNotes: m.description,
        }));
        setMeetings(mapped);
        setSelectedMeeting(mapped[0] ?? null);
      })
      .catch((err) => {
        console.error("Failed to load meetings", err);
        setLoadError("Gagal memuat data rapat dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleGenerateAiSummary = async (mtg: MeetingItem) => {
    setIsGeneratingAi(true);
    try {
      const note = await docflowApi.generateAiNote(mtg.id, audioFile ?? undefined);
      const updated: MeetingItem = {
        ...mtg,
        aiSummary: {
          overview: note.data.content,
          keyDecisions: [],
          actionItems: [],
          aiGenerated: note.data.aiGenerated,
        },
      };
      setMeetings(meetings.map((m) => (m.id === mtg.id ? updated : m)));
      setSelectedMeeting(updated);
      setAudioFile(null);
      if (audioInputRef.current) audioInputRef.current.value = "";
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "AI note generation is not configured yet. Ask your admin to set up an OpenAI API key.";
      setNotice(message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setFormError(null);
    try {
      const res = await docflowApi.createMeeting({
        title: newTitle,
        scheduledAt: new Date(`${newDate}T${newTime || "00:00"}:00+07:00`).toISOString(),
        organizerName: currentUser.name,
        attendeeNames: currentUser.name,
      });
      const newMtg: MeetingItem = {
        id: res.data.id,
        title: res.data.title,
        date: newDate,
        time: newTime ? `${newTime} WIB` : "",
        participants: [currentUser.name],
        meetingLink: res.data.meetingUrl,
        rawNotes: "",
      };
      setMeetings([newMtg, ...meetings]);
      setIsNewMeetingOpen(false);
      setNewTitle("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menjadwalkan rapat.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Video className="h-6 w-6 text-brand-primary" />
            <span>Notulen Rapat, Video Meet & ONE AI Summary</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Jadwalkan rapat daring, catat notulen diskusi, dan hasilkan ringkasan keputusan & daftar action item otomatis via AI.
          </p>
        </div>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      {notice && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {notice}
        </div>
      )}
      {isLoading && <div className="py-6 text-center text-xs text-muted-foreground">Memuat data...</div>}

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewMeetingOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Jadwalkan Rapat Baru</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COLUMN: Meeting List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase px-1">
            Jadwal Rapat & Notulen ({meetings.length})
          </h3>

          {meetings.map((mtg) => (
            <div
              key={mtg.id}
              onClick={() => setSelectedMeeting(mtg)}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all space-y-2 ${
                selectedMeeting?.id === mtg.id
                  ? "bg-white border-brand-primary shadow-xs ring-2 ring-brand-primary/15"
                  : "bg-white border-border hover:border-brand-primary/40 shadow-2xs"
              }`}
            >
              <span className="font-mono text-[10px] font-bold text-brand-dark bg-brand-tint px-1.5 py-0.5 rounded">
                {mtg.id}
              </span>
              <h4 className="text-xs font-bold text-foreground leading-snug">{mtg.title}</h4>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {mtg.date}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="h-3 w-3" /> {mtg.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: Meeting Detail & AI Minutes Summary */}
        <div className="lg:col-span-2 space-y-4">
          {selectedMeeting ? (
            <div className="bg-white rounded-2xl border border-border p-5 space-y-5 shadow-xs text-left">
              {/* Meeting Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-border">
                <div className="space-y-1">
                  <span className="font-mono text-xs font-bold text-brand-dark">{selectedMeeting.id}</span>
                  <h2 className="text-base font-black text-foreground">{selectedMeeting.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {selectedMeeting.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {selectedMeeting.time}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {selectedMeeting.participants.join(", ")}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(selectedMeeting.meetingLink, "_blank")}
                  className="h-8 text-xs font-bold gap-1 text-brand-primary border-brand-indigo/30 bg-brand-tint/30"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>Join Video Meet</span>
                </Button>
              </div>

              {/* Raw Notes Area */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-brand-primary" />
                  <span>Catatan Notulen Mentah:</span>
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-border text-muted-foreground leading-relaxed">
                  {selectedMeeting.rawNotes || "Belum ada catatan."}
                </div>
              </div>

              {/* ONE AI Meeting Summary Section */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-tint/50 via-purple-50/40 to-white border border-brand-indigo/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-primary" />
                    <h3 className="text-xs font-black text-brand-dark">ONE AI Meeting Summary & Action Items</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => audioInputRef.current?.click()}
                      disabled={isGeneratingAi}
                      className="h-7 text-[11px] font-bold gap-1"
                      title="Lampirkan rekaman audio rapat (opsional)"
                    >
                      <Mic className="h-3 w-3" />
                      <span className="max-w-[90px] truncate">{audioFile ? audioFile.name : "Upload Audio"}</span>
                    </Button>
                    {audioFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setAudioFile(null);
                          if (audioInputRef.current) audioInputRef.current.value = "";
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Hapus audio"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={() => handleGenerateAiSummary(selectedMeeting)}
                      disabled={isGeneratingAi}
                      className="h-7 text-[11px] font-bold gap-1"
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Menganalisis...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          <span>{selectedMeeting.aiSummary ? "Generate Ulang AI" : "Generate Ringkasan AI"}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {selectedMeeting.aiSummary ? (
                  <div className="space-y-3 text-xs pt-1 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedMeeting.aiSummary.aiGenerated
                            ? "bg-brand-tint text-brand-dark"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {selectedMeeting.aiSummary.aiGenerated ? "AI Generated" : "Auto-Summary"}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed italic bg-white p-2.5 rounded-lg border border-border whitespace-pre-line">
                      &ldquo;{selectedMeeting.aiSummary.overview}&rdquo;
                    </p>

                    {/* Key Decisions */}
                    <div className="space-y-1">
                      <span className="font-bold text-foreground">Keputusan Penting:</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                        {selectedMeeting.aiSummary.keyDecisions.map((dec, i) => (
                          <li key={i}>{dec}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Items */}
                    <div className="space-y-1.5 pt-1">
                      <span className="font-bold text-foreground">Daftar Action Item:</span>
                      <div className="space-y-1">
                        {selectedMeeting.aiSummary.actionItems.map((act, i) => (
                          <div
                            key={i}
                            className="p-2 bg-white rounded-lg border border-border flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-foreground">{act.task}</span>
                            <span className="text-[10px] font-semibold text-brand-indigo bg-brand-tint px-2 py-0.5 rounded">
                              PIC: {act.assignee} (Deadline: {act.deadline})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground space-y-2">
                    <p>Klik tombol di atas untuk merangkum intisari rapat, keputusan, dan action item secara otomatis menggunakan AI.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-muted-foreground bg-white rounded-2xl border border-border">
              Pilih rapat di sebelah kiri untuk melihat notulen dan ringkasan AI.
            </div>
          )}
        </div>
      </div>

      {/* Modal Rapat Baru */}
      <Dialog open={isNewMeetingOpen} onOpenChange={setIsNewMeetingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Jadwalkan Rapat Perusahaan Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateMeeting} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Topik / Judul Rapat *</label>
              <Input
                placeholder="Contoh: Review Pencapaian Target Closing Q3"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Tanggal</label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Jam Mulai (WIB)</label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewMeetingOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Jadwalkan Rapat
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
