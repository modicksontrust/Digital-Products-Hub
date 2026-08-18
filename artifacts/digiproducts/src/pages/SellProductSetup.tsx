import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import {
  useGetProduct,
  useCreateProduct,
  useUpdateSellSettings,
  usePublishProduct,
  useUnpublishProduct,
  getGetProductQueryKey,
  getGetProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
const BASE_URL = import.meta.env.BASE_URL as string;
import {
  ChevronLeft, ChevronRight, BookOpen, Download, GraduationCap,
  LayoutTemplate, Users, Briefcase, Key, Link2, MessageCircle,
  Check, Star, Plus, Trash2, Package, Flame, Upload,
  Globe, Smartphone, Monitor, Eye,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Step configuration
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Product Type" },
  { label: "Details" },
  { label: "Pricing" },
  { label: "Delivery" },
  { label: "Extras" },
  { label: "Review & Publish" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mobile phone mockup (right panel)
// ─────────────────────────────────────────────────────────────────────────────

function PhoneMockup({ product, step }: { product: Record<string, unknown>; step: number }) {
  const coverConfig = product.coverConfig as { imageUrl?: string } | null;
  const imageUrl = coverConfig?.imageUrl;
  const coverSrc = imageUrl ? `${BASE_URL}api/storage/${imageUrl.replace(/^\//, "")}` : null;
  const priceCents = product.priceCents as number | null;
  const pricingMode = product.pricingMode as string | undefined;
  const currency = (product.currency as string | undefined) ?? "USD";
  const priceText = pricingMode === "free" ? "Free" : priceCents ? `${currency} ${(priceCents / 100).toFixed(2)}` : "—";

  return (
    <div className="hidden lg:flex flex-col items-center gap-3 sticky top-8">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Checkout Page Preview</p>
      <div className="flex items-center gap-2 mb-1">
        <button className="p-1 rounded text-gray-400 hover:text-gray-600"><Monitor className="w-4 h-4" /></button>
        <button className="p-1 rounded text-gray-400 hover:text-gray-600"><Smartphone className="w-4 h-4" /></button>
      </div>

      {/* Phone shell */}
      <div className="relative w-[200px] h-[400px]">
        <div className="absolute inset-0 bg-gray-900 rounded-[32px] shadow-2xl overflow-hidden border-4 border-gray-800">
          {/* notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-b-2xl z-10" />

          {/* screen */}
          <div className={cn(
            "absolute inset-0 overflow-hidden",
            (product.saleTheme as string) === "light" ? "bg-white" : "bg-gray-950"
          )}>
            {/* cover */}
            <div className="h-32 bg-brand-700 relative flex items-center justify-center">
              {coverSrc ? (
                <img src={coverSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-white opacity-50" />
                </div>
              )}
              <div className="absolute top-2 left-2">
                <span className="text-[8px] font-medium bg-brand-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">eBook</span>
              </div>
            </div>

            {/* content */}
            <div className="p-3 space-y-2">
              <p className="text-[10px] font-bold leading-tight text-gray-900 line-clamp-2">
                {(product.title as string) || "Product Title"}
              </p>
              <p className="text-[8px] text-gray-500 line-clamp-2">
                {(product.saleShortDescription as string) || (product.subtitle as string) || "Your product description"}
              </p>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-2 h-2 fill-yellow-400 text-yellow-400" />)}
              </div>
              {step >= 3 && (
                <div className="bg-brand-600 rounded-md py-1.5 text-center">
                  <p className="text-[9px] font-semibold text-white">
                    Buy Now — {priceText}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Eye className="w-3.5 h-3.5" />
        Live preview
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Product Type
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { value: "digital_download", label: "Digital Download", desc: "PDFs, audio files, design assets, zip files", icon: Download },
  { value: "ebook", label: "eBook", desc: "Books, guides, reports, whitepapers", icon: BookOpen },
  { value: "course", label: "Course", desc: "Link to your course platform", icon: GraduationCap },
  { value: "template", label: "Template", desc: "Notion, Canva, Figma, spreadsheets", icon: LayoutTemplate },
  { value: "membership", label: "Membership", desc: "Recurring community or content access", icon: Users },
  { value: "service", label: "Service Package", desc: "Consulting, coaching, design work", icon: Briefcase },
  { value: "license", label: "License / Access Key", desc: "Software keys, API access", icon: Key },
  { value: "exclusive_link", label: "Exclusive Link", desc: "Pay to unlock a secret URL", icon: Globe },
];

function StepProductType({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">What are you selling?</h2>
      <p className="text-sm text-gray-500 mb-6">Choose your product type</p>
      <div className="grid grid-cols-2 gap-3">
        {PRODUCT_TYPES.map(({ value: v, label, desc, icon: Icon }) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "text-left p-4 rounded-xl border-2 transition-all hover:border-brand-400",
              value === v
                ? "border-brand-600 bg-brand-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            )}
          >
            <Icon className={cn("w-5 h-5 mb-2", value === v ? "text-brand-600" : "text-gray-400")} />
            <p className={cn("text-sm font-semibold", value === v ? "text-brand-700" : "text-gray-900")}>{label}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Details
// ─────────────────────────────────────────────────────────────────────────────

function StepDetails({
  form,
  onChange,
}: {
  form: { title: string; shortDesc: string; fullDesc: string; theme: string };
  onChange: (f: Partial<typeof form>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium">Title</Label>
        <Input
          placeholder="e.g., The Ultimate Instagram Growth Guide"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="mt-1"
        />
        <p className="text-xs text-gray-400 mt-1">Keep it short and compelling. This is the first thing buyers see.</p>
      </div>
      <div>
        <Label className="text-sm font-medium">Short Description</Label>
        <Input
          placeholder="e.g., Learn the exact strategy I used to grow from 0 to 100K followers"
          value={form.shortDesc}
          onChange={(e) => onChange({ shortDesc: e.target.value })}
          className="mt-1"
          maxLength={160}
        />
        <p className="text-xs text-gray-400 mt-1">This appears on your bio page product card. Max 160 characters.</p>
      </div>
      <div>
        <Label className="text-sm font-medium">Full Description</Label>
        <Textarea
          placeholder="Describe what buyers get, what problem it solves, and why they should buy it..."
          value={form.fullDesc}
          onChange={(e) => onChange({ fullDesc: e.target.value })}
          className="mt-1 min-h-[120px]"
        />
        <p className="text-xs text-gray-400 mt-1">This shows on the product detail page.</p>
      </div>
      <div>
        <Label className="text-sm font-medium">Sales Page Theme</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {[
            { v: "dark", label: "Dark", desc: "Premium dark look" },
            { v: "light", label: "Light", desc: "Clean & bright" },
          ].map(({ v, label, desc }) => (
            <button
              key={v}
              onClick={() => onChange({ theme: v })}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-all",
                form.theme === v ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <div className={cn("w-full h-6 rounded mb-2", v === "dark" ? "bg-gray-900" : "bg-gray-100 border border-gray-200")} />
              <p className={cn("text-sm font-semibold", form.theme === v ? "text-brand-700" : "text-gray-900")}>{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Pricing
// ─────────────────────────────────────────────────────────────────────────────

const PRICING_MODES = [
  { value: "free", label: "Free", desc: "No charge. Great for building your audience." },
  { value: "fixed", label: "Fixed Price", desc: "Set one price. Simple and clear." },
  { value: "pwyw", label: "Pay What You Want", desc: "Let buyers choose their price. You set a hidden minimum." },
  { value: "tiered", label: "Tiered Pricing", desc: "Offer up to 3 tiers with different features." },
];

function StepPricing({
  form,
  onChange,
}: {
  form: { pricingMode: string; priceCents: number; currency: string };
  onChange: (f: Partial<typeof form>) => void;
}) {
  const priceUsd = form.priceCents / 100;
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium mb-2 block">Pricing Mode</Label>
        <div className="grid grid-cols-2 gap-3">
          {PRICING_MODES.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => onChange({ pricingMode: value })}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-all",
                form.pricingMode === value ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <p className={cn("text-sm font-semibold", form.pricingMode === value ? "text-brand-700" : "text-gray-900")}>{label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </div>
      {form.pricingMode !== "free" && (
        <>
          <div>
            <Label className="text-sm font-medium">Price</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={priceUsd}
              onChange={(e) => onChange({ priceCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">The exact amount buyers will pay.</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Currency</Label>
            <Select value={form.currency} onValueChange={(v) => onChange({ currency: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["USD", "EUR", "GBP", "NGN", "CAD", "AUD", "ZAR"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Delivery
// ─────────────────────────────────────────────────────────────────────────────

const DELIVERY_METHODS = [
  { value: "link", label: "Link / URL", desc: "Google Drive, course platform, community invite — any link.", icon: Link2 },
  { value: "whatsapp", label: "WhatsApp", desc: "Buyer messages you directly on WhatsApp after payment.", icon: MessageCircle },
  { value: "access_key", label: "Access Key", desc: "Auto-deliver a unique key or code.", icon: Key },
];

function StepDelivery({
  form,
  onChange,
}: {
  form: {
    deliveryMethod: string;
    deliveryUrl: string;
    whatsappNumber: string;
    whatsappMessage: string;
    accessKeys: string;
    duration: string;
    durationDays: number;
  };
  onChange: (f: Partial<typeof form>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium mb-2 block">Delivery Method</Label>
        <div className="grid grid-cols-3 gap-3">
          {DELIVERY_METHODS.map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onChange({ deliveryMethod: value })}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-all",
                form.deliveryMethod === value ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <Icon className={cn("w-4 h-4 mb-2", form.deliveryMethod === value ? "text-brand-600" : "text-gray-400")} />
              <p className={cn("text-xs font-semibold", form.deliveryMethod === value ? "text-brand-700" : "text-gray-900")}>{label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Link/URL */}
      {form.deliveryMethod === "link" && (
        <div>
          <Label className="text-sm font-medium">Delivery Link</Label>
          <Input
            placeholder="https://drive.google.com/file/d/..."
            value={form.deliveryUrl}
            onChange={(e) => onChange({ deliveryUrl: e.target.value })}
            className="mt-1"
          />
          <p className="text-xs text-gray-400 mt-1">Paste the link buyers will receive after payment.</p>
        </div>
      )}

      {/* WhatsApp */}
      {form.deliveryMethod === "whatsapp" && (
        <>
          <div>
            <Label className="text-sm font-medium">WhatsApp Number</Label>
            <Input
              placeholder="+234 801 234 5678"
              value={form.whatsappNumber}
              onChange={(e) => onChange({ whatsappNumber: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">Enter your WhatsApp number with country code.</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Pre-loaded Message</Label>
            <Textarea
              placeholder="Hi! I just paid for {product_title} on PokiPoki. What do I do next?"
              value={form.whatsappMessage}
              onChange={(e) => onChange({ whatsappMessage: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">Use {"{product_title}"} to auto-insert the product name.</p>
          </div>
        </>
      )}

      {/* Access Key */}
      {form.deliveryMethod === "access_key" && (
        <div>
          <Label className="text-sm font-medium">Access Keys</Label>
          <Textarea
            placeholder={"Paste one key per line:\nABC-123-DEF\nGHI-456-JKL"}
            value={form.accessKeys}
            onChange={(e) => onChange({ accessKeys: e.target.value })}
            className="mt-1 font-mono text-sm"
            rows={5}
          />
          <p className="text-xs text-gray-400 mt-1">Paste your keys, one per line. Each buyer gets one unique key.</p>
        </div>
      )}

      {/* Access Duration */}
      {form.deliveryMethod && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Access Duration</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: "lifetime", label: "Lifetime Access", desc: "Buyer keeps access forever" },
              { v: "limited", label: "Limited Access", desc: "Expires after set days" },
            ].map(({ v, label, desc }) => (
              <button
                key={v}
                onClick={() => onChange({ duration: v })}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all",
                  form.duration === v ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <p className={cn("text-sm font-semibold", form.duration === v ? "text-brand-700" : "text-gray-900")}>{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </button>
            ))}
          </div>
          {form.duration === "limited" && (
            <div className="mt-3">
              <Input
                type="number"
                min={1}
                value={form.durationDays}
                onChange={(e) => onChange({ durationDays: parseInt(e.target.value) || 30 })}
                className="w-28"
              />
              <p className="text-xs text-gray-400 mt-1">Days of access after purchase.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Extras
// ─────────────────────────────────────────────────────────────────────────────

type Testimonial = { name: string; text: string; rating: number };

function StepExtras({
  form,
  onChange,
}: {
  form: {
    limitedQtyEnabled: boolean;
    limitedQty: number;
    earlyBirdEnabled: boolean;
    testimonials: Testimonial[];
    contractEnabled: boolean;
  };
  onChange: (f: Partial<typeof form>) => void;
}) {
  const addTestimonial = () =>
    onChange({ testimonials: [...form.testimonials, { name: "", text: "", rating: 5 }] });

  const updateTestimonial = (i: number, patch: Partial<Testimonial>) =>
    onChange({ testimonials: form.testimonials.map((t, idx) => idx === i ? { ...t, ...patch } : t) });

  const removeTestimonial = (i: number) =>
    onChange({ testimonials: form.testimonials.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      {/* Limited Drops */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-900">Limited Drops</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Limited Quantity</p>
            <p className="text-xs text-gray-500">Set a maximum number of sales</p>
          </div>
          <Switch
            checked={form.limitedQtyEnabled}
            onCheckedChange={(v) => onChange({ limitedQtyEnabled: v })}
            className="data-[state=checked]:bg-brand-600"
          />
        </div>
        {form.limitedQtyEnabled && (
          <div>
            <Label className="text-xs text-gray-500">Maximum sales</Label>
            <Input
              type="number"
              min={1}
              value={form.limitedQty}
              onChange={(e) => onChange({ limitedQty: parseInt(e.target.value) || 100 })}
              className="mt-1 w-32"
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Early Bird Pricing</p>
            <p className="text-xs text-gray-500">First X buyers get a special price</p>
          </div>
          <Switch
            checked={form.earlyBirdEnabled}
            onCheckedChange={(v) => onChange({ earlyBirdEnabled: v })}
            className="data-[state=checked]:bg-brand-600"
          />
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-semibold text-gray-900">Social Proof / Testimonials</h3>
        </div>
        {form.testimonials.map((t, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Testimonial {i + 1}</p>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400" onClick={() => removeTestimonial(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Input
              placeholder="Reviewer name, e.g. Sarah K."
              value={t.name}
              onChange={(e) => updateTestimonial(i, { name: e.target.value })}
              className="text-sm"
            />
            <Textarea
              placeholder="e.g., This template saved me 20 hours!"
              value={t.text}
              onChange={(e) => updateTestimonial(i, { text: e.target.value })}
              className="text-sm"
              rows={2}
            />
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => updateTestimonial(i, { rating: s })}>
                  <Star className={cn("w-4 h-4", s <= t.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-gray-600"
          onClick={addTestimonial}
        >
          <Plus className="w-3.5 h-3.5" /> Add Testimonial
        </Button>
      </div>

      {/* Onboarding Contract */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-900">Onboarding Contract</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Enable Contract</p>
            <p className="text-xs text-gray-500">Buyers receive a contract to sign after payment</p>
          </div>
          <Switch
            checked={form.contractEnabled}
            onCheckedChange={(v) => onChange({ contractEnabled: v })}
            className="data-[state=checked]:bg-brand-600"
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6 — Review & Publish
// ─────────────────────────────────────────────────────────────────────────────

function StepReview({
  product,
  pricingMode,
  priceCents,
  currency,
  deliveryMethod,
  onPublish,
  onUnpublish,
  publishing,
}: {
  product: Record<string, unknown>;
  pricingMode: string;
  priceCents: number;
  currency: string;
  deliveryMethod: string;
  onPublish: () => void;
  onUnpublish: () => void;
  publishing: boolean;
}) {
  const published = product.published as boolean;
  const title = product.title as string;
  const pricingOk = pricingMode === "free" || priceCents > 0;
  const deliveryOk = !!deliveryMethod;
  const allReady = !!title && pricingOk && deliveryOk;

  const checks = [
    { label: "Title set", ok: !!title },
    { label: "Pricing configured", ok: pricingOk },
    { label: "Delivery method set", ok: deliveryOk },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Review your product</h2>
        <p className="text-sm text-gray-500">Make sure everything looks good before publishing.</p>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        {checks.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
              ok ? "bg-green-100" : "bg-gray-100"
            )}>
              <Check className={cn("w-3 h-3", ok ? "text-green-600" : "text-gray-300")} />
            </div>
            <span className={cn("text-sm", ok ? "text-gray-900" : "text-gray-400")}>{label}</span>
          </div>
        ))}
      </div>

      {!allReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Complete all required steps above before publishing.
        </div>
      )}

      <div className="flex gap-3">
        {published ? (
          <Button
            onClick={onUnpublish}
            disabled={publishing}
            variant="outline"
            className="flex-1"
          >
            {publishing ? "Unpublishing..." : "Unpublish"}
          </Button>
        ) : (
          <Button
            onClick={onPublish}
            disabled={!allReady || publishing}
            className="flex-1 bg-brand-700 hover:bg-brand-800 text-white"
          >
            {publishing ? "Publishing..." : "Publish"}
          </Button>
        )}
        <Button
          onClick={onPublish}
          disabled={!allReady || publishing || !published}
          variant="outline"
          className="flex-1"
        >
          Save as Draft
        </Button>
      </div>

      {published && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          🎉 Your product is live! Buyers can now find it at your sales page.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function SellProductSetup() {
  const params = useParams<{ productId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const productId = params.productId;
  const isNew = productId === "new";
  const search = useSearch();
  const startStep = parseInt(new URLSearchParams(search).get("start") ?? "0", 10);

  const { data: product, isLoading } = useGetProduct(productId ?? "", {
    query: { enabled: !isNew && !!productId },
  });

  const updateSell = useUpdateSellSettings();
  const createProduct = useCreateProduct();
  const publish = usePublishProduct();
  const unpublish = useUnpublishProduct();

  const [step, setStep] = useState(startStep);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Form state — each step synced from product on load
  const [productSaleType, setProductSaleType] = useState("ebook");
  const [detailsForm, setDetailsForm] = useState({ title: "", shortDesc: "", fullDesc: "", theme: "dark" });
  const [pricingForm, setPricingForm] = useState({ pricingMode: "fixed", priceCents: 2900, currency: "USD" });
  const [deliveryForm, setDeliveryForm] = useState({
    deliveryMethod: "",
    deliveryUrl: "",
    whatsappNumber: "",
    whatsappMessage: "Hi! I just paid for {product_title} on PokiPoki. What do I do next?",
    accessKeys: "",
    duration: "lifetime",
    durationDays: 30,
  });
  const [extrasForm, setExtrasForm] = useState({
    limitedQtyEnabled: false,
    limitedQty: 100,
    earlyBirdEnabled: false,
    testimonials: [] as Testimonial[],
    contractEnabled: false,
  });

  // Sync from product when loaded
  useEffect(() => {
    if (!product) return;
    const p = product as Record<string, unknown>;
    setProductSaleType((p.productSaleType as string) ?? "ebook");
    setDetailsForm({
      title: (p.title as string) ?? "",
      shortDesc: (p.saleShortDescription as string) ?? "",
      fullDesc: (p.saleFullDescription as string) ?? "",
      theme: (p.saleTheme as string) ?? "dark",
    });
    setPricingForm({
      pricingMode: (p.pricingMode as string) ?? "fixed",
      priceCents: (p.priceCents as number) ?? 0,
      currency: (p.currency as string) ?? "USD",
    });
    setDeliveryForm({
      deliveryMethod: (p.deliveryMethod as string) ?? "",
      deliveryUrl: (p.deliveryUrl as string) ?? "",
      whatsappNumber: (p.deliveryWhatsappNumber as string) ?? "",
      whatsappMessage: (p.deliveryWhatsappMessage as string) ?? "Hi! I just paid for {product_title} on PokiPoki. What do I do next?",
      accessKeys: (p.deliveryAccessKeys as string) ?? "",
      duration: (p.deliveryDuration as string) ?? "lifetime",
      durationDays: (p.deliveryDurationDays as number) ?? 30,
    });
    setExtrasForm({
      limitedQtyEnabled: (p.limitedQuantityEnabled as boolean) ?? false,
      limitedQty: (p.limitedQuantity as number) ?? 100,
      earlyBirdEnabled: (p.earlyBirdEnabled as boolean) ?? false,
      testimonials: (p.testimonials as Testimonial[]) ?? [],
      contractEnabled: (p.contractEnabled as boolean) ?? false,
    });
  }, [product]);

  const saveCurrentStep = useCallback(async () => {
    if (!productId || isNew) return;
    setSaving(true);
    try {
      await updateSell.mutateAsync({
        productId,
        data: {
          productSaleType,
          saleShortDescription: detailsForm.shortDesc,
          saleFullDescription: detailsForm.fullDesc,
          saleTheme: detailsForm.theme as "dark" | "light",
          pricingMode: pricingForm.pricingMode as "free" | "fixed" | "pwyw" | "tiered",
          priceCents: pricingForm.priceCents,
          currency: pricingForm.currency,
          deliveryMethod: deliveryForm.deliveryMethod as "link" | "whatsapp" | "access_key" | null,
          deliveryUrl: deliveryForm.deliveryUrl,
          deliveryWhatsappNumber: deliveryForm.whatsappNumber,
          deliveryWhatsappMessage: deliveryForm.whatsappMessage,
          deliveryAccessKeys: deliveryForm.accessKeys,
          deliveryDuration: deliveryForm.duration as "lifetime" | "limited",
          deliveryDurationDays: deliveryForm.durationDays,
          limitedQuantityEnabled: extrasForm.limitedQtyEnabled,
          limitedQuantity: extrasForm.limitedQty,
          earlyBirdEnabled: extrasForm.earlyBirdEnabled,
          testimonials: extrasForm.testimonials,
          contractEnabled: extrasForm.contractEnabled,
        },
      });
      qc.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
      qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [productId, isNew, productSaleType, detailsForm, pricingForm, deliveryForm, extrasForm, updateSell, qc, toast]);

  const handleNext = async () => {
    if (isNew && step === 0) {
      if (!newTitle.trim()) {
        toast({ title: "Please enter a product name", variant: "destructive" });
        return;
      }
      setSaving(true);
      try {
        const created = await createProduct.mutateAsync({
          data: { type: productSaleType as "ebook", title: newTitle.trim(), topic: newTitle.trim() },
        });
        navigate(`/sell/products/${created.id}/setup?start=1`, { replace: true });
      } catch {
        toast({ title: "Failed to create product", variant: "destructive" });
        setSaving(false);
      }
      return;
    }
    await saveCurrentStep();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handlePublish = async () => {
    if (!productId) return;
    setPublishing(true);
    await saveCurrentStep();
    try {
      await publish.mutateAsync({ productId, data: { priceCents: pricingForm.priceCents } });
      qc.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
      qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
      toast({ title: "Product published!", description: "Buyers can now find your product." });
    } catch {
      toast({ title: "Failed to publish", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!productId) return;
    setPublishing(true);
    try {
      await unpublish.mutateAsync({ productId });
      qc.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
      qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
      toast({ title: "Product unpublished" });
    } catch {
      toast({ title: "Failed to unpublish", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const productData = (product as Record<string, unknown> | undefined) ?? {};

  if (!isNew && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!isNew && !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Product not found.</p>
          <Button variant="link" onClick={() => navigate("/sell/products")}>Back to Products</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/sell/products")} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Edit Product</h1>
            <p className="text-xs text-gray-500">Step {step + 1}/{STEPS.length} — {STEPS[step].label}</p>
          </div>
          {saving && (
            <Badge variant="secondary" className="ml-auto text-xs text-gray-500">Saving...</Badge>
          )}
          {(product as Record<string, unknown>).published && (
            <Badge className="ml-auto bg-green-100 text-green-700 border-green-200 text-xs">● Published</Badge>
          )}
        </div>

        {/* Progress bar */}
        <div className="max-w-6xl mx-auto mt-3 flex gap-1">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-all",
                i <= step ? "bg-brand-600" : "bg-gray-200"
              )}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-12">
        {/* Left: step content */}
        <div>
          {step === 0 && (
            <>
              {isNew && (
                <div className="mb-6">
                  <Label htmlFor="new-product-title" className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Product name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new-product-title"
                    placeholder="e.g. The Ultimate Skincare Guide"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="text-base"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">You can update this any time in the Details step.</p>
                </div>
              )}
              <StepProductType value={productSaleType} onChange={setProductSaleType} />
            </>
          )}
          {step === 1 && (
            <StepDetails form={detailsForm} onChange={(f) => setDetailsForm((p) => ({ ...p, ...f }))} />
          )}
          {step === 2 && (
            <StepPricing form={pricingForm} onChange={(f) => setPricingForm((p) => ({ ...p, ...f }))} />
          )}
          {step === 3 && (
            <StepDelivery form={deliveryForm} onChange={(f) => setDeliveryForm((p) => ({ ...p, ...f }))} />
          )}
          {step === 4 && (
            <StepExtras form={extrasForm} onChange={(f) => setExtrasForm((p) => ({ ...p, ...f }))} />
          )}
          {step === 5 && (
            <StepReview
              product={{ ...productData, pricingMode: pricingForm.pricingMode, priceCents: pricingForm.priceCents, currency: pricingForm.currency, saleTheme: detailsForm.theme, saleShortDescription: detailsForm.shortDesc }}
              pricingMode={pricingForm.pricingMode}
              priceCents={pricingForm.priceCents}
              currency={pricingForm.currency}
              deliveryMethod={deliveryForm.deliveryMethod}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              publishing={publishing}
            />
          )}

          {/* Navigation buttons */}
          {step < STEPS.length - 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <Button variant="ghost" onClick={handleBack} disabled={step === 0} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={saving}
                className="bg-brand-700 hover:bg-brand-800 text-white gap-1"
              >
                {saving ? "Saving..." : "Next"} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          {step === STEPS.length - 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <Button variant="ghost" onClick={handleBack} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            </div>
          )}
        </div>

        {/* Right: phone mockup */}
        <PhoneMockup
          product={{
            ...productData,
            title: detailsForm.title || productData.title,
            saleShortDescription: detailsForm.shortDesc,
            saleTheme: detailsForm.theme,
            priceCents: pricingForm.priceCents,
            pricingMode: pricingForm.pricingMode,
            currency: pricingForm.currency,
          }}
          step={step}
        />
      </div>
    </div>
  );
}
