import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetAdminModules,
  getGetAdminModulesQueryKey,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  type LearnModule,
  type Lesson,
  type ModuleInputStage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Video,
  Eye,
  EyeOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

type StageKey = "create" | "validate" | "sell_scale";

const STAGES: { key: StageKey; label: string; description: string; color: string; badge: string }[] = [
  {
    key: "create",
    label: "Create",
    description: "Day 1 — Ship your first review-ready product.",
    color: "border-brand-300 bg-brand-50",
    badge: "bg-brand-100 text-brand-700",
  },
  {
    key: "validate",
    label: "Validate",
    description: "Day 2–8 — Get real feedback and land your first approval.",
    color: "border-gold-300 bg-gold-50",
    badge: "bg-gold-100 text-gold-700",
  },
  {
    key: "sell_scale",
    label: "Sell & Scale",
    description: "Day 9–30 — Turn approved products into repeatable sales.",
    color: "border-lime-300 bg-lime-50",
    badge: "bg-lime-100 text-lime-700",
  },
];


// ── Module form state ────────────────────────────────────────────────────────
interface ModuleFormState {
  title: string;
  description: string;
  stage: StageKey;
  orderIndex: string;
  isPublished: boolean;
}

const defaultModuleForm = (): ModuleFormState => ({
  title: "",
  description: "",
  stage: "create",
  orderIndex: "0",
  isPublished: true,
});

// ── Lesson form state ────────────────────────────────────────────────────────
interface LessonFormState {
  title: string;
  description: string;
  bodyMd: string;
  videoProvider: string;
  videoUrl: string;
  durationSeconds: string;
  orderIndex: string;
  isRequiredForOnboarding: boolean;
  allowManualComplete: boolean;
  isPublished: boolean;
}

const defaultLessonForm = (): LessonFormState => ({
  title: "",
  description: "",
  bodyMd: "",
  videoProvider: "",
  videoUrl: "",
  durationSeconds: "0",
  orderIndex: "0",
  isRequiredForOnboarding: true,
  allowManualComplete: true,
  isPublished: true,
});

// ── Small helper ─────────────────────────────────────────────────────────────
function lessonFormFromLesson(l: Lesson): LessonFormState {
  return {
    title: l.title,
    description: l.description ?? "",
    bodyMd: l.bodyMd ?? "",
    videoProvider: l.videoProvider ?? "",
    videoUrl: l.videoUrl ?? "",
    durationSeconds: String(l.durationSeconds ?? 0),
    orderIndex: String(l.orderIndex ?? 0),
    isRequiredForOnboarding: l.isRequiredForOnboarding ?? true,
    allowManualComplete: l.allowManualComplete ?? true,
    isPublished: l.isPublished ?? true,
  };
}

