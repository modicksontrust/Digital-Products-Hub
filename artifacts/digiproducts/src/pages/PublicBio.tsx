import { useParams } from "wouter";
import { useEffect } from "react";
import {
  trackPublicBioLinkClick,
  useGetPublicBio,
} from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { BioPreview } from "@/components/BioPreview";

export default function PublicBio() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useGetPublicBio(slug || "", {
    query: { enabled: !!slug },
  });

  useEffect(() => {
    if (data?.displayName) {
      document.title = `${data.displayName} | PokiPoki`;
    }
    return () => {
      document.title = "PokiPoki";
    };
  }, [data?.displayName]);

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
        <p className="text-[#6B7284] text-base">
          This bio page doesn't exist or is no longer available.
        </p>
      </div>
    );
  }

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh]">
      <BioPreview
        data={{
          ...data,
          products: data.products.map((p) => ({
            ...p,
            coverImageUrl: p.coverImageUrl
              ? `${import.meta.env.BASE_URL}api${p.coverImageUrl}`
              : null,
          })),
        }}
        productHref={(s) => `${base}/p/${s}`}
        onLinkClick={(linkId) => {
          void trackPublicBioLinkClick(slug || "", linkId).catch(() => undefined);
        }}
      />
    </div>
  );
}
