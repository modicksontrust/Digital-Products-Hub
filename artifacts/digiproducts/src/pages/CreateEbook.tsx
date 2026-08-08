import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  useCreateProduct, useGenerateOutline, useGetJob, useGetProduct, 
  useGenerateChapters, useUpdateChapter, useExportProduct,
  useGenerateNicheSuggestions, useGenerateSubtopicSuggestions, useImportManuscript,
  getGetJobQueryKey, getGetProductQueryKey,
  type NicheSuggestionsResponseSubNichesItem,
  type SubtopicSuggestionsResponseSubtopicsItem,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useLocation, useSearch } from "wouter";
import { 
  ChevronRight, Loader2, Sparkles, FileText, Settings, PenTool, Layout, Download,
  GripVertical, Palette,
  AlertCircle, HeartPulse, DollarSign, Users, Flame, Search,
  Wand2, UploadCloud, FileUp, ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function CreateEbook() {
  const searchParams = new URLSearchParams(useSearch());
  const urlProductId = searchParams.get("productId");
  const urlJobId = searchParams.get("jobId");
  
  // Skip the "how do you want to start" choice when resuming an existing
  // product — it only applies to starting a brand new eBook from scratch.
  const [step, setStep] = useState(() => (urlProductId ? (urlJobId ? 3 : 5) : 0));
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const steps = [
    { num: 1, title: "Setup", icon: Search },
    { num: 1.3, title: "Subtopic", icon: Layout },
    { num: 1.6, title: "Topic", icon: Flame },
    { num: 2, title: "Brief", icon: FileText },
    { num: 3, title: "Outline", icon: Layout },
    { num: 4, title: "Generate", icon: Sparkles },
    { num: 5, title: "Editor", icon: PenTool },
    { num: 6, title: "Cover", icon: Settings },
    { num: 7, title: "Export", icon: Download },
  ];

  // Resume state if URL params are present
  useEffect(() => {
    if (urlProductId) {
      if (urlJobId && step <= 2) {
        setStep(3); // Waiting for outline job
      } else if (!urlJobId && step <= 2) {
        setStep(5); // Default to editor if just productId is given
      }
    }
  }, [urlProductId, urlJobId, step]);

  // ==========================================
  // STEP 0: Start With AI vs Upload Manuscript
  // ==========================================
  const [manuscriptTitle, setManuscriptTitle] = useState("");
  const [manuscriptMode, setManuscriptMode] = useState<"upload" | "paste">("upload");
  const [pastedManuscript, setPastedManuscript] = useState("");
  const [uploadedManuscript, setUploadedManuscript] = useState<{ objectPath: string; fileName: string } | null>(null);
  const importManuscript = useImportManuscript();
  const { uploadFile: uploadManuscriptFile, isUploading: isUploadingManuscript } = useUpload({
    onSuccess: (res) => setUploadedManuscript({ objectPath: res.objectPath, fileName: res.metadata.name }),
  });

  const handleStartImport = () => {
    if (!manuscriptTitle.trim()) {
      toast({ title: "Give your eBook a title first", variant: "destructive" });
      return;
    }
    if (manuscriptMode === "upload" && !uploadedManuscript) {
      toast({ title: "Upload a file first", variant: "destructive" });
      return;
    }
    if (manuscriptMode === "paste" && !pastedManuscript.trim()) {
      toast({ title: "Paste your manuscript text first", variant: "destructive" });
      return;
    }
    importManuscript.mutate({
      data: {
        title: manuscriptTitle,
        ...(manuscriptMode === "upload"
          ? { objectPath: uploadedManuscript!.objectPath, fileName: uploadedManuscript!.fileName }
          : { pastedText: pastedManuscript }),
      },
    }, {
      onSuccess: (product) => {
        setLocation(`/create/ebook?productId=${product.id}`);
        setStep(5);
      },
      onError: () => {
        toast({ title: "Couldn't import that manuscript", description: "Try a .docx, .pdf, or pasted text.", variant: "destructive" });
      },
    });
  };

  // ==========================================
  // STEP 1: Niche Picking State
  // ==========================================
  const NICHES: { key: "health_wellness" | "wealth_money" | "relationships"; label: string; description: string; icon: typeof HeartPulse }[] = [
    { key: "health_wellness", label: "Health & Wellness", description: "Weight loss, fitness, mental health, nutrition, sleep, stress management", icon: HeartPulse },
    { key: "wealth_money", label: "Wealth & Money", description: "Side hustles, investing, saving, business, freelancing, crypto", icon: DollarSign },
    { key: "relationships", label: "Relationships", description: "Dating, marriage, parenting, communication, social skills", icon: Users },
  ];
  const [selectedNiche, setSelectedNiche] = useState<typeof NICHES[number]["key"] | null>(null);
  const generateSubtopicSuggestions = useGenerateSubtopicSuggestions();

  const handlePickNiche = (nicheKey: typeof NICHES[number]["key"]) => {
    setSelectedNiche(nicheKey);
    setSelectedSubtopic(null);
    generateSubtopicSuggestions.mutate({ data: { niche: nicheKey } });
  };

  // ==========================================
  // STEP 1.3: Subtopic Picking State
  // ==========================================
  const [selectedSubtopic, setSelectedSubtopic] = useState<SubtopicSuggestionsResponseSubtopicsItem | null>(null);
  const [isWritingOwnSubtopic, setIsWritingOwnSubtopic] = useState(false);
  const [ownSubtopicText, setOwnSubtopicText] = useState("");
  const generateNicheSuggestions = useGenerateNicheSuggestions();

  const handlePickSubtopic = (subtopic: SubtopicSuggestionsResponseSubtopicsItem) => {
    setSelectedSubtopic(subtopic);
    setSelectedSubNiche(null);
    if (selectedNiche) {
      generateNicheSuggestions.mutate({ data: { niche: selectedNiche, subtopic: subtopic.title } });
    }
    setStep(1.6);
  };

  const handlePickOwnSubtopic = () => {
    if (!ownSubtopicText.trim() || !selectedNiche) return;
    const subtopic = { title: ownSubtopicText, description: "" };
    setSelectedSubtopic(subtopic);
    setSelectedSubNiche(null);
    generateNicheSuggestions.mutate({ data: { niche: selectedNiche, subtopic: subtopic.title } });
    setIsWritingOwnSubtopic(false);
    setStep(1.6);
  };

  // ==========================================
  // STEP 1.6: Topic Picking State
  // ==========================================
  const [selectedSubNiche, setSelectedSubNiche] = useState<NicheSuggestionsResponseSubNichesItem | null>(null);
  const [topicSearch, setTopicSearch] = useState("");
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [isWritingOwnTopic, setIsWritingOwnTopic] = useState(false);
  const [ownTopicText, setOwnTopicText] = useState("");

  const handlePickSubNiche = (subNiche: NicheSuggestionsResponseSubNichesItem) => {
    setSelectedSubNiche(subNiche);
    setBrief((f) => ({
      ...f,
      title: f.title || subNiche.suggestedTopic,
      topic: subNiche.suggestedTopic,
      audience: subNiche.suggestedAudience,
    }));
  };

  const sortedTopics = (generateNicheSuggestions.data?.subNiches ?? [])
    .filter((sub) =>
      !topicSearch.trim() ||
      sub.title.toLowerCase().includes(topicSearch.toLowerCase()) ||
      sub.hook.toLowerCase().includes(topicSearch.toLowerCase())
    )
    .slice()
    .sort((a, b) => b.sellabilityScore - a.sellabilityScore);

  const handlePickOwnTopic = () => {
    if (!ownTopicText.trim()) return;
    setSelectedSubNiche({ title: ownTopicText, hook: "", suggestedTopic: ownTopicText, suggestedAudience: "", sellabilityScore: 0 });
    setBrief((f) => ({ ...f, title: f.title || ownTopicText, topic: ownTopicText }));
    setIsWritingOwnTopic(false);
    setStep(2);
  };

  const handleRegenerateTopics = () => {
    if (!selectedNiche) return;
    generateNicheSuggestions.mutate({ data: { niche: selectedNiche, subtopic: selectedSubtopic?.title } });
  };

  const REGIONS: { key: string; label: string; countries: string; description: string }[] = [
    { key: "west_africa", label: "West Africa", countries: "Nigeria, Ghana, Cameroon, Senegal", description: "Direct, urgent. Naira pricing, local references." },
    { key: "east_africa", label: "East Africa", countries: "Kenya, Tanzania, Uganda, Rwanda", description: "Practical, step-by-step. KSh/M-Pesa references." },
    { key: "southern_africa", label: "Southern Africa", countries: "South Africa, Botswana, Zimbabwe, Namibia", description: "Professional, polished. Rand pricing." },
    { key: "african_diaspora", label: "African Diaspora", countries: "UK, US, Canada, Europe", description: "Identity-driven, code-switching. Dual-culture." },
    { key: "global_english", label: "Global English", countries: "West Africa, East Africa, South Africa, Americas, Asia & more", description: "Worldwide English-speaking audience. No local assumptions." },
  ];
  const [selectedRegion, setSelectedRegion] = useState<string>("global_english");

  const LENGTH_TIERS: { key: string; label: string; priceRange: string; wordRange: string; chapterRange: string; description: string; chapterCount: number; recommended?: boolean }[] = [
    { key: "pdf_guide", label: "PDF Guide", priceRange: "$1 – $20", wordRange: "5,000 – 8,000 words", chapterRange: "5-7 chapters", description: "Quick, actionable painkiller guide. Easy to write and sell. Great for first-timers.", chapterCount: 6, recommended: true },
    { key: "playbook", label: "Playbook", priceRange: "$10 – $30", wordRange: "8,000 – 15,000 words", chapterRange: "7-10 chapters", description: "The sweet spot. Deeper than a guide, lighter than a book. Detailed playbook buyers finish.", chapterCount: 9 },
    { key: "full_ebook", label: "Full eBook", priceRange: "$10 – $100", wordRange: "15,000 – 25,000 words", chapterRange: "10-15 chapters", description: "Comprehensive full-length eBook. Deep-dive content with case studies and action plans.", chapterCount: 12 },
  ];
  const [selectedLengthTier, setSelectedLengthTier] = useState<string>("pdf_guide");

  const handleContinueFromNiche = () => {
    const tier = LENGTH_TIERS.find((t) => t.key === selectedLengthTier);
    setBrief((f) => ({
      ...f,
      chapterCount: tier?.chapterCount ?? f.chapterCount,
      region: selectedRegion,
      lengthTier: selectedLengthTier,
    }));
    setStep(1.3);
  };

  // ==========================================
  // STEP 2: Brief State
  // ==========================================
  const [brief, setBrief] = useState({
    title: "", topic: "", audience: "", tone: "professional", chapterCount: 10, depth: "standard", language: "English",
    region: "global_english", lengthTier: "pdf_guide"
  });

  const createProduct = useCreateProduct();
  const generateOutline = useGenerateOutline();

  const handleStartBrief = () => {
    if (!brief.topic) { toast({ title: "Topic required", variant: "destructive" }); return; }
    
    createProduct.mutate({
      data: { type: 'ebook', title: brief.title || 'Untitled Draft', topic: brief.topic, audience: brief.audience, tone: brief.tone, chapterCount: brief.chapterCount, depth: brief.depth, language: brief.language, region: brief.region, lengthTier: brief.lengthTier }
    }, {
      onSuccess: (product) => {
        generateOutline.mutate({ data: { productId: product.id } }, {
          onSuccess: (job) => {
            setLocation(`/create/ebook?productId=${product.id}&jobId=${job.id}`);
            setStep(3);
          }
        });
      }
    });
  };

  // ==========================================
  // STEP 3 & 4: Polling Jobs & Product Data
  // ==========================================
  const { data: job } = useGetJob(urlJobId || '', {
    query: {
      enabled: !!urlJobId && (step === 3 || step === 4),
      refetchInterval: (data) => (data?.state?.data?.status === 'queued' || data?.state?.data?.status === 'running') ? 2000 : false,
      queryKey: getGetJobQueryKey(urlJobId || '')
    }
  });

  const { data: detail, refetch: refetchProduct } = useGetProduct(urlProductId || '', {
    query: { enabled: !!urlProductId, queryKey: getGetProductQueryKey(urlProductId || '') }
  });

  useEffect(() => {
    if (!job) return;
    
    // Outline Job Finished -> Load Outline Step
    if (step === 3 && job.type === 'outline' && job.status === 'succeeded') {
      refetchProduct().then(() => {
        // Clear jobId from URL to stay on outline view
        setLocation(`/create/ebook?productId=${urlProductId}`);
        setStep(3.5); // Custom internal step for "Outline Review"
      });
    }

    // Chapters Job Finished -> Go to Editor Step
    if (step === 4 && job.type === 'chapters' && job.status === 'succeeded') {
      refetchProduct().then(() => {
        setLocation(`/create/ebook?productId=${urlProductId}`);
        setStep(5);
      });
    }

    if (job.status === 'failed') {
      toast({ title: "Job failed", description: job.errorMessage, variant: "destructive" });
      if (step === 4) setStep(5); // Go to editor to retry failed chapters
    }
  }, [job?.status, step]);

  // ==========================================
  // STEP 3.5: Outline Review Actions
  // ==========================================
  const generateChapters = useGenerateChapters();
  const handleStartGeneration = () => {
    if (!urlProductId) return;
    setStep(4);
    generateChapters.mutate({ data: { productId: urlProductId } }, {
      onSuccess: (job) => {
        setLocation(`/create/ebook?productId=${urlProductId}&jobId=${job.id}`);
      }
    });
  };

  // ==========================================
  // STEP 5: Editor State
  // ==========================================
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const selectedChapter = detail?.chapters.find(c => c.id === selectedChapterId);
  const updateChapter = useUpdateChapter();

  useEffect(() => {
    if (step === 5 && detail?.chapters && detail.chapters.length > 0 && !selectedChapterId) {
      setSelectedChapterId(detail.chapters[0].id);
    }
  }, [step, detail?.chapters, selectedChapterId]);

  const handleSaveChapterContent = (contentMd: string) => {
    if (!selectedChapterId || !urlProductId) return;
    updateChapter.mutate({ productId: urlProductId, chapterId: selectedChapterId, data: { contentMd } });
  };

  // ==========================================
  // STEP 6 & 7: Export
  // ==========================================
  const exportProduct = useExportProduct();
  const [exportTheme, setExportTheme] = useState("minimal");
  
  const handleExport = () => {
    if (!urlProductId) return;
    exportProduct.mutate({ productId: urlProductId, data: { format: 'pdf', pageSize: 'a4', theme: exportTheme } }, {
      onSuccess: (record) => {
        toast({ title: "Export ready!" });
        const url = record.downloadUrl.startsWith('/api') ? import.meta.env.BASE_URL + record.downloadUrl.slice(1) : record.downloadUrl;
        window.open(url, '_blank');
      }
    });
  };


  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-paper">
        {/* Wizard Header */}
        <div className="bg-white border-b sticky top-16 z-20 px-8 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <h1 className="font-display font-bold text-xl text-ink-900">eBook Generator</h1>
            {step > 0 && (
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer",
                    (step === s.num || (step === 3.5 && s.num === 3)) ? "bg-brand-100 text-brand-700" :
                    step > s.num ? "text-brand-500 hover:bg-brand-50" : "text-ink-400"
                  )}
                  onClick={() => {
                    // Allow jumping back if product exists
                    if (urlProductId && s.num <= step) setStep(s.num);
                  }}>
                    <s.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{s.title}</span>
                  </div>
                  {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-ink-300 mx-1" />}
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* Wizard Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className={cn("mx-auto w-full", step === 5 ? "max-w-7xl" : "max-w-4xl")}>

            {/* STEP 0: START WITH AI OR UPLOAD YOUR OWN */}
            {step === 0 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 max-w-3xl mx-auto">
                <div className="text-center mb-2">
                  <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">How would you like to create your eBook?</h2>
                  <p className="text-ink-500">Choose the path that fits you best. You can always save and come back anytime.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <Card
                    className="cursor-pointer border-2 border-brand-500 rounded-2xl shadow-soft hover:shadow-md transition-all bg-gradient-to-br from-brand-50/60 to-white"
                    onClick={() => setStep(1)}
                  >
                    <CardContent className="p-6">
                      <Badge className="bg-brand-500 text-white border-0 mb-4">Recommended</Badge>
                      <div className="w-11 h-11 rounded-xl bg-brand-500 text-white flex items-center justify-center mb-4">
                        <Wand2 className="w-5 h-5" />
                      </div>
                      <h3 className="font-display font-bold text-xl text-ink-900 mb-1">Let AI write it for me</h3>
                      <p className="text-sm text-ink-500 leading-snug mb-4">Pick a niche and topic. Our AI researches, outlines, and writes the full book for you.</p>
                      <div className="text-sm font-semibold text-brand-600 flex items-center gap-1">
                        Start with AI <ChevronRight className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className="cursor-pointer border-2 border-ink-200 rounded-2xl shadow-sm hover:shadow-md transition-all"
                    onClick={() => setStep(1.5)}
                  >
                    <CardContent className="p-6">
                      <div className="w-11 h-11 rounded-xl bg-ink-50 text-ink-500 flex items-center justify-center mb-4">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <h3 className="font-display font-bold text-xl text-ink-900 mb-1">I already have a manuscript</h3>
                      <p className="text-sm text-ink-500 leading-snug mb-4">Upload or paste your existing manuscript. We'll detect chapters and let you design the cover.</p>
                      <div className="text-sm font-semibold text-ink-600 flex items-center gap-1">
                        Import manuscript <ChevronRight className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-center text-xs text-ink-400">Both paths include AI cover design, sales page generation, and a shareable product link.</p>
              </div>
            )}

            {/* STEP 1.5: IMPORT MANUSCRIPT */}
            {step === 1.5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 max-w-2xl mx-auto">
                <button
                  className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div>
                  <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Import Your Manuscript</h2>
                  <p className="text-ink-500">Upload a .docx or .pdf, or paste your text directly. We'll split it into chapters automatically.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">eBook Title</Label>
                  <Input
                    className="h-12 rounded-xl bg-ink-50/50"
                    placeholder="e.g. The Complete Guide to Freelance Writing"
                    value={manuscriptTitle}
                    onChange={(e) => setManuscriptTitle(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 border-b border-ink-100">
                  <button
                    className={cn("px-4 py-2 text-sm font-semibold border-b-2 -mb-px", manuscriptMode === "upload" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-400")}
                    onClick={() => setManuscriptMode("upload")}
                  >
                    Upload file
                  </button>
                  <button
                    className={cn("px-4 py-2 text-sm font-semibold border-b-2 -mb-px", manuscriptMode === "paste" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-400")}
                    onClick={() => setManuscriptMode("paste")}
                  >
                    Paste text
                  </button>
                </div>

                {manuscriptMode === "upload" ? (
                  <label className={cn(
                    "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-10 cursor-pointer text-center transition-colors",
                    uploadedManuscript ? "border-brand-400 bg-brand-50/40" : "border-ink-200 hover:border-brand-300"
                  )}>
                    <input
                      type="file"
                      accept=".docx,.pdf,.txt,.md"
                      className="hidden"
                      disabled={isUploadingManuscript}
                      onChange={(e) => e.target.files?.[0] && uploadManuscriptFile(e.target.files[0])}
                    />
                    {isUploadingManuscript ? (
                      <>
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        <span className="text-sm text-ink-500">Uploading...</span>
                      </>
                    ) : uploadedManuscript ? (
                      <>
                        <FileUp className="w-8 h-8 text-brand-500" />
                        <span className="text-sm font-semibold text-ink-800">{uploadedManuscript.fileName}</span>
                        <span className="text-xs text-ink-400">Click to replace</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-ink-400" />
                        <span className="text-sm font-medium text-ink-600">Click to upload .docx or .pdf</span>
                      </>
                    )}
                  </label>
                ) : (
                  <Textarea
                    className="min-h-[240px] rounded-xl"
                    placeholder="Paste your full manuscript text here..."
                    value={pastedManuscript}
                    onChange={(e) => setPastedManuscript(e.target.value)}
                  />
                )}

                <div className="flex justify-end">
                  <Button
                    size="lg"
                    className="h-12 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft"
                    onClick={handleStartImport}
                    disabled={importManuscript.isPending || isUploadingManuscript}
                  >
                    {importManuscript.isPending ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Importing...</>
                    ) : (
                      <><FileUp className="w-5 h-5 mr-2" /> Import & Continue</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 1: SETUP (niche + region + length/price) */}
            {step === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Choose Your Niche</h2>
                    <p className="text-ink-500">Pick a niche, then set your target region and book length before the AI ranks topic ideas for you.</p>
                  </div>
                  <button
                    className="shrink-0 text-sm font-medium text-ink-500 hover:text-brand-600 underline underline-offset-2"
                    onClick={() => setStep(2)}
                  >
                    I have my own topic
                  </button>
                </div>

                <div className="grid sm:grid-cols-3 gap-5">
                  {NICHES.map((niche) => (
                    <Card
                      key={niche.key}
                      className={cn(
                        "cursor-pointer border-2 rounded-2xl shadow-sm transition-all hover:shadow-md",
                        selectedNiche === niche.key ? "border-brand-500 bg-brand-50/40" : "border-ink-200"
                      )}
                      onClick={() => handlePickNiche(niche.key)}
                    >
                      <CardContent className="p-6">
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center mb-4",
                          selectedNiche === niche.key ? "bg-brand-500 text-white" : "bg-ink-50 text-ink-500"
                        )}>
                          <niche.icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-display font-bold text-lg text-ink-900 mb-1">{niche.label}</h3>
                        <p className="text-sm text-ink-500 leading-snug">{niche.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selectedNiche && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <h3 className="text-xl font-display font-bold text-ink-900">Target Region</h3>
                      <p className="text-sm text-ink-500">This controls language style, pricing references, and cultural tone throughout your eBook.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {REGIONS.map((region) => (
                        <Card
                          key={region.key}
                          className={cn(
                            "cursor-pointer border-ink-200 shadow-sm hover:shadow-md transition-all rounded-2xl",
                            selectedRegion === region.key && "border-brand-500 bg-brand-50/40"
                          )}
                          onClick={() => setSelectedRegion(region.key)}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-ink-900">{region.label}</h4>
                              {selectedRegion === region.key && (
                                <Badge className="bg-brand-500 text-white border-0 shrink-0">Selected</Badge>
                              )}
                            </div>
                            <p className="text-xs text-ink-400 mb-1">{region.countries}</p>
                            <p className="text-sm text-ink-500 leading-snug">{region.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNiche && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <h3 className="text-xl font-display font-bold text-ink-900">Book Length &amp; Price</h3>
                      <p className="text-sm text-ink-500">Choose a content tier for book length, then set your pricing.</p>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      {LENGTH_TIERS.map((tier) => (
                        <Card
                          key={tier.key}
                          className={cn(
                            "cursor-pointer border-2 rounded-2xl shadow-sm hover:shadow-md transition-all relative",
                            selectedLengthTier === tier.key ? "border-brand-500 bg-brand-50/40" : "border-ink-200"
                          )}
                          onClick={() => setSelectedLengthTier(tier.key)}
                        >
                          {tier.recommended && (
                            <Badge className="absolute -top-2.5 left-4 bg-gold-500 text-white border-0">Recommended</Badge>
                          )}
                          <CardContent className="p-5 pt-6">
                            <h4 className="font-display font-bold text-ink-900 mb-1">{tier.label}</h4>
                            <p className="text-sm font-semibold text-brand-600 mb-2">{tier.priceRange}</p>
                            <ul className="text-xs text-ink-500 space-y-0.5 mb-3">
                              <li>{tier.wordRange}</li>
                              <li>{tier.chapterRange}</li>
                            </ul>
                            <p className="text-xs text-ink-500 leading-snug">{tier.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        size="lg"
                        className="h-12 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft"
                        onClick={handleContinueFromNiche}
                      >
                        Continue <ChevronRight className="w-5 h-5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 1.3: SUBTOPIC PICKING */}
            {step === 1.3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Pick a Subtopic</h2>
                    <p className="text-ink-500">
                      Choose the area of {NICHES.find((n) => n.key === selectedNiche)?.label} to focus on before we suggest specific eBook topics.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0 rounded-xl"
                    onClick={() => setIsWritingOwnSubtopic((v) => !v)}
                  >
                    <PenTool className="w-4 h-4 mr-2" /> Write my own
                  </Button>
                </div>

                {isWritingOwnSubtopic ? (
                  <Card className="border-ink-200 rounded-2xl">
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <Label htmlFor="own-subtopic" className="mb-2 block">Your subtopic</Label>
                        <Input
                          id="own-subtopic"
                          placeholder="e.g. Sex &amp; Intimacy"
                          value={ownSubtopicText}
                          onChange={(e) => setOwnSubtopicText(e.target.value)}
                          autoFocus
                        />
                        <p className="text-xs text-ink-400 mt-2">The AI will suggest specific eBook topics inside this subtopic next.</p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsWritingOwnSubtopic(false)}>Cancel</Button>
                        <Button
                          className="bg-brand-500 hover:bg-brand-600 text-white"
                          disabled={!ownSubtopicText.trim()}
                          onClick={handlePickOwnSubtopic}
                        >
                          Use This Subtopic <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {generateSubtopicSuggestions.isPending && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="h-24 rounded-2xl bg-ink-100 animate-pulse" />
                        ))}
                      </div>
                    )}

                    {generateSubtopicSuggestions.isError && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" /> Couldn't fetch subtopic suggestions.
                        <Button variant="link" className="h-auto p-0" onClick={() => selectedNiche && handlePickNiche(selectedNiche)}>Try again</Button>
                      </div>
                    )}

                    {generateSubtopicSuggestions.data && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {generateSubtopicSuggestions.data.subtopics.map((sub, i) => (
                          <Card
                            key={i}
                            className="cursor-pointer border-ink-200 shadow-sm hover:shadow-md transition-all rounded-2xl"
                            onClick={() => handlePickSubtopic(sub)}
                          >
                            <CardContent className="p-5">
                              <h4 className="font-semibold text-ink-900 mb-1">{sub.title}</h4>
                              <p className="text-sm text-ink-500 leading-snug">{sub.description}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* STEP 1.6: TOPIC PICKING */}
            {step === 1.6 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Pick a Topic</h2>
                    <p className="text-ink-500">
                      {selectedSubtopic ? <>Ranked by sellability, inside <span className="font-semibold text-ink-700">{selectedSubtopic.title}</span></> : "Ranked by sellability"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0 rounded-xl"
                    onClick={() => setIsWritingOwnTopic((v) => !v)}
                  >
                    <PenTool className="w-4 h-4 mr-2" /> Write my own
                  </Button>
                </div>

                {isWritingOwnTopic ? (
                  <Card className="border-ink-200 rounded-2xl">
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <Label htmlFor="own-topic" className="mb-2 block">Your eBook topic</Label>
                        <Input
                          id="own-topic"
                          placeholder="e.g. The Zero Capital Side Hustle Guide"
                          value={ownTopicText}
                          onChange={(e) => setOwnTopicText(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsWritingOwnTopic(false)}>Cancel</Button>
                        <Button
                          className="bg-brand-500 hover:bg-brand-600 text-white"
                          disabled={!ownTopicText.trim()}
                          onClick={handlePickOwnTopic}
                        >
                          Use This Topic <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                      <Input
                        placeholder="Search topics..."
                        value={topicSearch}
                        onChange={(e) => setTopicSearch(e.target.value)}
                        className="pl-10 h-11 rounded-xl"
                      />
                    </div>

                    {generateNicheSuggestions.isPending && (
                      <div className="grid gap-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="h-28 rounded-2xl bg-ink-100 animate-pulse" />
                        ))}
                      </div>
                    )}

                    {generateNicheSuggestions.isError && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" /> Couldn't fetch topic ideas.
                        <Button variant="link" className="h-auto p-0" onClick={handleRegenerateTopics}>Try again</Button>
                      </div>
                    )}

                    {generateNicheSuggestions.data && (
                      <>
                        <div className="space-y-3">
                          {sortedTopics.slice(0, showAllTopics ? undefined : 6).map((sub, i) => (
                            <Card
                              key={i}
                              className={cn(
                                "cursor-pointer border-ink-200 shadow-sm hover:shadow-md transition-all rounded-2xl",
                                selectedSubNiche?.title === sub.title && "border-brand-500 bg-brand-50/40"
                              )}
                              onClick={() => handlePickSubNiche(sub)}
                            >
                              <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-3 mb-1">
                                  <h4 className="font-semibold text-ink-900">{sub.title}</h4>
                                  <Badge className={cn(
                                    "shrink-0 gap-1 border-0",
                                    sub.sellabilityScore >= 80 ? "bg-lime-100 text-lime-700" :
                                    sub.sellabilityScore >= 60 ? "bg-gold-50 text-gold-700" : "bg-ink-100 text-ink-500"
                                  )}>
                                    <Flame className="w-3 h-3" /> {sub.sellabilityScore}
                                  </Badge>
                                </div>
                                <p className="text-sm text-ink-500 leading-snug mb-3">{sub.hook}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  <Badge variant="secondary" className="text-xs font-normal">{sub.suggestedAudience}</Badge>
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {LENGTH_TIERS.find((t) => t.key === selectedLengthTier)?.label}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {REGIONS.find((r) => r.key === selectedRegion)?.label}
                                  </Badge>
                                  {sub.trending && (
                                    <Badge className="bg-gold-50 text-gold-700 border-gold-200 text-xs font-normal gap-1">
                                      <Flame className="w-3 h-3" /> Trending
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {!showAllTopics && sortedTopics.length > 6 && (
                          <div className="text-center">
                            <button
                              className="text-sm font-medium text-brand-600 hover:text-brand-700 underline underline-offset-2"
                              onClick={() => setShowAllTopics(true)}
                            >
                              Show All {sortedTopics.length} Topics
                            </button>
                          </div>
                        )}

                        {sortedTopics.length === 0 && (
                          <p className="text-center text-sm text-ink-400 py-6">No topics match your search.</p>
                        )}

                        <div className="flex justify-center pt-2">
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            disabled={generateNicheSuggestions.isPending}
                            onClick={handleRegenerateTopics}
                          >
                            {generateNicheSuggestions.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            Generate Fresh AI Ideas
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {selectedSubNiche && !isWritingOwnTopic && (
                  <div className="flex justify-end pt-2">
                    <Button
                      size="lg"
                      className="h-12 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft"
                      onClick={() => setStep(2)}
                    >
                      Continue <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: BRIEF */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="mb-6">
                  <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Project Brief</h2>
                  <p className="text-ink-500">Provide the core parameters to instruct the AI.</p>
                </div>

                <Card className="border-ink-200 shadow-sm rounded-2xl overflow-hidden">
                  <div className="h-2 grad-create" />
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-base font-semibold">Working Title (Optional)</Label>
                      <Input 
                        id="title" 
                        placeholder="e.g. The Ultimate Guide to Plant Care" 
                        className="h-12 rounded-xl bg-ink-50/50"
                        value={brief.title}
                        onChange={e => setBrief({...brief, title: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="topic" className="text-base font-semibold flex items-center gap-2">
                        Core Topic <span className="text-destructive">*</span>
                      </Label>
                      <Textarea 
                        id="topic" 
                        placeholder="What is this book about? Be specific about the problem it solves." 
                        className="min-h-[120px] rounded-xl bg-ink-50/50 resize-y"
                        value={brief.topic}
                        onChange={e => setBrief({...brief, topic: e.target.value})}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Target Audience</Label>
                        <Input 
                          placeholder="e.g. Beginner houseplant owners" 
                          className="h-12 rounded-xl bg-ink-50/50"
                          value={brief.audience}
                          onChange={e => setBrief({...brief, audience: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Voice & Tone</Label>
                        <Select value={brief.tone} onValueChange={v => setBrief({...brief, tone: v})}>
                          <SelectTrigger className="h-12 rounded-xl bg-ink-50/50">
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="professional">Professional & Authoritative</SelectItem>
                            <SelectItem value="conversational">Conversational & Friendly</SelectItem>
                            <SelectItem value="academic">Academic & Analytical</SelectItem>
                            <SelectItem value="bold">Bold & Provocative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-ink-100">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-base font-semibold">Chapter Count</Label>
                          <span className="font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-md">{brief.chapterCount}</span>
                        </div>
                        <Slider 
                          value={[brief.chapterCount]} 
                          onValueChange={v => setBrief({...brief, chapterCount: v[0]})} 
                          max={20} min={3} step={1} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Content Depth</Label>
                        <Select value={brief.depth} onValueChange={v => setBrief({...brief, depth: v})}>
                          <SelectTrigger className="h-12 rounded-xl bg-ink-50/50">
                            <SelectValue placeholder="Select depth" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="short">Short (~500 words/chapter)</SelectItem>
                            <SelectItem value="standard">Standard (~1000 words)</SelectItem>
                            <SelectItem value="deep">Deep Dive (~1500 words)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gold-50 text-gold-700 rounded-xl border border-gold-200">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold">Est. Cost: {1 + brief.chapterCount} credits</span>
                  </div>
                  <Button 
                    size="lg" 
                    className="h-12 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft"
                    onClick={handleStartBrief}
                    disabled={createProduct.isPending || generateOutline.isPending}
                  >
                    {(createProduct.isPending || generateOutline.isPending) ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-5 h-5 mr-2" /> Generate Outline</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: GENERATING OUTLINE */}
            {step === 3 && (
              <div className="py-32 max-w-md mx-auto text-center animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Layout className="w-10 h-10 text-brand-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">Structuring your book</h2>
                <p className="text-ink-500 mb-8">The AI is crafting the perfect outline based on your brief...</p>
                <Progress value={100} className="h-2 bg-brand-100 [&>div]:bg-brand-500 animate-pulse" />
              </div>
            )}

            {/* STEP 3.5: REVIEW OUTLINE */}
            {step === 3.5 && detail && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="mb-6 flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Review Outline</h2>
                    <p className="text-ink-500">Edit, reorder, or approve the generated chapter structure.</p>
                  </div>
                  <Button 
                    size="lg" 
                    className="h-12 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft"
                    onClick={handleStartGeneration}
                  >
                    Approve & Write Chapters <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {detail.chapters.sort((a,b) => a.orderIndex - b.orderIndex).map((chapter, i) => (
                    <Card key={chapter.id} className="border-ink-200 shadow-sm group">
                      <CardContent className="p-4 flex gap-4">
                        <div className="cursor-grab pt-1 text-ink-300 hover:text-ink-500">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <Input 
                            value={chapter.title} 
                            className="font-semibold text-lg border-transparent hover:border-ink-200 focus:border-brand-500 px-2 -ml-2 h-8 mb-1 bg-transparent"
                            readOnly
                          />
                          <Textarea 
                            value={chapter.summary || ''} 
                            className="text-ink-600 text-sm border-transparent hover:border-ink-200 focus:border-brand-500 px-2 -ml-2 min-h-0 h-auto resize-none bg-transparent"
                            readOnly
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-center pt-4">
                  <Button variant="outline" className="rounded-xl border-dashed border-ink-300 text-ink-500 hover:text-brand-600 hover:border-brand-300">
                    + Add Chapter Manually
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: WRITING CHAPTERS */}
            {step === 4 && (
              <div className="py-20 max-w-md mx-auto text-center animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PenTool className="w-10 h-10 text-brand-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">Writing chapters</h2>
                <p className="text-ink-500 mb-8">{job?.progressLabel || "Generating content..."}</p>
                
                <Progress 
                  value={job?.totalUnits ? ((job.completedUnits || 0) / job.totalUnits) * 100 : undefined} 
                  className="h-2 bg-brand-100 [&>div]:bg-brand-500" 
                />

                <div className="mt-8 text-left border rounded-xl p-4 bg-white shadow-sm space-y-2 h-48 overflow-auto">
                  {job?.chapterStatuses?.map(cs => (
                    <div key={cs.chapterId} className="flex justify-between items-center text-sm">
                      <span className="truncate pr-4 font-medium text-ink-700">{cs.title}</span>
                      <Badge variant="outline" className={cn(
                        cs.status === 'succeeded' || cs.status === 'ready' ? "bg-lime-50 text-lime-700 border-lime-200" :
                        cs.status === 'failed' ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-brand-50 text-brand-700 border-brand-200"
                      )}>
                        {cs.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: EDITOR */}
            {step === 5 && detail && (
              <div className="flex gap-6 h-[calc(100vh-140px)] animate-in fade-in">
                {/* Sidebar */}
                <div className="w-72 flex flex-col gap-4">
                  <div className="bg-white border rounded-2xl shadow-sm p-4 flex flex-col h-full overflow-hidden">
                    <h3 className="font-semibold text-ink-900 mb-3 px-2">Chapters</h3>
                    <div className="flex-1 overflow-auto space-y-1">
                      {detail.chapters.sort((a,b) => a.orderIndex - b.orderIndex).map(chapter => (
                        <button
                          key={chapter.id}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors",
                            selectedChapterId === chapter.id 
                              ? "bg-brand-50 text-brand-700 font-semibold" 
                              : "text-ink-600 hover:bg-ink-50"
                          )}
                          onClick={() => setSelectedChapterId(chapter.id)}
                        >
                          <div className="truncate">{chapter.orderIndex + 1}. {chapter.title}</div>
                          <div className="text-xs font-normal opacity-70 flex justify-between mt-1">
                            <span>{chapter.wordCount} words</span>
                            {chapter.status !== 'ready' && <span className="text-amber-600">{chapter.status}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-ink-900 hover:bg-ink-800 text-white rounded-xl shadow-soft"
                    onClick={() => setStep(6)}
                  >
                    Proceed to Design <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 bg-white border rounded-2xl shadow-sm flex flex-col overflow-hidden">
                  <div className="border-b p-4 flex justify-between items-center bg-ink-50/50">
                    <h3 className="font-bold text-lg text-ink-900 truncate pr-4">{selectedChapter?.title}</h3>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="rounded-lg h-8 bg-white">
                        <Sparkles className="w-3 h-3 mr-2 text-brand-500" /> AI Rewrite
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-lg h-8 bg-white text-ink-500">
                        Saved
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 p-6 overflow-auto">
                    {selectedChapter?.status === 'ready' ? (
                      <Textarea 
                        key={selectedChapterId}
                        className="min-h-full border-0 focus-visible:ring-0 text-base leading-relaxed p-0 resize-none font-sans"
                        defaultValue={selectedChapter?.contentMd || ''}
                        onChange={(e) => {
                          // Simple debounced save logic would go here
                          // handleSaveChapterContent(e.target.value)
                        }}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-ink-500">
                        <AlertCircle className="w-10 h-10 mb-4 text-amber-500" />
                        <p>This chapter is not ready yet.</p>
                        <p className="text-sm">Status: {selectedChapter?.status}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: COVER & STEP 7: EXPORT */}
            {(step === 6 || step === 7) && detail && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Design & Export</h2>
                    <p className="text-ink-500">Choose a theme and generate the final PDF.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Preview pane */}
                  <div className="bg-ink-100 rounded-2xl p-8 flex items-center justify-center border border-ink-200 shadow-inner">
                    <div 
                      className="w-[210px] h-[297px] bg-white shadow-xl flex flex-col transition-all duration-300 relative overflow-hidden"
                      style={{ 
                        fontFamily: exportTheme === 'serif' ? 'Georgia, serif' : 'Inter, sans-serif'
                      }}
                    >
                      <div 
                        className="h-1/2 w-full transition-colors duration-300"
                        style={{ backgroundColor: ((detail.product.coverConfig as any)?.primaryColor) || '#1FA06B' }}
                      />
                      <div className="p-4 flex flex-col justify-center flex-1 bg-white relative z-10 -mt-8 rounded-t-xl mx-2 shadow-sm">
                        <h3 className="font-bold text-ink-900 leading-tight mb-1 text-sm">{detail.product.title}</h3>
                        <p className="text-[8px] text-ink-500 uppercase tracking-widest">{detail.product.ownerName}</p>
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

                        <h3 className="font-semibold text-ink-900 mb-3 text-sm">Cover Accent Color</h3>
                        <div className="flex gap-3">
                          {['#1FA06B', '#2E8B9E', '#D9A02B', '#7CB518', '#06251C', '#D64545'].map(color => (
                            <button
                              key={color}
                              className={cn(
                                "w-8 h-8 rounded-full shadow-sm border-2 transition-transform hover:scale-110",
                                ((detail.product.coverConfig as any)?.primaryColor) === color ? "border-ink-900 scale-110" : "border-transparent"
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => {
                                // optimistic update could go here, omitting for brevity
                              }}
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
                        <><Download className="w-5 h-5 mr-2" /> Download PDF Book</>
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
