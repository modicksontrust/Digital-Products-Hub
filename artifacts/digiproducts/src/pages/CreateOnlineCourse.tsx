import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  createCourse,
  getCourse,
  updateCourse,
  updateModules,
  addStudent,
  type CourseRecord,
  type ModuleRecord,
  type LessonRecord,
  type StudentRecord,
  type QuizQuestion,
} from "@/lib/courseStore";
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  Eye,
  FileText,
  GraduationCap,
  ImageIcon,
  Link2,
  Loader2,
  Pencil,
  Play,
  Plus,
  Save,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Video,
  Clock,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonType = "video" | "text" | "download" | "quiz";

// ─── Constants ────────────────────────────────────────────────────────────────

const CERT_TEMPLATES = [
  { id: "royal-navy", label: "Royal Navy", bg: "#0f172a", accent: "#c9a84c" },
  { id: "ivory-elegance", label: "Ivory Elegance", bg: "#fdfaf5", accent: "#b08d5b" },
  { id: "midnight-violet", label: "Midnight Violet", bg: "#2e1065", accent: "#a78bfa" },
  { id: "emerald-forest", label: "Emerald Forest", bg: "#064e3b", accent: "#6ee7b7" },
  { id: "clean-white", label: "Clean White", bg: "#ffffff", accent: "#6366f1" },
  { id: "crimson-prestige", label: "Crimson Prestige", bg: "#3b0a0a", accent: "#fbbf24" },
  { id: "ocean-blue", label: "Ocean Blue", bg: "#0c4a6e", accent: "#38bdf8" },
  { id: "charcoal-minimal", label: "Charcoal Minimal", bg: "#1c1c1e", accent: "#e5e5e5" },
  { id: "rose-gold", label: "Rose Gold", bg: "#3d1a24", accent: "#f9a8d4" },
  { id: "nordic-frost", label: "Nordic Frost", bg: "#f0f4f8", accent: "#4f7296" },
];

const LESSON_TYPE_OPTIONS: {
  type: LessonType;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { type: "video", label: "Video", icon: Video, color: "bg-blue-500" },
  { type: "text", label: "Text", icon: FileText, color: "bg-emerald-500" },
  { type: "download", label: "Download", icon: Download, color: "bg-orange-500" },
  { type: "quiz", label: "Quiz", icon: Sparkles, color: "bg-purple-500" },
];

const SALES_TEMPLATES = [
  {
    id: "minimal-clean",
    label: "Minimal Clean",
    desc: "Elegant whitespace, premium typography. Best for high-ticket courses.",
    bg: "#f9fafb",
    accent: "#6366f1",
  },
  {
    id: "bold-creator",
    label: "Bold Creator",
    desc: "High energy, strong colors, bold CTAs. Best for personality-driven courses.",
    bg: "#6d28d9",
    accent: "#a78bfa",
  },
  {
    id: "luxury-dark",
    label: "Luxury Dark",
    desc: "Dark background, gold accents. Best for high-end masterclasses.",
    bg: "#111827",
    accent: "#f59e0b",
  },
  {
    id: "corporate-professional",
    label: "Corporate Professional",
    desc: "Clean, structured, trust-focused. Best for B2B and certifications.",
    bg: "#1e293b",
    accent: "#38bdf8",
  },
  {
    id: "vibrant-creative",
    label: "Vibrant Creative",
    desc: "Colorful, playful, gradient-heavy. Best for creative skills courses.",
    bg: "linear-gradient(135deg,#f97316,#ec4899)",
    accent: "#fbbf24",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idCounter = 0;
function uid() {
  return `id-${++_idCounter}-${Math.random().toString(36).slice(2, 5)}`;
}

function newModule(title = "New Module"): ModuleRecord {
  return { id: uid(), title, expanded: true, lessons: [] };
}

function newLesson(type: LessonType): LessonRecord {
  return { id: uid(), title: "New lesson", type, duration: "", free: false };
}

function blankCourseData(): Omit<CourseRecord, "id" | "createdAt" | "updatedAt" | "status"> {
  return {
    title: "",
    subtitle: "",
    description: "",
    welcomeMessage: "",
    category: "",
    level: "all-levels",
    language: "English",
    priceCents: 0,
    isFree: true,
    slug: "",
    showOnBio: false,
    salesHeadline: "",
    promoVideo: "",
    targetAudience: "",
    learningOutcomes: [""],
    courseDescription: "",
    certificateEnabled: true,
    certTemplate: "royal-navy",
    certBgColor: "#0f172a",
    certAccentColor: "#c9a84c",
    certOrg: "",
    certSignature: "",
    certShowDate: true,
    certShowBranding: true,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuizEditor({
  questions,
  onChange,
}: {
  questions: QuizQuestion[];
  onChange: (qs: QuizQuestion[]) => void;
}) {
  const addQuestion = () => {
    onChange([
      ...questions,
      { id: uid(), question: "", options: ["", "", "", ""], correct: 0 },
    ]);
  };

  const updateQuestion = (idx: number, patch: Partial<QuizQuestion>) =>
    onChange(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

  const removeQuestion = (idx: number) =>
    onChange(questions.filter((_, i) => i !== idx));

  const updateOption = (qIdx: number, oIdx: number, val: string) => {
    const q = questions[qIdx];
    const opts = q.options.slice() as [string, string, string, string];
    opts[oIdx] = val;
    updateQuestion(qIdx, { options: opts });
  };

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <p className="text-center text-xs text-ink-400 py-2">
          No questions yet — add the first one below.
        </p>
      )}
      {questions.map((q, qIdx) => (
        <div key={q.id} className="rounded-xl border border-ink-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-bold text-ink-500">Q{qIdx + 1}</span>
            <Input
              className="flex-1 text-sm"
              placeholder="Write your question…"
              value={q.question}
              onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
            />
            <button
              type="button"
              onClick={() => removeQuestion(qIdx)}
              className="shrink-0 text-ink-400 hover:text-destructive transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-2">
                <button
                  type="button"
                  title="Mark as correct answer"
                  onClick={() => updateQuestion(qIdx, { correct: oIdx })}
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition",
                    q.correct === oIdx
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-ink-300 text-ink-400 hover:border-emerald-400",
                  )}
                >
                  {String.fromCharCode(65 + oIdx)}
                </button>
                <Input
                  className="h-8 text-sm"
                  placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                  value={opt}
                  onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-400">
            Click a letter to mark the correct answer (shown in green).
          </p>
        </div>
      ))}
      <button
        type="button"
        onClick={addQuestion}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-300 py-2.5 text-xs font-medium text-ink-500 hover:border-brand-300 hover:text-brand-600 transition"
      >
        <Plus className="h-3.5 w-3.5" /> Add Question
      </button>
    </div>
  );
}

