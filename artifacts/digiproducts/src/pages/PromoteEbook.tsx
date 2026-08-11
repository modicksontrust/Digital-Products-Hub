import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetProducts, getGetProductsQueryKey } from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Megaphone, Plus, Sparkles, Image, Video, FileText, Package,
  Globe, Music2, Twitter, Instagram, MousePointerClick, Heart, ShoppingCart,
  ChevronLeft, Check, X, ArrowRight, Clock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type AdType = "image_ads" | "video_scripts" | "ad_copy" | "full_package";
type Platform = "facebook" | "instagram" | "tiktok" | "twitter";
type Objective = "traffic" | "engagement" | "conversions";
type WizardStep = "select" | "ad-type" | "details" | "platforms" | "objective" | "generating" | "results";

interface BookDetails {
  title: string;
  painPoint: string;
  audience: string;
  country: string;
  price: string;
  benefits: string[];
}

interface AdCopyVariation { hook: string; body: string; cta: string; }
interface ImageAdConcept { headline: string; subtext: string; visual: string; }
interface VideoScript { title: string; type: string; hook: string; body: string; cta: string; }

interface GeneratedResults {
  adCopy?: AdCopyVariation[];
  imageAds?: ImageAdConcept[];
  videoScripts?: VideoScript[];
}

interface Campaign {
  id: string;
  productId: string;
  productTitle: string;
  adType: AdType;
  adTypeLabel: string;
  platforms: Platform[];
  objective: Objective;
  bookDetails: BookDetails;
  results: GeneratedResults;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AD_TYPES: { value: AdType; label: string; desc: string; includes: string; icon: React.ReactNode }[] = [
  { value: "image_ads",      label: "Image Ads",      icon: <Image className="w-6 h-6" />,    desc: "Static scroll-stopping image ads with ad copy",      includes: "5 image concepts with headlines & copy" },
  { value: "video_scripts",  label: "Video Scripts",  icon: <Video className="w-6 h-6" />,    desc: "Short-form video ad scripts (15–60s)",               includes: "3 scripts: Talking Head, Story, Listicle" },
  { value: "ad_copy",        label: "Ad Copy",        icon: <FileText className="w-6 h-6" />, desc: "Written ad copy with 5 hook variations",             includes: "5 copy variations for your chosen platform" },
  { value: "full_package",   label: "Full Package",   icon: <Package className="w-6 h-6" />,  desc: "All three: images + video scripts + ad copy",        includes: "Complete ad creative package (13 assets)" },
];

const PLATFORMS: { value: Platform; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "facebook",   label: "Facebook",   icon: <Globe className="w-7 h-7" />,    desc: "Feed ads, long-form copy works well" },
  { value: "instagram",  label: "Instagram",  icon: <Instagram className="w-7 h-7" />, desc: "Feed, Stories, Reels" },
  { value: "tiktok",     label: "TikTok",     icon: <Music2 className="w-7 h-7" />,   desc: "Short-form video, trending formats" },
  { value: "twitter",    label: "Twitter / X", icon: <Twitter className="w-7 h-7" />,  desc: "Thread format, single tweet + image" },
];

const OBJECTIVES: { value: Objective; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "traffic",      label: "Traffic",      icon: <MousePointerClick className="w-7 h-7" />, desc: "Drive clicks to your sales page" },
  { value: "engagement",   label: "Engagement",   icon: <Heart className="w-7 h-7" />,             desc: "Get likes, comments & shares" },
  { value: "conversions",  label: "Conversions",  icon: <ShoppingCart className="w-7 h-7" />,      desc: "Optimize for direct sales" },
];

const COUNTRIES = ["Global", "United States", "United Kingdom", "Canada", "Australia", "Nigeria", "South Africa", "India", "Germany", "France"];

function storeCampaigns(campaigns: Campaign[]) {
  try { localStorage.setItem("poki_ad_campaigns", JSON.stringify(campaigns)); } catch {}
}
function loadCampaigns(): Campaign[] {
  try { return JSON.parse(localStorage.getItem("poki_ad_campaigns") || "[]"); } catch { return []; }
}


const WIZARD_STEPS: WizardStep[] = ["select", "ad-type", "details", "platforms", "objective"];
const STEP_LABELS = ["Select eBook", "Ad Type", "Book Details", "Platforms", "Objective"];

// ─── Main component ───────────────────────────────────────────────────────────

