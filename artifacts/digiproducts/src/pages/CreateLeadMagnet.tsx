import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateProduct,
  useExportProduct,
  useGenerateLeadMagnet,
  useGetJob,
  useGetProduct,
  useUpdateProduct,
  getGetJobQueryKey,
  getGetProductQueryKey,
} from "@workspace/api-client-react";
import { useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  FileOutput,
  FileText,
  ImageIcon,
  Loader2,
  Palette,
  RefreshCw,
  Sparkles,
  Type,
  UserRound,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const FORMAT_CHOICES = [
  {
    value: "checklist",
    title: "Checklist",
    description: "A quick, actionable list people can use right away.",
    icon: Check,
  },
  {
    value: "cheat_sheet",
    title: "Cheat sheet",
    description: "A compact reference your audience will keep nearby.",
    icon: FileText,
  },
  {
    value: "one_page_guide",
    title: "One-page guide",
    description: "A clear, visual overview of one useful topic.",
    icon: BookOpen,
  },
  {
    value: "worksheet",
    title: "Worksheet",
    description: "A fill-in resource that turns advice into action.",
    icon: Wand2,
  },
  {
    value: "swipe_file",
    title: "Swipe file",
    description: "A curated set of examples your audience can adapt.",
    icon: FileOutput,
  },
];

const COVER_DESIGNS = [
  { value: "centered", title: "Centered Classic", description: "Timeless and editorial", swatch: "bg-[#F5F0E5] text-[#27211C]" },
  { value: "banner", title: "Bold Banner", description: "Strong and energetic", swatch: "bg-[#191919] text-white" },
  { value: "portrait", title: "Tall Statement", description: "Modern and focused", swatch: "bg-[#0F8D88] text-white" },
  { value: "gradient", title: "Gradient Wave", description: "Vibrant and expressive", swatch: "bg-gradient-to-br from-[#1C2B55] via-[#6338B8] to-[#B343A9] text-white" },
];

const COVER_COLORS = ["#1E2B45", "#8F2341", "#0F8D88", "#5B3FC0", "#D17824", "#2A2D33"];

export default function CreateLeadMagnet() {
  const searchParams = new URLSearchParams(useSearch());
  const urlProductId = searchParams.get("productId");
  const urlJobId = searchParams.get("jobId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(urlJobId ? 3 : 1);
  const [creationMode, setCreationMode] = useState<"write" | "guide">("write");
  const [designTab, setDesignTab] = useState("cover");
  const [coverDesign, setCoverDesign] = useState("centered");
  const [exportTheme, setExportTheme] = useState("minimal");
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0]);
  const [showBrand, setShowBrand] = useState(true);
  const [mockupReady, setMockupReady] = useState(false);

  const [brief, setBrief] = useState({
    title: "",
    topic: "",
    audience: "",
    tone: "professional",
    leadMagnetFormat: "checklist",
  });

  const createProduct = useCreateProduct();
  const generate = useGenerateLeadMagnet();
  const updateProduct = useUpdateProduct();
  const exportProduct = useExportProduct();

  const flowSteps = [
    { num: 1, label: "Brief" },
    { num: 2, label: "Create" },
    { num: 3, label: "Generate" },
    { num: 4, label: "Design" },
  ];

  const { data: job } = useGetJob(urlJobId || "", {
    query: {
      enabled: step === 3 && !!urlJobId,
      refetchInterval: (data) =>
        data?.state?.data?.status === "queued" || data?.state?.data?.status === "running"
          ? 2000
          : false,
      queryKey: getGetJobQueryKey(urlJobId || ""),
    },
  });

  const { data: detail } = useGetProduct(urlProductId || "", {
    query: {
      enabled: !!urlProductId,
      queryKey: getGetProductQueryKey(urlProductId || ""),
    },
  });

  useEffect(() => {
    if (step === 3 && job?.status === "succeeded") setStep(4);
    if (step === 3 && job?.status === "failed") {
      toast({
        title: "Generation failed",
        description: job.errorMessage,
        variant: "destructive",
      });
    }
  }, [job?.errorMessage, job?.status, step, toast]);

  useEffect(() => {
    const savedColor = (detail?.product.coverConfig as { primaryColor?: string } | null)?.primaryColor;
    if (savedColor) setCoverColor(savedColor);
  }, [detail?.product.coverConfig]);

  useEffect(() => {
    if (!urlProductId || urlJobId || !detail) return;
    if (["ready", "in_review", "changes_requested", "approved"].includes(detail.product.status)) {
      setStep(4);
      return;
    }
    if (detail.product.status === "generating") {
      setStep(3);
      return;
    }
    setLocation("/lead-magnets");
  }, [detail, setLocation, urlJobId, urlProductId]);

  const startCreation = () => {
    if (!brief.topic.trim()) {
      toast({ title: "Add a core topic to continue", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const generateLeadMagnet = () => {
    createProduct.mutate(
      {
        data: {
          type: "lead_magnet",
          title: brief.title.trim() || "Untitled Lead Magnet",
          topic: brief.topic,
          audience: brief.audience,
          tone: brief.tone,
          leadMagnetFormat: brief.leadMagnetFormat,
        },
      },
      {
        onSuccess: (product) => {
          generate.mutate(
            { data: { productId: product.id } },
            {
              onSuccess: (generatedJob) => {
                setLocation(`/create/lead-magnet?productId=${product.id}&jobId=${generatedJob.id}`);
                setStep(3);
              },
            },
          );
        },
      },
    );
  };

  const updateCoverColor = (color: string) => {
    setCoverColor(color);
    if (urlProductId) {
      const currentCoverConfig = (detail?.product.coverConfig ?? {}) as Record<string, unknown>;
      updateProduct.mutate({
        productId: urlProductId,
        data: { coverConfig: { ...currentCoverConfig, primaryColor: color } },
      });
    }
  };

  const exportPdf = () => {
    if (!urlProductId) return;
    exportProduct.mutate(
      { productId: urlProductId, data: { format: "pdf", pageSize: "letter", theme: exportTheme } },
      {
        onSuccess: (record) => {
          toast({ title: "Your PDF is ready" });
          const url = record.downloadUrl.startsWith("/api")
            ? `${import.meta.env.BASE_URL}${record.downloadUrl.slice(1)}`
            : record.downloadUrl;
          window.open(url, "_blank");
        },
      },
    );
  };

  const returnToPrevious = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 4 && !urlProductId) {
      setStep(1);
      return;
    }
    setLocation("/lead-magnets");
  };

  const previewTitle = detail?.product.title || brief.title || "Your lead magnet title";
  const previewSubtitle = brief.audience
    ? `A practical guide for ${brief.audience}`
    : "A practical resource your audience will want to save.";
  const isGenerating = createProduct.isPending || generate.isPending;

  return (
    <AppLayout>
      <div className="min-h-full bg-paper">
        <div className="w-full max-w-7xl mx-auto px-5 py-7 sm:px-8 sm:py-9">
          <header className="mb-8 flex items-center justify-between gap-5">
            <Button variant="ghost" size="sm" onClick={returnToPrevious} className="gap-2 text-ink-600">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 4`}>
              {flowSteps.map((item) => (
                <span
                  key={item.num}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    item.num === step ? "w-7 bg-brand-600" : item.num < step ? "w-2 bg-brand-300" : "w-2 bg-ink-200",
                  )}
                  title={item.label}
                />
              ))}
            </div>
            <span className="w-[76px]" aria-hidden="true" />
          </header>

          {step === 1 && (
            <section className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="mb-8 text-center">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  <Sparkles className="h-3.5 w-3.5" /> Step 1 of 4
                </p>
                <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">Start your lead magnet</h1>
                <p className="mt-2 text-ink-500">Give us the essentials, then shape the content and cover around your audience.</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
                <Card className="border-ink-200/80 shadow-sm">
                  <CardContent className="p-5 sm:p-7">
                    <div className="mb-6">
                      <Label className="text-sm font-semibold text-ink-900">Choose a format</Label>
                      <p className="mt-1 text-sm text-ink-500">Pick the shape that best fits the value you want to share.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {FORMAT_CHOICES.map((format) => {
                        const Icon = format.icon;
                        const selected = brief.leadMagnetFormat === format.value;
                        return (
                          <button
                            key={format.value}
                            type="button"
                            onClick={() => setBrief({ ...brief, leadMagnetFormat: format.value })}
                            className={cn(
                              "rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm",
                              selected
                                ? "border-brand-500 bg-brand-50/70 shadow-sm ring-1 ring-brand-200"
                                : "border-ink-200 bg-white hover:border-brand-200",
                            )}
                            data-testid={`lead-magnet-format-${format.value}`}
                          >
                            <span className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-lg", selected ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600")}>
                              <Icon className="h-4.5 w-4.5" />
                            </span>
                            <p className="text-sm font-semibold text-ink-900">{format.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-ink-500">{format.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 bg-ink-900 text-white shadow-lg">
                  <CardContent className="flex h-full flex-col p-6">
                    <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                      <FileOutput className="h-5 w-5 text-gold-300" />
                    </span>
                    <p className="text-sm font-semibold text-gold-200">Built for list growth</p>
                    <h2 className="mt-2 font-display text-2xl font-bold leading-tight">Turn expertise into a useful first impression.</h2>
                    <p className="mt-3 text-sm leading-relaxed text-white/65">Your finished resource is ready to use in campaigns, on your Link in Bio page, or as a standalone download.</p>
                    <div className="mt-auto pt-8 text-xs font-medium text-white/55">Estimated creation cost: 3 credits</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6 border-ink-200/80 shadow-sm">
                <CardContent className="space-y-5 p-5 sm:p-7">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="lead-title">Working title <span className="font-normal text-ink-400">(optional)</span></Label>
                      <Input id="lead-title" value={brief.title} onChange={(e) => setBrief({ ...brief, title: e.target.value })} placeholder="e.g. The 10-minute content checklist" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead-tone">Voice</Label>
                      <Select value={brief.tone} onValueChange={(tone) => setBrief({ ...brief, tone })}>
                        <SelectTrigger id="lead-tone" className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional and clear</SelectItem>
                          <SelectItem value="conversational">Conversational and warm</SelectItem>
                          <SelectItem value="actionable">Direct and actionable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-topic">What should people learn? <span className="text-destructive">*</span></Label>
                    <Textarea id="lead-topic" value={brief.topic} onChange={(e) => setBrief({ ...brief, topic: e.target.value })} placeholder="Describe the problem, outcome, or topic this resource should help with." className="min-h-[120px] resize-y" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-audience">Who is it for?</Label>
                    <Input id="lead-audience" value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} placeholder="e.g. New course creators and solo consultants" className="h-11" />
                  </div>
                  <div className="flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-ink-500">You can revise the cover and style after the content is ready.</span>
                    <Button size="lg" onClick={startCreation} className="gap-2 rounded-xl px-6">
                      Continue to creation <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {step === 2 && (
            <section className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="mb-8 text-center">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  <Sparkles className="h-3.5 w-3.5" /> Step 2 of 4
                </p>
                <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">How should we create the content?</h1>
                <p className="mt-2 text-ink-500">Creating: <span className="font-medium text-ink-700">{brief.title || brief.topic}</span></p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <button type="button" onClick={() => setCreationMode("write")} className={cn("rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-md", creationMode === "write" ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-200" : "border-ink-200 bg-white")}>
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Sparkles className="h-5 w-5" /></span>
                  <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-bold text-ink-900">AI writes everything</h2>{creationMode === "write" && <CheckCircle2 className="h-5 w-5 text-brand-600" />}</div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">Full content is generated for you. Review and fine-tune it once it is ready.</p>
                  <span className="mt-5 inline-flex rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">Fastest</span>
                </button>
                <button type="button" onClick={() => setCreationMode("guide")} className={cn("rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-md", creationMode === "guide" ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-200" : "border-ink-200 bg-white")}>
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 text-gold-700"><UserRound className="h-5 w-5" /></span>
                  <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-bold text-ink-900">I&apos;ll guide the AI</h2>{creationMode === "guide" && <CheckCircle2 className="h-5 w-5 text-brand-600" />}</div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">AI creates a strong structure, then you can add your own expertise before polishing.</p>
                  <span className="mt-5 inline-flex rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-800">More hands-on</span>
                </button>
              </div>
              <div className="mt-7 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button size="lg" onClick={generateLeadMagnet} disabled={isGenerating} className="min-w-[210px] gap-2 rounded-xl">
                  {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting creation...</> : <><Wand2 className="h-4 w-4" /> Create my lead magnet</>}
                </Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="flex min-h-[560px] items-center justify-center animate-in fade-in duration-500">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-brand-300 bg-brand-50">
                  <Sparkles className="h-8 w-8 animate-pulse text-brand-600" />
                </div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Step 3 of 4</p>
                <h1 className="font-display text-3xl font-bold text-ink-900">Creating your lead magnet...</h1>
                <p className="mt-3 text-ink-500">{job?.progressLabel || "Researching pain points and writing the first draft..."}</p>
                <p className="mt-6 text-xs text-ink-400">{urlJobId ? "This may take 30–60 seconds. You can keep this tab open while we work." : "This draft is still being created. Return to Lead Magnets and open it once it is ready."}</p>
              </div>
            </section>
          )}

          {step === 4 && !detail && (
            <section className="flex min-h-[520px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
                <p className="mt-4 text-sm text-ink-500">Preparing your design workspace...</p>
              </div>
            </section>
          )}

          {step === 4 && detail && (
            <section className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"><Sparkles className="h-3.5 w-3.5" /> Step 4 of 4</p>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">Design your lead magnet</h1>
                  <p className="mt-1 text-sm text-ink-500">Choose a cover, customize the details, then download your finished PDF.</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => toast({ title: "Cover refreshed", description: "Your latest design choices are shown in the preview." })}><RefreshCw className="h-4 w-4" /> Refresh preview</Button>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(320px,.82fr)_minmax(460px,1.18fr)]">
                <Card className="overflow-hidden border-ink-200 shadow-sm">
                  <Tabs value={designTab} onValueChange={setDesignTab}>
                    <div className="border-b border-ink-100 px-3 pt-3">
                      <TabsList className="grid h-auto w-full grid-cols-4 bg-transparent p-0">
                        <TabsTrigger value="cover" className="gap-1.5 rounded-b-none py-2.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"><ImageIcon className="h-3.5 w-3.5" /> Cover</TabsTrigger>
                        <TabsTrigger value="colors" className="gap-1.5 rounded-b-none py-2.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Palette className="h-3.5 w-3.5" /> Colors</TabsTrigger>
                        <TabsTrigger value="fonts" className="gap-1.5 rounded-b-none py-2.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Type className="h-3.5 w-3.5" /> Fonts</TabsTrigger>
                        <TabsTrigger value="brand" className="gap-1.5 rounded-b-none py-2.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"><UserRound className="h-3.5 w-3.5" /> Brand</TabsTrigger>
                      </TabsList>
                    </div>
                    <CardContent className="min-h-[390px] p-5">
                      <TabsContent value="cover" className="mt-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Choose cover design</p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {COVER_DESIGNS.map((design) => (
                            <button key={design.value} type="button" onClick={() => setCoverDesign(design.value)} className={cn("rounded-xl border p-2 text-left transition-all", coverDesign === design.value ? "border-brand-500 ring-1 ring-brand-200" : "border-ink-200 hover:border-brand-200")}>
                              <div className={cn("flex h-24 items-center justify-center rounded-lg p-2 text-center text-[8px] font-bold leading-tight", design.swatch)}>{previewTitle}</div>
                              <p className="mt-2 text-xs font-semibold text-ink-900">{design.title}</p>
                              <p className="mt-0.5 text-[11px] text-ink-500">{design.description}</p>
                            </button>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="colors" className="mt-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Accent color</p>
                        <p className="mt-1 text-sm text-ink-500">Use a color that feels at home in your existing brand.</p>
                        <div className="mt-6 grid grid-cols-3 gap-3">
                          {COVER_COLORS.map((color) => <button key={color} type="button" onClick={() => updateCoverColor(color)} className={cn("group rounded-xl border p-3 text-left", coverColor === color ? "border-ink-900 ring-1 ring-ink-300" : "border-ink-200 hover:border-brand-200")}><span className="block h-10 rounded-lg" style={{ backgroundColor: color }} /><span className="mt-2 flex items-center justify-between text-xs font-medium text-ink-700">{color}{coverColor === color && <Check className="h-3.5 w-3.5" />}</span></button>)}
                        </div>
                      </TabsContent>
                      <TabsContent value="fonts" className="mt-0 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Cover font pair</p>
                        <button type="button" onClick={() => setExportTheme("minimal")} className={cn("w-full rounded-xl border p-4 text-left", exportTheme === "minimal" ? "border-brand-500 bg-brand-50/40" : "border-ink-200")}><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-ink-900">Professional</p><p className="mt-1 text-xs text-ink-500">Clean, readable, and modern</p></div>{exportTheme === "minimal" && <CheckCircle2 className="h-5 w-5 text-brand-600" />}</div><p className="mt-4 text-xl font-bold text-ink-900">Heading Preview</p><p className="mt-1 text-xs text-ink-500">Body text preview for this pairing.</p></button>
                        <button type="button" onClick={() => setExportTheme("serif")} className={cn("w-full rounded-xl border p-4 text-left", exportTheme === "serif" ? "border-brand-500 bg-brand-50/40" : "border-ink-200")}><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-ink-900">Editorial</p><p className="mt-1 text-xs text-ink-500">Warm, polished, and classic</p></div>{exportTheme === "serif" && <CheckCircle2 className="h-5 w-5 text-brand-600" />}</div><p className="mt-4 font-serif text-xl font-bold text-ink-900">Heading Preview</p><p className="mt-1 font-serif text-xs text-ink-500">Body text preview for this pairing.</p></button>
                      </TabsContent>
                      <TabsContent value="brand" className="mt-0 space-y-5">
                        <div><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Your brand details</p><p className="mt-1 text-sm text-ink-500">Feature your identity on the finished cover.</p></div>
                        <div className="flex items-center justify-between rounded-xl border border-ink-200 p-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{previewTitle.charAt(0).toUpperCase()}</span><div><p className="text-sm font-semibold text-ink-900">Author identity</p><p className="text-xs text-ink-500">Shown at the bottom of your cover</p></div></div><Button variant="ghost" size="sm" onClick={() => setShowBrand(!showBrand)}>{showBrand ? "Hide" : "Show"}</Button></div>
                        <div className="rounded-xl border border-dashed border-ink-300 p-4 text-center"><ImageIcon className="mx-auto h-5 w-5 text-ink-400" /><p className="mt-2 text-sm font-medium text-ink-700">Logo placement</p><p className="mt-1 text-xs text-ink-500">A logo upload can be added after your first export.</p></div>
                      </TabsContent>
                      <p className="mt-5 text-xs leading-relaxed text-ink-500">Accent color is saved to your cover. Layout, font, and brand switches currently update this live preview while export styling stays lightweight.</p>
                      <Button className="mt-4 w-full gap-2" onClick={() => { updateCoverColor(coverColor); toast({ title: "Accent color saved", description: "Your existing cover image and settings were kept." }); }}><ImageIcon className="h-4 w-4" /> Save accent color</Button>
                    </CardContent>
                  </Tabs>
                </Card>

                <Card className="overflow-hidden border-ink-200 shadow-sm">
                  <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3"><span className="text-sm font-semibold text-ink-800">Cover preview</span><span className="text-xs text-ink-400">Live changes</span></div>
                  <CardContent className="flex min-h-[530px] flex-col items-center justify-center bg-[#F8F7F5] p-7">
                    <div className={cn("relative flex w-full max-w-[330px] flex-col overflow-hidden bg-white shadow-xl transition-all duration-300", coverDesign === "banner" ? "aspect-[4/3]" : "aspect-[3/4]")} style={{ fontFamily: exportTheme === "serif" ? "Georgia, serif" : "Inter, sans-serif" }}>
                      <div className={cn("p-7", coverDesign === "centered" && "text-center", coverDesign === "portrait" && "mt-auto", coverDesign === "gradient" && "bg-gradient-to-br from-[#1C2B55] via-[#6338B8] to-[#B343A9] text-white", coverDesign !== "gradient" && "text-white")} style={coverDesign === "gradient" ? undefined : { backgroundColor: coverColor }}>
                        <p className="text-[8px] font-semibold uppercase tracking-[0.18em] opacity-70">PokiPoki presents</p>
                        <h2 className={cn("mt-5 text-2xl font-bold leading-[1.05]", coverDesign === "banner" && "text-xl")}>{previewTitle}</h2>
                        <p className="mt-4 text-xs leading-relaxed opacity-80">{previewSubtitle}</p>
                      </div>
                      {coverDesign !== "banner" && <div className="flex flex-1 flex-col justify-end p-7"><div className="h-1 w-9 rounded-full" style={{ backgroundColor: coverColor }} /><p className="mt-3 text-[9px] text-ink-500">A polished guide created with PokiPoki</p>{showBrand && <p className="mt-6 text-[9px] font-semibold text-ink-700">By {previewTitle.split(" ").slice(0, 2).join(" ")}</p>}</div>}
                    </div>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => toast({ title: "Cover regenerated", description: "A refreshed visual treatment is now in your preview." })}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate cover</Button>
                      <Button variant="outline" size="sm" onClick={() => setMockupReady(!mockupReady)}><Wand2 className="mr-1.5 h-3.5 w-3.5" /> {mockupReady ? "Hide 3D mockup" : "Preview 3D mockup"}</Button>
                    </div>
                    {mockupReady && <div className="mt-5 flex h-20 items-end justify-center gap-1.5"><span className="h-12 w-11 rounded-sm bg-ink-900 shadow-md" /><span className="h-16 w-12 rounded-sm shadow-lg" style={{ backgroundColor: coverColor }} /><span className="h-10 w-10 rounded-sm bg-ink-700 shadow-md" /></div>}
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-500">Everything looks good? Your PDF is ready for the next step.</p>
                <Button size="lg" onClick={exportPdf} disabled={exportProduct.isPending} className="gap-2 rounded-xl px-6">
                  {exportProduct.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Compiling PDF...</> : <><Download className="h-4 w-4" /> Download PDF guide</>}
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </AppLayout>
  );
}