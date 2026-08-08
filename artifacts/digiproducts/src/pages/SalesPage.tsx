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
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#060913]">
        <Loader2 className="w-8 h-8 text-[#E3B341] animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#060913] text-center px-6">
        <h1 className="text-4xl font-serif font-bold text-[#F0F2F8] mb-4">Page not found</h1>
        <p className="text-[#8F9BB3] text-lg">This sales page doesn't exist or is no longer available.</p>
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
    <div className="min-h-[100dvh] bg-[#060913] text-[#F0F2F8] selection:bg-[#E3B341] selection:text-black font-sans flex flex-col overflow-hidden">
      
      {/* Background ambient light */}
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[50vh] bg-[#E3B341]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero */}
      <section className="relative px-6 py-20 md:py-32 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-16 items-center z-10">
        {/* Left: Cover */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-full min-w-0 flex justify-center md:block md:max-w-md md:mx-0 md:perspective-[1000px]"
        >
          {coverUrl ? (
            <div className="relative group rounded-none shadow-[0_30px_60px_rgba(0,0,0,0.8)] w-full max-w-[280px] md:max-w-none transform-gpu md:rotate-y-[-5deg] md:rotate-x-[2deg] transition-transform duration-700 md:hover:rotate-y-0 md:hover:rotate-x-0">
               <img src={coverUrl} alt={titleText} className="w-full h-auto aspect-[2/3] object-cover border border-[#1C243E]" />
               <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="w-full max-w-[280px] md:max-w-none aspect-[2/3] bg-[#0D1326] border border-[#1C243E] flex items-center justify-center shadow-[0_30px_60px_rgba(0,0,0,0.8)] transform-gpu md:rotate-y-[-5deg] md:rotate-x-[2deg] transition-transform duration-700 md:hover:rotate-y-0 md:hover:rotate-x-0">
              <BookOpen className="w-16 h-16 text-[#1C243E]" />
            </div>
          )}
        </motion.div>

        {/* Right: Content */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="space-y-8 text-center md:text-left min-w-0"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E3B341]/10 border border-[#E3B341]/20 text-[#E3B341] text-xs font-bold tracking-[0.2em] uppercase">
            <Star className="w-3 h-3 fill-current" /> Digital Edition
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-medium leading-[1.1] text-white">
              {titleText}
            </h1>
            {subtitleText && (
              <p className="text-xl md:text-2xl text-[#8F9BB3] font-light leading-relaxed">
                {subtitleText}
              </p>
            )}
          </div>

          {data.authorName && (
            <p className="text-lg text-[#F0F2F8] border-l-2 border-[#E3B341] pl-4 italic inline-block">
              By <span className="font-semibold not-italic">{data.authorName}</span>
            </p>
          )}

          <div className="pt-6 flex flex-col sm:flex-row items-center md:items-start gap-5">
            <Button 
              onClick={handleBuy}
              className="w-full sm:w-auto h-14 px-8 text-lg font-bold bg-[#E3B341] hover:bg-[#F0CE7A] text-[#060913] rounded-none shadow-[0_0_40px_rgba(227,179,65,0.15)] hover:shadow-[0_0_60px_rgba(227,179,65,0.3)] transition-all duration-300"
            >
              {ctaText} — {formatPrice(data.priceCents)}
            </Button>
            <div className="text-sm text-[#8F9BB3] flex items-center gap-2 mt-1 sm:mt-0 font-medium">
              <ShieldCheck className="w-5 h-5 text-[#E3B341]" />
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
        className="border-y border-[#1C243E] bg-[#0D1326]/50 relative z-10"
      >
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-center gap-x-16 gap-y-6 text-[#8F9BB3]">
           <div className="flex items-center gap-3">
             <BookOpen className="w-5 h-5 text-[#E3B341]" />
             <span className="font-medium text-[#F0F2F8] uppercase tracking-wider text-sm">{data.chapterCount} Chapters</span>
           </div>
           <div className="flex items-center gap-3">
             <Star className="w-5 h-5 text-[#E3B341]" />
             <span className="font-medium text-[#F0F2F8] uppercase tracking-wider text-sm">Read Anywhere</span>
           </div>
           <div className="flex items-center gap-3">
             <CheckCircle2 className="w-5 h-5 text-[#E3B341]" />
             <span className="font-medium text-[#F0F2F8] uppercase tracking-wider text-sm">Lifetime Updates</span>
           </div>
        </div>
      </motion.div>

      {/* Who it's for */}
      {copy?.whoItsFor && (
        <section className="py-24 md:py-36 bg-[#060913] relative overflow-hidden z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-gradient-to-r from-transparent via-[#0D1326] to-transparent pointer-events-none" />
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto px-6 text-center relative z-10"
          >
            <h2 className="text-sm text-[#E3B341] tracking-[0.2em] uppercase font-bold mb-10">Who This Is For</h2>
            <p className="text-2xl md:text-4xl lg:text-5xl font-serif leading-tight md:leading-tight text-white text-balance">
              "{copy.whoItsFor}"
            </p>
          </motion.div>
        </section>
      )}

      {/* What's Inside */}
      {copy?.bullets && copy.bullets.length > 0 && (
        <section className="py-24 md:py-32 bg-[#0D1326] border-y border-[#1C243E] relative z-10">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-serif text-white mb-6">Inside the Book</h2>
              <p className="text-[#8F9BB3] text-lg max-w-2xl mx-auto">Everything you need to master the subject, broken down into actionable insights.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
              {copy.bullets.map((bullet, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-[#060913] border border-[#1C243E] p-8 flex items-start gap-5 group hover:border-[#E3B341]/40 hover:bg-[#080C1A] transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-none border border-[#E3B341]/30 bg-[#E3B341]/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#E3B341]/20 transition-colors">
                     <CheckCircle2 className="w-5 h-5 text-[#E3B341]" />
                  </div>
                  <p className="text-[#8F9BB3] leading-relaxed group-hover:text-[#F0F2F8] transition-colors text-lg">{bullet}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {copy?.faq && copy.faq.length > 0 && (
        <section className="py-24 md:py-32 bg-[#060913] relative z-10">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-5xl font-serif text-white mb-16 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {copy.faq.map((faq, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="border border-[#1C243E] rounded-none bg-[#0D1326] overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-6 md:p-8 text-left group bg-transparent focus:outline-none"
                  >
                    <span className="font-semibold text-lg text-[#F0F2F8] group-hover:text-[#E3B341] transition-colors">{faq.question}</span>
                    <ChevronDown className={cn("w-5 h-5 shrink-0 text-[#8F9BB3] transition-transform duration-300", openFaq === i && "rotate-180 text-[#E3B341]")} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 md:px-8 pb-8 text-[#C4CDE0] leading-relaxed text-lg border-t border-[#1C243E] pt-6 mt-2">
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
      <section className="py-24 md:py-40 bg-[#0D1326] border-t border-[#1C243E] relative z-10 overflow-hidden flex-1 flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(227,179,65,0.08)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white mb-8 text-balance leading-tight">{titleText}</h2>
            <p className="text-xl md:text-2xl text-[#8F9BB3] font-light mb-12">Start reading instantly. Available on all devices.</p>
            
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="text-5xl md:text-6xl font-serif text-white mb-2">{formatPrice(data.priceCents)}</div>
              <Button 
                onClick={handleBuy}
                className="w-full sm:w-auto min-w-[280px] h-16 text-xl font-bold bg-[#E3B341] hover:bg-[#F0CE7A] text-[#060913] rounded-none shadow-[0_0_40px_rgba(227,179,65,0.2)] hover:shadow-[0_0_60px_rgba(227,179,65,0.4)] transition-all duration-300"
              >
                {ctaText} <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#060913] py-12 border-t border-[#1C243E] text-center z-10 relative">
        <p className="text-[#8F9BB3] text-sm uppercase tracking-wider">
          Made with <span className="text-[#F0F2F8] font-semibold">DigiProducts</span>
        </p>
      </footer>
    </div>
  );
}