// ── Module row ───────────────────────────────────────────────────────────────
function ModuleRow({
  module,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}: {
  module: LearnModule;
  onEdit: (m: LearnModule) => void;
  onDelete: (id: string) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (l: Lesson, moduleId: string) => void;
  onDeleteLesson: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white border border-ink-200 rounded-xl overflow-hidden">
      {/* Module header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-ink-400 hover:text-ink-700 transition-colors flex-shrink-0"
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-ink-900 truncate">{module.title}</span>
            {!module.isPublished && (
              <Badge variant="secondary" className="text-[11px] bg-ink-100 text-ink-500 flex items-center gap-1">
                <EyeOff className="w-3 h-3" /> Draft
              </Badge>
            )}
          </div>
          {module.description && (
            <p className="text-sm text-ink-500 truncate mt-0.5">{module.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
          <span className="text-xs text-ink-400">{module.lessons.length} lessons</span>
          <button
            type="button"
            onClick={() => onAddLesson(module.id)}
            className="p-1.5 rounded-lg text-ink-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Add lesson"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(module)}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-50 transition-colors"
            title="Edit module"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(module.id)}
            className="p-1.5 rounded-lg text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete module"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lessons list */}
      {open && (
        <div className="border-t border-ink-100">
          {module.lessons.length === 0 ? (
            <div className="px-6 py-4 text-sm text-ink-400 italic">
              No lessons yet.{" "}
              <button
                type="button"
                onClick={() => onAddLesson(module.id)}
                className="text-brand-600 hover:underline"
              >
                Add the first lesson
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-ink-50">
              {module.lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-center gap-3 px-6 py-3 hover:bg-ink-50/60">
                  <div className="w-7 h-7 rounded-lg bg-ink-100 flex items-center justify-center flex-shrink-0">
                    {lesson.videoUrl ? (
                      <Video className="w-3.5 h-3.5 text-ink-500" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 text-ink-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-ink-800 truncate block">{lesson.title}</span>
                    {lesson.description && (
                      <span className="text-xs text-ink-400 truncate block">{lesson.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                    {!lesson.isPublished && (
                      <EyeOff className="w-3.5 h-3.5 text-ink-300" />
                    )}
                    {lesson.isRequiredForOnboarding && (
                      <Badge variant="secondary" className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5">
                        Required
                      </Badge>
                    )}
                    {lesson.durationSeconds ? (
                      <span className="text-xs text-ink-400">{Math.ceil(lesson.durationSeconds / 60)}m</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onEditLesson(lesson, module.id)}
                      className="p-1 rounded text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteLesson(lesson.id)}
                      className="p-1 rounded text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Lesson dialog ─────────────────────────────────────────────────────────────
function LessonDialog({
  open,
  editTarget,
  moduleId,
  onClose,
  onSaved,
}: {
  open: boolean;
  editTarget: Lesson | null;
  moduleId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!editTarget;
  const [form, setForm] = useState<LessonFormState>(defaultLessonForm);
  const [error, setError] = useState<string | null>(null);

  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();

  // Sync form state whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(editTarget ? lessonFormFromLesson(editTarget) : defaultLessonForm());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saving = createLesson.isPending || updateLesson.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit && editTarget) {
        await updateLesson.mutateAsync({
          lessonId: editTarget.id,
          data: {
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            bodyMd: form.bodyMd.trim() || undefined,
            videoProvider: form.videoProvider.trim() || undefined,
            videoUrl: form.videoUrl.trim() || undefined,
            durationSeconds: parseInt(form.durationSeconds, 10) || 0,
            orderIndex: parseInt(form.orderIndex, 10) || 0,
            isRequiredForOnboarding: form.isRequiredForOnboarding,
            allowManualComplete: form.allowManualComplete,
            isPublished: form.isPublished,
          },
        });
      } else if (moduleId) {
        await createLesson.mutateAsync({
          data: {
            moduleId,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            bodyMd: form.bodyMd.trim() || undefined,
            videoProvider: form.videoProvider.trim() || undefined,
            videoUrl: form.videoUrl.trim() || undefined,
            durationSeconds: parseInt(form.durationSeconds, 10) || 0,
            orderIndex: parseInt(form.orderIndex, 10) || 0,
            isRequiredForOnboarding: form.isRequiredForOnboarding,
            allowManualComplete: form.allowManualComplete,
            isPublished: form.isPublished,
          },
        });
      }
      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lesson" : "New Lesson"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-700">Title *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Introduction to the studio"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-700">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short teaser shown in the lesson list"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-700">Video provider</label>
              <Input
                value={form.videoProvider}
                onChange={(e) => setForm((f) => ({ ...f, videoProvider: e.target.value }))}
                placeholder="youtube / vimeo"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-700">Duration (seconds)</label>
              <Input
                type="number"
                min={0}
                value={form.durationSeconds}
                onChange={(e) => setForm((f) => ({ ...f, durationSeconds: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-700">Video URL</label>
            <Input
              value={form.videoUrl}
              onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              placeholder="https://…"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-700">Body (Markdown)</label>
            <Textarea
              value={form.bodyMd}
              onChange={(e) => setForm((f) => ({ ...f, bodyMd: e.target.value }))}
              placeholder="Optional lesson body in Markdown"
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-700">Order</label>
              <Input
                type="number"
                min={0}
                value={form.orderIndex}
                onChange={(e) => setForm((f) => ({ ...f, orderIndex: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-700">Visibility</label>
              <Select
                value={form.isPublished ? "published" : "draft"}
                onValueChange={(v) => setForm((f) => ({ ...f, isPublished: v === "published" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-700">Required</label>
              <Select
                value={form.isRequiredForOnboarding ? "yes" : "no"}
                onValueChange={(v) => setForm((f) => ({ ...f, isRequiredForOnboarding: v === "yes" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create lesson"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────
function DeleteDialog({
  open,
  label,
  onCancel,
  onConfirm,
  pending,
}: {
  open: boolean;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ink-500">This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminCurriculum() {
  const queryClient = useQueryClient();
  const { data: modules = [], isLoading } = useGetAdminModules();

  const deleteModule = useDeleteModule();
  const deleteLesson = useDeleteLesson();

  // Module dialog
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<LearnModule | null>(null);

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);

  // Delete dialogs
  const [deleteTarget, setDeleteTarget] = useState<{ type: "module" | "lesson"; id: string; label: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetAdminModulesQueryKey() });

  // Stage-grouped modules
  const byStage = (key: StageKey) => modules.filter((m) => (m.stage as StageKey) === key);

  // Track which stage to pre-fill when opening the "new module" dialog from a stage section
  const pendingStageRef = useRef<StageKey | undefined>(undefined);

  const openNewModule = (stage?: StageKey) => {
    pendingStageRef.current = stage;
    setEditingModule(null);
    setModuleDialogOpen(true);
  };

  const handleModuleSaved = () => {
    setModuleDialogOpen(false);
    setEditingModule(null);
    pendingStageRef.current = undefined;
    refresh();
  };

  const handleLessonSaved = () => {
    setLessonDialogOpen(false);
    setEditingLesson(null);
    setLessonModuleId(null);
    refresh();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      if (deleteTarget.type === "module") {
        await deleteModule.mutateAsync({ moduleId: deleteTarget.id });
      } else {
        await deleteLesson.mutateAsync({ lessonId: deleteTarget.id });
      }
      setDeleteTarget(null);
      refresh();
    } catch {
      setDeleteError("Delete failed. Please try again.");
    }
  };

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-sm font-semibold mb-3 border border-brand-200">
              <GraduationCap className="w-4 h-4" />
              Curriculum Admin
            </div>
            <h1 className="text-3xl font-display font-bold text-ink-900">Learn Curriculum</h1>
            <p className="text-ink-500 mt-1">
              {isLoading
                ? "Loading…"
                : `${modules.length} module${modules.length !== 1 ? "s" : ""} · ${totalLessons} lesson${totalLessons !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button onClick={() => openNewModule()} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New module
          </Button>
        </div>

        {/* Stages */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="h-8 bg-ink-100 rounded-lg w-40" />
                <div className="h-16 bg-ink-50 rounded-xl" />
                <div className="h-16 bg-ink-50 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {STAGES.map((stage) => {
              const stageModules = byStage(stage.key);
              return (
                <section key={stage.key}>
                  {/* Stage header */}
                  <div className={cn("flex items-center justify-between rounded-xl border px-5 py-4 mb-4", stage.color)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-display font-bold text-ink-900">{stage.label}</h2>
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", stage.badge)}>
                          {stageModules.length} module{stageModules.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-sm text-ink-500 mt-0.5">{stage.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5 bg-white"
                      onClick={() => openNewModule(stage.key)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add module
                    </Button>
                  </div>

                  {/* Modules */}
                  {stageModules.length === 0 ? (
                    <div className="bg-ink-50 border border-dashed border-ink-200 rounded-xl px-6 py-8 text-center text-sm text-ink-400">
                      No modules in this stage yet.{" "}
                      <button
                        type="button"
                        className="text-brand-600 hover:underline"
                        onClick={() => openNewModule(stage.key)}
                      >
                        Add the first module
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stageModules.map((mod) => (
                        <ModuleRow
                          key={mod.id}
                          module={mod}
                          onEdit={(m) => {
                            setEditingModule(m);
                            setModuleDialogOpen(true);
                          }}
                          onDelete={(id) =>
                            setDeleteTarget({ type: "module", id, label: "module" })
                          }
                          onAddLesson={(mid) => {
                            setEditingLesson(null);
                            setLessonModuleId(mid);
                            setLessonDialogOpen(true);
                          }}
                          onEditLesson={(l, mid) => {
                            setEditingLesson(l);
                            setLessonModuleId(mid);
                            setLessonDialogOpen(true);
                          }}
                          onDeleteLesson={(id) =>
                            setDeleteTarget({ type: "lesson", id, label: "lesson" })
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Module dialog */}
      <ModuleDialogWithStage
        open={moduleDialogOpen}
        editTarget={editingModule}
        pendingStage={pendingStageRef.current}
        onClose={() => {
          setModuleDialogOpen(false);
          setEditingModule(null);
          pendingStageRef.current = undefined;
        }}
        onSaved={handleModuleSaved}
      />

      {/* Lesson dialog */}
      <LessonDialog
        open={lessonDialogOpen}
        editTarget={editingLesson}
        moduleId={lessonModuleId}
        onClose={() => {
          setLessonDialogOpen(false);
          setEditingLesson(null);
          setLessonModuleId(null);
        }}
        onSaved={handleLessonSaved}
      />

      {/* Delete confirm */}
      <DeleteDialog
        open={!!deleteTarget}
        label={deleteTarget?.label ?? "item"}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        pending={deleteModule.isPending || deleteLesson.isPending}
      />
      {deleteError && (
        <p className="fixed bottom-4 right-4 bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm shadow">
          {deleteError}
        </p>
      )}
    </AppLayout>
  );
}

// ── ModuleDialog wrapper that accepts a pendingStage prop ────────────────────
function ModuleDialogWithStage({
  open,
  editTarget,
  pendingStage,
  onClose,
  onSaved,
}: {
  open: boolean;
  editTarget: LearnModule | null;
  pendingStage?: StageKey;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!editTarget;
  const [form, setForm] = useState<ModuleFormState>(defaultModuleForm);
  const [error, setError] = useState<string | null>(null);

  const createModule = useCreateModule();
  const updateModule = useUpdateModule();

  // Sync form state whenever the dialog opens (open flips true)
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editTarget) {
      setForm({
        title: editTarget.title,
        description: editTarget.description ?? "",
        stage: editTarget.stage as StageKey,
        orderIndex: String(editTarget.orderIndex ?? 0),
        isPublished: editTarget.isPublished,
      });
    } else {
      setForm({ ...defaultModuleForm(), stage: pendingStage ?? "create" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saving = createModule.isPending || updateModule.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      stage: form.stage as ModuleInputStage,
      orderIndex: parseInt(form.orderIndex, 10) || 0,
      isPublished: form.isPublished,
    };
    try {
      if (isEdit && editTarget) {
        await updateModule.mutateAsync({ moduleId: editTarget.id, data: payload });
      } else {
        await createModule.mutateAsync({ data: payload });
      }
      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Module" : "New Module"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-700">Title *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Getting started"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-700">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional short description shown on the Academy page"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-700">Stage *</label>
            <Select
              value={form.stage}
              onValueChange={(v) => setForm((f) => ({ ...f, stage: v as StageKey }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-700">Order index</label>
              <Input
                type="number"
                min={0}
                value={form.orderIndex}
                onChange={(e) => setForm((f) => ({ ...f, orderIndex: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-700">Visibility</label>
              <Select
                value={form.isPublished ? "published" : "draft"}
                onValueChange={(v) => setForm((f) => ({ ...f, isPublished: v === "published" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Published
                    </span>
                  </SelectItem>
                  <SelectItem value="draft">
                    <span className="flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5" /> Draft
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create module"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
