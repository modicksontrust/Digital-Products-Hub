import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetProducts,
  usePublishProduct,
  useUnpublishProduct,
  useUpdateSellSettings,
  useDeleteProduct,
  getGetProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
const BASE_URL = import.meta.env.BASE_URL as string;
import {
  Plus, Pencil, Eye, ExternalLink, Copy, Trash2,
  ShoppingBag, Package, Tag, BarChart2, Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SellDiscounts from "./SellDiscounts";

type Product = {
  id: string;
  title: string;
  saleShortDescription?: string | null;
  priceCents?: number | null;
  pricingMode?: string;
  currency?: string;
  published: boolean;
  showOnBio?: boolean;
  orderCount?: number;
  slug?: string | null;
  coverConfig?: { imageUrl?: string } | null;
  status: string;
  type: string;
};

function formatPrice(product: Product) {
  if (product.pricingMode === "free") return "Free";
  if (!product.priceCents) return "Not set";
  return `${product.currency ?? "USD"} ${(product.priceCents / 100).toFixed(2)}`;
}

function CoverImage({ product }: { product: Product }) {
  const imageUrl = (product.coverConfig as { imageUrl?: string } | null)?.imageUrl;
  const src = imageUrl
    ? `${BASE_URL}api/storage${imageUrl.startsWith("/api/storage") ? imageUrl.replace(/^\/api\/storage/, "") : "/" + imageUrl.replace(/^\//, "")}`
    : null;
  return src ? (
    <img src={src} alt={product.title} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-gradient-to-br from-brand-800 to-brand-600 flex items-center justify-center">
      <Package className="w-12 h-12 text-brand-300 opacity-50" />
    </div>
  );
}

function ProductCard({ product, onDelete }: { product: Product; onDelete: (id: string) => void }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const publish = usePublishProduct();
  const unpublish = useUnpublishProduct();
  const updateSell = useUpdateSellSettings();

  const handleTogglePublish = async () => {
    try {
      if (product.published) {
        await unpublish.mutateAsync({ productId: product.id });
        toast({ title: "Product unpublished" });
      } else {
        await publish.mutateAsync({ productId: product.id, data: { priceCents: product.priceCents ?? 0 } });
        toast({ title: "Product published!", description: "Your product is now live." });
      }
      qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
    } catch {
      toast({ title: "Error", description: "Could not update product status.", variant: "destructive" });
    }
  };

  const handleToggleBio = async (checked: boolean) => {
    try {
      await updateSell.mutateAsync({ productId: product.id, data: { showOnBio: checked } });
      qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
    } catch {
      toast({ title: "Error", description: "Could not update bio visibility.", variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    if (product.slug) {
      const url = `${window.location.origin}${BASE_URL}p/${product.slug}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    } else {
      toast({ title: "Publish first to get a link", variant: "destructive" });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      {/* Cover */}
      <div className="relative h-44 bg-gray-100">
        <CoverImage product={product} />
        <div className="absolute top-2 right-2">
          <Badge
            variant="secondary"
            className={`text-xs font-medium ${
              product.published
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-500 border-gray-200"
            }`}
          >
            {product.published ? "● active" : "● draft"}
          </Badge>
        </div>
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs bg-brand-100 text-brand-700 border-brand-200 capitalize">
            {product.type === "lead_magnet" ? "Lead Magnet" : "eBook"}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{product.title}</h3>
        {product.saleShortDescription && (
          <p className="text-xs text-gray-500 line-clamp-2">{product.saleShortDescription}</p>
        )}
        <div className="flex items-center gap-3 mt-auto pt-2">
          <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
            <Tag className="w-3 h-3 text-gray-400" />
            {formatPrice(product)}
          </span>
          <span className="text-xs text-gray-400">
            {product.orderCount ?? 0} sold
          </span>
        </div>

        {/* Show on bio toggle */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 flex-1">Show on bio</span>
          <Switch
            checked={product.showOnBio ?? false}
            onCheckedChange={handleToggleBio}
            className="data-[state=checked]:bg-brand-600"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-gray-600 gap-1 flex-1"
            onClick={() => navigate(`/sell/products/${product.id}/setup`)}
          >
            <Pencil className="w-3 h-3" /> Edit
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400" title="Analytics">
            <BarChart2 className="w-3.5 h-3.5" />
          </Button>
          {product.slug && (
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400"
              title="Preview"
              onClick={() => window.open(`${BASE_URL}p/${product.slug}`, "_blank")}
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400" title="Copy link" onClick={handleCopyLink}>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
            title="Delete"
            onClick={() => onDelete(product.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SellProducts() {
  const [, navigate] = useLocation();
  const { data: products, isLoading } = useGetProducts();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("products");
  const deleteProduct = useDeleteProduct();

  const sellableProducts = (products ?? []).filter(
    (p) => p.type === "ebook" && (p.status === "ready" || p.status === "approved" || p.status === "draft" || p.published)
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct.mutateAsync({ productId: deleteId });
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
      toast({ title: "Product deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete the product.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500">Create and sell digital products from your bio page</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="products" className="text-sm">Products</TabsTrigger>
              <TabsTrigger value="orders" className="text-sm">Orders</TabsTrigger>
              <TabsTrigger value="discounts" className="text-sm">Discounts</TabsTrigger>
              <TabsTrigger value="bundles" className="text-sm">Bundles</TabsTrigger>
            </TabsList>
            <Button
              onClick={() => navigate("/sell/products/new")}
              className="bg-brand-700 hover:bg-brand-800 text-white gap-2"
            >
              <Plus className="w-4 h-4" /> Create Product
            </Button>
          </div>

          <TabsContent value="products">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                    <div className="h-44 bg-gray-100" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sellableProducts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-brand-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No products yet</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                  Create an eBook in the Create section, then come here to set it up for sale.
                </p>
                <Button
                  onClick={() => navigate("/sell/products/new")}
                  className="bg-brand-700 hover:bg-brand-800 text-white gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Product
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">{sellableProducts.length} product{sellableProducts.length !== 1 ? "s" : ""}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sellableProducts.map((p) => (
                    <ProductCard key={p.id} product={p as Product} onDelete={setDeleteId} />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="orders">
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders yet</h3>
              <p className="text-sm text-gray-500">Orders will appear here once buyers purchase your products.</p>
            </div>
          </TabsContent>

          <TabsContent value="discounts">
            <SellDiscounts />
          </TabsContent>

          <TabsContent value="bundles">
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Copy className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Smart bundles coming soon</h3>
              <p className="text-sm text-gray-500">Bundle multiple products together at a special price.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete confirmation */}
      {(() => {
        const deletingProduct = deleteId ? sellableProducts.find((p) => p.id === deleteId) : null;
        const isPublished = deletingProduct?.published ?? false;
        return (
          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    {isPublished && (
                      <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-red-700 text-sm">
                        <span className="mt-0.5 text-red-500">⚠</span>
                        <span>
                          <strong>This product is currently published.</strong> Deleting it will immediately take down its live sales page — any buyers who have shared or bookmarked the link will see a 404. Consider unpublishing it first.
                        </span>
                      </div>
                    )}
                    <p>
                      This will permanently delete the product and its sell settings. This cannot be undone.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteProduct.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteProduct.isPending}
                >
                  {deleteProduct.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</> : isPublished ? "Delete anyway" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}
    </div>
  );
}
