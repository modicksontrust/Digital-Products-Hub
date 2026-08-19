/**
 * PokiPoki public homepage — premium redesign.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/PublicLayout";
import { cn } from "@/lib/utils";
import {
  ArrowRight, ShieldCheck, Zap, Star,
  BookOpen, ChevronDown, ChevronRight,
  Download, Globe, Lock, RefreshCcw,
  Heart, Briefcase, TrendingUp, Clock,
  Users, Award, CheckCircle2, Sparkles,
  BadgeCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProduct {
  id: string;
  title: string;
  slug: string | null;
  priceCents: number | null;
  currency: string | null;
  topic: string | null;
  type: string | null;
  authorName: string | null;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { gradient: string; icon: React.ComponentType<{ className?: string }>; bg: string }> = {
  "Health & Wellness": { gradient: "from-emerald-400 to-teal-500",   icon: Heart,      bg: "bg-emerald-50" },
  "Business":          { gradient: "from-blue-500 to-indigo-600",    icon: Briefcase,  bg: "bg-blue-50" },
  "Personal Finance":  { gradient: "from-amber-400 to-orange-500",   icon: TrendingUp, bg: "bg-amber-50" },
  "Productivity":      { gradient: "from-purple-500 to-pink-500",    icon: Clock,      bg: "bg-purple-50" },
  "Freelancing":       { gradient: "from-rose-400 to-red-500",       icon: Globe,      bg: "bg-rose-50" },
};

const STATS = [
  { value: "13,000+", label: "Products sold", icon: Download },
  { value: "5,200+",  label: "Happy customers", icon: Users },
  { value: "50+",     label: "Expert authors", icon: Award },
  { value: "< 1%",    label: "Refund rate", icon: BadgeCheck },
];

const FEATURES = [
  {
    icon: Globe,
    title: "Buy in your currency",
    desc: "We auto-convert prices to USD, NGN, GBP, EUR, GHS, KES, ZAR, and more. No hidden forex fees.",
    color: "bg-blue-100 text-blue-700",
  },
  {
    icon: Zap,
    title: "Instant delivery",
    desc: "The moment your payment clears, your download link is ready. No waiting. No shipping. No delays.",
    color: "bg-amber-100 text-amber-700",
  },
  {
    icon: Lock,
    title: "Secure checkout",
    desc: "Powered by Stripe and Paystack — 256-bit SSL, PCI-DSS compliant. Your card data is never stored.",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: RefreshCcw,
    title: "7-day guarantee",
    desc: "Not satisfied? Contact us within 7 days and we'll refund you in full — no questions asked.",
    color: "bg-purple-100 text-purple-700",
  },
  {
    icon: BadgeCheck,
    title: "Curated quality",
    desc: "Every product is reviewed by our editorial team before it goes live. Only the best makes the cut.",
    color: "bg-rose-100 text-rose-700",
  },
  {
    icon: Sparkles,
    title: "Expert authors",
    desc: "Our creators are practitioners — doctors, CFOs, full-stack freelancers — not just content farms.",
    color: "bg-indigo-100 text-indigo-700",
  },
];

const TESTIMONIALS = [
  {
    name: "Amaka O.",
    role: "Nurse, Lagos",
    avatar: "AO",
    color: "bg-emerald-500",
    stars: 5,
    text: "I bought the GLP-1 nutrition guide and it completely changed how I counsel my patients. The content is clinically accurate and incredibly practical. Worth every naira.",
    product: "GLP-1 Companion Diet",
  },
  {
    name: "James K.",
    role: "Freelance Designer, Nairobi",
    avatar: "JK",
    color: "bg-blue-500",
    stars: 5,
    text: "The Freelance Focus Playbook was exactly what I needed. I landed two new clients within a week of applying the outreach templates inside. Insane ROI.",
    product: "The Freelance Focus Playbook",
  },
  {
    name: "Chisom N.",
    role: "Business Analyst, Abuja",
    avatar: "CN",
    color: "bg-purple-500",
    stars: 5,
    text: "I've bought digital products from Gumroad and Payhip. PokiPoki's checkout is honestly smoother and the Naira pricing saves me the stress of card declines. Bookmarked for life.",
    product: "50 Proven Business Models",
  },
  {
    name: "Tolu A.",
    role: "Entrepreneur, Port Harcourt",
    avatar: "TA",
    color: "bg-rose-500",
    stars: 5,
    text: "Downloaded in under a minute after checkout. The Zero-Debt Blueprint helped me map a 14-month plan to clear my business loans. Concrete, not fluffy.",
    product: "Zero-Debt Blueprint",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: BookOpen,
    title: "Find your product",
    desc: "Browse 100+ curated digital products across health, business, finance, productivity, and freelancing. Filter by category or search by topic.",
    highlight: "Expert-curated content only",
  },
  {
    step: "02",
    icon: Globe,
    title: "Checkout in 60 seconds",
    desc: "Enter your details, choose your country (your price converts automatically), and pay securely with your card via Stripe or Paystack.",
    highlight: "12+ supported currencies",
  },
  {
    step: "03",
    icon: Download,
    title: "Access instantly",
    desc: "Your download link is delivered the moment your payment confirms. No account required — just open and start learning.",
    highlight: "Instant, no waiting",
  },
];

const HOMEPAGE_FAQS = [
  {
    q: "What kinds of products does PokiPoki sell?",
    a: "We sell digital products — eBooks, guides, templates, and online courses — on topics like health, business, personal finance, productivity, and freelancing. All products are created by verified expert authors and reviewed for quality before listing.",
  },
  {
    q: "Which currencies do you accept?",
    a: "We support USD, NGN, GBP, EUR, GHS, KES, ZAR, CAD, AUD, INR, ZMW, TZS, and more. Your price converts automatically when you select your country at checkout — no manual conversion or hidden fees.",
  },
  {
    q: "Is my payment secure?",
    a: "Yes. Payments are processed exclusively by Stripe and Paystack — two of the world's most trusted payment providers — using 256-bit SSL encryption and PCI-DSS compliance. We never store your card details.",
  },
  {
    q: "What if I'm not satisfied with my purchase?",
    a: "We offer a 7-day no-questions-asked refund guarantee. Contact support@pokipoki.co within 7 days of purchase and we'll issue a full refund to your original payment method.",
  },
  {
    q: "Do I need to create an account to buy?",
    a: "No account is required. Just enter your name and email at checkout, pay, and your download link is ready immediately.",
  },
  {
    q: "Are the products available forever after purchase?",
    a: "Yes. Once you purchase, your download link is yours to keep. We recommend saving your files locally or to cloud storage after downloading.",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ count = 5 }: { count?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

function FaqAccordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ink-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold text-ink-900 transition hover:text-brand-700"
      >
        {q}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-ink-500">{a}</p>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: PublicProduct }) {
  const cat = CATEGORY_COLORS[product.topic ?? ""];
  const gradient = cat?.gradient ?? "from-brand-400 to-brand-600";
  const price = product.priceCents
    ? `$${(product.priceCents / 100).toFixed(2)}`
    : "Free";
  const coverUrl = product.slug
    ? `${import.meta.env.BASE_URL}api/public/sales-page/${product.slug}/cover`
    : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-ink-200">
      <div className={cn("relative h-48 overflow-hidden bg-gradient-to-br", gradient)}>
        {coverUrl && (
          <img
            src={coverUrl}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        {!coverUrl && (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-14 w-14 text-white/40" />
          </div>
        )}
        {product.topic && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700 shadow-sm backdrop-blur-sm">
            {product.topic}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="mb-1 line-clamp-2 text-sm font-bold text-ink-900 leading-snug">
          {product.title}
        </p>
        {product.authorName && (
          <p className="mb-3 text-xs text-ink-400">by {product.authorName}</p>
        )}
        <div className="mb-3 flex items-center gap-1">
          <StarRow />
          <span className="text-[11px] text-ink-400 ml-1">5.0</span>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-extrabold text-ink-900">{price}</span>
          {product.slug ? (
            <Link href={`/checkout/${product.slug}`}>
              <button className="flex items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-700">
                Buy Now <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          ) : (
            <button
              disabled
              className="rounded-xl bg-ink-100 px-4 py-2.5 text-xs font-semibold text-ink-400 cursor-not-allowed"
            >
              Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { data: products = [] } = useQuery<PublicProduct[]>({
    queryKey: ["/api/public/products"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/public/products`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const featured = products.slice(0, 6);

  return (
    <PublicLayout>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink-950 via-[#0b1120] to-ink-900 text-white">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute -top-60 right-0 h-[700px] w-[700px] rounded-full bg-brand-600/15 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-0 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-blue-600/5 blur-[80px]" />

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="grid items-center gap-16 lg:grid-cols-[1fr_480px]">

            {/* LEFT: headline + copy */}
            <div className="max-w-xl">
              {/* Pill badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                Premium knowledge, instant delivery
              </div>

              {/* Headline */}
              <h1 className="font-display text-5xl font-extrabold leading-[1.08] tracking-tight md:text-6xl lg:text-[68px] text-[#ffffff]">
                Knowledge that<br />
                <span className="bg-gradient-to-r from-brand-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  changes lives
                </span>
                ,<br />delivered instantly.
              </h1>

              <p className="mt-6 text-base leading-relaxed text-white/65 md:text-lg max-w-lg">
                Expert-written eBooks, guides, and courses across health, business,
                personal finance, productivity, and freelancing. Buy in your local
                currency — access in seconds.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/shop">
                  <button className="group flex items-center gap-2 rounded-xl bg-brand-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition-all hover:bg-brand-500 hover:shadow-brand-500/40">
                    Browse the Shop
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </Link>
                <a href="#how-it-works">
                  <button className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold text-white/90 transition hover:bg-white/10">
                    How it works
                  </button>
                </a>
              </div>

              {/* Social proof */}
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Avatar stack */}
                <div className="flex -space-x-2">
                  {["bg-emerald-500","bg-blue-500","bg-purple-500","bg-rose-500","bg-amber-500"].map((c, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink-900 text-[10px] font-bold text-white",
                        c,
                      )}
                    >
                      {["A","J","C","T","E"][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <StarRow />
                    <span className="text-sm font-semibold text-white">4.9</span>
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">Trusted by 5,200+ buyers</p>
                </div>
              </div>
            </div>

            {/* RIGHT: product showcase stack */}
            <div className="relative hidden lg:block">
              {/* Main card */}
              <div className="relative z-10 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-brand-600/20 px-3 py-1 text-xs font-semibold text-brand-300">
                    🔥 Best seller this week
                  </span>
                  <div className="flex items-center gap-1">
                    <StarRow />
                    <span className="text-xs text-white/60 ml-1">5.0</span>
                  </div>
                </div>
                <div className="h-44 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-white/40" />
                </div>
                <div className="mt-4">
                  <p className="font-bold text-white text-sm leading-snug">The GLP-1 Companion Diet</p>
                  <p className="text-xs text-white/50 mt-1">by Dr. Sarah Mensah</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-white">$22.00</span>
                    <button className="rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-md">
                      Buy Now →
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating mini card — top right */}
              <div className="absolute -top-8 -right-8 z-20 w-52 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/30 text-blue-300">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">13,000+ downloads</p>
                    <p className="text-[10px] text-white/50">this month alone</p>
                  </div>
                </div>
              </div>

              {/* Floating mini card — bottom left */}
              <div className="absolute -bottom-6 -left-10 z-20 w-52 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/30 text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">7-day money-back</p>
                    <p className="text-[10px] text-white/50">no-questions guarantee</p>
                  </div>
                </div>
              </div>

              {/* Second card peaking behind */}
              <div className="absolute -bottom-4 left-4 right-4 -z-0 h-24 rounded-3xl border border-white/5 bg-white/3 backdrop-blur-sm" />
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-white" />
      </section>
      {/* ── STATS STRIP ──────────────────────────────────────────────────── */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 divide-x divide-ink-100 md:grid-cols-4">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-display text-3xl font-extrabold text-ink-900">{s.value}</p>
                  <p className="text-sm text-ink-500">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* ── FEATURED PRODUCTS ────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="bg-ink-50 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <span className="mb-2 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
                  Top picks
                </span>
                <h2 className="font-display text-4xl font-extrabold text-ink-900 mt-2">
                  Featured Products
                </h2>
                <p className="mt-3 text-base text-ink-500 max-w-lg">
                  Hand-picked by our editorial team — the products buyers love most.
                </p>
              </div>
              <Link href="/shop">
                <button className="hidden items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 shadow-sm transition hover:bg-ink-50 sm:flex">
                  View all <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href="/shop">
                <button className="rounded-xl bg-ink-900 px-10 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-ink-700">
                  Browse all products →
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}
      {/* ── WHY POKIPOKI ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-2 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
              Why PokiPoki
            </span>
            <h2 className="font-display text-4xl font-extrabold text-ink-900 mt-2">
              Built for African buyers — and everyone else
            </h2>
            <p className="mt-3 text-base text-ink-500 max-w-2xl mx-auto">
              We obsess over the details that make buying digital products a delight,
              not a headache.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-ink-100 bg-white p-7 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                >
                  <div className={cn("mb-5 flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold", f.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-ink-900">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-ink-950 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-2 inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/60">
              Real reviews
            </span>
            <h2 className="font-display text-4xl font-extrabold mt-2">
              What our buyers say
            </h2>
            <p className="mt-3 text-base text-white/50 max-w-xl mx-auto">
              Thousands of people across Africa and beyond have levelled up with PokiPoki.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <StarRow count={t.stars} />
                <p className="mt-4 flex-1 text-sm leading-relaxed text-white/75">
                  "{t.text}"
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", t.color)}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-[11px] text-white/40">{t.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-white/30 border-t border-white/10 pt-3">
                  Verified purchase · {t.product}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-2 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
              Simple process
            </span>
            <h2 className="font-display text-4xl font-extrabold text-ink-900 mt-2">
              From browsing to downloaded in 3 steps
            </h2>
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connecting line (desktop) */}
            <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden md:block">
              <div className="mx-auto h-px w-2/3 bg-gradient-to-r from-transparent via-ink-200 to-transparent" />
            </div>

            {HOW_IT_WORKS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
                    <Icon className="h-7 w-7" />
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-[10px] font-extrabold text-white border-2 border-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-ink-900">{s.title}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-ink-500 max-w-xs mx-auto">{s.desc}</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {s.highlight}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <Link href="/shop">
              <button className="group inline-flex items-center gap-2 rounded-xl bg-brand-600 px-9 py-4 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition-all hover:bg-brand-500">
                Start shopping now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
          </div>
        </div>
      </section>
      {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-ink-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <span className="mb-2 inline-block rounded-full bg-white border border-ink-200 px-3 py-1 text-xs font-bold uppercase tracking-widest text-ink-600">
              Browse by topic
            </span>
            <h2 className="font-display text-4xl font-extrabold text-ink-900 mt-2">
              Shop by Category
            </h2>
            <p className="mt-3 text-base text-ink-500 max-w-xl mx-auto">
              Whether you're healing your body, building wealth, or landing more clients —
              we have a product for that.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(CATEGORY_COLORS).map(([cat, meta]) => {
              const Icon = meta.icon;
              return (
                <Link key={cat} href={`/shop?category=${encodeURIComponent(cat)}`}>
                  <div
                    className={cn(
                      "group relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-gradient-to-br p-7 text-white cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl",
                      meta.gradient,
                    )}
                  >
                    <div className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-lg" />
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-snug">{cat}</p>
                      <p className="mt-1 text-xs text-white/70">Browse products →</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      {/* ── MID-PAGE CTA BANNER ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 py-20 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90">
            <Sparkles className="h-3.5 w-3.5" />
            Over 13,000 downloads and counting
          </div>
          <h2 className="font-display text-4xl font-extrabold leading-tight md:text-5xl">
            Ready to invest in yourself?
          </h2>
          <p className="mt-4 text-base text-white/75 max-w-xl mx-auto md:text-lg">
            Join thousands of buyers who are applying expert knowledge every single day.
            Your next breakthrough could be one download away.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/shop">
              <button className="rounded-xl bg-white px-8 py-4 text-sm font-extrabold text-brand-700 shadow-xl transition hover:bg-ink-50">
                Browse the Shop →
              </button>
            </Link>
            <div className="flex items-center gap-5 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Secure checkout</span>
              <span className="flex items-center gap-1.5"><RefreshCcw className="h-4 w-4" /> 7-day refund</span>
            </div>
          </div>
        </div>
      </section>
      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-12 text-center">
            <span className="mb-2 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
              FAQ
            </span>
            <h2 className="font-display text-4xl font-extrabold text-ink-900 mt-2">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-sm text-ink-500">
              Everything you need to know before your first purchase.
            </p>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-ink-50 px-8 shadow-sm">
            {HOMEPAGE_FAQS.map((faq) => (
              <FaqAccordion key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>

          <div className="mt-6 text-center text-sm text-ink-500">
            Still have questions?{" "}
            <Link href="/faq">
              <span className="cursor-pointer font-semibold text-brand-600 hover:underline">
                Visit our full FAQ →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
