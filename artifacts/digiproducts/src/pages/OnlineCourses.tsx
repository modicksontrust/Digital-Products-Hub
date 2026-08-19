import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  BookOpen,
  Clock,
  GraduationCap,
  MoreVertical,
  Plus,
  Users,
  Eye,
  Copy,
  Archive,
  ExternalLink,
  Pencil,
  BarChart3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { listCourses, getCourse, duplicateCourse, archiveCourse, type CourseRecord } from "@/lib/courseStore";

const COVER_COLORS = ["#5B2B8C", "#1a6b52", "#1d4ed8", "#b45309", "#be123c"];

function coverColor(index: number) {
  return COVER_COLORS[index % COVER_COLORS.length];
}

export default function OnlineCourses() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseRecord[]>([]);

  // Refresh from the in-memory store each time this page mounts (e.g. after creating a course)
  useEffect(() => {
    setCourses(listCourses());
  }, []);

  const handleDuplicate = (course: CourseRecord) => {
    const copy = duplicateCourse(course.id);
    if (copy) {
      setCourses(listCourses());
      toast({ title: `"${course.title}" duplicated`, description: `"${copy.title}" is ready to edit.` });
    }
  };

  const handleArchive = (course: CourseRecord) => {
    const ok = archiveCourse(course.id);
    if (ok) {
      setCourses(listCourses());
      toast({ title: `"${course.title}" archived`, description: "It's hidden from your Academy and won't appear to students." });
    }
  };

  const totalEnrolled = courses.reduce((sum, c) => {
    const entry = getCourse(c.id);
    return sum + (entry?.students.length ?? 0);
  }, 0);

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <GraduationCap className="h-3.5 w-3.5" /> Create &amp; Teach
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">Online Courses</h1>
            <p className="mt-1 text-sm text-ink-500">
              Build and publish courses that teach your audience and grow your income.
            </p>
          </div>
          <Button onClick={() => setLocation("/create/online-course")} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Create course
          </Button>
        </div>

        {/* Stats row */}
        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Total courses", value: String(courses.length), icon: BookOpen },
            { label: "Total enrolled", value: String(totalEnrolled), icon: Users },
            { label: "Completed", value: "0", icon: GraduationCap },
            { label: "Avg. completion", value: "0%", icon: Clock },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-ink-200/80 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
                    <Icon className="h-3.5 w-3.5" /> {stat.label}
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold text-brand-700">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty or course grid */}
        {courses.length === 0 ? (
          <Card className="mt-8 border-dashed border-ink-300 bg-white/60">
            <CardContent className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <GraduationCap className="h-7 w-7" />
              </span>
              <h2 className="mt-5 font-display text-xl font-bold text-ink-900">Your first course starts here</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
                Build a curriculum, set up your sales page, award certificates, and track progress — all in one place.
              </p>
              <Button onClick={() => setLocation("/create/online-course")} className="mt-6 gap-2 rounded-xl">
                <Plus className="h-4 w-4" /> Create your first course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course, idx) => {
              const entry = getCourse(course.id);
              const totalLessons = entry?.modules.reduce((s, m) => s + m.lessons.length, 0) ?? 0;
              const enrolled = entry?.students.length ?? 0;
              return (
                <Card
                  key={course.id}
                  className="group overflow-hidden border-ink-200/80 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer"
                  onClick={() => setLocation(`/create/online-course?courseId=${course.id}`)}
                >
                  <div
                    className="relative aspect-[16/9] flex items-end p-5 text-white"
                    style={{
                      background: `linear-gradient(135deg, ${coverColor(idx)} 0%, #B343A9 100%)`,
                    }}
                  >
                    <span
                      className={cn(
                        "absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        course.status === "published"
                          ? "bg-lime-100 text-lime-800"
                          : "bg-white/20 text-white",
                      )}
                    >
                      {course.status}
                    </span>
                    <div>
                      <h2 className="line-clamp-2 font-display text-lg font-bold leading-tight">{course.title}</h2>
                      {course.subtitle && (
                        <p className="mt-0.5 text-xs text-white/70 line-clamp-1">{course.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 text-xs text-ink-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" /> {totalLessons} lessons
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {enrolled} enrolled
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            onClick={() => setLocation(`/create/online-course?courseId=${course.id}`)}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit course
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                            <Eye className="mr-2 h-4 w-4" /> Preview as student
                            <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide text-ink-400">Soon</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                            <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide text-ink-400">Soon</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                            <ExternalLink className="mr-2 h-4 w-4" /> View sales page
                            <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide text-ink-400">Soon</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDuplicate(course)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => handleArchive(course)}
                          >
                            <Archive className="mr-2 h-4 w-4" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-3 text-xs text-ink-400">
                      Created{" "}
                      {new Date(course.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
