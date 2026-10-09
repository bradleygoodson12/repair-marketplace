import { LegalPage } from '@/components/legal-page';

export const metadata = { title: 'Terms of Service | Repair Bee' };

// Fill these in before this page is relied on for real — see the draft
// notice in README's Legal section.
const LEGAL_ENTITY_NAME = '[Your Company Legal Name, e.g. Repair Bee LLC]';
const GOVERNING_STATE = '[Governing State, e.g. Texas]';
const CONTACT_EMAIL = 'legal@repairbee.com';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="[DATE — set when this is reviewed and published]"
      intro={
        <>
          <p className="mb-3">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of Repair Bee, operated by{' '}
            {LEGAL_ENTITY_NAME} (&quot;Repair Bee,&quot; &quot;we,&quot; &quot;us&quot;). By creating an account or
            using the site, you agree to these Terms. If you don&apos;t agree, don&apos;t use Repair Bee.
          </p>
          <p>
            Repair Bee is a lead-generation marketplace that connects homeowners (and their agents) with
            independent repair professionals. We are <strong>not</strong> a party to any repair contract, we do
            not employ or supervise pros, and we do not process payment for the repair work itself — more on
            both below.
          </p>
        </>
      }
      sections={[
        {
          heading: 'Eligibility and accounts',
          body: (
            <>
              <p>
                You must be at least 18 years old and able to form a binding contract to use Repair Bee. You&apos;re
                responsible for the accuracy of the information on your account and for all activity under it. Keep
                your password secure — notify us immediately if you suspect unauthorized access.
              </p>
              <p>
                Customer accounts are for homeowners, buyers, sellers, or their authorized representatives (e.g. a
                real estate agent) posting repair needs. Pro accounts are for independent businesses or
                individuals offering repair services.
              </p>
            </>
          ),
        },
        {
          heading: 'What Repair Bee is — and isn’t',
          body: (
            <>
              <p>
                Repair Bee helps customers describe a repair need and helps pros find and respond to that need. We
                provide messaging, quote submission, and job-tracking tools. We do not perform repair work, we do
                not inspect or guarantee any pro&apos;s licensing, insurance, or workmanship, and we are not a party
                to any agreement a customer and pro reach with each other.
              </p>
              <p>
                <strong>Pros are independent businesses, not Repair Bee employees, agents, or contractors.</strong>{' '}
                We don&apos;t direct, supervise, or control how a pro performs work. Any dispute about the quality,
                timeliness, pricing, or outcome of a repair job is between the customer and the pro — not Repair
                Bee.
              </p>
            </>
          ),
        },
        {
          heading: 'Payments',
          body: (
            <>
              <p>
                <strong>Repair Bee does not process payment for repair jobs.</strong> Customers and pros arrange and
                pay each other directly, by whatever method they agree to. We have no visibility into, custody of,
                or responsibility for that payment, and we do not mediate payment disputes between customers and
                pros.
              </p>
              <p>
                The only payment Repair Bee processes is a pro&apos;s own subscription fee for platform access,
                billed through Stripe. Subscriptions renew automatically each billing period until cancelled from
                your dashboard. Fees already billed are non-refundable except where required by law; cancelling
                stops future billing but doesn&apos;t refund the current period.
              </p>
            </>
          ),
        },
        {
          heading: '"Verified" profiles',
          body: (
            <p>
              A &quot;Verified&quot; badge means a Repair Bee team member reviewed that pro&apos;s profile
              information. It is <strong>not</strong> a criminal background check, license verification, insurance
              verification, or any guarantee of a pro&apos;s qualifications or conduct. Customers are responsible
              for independently confirming a pro&apos;s licensing, insurance, and qualifications before hiring them,
              as required for the work in their jurisdiction.
            </p>
          ),
        },
        {
          heading: 'Content you submit',
          body: (
            <>
              <p>
                You&apos;re responsible for anything you post, upload, or send through Repair Bee — job
                descriptions, photos, documents (like inspection reports), messages, and reviews. Don&apos;t upload
                anything you don&apos;t have the right to share, or anything containing another person&apos;s
                sensitive personal information without their consent.
              </p>
              <p>
                You grant Repair Bee a license to host, display, and process your content as needed to operate the
                service — including sending uploaded repair documents to a third-party AI provider (see our{' '}
                <a href="/privacy" className="text-brand-700 underline">
                  Privacy Policy
                </a>
                ) to extract repair line items. That extraction is AI-generated and may be inaccurate or incomplete
                — review it yourself before sending anything to a pro.
              </p>
              <p>
                Reviews must reflect your genuine experience. We may remove content that&apos;s false, abusive,
                discriminatory, or violates these Terms.
              </p>
            </>
          ),
        },
        {
          heading: 'Prohibited conduct',
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Posting false, misleading, or fraudulent job listings, quotes, or reviews</li>
              <li>Harassing, threatening, or discriminating against other users</li>
              <li>Circumventing account suspension or using the service for anything illegal</li>
              <li>Scraping, reverse-engineering, or interfering with the platform&apos;s normal operation</li>
              <li>Impersonating another person or business, or misrepresenting your licensing or qualifications</li>
            </ul>
          ),
        },
        {
          heading: 'Suspension and termination',
          body: (
            <p>
              We may suspend or terminate an account that violates these Terms, at our discretion, with or without
              notice. You may stop using Repair Bee at any time; a pro with an active subscription should also
              cancel it from their dashboard to stop future billing.
            </p>
          ),
        },
        {
          heading: 'Disclaimers',
          body: (
            <p>
              Repair Bee is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any
              kind, express or implied, including fitness for a particular purpose, non-infringement, or that the
              service will be uninterrupted, secure, or error-free. We don&apos;t warrant the accuracy of
              AI-extracted content, pro-submitted information, or reviews.
            </p>
          ),
        },
        {
          heading: 'Limitation of liability',
          body: (
            <p>
              To the fullest extent permitted by law, Repair Bee and {LEGAL_ENTITY_NAME} are not liable for any
              indirect, incidental, special, consequential, or punitive damages, or for any damages related to
              repair work performed by a pro, arising from your use of the service. Our total liability for any
              claim relating to Repair Bee is limited to the greater of $100 or the amount you paid us in the 12
              months before the claim arose.
            </p>
          ),
        },
        {
          heading: 'Indemnification',
          body: (
            <p>
              You agree to indemnify and hold Repair Bee harmless from claims, damages, and expenses (including
              reasonable attorneys&apos; fees) arising from your use of the service, your content, your violation of
              these Terms, or any repair work, agreement, or dispute between you and another user.
            </p>
          ),
        },
        {
          heading: 'Governing law',
          body: (
            <p>
              These Terms are governed by the laws of {GOVERNING_STATE}, without regard to conflict-of-law
              principles. [Add venue/arbitration provisions here if your attorney recommends them.]
            </p>
          ),
        },
        {
          heading: 'Changes to these Terms',
          body: (
            <p>
              We may update these Terms from time to time. We&apos;ll update the &quot;Last updated&quot; date
              above; continued use of Repair Bee after changes take effect means you accept the updated Terms.
            </p>
          ),
        },
        {
          heading: 'Contact',
          body: (
            <p>
              Questions about these Terms? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-700 underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
