import { PublicLayout } from "@/components/PublicLayout";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="mb-3 text-lg font-bold text-ink-900">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-ink-600">{children}</div>
  </section>
);

export default function PrivacyPolicy() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-12">
          <span className="mb-3 inline-block rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">Legal</span>
          <h1 className="font-display text-4xl font-bold text-ink-900">Privacy Policy</h1>
          <p className="mt-3 text-sm text-ink-400">Last updated: January 2025</p>
        </div>

        <Section title="1. Information We Collect">
          <p>When you purchase a product on PokiPoki, we collect your name, email address, and payment information. Payment card details are processed securely by our payment partners (Stripe and Paystack) and are never stored on our servers.</p>
          <p>We may also collect technical information such as your IP address, browser type, and pages visited to help us improve the platform.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use your information to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Process and fulfil your purchase orders</li>
            <li>Send order confirmations and product delivery emails</li>
            <li>Respond to support enquiries</li>
            <li>Improve the platform and user experience</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>
        </Section>

        <Section title="3. Payment Processing">
          <p>All payments are processed by Stripe and Paystack. These providers are PCI DSS compliant and use industry-standard encryption to protect your financial data. By making a purchase, you agree to their respective privacy policies.</p>
        </Section>

        <Section title="4. Data Retention">
          <p>We retain your purchase records for up to 7 years to comply with financial regulations. Account information is retained until you request deletion. You may request deletion of your personal data at any time by emailing privacy@pokipoki.co.</p>
        </Section>

        <Section title="5. Cookies">
          <p>We use essential cookies to operate the platform (e.g. session management). We do not use tracking or advertising cookies without your consent.</p>
        </Section>

        <Section title="6. Your Rights">
          <p>Depending on your location, you may have the right to access, correct, delete, or export your personal data. To exercise these rights, contact us at privacy@pokipoki.co. We will respond within 30 days.</p>
        </Section>

        <Section title="7. Security">
          <p>We use industry-standard security measures including SSL/TLS encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure and we cannot guarantee absolute security.</p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. Continued use of PokiPoki after changes constitutes your acceptance of the new policy.</p>
        </Section>

        <Section title="9. Contact Us">
          <p>If you have questions about this Privacy Policy, contact us at: <a href="mailto:privacy@pokipoki.co" className="text-brand-600 hover:underline">privacy@pokipoki.co</a></p>
        </Section>
      </div>
    </PublicLayout>
  );
}
