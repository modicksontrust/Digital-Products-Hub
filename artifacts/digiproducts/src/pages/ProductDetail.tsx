import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  useGetProduct, useGetMe, useSubmitForReview, useGetProductExports, useExportProduct,
  useGetSalesCopy,
  getGetProductQueryKey, getGetProductExportsQueryKey, getGetSalesCopyQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Download, Eye, CheckCircle, XCircle, Clock, Edit3, MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function toAppUrl(apiUrl: string) {
  return apiUrl.startsWith("/api") ? import.meta.env.BASE_URL + apiUrl.slice(1) : apiUrl;
}

function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const submitReviewFn = async (
  base: string,
  productId: string,
  decision: "approved" | "changes_requested",
  comment: string,
): Promise<void> => {
  const res = await fetch(`${base}api/products/${productId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ decision, comment: comment.trim() || undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Review failed");
  }
};

export default function ProductDetail() {
  const { productId } = useParams();
  const base = import.meta.env.BASE_URL;
  const { data: detail, isLoading } = useGetProduct(productId || '', {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId || '') }
  });
  const { data: me } = useGetMe();
  const submitReview = useSubmitForReview();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: exports, isLoading: exportsLoading } = useGetProductExports(productId || '', {
    query: { enabled: !!productId, queryKey: getGetProductExportsQueryKey(productId || '') }
  });
  const exportProduct = useExportProduct();
  const { data: salesCopy, isLoading: salesCopyLoading } = useGetSalesCopy(productId || '', {
    query: { enabled: !!productId, queryKey: getGetSalesCopyQueryKey(productId || '') }
  });

  // Inline review dialog state
  const [reviewDecision, setReviewDecision] = useState<"approved" | "changes_requested" | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [activeTab, setActiveTab] = useState("chapters");
  const [historyFilter, setHistoryFilter] = useState<"all" | "approved" | "changes_requested">("all");
  const commentsTabRef = useRef<HTMLButtonElement>(null);

  const reviewMutation = useMutation({
    mutationFn: () => submitReviewFn(base, productId!, reviewDecision!, reviewComment),
    onSuccess: () => {
      toast({
        title: reviewDecision === "approved" ? "Product approved ✓" : "Changes requested",
        description: reviewDecision === "approved"
          ? "The creator will be notified."
          : "The creator will be notified and can revise.",
      });
      // Refresh this product and the review queue
      queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId || '') });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      setReviewDecision(null);
      setReviewComment("");
      // Scroll to comments tab to show the new review entry
      setActiveTab("comments");
      setTimeout(() => commentsTabRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleGenerateExport = () => {
    if (!productId) return;
    exportProduct.mutate({ productId, data: { format: 'pdf', pageSize: 'a4', theme: 'minimal' } }, {
      onSuccess: () => {
        toast({ title: "Export ready!" });
        queryClient.invalidateQueries({ queryKey: getGetProductExportsQueryKey(productId) });
      },
      onError: () => toast({ title: "Export failed", variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!detail) {
    return <AppLayout><div className="p-8">Product not found</div></AppLayout>;
  }

  const { product, chapters, latestReview, reviewHistory } = detail;
  const isEbook = product.type === 'ebook';
  const editPath = `/create/${isEbook ? 'ebook' : 'lead-magnet'}?productId=${product.id}`;

  const isOwner = me?.id === product.ownerId;
  const canReview = (me?.role === 'admin' || me?.role === 'manager') && !isOwner;
  const showReviewBanner = product.status === 'in_review' && canReview;

  const handleSubmitReview = () => {
    if (!productId) return;
    submitReview.mutate({ productId }, {
      onSuccess: () => toast({ title: "Submitted for review" })
    });
  };

  const statusColors: Record<string, string> = {
    draft: "bg-ink-100 text-ink-700",
    generating: "bg-blue-100 text-blue-800",
    ready: "bg-brand-100 text-brand-800",
    in_review: "bg-amber-100 text-amber-800",
    changes_requested: "bg-rose-100 text-rose-800",
    approved: "bg-lime-100 text-lime-800",
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto w-full p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            <div className="w-32 h-48 rounded-xl bg-ink-100 border border-ink-200 shadow-sm flex items-center justify-center shrink-0 overflow-hidden relative">
              {(product.coverConfig as { imageUrl?: string } | null)?.imageUrl ? (
                <img
                  src={`${import.meta.env.BASE_URL}api/storage${(product.coverConfig as { imageUrl: string }).imageUrl.replace(/^\/api\/storage/, "")}`}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FileText className="w-10 h-10 text-ink-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="capitalize rounded-full font-medium">
                  {product.type.replace('_', ' ')}
                </Badge>
                <Badge variant="secondary" className={cn("capitalize rounded-full font-medium", statusColors[product.status])}>
                  {product.status.replace('_', ' ')}
                </Badge>
              </div>
              <h1 className="text-3xl font-display font-bold text-ink-900 mb-2 leading-tight">
                {product.title}
              </h1>
              {product.subtitle && (
                <p className="text-xl text-ink-600 mb-4">{product.subtitle}</p>
              )}
              
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
                <span>By {product.authorName || product.ownerName}</span>
                <span>•</span>
                <span>{product.chapterCount} chapters</span>
                <span>•</span>
                <span>{product.wordCount.toLocaleString()} words</span>
                <span>•</span>
                <span>Updated {formatDistanceToNow(new Date(product.updatedAt))} ago</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-[200px]">
            {product.status === 'ready' || product.status === 'changes_requested' ? (
              <Button onClick={handleSubmitReview} className="w-full bg-brand-500 hover:bg-brand-600 shadow-sm rounded-xl" disabled={submitReview.isPending}>
                <CheckCircle className="w-4 h-4 mr-2" /> Submit for review
              </Button>
            ) : null}
            <Link href={editPath}>
              <Button variant="outline" className="w-full border-ink-200 rounded-xl">
                <Edit3 className="w-4 h-4 mr-2" /> Edit Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Inline Review Banner — visible to managers/admins when product is in review */}
        {showReviewBanner && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">This product is awaiting your review</p>
                <p className="text-sm text-amber-700 mt-0.5">Approve it or request changes from the creator.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5"
                onClick={() => { setReviewDecision("changes_requested"); setReviewComment(""); }}
              >
                <XCircle className="w-4 h-4" /> Request Changes
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-lime-500 hover:bg-lime-600 text-white gap-1.5"
                onClick={() => { setReviewDecision("approved"); setReviewComment(""); }}
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </Button>
            </div>
          </div>
        )}

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-ink-50/50 border border-ink-100 p-1 rounded-xl h-auto">
            <TabsTrigger value="chapters" className="rounded-lg py-2 px-6">Chapters</TabsTrigger>
            <TabsTrigger value="exports" className="rounded-lg py-2 px-6">Exports</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-lg py-2 px-6">Sales Copy</TabsTrigger>
            <TabsTrigger value="comments" className="rounded-lg py-2 px-6" ref={commentsTabRef}>Comments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chapters" className="mt-6">
            <div className="space-y-4">
              {chapters.map(chapter => (
                <Card key={chapter.id} className="border-ink-100 shadow-sm">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold flex items-center justify-center shrink-0">
                      {chapter.orderIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-ink-900 text-lg mb-1">{chapter.title}</h3>
                      {chapter.summary && <p className="text-sm text-ink-600 mb-3">{chapter.summary}</p>}
                      <div className="flex items-center gap-4 text-xs text-ink-500">
                        <span>{chapter.wordCount} words</span>
                        <Badge variant="outline" className={cn(
                          "capitalize text-[10px]",
                          chapter.status === 'ready' ? "text-lime-600 border-lime-200" :
                          chapter.status === 'failed' ? "text-red-600 border-red-200" :
                          "text-brand-600 border-brand-200"
                        )}>
                          {chapter.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {chapters.length === 0 && (
                <div className="text-center py-12 text-ink-500 bg-white border border-ink-200 border-dashed rounded-2xl">
                  No chapters yet. Continue editing to generate content.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="exports" className="mt-6 space-y-4">
            {exportsLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
              </div>
            ) : exports && exports.length > 0 ? (
              <>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={handleGenerateExport}
                    disabled={exportProduct.isPending}
                  >
                    {exportProduct.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><FileText className="w-4 h-4 mr-2" /> Generate new export</>
                    )}
                  </Button>
                </div>
                {exports.map((exp) => {
                  const downloadUrl = toAppUrl(exp.downloadUrl);
                  const sizeLabel = formatFileSize(exp.fileSizeBytes);
                  return (
                    <Card key={exp.id} className="border-ink-100 shadow-sm">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-ink-900">{exp.versionLabel}</h3>
                            <Badge variant="outline" className="uppercase text-[10px]">{exp.format}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500 mt-1">
                            {exp.pageCount != null && <span>{exp.pageCount} pages</span>}
                            {sizeLabel && <span>{sizeLabel}</span>}
                            <span>{formatDistanceToNow(new Date(exp.createdAt))} ago</span>
                            {exp.createdByName && <span>by {exp.createdByName}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`${downloadUrl}?inline=1`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-2" /> Preview
                          </a>
                          <a
                            href={downloadUrl}
                            download
                            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
                          >
                            <Download className="w-4 h-4 mr-2" /> Download
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            ) : (
              <Card className="border-ink-100 shadow-sm">
                <CardContent className="p-8 text-center text-ink-500">
                  <Download className="w-12 h-12 text-ink-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-ink-900 mb-2">No exports yet</h3>
                  <p className="mb-6 max-w-md mx-auto">Generate a PDF export to make this eBook downloadable and previewable.</p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      className="rounded-xl bg-brand-500 hover:bg-brand-600"
                      onClick={handleGenerateExport}
                      disabled={exportProduct.isPending}
                    >
                      {exportProduct.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                      ) : (
                        <><FileText className="w-4 h-4 mr-2" /> Generate PDF export</>
                      )}
                    </Button>
                    <Link href={editPath}>
                      <Button variant="outline" className="rounded-xl">Go to Export Wizard</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sales" className="mt-6">
            {salesCopyLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
              </div>
            ) : salesCopy?.headline ? (
              <div className="space-y-6">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-ink-900">{salesCopy.headline}</h2>
                    {salesCopy.subheadline && (
                      <p className="text-ink-600 mt-1">{salesCopy.subheadline}</p>
                    )}
                  </div>
                  <Link href={editPath}>
                    <Button variant="outline" size="sm" className="rounded-xl shrink-0">
                      <Edit3 className="w-4 h-4 mr-2" /> Edit in wizard
                    </Button>
                  </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Bullet points */}
                  {salesCopy.bullets && salesCopy.bullets.length > 0 && (
                    <Card className="border-ink-100 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-ink-700 uppercase tracking-wide">Key Benefits</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-2">
                          {salesCopy.bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                              <CheckCircle className="w-4 h-4 text-lime-500 mt-0.5 shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Who it's for + price + CTA */}
                  <div className="space-y-4">
                    {salesCopy.whoItsFor && (
                      <Card className="border-ink-100 shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold text-ink-700 uppercase tracking-wide">Who It's For</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-ink-700">{salesCopy.whoItsFor}</p>
                        </CardContent>
                      </Card>
                    )}
                    <div className="flex gap-4">
                      {salesCopy.suggestedPriceBand && (
                        <Card className="border-ink-100 shadow-sm flex-1">
                          <CardContent className="p-4">
                            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">Suggested Price</p>
                            <p className="text-lg font-bold text-ink-900">{salesCopy.suggestedPriceBand}</p>
                          </CardContent>
                        </Card>
                      )}
                      {salesCopy.ctaText && (
                        <Card className="border-brand-100 bg-brand-50 shadow-sm flex-1">
                          <CardContent className="p-4">
                            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">CTA Button</p>
                            <p className="text-sm font-bold text-brand-800">"{salesCopy.ctaText}"</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>

                {/* FAQ */}
                {salesCopy.faq && salesCopy.faq.length > 0 && (
                  <Card className="border-ink-100 shadow-sm">
                    <CardHeader className="border-b border-ink-100 pb-3">
                      <CardTitle className="text-sm font-semibold text-ink-700 uppercase tracking-wide">FAQ</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {salesCopy.faq.map((item, i) => (
                        <div key={i} className={cn("px-6 py-4", i < salesCopy.faq!.length - 1 && "border-b border-ink-100")}>
                          <p className="font-semibold text-ink-900 text-sm mb-1">{item.question}</p>
                          <p className="text-sm text-ink-600">{item.answer}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border-ink-100 shadow-sm">
                <CardContent className="p-8 text-center text-ink-500">
                  <FileText className="w-12 h-12 text-ink-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-ink-900 mb-2">No sales copy yet</h3>
                  <p className="mb-6 max-w-md mx-auto">
                    Generate your headline, benefit bullets, FAQ, and suggested price in the eBook wizard.
                  </p>
                  <Link href={editPath}>
                    <Button className="rounded-xl bg-brand-500 hover:bg-brand-600">Go to wizard</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-6">
            <Card className="border-ink-100 shadow-sm">
              <CardHeader className="border-b border-ink-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-lg font-semibold">Review History</CardTitle>
                  {reviewHistory && reviewHistory.length > 0 && (
                    <div className="flex items-center gap-2">
                      {(["all", "approved", "changes_requested"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setHistoryFilter(f)}
                          className={cn(
                            "text-xs font-medium px-3 py-1 rounded-full border transition-colors",
                            historyFilter === f
                              ? f === "approved"
                                ? "bg-lime-500 border-lime-500 text-white"
                                : f === "changes_requested"
                                ? "bg-rose-500 border-rose-500 text-white"
                                : "bg-ink-800 border-ink-800 text-white"
                              : "bg-white border-ink-200 text-ink-600 hover:border-ink-400"
                          )}
                        >
                          {f === "all" ? "All" : f === "approved" ? "Approved" : "Changes Requested"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {(() => {
                  const filtered = reviewHistory
                    ? historyFilter === "all"
                      ? reviewHistory
                      : reviewHistory.filter((r: { decision: string }) => r.decision === historyFilter)
                    : [];
                  return filtered && filtered.length > 0 ? (
                  <ol className="relative border-l border-ink-200 space-y-0">
                    {filtered.map((review, idx) => (
                      <li key={review.id} className="mb-8 ml-6 last:mb-0">
                        <span className={cn(
                          "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white",
                          review.decision === 'approved' ? "bg-lime-500" : "bg-rose-500"
                        )}>
                          {review.decision === 'approved'
                            ? <CheckCircle className="w-3.5 h-3.5 text-white" />
                            : <XCircle className="w-3.5 h-3.5 text-white" />}
                        </span>
                        <div className={cn(
                          "rounded-xl border p-4",
                          idx === 0 ? "bg-ink-50/70 border-ink-200" : "bg-white border-ink-100"
                        )}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink-900">{review.reviewerName ?? "Reviewer"}</span>
                              {idx === 0 && (
                                <span className="text-[10px] uppercase tracking-wide text-ink-400 font-medium bg-ink-100 px-2 py-0.5 rounded-full">Latest</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn("capitalize text-xs", review.decision === 'approved' ? 'bg-lime-500 hover:bg-lime-500' : 'bg-rose-500 hover:bg-rose-500')}>
                                {review.decision.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-ink-400">
                                {formatDistanceToNow(new Date(review.createdAt))} ago
                              </span>
                            </div>
                          </div>
                          {review.comment
                            ? <p className="text-sm text-ink-700 mt-2">{review.comment}</p>
                            : <p className="text-sm text-ink-400 italic mt-2">No comment left.</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-center py-8 text-ink-500">
                    <MessageSquare className="w-12 h-12 text-ink-300 mx-auto mb-4" />
                    <p>{historyFilter === "all" ? "No reviews yet." : "No reviews match this filter."}</p>
                  </div>
                );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Inline Review Confirmation Dialog */}
      <Dialog open={!!reviewDecision} onOpenChange={open => !open && setReviewDecision(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewDecision === "approved" ? "Approve product" : "Request changes"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-ink-600">
              {reviewDecision === "approved"
                ? `"${product.title}" will be marked as approved and the creator will be notified.`
                : `Describe what needs to change. The creator will be notified and can revise.`}
            </p>
            <Textarea
              placeholder={reviewDecision === "approved" ? "Optional note to the creator…" : "What needs to be changed? (required)"}
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setReviewDecision(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending || (reviewDecision === "changes_requested" && !reviewComment.trim())}
              className={
                reviewDecision === "approved"
                  ? "rounded-xl bg-lime-500 hover:bg-lime-600 text-white"
                  : "rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
              }
            >
              {reviewMutation.isPending
                ? "Submitting…"
                : reviewDecision === "approved" ? "Approve" : "Send Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
