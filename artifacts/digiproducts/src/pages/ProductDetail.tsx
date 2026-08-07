import { AppLayout } from "@/components/layout/AppLayout";
import { useParams, Link } from "wouter";
import { useGetProduct, useSubmitForReview, getGetProductQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, CheckCircle, Clock, Edit3, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetail() {
  const { productId } = useParams();
  const { data: detail, isLoading } = useGetProduct(productId || '', {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId || '') }
  });
  const submitReview = useSubmitForReview();
  const { toast } = useToast();

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

  const { product, chapters, latestReview } = detail;
  const isEbook = product.type === 'ebook';
  const editPath = `/create/${isEbook ? 'ebook' : 'lead-magnet'}?productId=${product.id}`;

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
              {product.coverConfig ? (
                <div className="absolute inset-0 bg-brand-500" />
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
                <span>By {product.ownerName}</span>
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

        {/* Content Tabs */}
        <Tabs defaultValue="chapters">
          <TabsList className="bg-ink-50/50 border border-ink-100 p-1 rounded-xl h-auto">
            <TabsTrigger value="chapters" className="rounded-lg py-2 px-6">Chapters</TabsTrigger>
            <TabsTrigger value="exports" className="rounded-lg py-2 px-6">Exports</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-lg py-2 px-6">Sales Copy</TabsTrigger>
            <TabsTrigger value="comments" className="rounded-lg py-2 px-6">Comments</TabsTrigger>
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

          <TabsContent value="exports" className="mt-6">
            <Card className="border-ink-100 shadow-sm">
              <CardContent className="p-8 text-center text-ink-500">
                <Download className="w-12 h-12 text-ink-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-ink-900 mb-2">No exports yet</h3>
                <p className="mb-6 max-w-md mx-auto">Once you generate a PDF export in the wizard, it will appear here for easy downloading.</p>
                <Link href={editPath}>
                  <Button variant="outline" className="rounded-xl">Go to Export Wizard</Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="mt-6">
            <Card className="border-ink-100 shadow-sm">
              <CardContent className="p-8 text-center text-ink-500">
                <FileText className="w-12 h-12 text-ink-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-ink-900 mb-2">Sales Copy Not Generated</h3>
                <p className="mb-6 max-w-md mx-auto">Generate sales page copy using the AI based on your final product content.</p>
                <Button variant="outline" className="rounded-xl">Generate Sales Copy</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="mt-6">
            <Card className="border-ink-100 shadow-sm">
              <CardHeader className="border-b border-ink-100">
                <CardTitle className="text-lg font-semibold">Review & Feedback</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {latestReview && (
                  <div className="mb-6 p-4 rounded-xl border bg-ink-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-ink-900">{latestReview.reviewerName}</span>
                      <Badge className={latestReview.decision === 'approved' ? 'bg-lime-500' : 'bg-rose-500'}>
                        {latestReview.decision.replace('_', ' ')}
                      </Badge>
                    </div>
                    {latestReview.comment && <p className="text-sm text-ink-700">{latestReview.comment}</p>}
                  </div>
                )}
                <div className="text-center py-8 text-ink-500">
                  <MessageSquare className="w-12 h-12 text-ink-300 mx-auto mb-4" />
                  <p>No comments yet.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
