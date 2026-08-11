import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetProducts, getGetProductsQueryKey, useGetMe } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, FileText, User, ExternalLink } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewProduct {
  id: string;
  title: string;
  type: string;
  status: string;
  ownerId: string;
  ownerName?: string | null;
  updatedAt: string;
  coverConfig?: { imageUrl?: string } | null;
  topic?: string | null;
  audience?: string | null;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

const fetchReviewQueue = async (base: string): Promise<ReviewProduct[]> => {
  const res = await fetch(`${base}api/products/review-queue`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load review queue");
  return res.json();
};

const submitReview = async (
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReviewQueue() {
  const base = import.meta.env.BASE_URL;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: me } = useGetMe();

  const { data: queue, isLoading } = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => fetchReviewQueue(base),
  });

  // Dialog state
  const [dialogProduct, setDialogProduct] = useState<ReviewProduct | null>(null);
  const [decision, setDecision] = useState<"approved" | "changes_requested" | null>(null);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () => submitReview(base, dialogProduct!.id, decision!, comment),
    onSuccess: () => {
      toast({
        title: decision === "approved" ? "Product approved ✓" : "Changes requested",
        description: `"${dialogProduct!.title}" has been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openDialog = (product: ReviewProduct, dec: "approved" | "changes_requested") => {
    setDialogProduct(product);
    setDecision(dec);
    setComment("");
  };

  const closeDialog = () => {
    setDialogProduct(null);
    setDecision(null);
    setComment("");
  };

  const coverUrl = (product: ReviewProduct) => {
    const imageUrl = product.coverConfig?.imageUrl;
    if (!imageUrl) return null;
    return `${base}api/storage${imageUrl.replace(/^\/api\/storage/, "")}`;
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto w-full">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-ink-900">Review Queue</h1>
          <p className="text-ink-500 mt-1">
            {isLoading ? "Loading…" : queue?.length === 0
              ? "No products awaiting review."
              : `${queue?.length} product${queue!.length !== 1 ? "s" : ""} awaiting review`}
          </p>
        </div>

        {/* Empty state */}
        {!isLoading && queue?.length === 0 && (
          <div className="bg-white border border-ink-200 rounded-2xl shadow-sm flex flex-col items-center justify-center py-24 px-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-lime-50 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-lime-400" />
            </div>
            <h2 className="text-xl font-display font-bold text-ink-900 mb-2">All caught up!</h2>
            <p className="text-ink-500 max-w-sm">No products are waiting for your review right now.</p>
          </div>
        )}

        {/* Queue list */}
        {!isLoading && (queue?.length ?? 0) > 0 && (
          <div className="space-y-4">
            {queue!.map(product => (
              <div key={product.id} className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex gap-5 p-5">

                  {/* Cover thumbnail */}
                  <div className="w-14 h-20 rounded-xl bg-ink-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {coverUrl(product) ? (
                      <img src={coverUrl(product)!} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-6 h-6 text-ink-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/products/${product.id}`}>
                          <span className="font-semibold text-ink-900 hover:text-brand-600 transition-colors cursor-pointer flex items-center gap-1">
                            {product.title}
                            <ExternalLink className="w-3.5 h-3.5 opacity-40" />
                          </span>
                        </Link>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="bg-ink-100 text-ink-600 rounded-full text-xs capitalize">
                            {product.type}
                          </Badge>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 rounded-full text-xs">
                            In Review
                          </Badge>
                        </div>
                      </div>
                      {product.ownerId !== me?.id && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5"
                            onClick={() => openDialog(product, "changes_requested")}
                          >
                            <XCircle className="w-4 h-4" /> Request Changes
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-xl bg-lime-500 hover:bg-lime-600 text-white gap-1.5"
                            onClick={() => openDialog(product, "approved")}
                          >
                            <CheckCircle className="w-4 h-4" /> Approve
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-ink-400">
                      {product.ownerName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> {product.ownerName}
                        </span>
                      )}
                      {product.audience && (
                        <span className="truncate max-w-xs">{product.audience}</span>
                      )}
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3.5 h-3.5" />
                        Submitted {formatDistanceToNow(new Date(product.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review dialog */}
      <Dialog open={!!dialogProduct} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision === "approved" ? "Approve product" : "Request changes"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-ink-600">
              {decision === "approved"
                ? `"${dialogProduct?.title}" will be marked as approved and the creator will be notified.`
                : `Describe what needs to change. The creator will be notified and can revise.`}
            </p>
            <Textarea
              placeholder={decision === "approved" ? "Optional note to the creator…" : "What needs to be changed? (required)"}
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || (decision === "changes_requested" && !comment.trim())}
              className={
                decision === "approved"
                  ? "rounded-xl bg-lime-500 hover:bg-lime-600 text-white"
                  : "rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
              }
            >
              {mutation.isPending
                ? "Submitting…"
                : decision === "approved" ? "Approve" : "Send Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
