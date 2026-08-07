import { AppLayout } from "@/components/layout/AppLayout";
import { useGetLesson, usePostLessonProgress, useCompleteLesson, useGetMe } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText, CheckCircle2, ChevronRight, Download, PlayCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function LessonPlayer() {
  const { lessonId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Need to provide queryKey for enabled query
  const { data: detail, isLoading } = useGetLesson(lessonId || '', { 
    query: { 
      enabled: !!lessonId,
      queryKey: ['lesson', lessonId]
    } 
  });
  
  const postProgress = usePostLessonProgress();
  const completeLesson = useCompleteLesson();
  
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!detail?.lesson) return;
    
    // Resume from existing progress
    if (detail.lesson.progress?.watchedSeconds) {
      setWatchedSeconds(detail.lesson.progress.watchedSeconds);
    }
    
    // Start an "honest timer" for video watch time
    timerRef.current = setInterval(() => {
      setWatchedSeconds(s => {
        const next = s + 1;
        // Post progress every 10s
        if (next % 10 === 0 && lessonId) {
          postProgress.mutate({ 
            lessonId, 
            data: { watchedSeconds: next, furthestPosition: next } 
          });
        }
        return next;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Flush final progress on unmount
      if (lessonId) {
        postProgress.mutate({ 
          lessonId, 
          data: { watchedSeconds, furthestPosition: watchedSeconds } 
        });
      }
    };
  }, [detail?.lesson?.id, lessonId]); // Dependency only on ID change

  const handleComplete = () => {
    if (!lessonId) return;
    completeLesson.mutate({ lessonId }, {
      onSuccess: (status) => {
        if (status.justCompleted) {
          setLocation('/learn/complete');
        } else if (status.nextLessonId) {
          toast({ title: "Lesson completed!" });
          setLocation(`/learn/${status.nextLessonId}`);
        } else {
          setLocation('/learn');
        }
      }
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
      </AppLayout>
    );
  }

  if (!detail) return <AppLayout><div className="p-8">Lesson not found</div></AppLayout>;

  const { lesson, nextLesson } = detail;
  const isCompleted = lesson.progress?.status === 'completed';
  const progressPercent = Math.min(100, Math.round((watchedSeconds / lesson.durationSeconds) * 100));

  return (
    <AppLayout>
      {/* Header bar */}
      <div className="bg-white border-b sticky top-16 z-20 px-8 py-4 flex items-center justify-between">
        <Link href="/learn" className="text-ink-500 hover:text-ink-900 flex items-center text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Roadmap
        </Link>
        <div className="flex items-center gap-4">
          {isCompleted ? (
            <Badge variant="secondary" className="bg-lime-100 text-lime-800 rounded-full px-3 py-1">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Completed
            </Badge>
          ) : (
            <Button 
              onClick={handleComplete}
              disabled={!lesson.allowManualComplete && progressPercent < 90}
              className="bg-brand-500 hover:bg-brand-600 rounded-xl"
            >
              Mark as complete
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full p-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Player placeholder/iframe */}
          <div className="aspect-video bg-ink-900 rounded-2xl overflow-hidden relative shadow-lg border border-ink-800">
            {lesson.videoUrl ? (
              <iframe 
                src={lesson.videoUrl} 
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mb-4">
                  <PlayCircle className="w-8 h-8 text-brand-400" />
                </div>
                <p className="font-medium">Video Player Placeholder</p>
                <p className="text-sm text-ink-400">Duration: {Math.round(lesson.durationSeconds / 60)} min</p>
              </div>
            )}
            
            {/* Fake progress bar purely for visuals since iframe events are hard */}
            {!isCompleted && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-ink-800">
                <div 
                  className="h-full bg-brand-500 transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-display font-bold text-ink-900 mb-2">{lesson.title}</h1>
            {lesson.description && <p className="text-lg text-ink-500 mb-8">{lesson.description}</p>}
            
            {lesson.bodyMd && (
              <div className="prose max-w-none prose-headings:font-display prose-a:text-brand-600">
                {/* Render markdown properly in a real app, just showing raw text here since we didn't add marked/react-markdown */}
                <div dangerouslySetInnerHTML={{ __html: lesson.bodyMd.replace(/\n/g, '<br/>') }} />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Up Next Card */}
          {nextLesson ? (
            <Card className="border-brand-200 bg-brand-50 overflow-hidden shadow-sm">
              <div className="h-1 grad-create" />
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider mb-2">Up Next</h3>
                <p className="font-display font-bold text-lg text-ink-900 mb-1">{nextLesson.title}</p>
                <p className="text-sm text-ink-500 mb-6">{Math.round(nextLesson.durationSeconds / 60)} min video</p>
                
                <Button 
                  className="w-full justify-between rounded-xl bg-white text-ink-900 border border-brand-200 hover:bg-brand-100" 
                  variant="outline"
                  onClick={() => {
                    if (isCompleted) setLocation(`/learn/${nextLesson.id}`);
                    else handleComplete();
                  }}
                >
                  Proceed to next lesson <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ) : !isCompleted && (
            <Card className="border-lime-200 bg-lime-50 overflow-hidden shadow-sm">
              <div className="h-1 bg-lime-500" />
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-lime-100 text-lime-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-ink-900 mb-2">Final Lesson</h3>
                <p className="text-sm text-ink-600 mb-6">Complete this lesson to unlock the full production studio.</p>
                <Button 
                  onClick={handleComplete}
                  className="w-full rounded-xl bg-lime-500 hover:bg-lime-600 text-ink-900 font-semibold"
                >
                  Finish Onboarding
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resources */}
          {lesson.resources.length > 0 && (
            <Card className="shadow-sm border-ink-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-ink-900 flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-ink-400" />
                  Resources ({lesson.resources.length})
                </h3>
                <div className="space-y-3">
                  {lesson.resources.map(res => (
                    <a 
                      key={res.id} 
                      href={res.externalUrl || '#'} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-ink-100 hover:bg-ink-50 hover:border-ink-200 transition-colors group"
                    >
                      <span className="text-sm font-medium text-ink-700 group-hover:text-ink-900">{res.label}</span>
                      <Download className="w-4 h-4 text-ink-400 group-hover:text-brand-500" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
