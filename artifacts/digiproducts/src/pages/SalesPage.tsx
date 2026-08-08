import { useParams } from "wouter";
import { useState } from "react";
import { useGetPublicSalesPage, getGetPublicSalesPageQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, ChevronDown, ShieldCheck, ArrowRight, Star, BookOpen } from "lucide-react";
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const titleText = copy?.headline || data.title;
  const subtitleText = copy?.subheadline || data.subtitle;
  const ctaText = copy?.ctaText || "Get the eBook";

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F4] text-[#20242E] selection:bg-[#B8863B] selection:text-white font-sans flex flex-col overflow-hidden">

      {/* Background ambient light */}
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[50vh] bg-[#B8863B]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero */}
      <section className="relative px-6 py-16 md:py-24 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-12 items-center z-10">
        {/* Left: Cover */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-full min-w-0 flex justify-center md:block md:max-w-sm md:mx-0 md:perspective-[1000px]"
        >
          {coverUrl ? (
            <div className="relative group rounded-none shadow-[0_20px_50px_rgba(32,36,46,0.18)] w-full max-w-[240px] md:max-w-none transform-gpu md:rotate-y-[-5deg] md:rotate-x-[2deg] transition-transform duration-700 md:hover:rotate-y-0 md:hover:rotate-x-0">
               <img src={coverUrl} alt={titleText} className="w-full h-auto aspect-[2/3] object-cover border border-[#E7E1D4]" />
               <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="w-full max-w-[240px] md:max-w-none aspect-[2/3] bg-white border border-[#E7E1D4] flex items-center justify-center shadow-[0_20px_50px_rgba(32,36,46,0.18)] transform-gpu md:rotate-y-[-5deg] md:rotate-x-[2deg] transition-transform duration-700 md:hover:rotate-y-0 md:hover:rotate-x-0">
              <BookOpen className="w-14 h-14 text-[#E7E1D4]" />
            </div>
          )}
        </motion.div>

        {/* Right: Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="space-y-6 text-center md:text-left min-w-0"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#B8863B]/10 border border-[#B8863B]/25 text-[#96692A] text-xs font-bold tracking-[0.2em] uppercase">
            <Star className="w-3 h-3 fill-current" /> Digital Edition
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium leading-[1.15] text-[#1A1E27]">
              {titleText}
            </h1>
            {subtitleText && (
              <p className="text-base md:text-lg text-[#5B6272] font-light leading-relaxed">
                {subtitleText}
              </p>
            )}
          </div>

          {data.authorName && (
            <p className="text-base text-[#20242E] border-l-2 border-[#B8863B] pl-4 italic inline-block">
              By <span className="font-semibold not-italic">{data.authorName}</span>
            </p>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center md:items-start gap-4">
            <Button
              onClick={handleBuy}
              className="w-full sm:w-auto h-auto min-h-12 px-7 py-3 text-base font-bold bg-[#B8863B] hover:bg-[#A6742D] text-white rounded-none shadow-[0_10px_30px_rgba(184,134,59,0.25)] hover:shadow-[0_10px_36px_rgba(184,134,59,0.35)] transition-all duration-300 whitespace-normal text-center leading-snug"
            >
              {ctaText} — {formatPrice(data.priceCents)}
            </Button>
            <div className="text-sm text-[#6B7284] flex items-center gap-2 mt-1 sm:mt-0 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#B8863B]" />
              Secure Instant Access
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trust Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="border-y border-[#E7E1D4] bg-white/60 relative z-10"
      >
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-[#6B7284]">
           <div className="flex items-center gap-3">
             <BookOpen className="w-4 h-4 text-[#B8863B]" />
             <span className="font-medium text-[#20242E] uppercase tracking-wider text-xs">{data.chapterCount} Chapters</span>
           </div>
           <div className="flex items-center gap-3">
             <Star className="w-4 h-4 text-[#B8863B]" />
             <span className="font-medium text-[#20242E] uppercase tracking-wider text-xs">Read Anywhere</span>
           </div>
           <div className="flex items-center gap-3">
             <CheckCircle2 className="w-4 h-4 text-[#B8863B]" />
             <span className="font-medium text-[#20242E] uppercase tracking-wider text-xs">Lifetime Updates</span>
           </div>
        </div>
      </motion.div>

      {/* Who it's for */}
      {copy?.whoItsFor && (
        <section className="py-16 md:py-24 bg-[#FAF8F4] relative overflow-hidden z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto px-6 text-center relative z-10"
          >
            <h2 className="text-xs text-[#96692A] tracking-[0.2em] uppercase font-bold mb-8">Who This Is For</h2>
            <p className="text-lg md:text-2xl lg:text-3xl font-serif leading-snug md:leading-snug text-[#1A1E27] text-balance">
              "{copy.whoItsFor}"
            </p>
          </motion.div>
        </section>
      )}

      {/* What's Inside */}
      {copy?.bullets && copy.bullets.length > 0 && (
        <section className="py-16 md:py-24 bg-white border-y border-[#E7E1D4] relative z-10">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-serif text-[#1A1E27] mb-4">Inside the Book</h2>
              <p className="text-[#6B7284] text-base max-w-2xl mx-auto">Everything you need to master the subject, broken down into actionable insights.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
              {copy.bullets.map((bullet, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-[#FAF8F4] border border-[#E7E1D4] p-6 flex items-start gap-4 group hover:border-[#B8863B]/40 hover:bg-white transition-all duration-300"
                >
                  <div className="w-9 h-9 rounded-none border border-[#B8863B]/30 bg-[#B8863B]/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#B8863B]/20 transition-colors">
                     <CheckCircle2 className="w-4 h-4 text-[#96692A]" />
                  </div>
                  <p className="text-[#4B5266] leading-relaxed group-hover:text-[#20242E] transition-colors text-base">{bullet}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {copy?.faq && copy.faq.length > 0 && (
        <section className="py-16 md:py-24 bg-[#FAF8F4] relative z-10">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-serif text-[#1A1E27] mb-12 text-center">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {copy.faq.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="border border-[#E7E1D4] rounded-none bg-white overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 md:p-6 text-left group bg-transparent focus:outline-none"
                  >
                    <span className="font-semibold text-base text-[#20242E] group-hover:text-[#96692A] transition-colors">{faq.question}</span>
                    <ChevronDown className={cn("w-4 h-4 shrink-0 text-[#6B7284] transition-transform duration-300", openFaq === i && "rotate-180 text-[#96692A]")} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 md:px-6 pb-6 text-[#4B5266] leading-relaxed text-base border-t border-[#E7E1D4] pt-5 mt-2">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-16 md:py-28 bg-white border-t border-[#E7E1D4] relative z-10 overflow-hidden flex-1 flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(184,134,59,0.06)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-serif text-[#1A1E27] mb-6 text-balance leading-tight">{titleText}</h2>
            <p className="text-base md:text-lg text-[#6B7284] font-light mb-10">Start reading instantly. Available on all devices.</p>

            <div className="flex flex-col items-center justify-center gap-5">
              <div className="text-3xl md:text-4xl font-serif text-[#1A1E27] mb-1">{formatPrice(data.priceCents)}</div>
              <Button
                onClick={handleBuy}
                className="w-full sm:w-auto min-w-[260px] h-auto min-h-14 px-8 py-4 text-lg font-bold bg-[#B8863B] hover:bg-[#A6742D] text-white rounded-none shadow-[0_10px_30px_rgba(184,134,59,0.25)] hover:shadow-[0_10px_36px_rgba(184,134,59,0.35)] transition-all duration-300 whitespace-normal text-center leading-snug"
              >
                {ctaText} <ArrowRight className="ml-3 w-5 h-5 shrink-0 inline" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#FAF8F4] py-10 border-t border-[#E7E1D4] text-center z-10 relative">
        <p className="text-[#6B7284] text-xs uppercase tracking-wider">
          Made with <span className="text-[#20242E] font-semibold">DigiProducts</span>
        </p>
      </footer>
    </div>
  );
}
