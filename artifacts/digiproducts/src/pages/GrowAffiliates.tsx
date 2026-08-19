import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  createAffiliateLink,
  listAffiliateLinks,
  updateAffiliateLink,
  deleteAffiliateLink,
  codeExists,
  type AffiliateLink,
} from "@/lib/affiliateStore";
import { useGetProducts, getGetProductsQueryKey } from "@workspace/api-client-react";
import {
  Link2,
  Plus,
  Copy,
  Trash2,
  Users,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  Tag,
  Package,
  Info,
  Loader2,
} from "lucide-react";

export default function GrowAffiliates() {
  const { toast } = useToast();
  const [links, setLinks] = useState<AffiliateLink[]>(listAffiliateLinks());
  const [showForm, setShowForm] = useState(false);

  // Real products from the API
  const { data: productsData, isLoading: productsLoading } = useGetProducts(
    {},
    { query: { queryKey: getGetProductsQueryKey() } },
  );
  const products = productsData ?? [];

  // Form fields
  const [affiliateName, setAffiliateName] = useState("");
  const [affiliateEmail, setAffiliateEmail] = useState("");
  const [productId, setProductId] = useState("");
  const [commissionType, setCommissionType] = useState<"percent" | "flat">("percent");
  const [commissionValue, setCommissionValue] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [saving, setSaving] = useState(false);

  // Last generated link (for display)
  const [generated, setGenerated] = useState<AffiliateLink | null>(null);
  const [copied, setCopied] = useState(false);

  function refresh() {
    setLinks(listAffiliateLinks());
  }

  function resetForm() {
    setAffiliateName("");
    setAffiliateEmail("");
    setProductId("");
    setCommissionType("percent");
    setCommissionValue("");
    setCustomCode("");
    setCodeError("");
  }

  function validateCode(code: string): boolean {
    if (!code) return true; // auto-generate
    if (!/^[A-Z0-9]{3,12}$/i.test(code)) {
      setCodeError("Code must be 3–12 letters/numbers only.");
      return false;
    }
    if (codeExists(code)) {
      setCodeError("This code is already in use. Choose another.");
      return false;
    }
    setCodeError("");
    return true;
  }

  function handleGenerate() {
    if (!productId) {
      toast({ title: "Select a product", variant: "destructive" });
      return;
    }
    if (!commissionValue || isNaN(Number(commissionValue)) || Number(commissionValue) <= 0) {
      toast({ title: "Enter a valid commission value", variant: "destructive" });
      return;
    }
    if (!validateCode(customCode)) return;

    setSaving(true);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      toast({ title: "Product not found", variant: "destructive" });
      setSaving(false);
      return;
    }
    setTimeout(() => {
      const link = createAffiliateLink(
        {
          affiliateName: affiliateName.trim(),
          affiliateEmail: affiliateEmail.trim(),
          productId,
          productName: product.title ?? product.id,
          commissionType,
          commissionValue: Number(commissionValue),
          enabled: true,
        },
        customCode || undefined,
      );
      refresh();
      setGenerated(link);
      setShowForm(false);
      resetForm();
      setSaving(false);
    }, 600);
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      toast({ title: "Affiliate code copied", description: "Share this code with your affiliate promoter." });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDelete(id: string) {
    deleteAffiliateLink(id);
    if (generated?.id === id) setGenerated(null);
    refresh();
    toast({ title: "Affiliate code removed" });
  }

  function handleToggle(id: string, val: boolean) {
    updateAffiliateLink(id, { enabled: val });
    refresh();
  }

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const totalConversions = links.reduce((s, l) => s + l.conversions, 0);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900">Affiliate Program</h1>
              <p className="text-sm text-ink-500">
                Create unique promo codes for each affiliate promoter.
              </p>
            </div>
          </div>
          {!showForm && (
            <Button className="gap-2 shrink-0" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New Code
            </Button>
          )}
        </div>

        {/* Stats bar */}
        {links.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            {[
              { label: "Active Codes", value: links.filter((l) => l.enabled).length, icon: Tag, color: "bg-brand-100 text-brand-700" },
              { label: "Total Clicks", value: totalClicks, icon: TrendingUp, color: "bg-sky-100 text-sky-700" },
              { label: "Conversions", value: totalConversions, icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="border-ink-200 shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", stat.color)}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="font-display text-xl font-bold text-ink-900">{stat.value}</p>
                      <p className="text-xs text-ink-500">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Session-only notice */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Codes are stored in this browser tab only.</span>{" "}
            Refreshing the page will clear them. Persistent storage (backed by your account) is coming soon.
          </p>
        </div>

        {/* How it works — shown when no links yet */}
        {links.length === 0 && !showForm && (
          <Card className="mb-6 border-ink-200">
            <CardContent className="p-6">
              <h2 className="mb-4 font-semibold text-ink-900">How it will work</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { step: "1", title: "Generate a code", desc: "Choose a product, set a commission rate, and create a unique affiliate code for each promoter." },
                  { step: "2", title: "Share with affiliates", desc: "Your affiliate receives their unique code and promotes your product with it." },
                  { step: "3", title: "Track conversions (coming soon)", desc: "Attribution tracking — recording which sales came from which code — will be added in a future update." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                      {item.step}
                    </span>
                    <div>
                      <p className="font-medium text-ink-800">{item.title}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Link Form */}
        {showForm && (
          <Card className="mb-6 border-brand-200 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <h2 className="font-semibold text-ink-900">New Affiliate Code</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Affiliate Name <span className="text-ink-400">(optional)</span></Label>
                  <Input
                    value={affiliateName}
                    onChange={(e) => setAffiliateName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Affiliate Email <span className="text-ink-400">(optional)</span></Label>
                  <Input
                    type="email"
                    value={affiliateEmail}
                    onChange={(e) => setAffiliateEmail(e.target.value)}
                    placeholder="affiliate@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Product <span className="text-red-500">*</span></Label>
                {productsLoading ? (
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 text-sm text-ink-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your products…
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm text-amber-700">
                    No products found — create a product first in Sell → Products
                  </div>
                ) : (
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product to promote…" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-ink-400" /> {p.title}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-ink-400">Your affiliate will promote this product using their unique code.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Commission Type</Label>
                  <Select value={commissionType} onValueChange={(v) => setCommissionType(v as "percent" | "flat")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage of sale (%)</SelectItem>
                      <SelectItem value="flat">Flat amount per sale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Commission {commissionType === "percent" ? "Rate (%)" : "Amount"} <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
                      {commissionType === "percent" ? "%" : "$"}
                    </span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      placeholder={commissionType === "percent" ? "20" : "10"}
                      min={0}
                      max={commissionType === "percent" ? 100 : undefined}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Custom Code <span className="text-ink-400">(optional — leave blank to auto-generate)</span></Label>
                <Input
                  className="font-mono uppercase"
                  value={customCode}
                  onChange={(e) => {
                    setCustomCode(e.target.value);
                    if (codeError) setCodeError("");
                  }}
                  placeholder="e.g. JOHN20"
                  maxLength={12}
                />
                {codeError && <p className="text-xs text-destructive">{codeError}</p>}
                <p className="text-xs text-ink-400">3–12 letters/numbers. Must be unique. This is the affiliate's promo code.</p>
              </div>

              <div className="flex gap-3">
                <Button className="gap-2" onClick={handleGenerate} disabled={saving}>
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                  {saving ? "Saving…" : "Create Code"}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated code highlight */}
        {generated && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-emerald-900">Affiliate code created!</p>
                  <p className="mt-0.5 text-xs text-emerald-700">
                    Share this code with your affiliate promoter.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 shrink-0"
                  onClick={() => handleCopy(generated.code)}
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy code"}
                </Button>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white border border-emerald-200 px-4 py-3">
                <Tag className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="font-mono text-lg font-bold text-emerald-900 tracking-wider">{generated.code}</span>
                <span className="ml-auto text-xs text-ink-400">→ {generated.productName}</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                <span>Promo code registration complete. Share the code above with your affiliate — they'll reference it when promoting your product. Attribution tracking is coming in a future update.</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Links list */}
        {links.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-ink-900">All Affiliate Codes</h2>
            {links.map((link) => {
              return (
                <Card key={link.id} className="border-ink-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {/* Code badge */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                        <Tag className="h-4 w-4 text-brand-700" />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-ink-900">{link.code}</span>
                          {link.affiliateName && (
                            <span className="text-sm text-ink-500">— {link.affiliateName}</span>
                          )}
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            link.enabled ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-500",
                          )}>
                            {link.enabled ? "Active" : "Paused"}
                          </span>
                        </div>
                        <p className="text-xs text-ink-400">→ {link.productName}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" /> {link.productName}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {link.commissionType === "percent"
                              ? `${link.commissionValue}% per sale`
                              : `$${link.commissionValue} flat per sale`}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> {link.clicks} clicks
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {link.conversions} conversions
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50 transition"
                          onClick={() => handleCopy(link.code)}
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy Code
                        </button>
                        <Switch
                          checked={link.enabled}
                          onCheckedChange={(v) => handleToggle(link.id, v)}
                        />
                        <button
                          type="button"
                          className="text-ink-400 hover:text-destructive transition"
                          onClick={() => handleDelete(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : !showForm ? (
          <Card className="border-dashed border-ink-300">
            <CardContent className="flex flex-col items-center py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-300">
                <Link2 className="h-7 w-7" />
              </span>
              <p className="mt-4 font-semibold text-ink-700">No affiliate codes yet</p>
              <p className="mt-1 max-w-xs text-sm text-ink-400">
                Create a code for each promoter. Share the code with them so they can reference it when driving traffic to your product.
              </p>
              <Button className="mt-5 gap-2" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> Create your first code
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}
