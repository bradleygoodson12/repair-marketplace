import { LegalPage } from '@/components/legal-page';

export const metadata = { title: 'Privacy Policy | Repair Bee' };

const LEGAL_ENTITY_NAME = '[Your Company Legal Name, e.g. Repair Bee LLC]';
const CONTACT_EMAIL = 'privacy@repairbee.com';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="[DATE — set when this is reviewed and published]"
      intro={
        <p>
          This Privacy Policy explains what information Repair Bee (operated by {LEGAL_ENTITY_NAME}) collects, how
          we use it, and who we share it with. It applies to everyone who uses the site, whether as a customer or a
          pro.
        </p>
      }
      sections={[
        {
          heading: 'Information we collect',
          body: (
            <>
              <p>
                <strong>Account information:</strong> name, email, password (stored as a one-way hash, never in
                plain text), phone number if provided, and account role (customer, pro, or admin).
              </p>
              <p>
                <strong>Job and property information:</strong> property addresses, job descriptions, budgets,
                preferred dates, and any photos or documents you upload (e.g. inspection reports, repair
                addenda).
              </p>
              <p>
                <strong>Pro profile information:</strong> business name, bio, years of experience, service area,
                service categories, and hourly rate if provided.
              </p>
              <p>
                <strong>Messages and reviews:</strong> messages sent between customers and pros through the
                platform, and reviews/ratings left after a completed job.
              </p>
              <p>
                <strong>Payment information (pros only):</strong> subscription billing is handled entirely by
                Stripe. We never see or store your card number — Stripe gives us a customer/subscription reference
                only. We do not process or store any payment information for the repair job itself, since that
                payment happens directly between customer and pro, outside Repair Bee.
              </p>
              <p>
                <strong>Usage information:</strong> standard web request data (IP address, browser, pages visited)
                collected automatically for security and troubleshooting.
              </p>
            </>
          ),
        },
        {
          heading: 'How we use this information',
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>To operate the marketplace — matching job requests to pros by category and service area</li>
              <li>To let customers and pros communicate and exchange quotes</li>
              <li>To extract repair line items from uploaded documents using AI (see below)</li>
              <li>To bill pro subscriptions and send related receipts/notices</li>
              <li>To send transactional email notifications (new leads, messages, accepted quotes, billing issues)</li>
              <li>To maintain account security, prevent abuse, and enforce our Terms of Service</li>
            </ul>
          ),
        },
        {
          heading: 'AI processing of uploaded documents',
          body: (
            <p>
              If you upload a repair-list document (like a home inspection report) to be analyzed, its contents are
              sent to Anthropic&apos;s Claude API to extract individual repair items and match them to service
              categories. This is a third-party AI service with its own processing of that content. Don&apos;t
              upload documents containing information you don&apos;t want processed by a third-party AI provider.
              AI-extracted results may be inaccurate — review them before submitting.
            </p>
          ),
        },
        {
          heading: 'Who we share information with',
          body: (
            <>
              <p>We share information in these situations, and no others:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Other users, as needed to use the service</strong> — e.g. a pro sees the property address,
                  job details, and any uploaded photos/documents for a request they&apos;re matched to; a customer
                  sees a pro&apos;s public business profile and reviews.
                </li>
                <li>
                  <strong>Service providers we use to run Repair Bee:</strong> Stripe (subscription billing),
                  Vercel (hosting and file storage for uploaded photos/documents), Anthropic (AI document analysis),
                  Resend (transactional email), and our authentication system. Each only receives what it needs to
                  do its job.
                </li>
                <li>
                  <strong>Legal requirements</strong> — if required to comply with a law, court order, or to protect
                  the rights, safety, or property of Repair Bee or others.
                </li>
              </ul>
              <p>We do not sell your personal information to third parties, and we don&apos;t use it for third-party advertising.</p>
            </>
          ),
        },
        {
          heading: 'Data retention',
          body: (
            <p>
              We keep account and job information for as long as your account is active, and for a reasonable
              period after to meet legal, accounting, or dispute-resolution needs. You can request deletion of your
              account at any time (see below).
            </p>
          ),
        },
        {
          heading: 'Your choices',
          body: (
            <p>
              You can review and update most of your account information directly from your dashboard. To request
              access to, correction of, or deletion of your personal information, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-700 underline">
                {CONTACT_EMAIL}
              </a>
              . If you&apos;re a California resident, you have rights under the CCPA to know what personal
              information we&apos;ve collected about you and to request its deletion; contact us to exercise those
              rights.
            </p>
          ),
        },
        {
          heading: 'Cookies',
          body: (
            <p>
              Repair Bee uses a session cookie to keep you signed in. We don&apos;t use third-party advertising or
              tracking cookies.
            </p>
          ),
        },
        {
          heading: 'Security',
          body: (
            <p>
              We use reasonable technical and organizational measures to protect your information, including
              password hashing and encrypted connections. No method of transmission or storage is 100% secure, and
              we can&apos;t guarantee absolute security.
            </p>
          ),
        },
        {
          heading: "Children's privacy",
          body: (
            <p>
              Repair Bee is not directed at, and we don&apos;t knowingly collect information from, anyone under 18.
            </p>
          ),
        },
        {
          heading: 'Changes to this policy',
          body: (
            <p>
              We may update this policy from time to time. We&apos;ll update the &quot;Last updated&quot; date
              above when we do.
            </p>
          ),
        },
        {
          heading: 'Contact',
          body: (
            <p>
              Questions about this policy or your data? Email{' '}
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
