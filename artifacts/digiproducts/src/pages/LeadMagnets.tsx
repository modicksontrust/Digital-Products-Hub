import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getGetProductsQueryKey,
  useArchiveProduct,
  useDuplicateProduct,
  useGetProducts,
  useUnpublishProduct,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Link2,
  MousePointerClick,
  Plus,
  Sparkles,
  TrendingUp,
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
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: products } = useGetProducts();
  const duplicate = useDuplicateProduct();
  const archive = useArchiveProduct();
  const unpublish = useUnpublishProduct();
  const leadMagnets = ((products as ProductRow[] | undefined) ?? []).filter(
    (product) => product.type === "lead_magnet",
  );

  const handleDuplicate = (product: ProductRow) => {
    duplicate.mutate(
      { productId: product.id },
      {
        onSuccess: (newProduct) => {
          toast({ title: "Lead magnet duplicated", description: "A new draft was created." });
          setLocation(`/create/lead-magnet?productId=${newProduct.id}`);
        },
        onError: () => {
          toast({ title: "Couldn't duplicate lead magnet", variant: "destructive" });
        },
      },
    );
  };

  const handleArchive = (product: ProductRow) => {
    if (!window.confirm("Archive this lead magnet? It will no longer appear in your active products.")) return;
    archive.mutate(
      { productId: product.id },
      {
        onSuccess: () => {
          toast({ title: "Lead magnet archived" });
          qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        },
        onError: () => {
          toast({ title: "Couldn't archive lead magnet", variant: "destructive" });
        },
      },
    );
  };

  const handleUnpublish = (product: ProductRow) => {
    unpublish.mutate(
      { productId: product.id },
      {
        onSuccess: () => {
          toast({ title: "Lead magnet unpublished" });
          qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        },
        onError: () => {
          toast({ title: "Couldn't unpublish lead magnet", variant: "destructive" });
        },
      },
    );
  };

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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                            aria-label={`More actions for ${product.title}`}
                            data-testid={`button-lead-magnet-menu-${product.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-52 rounded-xl"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <DropdownMenuItem onClick={() => setLocation(`/create/lead-magnet?productId=${product.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit / View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation(`/create/lead-magnet?productId=${product.id}&stage=landing`)}>
                            <ExternalLink className="mr-2 h-4 w-4" /> View / edit landing page
                          </DropdownMenuItem>
                          {product.slug ? (
                            <DropdownMenuItem onClick={() => window.open(`${window.location.origin}${import.meta.env.BASE_URL}p/${product.slug}`, "_blank", "noopener,noreferrer")}>
                              <ArrowUpRight className="mr-2 h-4 w-4" /> Open published page
                            </DropdownMenuItem>
                          ) : null}
                          {product.published ? (
                            <DropdownMenuItem onClick={() => handleUnpublish(product)}>
                              <Eye className="mr-2 h-4 w-4" /> Unpublish
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleArchive(product)}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          >
                            <Archive className="mr-2 h-4 w-4" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-4">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-ink-400">Resource analytics coming soon</p>
                      <div className="grid grid-cols-3 divide-x rounded-lg border border-ink-100 bg-ink-50/60 py-2.5">
                      <div className="flex flex-col items-center gap-1 text-center">
                        <Users className="h-3.5 w-3.5 text-ink-400" />
                        <span className="text-xs font-semibold text-ink-700">0</span>
                        <span className="text-[10px] text-ink-400">opt-ins</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 text-center">
                        <Download className="h-3.5 w-3.5 text-ink-400" />
                        <span className="text-xs font-semibold text-ink-700">0</span>
                        <span className="text-[10px] text-ink-400">downloads</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 text-center">
                        <TrendingUp className="h-3.5 w-3.5 text-ink-400" />
                        <span className="text-xs font-semibold text-ink-700">0%</span>
                        <span className="text-[10px] text-ink-400">conversion</span>
                      </div>
                    </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-ink-400">
                      <span>
                        Created{" "}
                        {product.createdAt
                          ? new Date(product.createdAt).toLocaleDateString(undefined, {
                              month: "numeric",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "recently"}
                      </span>
                      <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
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