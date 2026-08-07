import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useGetLearnModules } from "@workspace/api-client-react";
import { GraduationCap, PlayCircle, FileText, CheckCircle2, Lock } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export default function Learn() {
  const { data: modules, isLoading } = useGetLearnModules();

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto w-full p-8">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-sm font-semibold mb-4 border border-brand-200">
            <GraduationCap className="w-4 h-4" />
            Platform Onboarding
          </div>
          <h1 className="text-4xl font-display font-bold text-ink-900 mb-4">
            Master the Production Studio
          </h1>
          <p className="text-lg text-ink-600 max-w-2xl leading-relaxed">
            Welcome to the team. Before you can generate products, you need to learn how we structure them, write prompts, and maintain quality.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse border-ink-100">
                <div className="h-16 bg-ink-50 border-b border-ink-100" />
                <div className="p-6 space-y-4">
                  <div className="h-20 bg-ink-50 rounded-xl" />
                  <div className="h-20 bg-ink-50 rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {modules?.map((mod, moduleIndex) => (
              <div key={mod.id} className="relative">
                {/* Connecting line between modules */}
                {moduleIndex !== modules.length - 1 && (
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
                    const status = lesson.progress?.status || 'not_started';
                    const isLocked = lesson.locked;

                    return (
                      <Card 
                        key={lesson.id} 
                        className={cn(
                          "border transition-all overflow-hidden",
                          status === 'completed' ? "border-lime-200 bg-lime-50/30" :
                          isLocked ? "border-ink-100 bg-ink-50 opacity-75" :
                          "border-brand-200 hover:border-brand-400 shadow-sm"
                        )}
                      >
                        <CardContent className="p-0">
                          <Link href={isLocked ? "#" : `/learn/${lesson.id}`} className={cn(
                            "flex items-center p-4 gap-4",
                            isLocked && "cursor-not-allowed pointer-events-none"
                          )}>
                            <div className="flex-shrink-0">
                              {status === 'completed' ? (
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
                              <h3 className={cn(
                                "font-semibold mb-1 truncate",
                                isLocked ? "text-ink-500" : "text-ink-900"
                              )}>
                                {lesson.title}
                              </h3>
                              <div className="flex items-center gap-3 text-xs text-ink-500">
                                <span>{Math.round(lesson.durationSeconds / 60)} min</span>
                                {lesson.resources.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <FileText className="w-3 h-3" /> {lesson.resources.length} resources
                                    </span>
                                  </>
                                )}
                                {status === 'in_progress' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-brand-600 font-medium">In progress</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {!isLocked && status !== 'completed' && (
                              <Button variant="secondary" className="bg-white border border-ink-200 shrink-0 shadow-sm">
                                {status === 'in_progress' ? 'Resume' : 'Start'}
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