export default function PromoteEbook() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns);
  const [mode, setMode] = useState<"list" | "wizard">("list");

  // wizard state
  const [step, setStep] = useState<WizardStep>("select");
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; title: string; topic?: string | null } | null>(null);
  const [adType, setAdType] = useState<AdType | null>(null);
  const [bookDetails, setBookDetails] = useState<BookDetails>({ title: "", painPoint: "", audience: "", country: "Global", price: "", benefits: [] });
  const [benefitInput, setBenefitInput] = useState("");
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set());
  const [objective, setObjective] = useState<Objective | null>(null);
  const [results, setResults] = useState<GeneratedResults | null>(null);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const { data: products } = useGetProducts({}, { query: { queryKey: getGetProductsQueryKey() } });
  const ebookProducts = products?.filter(p => p.type === "ebook" && p.status !== "archived") ?? [];

  const prefillBookDetails = async (product: { id: string; title: string; topic?: string | null; audience?: string | null; priceCents?: number | null }) => {
    // Immediately fill known fields from product data
    setBookDetails(d => ({
      ...d,
      title: product.title,
      audience: product.audience ?? d.audience,
      price: product.priceCents ? String(Math.round(product.priceCents / 100)) : d.price,
    }));

    // AI-generate painPoint + benefits in the background
    setDetailsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/generate/book-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookTitle: product.title, topic: product.topic ?? undefined, audience: product.audience ?? undefined }),
      });
      if (res.ok) {
        const data: { painPoint: string; benefits: string[] } = await res.json();
        setBookDetails(d => ({
          ...d,
          painPoint: data.painPoint || d.painPoint,
          benefits: data.benefits?.length ? data.benefits : d.benefits,
        }));
      }
    } catch {
      // Silent — user can fill manually
    } finally {
      setDetailsLoading(false);
    }
  };

  const startWizard = () => {
    setStep("select"); setSelectedProduct(null); setAdType(null);
    setBookDetails({ title: "", painPoint: "", audience: "", country: "Global", price: "", benefits: [] });
    setBenefitInput(""); setPlatforms(new Set()); setObjective(null); setResults(null);
    setDetailsLoading(false);
    setMode("wizard");
  };

  const goBack = () => {
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx > 0) setStep(WIZARD_STEPS[idx - 1]);
    else setMode("list");
  };

  const goNext = () => {
    if (step === "objective") { handleGenerate(); return; }
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx < WIZARD_STEPS.length - 1) setStep(WIZARD_STEPS[idx + 1]);
  };

  const handleGenerate = async () => {
    setStep("generating");
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/generate/ad-copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bookTitle: bookDetails.title,
          painPoint: bookDetails.painPoint || undefined,
          audience: bookDetails.audience || undefined,
          country: bookDetails.country || undefined,
          price: bookDetails.price || undefined,
          benefits: bookDetails.benefits.length > 0 ? bookDetails.benefits : undefined,
          adType: adType!,
          platforms: [...platforms],
          objective: objective!,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Request failed (${response.status})`);
      }
      const gen: GeneratedResults = await response.json();
      setResults(gen);
      const campaign: Campaign = {
        id: Date.now().toString(),
        productId: selectedProduct!.id,
        productTitle: bookDetails.title || selectedProduct!.title,
        adType: adType!,
        adTypeLabel: AD_TYPES.find(a => a.value === adType)?.label ?? adType!,
        platforms: [...platforms],
        objective: objective!,
        bookDetails,
        results: gen,
        createdAt: new Date().toISOString(),
      };
      const updated = [campaign, ...campaigns];
      setCampaigns(updated);
      storeCampaigns(updated);
      setActiveCampaign(campaign);
      setStep("results");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed. Please try again.";
      toast({ title: "Generation failed", description: message, variant: "destructive" });
      setStep("objective");
    }
  };

  const addBenefit = () => {
    const v = benefitInput.trim();
    if (!v) return;
    setBookDetails(d => ({ ...d, benefits: [...d.benefits, v] }));
    setBenefitInput("");
  };

  const removeBenefit = (i: number) => setBookDetails(d => ({ ...d, benefits: d.benefits.filter((_, idx) => idx !== i) }));

  const togglePlatform = (p: Platform) => setPlatforms(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });

  const canProceed = (): boolean => {
    if (step === "select")    return !!selectedProduct;
    if (step === "ad-type")   return !!adType;
    if (step === "details")   return !!bookDetails.title.trim();
    if (step === "platforms") return platforms.size > 0;
    if (step === "objective") return !!objective;
    return false;
  };

  const progressPct = (() => {
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx < 0) return 100;
    return Math.round(((idx + 1) / WIZARD_STEPS.length) * 100);
  })();

  // ── List view ──────────────────────────────────────────────────────────────

  if (mode === "list") {
    return (
      <AppLayout>
        <div className="p-8 max-w-6xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-ink-900">Promote eBook</h1>
              <p className="text-ink-500 mt-1">Generate AI-powered ad creatives for your eBooks.</p>
            </div>
            <Button onClick={startWizard} className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold gap-2">
              <Plus className="w-4 h-4" /> Generate Ad Copy
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <div className="bg-white border border-ink-200 rounded-2xl shadow-sm flex flex-col items-center justify-center py-24 px-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mb-6">
                <Megaphone className="w-10 h-10 text-brand-400" />
              </div>
              <h2 className="text-xl font-display font-bold text-ink-900 mb-2">No ad campaigns yet</h2>
              <p className="text-ink-500 max-w-sm mb-8">Pick an eBook from your library and let AI write your ad copy, image concepts, and video scripts in seconds.</p>
              <Button onClick={startWizard} className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold gap-2">
                <Sparkles className="w-4 h-4" /> Generate Your First Campaign
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map(c => (
                <div
                  key={c.id}
                  className="bg-white border border-ink-200 rounded-2xl shadow-sm p-5 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => { setActiveCampaign(c); setResults(c.results); setStep("results"); setMode("wizard"); }}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 shrink-0">
                      {AD_TYPES.find(a => a.value === c.adType)?.icon}
                    </div>
                    <Badge variant="secondary" className="bg-ink-100 text-ink-600 rounded-full text-xs font-medium capitalize">
                      {c.platforms.join(", ")}
                    </Badge>
                  </div>
                  <p className="font-semibold text-ink-900 group-hover:text-brand-600 transition-colors line-clamp-2 mb-1">{c.bookDetails.title || c.productTitle}</p>
                  <p className="text-sm text-ink-500 mb-3 capitalize">{c.adTypeLabel} · {c.objective}</p>
                  <div className="flex items-center gap-2 text-xs text-ink-400">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // ── Wizard view ────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-paper">

        {/* Wizard progress bar — hidden on generating & results */}
        {step !== "generating" && step !== "results" && (
          <div className="bg-white border-b sticky top-16 z-20 px-8 py-5">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-1">
                <button onClick={goBack} className="text-ink-400 hover:text-ink-700 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold text-ink-900">
                  {STEP_LABELS[WIZARD_STEPS.indexOf(step)]}
                </span>
              </div>
              <div className="h-1.5 w-full bg-ink-100 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-2xl mx-auto">

            {/* ── Step: Select eBook ────────────────────────────────── */}
            {step === "select" && (
              <div>
                <p className="text-ink-500 mb-6">Which eBook do you want to create ad creatives for?</p>
                {ebookProducts.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-ink-200">
                    <FileText className="w-12 h-12 text-ink-300 mx-auto mb-3" />
                    <p className="text-ink-500 font-medium">No eBooks found</p>
                    <p className="text-ink-400 text-sm mt-1">Create an eBook first, then come back to promote it.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ebookProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          const prod = { id: p.id, title: p.title, topic: p.topic, audience: (p as { audience?: string | null }).audience, priceCents: (p as { priceCents?: number | null }).priceCents };
                          setSelectedProduct(prod);
                          prefillBookDetails(prod);
                        }}
                        className={cn(
                          "w-full text-left flex items-center gap-4 bg-white border-2 rounded-xl p-4 transition-all",
                          selectedProduct?.id === p.id
                            ? "border-brand-500 bg-brand-50"
                            : "border-ink-200 hover:border-brand-300"
                        )}
                      >
                        <div className="w-10 h-14 bg-ink-100 rounded overflow-hidden flex items-center justify-center shrink-0">
                          {(p.coverConfig as { imageUrl?: string } | null)?.imageUrl ? (
                            <img
                              src={`${import.meta.env.BASE_URL}api/storage${(p.coverConfig as { imageUrl: string }).imageUrl.replace(/^\/api\/storage/, "")}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-5 h-5 text-ink-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink-900 truncate">{p.title}</p>
                          {p.topic && <p className="text-sm text-ink-500 truncate">{p.topic}</p>}
                        </div>
                        {selectedProduct?.id === p.id && <Check className="w-5 h-5 text-brand-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Step: Ad Type ─────────────────────────────────────── */}
            {step === "ad-type" && (
              <div>
                <p className="text-ink-500 mb-6">What type of ad creatives do you want to generate?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {AD_TYPES.map(at => (
                    <button
                      key={at.value}
                      onClick={() => setAdType(at.value)}
                      className={cn(
                        "text-left flex flex-col gap-3 bg-white border-2 rounded-xl p-5 transition-all",
                        adType === at.value
                          ? "border-brand-500 bg-brand-50"
                          : "border-ink-200 hover:border-brand-300"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        adType === at.value ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-500"
                      )}>
                        {at.icon}
                      </div>
                      <div>
                        <p className="font-bold text-ink-900">{at.label}</p>
                        <p className="text-sm text-ink-500 mt-0.5">{at.desc}</p>
                        <p className="text-xs text-ink-400 mt-2"><span className="font-medium">Includes:</span> {at.includes}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step: Book Details ────────────────────────────────── */}
            {step === "details" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-ink-500">Review your book details. This data shapes every ad creative.</p>
                  {detailsLoading && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-500 font-medium">
                      <span className="w-3 h-3 rounded-full border-2 border-brand-400 border-t-transparent animate-spin inline-block" />
                      Auto-filling with AI…
                    </span>
                  )}
                </div>
                <div className="bg-white border border-ink-200 rounded-2xl p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-ink-700 mb-1.5">Book Title <span className="text-brand-500">*</span></label>
                    <Input value={bookDetails.title} onChange={e => setBookDetails(d => ({ ...d, title: e.target.value }))} placeholder="e.g. The 30-Day Belly Fat Destroyer" className="rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink-700 mb-1.5">Main Pain Point</label>
                    <Textarea value={bookDetails.painPoint} onChange={e => setBookDetails(d => ({ ...d, painPoint: e.target.value }))} placeholder="e.g. Struggling to lose belly fat without going to the gym" rows={3} className="rounded-xl resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink-700 mb-1.5">Target Audience</label>
                    <Input value={bookDetails.audience} onChange={e => setBookDetails(d => ({ ...d, audience: e.target.value }))} placeholder="e.g. Men and women 25–45, busy professionals" className="rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-ink-700 mb-1.5">Target Country</label>
                      <select
                        value={bookDetails.country}
                        onChange={e => setBookDetails(d => ({ ...d, country: e.target.value }))}
                        className="w-full h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      >
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink-700 mb-1.5">Price (USD)</label>
                      <Input value={bookDetails.price} onChange={e => setBookDetails(d => ({ ...d, price: e.target.value }))} placeholder="e.g. 27" type="number" min="0" className="rounded-xl" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink-700 mb-1.5">Key Benefits</label>
                    <div className="flex gap-2">
                      <Input
                        value={benefitInput}
                        onChange={e => setBenefitInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBenefit(); } }}
                        placeholder="Add a benefit..."
                        className="rounded-xl flex-1"
                      />
                      <Button onClick={addBenefit} variant="outline" className="rounded-xl shrink-0" size="icon"><Plus className="w-4 h-4" /></Button>
                    </div>
                    {bookDetails.benefits.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {bookDetails.benefits.map((b, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-3 py-1 text-sm">
                            {b}
                            <button onClick={() => removeBenefit(i)} className="text-brand-400 hover:text-brand-600"><X className="w-3.5 h-3.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step: Target Platforms ────────────────────────────── */}
            {step === "platforms" && (
              <div>
                <p className="text-ink-500 mb-6">Select the platforms you want to advertise on. You can pick multiple.</p>
                <div className="grid grid-cols-2 gap-4">
                  {PLATFORMS.map(pl => {
                    const selected = platforms.has(pl.value);
                    return (
                      <button
                        key={pl.value}
                        onClick={() => togglePlatform(pl.value)}
                        className={cn(
                          "relative text-center flex flex-col items-center gap-3 bg-white border-2 rounded-xl p-6 transition-all",
                          selected ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-brand-300"
                        )}
                      >
                        {selected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className={cn("transition-colors", selected ? "text-brand-500" : "text-ink-400")}>{pl.icon}</div>
                        <div>
                          <p className="font-bold text-ink-900">{pl.label}</p>
                          <p className="text-xs text-ink-500 text-center mt-0.5">{pl.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step: Objective ───────────────────────────────────── */}
            {step === "objective" && (
              <div>
                <p className="text-ink-500 mb-6">What should your ads optimize for?</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {OBJECTIVES.map(obj => (
                    <button
                      key={obj.value}
                      onClick={() => setObjective(obj.value)}
                      className={cn(
                        "text-center flex flex-col items-center gap-3 bg-white border-2 rounded-xl p-6 transition-all",
                        objective === obj.value ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-brand-300"
                      )}
                    >
                      <div className={cn("transition-colors", objective === obj.value ? "text-brand-500" : "text-ink-300")}>{obj.icon}</div>
                      <div>
                        <p className="font-bold text-ink-900">{obj.label}</p>
                        <p className="text-xs text-ink-500 mt-0.5">{obj.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step: Generating ─────────────────────────────────── */}
            {step === "generating" && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="relative w-20 h-20 mb-8">
                  <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center">
                    <Sparkles className="w-9 h-9 text-brand-400" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
                </div>
                <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">Creating Your Ad Creatives</h2>
                <p className="text-ink-500 mb-2">Building {AD_TYPES.find(a => a.value === adType)?.label.toLowerCase()}…</p>
                <p className="text-ink-400 text-sm">This may take 10–30 seconds…</p>
              </div>
            )}

            {/* ── Step: Results ─────────────────────────────────────── */}
            {step === "results" && results && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-ink-900">Your Ad Creatives</h2>
                    <p className="text-ink-500 text-sm mt-0.5">{activeCampaign?.bookDetails.title || activeCampaign?.productTitle}</p>
                  </div>
                  <Button onClick={() => setMode("list")} variant="outline" className="rounded-xl">
                    ← Back to list
                  </Button>
                </div>

                <div className="space-y-6">
                  {results.adCopy && (
                    <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-ink-100 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-500" />
                        <span className="font-semibold text-ink-900">Ad Copy Variations</span>
                        <span className="ml-auto text-xs text-ink-400">{results.adCopy.length} variations</span>
                      </div>
                      <div className="divide-y divide-ink-100">
                        {results.adCopy.map((copy, i) => (
                          <div key={i} className="px-6 py-5">
                            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-2">Hook {i + 1}</p>
                            <p className="font-semibold text-ink-900 mb-1">{copy.hook}</p>
                            <p className="text-ink-600 text-sm mb-2">{copy.body}</p>
                            <span className="inline-block bg-brand-500 text-white text-xs font-semibold px-3 py-1 rounded-full">{copy.cta}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.imageAds && (
                    <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-ink-100 flex items-center gap-2">
                        <Image className="w-4 h-4 text-brand-500" />
                        <span className="font-semibold text-ink-900">Image Ad Concepts</span>
                        <span className="ml-auto text-xs text-ink-400">{results.imageAds.length} concepts</span>
                      </div>
                      <div className="divide-y divide-ink-100">
                        {results.imageAds.map((img, i) => (
                          <div key={i} className="px-6 py-5">
                            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-2">Concept {i + 1}</p>
                            <p className="font-bold text-ink-900 mb-1">{img.headline}</p>
                            <p className="text-ink-600 text-sm mb-2">{img.subtext}</p>
                            <div className="bg-ink-50 rounded-xl px-4 py-3 text-xs text-ink-500 italic">Visual: {img.visual}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.videoScripts && (
                    <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-ink-100 flex items-center gap-2">
                        <Video className="w-4 h-4 text-brand-500" />
                        <span className="font-semibold text-ink-900">Video Scripts</span>
                        <span className="ml-auto text-xs text-ink-400">{results.videoScripts.length} scripts</span>
                      </div>
                      <div className="divide-y divide-ink-100">
                        {results.videoScripts.map((vs, i) => (
                          <div key={i} className="px-6 py-5">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="font-bold text-ink-900">{vs.title}</span>
                              <Badge variant="secondary" className="bg-ink-100 text-ink-600 rounded-full text-xs">{vs.type}</Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-semibold text-ink-500">Hook: </span><span className="text-ink-700">{vs.hook}</span></div>
                              <div><span className="font-semibold text-ink-500">Body: </span><span className="text-ink-700">{vs.body}</span></div>
                              <div><span className="font-semibold text-ink-500">CTA: </span><span className="text-ink-700">{vs.cta}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-center">
                  <Button onClick={startWizard} className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold gap-2">
                    <Plus className="w-4 h-4" /> Generate Another Campaign
                  </Button>
                </div>
              </div>
            )}

            {/* ── Continue button ───────────────────────────────────── */}
            {step !== "generating" && step !== "results" && (
              <div className="mt-8 flex justify-end">
                <Button
                  onClick={goNext}
                  disabled={!canProceed()}
                  className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 gap-2 disabled:opacity-40"
                >
                  {step === "objective" ? (
                    <><Sparkles className="w-4 h-4" /> Generate Creatives</>
                  ) : (
                    <>Continue <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