function LessonRow({
  lesson,
  onChange,
  onRemove,
}: {
  lesson: LessonRecord;
  onChange: (l: LessonRecord) => void;
  onRemove: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draft, setDraft] = useState(lesson.title);
  const [expanded, setExpanded] = useState(false);

  const opt = LESSON_TYPE_OPTIONS.find((o) => o.type === lesson.type);
  const LIcon = opt?.icon ?? Video;
  const lColor = opt?.color ?? "bg-blue-500";

  const hasContent =
    (lesson.type === "video" && !!lesson.videoUrl) ||
    (lesson.type === "text" && !!lesson.textContent) ||
    (lesson.type === "download" && (!!lesson.fileUrl || !!lesson.fileName)) ||
    (lesson.type === "quiz" && (lesson.quizQuestions?.length ?? 0) > 0);

  return (
    <div className="overflow-hidden rounded-lg border border-ink-100 bg-white shadow-sm">
      {/* ── Header row ── */}
      <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white",
            lColor,
          )}
        >
          <LIcon className="h-3.5 w-3.5" />
        </span>

        {editingTitle ? (
          <input
            autoFocus
            className="flex-1 rounded border border-brand-300 px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-brand-400"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onChange({ ...lesson, title: draft.trim() || lesson.title });
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChange({ ...lesson, title: draft.trim() || lesson.title });
                setEditingTitle(false);
              }
              if (e.key === "Escape") {
                setDraft(lesson.title);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <span
            className="flex-1 truncate cursor-pointer text-ink-800 hover:text-ink-900"
            onClick={() => { setDraft(lesson.title); setEditingTitle(true); }}
          >
            {lesson.title}
          </span>
        )}

        <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] capitalize text-ink-500">
          {lesson.type}
        </span>

        <label className="flex cursor-pointer select-none items-center gap-1 text-[10px] text-ink-400">
          <input
            type="checkbox"
            className="rounded"
            checked={lesson.free}
            onChange={(e) => onChange({ ...lesson, free: e.target.checked })}
          />
          Free
        </label>

        {/* Content toggle — highlights when content has been entered */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition",
            expanded
              ? "bg-brand-100 text-brand-700"
              : hasContent
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-ink-100 text-ink-500 hover:bg-ink-200 hover:text-ink-700",
          )}
        >
          <Pencil className="h-3 w-3" />
          {expanded ? "Close" : hasContent ? "Edit content" : "Add content"}
        </button>

        <button type="button" onClick={onRemove} className="text-ink-400 hover:text-destructive transition">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Expandable content panel ── */}
      {expanded && (
        <div className="border-t border-ink-100 bg-ink-50/40 px-4 py-4 space-y-4">
          {lesson.type === "video" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Video URL</Label>
              <Input
                placeholder="Paste a YouTube, Vimeo, or direct .mp4 URL…"
                value={lesson.videoUrl ?? ""}
                onChange={(e) => onChange({ ...lesson, videoUrl: e.target.value })}
              />
              <p className="text-[11px] text-ink-400">
                Students will see an embedded player. Supports YouTube, Vimeo, and direct video links.
              </p>
            </div>
          )}

          {lesson.type === "text" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lesson Content</Label>
              <Textarea
                rows={7}
                placeholder="Write your lesson text here…"
                value={lesson.textContent ?? ""}
                onChange={(e) => onChange({ ...lesson, textContent: e.target.value })}
                className="resize-y text-sm"
              />
            </div>
          )}

          {lesson.type === "download" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">File Name</Label>
                <Input
                  placeholder="e.g. Course Workbook.pdf"
                  value={lesson.fileName ?? ""}
                  onChange={(e) => onChange({ ...lesson, fileName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">File URL</Label>
                <Input
                  placeholder="Paste a direct download link…"
                  value={lesson.fileUrl ?? ""}
                  onChange={(e) => onChange({ ...lesson, fileUrl: e.target.value })}
                />
                <p className="text-[11px] text-ink-400">
                  Students will see a Download button that opens this link.
                </p>
              </div>
            </div>
          )}

          {lesson.type === "quiz" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Quiz Questions</Label>
              <QuizEditor
                questions={lesson.quizQuestions ?? []}
                onChange={(qs) => onChange({ ...lesson, quizQuestions: qs })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  module,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  module: ModuleRecord;
  index: number;
  total: number;
  onChange: (m: ModuleRecord) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draft, setDraft] = useState(module.title);
  const [pickingType, setPickingType] = useState(false);

  const toggleExpand = () => onChange({ ...module, expanded: !module.expanded });

  const addLesson = (type: LessonType) => {
    onChange({ ...module, lessons: [...module.lessons, newLesson(type)] });
    setPickingType(false);
  };

  const updateLesson = (lessonId: string, updated: LessonRecord) =>
    onChange({
      ...module,
      lessons: module.lessons.map((l) => (l.id === lessonId ? updated : l)),
    });

  const removeLesson = (lessonId: string) =>
    onChange({ ...module, lessons: module.lessons.filter((l) => l.id !== lessonId) });

  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-l-4 border-brand-500 bg-white px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-ink-300 hover:text-ink-600 disabled:opacity-30"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-ink-300 hover:text-ink-600 disabled:opacity-30"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleExpand}
          className="text-ink-400 hover:text-ink-700"
        >
          {module.expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {editingTitle ? (
          <input
            autoFocus
            className="flex-1 rounded border border-brand-300 px-2 py-0.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-brand-400"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onChange({ ...module, title: draft.trim() || module.title });
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChange({ ...module, title: draft.trim() || module.title });
                setEditingTitle(false);
              }
              if (e.key === "Escape") {
                setDraft(module.title);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <span className="flex-1 font-semibold text-ink-900">{module.title}</span>
        )}

        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
          {module.lessons.length}
        </span>
        <button
          type="button"
          onClick={() => {
            setDraft(module.title);
            setEditingTitle(true);
          }}
          className="text-ink-400 hover:text-ink-700"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onRemove} className="text-ink-400 hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {module.expanded && (
        <div className="space-y-2 p-4">
          {module.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              onChange={(updated) => updateLesson(lesson.id, updated)}
              onRemove={() => removeLesson(lesson.id)}
            />
          ))}

          {pickingType ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-700">
                  Choose lesson type
                </p>
                <button
                  type="button"
                  onClick={() => setPickingType(false)}
                  className="text-ink-400 hover:text-ink-700 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {LESSON_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => addLesson(opt.type)}
                      className="flex flex-col items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-5 text-sm font-medium text-ink-700 transition hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5"
                    >
                      <span
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm",
                          opt.color,
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="text-center leading-tight">
                        <span className="block font-semibold">{opt.label}</span>
                        <span className="block text-[11px] font-normal text-ink-400 mt-0.5">
                          {opt.type === "video" && "URL or embed"}
                          {opt.type === "text" && "Rich text"}
                          {opt.type === "download" && "File or link"}
                          {opt.type === "quiz" && "Q&A questions"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPickingType(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-300 py-2.5 text-xs font-medium text-ink-500 transition hover:border-brand-300 hover:text-brand-600"
            >
              <Plus className="h-3.5 w-3.5" /> Add Lesson
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Certificate preview ──────────────────────────────────────────────────────

function CertPreview({
  certBgColor,
  certAccentColor,
  certShowDate,
  certShowBranding,
  certSignature,
  courseTitle,
}: {
  certBgColor: string;
  certAccentColor: string;
  certShowDate: boolean;
  certShowBranding: boolean;
  certSignature: string;
  courseTitle: string;
}) {
  const isLight =
    certBgColor === "#ffffff" || certBgColor === "#fdfaf5" || certBgColor === "#f0f4f8";
  const textColor = isLight ? "#1c1c1e" : "#ffffff";

  return (
    <div
      className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl p-10 shadow-2xl"
      style={{ background: certBgColor, color: textColor, fontFamily: "Georgia, serif" }}
    >
      <div className="mb-1 text-center text-xl font-bold tracking-widest uppercase opacity-70">
        Certificate
      </div>
      <div className="mb-8 text-center text-sm tracking-[0.4em] uppercase opacity-60">
        of Completion
      </div>
      <div className="mb-1 text-center text-xs tracking-widest uppercase opacity-50">
        This is to certify that
      </div>
      <div
        className="my-3 text-center font-serif text-4xl font-bold italic"
        style={{ color: certAccentColor }}
      >
        [Student Name]
      </div>
      <div className="mb-2 text-center text-sm opacity-60">
        has successfully completed the course
      </div>
      <div
        className="mb-6 text-center text-lg font-bold uppercase tracking-wider"
        style={{ color: certAccentColor }}
      >
        {courseTitle || "Your Course Title"}
      </div>
      {certShowDate && (
        <div className="mb-8 text-center text-xs opacity-50">
          {new Date().toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      )}
      <div
        className="mt-6 flex items-end justify-between border-t pt-4"
        style={{ borderColor: `${textColor}22` }}
      >
        <div className="text-center text-xs">
          <div className="mb-1 font-semibold">{certSignature || "Instructor"}</div>
          <div className="text-[10px] uppercase tracking-widest opacity-50">Instructor</div>
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] opacity-60"
          style={{ borderColor: certAccentColor }}
        >
          ✦
        </div>
        <div className="text-[10px] uppercase tracking-widest opacity-50">Date</div>
      </div>
      {certShowBranding && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] opacity-30">
          Powered by PokiPoki
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateOnlineCourse() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  // Parse courseId from ?courseId=…
  const courseId = new URLSearchParams(search).get("courseId") ?? null;

  // Phase: "create" (wizard) or "workspace" (editor)
  const [phase, setPhase] = useState<"create" | "workspace">(courseId ? "workspace" : "create");
  const [wizardStep, setWizardStep] = useState(1);
  const [activeTab, setActiveTab] = useState("curriculum");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(courseId);

  // Course form state
  const [course, setCourse] = useState<Omit<CourseRecord, "id" | "createdAt" | "updatedAt" | "status">>(blankCourseData());

  // Curriculum
  const [modules, setModules] = useState<ModuleRecord[]>([]);

  // Students
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentName, setNewStudentName] = useState("");

  // Sales page
  const [salesStep, setSalesStep] = useState<1 | 2 | 3>(1);
  const [salesTone, setSalesTone] = useState("warm");
  const [salesTemplate, setSalesTemplate] = useState("minimal-clean");
  const [salesWho, setSalesWho] = useState("");
  const [salesTransformation, setSalesTransformation] = useState("");
  const [salesFrustrations, setSalesFrustrations] = useState("");
  const [salesGenerated, setSalesGenerated] = useState(false);

  // Misc
  const [saving, setSaving] = useState(false);

  // ── Load existing course from store on mount ───────────────────────────────
  useEffect(() => {
    if (!courseId) return;
    const entry = getCourse(courseId);
    if (!entry) {
      // Unknown ID — fall through to the create wizard
      setPhase("create");
      setActiveCourseId(null);
      return;
    }
    const { course: c, modules: m, students: s } = entry;
    setCourse({
      title: c.title,
      subtitle: c.subtitle,
      description: c.description,
      welcomeMessage: c.welcomeMessage,
      category: c.category,
      level: c.level,
      language: c.language,
      priceCents: c.priceCents,
      isFree: c.isFree,
      slug: c.slug,
      showOnBio: c.showOnBio,
      salesHeadline: c.salesHeadline,
      promoVideo: c.promoVideo,
      targetAudience: c.targetAudience,
      learningOutcomes: c.learningOutcomes,
      courseDescription: c.courseDescription,
      certificateEnabled: c.certificateEnabled,
      certTemplate: c.certTemplate,
      certBgColor: c.certBgColor,
      certAccentColor: c.certAccentColor,
      certOrg: c.certOrg,
      certSignature: c.certSignature,
      certShowDate: c.certShowDate,
      certShowBranding: c.certShowBranding,
    });
    setModules(m);
    setStudents(s);
    setPhase("workspace");
  }, [courseId]);

  const update = useCallback((next: Partial<Omit<CourseRecord, "id" | "createdAt" | "updatedAt" | "status">>) => {
    setCourse((prev) => ({ ...prev, ...next }));
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);

  // ── Wizard ─────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    if (!course.title.trim()) {
      toast({ title: "Add a course title to continue", variant: "destructive" });
      return;
    }
    const slug =
      course.slug ||
      `course-${course.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    const created = createCourse({ ...course, slug });
    setActiveCourseId(created.id);
    // Replace URL so Back works correctly
    window.history.replaceState(null, "", window.location.pathname + `?courseId=${created.id}`);
    setPhase("workspace");
    setActiveTab("curriculum");
  };

  // ── Curriculum ─────────────────────────────────────────────────────────────

  const addModule = () =>
    setModules((prev) => [...prev, newModule(`Module ${prev.length + 1}`)]);

  const updateModule = (id: string, updated: ModuleRecord) =>
    setModules((prev) => prev.map((m) => (m.id === id ? updated : m)));

  const removeModule = (id: string) => {
    if (!window.confirm("Remove this module and all its lessons?")) return;
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  const moveModule = (index: number, dir: -1 | 1) => {
    setModules((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // ── Info page ──────────────────────────────────────────────────────────────

  const addOutcome = () => update({ learningOutcomes: [...course.learningOutcomes, ""] });

  const updateOutcome = (i: number, val: string) => {
    const next = [...course.learningOutcomes];
    next[i] = val;
    update({ learningOutcomes: next });
  };

  const removeOutcome = (i: number) =>
    update({ learningOutcomes: course.learningOutcomes.filter((_, idx) => idx !== i) });

  // ── Students ───────────────────────────────────────────────────────────────

  const handleAddStudent = () => {
    const email = newStudentEmail.trim();
    if (!email) {
      toast({ title: "Enter a student email", variant: "destructive" });
      return;
    }
    if (students.some((s) => s.email === email)) {
      toast({ title: "This student is already enrolled", variant: "destructive" });
      return;
    }

    let newStudent: StudentRecord;
    if (activeCourseId) {
      newStudent = addStudent(activeCourseId, { name: newStudentName.trim(), email });
    } else {
      newStudent = {
        id: `student-${Date.now().toString(36)}`,
        name: newStudentName.trim(),
        email,
        enrolledAt: new Date().toISOString(),
        progress: 0,
        completed: false,
      };
    }
    setStudents((prev) => [...prev, newStudent]);
    setNewStudentEmail("");
    setNewStudentName("");
    setAddStudentOpen(false);
    toast({
      title: `Student added: ${email}`,
      description: "They've been manually enrolled in this course.",
    });
  };

  // ── Sales page generation ──────────────────────────────────────────────────

  const handleGenerateSales = () => {
    const tone =
      salesTone === "warm"
        ? "conversational and warm"
        : salesTone === "professional"
        ? "professional and authoritative"
        : salesTone === "high-energy"
        ? "high-energy and motivational"
        : salesTone === "calm"
        ? "calm and reassuring"
        : "bold and direct";

    const audience = salesWho.trim() || "entrepreneurs and professionals";
    const transformation =
      salesTransformation.trim() ||
      "gain the skills and confidence to succeed in their goals";

    // Write generated copy into the course info fields so the creator can see and refine it
    const headline = `${course.title}: Your Complete Guide for ${audience}`;
    const desc = `This course is designed specifically for ${audience}.\n\nBy the end, you will ${transformation}.\n\n${
      salesFrustrations.trim()
        ? `We know the frustrations you face:\n${salesFrustrations
            .split("\n")
            .map((l) => `• ${l}`)
            .join("\n")}\n\nThis course addresses every one of them — in a ${tone} style, at your own pace.`
        : `The curriculum is structured to take you from where you are today to where you want to be, taught in a ${tone} style.`
    }\n\n${
      modules.length > 0
        ? `The course includes ${modules.length} module${modules.length > 1 ? "s" : ""} and ${totalLessons} lesson${totalLessons !== 1 ? "s" : ""} covering everything you need to succeed.`
        : ""
    }`;

    update({ salesHeadline: headline, courseDescription: desc, targetAudience: audience });
    setSalesGenerated(true);
    setSalesStep(1);
    setActiveTab("info");
    toast({
      title: "Sales copy generated!",
      description: "Review and refine your copy in the Info Page tab.",
    });
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = () => {
    setSaving(true);
    if (activeCourseId) {
      updateCourse(activeCourseId, course);
      updateModules(activeCourseId, modules);
    }
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Course saved", description: "Your latest changes are saved." });
    }, 600);
  };

  // ── Workspace tabs ─────────────────────────────────────────────────────────

  const tabs = [
    { id: "curriculum", label: "Curriculum", icon: BookOpen },
    { id: "info", label: "Info Page", icon: FileText },
    { id: "sales", label: "Sales Page", icon: ShoppingBag },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "students", label: "Students", icon: Users },
    { id: "certificate", label: "Certificate", icon: Award },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  // ─── Wizard phase ──────────────────────────────────────────────────────────

  if (phase === "create") {
    return (
      <AppLayout>
        <div className="min-h-full bg-paper">
          <div className="mx-auto max-w-xl px-5 py-12">
            <button
              type="button"
              onClick={() => setLocation("/online-courses")}
              className="mb-8 flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Courses
            </button>

            <Card className="border-ink-200 shadow-lg">
              <CardContent className="px-8 py-10 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <BookOpen className="h-8 w-8" />
                </div>

                {/* Step 1 — title + subtitle */}
                {wizardStep === 1 && (
                  <>
                    <h1 className="font-display text-2xl font-bold text-ink-900">
                      Create Your Course
                    </h1>
                    <p className="mt-1 text-sm text-ink-500">
                      Give your course a name and subtitle to get started
                    </p>
                    <div className="mt-8 space-y-5 text-left">
                      <div className="space-y-1.5">
                        <Label htmlFor="course-title">
                          Course Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="course-title"
                          value={course.title}
                          onChange={(e) => update({ title: e.target.value })}
                          placeholder="e.g. Master Digital Marketing in 30 Days"
                          className="h-12"
                          autoFocus
                        />
                        <p className="text-xs text-ink-400">
                          Choose a clear, compelling title that tells students what they'll learn
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="course-subtitle">
                          Subtitle{" "}
                          <span className="font-normal text-ink-400">(optional)</span>
                        </Label>
                        <Input
                          id="course-subtitle"
                          value={course.subtitle}
                          onChange={(e) => update({ subtitle: e.target.value })}
                          placeholder="e.g. A step-by-step guide for beginners"
                          className="h-12"
                        />
                        <p className="text-xs text-ink-400">Add extra context about your course</p>
                      </div>
                      <Button
                        className="mt-2 h-12 w-full gap-2 rounded-xl text-base"
                        onClick={() => setWizardStep(2)}
                        disabled={!course.title.trim()}
                      >
                        Continue →
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 2 — details */}
                {wizardStep === 2 && (
                  <>
                    <h1 className="font-display text-2xl font-bold text-ink-900">
                      Course details
                    </h1>
                    <p className="mt-1 text-sm text-ink-500">
                      A little more setup to tailor your course page
                    </p>
                    <div className="mt-8 space-y-5 text-left">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label>Category</Label>
                          <Select
                            value={course.category}
                            onValueChange={(v) => update({ category: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "Business",
                                "Marketing",
                                "Technology",
                                "Design",
                                "Health",
                                "Finance",
                                "Personal Development",
                                "Other",
                              ].map((c) => (
                                <SelectItem key={c} value={c.toLowerCase()}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Level</Label>
                          <Select
                            value={course.level}
                            onValueChange={(v) => update({ level: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                              <SelectItem value="all-levels">All Levels</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Language</Label>
                          <Select
                            value={course.language}
                            onValueChange={(v) => update({ language: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "English",
                                "Spanish",
                                "French",
                                "Portuguese",
                                "German",
                                "Yoruba",
                                "Igbo",
                                "Hausa",
                              ].map((l) => (
                                <SelectItem key={l} value={l}>
                                  {l}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="course-desc">Description</Label>
                        <Textarea
                          id="course-desc"
                          value={course.description}
                          onChange={(e) => update({ description: e.target.value })}
                          placeholder="What will students learn in this course?"
                          className="min-h-[100px] resize-y"
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-ink-200 p-4">
                        <div>
                          <p className="text-sm font-semibold text-ink-900">Free Course</p>
                          <p className="text-xs text-ink-500">
                            Students can enroll without payment
                          </p>
                        </div>
                        <Switch
                          checked={course.isFree}
                          onCheckedChange={(v) => update({ isFree: v })}
                        />
                      </div>

                      {!course.isFree && (
                        <div className="space-y-1.5">
                          <Label htmlFor="course-price">Price (USD)</Label>
                          <Input
                            id="course-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={course.priceCents / 100}
                            onChange={(e) =>
                              update({
                                priceCents: Math.round(parseFloat(e.target.value) * 100) || 0,
                              })
                            }
                            placeholder="e.g. 97.00"
                            className="h-11"
                          />
                        </div>
                      )}

                      <div className="flex flex-col-reverse gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:justify-between">
                        <Button variant="outline" onClick={() => setWizardStep(1)}>
                          Back
                        </Button>
                        <Button className="gap-2 rounded-xl px-6" onClick={handleCreate}>
                          Create course <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ─── Workspace phase ───────────────────────────────────────────────────────

  return (
    <AppLayout>
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-[#14532d] via-[#16a34a] to-[#4ade80] text-white">
        <div className="mx-auto max-w-7xl px-5 pb-5 pt-4 sm:px-8">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setLocation("/online-courses")}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
                Draft
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 rounded-lg border border-white/30 bg-white/10 text-white hover:bg-white/20"
                disabled
                title="Coming soon"
              >
                <Eye className="h-3.5 w-3.5" /> Preview as Student
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">Soon</span>
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 rounded-lg border border-white/30 bg-white/15 text-white hover:bg-white/25"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </div>
          </div>

          <div>
            <h1
              className="text-xl font-bold leading-tight outline-none text-background"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => update({ title: e.currentTarget.textContent ?? course.title })}
            >
              {course.title}
            </h1>
            {/* subtitle placeholder */}
            <p
              className="mt-0.5 min-w-[1px] text-sm text-white/60 outline-none empty:before:text-white/40 empty:before:content-['Add_a_subtitle...']"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => update({ subtitle: e.currentTarget.textContent ?? "" })}
            >
              {course.subtitle}
            </p>
          </div>
        </div>
      </div>
      {/* Tab bar */}
      <div className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors",
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
      {/* Tab content */}
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">

        {/* ── Curriculum ─────────────────────────────────────────────────── */}
        {activeTab === "curriculum" && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="mb-6 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                <BookOpen className="h-3.5 w-3.5" /> {modules.length} Module{modules.length !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" /> {totalLessons} Lesson{totalLessons !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                <Clock className="h-3.5 w-3.5" /> 0m Total
              </span>
            </div>

            <div className="space-y-4">
              {modules.map((mod, i) => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  index={i}
                  total={modules.length}
                  onChange={(updated) => updateModule(mod.id, updated)}
                  onRemove={() => removeModule(mod.id)}
                  onMoveUp={() => moveModule(i, -1)}
                  onMoveDown={() => moveModule(i, 1)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addModule}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-300 py-5 text-sm font-medium text-ink-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
            >
              <Plus className="h-5 w-5" /> Add Module
            </button>

            {modules.length === 0 && (
              <p className="mt-4 text-center text-xs text-ink-400">
                Add your first module to start building the curriculum.
              </p>
            )}
          </div>
        )}

        {/* ── Info Page ───────────────────────────────────────────────────── */}
        {activeTab === "info" && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-2xl space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-ink-600">
                <FileText className="h-4 w-4" />
                This editor controls the <strong>Course Info Page</strong> at{" "}
                <code className="rounded bg-ink-200 px-1.5 py-0.5 text-xs">
                  /course/{course.slug || "your-course"}
                </code>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 opacity-50 cursor-not-allowed" disabled title="Preview coming soon">
                <Eye className="h-3.5 w-3.5" /> Preview
                <span className="ml-1 rounded-full bg-ink-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-500">Soon</span>
              </Button>
            </div>

            {salesGenerated && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                Sales copy was generated and pre-filled below. Review and refine it before publishing.
              </div>
            )}

            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-ink-900">Sales Headline</p>
                  <p className="text-xs text-ink-500">The main headline visitors see first (overrides course title)</p>
                </div>
              </div>
              <Input
                value={course.salesHeadline}
                onChange={(e) => update({ salesHeadline: e.target.value })}
                placeholder="e.g. Master the Art of Emergency Fundraising in 24 Hours"
              />
            </div>

            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <Play className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-ink-900">Promo Video</p>
                  <p className="text-xs text-ink-500">YouTube or Vimeo URL shown in the hero section</p>
                </div>
              </div>
              <Input
                value={course.promoVideo}
                onChange={(e) => update({ promoVideo: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-ink-900">Target Audience</p>
                  <p className="text-xs text-ink-500">Who is this course for? (helps with marketing)</p>
                </div>
              </div>
              <Textarea
                value={course.targetAudience}
                onChange={(e) => update({ targetAudience: e.target.value })}
                placeholder="e.g. Aspiring entrepreneurs who need quick capital..."
                className="min-h-[96px] resize-y"
              />
            </div>

            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">Learning Outcomes</p>
                    <p className="text-xs text-ink-500">Shown as checkmarks on the info page</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-1" onClick={addOutcome}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {course.learningOutcomes.map((outcome, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={outcome}
                      onChange={(e) => updateOutcome(i, e.target.value)}
                      placeholder={`e.g. How to ${i === 0 ? "get started with your first skill" : "master this topic"}`}
                    />
                    {course.learningOutcomes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOutcome(i)}
                        className="text-ink-400 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-ink-900">Course Description</p>
                  <p className="text-xs text-ink-500">The main body content of your info page.</p>
                </div>
              </div>
              <Textarea
                value={course.courseDescription}
                onChange={(e) => update({ courseDescription: e.target.value })}
                placeholder="Write a compelling course description..."
                className="min-h-[200px] resize-y"
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save info page
            </Button>
          </div>
        )}

        {/* ── Sales Page ──────────────────────────────────────────────────── */}
        {activeTab === "sales" && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-2xl">
            {/* Progress stepper */}
            <div className="mb-8 flex items-center gap-2">
              {[
                { n: 1, label: "Review Data" },
                { n: 2, label: "Answer Questions" },
                { n: 3, label: "Choose Template" },
              ].map(({ n, label }, i) => (
                <div key={n} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => n < salesStep && setSalesStep(n as 1 | 2 | 3)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                        n < salesStep
                          ? "bg-emerald-500 text-white"
                          : n === salesStep
                          ? "bg-brand-600 text-white"
                          : "bg-ink-200 text-ink-500",
                      )}
                    >
                      {n < salesStep ? <Check className="h-3.5 w-3.5" /> : n}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        n === salesStep ? "text-ink-900" : "text-ink-400",
                      )}
                    >
                      {label}
                    </span>
                  </button>
                  {i < 2 && (
                    <div
                      className={cn(
                        "h-0.5 w-12 rounded-full",
                        n < salesStep ? "bg-emerald-400" : "bg-ink-200",
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1 – Review data */}
            {salesStep === 1 && (
              <>
                <div className="mb-6 text-center">
                  <h2 className="font-display text-2xl font-bold text-ink-900">
                    We found your course data
                  </h2>
                  <p className="mt-1 text-sm text-ink-500">
                    Here's what we'll use to generate your sales page
                  </p>
                </div>
                <Card className="border-ink-200 shadow-sm">
                  <CardContent className="divide-y divide-ink-100 p-0">
                    {[
                      { label: "Course Title", value: course.title, found: !!course.title },
                      { label: "Subtitle", value: course.subtitle, found: !!course.subtitle },
                      { label: "Description", value: course.description, found: !!course.description },
                      { label: "Modules", value: `${modules.length} modules`, found: modules.length > 0 },
                      { label: "Lessons", value: `${totalLessons} lessons`, found: totalLessons > 0 },
                      { label: "Duration", value: "0h 0m", found: false },
                      { label: "Cover Image", value: "", found: false },
                      { label: "Promo Video", value: course.promoVideo, found: !!course.promoVideo },
                      { label: "Certificate", value: course.certificateEnabled ? "Enabled" : "Disabled", found: course.certificateEnabled },
                      {
                        label: "Pricing",
                        value: course.isFree ? "Free" : `$${(course.priceCents / 100).toFixed(2)}`,
                        found: true,
                      },
                      { label: "Creator Profile", value: "You", found: true },
                    ].map(({ label, value, found }) => (
                      <div key={label} className="flex items-center justify-between px-5 py-3 text-sm">
                        <span className="text-ink-700">{label}</span>
                        <div className="flex items-center gap-2">
                          {found && value && <span className="text-ink-500">{value}</span>}
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              found
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-orange-50 text-orange-600",
                            )}
                          >
                            {found ? "Found" : "We'll ask"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setActiveTab("curriculum")}>
                    Cancel
                  </Button>
                  <Button onClick={() => setSalesStep(2)} className="gap-2">
                    Continue <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 2 – Answer questions */}
            {salesStep === 2 && (
              <>
                <div className="mb-6 text-center">
                  <h2 className="font-display text-2xl font-bold text-ink-900">
                    Tell us about your course
                  </h2>
                  <p className="mt-1 text-sm text-ink-500">
                    Answer these questions to generate the perfect sales copy
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <Label>
                      Who is this course for? <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      value={salesWho}
                      onChange={(e) => setSalesWho(e.target.value)}
                      className="min-h-[72px] resize-y"
                      placeholder="e.g. New business owners who struggle with marketing"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      What transformation will students experience? <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      value={salesTransformation}
                      onChange={(e) => setSalesTransformation(e.target.value)}
                      className="min-h-[72px] resize-y"
                      placeholder="e.g. Go from confused to confidently launching their first product"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Top 3–5 frustrations your ideal student faces?{" "}
                      <span className="font-normal text-ink-400">(optional)</span>
                    </Label>
                    <Textarea
                      value={salesFrustrations}
                      onChange={(e) => setSalesFrustrations(e.target.value)}
                      className="min-h-[72px] resize-y"
                      placeholder="e.g. Feeling overwhelmed by information, not knowing where to start"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      What tone should the sales page have? <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { id: "warm", label: "Warm & Conversational", desc: "Like talking to a friend" },
                        { id: "professional", label: "Professional & Authoritative", desc: "Expert positioning" },
                        { id: "high-energy", label: "High Energy & Motivational", desc: "Coach/speaker vibe" },
                        { id: "calm", label: "Calm & Reassuring", desc: "Gentle, no-pressure" },
                        { id: "bold", label: "Bold & Direct", desc: "No fluff, straight to the point" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSalesTone(t.id)}
                          className={cn(
                            "rounded-xl border p-3 text-left text-sm transition",
                            salesTone === t.id
                              ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200"
                              : "border-ink-200 hover:border-brand-200",
                          )}
                        >
                          <p className="font-semibold text-ink-900">{t.label}</p>
                          <p className="mt-0.5 text-xs text-ink-500">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      What makes your approach unique?{" "}
                      <span className="font-normal text-ink-400">(optional)</span>
                    </Label>
                    <Textarea
                      className="min-h-[64px] resize-y"
                      placeholder="e.g. The 'Client Magnet Method' — a 5-step system I developed…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Bonuses included with the course{" "}
                      <span className="font-normal text-ink-400">(optional)</span>
                    </Label>
                    <Textarea
                      className="min-h-[64px] resize-y"
                      placeholder="e.g. Bonus 1: Proposal template pack ($197 value)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Money-back guarantee?{" "}
                      <span className="font-normal text-ink-400">(optional)</span>
                    </Label>
                    <Input placeholder="e.g. 30-day no-questions-asked money-back guarantee" />
                  </div>
                </div>
                <div className="mt-8 flex justify-between">
                  <Button variant="outline" onClick={() => setSalesStep(1)}>
                    ← Back
                  </Button>
                  <Button
                    onClick={() => setSalesStep(3)}
                    className="gap-2"
                    disabled={!salesWho.trim() || !salesTransformation.trim()}
                  >
                    Continue <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 3 – Choose template */}
            {salesStep === 3 && (
              <>
                <div className="mb-6 text-center">
                  <h2 className="font-display text-2xl font-bold text-ink-900">Choose a template</h2>
                  <p className="mt-1 text-sm text-ink-500">
                    Pick a visual style for your sales page. You can change it later.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {SALES_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSalesTemplate(tmpl.id)}
                      className={cn(
                        "relative overflow-hidden rounded-xl border p-0 text-left transition",
                        salesTemplate === tmpl.id
                          ? "ring-2 ring-brand-500"
                          : "border-ink-200 hover:border-brand-200",
                      )}
                    >
                      <div
                        className="flex h-28 w-full items-center justify-center"
                        style={{ background: tmpl.bg }}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className="h-2 w-24 rounded-full opacity-60"
                            style={{ background: tmpl.accent }}
                          />
                          <div
                            className="h-1.5 w-16 rounded-full opacity-40"
                            style={{ background: tmpl.accent }}
                          />
                        </div>
                      </div>
                      {salesTemplate === tmpl.id && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <div className="p-3">
                        <p className="font-semibold text-ink-900">{tmpl.label}</p>
                        <p className="mt-0.5 text-xs text-ink-500">{tmpl.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex justify-between">
                  <Button variant="outline" onClick={() => setSalesStep(2)}>
                    ← Back
                  </Button>
                  <Button className="gap-2 bg-brand-600 hover:bg-brand-700" onClick={handleGenerateSales}>
                    <Sparkles className="h-4 w-4" /> Generate Sales Copy
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Settings ────────────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-2xl space-y-6">
            {/* Share & Links */}
            <Card className="border-ink-200 shadow-sm">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">Share &amp; Links</p>
                    <p className="text-xs text-ink-500">Copy your course links to share everywhere</p>
                  </div>
                </div>
                {[
                  {
                    label: "Course Info Page",
                    desc: "Basic course overview with curriculum and pricing",
                    value: `https://pokipoki.app/course/${course.slug}`,
                  },
                  {
                    label: "AI Sales Page",
                    desc: "High-converting landing page (requires Sales tab setup)",
                    value: `https://pokipoki.app/course/${course.slug}/sales`,
                  },
                  {
                    label: "Student Portal",
                    desc: "Where enrolled students access lessons",
                    value: "https://pokipoki.app/learn",
                  },
                ].map((link) => (
                  <div key={link.label}>
                    <p className="mb-1 text-xs font-semibold text-ink-700">{link.label}</p>
                    <p className="mb-1.5 text-[11px] text-ink-400">{link.desc}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600">
                        {link.value}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(link.value).catch(() => {});
                          toast({ title: "Copied!" });
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-xl border border-ink-200 p-4">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Show on Link in Bio</p>
                    <p className="text-xs text-ink-500">Display this course on your bio page</p>
                  </div>
                  <Switch
                    checked={course.showOnBio}
                    onCheckedChange={(v) => update({ showOnBio: v })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Course Details */}
            <Card className="border-ink-200 shadow-sm">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Settings className="h-4 w-4" />
                  </span>
                  <p className="font-semibold text-ink-900">Course Details</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Course Title</Label>
                  <Input value={course.title} onChange={(e) => update({ title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtitle</Label>
                  <Input
                    value={course.subtitle}
                    onChange={(e) => update({ subtitle: e.target.value })}
                    placeholder="A brief tagline for your course"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={course.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="What will students learn in this course?"
                    className="min-h-[100px] resize-y"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Welcome Message</Label>
                  <Textarea
                    value={course.welcomeMessage}
                    onChange={(e) => update({ welcomeMessage: e.target.value })}
                    placeholder="Shown to students after enrollment"
                    className="min-h-[80px] resize-y"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>URL Slug</Label>
                  <Input
                    value={course.slug}
                    onChange={(e) => update({ slug: e.target.value })}
                  />
                  <p className="text-xs text-ink-400">
                    Used in the sales page URL: /course/{course.slug}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Classification */}
            <Card className="border-ink-200 shadow-sm">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <p className="font-semibold text-ink-900">Classification</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={course.category} onValueChange={(v) => update({ category: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {["Business", "Marketing", "Technology", "Design", "Health", "Finance", "Personal Development", "Other"].map((c) => (
                          <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Level</Label>
                    <Select value={course.level} onValueChange={(v) => update({ level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="all-levels">All Levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Language</Label>
                    <Select value={course.language} onValueChange={(v) => update({ language: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["English", "Spanish", "French", "Portuguese", "German", "Yoruba", "Igbo", "Hausa"].map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="border-ink-200 shadow-sm">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-sm">$</span>
                  <p className="font-semibold text-ink-900">Pricing</p>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-ink-200 p-4">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Free Course</p>
                    <p className="text-xs text-ink-500">Students can enroll without payment</p>
                  </div>
                  <Switch checked={course.isFree} onCheckedChange={(v) => update({ isFree: v })} />
                </div>
                {!course.isFree && (
                  <div className="space-y-1.5">
                    <Label>Price (USD)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={course.priceCents / 100}
                      onChange={(e) => update({ priceCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                      placeholder="e.g. 97.00"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cover Image */}
            <Card className="border-ink-200 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                  <p className="font-semibold text-ink-900">Cover Image</p>
                </div>
                <div className="flex h-36 cursor-not-allowed items-center justify-center rounded-xl border-2 border-dashed border-ink-200 text-center bg-ink-50/60 select-none">
                  <div>
                    <ImageIcon className="mx-auto h-6 w-6 text-ink-300" />
                    <p className="mt-2 text-sm font-medium text-ink-400">Upload cover image</p>
                    <p className="text-xs text-ink-300">Coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save settings
            </Button>
          </div>
        )}

        {/* ── Students ────────────────────────────────────────────────────── */}
        {activeTab === "students" && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Enrolled", value: students.length, icon: Users, color: "bg-brand-100 text-brand-700" },
                { label: "Completed", value: students.filter((s) => s.completed).length, icon: GraduationCap, color: "bg-emerald-100 text-emerald-700" },
                {
                  label: "Completion Rate",
                  value:
                    students.length > 0
                      ? `${Math.round((students.filter((s) => s.completed).length / students.length) * 100)}%`
                      : "0%",
                  icon: TrendingUp,
                  color: "bg-orange-100 text-orange-700",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border-ink-200 shadow-sm">
                    <CardContent className="flex flex-col items-center py-6">
                      <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl", stat.color)}>
                        <Icon className="h-6 w-6" />
                      </span>
                      <p className="mt-3 font-display text-3xl font-bold text-ink-900">{stat.value}</p>
                      <p className="mt-1 text-xs font-medium text-ink-500">{stat.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Add student form */}
            {addStudentOpen ? (
              <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-ink-900">Add Student</p>
                  <button
                    type="button"
                    onClick={() => { setAddStudentOpen(false); setNewStudentEmail(""); setNewStudentName(""); }}
                    className="text-ink-400 hover:text-ink-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mb-3 text-xs text-ink-500">
                  Manually enroll a student by email. Login provisioning and notifications are coming soon.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="email"
                    placeholder="student@example.com"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddStudent(); }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Name (optional)"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddStudent(); }}
                    className="flex-1"
                  />
                  <Button className="gap-1.5 shrink-0" onClick={handleAddStudent}>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddStudentOpen(true)}
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 py-3 text-sm font-medium text-ink-500 transition hover:border-brand-400 hover:text-brand-600"
              >
                <UserPlus className="h-4 w-4" /> Add Student
              </button>
            )}

            {/* Student list */}
            {students.length === 0 ? (
              <Card className="border-dashed border-ink-300">
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
                    <Users className="h-7 w-7 text-brand-300" />
                  </span>
                  <p className="mt-4 font-semibold text-ink-700">No students yet</p>
                  <p className="mt-1 text-sm text-ink-400">
                    Add manually above or they'll appear after purchasing.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-hidden rounded-xl border border-ink-200">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Enrolled</th>
                      <th className="px-4 py-3 text-left">Progress</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 bg-white">
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink-900">{s.name || s.email}</p>
                          {s.name && <p className="text-xs text-ink-400">{s.email}</p>}
                        </td>
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
              </div>
            )}
          </div>
        )}

        {/* ── Certificate ──────────────────────────────────────────────────── */}
        {activeTab === "certificate" && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-3xl">
            <div className="mb-6 flex items-center justify-between rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Award className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-ink-900">Completion Certificate</p>
                  <p className="text-xs text-ink-500">
                    Auto-generated when students finish all lessons
                  </p>
                </div>
              </div>
              <Switch
                checked={course.certificateEnabled}
                onCheckedChange={(v) => update({ certificateEnabled: v })}
              />
            </div>

            {course.certificateEnabled && (
              <>
                <div className="mb-6">
                  <p className="mb-3 text-sm font-semibold text-ink-700">Choose a Template</p>
                  <div className="grid grid-cols-5 gap-3">
                    {CERT_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() =>
                          update({ certTemplate: tmpl.id, certBgColor: tmpl.bg, certAccentColor: tmpl.accent })
                        }
                        className={cn(
                          "relative overflow-hidden rounded-xl border p-0 transition",
                          course.certTemplate === tmpl.id
                            ? "ring-2 ring-brand-500 border-brand-500"
                            : "border-ink-200 hover:border-brand-200",
                        )}
                      >
                        <div className="flex h-14 w-full flex-col items-center justify-center gap-1" style={{ background: tmpl.bg }}>
                          <div className="h-1 w-10 rounded-full opacity-70" style={{ background: tmpl.accent }} />
                          <div className="text-[6px] font-bold uppercase tracking-widest opacity-60" style={{ color: tmpl.accent }}>
                            CERT
                          </div>
                          <div className="h-0.5 w-6 rounded-full opacity-50" style={{ background: tmpl.accent }} />
                        </div>
                        {course.certTemplate === tmpl.id && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                        <p className="px-1 py-1.5 text-center text-[9px] font-medium text-ink-600">
                          {tmpl.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Background Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={course.certBgColor}
                        onChange={(e) => update({ certBgColor: e.target.value })}
                        className="h-9 w-10 cursor-pointer rounded border border-ink-200 p-0.5"
                      />
                      <Input
                        value={course.certBgColor}
                        onChange={(e) => update({ certBgColor: e.target.value })}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={course.certAccentColor}
                        onChange={(e) => update({ certAccentColor: e.target.value })}
                        className="h-9 w-10 cursor-pointer rounded border border-ink-200 p-0.5"
                      />
                      <Input
                        value={course.certAccentColor}
                        onChange={(e) => update({ certAccentColor: e.target.value })}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Logo (Optional)</Label>
                    <div className="flex h-10 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-200 text-xs text-ink-400 bg-ink-50/60 select-none">
                      <ImageIcon className="h-3.5 w-3.5" /> Upload logo
                      <span className="ml-1 rounded-full bg-ink-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-500">Soon</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Issuer / Organization Name</Label>
                    <Input
                      value={course.certOrg}
                      onChange={(e) => update({ certOrg: e.target.value })}
                      placeholder="e.g. Acme Academy"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Signature Line</Label>
                    <Input
                      value={course.certSignature}
                      onChange={(e) => update({ certSignature: e.target.value })}
                      placeholder="e.g. John Doe, CEO"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
                      <Label className="cursor-pointer">Show Date</Label>
                      <Switch
                        checked={course.certShowDate}
                        onCheckedChange={(v) => update({ certShowDate: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
                      <Label className="cursor-pointer">Show PokiPoki Branding</Label>
                      <Switch
                        checked={course.certShowBranding}
                        onCheckedChange={(v) => update({ certShowBranding: v })}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="mb-3 text-sm font-semibold text-ink-700">Preview</p>
                  <CertPreview
                    certBgColor={course.certBgColor}
                    certAccentColor={course.certAccentColor}
                    certShowDate={course.certShowDate}
                    certShowBranding={course.certShowBranding}
                    certSignature={course.certSignature}
                    courseTitle={course.title}
                  />
                </div>
              </>
            )}

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save certificate settings
            </Button>
          </div>
        )}

        {/* ── Analytics ───────────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              {[
                { label: "Enrolled", value: students.length, icon: Users, color: "bg-brand-100 text-brand-700" },
                { label: "Active", value: students.filter((s) => !s.completed && s.progress > 0).length, icon: TrendingUp, color: "bg-blue-100 text-blue-700" },
                { label: "Completed", value: students.filter((s) => s.completed).length, icon: GraduationCap, color: "bg-emerald-100 text-emerald-700" },
                {
                  label: "Avg Progress",
                  value:
                    students.length > 0
                      ? `${Math.round(students.reduce((s, st) => s + st.progress, 0) / students.length)}%`
                      : "0%",
                  icon: BarChart3,
                  color: "bg-orange-100 text-orange-700",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border-ink-200 shadow-sm">
                    <CardContent className="flex flex-col items-center py-7">
                      <span className={cn("flex h-14 w-14 items-center justify-center rounded-xl", stat.color)}>
                        <Icon className="h-7 w-7" />
                      </span>
                      <p className="mt-3 font-display text-3xl font-bold text-ink-900">{stat.value}</p>
                      <p className="mt-1 text-xs font-medium text-ink-500">{stat.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-ink-200 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-brand-600" />
                    <p className="font-semibold text-ink-900">Completion Rate</p>
                  </div>
                  <span className="font-display text-lg font-bold text-brand-700">
                    {students.length > 0
                      ? `${Math.round((students.filter((s) => s.completed).length / students.length) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all"
                    style={{
                      width:
                        students.length > 0
                          ? `${(students.filter((s) => s.completed).length / students.length) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                {students.length === 0 && (
                  <p className="mt-3 text-center text-sm text-ink-400">
                    Enroll your first students to see analytics here.
                  </p>
                )}
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-ink-400">Analytics update every 24 hours.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
