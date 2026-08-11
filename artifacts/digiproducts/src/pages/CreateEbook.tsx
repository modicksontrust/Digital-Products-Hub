import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  useCreateProduct, useUpdateProduct, useGenerateOutline, useGetJob, useGetProduct, 
  useGenerateChapters, useUpdateChapter, useExportProduct,
  useGenerateNicheSuggestions, useGenerateSubtopicSuggestions, useImportManuscript,
  useGetProductCovers, useGenerateProductCover, useRegisterUploadedCover, useSelectProductCover,
  useGetSalesCopy, useGenerateSalesCopy, useUpdateSalesCopy, usePublishProduct, useUnpublishProduct,
  useGeneratePreviewToken,
  getGetJobQueryKey, getGetProductQueryKey, getGetProductCoversQueryKey, getGetSalesCopyQueryKey,
  type NicheSuggestionsResponseSubNichesItem,
  type SubtopicSuggestionsResponseSubtopicsItem,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useLocation, useSearch } from "wouter";
import { 
  ChevronRight, Loader2, Sparkles, FileText, Settings, PenTool, Layout, Download, Eye,
  GripVertical, Palette,
  AlertCircle, HeartPulse, DollarSign, Users, Flame, Search,
  Wand2, UploadCloud, FileUp, ArrowLeft, Check, RefreshCw, ImageIcon,
  AlertTriangle, Crop, ZoomIn, ZoomOut, CheckCircle2, Trash2, Plus, Link2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { COVER_STYLE_OPTIONS } from "@/lib/coverStyles";
import { SalesPagePreview } from "@/components/SalesPagePreview";

export default function CreateEbook() {
  const searchParams = new URLSearchParams(useSearch());
  const urlProductId = searchParams.get("productId");
  const urlJobId = searchParams.get("jobId");
  
  // Skip the "how do you want to start" choice when resuming an existing
  // product — it only applies to starting a brand new eBook from scratch.
  const [step, setStep] = useState(() => (urlProductId ? (urlJobId ? 3 : 5) : 0));
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // 5-step display bar — each entry covers a range of internal step numbers.
  // Internal steps (0, 1, 1.3, 1.5, 1.6, 2, 3, 3.5, 4, 5, 6, 7, 8) don't change;
  // only how progress is counted and shown in the bar changes.
  const displaySteps = [
    { label: "Setup",   navStep: 1,   active: step >= 1 && step < 3,  complete: step >= 3 },
    { label: "Outline", navStep: 3.5, active: step >= 3 && step < 4,  complete: step >= 4 },
    { label: "Write",   navStep: 5,   active: step >= 4 && step < 6,  complete: step >= 6 },
    { label: "Cover",   navStep: 6,   active: step >= 6 && step < 7,  complete: step >= 7 },
    { label: "Publish", navStep: 8,   active: step >= 7,              complete: false     },
  ];

  // Simulated percentage progress for the outline-generation loading screen.
  // The outline job doesn't report a numeric percent, so we ramp toward ~92%
  // while waiting and snap to 100% once the job actually succeeds.
  const [outlineProgress, setOutlineProgress] = useState(0);
  useEffect(() => {
    if (step !== 3) {
      setOutlineProgress(0);
      return;
    }
    setOutlineProgress((p) => (p > 0 ? p : 8));
    const interval = setInterval(() => {
      setOutlineProgress((p) => {
        if (p >= 92) return p;
        const increment = p < 50 ? 6 : p < 75 ? 3 : 1;
        return Math.min(92, p + increment);
      });
    }, 400);
    return () => clearInterval(interval);
  }, [step]);

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
        setStep(3.5); // Review Outline — let the author confirm the detected chapters before editing
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
    title: "", authorName: "", topic: "", audience: "", tone: "professional", chapterCount: 10, depth: "standard", language: "English",
    region: "global_english", lengthTier: "pdf_guide"
  });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const generateOutline = useGenerateOutline();

  // Lets the user save whatever they've picked so far (niche, subtopic, topic,
  // or brief details) as a draft product at any point before generation starts,
  // so it shows up in the Products library instead of being lost on navigation.
  const handleSaveDraft = () => {
    const tier = LENGTH_TIERS.find((t) => t.key === selectedLengthTier);
    const topic = brief.topic || selectedSubNiche?.suggestedTopic || selectedSubtopic?.title
      || NICHES.find((n) => n.key === selectedNiche)?.label || "Untitled draft";
    const title = brief.title || selectedSubNiche?.title || topic;
    const payload = {
      title,
      authorName: brief.authorName || undefined,
      topic,
      audience: brief.audience || selectedSubNiche?.suggestedAudience || undefined,
      tone: brief.tone,
      language: brief.language,
      depth: brief.depth,
      region: selectedRegion,
      lengthTier: selectedLengthTier,
      chapterCount: tier?.chapterCount ?? brief.chapterCount,
    };

    if (urlProductId) {
      updateProduct.mutate({ productId: urlProductId, data: payload }, {
        onSuccess: () => {
          toast({ title: "Draft saved", description: "Find it anytime in your Products library." });
          setLocation("/products");
        }
      });
    } else {
      createProduct.mutate({ data: { type: 'ebook', ...payload } }, {
        onSuccess: () => {
          toast({ title: "Draft saved", description: "Find it anytime in your Products library." });
          setLocation("/products");
        }
      });
    }
  };

  const handleStartBrief = () => {
    if (!brief.topic) { toast({ title: "Topic required", variant: "destructive" }); return; }
    
    createProduct.mutate({
      data: { type: 'ebook', title: brief.title || 'Untitled Draft', authorName: brief.authorName || undefined, topic: brief.topic, audience: brief.audience, tone: brief.tone, chapterCount: brief.chapterCount, depth: brief.depth, language: brief.language, region: brief.region, lengthTier: brief.lengthTier }
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
      setOutlineProgress(100);
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
  // STEP 6: AI Cover Generation
  // ==========================================
  const queryClient = useQueryClient();
  const [pendingStyleKey, setPendingStyleKey] = useState<string | null>(null);
  const [pendingStyleLabel, setPendingStyleLabel] = useState<string | null>(null);
  const [coverStage, setCoverStage] = useState<"picking" | "generating" | "result" | "failed" | "editing">("picking");
  const [editingCover, setEditingCover] = useState<{ id: string; imageUrl: string; styleLabel: string } | null>(null);

  const { data: savedCovers = [] } = useGetProductCovers(urlProductId ?? "", {
    query: { enabled: !!urlProductId && step >= 6, queryKey: getGetProductCoversQueryKey(urlProductId || "") },
  });
  const activeCoverConfig = (detail?.product.coverConfig ?? null) as { coverId?: string; imageUrl?: string; styleKey?: string } | null;
  const activeCover = savedCovers.find((c) => c.id === activeCoverConfig?.coverId) ?? savedCovers[0];

  useEffect(() => {
    if (step === 6 && activeCoverConfig?.imageUrl) {
      setCoverStage("result");
    }
  }, [step, activeCoverConfig?.imageUrl]);

  const generateCover = useGenerateProductCover();
  const registerUploadedCover = useRegisterUploadedCover();
  const selectCover = useSelectProductCover();
  const { uploadFile: uploadCoverFile, isUploading: isUploadingCover } = useUpload({
    onSuccess: (res) => {
      if (!urlProductId) return;
      registerUploadedCover.mutate({ productId: urlProductId, data: { objectPath: res.objectPath } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(urlProductId) });
          queryClient.invalidateQueries({ queryKey: getGetProductCoversQueryKey(urlProductId) });
          setCoverStage("result");
        },
      });
    },
  });

  const handlePickStyle = (styleKey: string, styleLabel: string) => {
    if (!urlProductId) return;
    setPendingStyleKey(styleKey);
    setPendingStyleLabel(styleLabel);
    setCoverStage("generating");
    generateCover.mutate({ productId: urlProductId, data: { styleKey, styleLabel } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(urlProductId) });
        queryClient.invalidateQueries({ queryKey: getGetProductCoversQueryKey(urlProductId) });
        setCoverStage("result");
      },
      onError: () => {
        setCoverStage("failed");
      },
    });
  };

  const handleRetryStyle = () => {
    if (pendingStyleKey && pendingStyleLabel) {
      handlePickStyle(pendingStyleKey, pendingStyleLabel);
    }
  };

  const handleSelectSavedCover = (coverId: string) => {
    if (!urlProductId) return;
    selectCover.mutate({ productId: urlProductId, coverId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(urlProductId) });
        setCoverStage("result");
      },
    });
  };

  // ==========================================
  // STEP 8: Publish (Sales Page)
  // ==========================================
  const [salesCopyJobId, setSalesCopyJobId] = useState<string | null>(null);
  const [price, setPrice] = useState("17");
  const [showPreview, setShowPreview] = useState(false);
  const [priceInitialized, setPriceInitialized] = useState(false);

  const { data: salesCopy, refetch: refetchSalesCopy } = useGetSalesCopy(urlProductId || "", {
    query: { enabled: !!urlProductId && step === 8, queryKey: getGetSalesCopyQueryKey(urlProductId || "") },
  });
  const { data: salesCopyJob } = useGetJob(salesCopyJobId || "", {
    query: {
      enabled: !!salesCopyJobId,
      refetchInterval: (data) => (data?.state?.data?.status === "queued" || data?.state?.data?.status === "running") ? 2000 : false,
      queryKey: getGetJobQueryKey(salesCopyJobId || ""),
    },
  });
  const generateSalesCopy = useGenerateSalesCopy();
  const updateSalesCopyMutation = useUpdateSalesCopy();
  const publishProduct = usePublishProduct();
  const unpublishProduct = useUnpublishProduct();
  const generatePreviewTokenMutation = useGeneratePreviewToken();

  // Local editable copy state
  const [editCopy, setEditCopy] = useState<{
    headline: string;
    subheadline: string;
    bullets: string[];
    whoItsFor: string;
    faq: { question: string; answer: string }[];
    ctaText: string;
    suggestedPriceBand: string;
  } | null>(null);
  const [copyDirty, setCopyDirty] = useState(false);

  // Pre-regeneration snapshot stored in sessionStorage so it survives
  // within-tab navigation and accidental back-button presses.
  const [preRegenerationCopy, setPreRegenerationCopy] = useState<typeof editCopy>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);

  useEffect(() => {
    if (!salesCopyJob) return;
    if (salesCopyJob.status === "succeeded") {
      refetchSalesCopy();
      setSalesCopyJobId(null);
    }
    if (salesCopyJob.status === "failed") {
      if (preRegenerationCopy) {
        setEditCopy(preRegenerationCopy);
        clearPreRegenerationSnapshot();
        toast({
          title: "Generation failed — previous version restored",
          description: "Your previous sales copy has been restored. You can try regenerating again.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Couldn't generate sales copy", description: salesCopyJob.errorMessage ?? undefined, variant: "destructive" });
      }
      setSalesCopyJobId(null);
    }
  }, [salesCopyJob?.status]);

  useEffect(() => {
    if (priceInitialized) return;
    if (detail?.product.priceCents) {
      setPrice((detail.product.priceCents / 100).toString());
      setPriceInitialized(true);
    } else if (salesCopy?.suggestedPriceBand) {
      const match = salesCopy.suggestedPriceBand.match(/\d+(\.\d+)?/);
      if (match) { setPrice(match[0]); setPriceInitialized(true); }
    }
  }, [detail?.product.priceCents, salesCopy?.suggestedPriceBand, priceInitialized]);

  // Sync server sales copy into local editable state (on first load or after regeneration).
  // Gate on updatedAt so the editor appears even when headline is blank.
  useEffect(() => {
    if (!salesCopy?.updatedAt) return;
    setEditCopy({
      headline: salesCopy.headline ?? "",
      subheadline: salesCopy.subheadline ?? "",
      bullets: salesCopy.bullets ?? [],
      whoItsFor: salesCopy.whoItsFor ?? "",
      faq: (salesCopy.faq ?? []) as { question: string; answer: string }[],
      ctaText: salesCopy.ctaText ?? "",
      suggestedPriceBand: salesCopy.suggestedPriceBand ?? "",
    });
    setCopyDirty(false);
  }, [salesCopy?.updatedAt]);

  // Snapshot helpers — keyed by productId so different products don't collide.
  const preRegenKey = urlProductId ? `preRegen_${urlProductId}` : null;

  const savePreRegenerationSnapshot = (copy: NonNullable<typeof editCopy>) => {
    if (!preRegenKey) return;
    try {
      sessionStorage.setItem(preRegenKey, JSON.stringify(copy));
    } catch {
      // sessionStorage may be unavailable in some browser contexts; fail silently.
    }
    setPreRegenerationCopy(copy);
    setShowUndoBanner(true);
  };

  const clearPreRegenerationSnapshot = () => {
    if (preRegenKey) {
      try { sessionStorage.removeItem(preRegenKey); } catch { /* ignore */ }
    }
    setPreRegenerationCopy(null);
    setShowUndoBanner(false);
  };

  // On step 8 mount, restore snapshot from sessionStorage if one exists.
  useEffect(() => {
    if (step !== 8 || !preRegenKey) return;
    try {
      const saved = sessionStorage.getItem(preRegenKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreRegenerationCopy(parsed);
        setShowUndoBanner(true);
      }
    } catch {
      // Ignore parse or access errors.
    }
  }, [step, preRegenKey]);

  const patchEditCopy = (patch: Partial<NonNullable<typeof editCopy>>) => {
    setEditCopy((prev) => (prev ? { ...prev, ...patch } : prev));
    setCopyDirty(true);
  };

  const handleSaveCopy = () => {
    if (!urlProductId || !editCopy) return;
    updateSalesCopyMutation.mutate(
      { productId: urlProductId, data: editCopy },
      {
        onSuccess: () => {
          setCopyDirty(false);
          refetchSalesCopy();
          toast({ title: "Sales copy saved" });
          clearPreRegenerationSnapshot();
        },
        onError: () => {
          toast({ title: "Couldn't save changes", variant: "destructive" });
        },
      },
    );
  };

  const isGeneratingSalesCopy = !!salesCopyJobId && salesCopyJob?.status !== "succeeded" && salesCopyJob?.status !== "failed";

  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const doGenerateSalesCopy = () => {
    if (!urlProductId) return;
    // Snapshot current copy before regenerating so the author can undo.
    if (editCopy) {
      savePreRegenerationSnapshot(editCopy);
    }
    generateSalesCopy.mutate({ data: { productId: urlProductId } }, {
      onSuccess: (job) => setSalesCopyJobId(job.id),
    });
  };

  const handleGenerateSalesCopy = () => {
    if (!urlProductId) return;
    if (copyDirty) {
      // Warn the author their unsaved edits will be discarded.
      setShowRegenerateConfirm(true);
      return;
    }
    doGenerateSalesCopy();
  };

  const handleConfirmRegenerate = () => {
    if (!urlProductId || !editCopy) {
      setShowRegenerateConfirm(false);
      doGenerateSalesCopy();
      return;
    }
    // Auto-save first so the snapshot captured inside doGenerateSalesCopy
    // reflects the author's latest edits (matching what handlePublish does).
    updateSalesCopyMutation.mutate(
      { productId: urlProductId, data: editCopy },
      {
        onSuccess: () => {
          setCopyDirty(false);
          refetchSalesCopy();
          setShowRegenerateConfirm(false);
          doGenerateSalesCopy();
        },
        onError: () => {
          toast({ title: "Couldn't save your edits — please try again", variant: "destructive" });
          setShowRegenerateConfirm(false);
        },
      },
    );
  };

  const handleUndoRegeneration = () => {
    if (!preRegenerationCopy) return;
    setEditCopy(preRegenerationCopy);
    setCopyDirty(true);
    clearPreRegenerationSnapshot();
  };

  const handlePublish = () => {
    if (!urlProductId) return;
    const cents = Math.round(parseFloat(price || "0") * 100);
    const doPublish = () => {
      publishProduct.mutate({ productId: urlProductId, data: { priceCents: Number.isFinite(cents) ? cents : undefined } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(urlProductId) });
          toast({ title: "Published!", description: "Your sales page is live." });
        },
      });
    };
    // Auto-save unsaved copy edits before publishing so the live page reflects them
    if (copyDirty && editCopy) {
      updateSalesCopyMutation.mutate(
        { productId: urlProductId, data: editCopy },
        {
          onSuccess: () => {
            setCopyDirty(false);
            refetchSalesCopy();
            clearPreRegenerationSnapshot();
            doPublish();
          },
          onError: () => {
            toast({ title: "Couldn't save your copy edits — please try again", variant: "destructive" });
          },
        },
      );
    } else {
      doPublish();
    }
  };

  const handleUnpublish = () => {
    if (!urlProductId) return;
    unpublishProduct.mutate({ productId: urlProductId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(urlProductId) });
        toast({ title: "Unpublished", description: "Your sales page is no longer live." });
      },
    });
  };

  const handleShareDraftLink = () => {
    if (!urlProductId) return;
    generatePreviewTokenMutation.mutate({ productId: urlProductId }, {
      onSuccess: (result) => {
        // Build the URL the same way existing live-page links do:
        // origin + BASE_URL (web artifact base path) + SPA route + token param.
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const absoluteUrl = `${window.location.origin}${base}/p/${result.slug}?preview=${result.token}`;
        navigator.clipboard.writeText(absoluteUrl).then(() => {
          toast({
            title: "Draft link copied!",
            description: "Anyone with this link can preview your page for 48 hours.",
          });
        }).catch(() => {
          // Clipboard may be blocked; fall back to showing the URL in the toast
          toast({
            title: "Draft link generated",
            description: absoluteUrl,
          });
        });
      },
      onError: () => {
        toast({ title: "Couldn't generate a draft link — please try again", variant: "destructive" });
      },
    });
  };

  // ==========================================
  // STEP 6 & 7: Export
  // ==========================================
  const exportProduct = useExportProduct();
  const [exportTheme, setExportTheme] = useState("minimal");
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null);

  const toAppUrl = (apiUrl: string) =>
    apiUrl.startsWith('/api') ? import.meta.env.BASE_URL + apiUrl.slice(1) : apiUrl;

  const handleExport = () => {
    if (!urlProductId) return;
    exportProduct.mutate({ productId: urlProductId, data: { format: 'pdf', pageSize: 'a4', theme: exportTheme } }, {
      onSuccess: (record) => {
        toast({ title: "Export ready!" });
        // Store the URL and render real <a> links below instead of window.open() here --
        // window.open() called from an async mutation callback (not the click's own call
        // stack) gets silently blocked by popup blockers in most browsers.
        setLastExportUrl(toAppUrl(record.downloadUrl));
      }
    });
  };


  const saveDraftButton = step > 0 && step < 5 ? (
    <Button
      variant="outline"
      size="sm"
      className="rounded-xl border-ink-200 text-ink-600"
      onClick={handleSaveDraft}
      disabled={createProduct.isPending || updateProduct.isPending}
    >
      {(createProduct.isPending || updateProduct.isPending) ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
      ) : (
        "Save Draft"
      )}
    </Button>
  ) : null;

  return (
    <AppLayout headerActions={saveDraftButton} headerTitleHref="/create/ebook" headerTitleOnClick={() => setStep(0)}>
      <div className="flex flex-col h-full bg-paper">
        {/* Wizard Header */}
        <div className="bg-white border-b sticky top-16 z-20 px-8 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-center">
            {step > 0 && (
              <div className="flex items-center">
                {displaySteps.map((ds, i) => {
                  const clickable = !!urlProductId && ds.complete;
                  const nextReached = i < displaySteps.length - 1 &&
                    (displaySteps[i + 1].active || displaySteps[i + 1].complete);
                  return (
                    <div key={ds.label} className="flex items-center">
                      <div
                        className={cn("flex items-center gap-2", clickable ? "cursor-pointer group" : "cursor-default")}
                        onClick={() => { if (clickable) setStep(ds.navStep); }}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shrink-0",
                          ds.complete ? "bg-brand-500 border-brand-500 text-white" :
                          ds.active   ? "bg-brand-50 border-brand-500 text-brand-600" :
                                        "bg-white border-ink-200 text-ink-400"
                        )}>
                          {ds.complete ? <Check className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                        </div>
                        <span className={cn(
                          "text-sm font-semibold hidden sm:inline",
                          ds.active   ? "text-ink-900" :
                          ds.complete ? "text-brand-500 group-hover:text-brand-600" :
                                        "text-ink-400"
                        )}>
                          {ds.label}
                        </span>
                      </div>
                      {i < displaySteps.length - 1 && (
                        <div className={cn(
                          "h-0.5 w-10 lg:w-20 mx-3 rounded-full transition-colors",
                          nextReached ? "bg-brand-400" : "bg-ink-200"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Wizard Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className={cn("mx-auto w-full", step === 5 ? "max-w-7xl" : (step === 8 && showPreview) ? "max-w-[1400px]" : "max-w-4xl")}>

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
                <button
                  className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
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
                <button
                  className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Pick a Subtopic</h2>
                    <p className="text-ink-500">
                      Choose the area of {NICHES.find((n) => n.key === selectedNiche)?.label} to focus on before we suggest specific eBook topics.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      disabled={generateSubtopicSuggestions.isPending}
                      onClick={() => selectedNiche && generateSubtopicSuggestions.mutate({ data: { niche: selectedNiche } })}
                    >
                      {generateSubtopicSuggestions.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate Fresh AI Ideas
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setIsWritingOwnSubtopic((v) => !v)}
                    >
                      <PenTool className="w-4 h-4 mr-2" /> Write my own
                    </Button>
                  </div>
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
                <button
                  className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
                  onClick={() => setStep(1.3)}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
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
                                  <Badge variant="secondary" className="text-xs font-normal whitespace-normal break-words text-left max-w-full">{sub.suggestedAudience}</Badge>
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
                <button
                  className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
                  onClick={() => setStep(selectedNiche ? 1.6 : 1)}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
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
                      <Label htmlFor="authorName" className="text-base font-semibold">Author Name (Optional)</Label>
                      <Input
                        id="authorName"
                        placeholder="e.g. Jane Smith"
                        className="h-12 rounded-xl bg-ink-50/50"
                        value={brief.authorName}
                        onChange={e => setBrief({...brief, authorName: e.target.value})}
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
                <Progress value={outlineProgress} className="h-2 bg-brand-100 [&>div]:bg-brand-500 transition-all duration-500" />
                <p className="text-sm font-semibold text-brand-600 mt-3">{Math.round(outlineProgress)}%</p>
              </div>
            )}

            {/* STEP 3.5: REVIEW OUTLINE */}
            {step === 3.5 && detail && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                {(() => {
                  // Imported manuscripts arrive with every chapter's content already
                  // filled in (split straight from the uploaded/pasted text), unlike
                  // an AI-generated outline where chapters only have a title/summary
                  // and still need their content written. Use that to tell the two
                  // apart instead of a schema flag, since detecting it this way stays
                  // correct even if the import path changes upstream.
                  const chaptersAlreadyWritten =
                    detail.chapters.length > 0 &&
                    detail.chapters.every((c) => !!c.contentMd?.trim());
                  return (
                <>
                <div className="mb-6 flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Review Outline</h2>
                    <p className="text-ink-500">
                      {chaptersAlreadyWritten
                        ? "Confirm the chapters we detected from your manuscript look right before you start editing."
                        : "Edit, reorder, or approve the generated chapter structure."}
                    </p>
                  </div>
                  {chaptersAlreadyWritten ? (
                    <Button
                      size="lg"
                      className="h-12 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft"
                      onClick={() => setStep(5)}
                    >
                      Chapters look correct <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="h-12 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft"
                      onClick={handleStartGeneration}
                    >
                      Approve & Write Chapters <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  )}
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
                </>
                  );
                })()}
              </div>
            )}

            {/* STEP 4: WRITING CHAPTERS */}
            {step === 4 && (
              <div className="py-20 max-w-md mx-auto text-center animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PenTool className="w-10 h-10 text-brand-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-display font-bold text-ink-900 mb-2 flex items-center justify-center gap-2">
                  Writing chapters
                  {job?.totalUnits ? (
                    <span className="text-sm font-semibold text-brand-600 bg-brand-50 rounded-full px-2.5 py-0.5">
                      {Math.round(((job.completedUnits || 0) / job.totalUnits) * 100)}%
                    </span>
                  ) : null}
                </h2>
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

            {/* STEP 6: AI COVER GENERATION */}
            {step === 6 && detail && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 max-w-4xl mx-auto">
                {coverStage === "picking" && (
                  <>
                    <div>
                      <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Pick your cover style</h2>
                      <p className="text-ink-500">We'll generate a finished, ready-to-use cover from your book's title and topic.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {COVER_STYLE_OPTIONS.map((style) => (
                        <button
                          key={style.key}
                          onClick={() => handlePickStyle(style.key, style.label)}
                          className="group text-left rounded-2xl border border-ink-200 bg-white overflow-hidden hover:border-brand-400 hover:shadow-md transition-all"
                        >
                          <div
                            className="h-28 w-full bg-cover bg-center"
                            style={{ backgroundColor: style.gradient[0] }}
                          >
                            <img
                              src={style.thumbnail}
                              alt={style.label}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-3">
                            <div className="font-medium text-ink-900 text-sm leading-tight">{style.label}</div>
                            <div className="text-xs text-ink-500 mt-0.5">{style.description}</div>
                          </div>
                        </button>
                      ))}
                      <label className="group text-left rounded-2xl border-2 border-dashed border-ink-300 bg-ink-50 overflow-hidden hover:border-brand-400 transition-all cursor-pointer flex flex-col">
                        <div className="h-28 w-full flex items-center justify-center bg-ink-100">
                          {isUploadingCover ? (
                            <Loader2 className="w-6 h-6 text-ink-400 animate-spin" />
                          ) : (
                            <UploadCloud className="w-6 h-6 text-ink-400" />
                          )}
                        </div>
                        <div className="p-3">
                          <div className="font-medium text-ink-900 text-sm leading-tight">Upload my own cover</div>
                          <div className="text-xs text-ink-500 mt-0.5">Use an image you already have</div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingCover}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadCoverFile(file);
                          }}
                        />
                      </label>
                    </div>

                    {savedCovers.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-ink-900 mb-3">Your saved covers</h3>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                          {savedCovers.map((cover) => (
                            <button
                              key={cover.id}
                              onClick={() => handleSelectSavedCover(cover.id)}
                              className={cn(
                                "shrink-0 w-24 rounded-xl overflow-hidden border-2 transition-all",
                                activeCover?.id === cover.id ? "border-brand-500" : "border-ink-200 hover:border-ink-300"
                              )}
                            >
                              <img
                                src={`${import.meta.env.BASE_URL}api/storage${cover.imageUrl.replace(/^\/api\/storage/, "")}`}
                                alt={cover.styleLabel}
                                className="w-full h-32 object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {coverStage === "generating" && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center">
                        <ImageIcon className="w-9 h-9 text-brand-500" />
                      </div>
                      <Loader2 className="w-7 h-7 text-brand-500 animate-spin absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">Designing your cover...</h2>
                    <p className="text-ink-500">
                      Generating a {COVER_STYLE_OPTIONS.find((s) => s.key === pendingStyleKey)?.label.toLowerCase() ?? "custom"} cover for "{detail.product.title}"
                    </p>
                  </div>
                )}

                {coverStage === "failed" && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
                      <AlertTriangle className="w-9 h-9 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">Couldn't generate that cover</h2>
                    <p className="text-ink-500 max-w-sm mb-6">
                      {pendingStyleLabel ? `We ran into a problem generating the "${pendingStyleLabel}" cover.` : "We ran into a problem generating that cover."} This can happen occasionally — you can try again or pick a different style.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white"
                        onClick={handleRetryStyle}
                        disabled={generateCover.isPending}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Try again
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl border-ink-200"
                        onClick={() => setCoverStage("picking")}
                      >
                        Pick another style
                      </Button>
                    </div>
                  </div>
                )}

                {coverStage === "editing" && editingCover && (
                  <CoverEditor
                    imageUrl={`${import.meta.env.BASE_URL}api/storage${editingCover.imageUrl.replace(/^\/api\/storage/, "")}`}
                    styleLabel={editingCover.styleLabel}
                    isSaving={isUploadingCover || registerUploadedCover.isPending}
                    onCancel={() => { setEditingCover(null); setCoverStage("result"); }}
                    onSave={(file) => uploadCoverFile(file)}
                  />
                )}

                {coverStage === "result" && activeCover && (
                  <>
                    <div className="text-center">
                      <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Your cover is ready</h2>
                      <p className="text-ink-500">{activeCover.styleLabel}</p>
                    </div>
                    <div className="flex justify-center">
                      <img
                        src={`${import.meta.env.BASE_URL}api/storage${activeCover.imageUrl.replace(/^\/api\/storage/, "")}`}
                        alt={activeCover.styleLabel}
                        className="w-[280px] rounded-2xl shadow-xl border border-ink-200"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <a
                        href={`${import.meta.env.BASE_URL}api/storage${activeCover.imageUrl.replace(/^\/api\/storage/, "")}`}
                        download
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="outline" className="rounded-xl border-ink-200">
                          <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        className="rounded-xl border-ink-200"
                        onClick={() => {
                          setEditingCover({ id: activeCover.id, imageUrl: activeCover.imageUrl, styleLabel: activeCover.styleLabel });
                          setCoverStage("editing");
                        }}
                      >
                        <Crop className="w-4 h-4 mr-2" /> Edit cover
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl border-ink-200"
                        onClick={() => setCoverStage("picking")}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Change style
                      </Button>
                      <Button
                        className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white"
                        onClick={() => setStep(7)}
                      >
                        <Check className="w-4 h-4 mr-2" /> Continue
                      </Button>
                    </div>

                    {savedCovers.length > 1 && (
                      <div>
                        <h3 className="font-semibold text-ink-900 mb-3">Your saved covers</h3>
                        <div className="flex gap-4 overflow-x-auto pb-2 justify-center">
                          {savedCovers.map((cover) => (
                            <button
                              key={cover.id}
                              onClick={() => handleSelectSavedCover(cover.id)}
                              className={cn(
                                "shrink-0 w-24 rounded-xl overflow-hidden border-2 transition-all",
                                activeCover?.id === cover.id ? "border-brand-500" : "border-ink-200 hover:border-ink-300"
                              )}
                            >
                              <img
                                src={`${import.meta.env.BASE_URL}api/storage${cover.imageUrl.replace(/^\/api\/storage/, "")}`}
                                alt={cover.styleLabel}
                                className="w-full h-32 object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* STEP 7: EXPORT */}
            {step === 7 && detail && (
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
                    {activeCover ? (
                      <img
                        src={`${import.meta.env.BASE_URL}api/storage${activeCover.imageUrl.replace(/^\/api\/storage/, "")}`}
                        alt={activeCover.styleLabel}
                        className="w-[210px] h-[297px] object-cover rounded shadow-xl"
                      />
                    ) : (
                      <div
                        className="w-[210px] h-[297px] bg-white shadow-xl flex flex-col transition-all duration-300 relative overflow-hidden"
                        style={{
                          fontFamily: exportTheme === 'serif' ? 'Georgia, serif' : 'Inter, sans-serif'
                        }}
                      >
                        <div className="h-1/2 w-full transition-colors duration-300" style={{ backgroundColor: '#1FA06B' }} />
                        <div className="p-4 flex flex-col justify-center flex-1 bg-white relative z-10 -mt-8 rounded-t-xl mx-2 shadow-sm">
                          <h3 className="font-bold text-ink-900 leading-tight mb-1 text-sm">{detail.product.title}</h3>
                          <p className="text-[8px] text-ink-500 uppercase tracking-widest">{detail.product.authorName || detail.product.ownerName}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="space-y-6">
                    <Card className="border-ink-200 shadow-sm">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-ink-900 mb-4 flex items-center gap-2">
                          <Palette className="w-4 h-4 text-ink-400" /> Theme Selection
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
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
                      </CardContent>
                    </Card>

                    <Button
                      variant="ghost"
                      className="text-ink-500"
                      onClick={() => setStep(6)}
                    >
                      <Palette className="w-4 h-4 mr-2" /> Back to cover
                    </Button>

                    {lastExportUrl ? (
                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href={`${lastExportUrl}?inline=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center h-12 rounded-xl border border-ink-200 font-semibold text-ink-700 hover:bg-ink-50 transition-colors"
                        >
                          <Eye className="w-5 h-5 mr-2" /> Preview
                        </a>
                        <a
                          href={lastExportUrl}
                          download
                          className="inline-flex items-center justify-center h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-soft transition-colors"
                        >
                          <Download className="w-5 h-5 mr-2" /> Download
                        </a>
                      </div>
                    ) : (
                      <Button 
                        size="lg" 
                        className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft"
                        onClick={handleExport}
                        disabled={exportProduct.isPending}
                      >
                        {exportProduct.isPending ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Compiling PDF...</>
                        ) : (
                          <><Download className="w-5 h-5 mr-2" /> Generate PDF Book</>
                        )}
                      </Button>
                    )}

                    {lastExportUrl && (
                      <Button
                        variant="ghost"
                        className="w-full text-ink-500"
                        onClick={handleExport}
                        disabled={exportProduct.isPending}
                      >
                        {exportProduct.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Regenerating...</>
                        ) : (
                          <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate PDF</>
                        )}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl border-ink-200 font-semibold"
                      onClick={() => setStep(8)}
                    >
                      <DollarSign className="w-5 h-5 mr-2" /> Continue to sales page
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 8: PUBLISH (SALES PAGE) */}
            {step === 8 && detail && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

                {/* Top bar: back + title + preview toggle */}
                <div className={cn("flex flex-col gap-4", showPreview ? "" : "max-w-3xl mx-auto")}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <button
                      className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
                      onClick={() => setStep(7)}
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    {/* Edit / Preview toggle — shown once sales copy is ready */}
                    {editCopy && !isGeneratingSalesCopy && (
                      <div className="flex items-center rounded-xl border border-ink-200 bg-ink-50 p-1 gap-1">
                        <button
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            !showPreview
                              ? "bg-white text-ink-900 shadow-sm border border-ink-200"
                              : "text-ink-500 hover:text-ink-700"
                          )}
                          onClick={() => setShowPreview(false)}
                        >
                          <PenTool className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            showPreview
                              ? "bg-white text-ink-900 shadow-sm border border-ink-200"
                              : "text-ink-500 hover:text-ink-700"
                          )}
                          onClick={() => setShowPreview(true)}
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                      </div>
                    )}
                  </div>

                  {!showPreview && (
                    <div className="text-center">
                      <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Sales Page</h2>
                      <p className="text-ink-500">
                        {salesCopy?.updatedAt ? "Review your sales copy below, then publish it as a product to start selling." : "Generate compelling sales copy to sell your eBook."}
                      </p>
                    </div>
                  )}

                  {/* Undo regeneration banner — shown when a pre-regeneration snapshot is present */}
                  {showUndoBanner && preRegenerationCopy && (
                    <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-amber-800">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>Sales copy was regenerated. You can undo to restore the previous version.</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg border-amber-300 text-amber-800 hover:bg-amber-100"
                          onClick={handleUndoRegeneration}
                        >
                          Undo regeneration
                        </Button>
                        <button
                          className="text-amber-500 hover:text-amber-700 text-xs"
                          onClick={clearPreRegenerationSnapshot}
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main content: split-pane when preview is on, single-column otherwise */}
                <div className={cn(
                  showPreview && editCopy
                    ? "grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-0 items-start rounded-2xl overflow-hidden border border-ink-200 shadow-sm"
                    : "max-w-3xl mx-auto space-y-8"
                )}>

                  {/* ---- Left / main column: form ---- */}
                  <div className={cn(
                    showPreview && editCopy ? "space-y-0 border-r border-ink-200 overflow-y-auto max-h-[calc(100vh-220px)]" : "space-y-8"
                  )}>

                    {!salesCopy?.updatedAt && !isGeneratingSalesCopy && (
                      <Card className={cn("border-ink-200 shadow-sm", showPreview ? "rounded-none border-0" : "rounded-2xl")}>
                        <CardContent className="p-10 flex flex-col items-center text-center">
                          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-5">
                            <DollarSign className="w-7 h-7 text-brand-500" />
                          </div>
                          <h3 className="text-xl font-bold text-ink-900 mb-2">Generate Sales Copy</h3>
                          <p className="text-ink-500 max-w-sm mb-6">
                            AI will write a full sales page with a headline, benefits, and FAQs based on your eBook content.
                          </p>
                          <Button
                            className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white"
                            onClick={handleGenerateSalesCopy}
                            disabled={generateSalesCopy.isPending}
                          >
                            {generateSalesCopy.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                            ) : (
                              <><Sparkles className="w-4 h-4 mr-2" /> Generate Sales Copy</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {isGeneratingSalesCopy && (
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Loader2 className="w-9 h-9 text-brand-500 animate-spin mb-6" />
                        <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">Writing your sales page...</h2>
                        <p className="text-ink-500">Crafting a headline, benefits, and FAQs for "{detail.product.title}"</p>
                      </div>
                    )}

                    {salesCopy?.updatedAt && !isGeneratingSalesCopy && editCopy && (
                      <>
                        <Card className={cn("border-ink-200 shadow-sm overflow-hidden", showPreview ? "rounded-none border-0 border-b" : "rounded-2xl")}>
                          <CardContent className="p-8 space-y-6">

                            {/* Headline */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold uppercase tracking-widest text-ink-400">Headline</label>
                              <Input
                                className="text-xl font-display font-bold text-ink-900 border-0 border-b border-ink-200 rounded-none px-0 bg-transparent focus-visible:ring-0 focus-visible:border-brand-400 h-auto py-1"
                                value={editCopy.headline}
                                onChange={(e) => patchEditCopy({ headline: e.target.value })}
                              />
                            </div>

                            {/* Subheadline */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold uppercase tracking-widest text-ink-400">Subheadline</label>
                              <Input
                                className="text-ink-500 border-0 border-b border-ink-200 rounded-none px-0 bg-transparent focus-visible:ring-0 focus-visible:border-brand-400 h-auto py-1"
                                value={editCopy.subheadline}
                                onChange={(e) => patchEditCopy({ subheadline: e.target.value })}
                              />
                            </div>

                            {/* Bullets */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-400">What's inside</h4>
                              <ul className="space-y-2">
                                {editCopy.bullets.map((b, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-brand-500 shrink-0" />
                                    <Input
                                      className="text-sm text-ink-700 border-0 border-b border-ink-200 rounded-none px-0 bg-transparent focus-visible:ring-0 focus-visible:border-brand-400 h-auto py-0.5 flex-1"
                                      value={b}
                                      onChange={(e) => {
                                        const next = [...editCopy.bullets];
                                        next[i] = e.target.value;
                                        patchEditCopy({ bullets: next });
                                      }}
                                    />
                                    <button
                                      className="text-ink-300 hover:text-red-400 transition-colors"
                                      onClick={() => patchEditCopy({ bullets: editCopy.bullets.filter((_, j) => j !== i) })}
                                      title="Remove bullet"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              <button
                                className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium mt-1"
                                onClick={() => patchEditCopy({ bullets: [...editCopy.bullets, ""] })}
                              >
                                <Plus className="w-3.5 h-3.5" /> Add bullet
                              </button>
                            </div>

                            {/* Who it's for */}
                            <div className="space-y-1">
                              <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-400">Who it's for</h4>
                              <Textarea
                                className="text-sm text-ink-700 border-0 border-b border-ink-200 rounded-none px-0 bg-transparent focus-visible:ring-0 focus-visible:border-brand-400 resize-none min-h-[60px]"
                                value={editCopy.whoItsFor}
                                onChange={(e) => patchEditCopy({ whoItsFor: e.target.value })}
                              />
                            </div>

                            {/* FAQ */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-400">FAQ</h4>
                              {editCopy.faq.map((f, i) => (
                                <div key={i} className="space-y-1 border border-ink-100 rounded-xl p-3 relative group">
                                  <button
                                    className="absolute top-2 right-2 text-ink-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                    onClick={() => patchEditCopy({ faq: editCopy.faq.filter((_, j) => j !== i) })}
                                    title="Remove FAQ item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <Input
                                    className="text-sm font-medium text-ink-900 border-0 border-b border-ink-200 rounded-none px-0 bg-transparent focus-visible:ring-0 focus-visible:border-brand-400 h-auto py-0.5"
                                    placeholder="Question"
                                    value={f.question}
                                    onChange={(e) => {
                                      const next = editCopy.faq.map((item, j) =>
                                        j === i ? { ...item, question: e.target.value } : item,
                                      );
                                      patchEditCopy({ faq: next });
                                    }}
                                  />
                                  <Textarea
                                    className="text-sm text-ink-500 border-0 border-b border-ink-200 rounded-none px-0 bg-transparent focus-visible:ring-0 focus-visible:border-brand-400 resize-none min-h-[50px]"
                                    placeholder="Answer"
                                    value={f.answer}
                                    onChange={(e) => {
                                      const next = editCopy.faq.map((item, j) =>
                                        j === i ? { ...item, answer: e.target.value } : item,
                                      );
                                      patchEditCopy({ faq: next });
                                    }}
                                  />
                                </div>
                              ))}
                              <button
                                className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
                                onClick={() => patchEditCopy({ faq: [...editCopy.faq, { question: "", answer: "" }] })}
                              >
                                <Plus className="w-3.5 h-3.5" /> Add FAQ item
                              </button>
                            </div>

                            {/* CTA Text */}
                            <div className="space-y-1">
                              <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-400">Call-to-action button text</h4>
                              <Input
                                className="text-sm text-ink-700 border-0 border-b border-ink-200 rounded-none px-0 bg-transparent focus-visible:ring-0 focus-visible:border-brand-400 h-auto py-1"
                                placeholder="e.g. Get instant access"
                                value={editCopy.ctaText}
                                onChange={(e) => patchEditCopy({ ctaText: e.target.value })}
                              />
                            </div>

                            {/* Save / Regenerate row */}
                            <div className="flex items-center justify-between pt-2 border-t border-ink-100">
                              <button
                                className="flex items-center gap-1.5 text-sm text-ink-400 hover:text-brand-600 font-medium"
                                onClick={handleGenerateSalesCopy}
                                disabled={generateSalesCopy.isPending}
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                              </button>
                              {copyDirty && (
                                <Button
                                  size="sm"
                                  className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
                                  onClick={handleSaveCopy}
                                  disabled={updateSalesCopyMutation.isPending}
                                >
                                  {updateSalesCopyMutation.isPending ? (
                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...</>
                                  ) : (
                                    "Save changes"
                                  )}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className={cn("border-ink-200 shadow-sm", showPreview ? "rounded-none border-0 border-b" : "rounded-2xl")}>
                          <CardContent className="p-8 space-y-4">
                            <h4 className="font-semibold text-ink-900">Set your price</h4>
                            <div className="relative w-40">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                className="h-12 rounded-xl bg-ink-50/50 pl-7"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                              />
                            </div>
                            {salesCopy.suggestedPriceBand && (
                              <p className="text-xs text-ink-400">AI suggested range: {salesCopy.suggestedPriceBand}</p>
                            )}
                          </CardContent>
                        </Card>

                        <div className={cn(showPreview ? "p-8" : "")}>
                          {detail.product.published && detail.product.slug ? (
                            <Card className={cn("border-brand-200 bg-brand-50/50 shadow-sm", showPreview ? "rounded-2xl" : "rounded-2xl")}>
                              <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-ink-900 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-brand-600" /> Your sales page is live
                                  </p>
                                  <a
                                    href={`${import.meta.env.BASE_URL}p/${detail.product.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-brand-600 hover:underline break-all"
                                  >
                                    {window.location.origin}{import.meta.env.BASE_URL}p/{detail.product.slug}
                                  </a>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" className="rounded-xl border-ink-200" onClick={handlePublish} disabled={publishProduct.isPending}>
                                    Update price
                                  </Button>
                                  <Button variant="ghost" className="text-ink-500" onClick={handleUnpublish} disabled={unpublishProduct.isPending}>
                                    Unpublish
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className="space-y-3">
                              <Button
                                size="lg"
                                className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft"
                                onClick={handlePublish}
                                disabled={publishProduct.isPending}
                              >
                                {publishProduct.isPending ? (
                                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Publishing...</>
                                ) : (
                                  <><Sparkles className="w-5 h-5 mr-2" /> Publish sales page</>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="lg"
                                className="w-full h-11 rounded-xl border-ink-200 text-ink-600 font-medium"
                                onClick={handleShareDraftLink}
                                disabled={generatePreviewTokenMutation.isPending}
                              >
                                {generatePreviewTokenMutation.isPending ? (
                                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating link...</>
                                ) : (
                                  <><Link2 className="w-4 h-4 mr-2" /> Share draft link</>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* ---- Right column: live preview (only in split-pane mode) ---- */}
                  {showPreview && editCopy && (
                    <div className="sticky top-0 overflow-y-auto max-h-[calc(100vh-220px)] bg-[#060913]">
                      <div className="px-2 py-2 bg-[#0D1326]/80 border-b border-[#1C243E] flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                        </div>
                        <span className="text-[#8F9BB3] text-xs font-mono truncate flex-1 text-center pr-8">
                          Live Preview
                        </span>
                      </div>
                      <SalesPagePreview
                        headline={editCopy.headline}
                        subheadline={editCopy.subheadline}
                        bullets={editCopy.bullets}
                        whoItsFor={editCopy.whoItsFor}
                        faq={editCopy.faq}
                        ctaText={editCopy.ctaText}
                        title={detail.product.title}
                        authorName={detail.product.authorName}
                        priceCents={Number.isFinite(Math.round(parseFloat(price || "0") * 100)) ? Math.round(parseFloat(price || "0") * 100) : null}
                        chapterCount={detail.product.chapterCount}
                        coverUrl={activeCover ? `${import.meta.env.BASE_URL}api/storage${activeCover.imageUrl.replace(/^\/api\/storage/, "")}` : null}
                      />
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved edits?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits to your sales copy. Regenerating will overwrite them.
              Your edits will be saved first so you can undo afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRegenerate}
              disabled={updateSalesCopyMutation.isPending}
            >
              {updateSalesCopyMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                "Save & Regenerate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

// ==========================================
// Cover crop/reposition editor
// ==========================================
const COVER_FRAME_W = 280;
const COVER_FRAME_H = 373; // ~3:4 book cover ratio

function CoverEditor({
  imageUrl, styleLabel, isSaving, onCancel, onSave,
}: {
  imageUrl: string;
  styleLabel: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (file: File) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null);

  const baseScale = naturalSize
    ? Math.max(COVER_FRAME_W / naturalSize.w, COVER_FRAME_H / naturalSize.h)
    : 1;
  const scale = baseScale * zoom;

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({ startX: e.clientX, startY: e.clientY, origin: offset });
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({ x: dragging.origin.x + (e.clientX - dragging.startX), y: dragging.origin.y + (e.clientY - dragging.startY) });
  };
  const handlePointerUp = () => setDragging(null);

  const handleSave = async () => {
    if (!naturalSize) return;
    const canvas = document.createElement("canvas");
    canvas.width = COVER_FRAME_W;
    canvas.height = COVER_FRAME_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    const drawW = naturalSize.w * scale;
    const drawH = naturalSize.h * scale;
    const drawX = COVER_FRAME_W / 2 - drawW / 2 + offset.x;
    const drawY = COVER_FRAME_H / 2 - drawH / 2 + offset.y;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onSave(new File([blob], "cover-edited.png", { type: "image/png" }));
    }, "image/png");
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-display font-bold text-ink-900 mb-2">Reposition your cover</h2>
        <p className="text-ink-500">Drag to reposition, zoom to fine-tune the crop for "{styleLabel}".</p>
      </div>
      <div
        className="relative overflow-hidden rounded-2xl border border-ink-200 shadow-xl bg-ink-100 select-none touch-none"
        style={{ width: COVER_FRAME_W, height: COVER_FRAME_H, cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={imageUrl}
          alt={styleLabel}
          draggable={false}
          onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={
            naturalSize
              ? {
                  position: "absolute",
                  left: COVER_FRAME_W / 2 + offset.x,
                  top: COVER_FRAME_H / 2 + offset.y,
                  width: naturalSize.w * scale,
                  height: naturalSize.h * scale,
                  transform: "translate(-50%, -50%)",
                  maxWidth: "none",
                }
              : { opacity: 0 }
          }
        />
      </div>

      <div className="flex items-center gap-3 mt-6 w-[280px]">
        <ZoomOut className="w-4 h-4 text-ink-400 shrink-0" />
        <Slider
          value={[zoom]}
          min={1}
          max={2.5}
          step={0.01}
          onValueChange={(v) => setZoom(v[0])}
        />
        <ZoomIn className="w-4 h-4 text-ink-400 shrink-0" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <Button variant="outline" className="rounded-xl border-ink-200" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white"
          onClick={handleSave}
          disabled={isSaving || !naturalSize}
        >
          {isSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>) : (<><Check className="w-4 h-4 mr-2" /> Save crop</>)}
        </Button>
      </div>
    </div>
  );
}
