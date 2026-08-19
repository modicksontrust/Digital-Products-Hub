import { useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "What is PokiPoki?",
    a: "PokiPoki is a digital product marketplace where you can purchase premium eBooks, guides, and online resources on topics like health, business, personal finance, productivity, and freelancing. All products are written by expert authors and go through a quality review before being listed.",
  },
  {
    q: "How do I purchase a product?",
    a: "Click 'Buy Now' on any product page or card. Enter your name, email address, and select your country — the price will automatically adjust to your local currency. Fill in your payment details and click Pay. The whole process takes under 60 seconds.",
  },
  {
    q: "What currencies do you accept?",
    a: "We accept payments in USD, NGN (Nigerian Naira), GBP, EUR, CAD, GHS, KES, ZAR, and more. When you select your country at checkout, the displayed price automatically converts to your local currency at the current rate.",
  },
  {
    q: "How do I access my product after purchase?",
    a: "As soon as your payment is confirmed, you'll receive an email with your download or access link. You can also visit 'My Purchases' and enter your email to see all your orders and re-download your products at any time.",
  },
  {
    q: "Are the products available immediately after payment?",
    a: "Yes — all digital products are delivered instantly after payment confirmation. There are no waiting periods or shipping delays since everything is digital.",
  },
  {
    q: "Can I get a refund?",
    a: "We offer a 7-day satisfaction guarantee on all products. If you're not happy with your purchase for any reason, contact us within 7 days and we'll process a full refund — no questions asked.",
  },
  {
    q: "Is my payment information secure?",
    a: "Absolutely. All payments are processed through Stripe and Paystack, two of the world's most trusted payment processors. Your card details are encrypted with 256-bit SSL and we never store them on our servers.",
  },
  {
    q: "Can I share the product I purchased with others?",
    a: "No. All products are licensed for personal use only. Redistribution, resale, or sharing of purchased content violates our Terms of Service and the copyright of our authors. Please respect the creators' work.",
  },
  {
    q: "What formats are the eBooks available in?",
    a: "eBooks are delivered as PDF files, optimised for reading on all devices — desktop, tablet, and mobile. Some products may also include bonus formats like EPUB or printable worksheets.",
  },
  {
    q: "I didn't receive my purchase email — what should I do?",
    a: "Check your spam or junk folder first. If it's not there, visit 'My Purchases' and enter your order email address to retrieve your access links. Still having trouble? Contact our support team and we'll get it sorted within 24 hours.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ink-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold text-ink-900 hover:text-brand-700 transition-colors"
      >
        {q}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-ink-600">{a}</p>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <PublicLayout>
      {/* Header */}
      <section className="bg-gradient-to-b from-brand-50 to-white py-16 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <span className="mb-4 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            Help Centre
          </span>
          <h1 className="font-display text-4xl font-bold text-ink-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-ink-500">
            Everything you need to know about purchasing and accessing products on PokiPoki.
          </p>
        </div>
      </section>

      {/* FAQ list */}
      <section className="mx-auto max-w-2xl px-6 py-12 pb-24">
        <div className="rounded-2xl border border-ink-100 bg-white shadow-sm px-6">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>

        {/* Still need help */}
        <div className="mt-10 rounded-2xl border border-brand-200 bg-brand-50 p-8 text-center">
          <h3 className="font-semibold text-ink-900 mb-2">Still have questions?</h3>
          <p className="text-sm text-ink-500 mb-4">
            Our support team is available Monday–Friday, 9am–6pm WAT.
          </p>
          <a
            href="mailto:support@pokipoki.co"
            className="inline-block rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Email Support
          </a>
        </div>
      </section>
    </PublicLayout>
  );
}
