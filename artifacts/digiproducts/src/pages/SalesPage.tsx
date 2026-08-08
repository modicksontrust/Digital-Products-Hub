import { useParams } from "wouter";
import { useGetPublicSalesPage, getGetPublicSalesPageQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { SalesPagePreview } from "@/components/SalesPagePreview";

export default function SalesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useGetPublicSalesPage(slug || "", {
    query: { enabled: !!slug, queryKey: getGetPublicSalesPageQueryKey(slug || "") },
  });
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#FAF8F4]">
        <Loader2 className="w-8 h-8 text-[#B8863B] animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#FAF8F4] text-center px-6">
        <h1 className="text-2xl font-serif font-bold text-[#20242E] mb-4">Page not found</h1>
        <p className="text-[#6B7284] text-base">This sales page doesn't exist or is no longer available.</p>
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
    <SalesPagePreview
      headline={copy?.headline ?? ""}
      subheadline={copy?.subheadline ?? ""}
      bullets={copy?.bullets ?? []}
      whoItsFor={copy?.whoItsFor ?? ""}
      faq={(copy?.faq ?? []) as { question: string; answer: string }[]}
      ctaText={copy?.ctaText ?? ""}
      title={data.title}
      authorName={data.authorName}
      priceCents={data.priceCents}
      chapterCount={data.chapterCount}
      coverUrl={coverUrl}
      onBuy={handleBuy}
    />
  );
}
