import { useParams } from "wouter";
import { useState } from "react";
import { useGetPublicSalesPage, getGetPublicSalesPageQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronDown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "Name your price";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function SalesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useGetPublicSalesPage(slug || "", {
    query: { enabled: !!slug, queryKey: getGetPublicSalesPageQueryKey(slug || "") },
  });
  const { toast } = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink-50 text-center px-6">
        <h1 className="text-2xl font-display font-bold text-ink-900 mb-2">Page not found</h1>
        <p className="text-ink-500">This sales page doesn't exist or is no longer available.</p>
      </div>
    );
  }

  const copy = data.salesCopy;
  const coverUrl = data.coverImageUrl
    ? `${import.meta.env.BASE_URL}api${data.coverImageUrl}`
    : null;

  const handleBuy = () => {
    toast({
      title: "Checkout coming soon",
      description: "Payments aren't enabled on this sales page yet.",
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-ink-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-[280px_1fr] gap-12 items-center">
          {coverUrl && (
            <img
              src={coverUrl}
              alt={data.title}
              className="w-48 md:w-full mx-auto rounded-lg shadow-2xl aspect-[3/4] object-cover"
            />
          )}
          <div>
            <p className="uppercase tracking-widest text-xs text-brand-300 font-semibold mb-3">eBook</p>
            <h1 className="text-3xl md:text-5xl font-display font-bold leading-tight mb-4">
              {copy?.headline || data.title}
            </h1>
            {(copy?.subheadline || data.subtitle) && (
              <p className="text-lg text-ink-300 mb-6">{copy?.subheadline || data.subtitle}</p>
            )}
            {data.authorName && (
              <p className="text-sm text-ink-400 mb-6">By {data.authorName}</p>
            )}
            <Button
              size="lg"
              className="h-12 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold"
              onClick={handleBuy}
            >
              {copy?.ctaText || "Get the eBook"} — {formatPrice(data.priceCents)}
            </Button>
          </div>
        </div>
      </section>

      {/* What's inside */}
      {copy && (copy.bullets ?? []).length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-display font-bold text-ink-900 mb-6 text-center">
            What's inside
          </h2>
          <ul className="grid sm:grid-cols-2 gap-4">
            {(copy.bullets ?? []).map((b, i) => (
              <li key={i} className="flex items-start gap-3 bg-ink-50 rounded-xl p-4">
                <Check className="w-5 h-5 text-brand-500 mt-0.5 shrink-0" />
                <span className="text-ink-700">{b}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Who it's for */}
      {copy?.whoItsFor && (
        <section className="bg-ink-50">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h2 className="text-2xl font-display font-bold text-ink-900 mb-4">Who this is for</h2>
            <p className="text-ink-600 text-lg leading-relaxed">{copy.whoItsFor}</p>
          </div>
        </section>
      )}

      {/* Guarantee / chapter count */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-ink-200 p-8 flex items-start gap-4">
          <ShieldCheck className="w-8 h-8 text-brand-500 shrink-0" />
          <div>
            <h3 className="font-semibold text-ink-900 mb-1">{data.chapterCount} chapters, instant access</h3>
            <p className="text-ink-500 text-sm">
              Download immediately after purchase and read on any device.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing / Buy */}
      <section className="bg-ink-950 text-white">
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <Sparkles className="w-8 h-8 text-brand-300 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">{data.title}</h2>
          <p className="text-4xl font-display font-bold mb-6">{formatPrice(data.priceCents)}</p>
          <Button
            size="lg"
            className="h-12 w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold"
            onClick={handleBuy}
          >
            {copy?.ctaText || "Buy Now"}
          </Button>
        </div>
      </section>

      {/* FAQ */}
      {copy && (copy.faq ?? []).length > 0 && (
        <section className="max-w-2xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-display font-bold text-ink-900 mb-6 text-center">
            Frequently asked questions
          </h2>
          <div className="space-y-2">
            {(copy.faq ?? []).map((f, i) => (
              <div key={i} className="border border-ink-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between gap-4 p-4 text-left font-medium text-ink-900"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {f.question}
                  <ChevronDown
                    className={cn("w-4 h-4 shrink-0 transition-transform", openFaq === i && "rotate-180")}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-ink-500 text-sm">{f.answer}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="py-10 text-center text-xs text-ink-400">
        Made with DigiProducts
      </footer>
    </div>
  );
}
