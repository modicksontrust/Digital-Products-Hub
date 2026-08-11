import { AppLayout } from "@/components/layout/AppLayout";
import { useGetCreditReport, getGetCreditReportQueryKey } from "@workspace/api-client-react";
import {
  Brain, Image, Zap, CheckCircle2, ExternalLink, Sparkles, FileText,
  Megaphone, BookOpen, PenTool, RefreshCw, BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ─── Static AI integration registry ──────────────────────────────────────────

interface AiFeature {
  label: string;
  icon: React.ReactNode;
  operation: string | null; // null = free (no credit charge)
}

interface AiIntegration {
  id: string;
  provider: string;
  model: string;
  capability: string;
  billing: "replit";
  icon: React.ReactNode;
  color: string;
  features: AiFeature[];
}

const AI_INTEGRATIONS: AiIntegration[] = [
  {
    id: "anthropic",
    provider: "Anthropic",
    model: "claude-sonnet-4-6",
    capability: "Text generation",
    billing: "replit",
    icon: <Brain className="w-5 h-5" />,
    color: "from-violet-500 to-purple-600",
    features: [
      { label: "eBook Outline",         icon: <BookOpen className="w-3.5 h-3.5" />,  operation: "outline"    },
      { label: "Chapter Writing",        icon: <FileText className="w-3.5 h-3.5" />,  operation: "chapter"    },
      { label: "Chapter Rewrite",        icon: <RefreshCw className="w-3.5 h-3.5" />, operation: "rewrite"    },
      { label: "Sales Page Copy",        icon: <PenTool className="w-3.5 h-3.5" />,   operation: "sales_copy" },
      { label: "Lead Magnet",            icon: <Zap className="w-3.5 h-3.5" />,       operation: "lead_magnet"},
      { label: "Ad Copy & Creatives",    icon: <Megaphone className="w-3.5 h-3.5" />, operation: "ad_copy"    },
      { label: "Niche Suggestions",      icon: <Sparkles className="w-3.5 h-3.5" />,  operation: null         },
      { label: "Book Details Auto-fill", icon: <Sparkles className="w-3.5 h-3.5" />,  operation: null         },
    ],
  },
  {
    id: "gemini",
    provider: "Google Gemini",
    model: "gemini-2.5-flash-image",
    capability: "Image generation",
    billing: "replit",
    icon: <Image className="w-5 h-5" />,
    color: "from-blue-500 to-cyan-500",
    features: [
      { label: "eBook Cover Generation", icon: <Image className="w-3.5 h-3.5" />, operation: null },
    ],
  },
];

// Map operation keys → human labels
const OPERATION_LABELS: Record<string, string> = {
  outline:    "eBook Outline",
  chapter:    "Chapter Writing",
  rewrite:    "Chapter Rewrite",
  sales_copy: "Sales Page Copy",
  lead_magnet:"Lead Magnet",
  ad_copy:    "Ad Copy & Creatives",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCredits() {
  const { data: report, isLoading } = useGetCreditReport(
    {},
    { query: { queryKey: getGetCreditReportQueryKey() } }
  );

  const totalCalls = report?.byOperation.reduce((s, r) => s + r.spent, 0) ?? 0;

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto w-full space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-ink-900">AI Usage</h1>
          <p className="text-ink-500 mt-1">
            AI tools powering this platform, where they're used, and how usage is billed.
          </p>
        </div>

        {/* ── AI Integrations ── */}
        <section>
          <h2 className="text-lg font-semibold text-ink-900 mb-4">Active Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {AI_INTEGRATIONS.map(integration => (
              <div key={integration.id} className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Card header */}
                <div className={`bg-gradient-to-r ${integration.color} p-5 text-white`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      {integration.icon}
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                    </div>
                  </div>
                  <p className="font-bold text-lg leading-tight">{integration.provider}</p>
                  <p className="text-white/80 text-sm font-mono">{integration.model}</p>
                  <p className="text-white/70 text-xs mt-1">{integration.capability}</p>
                </div>

                {/* Billing badge */}
                <div className="px-5 py-3 border-b border-ink-100 bg-ink-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-ink-700">Billing</p>
                    <p className="text-sm text-ink-600 mt-0.5">Managed by Replit — billed to your Replit account</p>
                  </div>
                  <Badge className="bg-brand-100 text-brand-700 rounded-full border-0 text-xs shrink-0">
                    Replit Managed
                  </Badge>
                </div>

                {/* Features list */}
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">Used by</p>
                  <div className="space-y-2">
                    {integration.features.map(f => (
                      <div key={f.label} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm text-ink-700">
                          <span className="text-ink-400">{f.icon}</span>
                          {f.label}
                        </div>
                        <Badge
                          className={`rounded-full border-0 text-[10px] shrink-0 ${
                            f.operation
                              ? "bg-amber-100 text-amber-700"
                              : "bg-ink-100 text-ink-500"
                          }`}
                        >
                          {f.operation ? "Tracked" : "Free"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add more integrations CTA */}
          <div className="mt-4 bg-ink-50 border border-ink-200 border-dashed rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-ink-700">Need a different AI provider?</p>
              <p className="text-sm text-ink-500 mt-0.5">
                Connect OpenAI, additional Anthropic tiers, or other AI services through Replit's integrations panel. Replit handles billing and key management automatically.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-xl shrink-0 gap-1.5"
              onClick={() => window.open("https://replit.com", "_blank")}
            >
              <ExternalLink className="w-4 h-4" /> Replit Integrations
            </Button>
          </div>
        </section>

        {/* ── Usage Stats ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink-900">Usage Log</h2>
            {totalCalls > 0 && (
              <span className="text-sm text-ink-500">
                <strong className="text-ink-900">{totalCalls.toLocaleString()}</strong> total AI calls
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* By feature / operation */}
            <div className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-500" />
                <p className="font-semibold text-ink-900 text-sm">Calls by Feature</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-ink-50">
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-right">AI Calls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={2} className="text-center py-8 text-ink-400 text-sm">Loading…</TableCell></TableRow>
                  )}
                  {!isLoading && (report?.byOperation.length ?? 0) === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center py-8 text-ink-400 text-sm">No usage recorded yet</TableCell></TableRow>
                  )}
                  {report?.byOperation
                    .slice()
                    .sort((a, b) => b.spent - a.spent)
                    .map(row => (
                      <TableRow key={row.operation}>
                        <TableCell className="text-sm">
                          {OPERATION_LABELS[row.operation] ?? row.operation}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Mini bar */}
                            <div className="w-24 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-400 rounded-full"
                                style={{ width: `${Math.min(100, (row.spent / (report.byOperation[0]?.spent || 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono font-medium text-sm w-8 text-right">{row.spent}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* By user */}
            <div className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-2">
                <Brain className="w-4 h-4 text-brand-500" />
                <p className="font-semibold text-ink-900 text-sm">Calls by Team Member</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-ink-50">
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">AI Calls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={2} className="text-center py-8 text-ink-400 text-sm">Loading…</TableCell></TableRow>
                  )}
                  {!isLoading && (report?.byUser.length ?? 0) === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center py-8 text-ink-400 text-sm">No usage recorded yet</TableCell></TableRow>
                  )}
                  {report?.byUser
                    .slice()
                    .sort((a, b) => b.spent - a.spent)
                    .map(row => (
                      <TableRow key={row.userId}>
                        <TableCell className="text-sm font-medium">{row.userName}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-lime-400 rounded-full"
                                style={{ width: `${Math.min(100, (row.spent / (report.byUser[0]?.spent || 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono font-medium text-sm w-8 text-right">{row.spent}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        {/* ── How billing works ── */}
        <section className="bg-ink-50 border border-ink-200 rounded-2xl p-6 text-sm text-ink-600 space-y-2">
          <p className="font-semibold text-ink-800">How AI billing works on this platform</p>
          <ul className="list-disc list-inside space-y-1">
            <li>All AI integrations (Anthropic, Gemini) are routed through <strong>Replit's AI proxy</strong> — no direct provider API key is needed.</li>
            <li>Usage costs are deducted from your <strong>Replit account's credits</strong>, not from any in-app balance.</li>
            <li><strong>Tracked</strong> features (outline, chapters, ad copy, etc.) consume one unit per call and are logged above.</li>
            <li><strong>Free</strong> features (niche suggestions, book details auto-fill, cover generation) do not count against tracked usage but still consume Replit AI credits.</li>
            <li>To view or top up your Replit AI credit balance, visit your <strong>Replit account billing page</strong>.</li>
          </ul>
        </section>

      </div>
    </AppLayout>
  );
}
