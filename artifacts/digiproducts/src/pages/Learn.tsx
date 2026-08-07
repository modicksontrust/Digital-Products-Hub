import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useGetLearnModules, type LearnModule } from "@workspace/api-client-react";
import { GraduationCap, PlayCircle, FileText, CheckCircle2, Lock, Check } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";

type StageKey = "create" | "validate" | "sell_scale";

const STAGES: { key: StageKey; dayRange: string; title: string; fallbackDescription: string }[] = [
  {
    key: "create",
    dayRange: "DAY 1",
    title: "Create",
    fallbackDescription: "Learn the studio and ship your first review-ready product.",
  },
  {
    key: "validate",
    dayRange: "DAY 2-8",
    title: "Validate",
    fallbackDescription: "Get real feedback and land your first approval, before you scale.",
  },
  {
    key: "sell_scale",
    dayRange: "DAY 9-30",
    title: "Sell & Scale",
    fallbackDescription: "Turn approved products into repeatable, profitable sales.",
  },
];

/** Builds a short summary from the actual published modules in a stage, so this
 *  page always reflects the real curriculum instead of generic static copy. */
function describeStage(modules: LearnModule[], fallback: string): string {
  if (modules.length === 0) return fallback;
  const titles = modules.map((m) => m.title);
  if (titles.length === 1) return modules[0].description || titles[0];
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}.`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}.`;
}

function stageOf(mod: LearnModule): StageKey {
  return (mod.stage as StageKey) ?? "create";
}

