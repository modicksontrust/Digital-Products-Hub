import { useState } from "react";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetProducts, useDuplicateProduct, useArchiveProduct, getGetProductsQueryKey } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Search, SlidersHorizontal, MoreVertical, Copy, 
  Archive, FileText, Download, Edit3, CheckCircle, Clock 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "draft" | "in_progress" | "ready";

export default function Products() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const { data: products, isLoading } = useGetProducts({}, { query: { queryKey: getGetProductsQueryKey() } });
  const duplicate = useDuplicateProduct();
  const archive = useArchiveProduct();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleDuplicate = (id: string) => {
    duplicate.mutate({ productId: id }, {
      onSuccess: (newProduct) => {
        toast({ title: "Product duplicated", description: "Draft created." });
        setLocation(`/products/${newProduct.id}`);
      }
    });
  };

  const handleArchive = (id: string) => {
    if (confirm("Are you sure you want to archive this product?")) {
      archive.mutate({ productId: id }, {
        onSuccess: () => {
          toast({ title: "Product archived" });
          // Note: relying on refetch via query invalidation in hook
        }
      });
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-ink-100 text-ink-700",
    generating: "bg-blue-100 text-blue-800",
    ready: "bg-brand-100 text-brand-800",
    in_review: "bg-amber-100 text-amber-800",
    changes_requested: "bg-rose-100 text-rose-800",
    approved: "bg-lime-100 text-lime-800",
    archived: "bg-ink-100 text-ink-500",
  };

  // Groups the backend's granular statuses into the three buckets shown as
  // filter tabs, so "in progress" covers everything actively moving
  // (generating, in review, changes requested) between draft and ready.
  const statusGroup = (status: string): StatusFilter => {
    if (status === "draft") return "draft";
    if (status === "ready" || status === "approved") return "ready";
    return "in_progress";
  };

  const toggleType = (type: string) => {
    setTypeFilter(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const filteredProducts = products?.filter((p) => {
    if (statusFilter !== "all" && statusGroup(p.status) !== statusFilter) return false;
    if (typeFilter.size > 0 && !typeFilter.has(p.type)) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const counts = {
    all: products?.length ?? 0,
    draft: products?.filter((p) => statusGroup(p.status) === "draft").length ?? 0,
    in_progress: products?.filter((p) => statusGroup(p.status) === "in_progress").length ?? 0,
    ready: products?.filter((p) => statusGroup(p.status) === "ready").length ?? 0,
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink-900">Products Library</h1>
            <p className="text-ink-500 mt-1">Manage your eBooks and lead magnets.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <Input 
                placeholder="Search products..." 
                className="pl-9 bg-white border-ink-200 rounded-xl"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("rounded-xl border-ink-200", typeFilter.size > 0 && "border-brand-400 text-brand-600 bg-brand-50")}>
                  <SlidersHorizontal className="w-4 h-4 mr-2" /> Filters
                  {typeFilter.size > 0 && <span className="ml-1 bg-brand-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">{typeFilter.size}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52 rounded-xl p-4">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">Product Type</p>
                <div className="space-y-2">
                  {[
                    { value: "ebook", label: "eBook" },
                    { value: "lead_magnet", label: "Lead Magnet" },
                  ].map(({ value, label }) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`type-${value}`}
                        checked={typeFilter.has(value)}
                        onCheckedChange={() => toggleType(value)}
                      />
                      <Label htmlFor={`type-${value}`} className="cursor-pointer text-sm font-normal">{label}</Label>
                    </div>
                  ))}
                </div>
                {typeFilter.size > 0 && (
                  <button onClick={() => setTypeFilter(new Set())} className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium">
                    Clear filters
                  </button>
                )}
              </PopoverContent>
            </Popover>
            <Link href="/create/ebook">
              <Button className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold">
                New Product
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="mb-4">
          <TabsList className="bg-ink-100">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="draft">Draft ({counts.draft})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({counts.in_progress})</TabsTrigger>
            <TabsTrigger value="ready">Ready ({counts.ready})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-ink-50">
              <TableRow>
                <TableHead className="w-[300px]">Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-ink-500">Loading products...</TableCell>
                </TableRow>
              ) : filteredProducts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-ink-500">
                      <FileText className="w-12 h-12 mb-3 text-ink-300" />
                      <p>No products found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts?.map(product => (
                  <TableRow key={product.id} className="group hover:bg-ink-50/50 cursor-pointer" onClick={() => setLocation(`/products/${product.id}`)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 bg-ink-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                          {(product.coverConfig as { imageUrl?: string } | null)?.imageUrl ? (
                            <img
                              src={`${import.meta.env.BASE_URL}api/storage${(product.coverConfig as { imageUrl: string }).imageUrl.replace(/^\/api\/storage/, "")}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-5 h-5 text-ink-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-ink-900 group-hover:text-brand-600 transition-colors">{product.title}</p>
                          {product.topic && <p className="text-xs text-ink-500 truncate max-w-[200px]">{product.topic}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-ink-600">{product.type.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("capitalize rounded-full font-medium shadow-none", statusColors[product.status])}>
                        {product.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-ink-600">{product.ownerName}</TableCell>
                    <TableCell className="text-ink-500 text-sm">
                      {formatDistanceToNow(new Date(product.updatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl" onClick={e => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => setLocation(`/products/${product.id}`)}>
                            <Edit3 className="w-4 h-4 mr-2" /> Open detail
                          </DropdownMenuItem>
                          {product.status === 'ready' || product.status === 'approved' ? (
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" /> Download PDF
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDuplicate(product.id)}>
                            <Copy className="w-4 h-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(product.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Archive className="w-4 h-4 mr-2" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
