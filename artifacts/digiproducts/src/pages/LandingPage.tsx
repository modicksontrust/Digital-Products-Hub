/**
 * PokiPoki public homepage.
 * Structure: Nav → Hero (video) → About → Featured Products → How It Works → FAQ → Footer
 */
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/PublicLayout";
import { cn } from "@/lib/utils";
import {
  ArrowRight, Play, ShieldCheck, Zap, Star,
  BookOpen, ChevronDown, ChevronRight,
  TrendingUp, Download, GraduationCap,
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

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "Health & Wellness": "from-emerald-400 to-teal-500",
  "Business":          "from-blue-500 to-indigo-600",
  "Personal Finance":  "from-amber-400 to-orange-500",
  "Productivity":      "from-purple-500 to-pink-500",
  "Freelancing":       "from-rose-400 to-red-500",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: BookOpen,
    title: "Browse the shop",
    desc: "Explore hundreds of premium digital products across health, business, finance, productivity, and more.",
  },
  {
    step: "02",
    icon: ShieldCheck,
    title: "Checkout in 60 seconds",
    desc: "Select your country — the price converts to your currency automatically. Pay securely with your card.",
  },
  {
    step: "03",
    icon: Download,
    title: "Instant access",
    desc: "Your download or access link lands in your inbox immediately. No waiting, no shipping.",
  },
];

const HOMEPAGE_FAQS = [
  { q: "What kinds of products does PokiPoki sell?", a: "We sell digital products — eBooks, guides, templates, and online courses — on topics like health, business, personal finance, productivity, and freelancing. All products are created by expert authors and reviewed for quality before listing." },
  { q: "Which currencies do you accept?", a: "We support USD, NGN, GBP, EUR, GHS, KES, ZAR, CAD, and more. Your price automatically converts when you select your country at checkout." },
  { q: "Is my payment secure?", a: "Yes. Payments are processed by Stripe and Paystack — two of the world's most trusted payment providers — using 256-bit SSL encryption. We never store your card details." },
  { q: "What if I'm not satisfied with my purchase?", a: "We offer a 7-day no-questions-asked refund guarantee. Contact support@pokipoki.co within 7 days of purchase for a full refund." },
];

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
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-ink-500">{a}</p>}
    </div>
  );
}

