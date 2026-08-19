import { PublicLayout } from "@/components/PublicLayout";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="mb-3 text-lg font-bold text-ink-900">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-ink-600">{children}</div>
  </section>
);

export default function Terms() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-12">
          <span className="mb-3 inline-block rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">Legal</span>
          <h1 className="font-display text-4xl font-bold text-ink-900">Terms of Service</h1>
          <p className="mt-3 text-sm text-ink-400">Last updated: January 2025</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By accessing or using PokiPoki and purchasing any product on this platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.</p>
        </Section>

        <Section title="2. Products and Purchases">
          <p>All products sold on PokiPoki are digital goods. Upon successful payment, you receive a personal, non-exclusive, non-transferable licence to access and use the product for your own personal, non-commercial purposes.</p>
          <p>You may not redistribute, resell, share access, or use purchased products for any commercial purpose without explicit written consent from PokiPoki and the original author.</p>
        </Section>

        <Section title="3. Pricing and Payment">
          <p>All prices are displayed in USD and may be converted to your local currency at checkout. Prices are subject to change without notice. Payment is processed at the time of purchase through our secure payment partners (Stripe and Paystack).</p>
        </Section>

        <Section title="4. Refund Policy">
          <p>We offer a 7-day satisfaction guarantee. If you are not satisfied with your purchase, contact us at support@pokipoki.co within 7 days of purchase and we will issue a full refund. Refund requests submitted after 7 days will be reviewed on a case-by-case basis.</p>
          <p>Refunds are not available for products that have been substantially consumed, misused, or where there is evidence of policy abuse.</p>
        </Section>

        <Section title="5. Intellectual Property">
          <p>All content on PokiPoki, including product content, images, and branding, is the property of PokiPoki or its content creators and is protected by copyright law. Purchasing a product does not transfer any intellectual property rights to you.</p>
        </Section>

        <Section title="6. Prohibited Uses">
          <p>You agree not to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Redistribute or resell purchased products without authorisation</li>
            <li>Use products for commercial purposes without a commercial licence</li>
            <li>Attempt to circumvent payment or access controls</li>
            <li>Use the platform in any way that violates applicable law</li>
          </ul>
        </Section>

        <Section title="7. Disclaimer of Warranties">
          <p>PokiPoki products are provided for informational and educational purposes only. We make no warranties about the results you will achieve from using any product. Results vary based on individual effort, experience, and circumstances.</p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>To the maximum extent permitted by law, PokiPoki shall not be liable for any indirect, incidental, or consequential damages arising from your use of our products or platform. Our total liability to you shall not exceed the amount you paid for the relevant product.</p>
        </Section>

        <Section title="9. Governing Law">
          <p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes shall be resolved through binding arbitration.</p>
        </Section>

        <Section title="10. Contact">
          <p>For any questions about these Terms, contact us at: <a href="mailto:legal@pokipoki.co" className="text-brand-600 hover:underline">legal@pokipoki.co</a></p>
        </Section>
      </div>
    </PublicLayout>
  );
}
