/**
 * Checkout — /checkout/:slug
 *
 * Demo checkout flow for any product sales page.
 * Fetches product data from the same public API as SalesPage.
 * No real payment gateway is called — simulates the full buyer UX.
 *
 * Steps: Contact details → Payment method → Card form → Processing → Success
 */
import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetPublicSalesPage, getGetPublicSalesPageQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Download,
  ArrowLeft,
  Star,
  BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "contact" | "payment" | "processing" | "success";
type Gateway = "stripe" | "paystack";

interface ContactForm {
  name: string;
  email: string;
}

interface CardForm {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

function cardBrand(number: string): "visa" | "mastercard" | "amex" | "unknown" {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

// ─── Visual card graphic ──────────────────────────────────────────────────────

function CardGraphic({ number, holder, expiry, brand }: {
  number: string;
  holder: string;
  expiry: string;
  brand: "visa" | "mastercard" | "amex" | "unknown";
}) {
  const display = number.replace(/\D/g, "").padEnd(16, "•")
    .replace(/(.{4})/g, "$1 ").trim();

  const brandGradients: Record<string, string> = {
    visa:       "from-[#1a1f71] to-[#2646d8]",
    mastercard: "from-[#1a1a2e] to-[#eb001b]",
    amex:       "from-[#007b5e] to-[#00d09e]",
    unknown:    "from-ink-800 to-ink-600",
  };

  return (
    <div className={cn(
      "relative h-40 w-full max-w-xs rounded-2xl bg-gradient-to-br p-5 text-white shadow-xl select-none",
      brandGradients[brand],
    )}>
      {/* Chip */}
      <div className="mb-4 h-6 w-9 rounded-sm bg-yellow-300/80" />
      {/* Number */}
      <p className="font-mono text-base tracking-widest">
        {display}
      </p>
      {/* Bottom row */}
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-widest opacity-60">Card Holder</p>
          <p className="text-sm font-medium capitalize">
            {holder || "Your Name"}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest opacity-60">Expires</p>
          <p className="font-mono text-sm">{expiry || "MM/YY"}</p>
        </div>
        {brand === "visa" && (
          <span className="text-xl font-bold italic">VISA</span>
        )}
        {brand === "mastercard" && (
          <span className="flex">
            <span className="h-7 w-7 rounded-full bg-red-500 opacity-90" />
            <span className="-ml-3 h-7 w-7 rounded-full bg-yellow-400 opacity-80" />
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ step }: { step: Step }) {
  const steps: Step[] = ["contact", "payment"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const done = step === "payment" && s === "contact";
        const active = step === s;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
              done    ? "bg-emerald-500 text-white" :
              active  ? "bg-ink-900 text-white" :
                        "bg-ink-100 text-ink-400",
            )}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn(
              "text-xs font-medium capitalize",
              active ? "text-ink-900" : "text-ink-400",
            )}>
              {s === "contact" ? "Your Details" : "Payment"}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-ink-300 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Order summary sidebar ────────────────────────────────────────────────────

function OrderSummary({
  title,
  authorName,
  priceCents,
  coverUrl,
  gateway,
}: {
  title: string;
  authorName?: string | null;
  priceCents?: number | null;
  coverUrl: string | null;
  gateway?: Gateway;
}) {
  const price = priceCents ? fmt(priceCents) : "Free";
  const fee = priceCents ? fmt(Math.round(priceCents * 0.029 + 30)) : "$0.00";
  const total = priceCents ? fmt(priceCents) : "Free";

  return (
    <div className="space-y-6">
      {/* Product card */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
        <div className="flex gap-4">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="h-20 w-14 shrink-0 rounded-lg object-cover shadow"
            />
          ) : (
            <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <BookOpen className="h-7 w-7" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-ink-900 leading-snug">{title}</p>
            {authorName && (
              <p className="mt-0.5 text-sm text-ink-500">by {authorName}</p>
            )}
            <div className="mt-2 flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1 text-xs text-ink-400">5.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm space-y-3 text-sm">
        <p className="font-semibold text-ink-900">Order Summary</p>
        <div className="flex justify-between text-ink-600">
          <span>Product price</span>
          <span>{price}</span>
        </div>
        {priceCents && (
          <div className="flex justify-between text-ink-400 text-xs">
            <span>Processing fee</span>
            <span>{fee}</span>
          </div>
        )}
        <div className="border-t border-ink-100 pt-3 flex justify-between font-bold text-ink-900">
          <span>Total</span>
          <span className="text-brand-700">{total}</span>
        </div>
      </div>

      {/* Gateway trust badge */}
      <div className={cn(
        "rounded-xl border p-4 text-center space-y-1",
        gateway === "paystack"
          ? "border-emerald-200 bg-emerald-50"
          : "border-blue-100 bg-blue-50",
      )}>
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-ink-800">
          <ShieldCheck className={cn(
            "h-4 w-4",
            gateway === "paystack" ? "text-emerald-600" : "text-blue-600",
          )} />
          {gateway === "paystack"
            ? "Secured by Paystack"
            : "Secured by Stripe"}
        </div>
        <p className="text-[11px] text-ink-400">
          256-bit SSL encryption · PCI DSS compliant
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Checkout() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useGetPublicSalesPage(slug || "", {
    query: {
      enabled: !!slug,
      queryKey: getGetPublicSalesPageQueryKey(slug || ""),
    },
  });

  const [step, setStep] = useState<Step>("contact");
  const [gateway, setGateway] = useState<Gateway>("stripe");
  const [contact, setContact] = useState<ContactForm>({ name: "", email: "" });
  const [card, setCard] = useState<CardForm>({ holder: "", number: "", expiry: "", cvv: "" });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const processingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (processingTimer.current) clearTimeout(processingTimer.current);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ink-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-ink-50 text-center px-6">
        <h1 className="text-2xl font-bold text-ink-900 mb-3">Product not found</h1>
        <p className="text-ink-500 mb-6">This product page doesn't exist or is no longer available.</p>
        <button onClick={() => navigate("/")} className="text-brand-600 font-medium hover:underline">
          Go back home
        </button>
      </div>
    );
  }

  const coverUrl = data.coverImageUrl
    ? `${import.meta.env.BASE_URL}api${data.coverImageUrl}`
    : null;
  const priceCents = data.priceCents as number | null;
  const isFree = !priceCents || priceCents === 0;

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateContact = () => {
    const e: Record<string, string> = {};
    if (!contact.name.trim()) e.name = "Name is required";
    if (!contact.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(contact.email)) e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateCard = () => {
    const e: Record<string, string> = {};
    if (!card.holder.trim()) e.holder = "Card holder name is required";
    if (card.number.replace(/\s/g, "").length < 13) e.number = "Enter a valid card number";
    if (card.expiry.length < 5) e.expiry = "Enter a valid expiry";
    if (card.cvv.length < 3) e.cvv = "Enter a valid CVV";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContactNext = () => {
    if (validateContact()) {
      setErrors({});
      if (isFree) {
        // Free product — skip payment
        setStep("processing");
        processingTimer.current = setTimeout(() => setStep("success"), 1800);
      } else {
        setStep("payment");
      }
    }
  };

  const handlePay = () => {
    if (isFree || validateCard()) {
      setErrors({});
      setStep("processing");
      processingTimer.current = setTimeout(() => setStep("success"), 2200);
    }
  };

  // ── Processing screen ───────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-ink-50 to-white px-6 text-center">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-ink-900 mb-2">Processing payment…</h2>
        <p className="text-sm text-ink-500">Please wait. Do not close this page.</p>
      </div>
    );
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-6 py-16 text-center">
        {/* Animated tick */}
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 shadow-lg">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-30" />
        </div>

        <h1 className="text-3xl font-bold text-ink-900 mb-2">Payment confirmed!</h1>
        <p className="text-ink-500 mb-1">
          Thank you, <span className="font-semibold text-ink-800">{contact.name || "valued buyer"}</span>
        </p>
        <p className="text-sm text-ink-400 mb-8">
          A receipt has been sent to <span className="font-medium text-ink-600">{contact.email}</span>
        </p>

        {/* Order card */}
        <div className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-6 shadow-md text-left mb-8">
          <div className="flex gap-4 items-center mb-4">
            {coverUrl ? (
              <img src={coverUrl} alt={data.title} className="h-16 w-12 rounded-lg object-cover shadow" />
            ) : (
              <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <BookOpen className="h-6 w-6" />
              </div>
            )}
            <div>
              <p className="font-semibold text-ink-900 text-sm">{data.title}</p>
              {data.authorName && <p className="text-xs text-ink-500">by {data.authorName}</p>}
            </div>
          </div>

          <div className="border-t border-ink-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-ink-600">
              <span>Order status</span>
              <span className="font-semibold text-emerald-600">Confirmed ✓</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Amount paid</span>
              <span className="font-semibold">{priceCents ? fmt(priceCents) : "Free"}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Payment method</span>
              <span className="capitalize">{gateway}</span>
            </div>
          </div>
        </div>

        {/* Access button */}
        <button
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition mb-4"
          onClick={() => {
            // In production this would redirect to the delivery URL or download link.
            alert("In production, this would open your download or access link.");
          }}
        >
          <Download className="h-4 w-4" />
          Access Your Product
        </button>

        <button
          onClick={() => navigate(`/p/${slug}`)}
          className="text-sm text-ink-400 hover:text-ink-600 transition"
        >
          ← Back to product page
        </button>
      </div>
    );
  }

  // ── Main checkout layout ────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-ink-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-ink-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <button
            onClick={() => navigate(`/p/${slug}`)}
            className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-sm font-semibold text-ink-700">Secure Checkout</span>
          <div className="flex items-center gap-1.5 text-xs text-ink-400">
            <Lock className="h-3.5 w-3.5" /> SSL Encrypted
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
        {/* ─ Left: form ─ */}
        <div>
          <StepDots step={step} />

          {/* ── Step 1: Contact ── */}
          {step === "contact" && (
            <div className="rounded-2xl border border-ink-200 bg-white p-8 shadow-sm">
              <h2 className="mb-1 text-xl font-bold text-ink-900">Your details</h2>
              <p className="mb-6 text-sm text-ink-500">
                We'll send your receipt and access link here.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Jane Doe"
                    value={contact.name}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                    className={cn(errors.name && "border-destructive")}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className={cn(errors.email && "border-destructive")}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>

              <button
                onClick={handleContactNext}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-700"
              >
                {isFree ? "Get for Free" : "Continue to Payment"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Payment ── */}
          {step === "payment" && (
            <div className="space-y-5">
              {/* Gateway selector */}
              <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-ink-900">Choose payment method</h2>
                <div className="grid grid-cols-2 gap-3">
                  {(["stripe", "paystack"] as Gateway[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGateway(g)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition",
                        gateway === g
                          ? g === "paystack"
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-blue-500 bg-blue-50"
                          : "border-ink-200 hover:border-ink-300",
                      )}
                    >
                      {g === "stripe" ? (
                        <>
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#635BFF] text-white text-xs font-bold">S</div>
                          <span className="text-sm font-semibold text-ink-800">Stripe</span>
                          <span className="text-[11px] text-ink-400">Card payment</span>
                        </>
                      ) : (
                        <>
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C3F7] text-white text-xs font-bold">P</div>
                          <span className="text-sm font-semibold text-ink-800">Paystack</span>
                          <span className="text-[11px] text-ink-400">Card · Bank · USSD</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card form */}
              <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex justify-center">
                  <CardGraphic
                    number={card.number}
                    holder={card.holder}
                    expiry={card.expiry}
                    brand={cardBrand(card.number)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="holder">Card Holder Name</Label>
                    <Input
                      id="holder"
                      placeholder="Jane Doe"
                      value={card.holder}
                      onChange={(e) => setCard({ ...card, holder: e.target.value })}
                      className={cn(errors.holder && "border-destructive")}
                    />
                    {errors.holder && <p className="text-xs text-destructive">{errors.holder}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cardnum">Card Number</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <Input
                        id="cardnum"
                        placeholder="4242 4242 4242 4242"
                        value={card.number}
                        onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                        inputMode="numeric"
                        maxLength={19}
                        className={cn("pl-9 font-mono tracking-widest", errors.number && "border-destructive")}
                      />
                    </div>
                    {errors.number && <p className="text-xs text-destructive">{errors.number}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                        inputMode="numeric"
                        maxLength={5}
                        className={cn("font-mono", errors.expiry && "border-destructive")}
                      />
                      {errors.expiry && <p className="text-xs text-destructive">{errors.expiry}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cvv">CVV</Label>
                      <div className="relative">
                        <Input
                          id="cvv"
                          placeholder="•••"
                          value={card.cvv}
                          type="password"
                          onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                          inputMode="numeric"
                          maxLength={4}
                          className={cn("font-mono", errors.cvv && "border-destructive")}
                        />
                      </div>
                      {errors.cvv && <p className="text-xs text-destructive">{errors.cvv}</p>}
                    </div>
                  </div>
                </div>

                {/* Demo notice */}
                <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                  <span className="font-semibold">Demo mode:</span> No real charge is made. Use any test card numbers.
                </div>

                <button
                  onClick={handlePay}
                  className={cn(
                    "mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition",
                    gateway === "paystack"
                      ? "bg-[#00C3F7] hover:bg-[#00aee0]"
                      : "bg-[#635BFF] hover:bg-[#4f46e5]",
                  )}
                >
                  <Lock className="h-4 w-4" />
                  Pay {priceCents ? fmt(priceCents) : "Free"} via{" "}
                  {gateway === "paystack" ? "Paystack" : "Stripe"}
                </button>

                <button
                  onClick={() => { setStep("contact"); setErrors({}); }}
                  className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-ink-400 hover:text-ink-600 transition"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back to details
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─ Right: order summary ─ */}
        <div className="mt-8 lg:mt-0">
          <div className="lg:sticky lg:top-24">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">
              Order Summary
            </h3>
            <OrderSummary
              title={data.title}
              authorName={data.authorName}
              priceCents={priceCents}
              coverUrl={coverUrl}
              gateway={gateway}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
