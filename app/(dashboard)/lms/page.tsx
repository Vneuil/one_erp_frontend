"use client";

import * as React from "react";
import {
  GraduationCap,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Users,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { lmsApi, Enrollment as ApiEnrollment } from "@/lib/api/lms";
import { hrmApi, EmployeeItem } from "@/lib/api/hrm";

interface CourseItem {
  id: string;
  title: string;
  category: "Onboarding Wajib" | "SOP Gudang & WMS" | "Keselamatan Kerja K3" | "Finance & Pajak" | string;
  totalModules: number;
  durationHours: number;
  enrolledCount: number;
  completionRate: number;
  instructor: string;
}

export default function LmsPage() {
  const [courses, setCourses] = React.useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [enrollments, setEnrollments] = React.useState<ApiEnrollment[]>([]);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [expandedCourseId, setExpandedCourseId] = React.useState<string | null>(null);
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [enrollEmployeeId, setEnrollEmployeeId] = React.useState("");
  const [enrollBusy, setEnrollBusy] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<CourseItem["category"]>("Onboarding Wajib");
  const [instructor, setInstructor] = React.useState("");
  const [totalModules, setTotalModules] = React.useState(1);
  const [durationHours, setDurationHours] = React.useState(1);

  const loadEnrollments = React.useCallback(() => {
    lmsApi
      .listEnrollments()
      .then((res) => setEnrollments(res.data || []))
      .catch((err) => console.warn("Backend lms enrollments API unavailable", err));
  }, []);

  React.useEffect(() => {
    hrmApi
      .listEmployees({ perPage: 200 })
      .then((res) => {
        const items = res.data || [];
        setEmployees(items);
        setEnrollEmployeeId((prev) => prev || items[0]?.id || "");
      })
      .catch((err) => console.warn("Backend employees API unavailable", err));
  }, []);

  React.useEffect(() => {
    lmsApi
      .listCourses()
      .then((res) => {
                  setCourses(
            (res.data || []).map((c) => ({
              id: c.id,
              title: c.title,
              category: c.category || "Onboarding Wajib",
              totalModules: Math.max(1, Math.round(c.durationHours / 2)),
              durationHours: c.durationHours,
              enrolledCount: c.enrolledCount,
              completionRate: 0,
              instructor: c.instructorName,
            }))
          );
      })
      .catch((err) => {
        console.error("Failed to load kursus", err);
        setLoadError("Gagal memuat data kursus dari server.");
      })
      .finally(() => setIsLoading(false));
    loadEnrollments();
  }, [loadEnrollments]);

  const enrollmentsForCourse = (courseId: string) => enrollments.filter((e) => e.courseId === courseId);

  const handleEnroll = async (courseId: string) => {
    if (!enrollEmployeeId) return;
    setEnrollBusy(true);
    try {
      await lmsApi.createEnrollment({ courseId, employeeId: enrollEmployeeId });
      loadEnrollments();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal mendaftarkan karyawan.");
    } finally {
      setEnrollBusy(false);
    }
  };

  const handleCompleteEnrollment = async (enrollmentId: string) => {
    try {
      await lmsApi.completeEnrollment(enrollmentId);
      loadEnrollments();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menandai kursus selesai.");
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !instructor) return;
    setFormError(null);
    try {
      const res = await lmsApi.createCourse({ title, category, instructorName: instructor, durationHours });
      if (res.data) {
        const c = res.data;
        setCourses((prev) => [
          {
            id: c.id,
            title: c.title,
            category: c.category || category,
            totalModules,
            durationHours: c.durationHours,
            enrolledCount: c.enrolledCount,
            completionRate: 0,
            instructor: c.instructorName,
          },
          ...prev,
        ]);
      }
      setIsNewOpen(false);
      setTitle("");
      setInstructor("");
      setTotalModules(1);
      setDurationHours(1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan kursus.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-brand-primary" />
            <span>Sistem Pembelajaran & Pelatihan Karyawan (ONE LMS)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Katalog kursus pelatihan internal, learning path karyawan baru, kuis evaluasi materi, dan sertifikat kelulusan.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Buat Kursus Pelatihan Baru</span>
        </Button>
      </div>

      {/* Course Cards Grid */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <Card key={course.id} className="border-border shadow-xs hover:border-brand-primary/40 transition-all text-left">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-tint text-brand-primary border border-brand-indigo/20">
                  {course.category}
                </span>
                {(() => {
                  const courseEnrollments = enrollmentsForCourse(course.id);
                  const rate =
                    courseEnrollments.length > 0
                      ? Math.round(
                          (courseEnrollments.filter((e) => e.status === "completed").length / courseEnrollments.length) * 100
                        )
                      : course.completionRate;
                  return (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {rate}% Kelulusan
                    </span>
                  );
                })()}
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground leading-snug">{course.title}</h3>
                <p className="text-xs text-muted-foreground">Instruktur: {course.instructor}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/80">
                <span className="flex items-center gap-1.5 font-medium">
                  <BookOpen className="h-3.5 w-3.5 text-brand-primary" />
                  {course.totalModules} Modul Materi
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5 text-brand-primary" />
                  {course.durationHours} Jam Pembelajaran
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>{Math.max(course.enrolledCount, enrollmentsForCourse(course.id).length)} Karyawan Terdaftar</span>
                </span>

                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Mulai Belajar</span>
                </Button>
              </div>

              {expandedCourseId === course.id && (
                <div className="pt-3 mt-1 border-t border-border/80 text-xs space-y-3">
                  <div className="text-muted-foreground space-y-1">
                    <p className="font-bold text-foreground">Ruang Materi Kursus</p>
                    <p>{course.totalModules} modul • {course.durationHours} jam • Instruktur {course.instructor}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={enrollEmployeeId}
                      onChange={(e) => setEnrollEmployeeId(e.target.value)}
                      className="h-8 flex-1 px-2 rounded-lg border border-border bg-white text-xs"
                    >
                      <option value="">Pilih karyawan...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="gradient"
                      disabled={enrollBusy || !enrollEmployeeId}
                      onClick={() => handleEnroll(course.id)}
                      className="h-8 text-xs font-bold shrink-0"
                    >
                      Daftarkan
                    </Button>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {enrollmentsForCourse(course.id).length === 0 && (
                      <p className="text-[11px] text-muted-foreground">Belum ada karyawan terdaftar di kursus ini.</p>
                    )}
                    {enrollmentsForCourse(course.id).map((en) => (
                      <div key={en.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5">
                        <div>
                          <div className="font-semibold text-foreground text-[11px]">{en.employeeName}</div>
                          <div className="text-[10px] text-muted-foreground">{en.progressPercent}% progres</div>
                        </div>
                        {en.status === "completed" ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Lulus
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCompleteEnrollment(en.id)}
                            className="h-6 px-2 text-[10px]"
                          >
                            Tandai Selesai
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Kursus Pelatihan Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCourse} className="space-y-3">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Judul Kursus</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CourseItem["category"])}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
              >
                <option>Onboarding Wajib</option>
                <option>SOP Gudang & WMS</option>
                <option>Keselamatan Kerja K3</option>
                <option>Finance & Pajak</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Instruktur</label>
              <Input value={instructor} onChange={(e) => setInstructor(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Total Modul</label>
                <Input type="number" min={1} value={totalModules} onChange={(e) => setTotalModules(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Durasi (Jam)</label>
                <Input type="number" min={1} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold">
                Simpan Kursus
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
