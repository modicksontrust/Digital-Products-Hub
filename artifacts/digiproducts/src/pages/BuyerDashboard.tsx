/**
 * /my-purchases — Buyer account dashboard.
 *
 * Reads from sessionStorage (populated at checkout).
 * Includes a demo-login mode so visitors can preview the account experience.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/PublicLayout";
import type { Purchase } from "@/pages/Checkout";
import {
  Download, BookOpen, ShoppingBag, CheckCircle2,
  Sparkles, ArrowRight, LogOut, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_PURCHASES: Purchase[] = [
  {
    id: "demo-1",
    slug: "the-freelance-focus-playbook",
    title: "The Freelance Focus Playbook",
    authorName: "Tunde Bakare",
    priceCents: 1700,
    currency: "USD",
    topic: "Freelancing",
    type: "ebook",
    buyerEmail: "demo@pokipoki.co",
    buyerName: "Demo User",
    purchasedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-2",
    slug: "steady-the-no-spike-eating-guide",
    title: "Steady: The No-Spike Eating Guide for Reversing Insulin Resistance",
    authorName: "Dr. Sarah Mensah",
    priceCents: 2700,
    currency: "USD",
    topic: "Health & Wellness",
    type: "ebook",
    buyerEmail: "demo@pokipoki.co",
    buyerName: "Demo User",
    purchasedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-3",
    slug: "zero-to-5k-digital-product-sales",
    title: "Zero to $5K: The Beginner's Blueprint for Digital Product Sales",
    authorName: "Chidi Nwosu",
    priceCents: 1700,
    currency: "USD",
    topic: "Business",
    type: "ebook",
    buyerEmail: "demo@pokipoki.co",
    buyerName: "Demo User",
    purchasedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const DEMO_KEY = "pokipoki_demo_mode";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_GRADIENT: Record<string, string> = {
  "Health & Wellness": "from-emerald-400 to-teal-500",
  "Business":          "from-blue-500 to-indigo-600",
  "Personal Finance":  "from-amber-400 to-orange-500",
  "Productivity":      "from-purple-500 to-pink-500",
  "Freelancing":       "from-rose-400 to-red-500",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function fmtPrice(priceCents: number | null, currency: string) {
  if (!priceCents) return "Free";
  return `${currency} ${(priceCents / 100).toFixed(2)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const gradient = CATEGORY_GRADIENT[purchase.topic ?? ""] ?? "from-brand-400 to-brand-600";
  const coverUrl = `${import.meta.env.BASE_URL}api/public/sales-page/${purchase.slug}/cover`;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center">
      {/* Cover thumbnail */}
      <div className={cn(
        "relative flex h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br shadow",
        gradient,
      )}>
        <img
          src={coverUrl}
          alt={purchase.title}
          className="h-full w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen className="h-6 w-6 text-white/40" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-ink-900 leading-snug line-clamp-2">{purchase.title}</p>
        {purchase.authorName && (
          <p className="mt-0.5 text-xs text-ink-400">by {purchase.authorName}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-ink-500">{fmtDate(purchase.purchasedAt)}</span>
          <span className="font-semibold text-ink-700">
            {fmtPrice(purchase.priceCents, purchase.currency)}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Confirmed
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
        <button
          onClick={() =>
            alert(
              "In production, this opens your secure download link.\nCheck your email for the access link.",
            )
          }
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Download className="h-4 w-4" /> Download
        </button>
        <Link href={`/p/${purchase.slug}`}>
          <button className="rounded-xl border border-ink-200 px-4 py-2.5 text-xs font-medium text-ink-600 transition hover:bg-ink-50">
            View page
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BuyerDashboard() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const wasDemo = sessionStorage.getItem(DEMO_KEY) === "true";
    if (wasDemo) {
      setPurchases(DEMO_PURCHASES);
      setIsDemoMode(true);
    } else {
      const stored = JSON.parse(
        sessionStorage.getItem("pokipoki_purchases") ?? "[]",
      ) as Purchase[];
      setPurchases(stored);
    }
  }, []);

  function enterDemoMode() {
    sessionStorage.setItem(DEMO_KEY, "true");
    setPurchases(DEMO_PURCHASES);
    setIsDemoMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exitDemoMode() {
    sessionStorage.removeItem(DEMO_KEY);
    setIsDemoMode(false);
    const stored = JSON.parse(
      sessionStorage.getItem("pokipoki_purchases") ?? "[]",
    ) as Purchase[];
    setPurchases(stored);
  }

  const hasPurchases = purchases.length > 0;

  // ── No purchases yet ──────────────────────────────────────────────────────
  if (!hasPurchases) {
    return (
      <PublicLayout>
        {/* Header */}
        <section className="border-b border-ink-100 bg-gradient-to-b from-ink-50 to-white py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
            <User className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-4xl font-extrabold text-ink-900">My Account</h1>
          <p className="mt-3 text-base text-ink-500 max-w-md mx-auto">
            You don't have an account yet. Purchase a product first — your
            account is created automatically at checkout.
          </p>
        </section>

        <div className="mx-auto max-w-2xl px-6 py-16 pb-28 space-y-6">

          {/* How it works card */}
          <div className="rounded-2xl border border-ink-200 bg-white p-8 shadow-sm text-center">
            <h2 className="font-bold text-lg text-ink-900 mb-2">How your account works</h2>
            <p className="text-sm text-ink-500 mb-8 max-w-sm mx-auto">
              No sign-up form needed. Buy a product and your purchase history
              appears here automatically.
            </p>
            <div className="grid gap-4 sm:grid-cols-3 mb-8 text-left">
              {[
                {
                  step: "1",
                  title: "Browse & buy",
                  desc: "Find a product you love and complete checkout.",
                  color: "bg-brand-600",
                },
                {
                  step: "2",
                  title: "Instant access",
                  desc: "Download your product immediately after payment.",
                  color: "bg-emerald-600",
                },
                {
                  step: "3",
                  title: "Return anytime",
                  desc: "Come back here to re-download or access your library.",
                  color: "bg-purple-600",
                },
              ].map((s) => (
                <div key={s.step} className="flex flex-col gap-2 rounded-xl border border-ink-100 p-4 bg-ink-50">
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold text-white", s.color)}>
                    {s.step}
                  </span>
                  <p className="text-sm font-bold text-ink-900">{s.title}</p>
                  <p className="text-xs text-ink-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
            <Link href="/shop">
              <button className="group inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500">
                Browse the shop
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-ink-200" />
            <span className="text-xs text-ink-400 font-medium">or</span>
            <div className="flex-1 border-t border-ink-200" />
          </div>

          {/* Demo login card */}
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-emerald-50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="font-bold text-lg text-ink-900 mb-1">Try a demo account</h2>
            <p className="text-sm text-ink-500 mb-6 max-w-xs mx-auto">
              Want to see what your account looks like after buying? Load a sample
              account with 3 purchased products.
            </p>
            <button
              onClick={enterDemoMode}
              className="group inline-flex items-center gap-2 rounded-xl bg-ink-900 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-ink-700"
            >
              <Sparkles className="h-4 w-4" />
              View demo account
            </button>
            <p className="mt-3 text-xs text-ink-400">
              Demo data only — no real account is created
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ── Has purchases (real or demo) ──────────────────────────────────────────
  return (
    <PublicLayout>
      {/* Header */}
      <section className="border-b border-ink-100 bg-gradient-to-b from-ink-50 to-white py-14">
        <div className="mx-auto max-w-3xl px-6 flex items-start justify-between gap-4">
          <div>
            <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-brand-600">
              {isDemoMode ? "Demo account" : "Your account"}
            </span>
            <h1 className="font-display text-4xl font-extrabold text-ink-900">
              {isDemoMode ? "Demo User" : purchases[0]?.buyerName ?? "My Purchases"}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {isDemoMode ? "demo@pokipoki.co" : purchases[0]?.buyerEmail}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 shadow-sm">
              <ShoppingBag className="h-3.5 w-3.5" />
              {purchases.length} {purchases.length === 1 ? "purchase" : "purchases"}
            </span>
            {isDemoMode && (
              <button
                onClick={exitDemoMode}
                className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-600 shadow-sm transition hover:bg-ink-50"
              >
                <LogOut className="h-3.5 w-3.5" /> Exit demo
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-10 pb-24 space-y-5">

        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3">
            <Sparkles className="h-4 w-4 shrink-0 text-brand-500" />
            <p className="text-sm text-brand-800">
              <span className="font-semibold">Demo mode.</span>{" "}
              These are sample purchases so you can preview the account experience.{" "}
              <Link href="/shop">
                <span className="cursor-pointer font-semibold underline underline-offset-2">
                  Buy a real product →
                </span>
              </Link>
            </p>
          </div>
        )}

        {/* Section heading */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink-900">
            {isDemoMode ? "Sample purchases" : "Your purchases"}{" "}
            <span className="ml-1 text-sm font-normal text-ink-400">
              ({purchases.length})
            </span>
          </h2>
          <Link href="/shop">
            <button className="hidden items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-800 transition sm:flex">
              Browse more <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>

        {/* Purchase cards */}
        <div className="space-y-4">
          {purchases.map((p, i) => (
            <PurchaseCard key={p.id ?? i} purchase={p} />
          ))}
        </div>

        {/* Browse more CTA */}
        <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 py-10 text-center">
          <p className="font-semibold text-ink-700 mb-1">Looking for more?</p>
          <p className="text-sm text-ink-400 mb-5">
            Explore hundreds of expert digital products across every topic.
          </p>
          <Link href="/shop">
            <button className="rounded-xl bg-ink-900 px-7 py-3 text-sm font-bold text-white transition hover:bg-ink-700">
              Browse the shop →
            </button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
