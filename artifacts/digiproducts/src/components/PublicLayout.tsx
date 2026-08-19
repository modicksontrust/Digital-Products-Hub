/**
 * Shared layout for all public-facing pages.
 * Exports: PublicNav, PublicFooter, PublicLayout
 */
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Menu, X, ShoppingBag, Mail, ArrowRight,
  ShieldCheck, Download, Star, Twitter,
  Instagram, Youtube, CheckCircle2,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/faq", label: "FAQ" },
  { href: "/my-purchases", label: "My Account" },
];

export function PublicNav() {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/">
          <div className="flex cursor-pointer items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-emerald-500 text-sm font-bold text-white shadow-sm">
              P
            </div>
            <span className="font-display text-xl font-bold text-ink-900">PokiPoki</span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              <span className={cn(
                "text-sm font-medium transition-colors",
                loc.startsWith(l.href) ? "text-brand-700" : "text-ink-600 hover:text-ink-900",
              )}>
                {l.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link href="/shop">
            <button className="hidden items-center gap-1.5 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50 sm:flex">
              <ShoppingBag className="h-4 w-4" /> Browse
            </button>
          </Link>
          <Link href="/login">
            <button className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-700">
              Creator Login
            </button>
          </Link>
          <button className="md:hidden" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5 text-ink-600" /> : <Menu className="h-5 w-5 text-ink-600" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-ink-100 bg-white px-6 py-3 md:hidden">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              <div
                onClick={() => setOpen(false)}
                className="border-b border-ink-50 py-3 text-sm font-medium text-ink-700 last:border-0"
              >
                {l.label}
              </div>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

export function PublicFooter() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  }

  return (
    <footer className="bg-ink-950 text-white">

      {/* Newsletter strip */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600/20 text-brand-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Get new products in your inbox</p>
                <p className="text-xs text-white/50 mt-0.5">New drops, limited deals, and expert picks. No spam, ever.</p>
              </div>
            </div>
            {subscribed ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                You're subscribed — welcome aboard!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex w-full max-w-sm gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 whitespace-nowrap"
                >
                  Subscribe <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-12">

          {/* Brand column */}
          <div className="md:col-span-4">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 text-sm font-bold text-white shadow-md">
                P
              </div>
              <span className="font-display text-xl font-bold text-white">PokiPoki</span>
            </div>
            <p className="text-sm leading-relaxed text-ink-400 max-w-xs">
              Premium digital knowledge products — eBooks, guides, and courses — curated
              to help you level up your health, wealth, and career. Made for Africa
              and the world.
            </p>

            {/* Trust badges */}
            <div className="mt-8 space-y-2">
              {[
                { icon: ShieldCheck, text: "256-bit SSL · PCI-DSS compliant", color: "text-emerald-400" },
                { icon: Download,    text: "Instant delivery on every purchase", color: "text-brand-400" },
                { icon: Star,        text: "7-day money-back guarantee", color: "text-amber-400" },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.text} className="flex items-center gap-2.5 text-xs text-ink-400">
                    <Icon className={cn("h-4 w-4 shrink-0", b.color)} />
                    {b.text}
                  </div>
                );
              })}
            </div>

            {/* Social links */}
            <div className="mt-8 flex items-center gap-3">
              {[
                { Icon: Twitter,   label: "Twitter"   },
                { Icon: Instagram, label: "Instagram" },
                { Icon: Youtube,   label: "YouTube"   },
              ].map(({ Icon, label }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-ink-400 transition hover:bg-white/10 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Browse column */}
          <div className="md:col-span-2">
            <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-ink-500">Browse</h4>
            <ul className="space-y-3">
              {[
                { href: "/shop", label: "All Products" },
                { href: "/shop?category=Health+%26+Wellness", label: "Health & Wellness" },
                { href: "/shop?category=Business", label: "Business" },
                { href: "/shop?category=Personal+Finance", label: "Personal Finance" },
                { href: "/shop?category=Productivity", label: "Productivity" },
                { href: "/shop?category=Freelancing", label: "Freelancing" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="cursor-pointer text-sm text-ink-400 transition hover:text-white">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support column */}
          <div className="md:col-span-2">
            <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-ink-500">Support</h4>
            <ul className="space-y-3">
              {[
                { href: "/faq", label: "FAQ" },
                { href: "/my-purchases", label: "My Purchases" },
                { href: "mailto:support@pokipoki.co", label: "Contact Us" },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>
                    <span className="cursor-pointer text-sm text-ink-400 transition hover:text-white">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div className="md:col-span-2">
            <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-ink-500">Company</h4>
            <ul className="space-y-3">
              {[
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/terms", label: "Terms of Service" },
                { href: "/login", label: "Creator Login" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="cursor-pointer text-sm text-ink-400 transition hover:text-white">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment methods column */}
          <div className="md:col-span-2">
            <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-ink-500">We accept</h4>
            <div className="grid grid-cols-2 gap-2">
              {["Visa", "Mastercard", "Verve", "Paystack", "Stripe", "USD · NGN"].map((p) => (
                <div
                  key={p}
                  className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] font-semibold text-ink-400"
                >
                  {p}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-ink-600">
              Prices convert automatically to your local currency at checkout.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center gap-3 border-t border-white/10 pt-8 text-center text-xs text-ink-600 sm:flex-row sm:justify-between sm:text-left">
          <span>© {year} Goldcoast Technologies Hub. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Secure checkout powered by Stripe &amp; Paystack
          </span>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
