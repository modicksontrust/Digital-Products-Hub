/**
 * Analytics — GROW section
 *
 * This page will show click, device, and referrer analytics once
 * a real tracking pipeline is wired to the published pages.
 *
 * Currently: Coming Soon state — no fake data is rendered.
 */
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  MousePointerClick,
  Link2,
  ExternalLink,
  Smartphone,
  Monitor,
  Globe,
  TrendingUp,
  Clock,
  Info,
} from "lucide-react";

const PLANNED_METRICS = [
  { icon: MousePointerClick, label: "Total Clicks", desc: "Across all your bio links and deep links" },
  { icon: Link2, label: "Deep Links", desc: "Performance of individual destination links" },
  { icon: ExternalLink, label: "Short Links", desc: "Branded short-URL click tracking" },
  { icon: Monitor, label: "Device Breakdown", desc: "Desktop vs. mobile vs. other" },
  { icon: Globe, label: "Top Referrers", desc: "Where your traffic is coming from" },
  { icon: TrendingUp, label: "Click Trends", desc: "Day-by-day performance over time" },
];

export default function GrowAnalytics() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Analytics</h1>
            <p className="text-sm text-ink-500">Track performance across all your links.</p>
          </div>
        </div>

        {/* Session notice — Analytics has no user-stored data to lose, but flag this for consistency */}
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">No data is stored here yet.</span>{" "}
            Analytics will record clicks and events server-side once the tracking pipeline is live. There is nothing session-only to lose on refresh.
          </p>
        </div>

        {/* Coming soon banner */}
        <Card className="mb-8 border-brand-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 bg-brand-50 border-b border-brand-200 px-6 py-4">
            <Clock className="h-5 w-5 text-brand-600 shrink-0" />
            <div>
              <p className="font-semibold text-brand-900">Analytics dashboard coming soon</p>
              <p className="text-xs text-brand-700 mt-0.5">
                A real-time tracking pipeline is being built to power this page. Once it's live,
                your published pages will automatically report clicks, devices, and referrers here.
                No data is collected or displayed yet.
              </p>
            </div>
          </div>
          <CardContent className="p-6">
            <p className="mb-5 text-sm font-semibold text-ink-700">What you'll see once tracking is live:</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PLANNED_METRICS.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink-800">{metric.label}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{metric.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Prerequisites */}
        <div className="rounded-xl border border-ink-200 bg-white p-6">
          <p className="mb-4 text-sm font-semibold text-ink-900">Prerequisites before data appears:</p>
          <ol className="space-y-3">
            {[
              { step: "1", text: "Add your tracking pixel IDs in Marketing Pixels (above)" },
              { step: "2", text: "Publish at least one page (bio page, sales page, or course)" },
              { step: "3", text: "PokiPoki injects your pixels and begins collecting events (coming soon)" },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-3 text-sm text-ink-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
                  {item.step}
                </span>
                {item.text}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </AppLayout>
  );
}
