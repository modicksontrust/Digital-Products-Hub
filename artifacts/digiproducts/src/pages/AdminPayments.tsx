/**
 * Admin → Payments
 *
 * Payment tracking dashboard. Shows who paid, for what product, how much,
 * and through which payment processor. No payout or payment-method management
 * — revenue flows directly to the platform's payment gateway.
 *
 * Data is session-only until a real payments API is wired.
 */
import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  RotateCcw,
  Search,
  BookOpen,
  GraduationCap,
  FileText,
  Download,
  Info,
  CalendarDays,
  User,
  CreditCard,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = "completed" | "refunded" | "disputed" | "pending";
type ProductKind = "ebook" | "course" | "lead_magnet" | "download";
type PaymentSource = "stripe" | "paystack" | "flutterwave" | "paypal";

interface PaymentRecord {
  id: string;
  date: string;                // ISO string
  buyerName: string;
  buyerEmail: string;
  productId: string;
  productName: string;
  productKind: ProductKind;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  source: PaymentSource;
  txRef: string;
}

// ─── In-memory store (session-only) ──────────────────────────────────────────
// Starts empty — real payments will come from the payment gateway webhook API.
const _payments: PaymentRecord[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
  pending:   { label: "Pending",   className: "bg-amber-100 text-amber-700" },
  refunded:  { label: "Refunded",  className: "bg-orange-100 text-orange-700" },
  disputed:  { label: "Disputed",  className: "bg-red-100 text-red-700" },
};

const KIND_CONFIG: Record<ProductKind, { icon: React.ElementType; label: string; color: string }> = {
  ebook:       { icon: BookOpen,      label: "eBook",       color: "bg-blue-100 text-blue-700" },
  course:      { icon: GraduationCap, label: "Course",      color: "bg-purple-100 text-purple-700" },
  lead_magnet: { icon: FileText,      label: "Lead Magnet", color: "bg-brand-100 text-brand-700" },
  download:    { icon: Download,      label: "Download",    color: "bg-orange-100 text-orange-700" },
};

