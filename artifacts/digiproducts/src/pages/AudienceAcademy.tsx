import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { listCourses, getCourse, type CourseRecord } from "@/lib/courseStore";
import {
  BookOpen,
  Users,
  Layers,
  Paintbrush,
  UserPlus,
  Inbox,
  Award,
  ExternalLink,
  Save,
  Loader2,
  Search,
  ImageIcon,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";

// ─── Academy settings (in-memory) ────────────────────────────────────────────
interface AcademySettings {
  name: string;
  subdomain: string;
  accentColor: string;
  welcomeMessage: string;
}

let _academySettings: AcademySettings = {
  name: "My Academy",
  subdomain: "my-academy",
  accentColor: "#8b5cf6",
  welcomeMessage: "Welcome to my learning portal! Here you'll find all the courses you've enrolled in.",
};

const ACCENT_PRESETS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AudienceAcademy() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user } = useGetMe();

  const [activeTab, setActiveTab] = useState<"branding" | "courses" | "students" | "preview">("branding");
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [settings, setSettings] = useState<AcademySettings>({ ..._academySettings });
  const [saving, setSaving] = useState(false);

  // Student search/filter state
  const [studentSearch, setStudentSearch] = useState("");
  const [studentCourseFilter, setStudentCourseFilter] = useState("all");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");

  useEffect(() => {
    setCourses(listCourses());
  }, []);

  const updateSettings = (partial: Partial<AcademySettings>) =>
    setSettings((prev) => ({ ...prev, ...partial }));

  const handleSave = () => {
    setSaving(true);
    _academySettings = { ...settings };
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Academy settings saved" });
    }, 700);
  };

  // Aggregate stats
  const totalStudents = courses.reduce((sum, c) => {
    const entry = getCourse(c.id);
    return sum + (entry?.students.length ?? 0);
  }, 0);
  const totalLessons = courses.reduce((sum, c) => {
    const entry = getCourse(c.id);
    return sum + (entry?.modules.reduce((ms, m) => ms + m.lessons.length, 0) ?? 0);
  }, 0);

  // All students across courses for the Students tab
  const allStudents = courses.flatMap((c) => {
    const entry = getCourse(c.id);
    return (entry?.students ?? []).map((s) => ({ ...s, courseName: c.title, courseId: c.id }));
  });

  const filteredStudents = allStudents.filter((s) => {
    const matchesSearch =
      !studentSearch ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.name.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesCourse =
      studentCourseFilter === "all" || s.courseId === studentCourseFilter;
    const matchesStatus =
      studentStatusFilter === "all" ||
      (studentStatusFilter === "completed" ? s.completed : !s.completed);
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const tabs = [
    { id: "branding", label: "Branding", icon: Paintbrush },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "students", label: "Students", icon: Users },
    { id: "preview", label: "Preview", icon: ExternalLink },
  ] as const;

  return (
    <AppLayout>
      <div className="w-full">
        {/* ── Purple gradient hero header ─────────────────────────────── */}
        <div
          className="relative overflow-hidden px-8 pb-6 pt-8 text-white"
          style={{
            background: `linear-gradient(135deg, ${settings.accentColor}cc 0%, ${settings.accentColor}88 50%, #c084fc55 100%), linear-gradient(to bottom right, #7c3aed, #a855f7)`,
          }}
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              {/* Identity */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <GraduationCap className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold">{settings.name}</h1>
                  <p className="text-sm text-white/70">Your branded learning portal</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 border border-white/30 bg-white/10 text-white hover:bg-white/20"
                  variant="ghost"
                  onClick={() => toast({ title: "Add student", description: "Go to a course and add students from the Students tab." })}
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add Student
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 border border-white/30 bg-white/10 text-white/50 cursor-not-allowed"
                  variant="ghost"
                  disabled
                  title="Coming soon"
                >
                  <Inbox className="h-3.5 w-3.5" /> Student Inbox
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 border border-white/30 bg-white/10 text-white/50 cursor-not-allowed"
                  variant="ghost"
                  disabled
                  title="Coming soon"
                >
                  <Award className="h-3.5 w-3.5" /> Claim PLR Course
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 flex flex-wrap gap-6">
              {[
                { label: "Courses", value: courses.length, icon: BookOpen },
                { label: "Students", value: totalStudents, icon: Users },
                { label: "Total Lessons", value: totalLessons, icon: Layers },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-white/60" />
                    <span className="font-display text-xl font-bold">{stat.value}</span>
                    <span className="text-sm text-white/60">{stat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────── */}
        <div className="border-b border-ink-200 bg-white">
          <div className="mx-auto max-w-7xl px-8">
            <nav className="-mb-px flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors",
                      active
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* ── Tab content ────────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-8 py-8">

          {/* ── Branding ─────────────────────────────────────────────── */}
          {activeTab === "branding" && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 grid gap-6 lg:grid-cols-2">
              {/* Academy Identity */}
              <Card className="border-ink-200 shadow-sm">
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-ink-500" />
                    <h2 className="font-semibold text-ink-900">Academy Identity</h2>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Academy Name</Label>
                    <Input
                      value={settings.name}
                      onChange={(e) => updateSettings({ name: e.target.value })}
                      placeholder="My Academy"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Academy Subdomain</Label>
                    <div className="flex items-stretch">
                      <Input
                        value={settings.subdomain}
                        onChange={(e) =>
                          updateSettings({
                            subdomain: e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, "-")
                              .replace(/^-|-$/g, ""),
                          })
                        }
                        className="rounded-r-none border-r-0 focus-visible:ring-0"
                        placeholder="my-academy"
                      />
                      <span className="flex items-center rounded-r-lg border border-l-0 border-ink-200 bg-ink-50 px-3 text-sm text-ink-500 select-none">
                        .pokipoki.app
                      </span>
                    </div>
                    <p className="text-xs text-ink-400">
                      This is the URL students will use to access your academy
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-ink-200 bg-ink-50">
                        <GraduationCap className="h-6 w-6 text-ink-400" />
                      </div>
                      <button
                        type="button"
                        disabled
                        title="Coming soon"
                        className="flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-400 bg-ink-50 cursor-not-allowed select-none"
                      >
                        <ImageIcon className="h-4 w-4" /> Upload Logo
                        <span className="ml-1 rounded-full bg-ink-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-500">Soon</span>
                      </button>
                    </div>
                    <p className="text-xs text-ink-400">PNG or JPG, max 5MB</p>
                  </div>
                </CardContent>
              </Card>

              {/* Customization */}
              <Card className="border-ink-200 shadow-sm">
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-center gap-2">
                    <Paintbrush className="h-4 w-4 text-ink-500" />
                    <h2 className="font-semibold text-ink-900">Customization</h2>
                  </div>

                  <div className="space-y-3">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2">
                        <span
                          className="h-6 w-6 rounded"
                          style={{ background: settings.accentColor }}
                        />
                        <input
                          type="color"
                          value={settings.accentColor}
                          onChange={(e) => updateSettings({ accentColor: e.target.value })}
                          className="h-6 w-16 cursor-pointer border-0 bg-transparent p-0 text-sm font-mono text-ink-600 outline-none"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        {ACCENT_PRESETS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => updateSettings({ accentColor: color })}
                            className={cn(
                              "h-7 w-7 rounded-full border-2 transition",
                              settings.accentColor === color
                                ? "border-ink-700 scale-110"
                                : "border-transparent hover:scale-105",
                            )}
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Welcome Message</Label>
                    <Textarea
                      value={settings.welcomeMessage}
                      onChange={(e) => updateSettings({ welcomeMessage: e.target.value })}
                      className="min-h-[120px] resize-y"
                      placeholder="Welcome to my learning portal!..."
                    />
                  </div>

                  <Button
                    className="w-full gap-2"
                    style={{ background: settings.accentColor }}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Courses ───────────────────────────────────────────────── */}
          {activeTab === "courses" && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-3">
              {courses.length === 0 ? (
                <Card className="border-dashed border-ink-300">
                  <CardContent className="flex flex-col items-center py-20 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-300">
                      <BookOpen className="h-7 w-7" />
                    </span>
                    <p className="mt-4 font-semibold text-ink-700">No courses yet</p>
                    <p className="mt-1 text-sm text-ink-400">
                      Create an online course to see it here.
                    </p>
                    <Button
                      className="mt-5 gap-2"
                      onClick={() => setLocation("/create/online-course")}
                    >
                      Create your first course
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                courses.map((course) => {
                  const entry = getCourse(course.id);
                  const lessonCount = entry?.modules.reduce((s, m) => s + m.lessons.length, 0) ?? 0;
                  const studentCount = entry?.students.length ?? 0;
                  return (
                    <Card
                      key={course.id}
                      className="border-ink-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        {/* Thumbnail */}
                        <div
                          className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl text-white"
                          style={{
                            background: `linear-gradient(135deg, ${settings.accentColor} 0%, #c084fc 100%)`,
                          }}
                        >
                          <GraduationCap className="h-6 w-6 opacity-80" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-ink-900">{course.title}</p>
                            <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                              {course.status}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" /> {lessonCount} lessons
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {studentCount} students
                            </span>
                            <span className="flex items-center gap-1">
                              ⏱ 0m
                            </span>
                          </div>
                        </div>

                        {/* Action */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 shrink-0 text-ink-600"
                          onClick={() =>
                            setLocation(`/create/online-course?courseId=${course.id}`)
                          }
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* ── Students ──────────────────────────────────────────────── */}
          {activeTab === "students" && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-4">
              {/* Search + filters */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name or email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <Select value={studentCourseFilter} onValueChange={setStudentCourseFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredStudents.length === 0 ? (
                <Card className="border-dashed border-ink-300">
                  <CardContent className="flex flex-col items-center py-16 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-50">
                      <Users className="h-7 w-7 text-ink-300" />
                    </span>
                    <p className="mt-4 font-semibold text-ink-700">No students found</p>
                    <p className="mt-1 text-sm text-ink-400">
                      {allStudents.length === 0
                        ? "Add a student or wait for someone to enroll."
                        : "Try adjusting your search or filters."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden border-ink-200 shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Student</th>
                        <th className="px-4 py-3 text-left">Course</th>
                        <th className="px-4 py-3 text-left">Enrolled</th>
                        <th className="px-4 py-3 text-left">Progress</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 bg-white">
                      {filteredStudents.map((s) => (
                        <tr key={`${s.id}-${s.courseId}`} className="hover:bg-ink-50/40">
                          <td className="px-4 py-3">
                            <p className="font-medium text-ink-900">{s.name || s.email}</p>
                            {s.name && <p className="text-xs text-ink-400">{s.email}</p>}
                          </td>
                          <td className="px-4 py-3 text-ink-600">{s.courseName}</td>
                          <td className="px-4 py-3 text-ink-500">
                            {new Date(s.enrolledAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
                                <div
                                  className="h-full rounded-full bg-brand-500"
                                  style={{ width: `${s.progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-ink-500">{s.progress}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                s.completed
                                  ? "bg-lime-100 text-lime-700"
                                  : "bg-orange-50 text-orange-600",
                              )}
                            >
                              {s.completed ? "Completed" : "Active"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}

          {/* ── Preview ───────────────────────────────────────────────── */}
          {activeTab === "preview" && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="mb-4 text-sm text-ink-500">
                This is how your student portal will look to enrolled students.
              </p>

              {/* Browser chrome */}
              <div className="overflow-hidden rounded-2xl border border-ink-200 shadow-xl">
                {/* Chrome bar */}
                <div className="flex items-center gap-2 border-b border-ink-200 bg-ink-50 px-4 py-2.5">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                  <div className="ml-3 flex-1 rounded-md border border-ink-200 bg-white px-3 py-1 text-center text-xs text-ink-400">
                    {settings.subdomain}.pokipoki.app/dashboard
                  </div>
                </div>

                {/* Portal layout */}
                <div className="flex h-[420px] bg-[#0f0f11] text-white">
                  {/* Sidebar */}
                  <div className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#18181b] p-4">
                    <div className="mb-6 flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ background: settings.accentColor }}
                      >
                        <GraduationCap className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{settings.name}</p>
                        <p className="text-[10px] text-white/40">Learning Portal</p>
                      </div>
                    </div>

                    <nav className="flex-1 space-y-1">
                      {[
                        { label: "Dashboard", icon: LayoutDashboard, active: true },
                        { label: "My Courses", icon: BookOpen, active: false },
                        { label: "Certificates", icon: Award, active: false },
                        { label: "Settings", icon: Settings, active: false },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.label}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                              item.active
                                ? "text-white"
                                : "text-white/50",
                            )}
                            style={item.active ? { background: `${settings.accentColor}33` } : {}}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {item.label}
                          </div>
                        );
                      })}
                    </nav>

                    <p className="mt-auto text-center text-[9px] text-white/20">
                      POWERED BY POKIPOKI
                    </p>
                  </div>

                  {/* Main area */}
                  <div className="flex-1 overflow-auto p-7">
                    <h2 className="font-display text-2xl font-bold">
                      Welcome back 👋
                    </h2>
                    <p className="mt-1 text-sm text-white/50">Continue where you left off</p>

                    <div className="mt-6 grid grid-cols-4 gap-3">
                      {[
                        { label: "Enrolled", value: courses.length },
                        { label: "Completed", value: 0 },
                        { label: "Lessons", value: totalLessons },
                        { label: "Progress", value: "0%" },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-4"
                        >
                          <p className="font-display text-2xl font-bold">{stat.value}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    {courses.length > 0 && (
                      <div className="mt-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
                          My Courses
                        </p>
                        <div className="space-y-2">
                          {courses.slice(0, 2).map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                            >
                              <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                style={{ background: `${settings.accentColor}55` }}
                              >
                                <BookOpen className="h-4 w-4 text-white/70" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium">{c.title}</p>
                                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                                  <div className="h-full w-0 rounded-full" style={{ background: settings.accentColor }} />
                                </div>
                              </div>
                              <p className="text-xs text-white/30">0%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-ink-400">
                Students access this portal at{" "}
                <span className="font-mono text-brand-600">
                  {settings.subdomain}.pokipoki.app
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
