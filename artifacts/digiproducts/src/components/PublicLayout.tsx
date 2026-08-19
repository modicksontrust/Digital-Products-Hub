/**
 * Shared layout for all public-facing pages.
 * Exports: PublicNav, PublicFooter, PublicLayout
 */
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Menu, X, ShoppingBag } from "lucide-react";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/faq", label: "FAQ" },
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
  return (
    <footer className="border-t border-ink-200 bg-ink-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 text-sm font-bold text-white">
                P
              </div>
              <span className="font-display text-xl font-bold">PokiPoki</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-ink-400">
              Premium digital products — eBooks, courses, and guides — curated to help you
              level up your health, wealth, and career.
            </p>

            {/* How it works mini (footer) */}
            <div className="mt-8">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">
                How it works
              </p>
              <div className="space-y-3 text-sm text-ink-400">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>
                  <span>Browse the shop and find a product you love</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>
                  <span>Complete checkout in under 60 seconds — pick your currency</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">3</span>
                  <span>Instant access — download your product or start your course</span>
                </div>
              </div>
            </div>
          </div>

          {/* Browse */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">Browse</h4>
            <ul className="space-y-3 text-sm text-ink-400">
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
                    <span className="cursor-pointer transition hover:text-white">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">Company</h4>
            <ul className="space-y-3 text-sm text-ink-400">
              {[
                { href: "/faq", label: "FAQ" },
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/terms", label: "Terms of Service" },
                { href: "/my-purchases", label: "My Purchases" },
                { href: "/login", label: "Creator Login" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="cursor-pointer transition hover:text-white">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-2 border-t border-ink-800 pt-8 text-center text-xs text-ink-600 sm:flex-row sm:justify-between">
          <span>© {year} PokiPoki. All rights reserved.</span>
          <span>Secure checkout powered by Stripe &amp; Paystack</span>
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