function ProductCard({ product }: { product: PublicProduct }) {
  const gradient = CATEGORY_COLORS[product.topic ?? ""] ?? "from-brand-400 to-brand-600";
  const price = product.priceCents
    ? `$${(product.priceCents / 100).toFixed(2)}`
    : "Free";
  const coverUrl = product.slug
    ? `${import.meta.env.BASE_URL}api/public/sales-page/${product.slug}/cover`
    : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      {/* Cover */}
      <div className={cn("relative h-44 overflow-hidden bg-gradient-to-br", gradient)}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={product.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-12 w-12 text-white/60" />
          </div>
        )}
        {product.topic && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700 backdrop-blur-sm">
            {product.topic}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-1 line-clamp-2 text-sm font-semibold text-ink-900 leading-snug">{product.title}</p>
        {product.authorName && (
          <p className="mb-3 text-xs text-ink-400">by {product.authorName}</p>
        )}
        <div className="mt-auto flex items-center justify-between">
          <span className="font-bold text-ink-900">{price}</span>
          {product.slug ? (
            <Link href={`/checkout/${product.slug}`}>
              <button className="flex items-center gap-1 rounded-xl bg-ink-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-700">
                Buy Now <ChevronRight className="h-3 w-3" />
              </button>
            </Link>
          ) : (
            <button disabled className="rounded-xl bg-ink-100 px-3.5 py-2 text-xs font-semibold text-ink-400 cursor-not-allowed">
              Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 text-white">
        {/* Background blobs */}
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-600/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: copy */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
                <Zap className="h-3.5 w-3.5 text-brand-400" />
                Premium digital products, instant delivery
              </div>

              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Knowledge that{" "}
                <span className="bg-gradient-to-r from-brand-400 to-emerald-400 bg-clip-text text-transparent">
                  changes your life
                </span>
                , delivered instantly.
              </h1>

              <p className="mt-5 text-base leading-relaxed text-white/70 md:text-lg">
                Browse expert-written eBooks and guides on health, business, personal finance,
                productivity, and freelancing. Buy in your currency. Access immediately.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/shop">
                  <button className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-500">
                    Browse the Shop <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <a href="#how-it-works">
                  <button className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/90 transition hover:bg-white/10">
                    How it works
                  </button>
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-white/50">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Secure checkout</span>
                <span className="flex items-center gap-1.5"><Download className="h-4 w-4 text-brand-400" /> Instant delivery</span>
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-400" /> 7-day guarantee</span>
              </div>
            </div>

            {/* Right: video demo */}
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                {/* Video placeholder — replace the src with your actual YouTube video ID */}
                <div className="relative aspect-video bg-ink-800">
                  {/* Replace YOUTUBE_VIDEO_ID below with your actual tutorial video ID */}
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-ink-900/80 text-center px-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/20">
                      <Play className="h-8 w-8 fill-white text-white ml-1" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">Watch: How to buy on PokiPoki</p>
                      <p className="mt-1 text-xs text-white/50">Tutorial video — coming soon</p>
                    </div>
                  </div>
                  {/* Once you have a video, replace the div above with:
                  <iframe
                    src="https://www.youtube.com/embed/YOUR_VIDEO_ID?rel=0&modestbranding=1"
                    title="How to buy on PokiPoki"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  /> */}
                  {/* Overlay label */}
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-xs font-medium text-white/80 flex items-center gap-1.5">
                      <Play className="h-3.5 w-3.5 fill-white text-white" />
                      See how easy it is to buy and access your products
                    </p>
                  </div>
                </div>
              </div>
              {/* Floating stat cards */}
              <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-white/10 bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:block">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink-900">10,000+ downloads</p>
                    <p className="text-[10px] text-ink-400">this month alone</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <section className="border-y border-ink-100 bg-ink-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-ink-100 px-6 md:grid-cols-4">
          {[
            { label: "Products", value: "100+" },
            { label: "Happy customers", value: "5,000+" },
            { label: "Authors", value: "20+" },
            { label: "Refund rate", value: "<1%" },
          ].map((s) => (
            <div key={s.label} className="px-6 py-8 text-center">
              <p className="font-display text-3xl font-bold text-ink-900">{s.value}</p>
              <p className="mt-1 text-sm text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured products ─────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-brand-600">
                Top picks
              </span>
              <h2 className="font-display text-3xl font-bold text-ink-900">
                Featured Products
              </h2>
            </div>
            <Link href="/shop">
              <button className="hidden items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800 transition sm:flex">
                View all <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/shop">
              <button className="rounded-xl border border-ink-200 bg-white px-8 py-3 text-sm font-semibold text-ink-700 shadow-sm transition hover:bg-ink-50">
                Browse all products →
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-ink-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-brand-400">
              Simple process
            </span>
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Get your product in 3 steps
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative rounded-2xl border border-white/10 bg-white/5 p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="font-display text-5xl font-bold text-white/10">
                      {step.step}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">{step.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link href="/shop">
              <button className="rounded-xl bg-brand-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-500">
                Start browsing now →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 text-center">
          <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-brand-600">
            Browse by topic
          </span>
          <h2 className="font-display text-3xl font-bold text-ink-900">Shop by Category</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(CATEGORY_COLORS).map(([cat, gradient]) => (
            <Link key={cat} href={`/shop?category=${encodeURIComponent(cat)}`}>
              <div className={cn(
                "group flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br p-6 text-white transition hover:scale-105 hover:shadow-lg cursor-pointer",
                gradient,
              )}>
                <GraduationCap className="h-8 w-8 opacity-90" />
                <span className="text-center text-sm font-semibold leading-snug">{cat}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="bg-ink-50 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-10 text-center">
            <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-brand-600">
              Common questions
            </span>
            <h2 className="font-display text-3xl font-bold text-ink-900">FAQ</h2>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white px-6 shadow-sm">
            {HOMEPAGE_FAQS.map((faq) => (
              <FaqAccordion key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>

          <div className="mt-6 text-center text-sm text-ink-500">
            More questions?{" "}
            <Link href="/faq">
              <span className="cursor-pointer font-medium text-brand-600 hover:underline">
                Visit our full FAQ page →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
