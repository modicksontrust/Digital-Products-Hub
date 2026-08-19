/**
 * /my-purchases — Buyer's purchased products dashboard.
 *
 * Reads from sessionStorage (populated at checkout completion).
 * In production this would authenticate the buyer and fetch from the API.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/PublicLayout";
import type { Purchase } from "@/pages/Checkout";
import {
  Download, BookOpen, ShoppingBag, Star, Info,
  Mail, Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  "Health & Wellness": "from-emerald-400 to-teal-500",
  "Business":          "from-blue-500 to-indigo-600",
  "Personal Finance":  "from-amber-400 to-orange-500",
  "Productivity":      "from-purple-500 to-pink-500",
  "Freelancing":       "from-rose-400 to-red-500",
};

function fmt(priceCents: number | null, currency: string) {
  if (!priceCents) return "Free";
  return `${currency} ${(priceCents / 100).toFixed(2)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export default function BuyerDashboard() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [email, setEmail] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(sessionStorage.getItem("pokipoki_purchases") ?? "[]") as Purchase[];
    setPurchases(stored);
  }, []);

  const filtered = lookupEmail
    ? purchases.filter((p) => p.buyerEmail.toLowerCase() === lookupEmail.toLowerCase())
    : purchases;

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupEmail(email.trim());
    setSubmitted(true);
  };

  return (
    <PublicLayout>
      {/* Header */}
      <section className="border-b border-ink-100 bg-gradient-to-b from-ink-50 to-white py-14 text-center">
        <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-brand-600">
          Your account
        </span>
        <h1 className="font-display text-4xl font-bold text-ink-900">My Purchases</h1>
        <p className="mt-3 text-ink-500">
          Access all the products you've purchased on PokiPoki.
        </p>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-12 pb-24 space-y-8">
        {/* Session notice */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Session-based access.</span>{" "}
            Your purchases are saved for this browser session. Enter your order email below to look up purchases, or sign in once buyer accounts are live.
          </p>
        </div>

        {/* Email lookup */}
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-bold text-ink-900">Look up your orders</h2>
          <p className="mb-4 text-sm text-ink-500">Enter the email you used at checkout to find your purchases.</p>
          <form onSubmit={handleLookup} className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="lookup-email" className="sr-only">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  id="lookup-email"
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-ink-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-ink-700"
            >
              <Search className="h-4 w-4" /> Find
            </button>
          </form>
          {submitted && lookupEmail && filtered.length === 0 && (
            <p className="mt-3 text-sm text-ink-500">
              No purchases found for <strong>{lookupEmail}</strong>. Make sure you're using the same email from checkout.
            </p>
          )}
        </div>

        {/* Purchases list */}
        {filtered.length > 0 ? (
          <div className="space-y-4">
            <h2 className="font-bold text-ink-900">
              {lookupEmail ? `Orders for ${lookupEmail}` : "Recent Purchases"}
              {" "}
              <span className="text-sm font-normal text-ink-400">({filtered.length})</span>
            </h2>

            {filtered.map((p, i) => {
              const coverUrl = `${import.meta.env.BASE_URL}api/public/sales-page/${p.slug}/cover`;
              return (
                <div
                  key={i}
                  className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
                >
                  {/* Cover */}
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow">
                    <img
                      src={coverUrl}
                      alt={p.title}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <BookOpen className="h-6 w-6 text-white/60" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-900 leading-snug">{p.title}</p>
                    {p.authorName && <p className="mt-0.5 text-xs text-ink-400">by {p.authorName}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                      <span>{fmtDate(p.purchasedAt)}</span>
                      <span className="font-semibold text-ink-700">{fmt(p.priceCents, p.currency)}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 font-medium">
                        Confirmed ✓
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 sm:flex-col sm:items-end">
                    <button
                      onClick={() => alert("In production, this opens your download link. Check your email for the access link.")}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                    <Link href={`/p/${p.slug}`}>
                      <button className="rounded-xl border border-ink-200 px-4 py-2.5 text-xs font-medium text-ink-600 transition hover:bg-ink-50">
                        View page
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : purchases.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center rounded-2xl border border-ink-100 bg-white py-20 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-300">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <p className="mt-5 font-semibold text-ink-700">No purchases yet</p>
            <p className="mt-1 max-w-xs text-sm text-ink-400">
              Products you buy will appear here instantly after checkout.
            </p>
            <Link href="/shop">
              <button className="mt-6 rounded-xl bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-700">
                Browse the shop →
              </button>
            </Link>
          </div>
        ) : null}
      </div>
    </PublicLayout>
  );
}