const SOURCE_LABELS: Record<PaymentSource, string> = {
  stripe:      "Stripe",
  paystack:    "Paystack",
  flutterwave: "Flutterwave",
  paypal:      "PayPal",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPayments() {
  const [payments] = useState<PaymentRecord[]>(_payments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<ProductKind | "all">("all");

  // ── Derived stats ──────────────────────────────────────────────────────────
  const completed = payments.filter((p) => p.status === "completed");
  const totalRevenueCents = completed.reduce((s, p) => s + p.amountCents, 0);
  const refundedCents = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amountCents, 0);

  const thisMonthCents = useMemo(() => {
    const now = new Date();
    return completed
      .filter((p) => {
        const d = new Date(p.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, p) => s + p.amountCents, 0);
  }, [completed]);

  // Revenue by product (top products)
  const revenueByProduct = useMemo(() => {
    const map = new Map<string, { name: string; kind: ProductKind; cents: number; count: number }>();
    for (const p of completed) {
      const entry = map.get(p.productId) ?? { name: p.productName, kind: p.productKind, cents: 0, count: 0 };
      entry.cents += p.amountCents;
      entry.count += 1;
      map.set(p.productId, entry);
    }
    return [...map.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 6);
  }, [completed]);

  const maxProductCents = revenueByProduct[0]?.cents ?? 1;

  // ── Filtered transactions ─────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (kindFilter !== "all" && p.productKind !== kindFilter) return false;
      if (q && !p.buyerName.toLowerCase().includes(q) &&
               !p.buyerEmail.toLowerCase().includes(q) &&
               !p.productName.toLowerCase().includes(q) &&
               !p.txRef.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [payments, search, statusFilter, kindFilter]);

  // ─────────────────────────────────────────────────────────────────────────

  const summaryCards = [
    {
      label: "Total Revenue",
      value: fmt(totalRevenueCents),
      sub: "All-time completed payments",
      icon: DollarSign,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "This Month",
      value: fmt(thisMonthCents),
      sub: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
      icon: CalendarDays,
      iconClass: "bg-blue-100 text-blue-700",
    },
    {
      label: "Total Transactions",
      value: payments.length.toString(),
      sub: `${completed.length} completed`,
      icon: ShoppingBag,
      iconClass: "bg-brand-100 text-brand-700",
    },
    {
      label: "Refunded",
      value: fmt(refundedCents),
      sub: `${payments.filter((p) => p.status === "refunded").length} refund${payments.filter((p) => p.status === "refunded").length !== 1 ? "s" : ""}`,
      icon: RotateCcw,
      iconClass: "bg-orange-100 text-orange-700",
    },
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Payments</h1>
            <p className="text-sm text-ink-500">
              Track every payment across all products. Revenue flows directly to the platform payment gateway.
            </p>
          </div>
        </div>

        {/* Session-only notice */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Live payment data requires payment gateway webhook integration.</span>{" "}
            Once connected, every completed purchase will appear here automatically with full buyer and product detail.
          </p>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="border-ink-200 shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", card.iconClass)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-2xl font-bold text-ink-900 tabular-nums">{card.value}</p>
                    <p className="text-xs text-ink-500">{card.sub}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">{card.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Revenue by Product */}
        <Card className="mb-8 border-ink-200 shadow-sm">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-600" />
              <h2 className="font-semibold text-ink-900">Revenue by Product</h2>
            </div>

            {revenueByProduct.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-300">
                  <TrendingUp className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-medium text-ink-500">No revenue data yet</p>
                <p className="mt-1 text-xs text-ink-400">
                  Product revenue breakdown will appear here once payments are received.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {revenueByProduct.map((product) => {
                  const cfg = KIND_CONFIG[product.kind];
                  const Icon = cfg.icon;
                  const pct = Math.round((product.cents / maxProductCents) * 100);
                  return (
                    <div key={product.id} className="flex items-center gap-4">
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs", cfg.color)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-ink-800">{product.name}</span>
                          <span className="shrink-0 text-sm font-semibold text-ink-900">{fmt(product.cents)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[11px] text-ink-400">{product.count} sale{product.count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="border-ink-200 shadow-sm">
          <CardContent className="p-0">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-ink-900">All Transactions</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <Input
                    className="pl-9 w-full sm:w-56"
                    placeholder="Search buyer, product, ref…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus | "all")}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as ProductKind | "all")}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ebook">eBook</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="lead_magnet">Lead Magnet</SelectItem>
                    <SelectItem value="download">Download</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            {visible.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-300">
                  {search || statusFilter !== "all" || kindFilter !== "all" ? (
                    <Search className="h-7 w-7" />
                  ) : (
                    <CreditCard className="h-7 w-7" />
                  )}
                </span>
                <p className="mt-4 font-semibold text-ink-700">
                  {search || statusFilter !== "all" || kindFilter !== "all"
                    ? "No transactions match your filters"
                    : "No transactions yet"}
                </p>
                <p className="mt-1 max-w-xs text-sm text-ink-400">
                  {search || statusFilter !== "all" || kindFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "Transactions will appear here automatically when buyers purchase your products through the payment gateway."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Buyer</th>
                      <th className="px-5 py-3 text-left">Product</th>
                      <th className="px-5 py-3 text-left">Type</th>
                      <th className="px-5 py-3 text-left">Source</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 bg-white">
                    {visible.map((p) => {
                      const kindCfg = KIND_CONFIG[p.productKind];
                      const statusCfg = STATUS_CONFIG[p.status];
                      const KindIcon = kindCfg.icon;
                      return (
                        <tr key={p.id} className="hover:bg-ink-50/50 transition-colors">
                          {/* Date */}
                          <td className="whitespace-nowrap px-5 py-3 text-ink-500">
                            <div className="flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              {fmtDate(p.date)}
                            </div>
                          </td>

                          {/* Buyer */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold uppercase">
                                {(p.buyerName || p.buyerEmail)[0]}
                              </div>
                              <div className="min-w-0">
                                {p.buyerName && (
                                  <p className="truncate font-medium text-ink-900">{p.buyerName}</p>
                                )}
                                <p className={cn("truncate text-ink-500", p.buyerName ? "text-xs" : "font-medium text-ink-900")}>
                                  {p.buyerEmail}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Product */}
                          <td className="px-5 py-3">
                            <p className="truncate max-w-[180px] font-medium text-ink-800">{p.productName}</p>
                            <p className="text-[11px] text-ink-400 font-mono">{p.txRef}</p>
                          </td>

                          {/* Type */}
                          <td className="whitespace-nowrap px-5 py-3">
                            <span className={cn("flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", kindCfg.color)}>
                              <KindIcon className="h-3 w-3" />
                              {kindCfg.label}
                            </span>
                          </td>

                          {/* Source */}
                          <td className="whitespace-nowrap px-5 py-3">
                            <span className="flex items-center gap-1.5 text-ink-600">
                              <CreditCard className="h-3.5 w-3.5 text-ink-400" />
                              {SOURCE_LABELS[p.source]}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-ink-900 tabular-nums">
                            {fmt(p.amountCents, p.currency)}
                          </td>

                          {/* Status */}
                          <td className="whitespace-nowrap px-5 py-3">
                            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusCfg.className)}>
                              {statusCfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer count */}
            {payments.length > 0 && (
              <div className="border-t border-ink-100 px-5 py-3 text-center text-xs text-ink-400">
                Showing {visible.length} of {payments.length} transaction{payments.length !== 1 ? "s" : ""}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
