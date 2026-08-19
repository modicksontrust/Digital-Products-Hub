/**
 * One-page checkout — /checkout/:slug
 *
 * Product summary (left) + full form (right) on a single screen.
 * Country selection drives real-time currency conversion.
 * Demo mode: no real payment is processed.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useGetPublicSalesPage, getGetPublicSalesPageQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock, Loader2, CheckCircle2, ShieldCheck, CreditCard,
  Download, ArrowLeft, Star, BookOpen, ChevronDown,
} from "lucide-react";

// ─── Currency / Country data ──────────────────────────────────────────────────

interface Currency {
  name: string;
  symbol: string;
  rate: number; // relative to USD
  flag: string;
}

const CURRENCIES: Record<string, Currency> = {
  USD: { name: "US Dollar",          symbol: "$",    rate: 1,     flag: "🇺🇸" },
  NGN: { name: "Nigerian Naira",     symbol: "₦",    rate: 1620,  flag: "🇳🇬" },
  GBP: { name: "British Pound",      symbol: "£",    rate: 0.79,  flag: "🇬🇧" },
  EUR: { name: "Euro",               symbol: "€",    rate: 0.92,  flag: "🇪🇺" },
  GHS: { name: "Ghanaian Cedi",      symbol: "GH₵",  rate: 15.2,  flag: "🇬🇭" },
  KES: { name: "Kenyan Shilling",    symbol: "KSh",  rate: 130,   flag: "🇰🇪" },
  ZAR: { name: "South African Rand", symbol: "R",    rate: 18.5,  flag: "🇿🇦" },
  CAD: { name: "Canadian Dollar",    symbol: "CA$",  rate: 1.36,  flag: "🇨🇦" },
  AUD: { name: "Australian Dollar",  symbol: "A$",   rate: 1.53,  flag: "🇦🇺" },
  INR: { name: "Indian Rupee",       symbol: "₹",    rate: 83,    flag: "🇮🇳" },
  ZMW: { name: "Zambian Kwacha",     symbol: "ZK",   rate: 27,    flag: "🇿🇲" },
  TZS: { name: "Tanzanian Shilling", symbol: "TSh",  rate: 2550,  flag: "🇹🇿" },
};

const COUNTRIES = [
  { code: "US", name: "United States",  currency: "USD" },
  { code: "NG", name: "Nigeria",        currency: "NGN" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "GH", name: "Ghana",          currency: "GHS" },
  { code: "KE", name: "Kenya",          currency: "KES" },
  { code: "ZA", name: "South Africa",   currency: "ZAR" },
  { code: "CA", name: "Canada",         currency: "CAD" },
  { code: "AU", name: "Australia",      currency: "AUD" },
  { code: "DE", name: "Germany",        currency: "EUR" },
  { code: "FR", name: "France",         currency: "EUR" },
  { code: "IT", name: "Italy",          currency: "EUR" },
  { code: "IN", name: "India",          currency: "INR" },
  { code: "ZM", name: "Zambia",         currency: "ZMW" },
  { code: "TZ", name: "Tanzania",       currency: "TZS" },
  { code: "UG", name: "Uganda",         currency: "USD" },
  { code: "RW", name: "Rwanda",         currency: "USD" },
];

function fmtPrice(cents: number, currencyCode: string): string {
  const cur = CURRENCIES[currencyCode] ?? CURRENCIES.USD;
  const converted = (cents / 100) * cur.rate;
  // Format nicely: NGN and KES etc. don't need 2 decimal places
  const needsDecimals = ["USD", "GBP", "EUR", "CAD", "AUD"].includes(currencyCode);
  const amount = needsDecimals ? converted.toFixed(2) : Math.round(converted).toLocaleString();
  return `${cur.symbol}${amount}`;
}

// ─── Card formatting ──────────────────────────────────────────────────────────

function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}
type Brand = "visa" | "mastercard" | "amex" | "unknown";
function cardBrand(n: string): Brand {
  const s = n.replace(/\s/g, "");
  if (/^4/.test(s)) return "visa";
  if (/^5[1-5]/.test(s)) return "mastercard";
  if (/^3[47]/.test(s)) return "amex";
  return "unknown";
}

// ─── Visual card ──────────────────────────────────────────────────────────────

function CardVisual({ number, holder, expiry, brand }: { number: string; holder: string; expiry: string; brand: Brand }) {
  const display = number.replace(/\D/g, "").padEnd(16, "•").replace(/(.{4})/g, "$1 ").trim();
  const bg: Record<Brand, string> = {
    visa:       "from-[#1a1f71] to-[#2646d8]",
    mastercard: "from-[#1a1a2e] to-[#c8102e]",
    amex:       "from-[#007b5e] to-[#00d09e]",
    unknown:    "from-ink-700 to-ink-900",
  };
  return (
    <div className={cn("relative h-36 w-full rounded-xl bg-gradient-to-br p-4 text-white shadow-lg select-none", bg[brand])}>
      <div className="mb-3 h-5 w-7 rounded-sm bg-yellow-300/80" />
      <p className="font-mono text-sm tracking-widest">{display}</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[9px] uppercase opacity-60">Card Holder</p>
          <p className="text-xs font-medium capitalize">{holder || "Your Name"}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase opacity-60">Expires</p>
          <p className="font-mono text-xs">{expiry || "MM/YY"}</p>
        </div>
        {brand === "visa" && <span className="text-lg font-bold italic">VISA</span>}
        {brand === "mastercard" && (
          <span className="flex">
            <span className="h-6 w-6 rounded-full bg-red-500 opacity-90" />
            <span className="-ml-3 h-6 w-6 rounded-full bg-yellow-400 opacity-80" />
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Session purchase store ────────────────────────────────────────────────────

export interface Purchase {
  id?: string;
  slug: string;
  title: string;
  authorName: string | null;
  priceCents: number | null;
  currency: string;
  topic?: string | null;
  type?: string | null;
  purchasedAt: string;
  buyerName: string;
  buyerEmail: string;
}

export function addPurchaseToSession(p: Purchase) {
  const existing: Purchase[] = JSON.parse(sessionStorage.getItem("pokipoki_purchases") ?? "[]");
  const updated = [p, ...existing.filter((x) => x.slug !== p.slug)];
  sessionStorage.setItem("pokipoki_purchases", JSON.stringify(updated));
}

// ─── Main component ───────────────────────────────────────────────────────────

type Step = "form" | "processing" | "success";

export default function Checkout() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useGetPublicSalesPage(slug || "", {
    query: { enabled: !!slug, queryKey: getGetPublicSalesPageQueryKey(slug || "") },
  });

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("US");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [gateway, setGateway] = useState<"stripe" | "paystack">("stripe");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("form");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const selectedCurrency = useMemo(() => {
    const c = COUNTRIES.find((c) => c.code === country);
    return c?.currency ?? "USD";
  }, [country]);

  const priceCents = data?.priceCents as number | null;
  const isFree = !priceCents || priceCents === 0;
  const displayPrice = priceCents ? fmtPrice(priceCents, selectedCurrency) : "Free";
  const curInfo = CURRENCIES[selectedCurrency] ?? CURRENCIES.USD;
  const brand = cardBrand(cardNumber);

  const coverUrl = data?.coverImageUrl
    ? `${import.meta.env.BASE_URL}api${data.coverImageUrl}`
    : null;

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = "Valid email required";
    if (!isFree) {
      if (!cardHolder.trim()) e.cardHolder = "Card holder name required";
      if (cardNumber.replace(/\s/g, "").length < 13) e.cardNumber = "Enter a valid card number";
      if (expiry.length < 5) e.expiry = "Enter a valid expiry date";
      if (cvv.length < 3) e.cvv = "Enter a valid CVV";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePay = () => {
    if (!validate()) return;
    setStep("processing");
    timer.current = setTimeout(() => {
      // Store in session so buyer dashboard can show it
      if (data) {
        addPurchaseToSession({
          slug: slug ?? "",
          title: data.title,
          authorName: data.authorName ?? null,
          priceCents: priceCents,
          currency: selectedCurrency,
          purchasedAt: new Date().toISOString(),
          buyerName: name,
          buyerEmail: email,
        });
      }
      setStep("success");
    }, 2200);
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-50 px-6 text-center">
        <h1 className="mb-3 text-2xl font-bold text-ink-900">Product not found</h1>
        <p className="mb-6 text-ink-500">This product page doesn't exist or is no longer available.</p>
        <button onClick={() => navigate("/shop")} className="font-medium text-brand-600 hover:underline">
          ← Back to shop
        </button>
      </div>
    );
  }

  // ── Processing screen ───────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-50 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-ink-900">Processing your payment…</h2>
        <p className="mt-2 text-sm text-ink-500">Please wait. Do not close this page.</p>
      </div>
    );
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-6 py-20 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 shadow-lg">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-30" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-ink-900">Payment confirmed!</h1>
        <p className="mt-2 text-ink-500">
          Thank you, <span className="font-semibold text-ink-800">{name}</span>. A receipt has been sent to{" "}
          <span className="font-medium text-ink-700">{email}</span>.
        </p>

        <div className="mt-8 w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-6 text-left shadow-md">
          <div className="mb-4 flex items-center gap-3">
            {coverUrl ? (
              <img src={coverUrl} alt={data.title} className="h-14 w-10 rounded-lg object-cover shadow" />
            ) : (
              <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <BookOpen className="h-5 w-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-ink-900">{data.title}</p>
              {data.authorName && <p className="text-xs text-ink-400">by {data.authorName}</p>}
            </div>
          </div>
          <div className="space-y-2 border-t border-ink-100 pt-4 text-sm">
            <div className="flex justify-between text-ink-600">
              <span>Amount paid</span>
              <span className="font-semibold">{isFree ? "Free" : displayPrice}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Currency</span>
              <span>{curInfo.flag} {selectedCurrency}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Status</span>
              <span className="font-semibold text-emerald-600">Confirmed ✓</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/my-purchases")}
          className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
        >
          <Download className="h-4 w-4" /> Access My Purchases
        </button>
        <button onClick={() => navigate("/shop")} className="mt-4 text-sm text-ink-400 hover:text-ink-600 transition">
          ← Continue shopping
        </button>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-ink-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-ink-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <button onClick={() => navigate(`/p/${slug}`)} className="flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-ink-800">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-700">
            <Lock className="h-4 w-4 text-emerald-600" /> Secure Checkout
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-400">
            <ShieldCheck className="h-4 w-4 text-brand-500" /> SSL Encrypted
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl gap-8 px-5 py-8 lg:grid lg:grid-cols-[1fr_400px]">
        {/* ── Right: order summary (shown first on mobile via order) ─────── */}
        <div className="order-first lg:order-last lg:row-span-2">
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* Product card */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                {coverUrl ? (
                  <img src={coverUrl} alt={data.title} className="h-24 w-16 shrink-0 rounded-xl object-cover shadow" />
                ) : (
                  <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                    <BookOpen className="h-8 w-8" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900 leading-snug">{data.title}</p>
                  {data.authorName && <p className="mt-0.5 text-sm text-ink-500">by {data.authorName}</p>}
                  <div className="mt-2 flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                    <span className="ml-1 text-xs text-ink-400">5.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
              <p className="mb-3 font-semibold text-ink-900">Order Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-ink-600">
                  <span>Product price</span>
                  <span>{isFree ? "Free" : fmtPrice(priceCents!, "USD")}</span>
                </div>
                {!isFree && selectedCurrency !== "USD" && (
                  <div className="flex justify-between text-ink-400 text-xs">
                    <span>In {selectedCurrency}</span>
                    <span>≈ {displayPrice}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex justify-between border-t border-ink-100 pt-3 font-bold text-ink-900">
                <span>Total</span>
                <span className="text-brand-700">{isFree ? "Free" : displayPrice}</span>
              </div>
            </div>

            {/* Security */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-800">
                <ShieldCheck className="h-4 w-4" /> 7-day money-back guarantee
              </div>
              <p className="mt-1 text-xs text-emerald-700">256-bit SSL · PCI DSS compliant</p>
            </div>
          </div>
        </div>

        {/* ── Left: form ─────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Contact */}
          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-ink-900">Contact Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} className={cn(errors.name && "border-destructive")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={cn(errors.email && "border-destructive")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Country + currency */}
          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-ink-900">Country &amp; Currency</h2>
            <div className="space-y-1.5">
              <Label htmlFor="country">Your Country</Label>
              <div className="relative">
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-ink-200 bg-white py-2.5 pl-4 pr-10 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {CURRENCIES[c.currency]?.flag} {c.name} — {c.currency}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              </div>
              {!isFree && (
                <p className="flex items-center gap-1 text-xs text-emerald-700">
                  <span className="font-semibold">{curInfo.flag} Price in {selectedCurrency}:</span>{" "}
                  <span className="font-bold text-emerald-800">{displayPrice}</span>
                  {selectedCurrency !== "USD" && (
                    <span className="text-ink-400">(≈ ${(priceCents! / 100).toFixed(2)} USD)</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Payment */}
          {!isFree && (
            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold text-ink-900">Payment Details</h2>

              {/* Gateway selector */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                {(["stripe", "paystack"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGateway(g)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition",
                      gateway === g
                        ? g === "paystack" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-[#635BFF] bg-[#635BFF]/5 text-[#635BFF]"
                        : "border-ink-200 text-ink-500 hover:border-ink-300",
                    )}
                  >
                    <div className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white",
                      g === "paystack" ? "bg-[#00C3F7]" : "bg-[#635BFF]",
                    )}>
                      {g === "stripe" ? "S" : "P"}
                    </div>
                    {g === "stripe" ? "Stripe" : "Paystack"}
                  </button>
                ))}
              </div>

              {/* Card visual */}
              <div className="mb-5">
                <CardVisual number={cardNumber} holder={cardHolder} expiry={expiry} brand={brand} />
              </div>

              {/* Card fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Card Holder Name</Label>
                  <Input placeholder="Jane Doe" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} className={cn(errors.cardHolder && "border-destructive")} />
                  {errors.cardHolder && <p className="text-xs text-destructive">{errors.cardHolder}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Card Number</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <Input
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      inputMode="numeric"
                      maxLength={19}
                      className={cn("pl-9 font-mono tracking-widest", errors.cardNumber && "border-destructive")}
                    />
                  </div>
                  {errors.cardNumber && <p className="text-xs text-destructive">{errors.cardNumber}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Expiry</Label>
                    <Input
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      inputMode="numeric"
                      maxLength={5}
                      className={cn("font-mono", errors.expiry && "border-destructive")}
                    />
                    {errors.expiry && <p className="text-xs text-destructive">{errors.expiry}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>CVV</Label>
                    <Input
                      placeholder="•••"
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      inputMode="numeric"
                      maxLength={4}
                      className={cn("font-mono", errors.cvv && "border-destructive")}
                    />
                    {errors.cvv && <p className="text-xs text-destructive">{errors.cvv}</p>}
                  </div>
                </div>
              </div>

              {/* Demo notice */}
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                <span className="font-semibold">Demo mode:</span> No real charge is made. Use any test card numbers.
              </div>
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePay}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white shadow-lg transition",
              isFree
                ? "bg-emerald-600 hover:bg-emerald-700"
                : gateway === "paystack"
                  ? "bg-[#00C3F7] hover:bg-[#00aee0]"
                  : "bg-[#635BFF] hover:bg-[#4f46e5]",
            )}
          >
            <Lock className="h-4 w-4" />
            {isFree ? "Get for Free" : `Pay ${displayPrice} via ${gateway === "paystack" ? "Paystack" : "Stripe"}`}
          </button>

          <p className="text-center text-xs text-ink-400">
            By completing this purchase you agree to our{" "}
            <a href="/terms" className="underline hover:text-ink-600">Terms of Service</a> and{" "}
            <a href="/privacy" className="underline hover:text-ink-600">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
