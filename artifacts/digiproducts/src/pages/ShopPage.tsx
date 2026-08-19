/**
 * /shop — Browse all published products with category filters.
 */
import { useState, useMemo } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/PublicLayout";
import { cn } from "@/lib/utils";
import {
  Search, BookOpen, ChevronRight, SlidersHorizontal, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface PublicProduct {
  id: string;
  title: string;
  slug: string | null;
  priceCents: number | null;
  currency: string | null;
  topic: string | null;
  type: string | null;
  authorName: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Health & Wellness": "from-emerald-400 to-teal-500",
  "Business":          "from-blue-500 to-indigo-600",
  "Personal Finance":  "from-amber-400 to-orange-500",
  "Productivity":      "from-purple-500 to-pink-500",
  "Freelancing":       "from-rose-400 to-red-500",
};

const CATEGORIES = ["All", ...Object.keys(CATEGORY_COLORS)];

function ProductCard({ product }: { product: PublicProduct }) {
  const gradient = CATEGORY_COLORS[product.topic ?? ""] ?? "from-brand-400 to-brand-600";
  const price = product.priceCents != null
    ? `$${(product.priceCents / 100).toFixed(2)}`
    : "Free";
  const coverUrl = product.slug
    ? `${import.meta.env.BASE_URL}api/public/sales-page/${product.slug}/cover`
    : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      {/* Cover */}
      <div className={cn("relative h-48 overflow-hidden bg-gradient-to-br", gradient)}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={product.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-14 w-14 text-white/50" />
          </div>
        )}
        {product.topic && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink-700 shadow-sm backdrop-blur-sm">
            {product.topic}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-1 line-clamp-2 font-semibold text-ink-900 leading-snug">{product.title}</p>
        {product.authorName && (
          <p className="mb-4 text-xs text-ink-400">by {product.authorName}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-ink-900">{price}</span>

          <div className="flex gap-2">
            {product.slug && (
              <Link href={`/p/${product.slug}`}>
                <button className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium text-ink-600 transition hover:bg-ink-50">
                  Details
                </button>
              </Link>
            )}
            {product.slug ? (
              <Link href={`/checkout/${product.slug}`}>
                <button className="flex items-center gap-1 rounded-xl bg-ink-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700">
                  Buy Now <ChevronRight className="h-3 w-3" />
                </button>
              </Link>
            ) : (
              <button disabled className="cursor-not-allowed rounded-xl bg-ink-100 px-4 py-2 text-xs font-semibold text-ink-400">
                Unavailable
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const searchStr = useSearch();
  const urlCategory = new URLSearchParams(searchStr).get("category") ?? "All";
  const [category, setCategory] = useState<string>(
    CATEGORIES.includes(urlCategory) ? urlCategory : "All",
  );
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading } = useQuery<PublicProduct[]>({
    queryKey: ["/api/public/products"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/public/products`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      if (category !== "All" && p.topic !== category) return false;
      if (q && !p.title.toLowerCase().includes(q) && !(p.authorName ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, category, search]);

  return (
    <PublicLayout>
      {/* Header */}
      <section className="border-b border-ink-100 bg-gradient-to-b from-ink-50 to-white py-14">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-brand-600">
            Digital products
          </span>
          <h1 className="font-display text-4xl font-bold text-ink-900 md:text-5xl">
            Browse the Shop
          </h1>
          <p className="mt-3 text-ink-500">
            {products.length} premium products — eBooks, guides & more — ready for instant download
          </p>

          {/* Search */}
          <div className="relative mx-auto mt-6 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or author…"
              className="pl-10 pr-10 rounded-xl h-11"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category tabs */}
      <section className="sticky top-[73px] z-10 border-b border-ink-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl overflow-x-auto px-6">
          <div className="flex gap-1 py-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition",
                  category === cat
                    ? "bg-ink-900 text-white"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section className="mx-auto max-w-7xl px-6 py-10 pb-24">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-ink-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <SlidersHorizontal className="mb-4 h-12 w-12 text-ink-200" />
            <p className="font-semibold text-ink-700">No products found</p>
            <p className="mt-1 text-sm text-ink-400">
              Try a different search term or category.
            </p>
            <button
              onClick={() => { setSearch(""); setCategory("All"); }}
              className="mt-4 rounded-xl border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 transition"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-ink-500">
                Showing <span className="font-semibold text-ink-900">{filtered.length}</span> product{filtered.length !== 1 ? "s" : ""}
                {category !== "All" && <> in <span className="font-semibold text-ink-900">{category}</span></>}
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </section>
    </PublicLayout>
  );
}