export default function Learn() {
  const { data: modules, isLoading } = useGetLearnModules();

  const stageStats = useMemo(() => {
    const map = new Map<StageKey, { total: number; completed: number; modules: LearnModule[] }>();
    for (const stage of STAGES) map.set(stage.key, { total: 0, completed: 0, modules: [] });
    for (const mod of modules ?? []) {
      const entry = map.get(stageOf(mod)) ?? map.get("create")!;
      entry.modules.push(mod);
      for (const lesson of mod.lessons) {
        entry.total += 1;
        if (lesson.progress?.status === "completed") entry.completed += 1;
      }
    }
    return map;
  }, [modules]);

  const currentStageKey = useMemo<StageKey>(() => {
    for (const stage of STAGES) {
      const stats = stageStats.get(stage.key)!;
      if (stats.total > 0 && stats.completed < stats.total) return stage.key;
    }
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if ((stageStats.get(STAGES[i].key)?.total ?? 0) > 0) return STAGES[i].key;
    }
    return STAGES[0].key;
  }, [stageStats]);

  const [selectedStage, setSelectedStage] = useState<StageKey>("create");
  useEffect(() => {
    setSelectedStage(currentStageKey);
  }, [currentStageKey]);

  const activeStage = STAGES.find((s) => s.key === selectedStage) ?? STAGES[0];
  const activeModules = stageStats.get(selectedStage)?.modules ?? [];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto w-full p-8">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-sm font-semibold mb-4 border border-brand-200">
            <GraduationCap className="w-4 h-4" />
            Platform Academy
          </div>
          <h1 className="text-4xl font-display font-bold text-ink-900 mb-4">
            Your 30-Day Path to Your First Sale
          </h1>
          <p className="text-lg text-ink-600 max-w-2xl leading-relaxed">
            The Academy follows one journey: Create your first product, Validate it with a real
            sale, then Sell &amp; Scale. Complete each stage's lessons to unlock the next.
          </p>
        </div>

        {/* Stage tracker */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {STAGES.map((stage) => {
            const stats = stageStats.get(stage.key)!;
            const isCurrent = stage.key === currentStageKey;
            const isComplete = stats.total > 0 && stats.completed >= stats.total;
            const isSelected = stage.key === selectedStage;

            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => setSelectedStage(stage.key)}
                className={cn(
                  "text-left rounded-2xl border-2 p-5 relative transition-all bg-white",
                  isCurrent
                    ? "border-gold-400 shadow-soft"
                    : isSelected
                      ? "border-brand-300 shadow-sm"
                      : "border-ink-100 hover:border-ink-200",
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-4 bg-ink-900 text-gold-300 text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">
                    You are here
                  </span>
                )}

                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-bold tracking-wider text-ink-400 uppercase">
                    {stage.dayRange}
                  </span>
                  {isComplete ? (
                    <div className="w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full border-2 border-gold-400 flex items-center justify-center flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-gold-500" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-ink-200 flex-shrink-0" />
                  )}
                </div>

                <h3 className="text-xl font-display font-bold text-ink-900 mb-2">{stage.title}</h3>
                <p className="text-sm text-ink-500 mb-4 leading-snug">
                  {describeStage(stats.modules, stage.fallbackDescription)}
                </p>

                <p className="text-xs font-semibold tracking-wide uppercase">
                  {stats.total === 0 ? (
                    <span className="text-ink-400">Upcoming &middot; Tap to preview</span>
                  ) : isComplete ? (
                    <span className="text-lime-600">Complete &middot; {stats.total}/{stats.total} lessons</span>
                  ) : isCurrent ? (
                    <span className="text-gold-600">
                      In progress &middot; {stats.completed}/{stats.total} lessons
                    </span>
                  ) : (
                    <span className="text-ink-400">Upcoming &middot; Tap to preview</span>
                  )}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active stage module list */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse border-ink-100">
                <div className="h-16 bg-ink-50 border-b border-ink-100" />
                <div className="p-6 space-y-4">
                  <div className="h-20 bg-ink-50 rounded-xl" />
                  <div className="h-20 bg-ink-50 rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        ) : activeModules.length === 0 ? (
          <div className="text-center py-16 bg-ink-50/50 rounded-2xl border border-dashed border-ink-200">
            <h3 className="font-semibold text-ink-900 mb-1">
              {activeStage.title} lessons are coming soon
            </h3>
            <p className="text-sm text-ink-500 max-w-sm mx-auto">
              This stage hasn't been published yet. Check back once earlier stages are complete.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeModules.map((mod, moduleIndex) => (
              <div key={mod.id} className="relative">
                {moduleIndex !== activeModules.length - 1 && (
                  <div className="absolute left-6 top-16 bottom-[-32px] w-0.5 bg-ink-100 z-0" />
                )}

                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-display font-bold flex items-center justify-center border-4 border-white shadow-sm">
                    {moduleIndex + 1}
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-ink-900">{mod.title}</h2>
                    {mod.description && <p className="text-sm text-ink-500">{mod.description}</p>}
                  </div>
                </div>

                <div className="pl-[3.25rem] space-y-3 relative z-10">
                  {mod.lessons.map((lesson) => {
                    const status = lesson.progress?.status || "not_started";
                    const isLocked = lesson.locked;

                    return (
                      <Card
                        key={lesson.id}
                        className={cn(
                          "border transition-all overflow-hidden",
                          status === "completed"
                            ? "border-lime-200 bg-lime-50/30"
                            : isLocked
                              ? "border-ink-100 bg-ink-50 opacity-75"
                              : "border-brand-200 hover:border-brand-400 shadow-sm",
                        )}
                      >
                        <CardContent className="p-0">
                          <Link
                            href={isLocked ? "#" : `/learn/${lesson.id}`}
                            className={cn(
                              "flex items-center p-4 gap-4",
                              isLocked && "cursor-not-allowed pointer-events-none",
                            )}
                          >
                            <div className="flex-shrink-0">
                              {status === "completed" ? (
                                <CheckCircle2 className="w-8 h-8 text-lime-500" />
                              ) : isLocked ? (
                                <div className="w-8 h-8 rounded-full bg-ink-200 flex items-center justify-center">
                                  <Lock className="w-4 h-4 text-ink-500" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                                  <PlayCircle className="w-5 h-5 text-brand-600" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3
                                className={cn(
                                  "font-semibold mb-1 truncate",
                                  isLocked ? "text-ink-500" : "text-ink-900",
                                )}
                              >
                                {lesson.title}
                              </h3>
                              <div className="flex items-center gap-3 text-xs text-ink-500">
                                <span>{Math.round(lesson.durationSeconds / 60)} min</span>
                                {lesson.resources.length > 0 && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="flex items-center gap-1">
                                      <FileText className="w-3 h-3" /> {lesson.resources.length} resources
                                    </span>
                                  </>
                                )}
                                {status === "in_progress" && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-brand-600 font-medium">In progress</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {!isLocked && status !== "completed" && (
                              <Button variant="secondary" className="bg-white border border-ink-200 shrink-0 shadow-sm">
                                {status === "in_progress" ? "Resume" : "Start"}
                              </Button>
                            )}
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
