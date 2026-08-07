import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  useCreateProduct, useGenerateLeadMagnet, useGetJob, useGetProduct, useUpdateProduct, useExportProduct,
  getGetJobQueryKey, getGetProductQueryKey
} from "@workspace/api-client-react";
import { useLocation, useSearch } from "wouter";
import { ChevronRight, Loader2, Sparkles, FileText, Settings, Download, LayoutTemplate, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function CreateLeadMagnet() {
  const searchParams = new URLSearchParams(useSearch());
  const urlProductId = searchParams.get("productId");
  const urlJobId = searchParams.get("jobId");
  
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const steps = [
    { num: 1, title: "Brief", icon: FileText },
    { num: 2, title: "Generate", icon: Sparkles },
    { num: 3, title: "Export", icon: Download },
  ];

  // ==========================================
  // STEP 1: Brief
  // ==========================================
  const [brief, setBrief] = useState({
    title: "",
    topic: "",
    audience: "",
    tone: "professional",
    leadMagnetFormat: "checklist",
  });

  const createProduct = useCreateProduct();
  const generate = useGenerateLeadMagnet();

  const handleStartBrief = () => {
    if (!brief.topic) {
      toast({ title: "Topic required", variant: "destructive" });
      return;
    }
    
    createProduct.mutate({
      data: {
        type: 'lead_magnet',
        title: brief.title || 'Untitled Lead Magnet',
        topic: brief.topic,
        audience: brief.audience,
        tone: brief.tone,
        leadMagnetFormat: brief.leadMagnetFormat,
      }
    }, {
      onSuccess: (product) => {
        generate.mutate({ data: { productId: product.id } }, {
          onSuccess: (job) => {
            setLocation(`/create/lead-magnet?productId=${product.id}&jobId=${job.id}`);
            setStep(2);
          }
        });
      }
    });
  };

  // ==========================================
  // STEP 2: Generate Job Polling
  // ==========================================
  const { data: job } = useGetJob(urlJobId || '', {
    query: {
      enabled: step === 2 && !!urlJobId,
      refetchInterval: (data) => 
        (data?.state?.data?.status === 'queued' || data?.state?.data?.status === 'running') ? 2000 : false,
      queryKey: getGetJobQueryKey(urlJobId || '')
    }
  });

  useEffect(() => {
    if (step === 2 && job?.status === 'succeeded') {
      setStep(3);
    }
    if (step === 2 && job?.status === 'failed') {
      toast({ title: "Generation failed", description: job.errorMessage, variant: "destructive" });
    }
    if (urlProductId && !urlJobId && step === 1) {
      setStep(3); // Resume existing product
    }
  }, [step, job?.status, urlProductId, urlJobId, toast]);

  // ==========================================
  // STEP 3: Export & Cover
  // ==========================================
  const { data: detail } = useGetProduct(urlProductId || '', {
    query: { enabled: step === 3 && !!urlProductId, queryKey: getGetProductQueryKey(urlProductId || '') }
  });
  const updateProduct = useUpdateProduct();
  const exportProduct = useExportProduct();
  const [exportTheme, setExportTheme] = useState("minimal");
  
  const handleExport = () => {
    if (!urlProductId) return;
    exportProduct.mutate({ productId: urlProductId, data: { format: 'pdf', pageSize: 'letter', theme: exportTheme } }, {
      onSuccess: (record) => {
        toast({ title: "Export ready!" });
        // Handle download url - prepend base path if needed
        const url = record.downloadUrl.startsWith('/api') ? import.meta.env.BASE_URL + record.downloadUrl.slice(1) : record.downloadUrl;
        window.open(url, '_blank');
      }
    });
  };

  const handleUpdateCover = (color: string) => {
    if (!urlProductId) return;
    updateProduct.mutate({ productId: urlProductId, data: { coverConfig: { primaryColor: color } } });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-paper">
        <div className="bg-white border-b sticky top-16 z-20 px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="font-display font-bold text-xl text-ink-900">Lead Magnet Generator</h1>
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    step === s.num ? "bg-brand-100 text-brand-700" :
                    step > s.num ? "text-brand-500" : "text-ink-400"
                  )}>
                    <s.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{s.title}</span>
                  </div>
                  {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-ink-300 mx-1" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl mx-auto w-full">
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="mb-6">
                  <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Lead Magnet Brief</h2>
                  <p className="text-ink-500">Fast-track generation for short, high-value assets.</p>
                </div>

                <Card className="border-ink-200 shadow-sm rounded-2xl overflow-hidden">
                  <div className="h-2 grad-dark" />
                  <CardContent className="p-8 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-base font-semibold">Title (Optional)</Label>
                        <Input 
                          id="title" 
                          placeholder="e.g. The 10-Point SEO Checklist" 
                          className="h-12 rounded-xl bg-ink-50/50"
                          value={brief.title}
                          onChange={e => setBrief({...brief, title: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base font-semibold flex items-center gap-2">Format <span className="text-destructive">*</span></Label>
                        <Select value={brief.leadMagnetFormat} onValueChange={v => setBrief({...brief, leadMagnetFormat: v})}>
                          <SelectTrigger className="h-12 rounded-xl bg-ink-50/50 border-brand-200">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="checklist">Checklist</SelectItem>
                            <SelectItem value="cheat_sheet">Cheat Sheet</SelectItem>
                            <SelectItem value="one_page_guide">One-Page Guide</SelectItem>
                            <SelectItem value="swipe_file">Swipe File</SelectItem>
                            <SelectItem value="worksheet">Worksheet / Template</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="topic" className="text-base font-semibold flex items-center gap-2">
                        Core Topic <span className="text-destructive">*</span>
                      </Label>
                      <Textarea 
                        id="topic" 
                        placeholder="What is this lead magnet about?" 
                        className="min-h-[120px] rounded-xl bg-ink-50/50 resize-y"
                        value={brief.topic}
                        onChange={e => setBrief({...brief, topic: e.target.value})}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Target Audience</Label>
                        <Input 
                          placeholder="e.g. Course creators" 
                          className="h-12 rounded-xl bg-ink-50/50"
                          value={brief.audience}
                          onChange={e => setBrief({...brief, audience: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Tone</Label>
                        <Select value={brief.tone} onValueChange={v => setBrief({...brief, tone: v})}>
                          <SelectTrigger className="h-12 rounded-xl bg-ink-50/50">
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="conversational">Conversational</SelectItem>
                            <SelectItem value="actionable">Action-Oriented</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gold-50 text-gold-700 rounded-xl border border-gold-200">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold">Est. Cost: 3 credits</span>
                  </div>
                  <Button 
                    size="lg" 
                    className="h-12 px-8 rounded-xl bg-ink-900 hover:bg-ink-800 text-white font-bold text-base shadow-soft"
                    onClick={handleStartBrief}
                    disabled={createProduct.isPending || generate.isPending}
                  >
                    {(createProduct.isPending || generate.isPending) ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><LayoutTemplate className="w-5 h-5 mr-2" /> Generate Now</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="py-20 max-w-md mx-auto text-center animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-brand-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">Crafting your lead magnet</h2>
                <p className="text-ink-500 mb-8">{job?.progressLabel || "Writing content and formatting layout..."}</p>
                
                <Progress 
                  value={job?.totalUnits ? ((job.completedUnits || 0) / job.totalUnits) * 100 : undefined} 
                  className="h-2 bg-brand-100 [&>div]:bg-brand-500" 
                />
              </div>
            )}

            {step === 3 && detail && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Design & Export</h2>
                    <p className="text-ink-500">Your lead magnet is ready. Choose a theme and download.</p>
                  </div>
                  <Badge className="bg-lime-100 text-lime-800 rounded-full px-4 py-1.5 text-sm">Ready to publish</Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Preview pane */}
                  <div className="bg-ink-100 rounded-2xl p-8 flex items-center justify-center border border-ink-200 shadow-inner">
                    <div 
                      className="w-[210px] h-[297px] bg-white shadow-xl flex flex-col transition-all duration-300"
                      style={{ 
                        borderTop: `8px solid ${((detail.product.coverConfig as any)?.primaryColor) || '#1FA06B'}`,
                        fontFamily: exportTheme === 'serif' ? 'Georgia, serif' : 'Inter, sans-serif'
                      }}
                    >
                      <div className="p-4 flex-1">
                        <div className="w-8 h-8 bg-ink-100 rounded-full mb-4" />
                        <h3 className="font-bold text-ink-900 leading-tight mb-2 text-sm">{detail.product.title}</h3>
                        <div className="w-full h-1 bg-ink-100 rounded mb-4" />
                        <div className="space-y-2">
                          <div className="flex gap-2"><div className="w-2 h-2 rounded bg-brand-200" /><div className="h-2 bg-ink-100 rounded flex-1" /></div>
                          <div className="flex gap-2"><div className="w-2 h-2 rounded bg-brand-200" /><div className="h-2 bg-ink-100 rounded flex-1" /></div>
                          <div className="flex gap-2"><div className="w-2 h-2 rounded bg-brand-200" /><div className="h-2 bg-ink-100 rounded flex-1" /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="space-y-6">
                    <Card className="border-ink-200 shadow-sm">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-ink-900 mb-4 flex items-center gap-2">
                          <Palette className="w-4 h-4 text-ink-400" /> Theme Selection
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <Button 
                            variant="outline" 
                            className={cn("justify-start h-auto py-3 px-4", exportTheme === 'minimal' && "border-brand-500 bg-brand-50")}
                            onClick={() => setExportTheme('minimal')}
                          >
                            <div>
                              <div className="font-medium text-ink-900">Modern Sans</div>
                              <div className="text-xs text-ink-500 font-normal">Clean & geometric</div>
                            </div>
                          </Button>
                          <Button 
                            variant="outline" 
                            className={cn("justify-start h-auto py-3 px-4", exportTheme === 'serif' && "border-brand-500 bg-brand-50")}
                            onClick={() => setExportTheme('serif')}
                          >
                            <div className="font-serif">
                              <div className="font-medium text-ink-900">Classic Serif</div>
                              <div className="text-xs text-ink-500 font-sans font-normal">Elegant & readable</div>
                            </div>
                          </Button>
                        </div>

                        <h3 className="font-semibold text-ink-900 mb-3 text-sm">Accent Color</h3>
                        <div className="flex gap-3">
                          {['#1FA06B', '#2E8B9E', '#D9A02B', '#7CB518', '#D64545', '#5A6B64'].map(color => (
                            <button
                              key={color}
                              className={cn(
                                "w-8 h-8 rounded-full shadow-sm border-2 transition-transform hover:scale-110",
                                ((detail.product.coverConfig as any)?.primaryColor) === color ? "border-ink-900 scale-110" : "border-transparent"
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => handleUpdateCover(color)}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Button 
                      size="lg" 
                      className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft"
                      onClick={handleExport}
                      disabled={exportProduct.isPending}
                    >
                      {exportProduct.isPending ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Compiling PDF...</>
                      ) : (
                        <><Download className="w-5 h-5 mr-2" /> Download PDF Guide</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
