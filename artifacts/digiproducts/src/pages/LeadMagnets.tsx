import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGetProducts } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  ArrowUpRight,
  Download,
  Eye,
  FileText,
  Link2,
  MousePointerClick,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";

interface ProductRow {
  id: string;
  title: string;
  type: string;
  slug?: string | null;
  published?: boolean;
  status?: string;
  createdAt?: string | Date;
  coverConfig?: { primaryColor?: string } | null;
}

export default function LeadMagnets() {
  const [, setLocation] = useLocation();
  const { data: products } = useGetProducts();
  const leadMagnets = ((products as ProductRow[] | undefined) ?? []).filter(
    (product) => product.type === "lead_magnet",
  );

  const metrics = [
    { label: "Total opt-ins", value: "0", icon: Users },
    { label: "Downloads", value: "0", icon: Download },
    { label: "Page views", value: "0", icon: Eye },
    { label: "Conversion rate", value: "0%", icon: MousePointerClick },
  ];

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" /> Grow your audience
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">Lead Magnets</h1>
            <p className="mt-1 text-sm text-ink-500">Create useful resources that help grow your email list.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600">
              {leadMagnets.length}/4 this month
            </span>
            <Button onClick={() => setLocation("/create/lead-magnet")} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" /> Create lead magnet
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="border-ink-200/80 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
                    <Icon className="h-3.5 w-3.5" /> {metric.label}
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold text-brand-700">{metric.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {leadMagnets.length === 0 ? (
          <Card className="mt-8 border-dashed border-ink-300 bg-white/60">
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <FileText className="h-6 w-6" />
              </span>
              <h2 className="mt-5 font-display text-xl font-bold text-ink-900">Your next lead magnet starts here</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">Turn a practical idea into a polished guide your audience can download, save, and share.</p>
              <Button onClick={() => setLocation("/create/lead-magnet")} className="mt-6 gap-2 rounded-xl">
                <Plus className="h-4 w-4" /> Create your first lead magnet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {leadMagnets.map((product) => {
              const color = product.coverConfig?.primaryColor || "#1E2B45";
              const canOpen = ["ready", "in_review", "changes_requested", "approved"].includes(product.status ?? "draft");
              return (
                <Card
                  key={product.id}
                  className={`group overflow-hidden border-ink-200/80 shadow-sm transition-all ${canOpen ? "cursor-pointer hover:-translate-y-1 hover:shadow-md" : "opacity-75"}`}
                  onClick={canOpen ? () => setLocation(`/create/lead-magnet?productId=${product.id}`) : undefined}
                >
                  <div className="relative aspect-[16/10] p-5 text-white" style={{ backgroundColor: color }}>
                    <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">Lead magnet</span>
                    <h2 className="absolute bottom-5 right-5 left-5 line-clamp-3 font-display text-lg font-bold leading-tight">{product.title}</h2>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">Resource list</span>
                          {product.published && <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-semibold text-lime-800">Published</span>}
                          {!canOpen && <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-800">Creating</span>}
                        </div>
                        {product.slug && (
                          <div className="mt-3 flex max-w-[220px] items-center gap-1.5 truncate text-xs text-ink-500">
                            <Link2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">/p/{product.slug}</span>
                          </div>
                        )}
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}