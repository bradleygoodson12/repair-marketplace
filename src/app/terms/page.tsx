import { LegalPage } from '@/components/legal-page';

export const metadata = { title: 'Terms of Service | Repair Bee' };

const LEGAL_ENTITY_NAME = 'Repair Bee LLC';
const GOVERNING_STATE = 'South Carolina';
const CONTACT_EMAIL = 'legal@repairbee.io';
const ARBITRATION_OPT_OUT_EMAIL = 'legal@repairbee.io';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="[DATE — set when this is reviewed and published]"
      intro={
        <>
          <p className="mb-3">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of Repair Bee, operated by{' '}
            {LEGAL_ENTITY_NAME}, a South Carolina limited liability company (&quot;Repair Bee,&quot; &quot;we,&quot;
            &quot;us&quot;). By creating an account or using the site, you agree to these Terms. If you don&apos;t
            agree, don&apos;t use Repair Bee.
          </p>
          <p className="mb-3">
            Repair Bee is a lead-generation marketplace that connects homeowners (and their agents) with
            independent repair professionals. We are <strong>not</strong> a party to any repair contract, we do
            not employ or supervise pros, and we do not process payment for the repair work itself — more on
            both below.
          </p>
          <p className="rounded-md bg-gray-50 p-3 text-sm font-semibold text-gray-800">
            Important: these Terms include a binding arbitration provision and a class action waiver, described in
            the &quot;Dispute resolution&quot; section below. Except where prohibited by law, that section requires
            you to resolve disputes with Repair Bee through individual arbitration rather than in court or as part
            of a class action, and gives you 30 days from your first use of the site to opt out of it. Please read
            that section carefully.
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
                your password secure — notify us immediately if you suspect unauthorized access. Accounts are
                personal to you and may not be transferred without our written permission, and we may require you
                to verify your identity before using certain features.
              </p>
              <p>
                Customer accounts are for homeowners, buyers, sellers, or their authorized representatives (e.g. a
                real estate agent) posting repair needs. Pro accounts are for independent businesses or
                individuals offering repair services. Each person or business may hold only one account of each
                type — creating duplicate pro accounts to get around our per-category capacity limits (see below)
                is a violation of these Terms.
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
                provide messaging, quote submission, scheduling, and job-tracking tools. We do not perform repair
                work, we do not inspect or guarantee any pro&apos;s licensing, insurance, or workmanship, and we are
                not a party to any agreement a customer and pro reach with each other. Posting a request, receiving
                a quote, or being matched with a pro doesn&apos;t guarantee that any work will actually be
                performed, or performed to any particular standard.
              </p>
              <p>
                <strong>Pros are independent businesses, not Repair Bee employees, agents, or contractors.</strong>{' '}
                We don&apos;t direct, supervise, or control how a pro performs work, what jobs they take, their
                pricing, or their schedule, and pros are free to find work through other channels. Any dispute
                about the quality, timeliness, pricing, licensing, insurance, or outcome of a repair job is between
                the customer and the pro — not Repair Bee.
              </p>
              <p>
                Pros represent and warrant that they (and anyone performing work on their behalf) are properly
                qualified, and hold any license, bond, permit, or insurance required by law for the work they offer
                and the jurisdiction they work in; will comply with applicable law in performing that work; will
                perform it in a professional, workmanlike manner; and will promptly tell us if they&apos;re
                convicted of a crime involving fraud, theft, violence, or sexual misconduct while using Repair Bee.
              </p>
            </>
          ),
        },
        {
          heading: 'Service area',
          body: (
            <p>
              Repair Bee currently operates only in the Charleston, SC area and nearby parts of the Lowcountry,
              and we may change, expand, or further limit that service area at any time. We may decline to accept a
              repair request or a pro profile tied to a property or service area outside the area we currently
              serve, and reserve the right to limit availability of the platform to any person, area, or
              jurisdiction at our discretion.
            </p>
          ),
        },
        {
          heading: 'Payments',
          body: (
            <>
              <p>
                <strong>Repair Bee does not process payment for repair jobs.</strong> Customers and pros arrange and
                pay each other directly for the actual repair work, by whatever method they agree to. We have no
                visibility into, custody of, or responsibility for that payment, and we do not mediate payment
                disputes between customers and pros.
              </p>
              <p>
                The only payments Repair Bee processes, through Stripe, are a pro&apos;s own fees for platform
                access and lead delivery: either a per-quote fee charged when a customer accepts that pro&apos;s
                quote, a flat subscription fee for unlimited quoting, or a fee for an approved change order,
                depending on the pro&apos;s billing mode and the job. Pros choose and can change their billing mode
                from their dashboard. Subscriptions renew automatically each billing period until cancelled.
              </p>
              <p>
                Fees already billed are final and non-refundable except where required by law or where we expressly
                state otherwise; cancelling a subscription stops future billing but doesn&apos;t refund the current
                period. You may not attempt to circumvent, underpay, or avoid a fee owed to Repair Bee, including by
                arranging with another user to move a quote, job, or payment off the platform in order to avoid it.
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
                descriptions, photos, documents (like inspection reports), messages, invoices, warranty documents,
                and reviews. Don&apos;t upload anything you don&apos;t have the right to share, or anything
                containing another person&apos;s sensitive personal information without their consent. If you
                upload photos or documents meant to represent actual completed work — for example, before-and-after
                photos attached to an invoice — they must be authentic and not generated or materially altered by
                AI.
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
                Reviews must reflect your genuine experience — don&apos;t exchange money, discounts, or anything
                else of value for a review, and don&apos;t post a review for a job you weren&apos;t actually
                involved in. We may remove content that&apos;s false, abusive, discriminatory, or violates these
                Terms, and we may monitor messages sent through the platform to help enforce these Terms, bill fees
                correctly, and keep users safe.
              </p>
            </>
          ),
        },
        {
          heading: 'If you receive a customer’s information as a pro',
          body: (
            <p>
              When you&apos;re matched to a repair request, we share the customer&apos;s name, property address, and
              job details with you so you can evaluate and quote that specific job. You may use that information
              only for that purpose — to evaluate, communicate about, quote, and (if hired) perform that job. You
              may not sell it, share it with anyone else, add the customer to a marketing list, or contact them
              about unrelated services, and you must handle it with reasonable care. Misusing a customer&apos;s
              information this way is a serious violation of these Terms and may result in immediate suspension.
            </p>
          ),
        },
        {
          heading: 'Prohibited conduct',
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Posting false, misleading, or fraudulent job listings, quotes, reviews, or profile information</li>
              <li>Misrepresenting your identity, licensing, insurance, or qualifications</li>
              <li>
                Soliciting or agreeing with another user to move a quote or job off-platform specifically to avoid a
                fee owed to Repair Bee
              </li>
              <li>
                Creating more than one customer or pro account, or using a second account to get around a
                suspension, a capacity limit, or a waitlist position
              </li>
              <li>Exchanging money or anything of value for a review, or posting a review for a job you weren&apos;t part of</li>
              <li>Harassing, threatening, or discriminating against other users</li>
              <li>Using a customer&apos;s contact information for anything other than the specific job you were matched to</li>
              <li>Scraping, reverse-engineering, or interfering with the platform&apos;s normal operation</li>
              <li>Sending unsolicited marketing, spam, or recruiting other users for anything unrelated to a repair job</li>
              <li>Using Repair Bee for anything illegal, or in a way that violates these Terms</li>
            </ul>
          ),
        },
        {
          heading: 'Disputes between users',
          body: (
            <p>
              We hope most disagreements between a customer and a pro can be worked out directly — through
              messages, a change order, or the report tool available on a job page (including for incomplete or
              unsatisfactory work). We&apos;re not obligated to investigate or resolve a dispute between users, and
              we&apos;re not a party to the underlying repair agreement, but we may look into a report, request
              information from either side, and suspend an account based on what we find. Any legal claim you have
              about a repair job belongs between you and the other user, not against Repair Bee.
            </p>
          ),
        },
        {
          heading: 'Suspension and termination',
          body: (
            <p>
              We may suspend or terminate an account that violates these Terms, at our discretion, with or without
              notice, and without any obligation to refund fees already paid. You may stop using Repair Bee at any
              time; a pro with an active subscription should also cancel it from their dashboard to stop future
              billing.
            </p>
          ),
        },
        {
          heading: 'Dispute resolution — arbitration and class action waiver',
          body: (
            <>
              <p className="font-semibold">
                PLEASE READ THIS SECTION CAREFULLY. EXCEPT WHERE PROHIBITED BY LAW, IT REQUIRES YOU AND REPAIR BEE
                TO RESOLVE MOST DISPUTES THROUGH INDIVIDUAL BINDING ARBITRATION RATHER THAN IN COURT, AND WAIVES
                YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION.
              </p>
              <p>
                <strong>Informal resolution first.</strong> Before filing an arbitration or a small claims action,
                you agree to email {CONTACT_EMAIL} with a description of the dispute, what you&apos;re asking for,
                and your contact information. We&apos;ll do the same if we have a claim against you. Both sides
                agree to negotiate in good faith for at least 30 days before starting arbitration or a court case.
              </p>
              <p>
                <strong>Binding individual arbitration.</strong> If a dispute isn&apos;t resolved informally, any
                claim arising out of or relating to these Terms, your use of Repair Bee, or your relationship with
                us — other than a claim that qualifies for small claims court, or a claim to protect intellectual
                property rights — will be resolved by binding arbitration administered by the American Arbitration
                Association under its Consumer Arbitration Rules, rather than in court. The arbitration will be
                conducted by a single arbitrator and may be conducted by phone, in writing, or in person in{' '}
                {GOVERNING_STATE}, as the applicable rules provide. The arbitrator, not a court, decides all
                disputes about the interpretation, applicability, or enforceability of this arbitration agreement.
                Each party ordinarily bears its own attorneys&apos; fees, except as the arbitration rules or
                applicable law provide otherwise.
              </p>
              <p>
                <strong>Class action waiver.</strong> You and Repair Bee agree that any arbitration or court
                proceeding will be conducted only on an individual basis, not as a class, consolidated, or
                representative action. If a court or arbitrator decides this class action waiver is unenforceable
                for a particular claim, that claim (and only that claim) may proceed in court instead of
                arbitration, and the rest of this section still applies to all other claims.
              </p>
              <p>
                <strong>Your right to opt out.</strong> You can opt out of this arbitration and class action waiver
                section entirely. To do so, email {ARBITRATION_OPT_OUT_EMAIL} within 30 days of first creating a
                Repair Bee account (or, for an existing account, within 30 days of these Terms taking effect) with
                the subject line &quot;Arbitration opt-out&quot; and your name and account email. If you opt out,
                neither you nor Repair Bee is bound by this section, and disputes will instead be resolved under
                the &quot;Governing law&quot; section below.
              </p>
              <p>
                This section survives if your account or these Terms end, and applies to disputes that arose before
                these Terms took effect as well as disputes that arise after.
              </p>
            </>
          ),
        },
        {
          heading: 'Disclaimers',
          body: (
            <p>
              Repair Bee is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any
              kind, express or implied, including fitness for a particular purpose, non-infringement, or that the
              service will be uninterrupted, secure, or error-free. We don&apos;t warrant the accuracy of
              AI-extracted content, pro-submitted information, or reviews, and we don&apos;t warrant that any pro
              will accept, complete, or properly perform any job, or that a customer will pay for one.
            </p>
          ),
        },
        {
          heading: 'Limitation of liability',
          body: (
            <p>
              To the fullest extent permitted by law, Repair Bee is not liable for any
              indirect, incidental, special, consequential, or punitive damages, or for any damages related to
              repair work performed (or not performed) by a pro, arising from your use of the service. Our total
              liability for any claim relating to Repair Bee is limited to the greater of $100 or the amount you
              paid us in the 12 months before the claim arose.
            </p>
          ),
        },
        {
          heading: 'Indemnification',
          body: (
            <p>
              You agree to indemnify and hold Repair Bee harmless from claims, damages, and expenses (including
              reasonable attorneys&apos; fees) arising from your use of the service, your content, your violation of
              these Terms, your misuse of another user&apos;s personal information, or any repair work, agreement,
              or dispute between you and another user.
            </p>
          ),
        },
        {
          heading: 'Intellectual property and feedback',
          body: (
            <p>
              Repair Bee and our licensors own the platform itself — its design, code, and branding — separate from
              any content you submit. If you send us feedback or suggestions about the service, you give us
              permission to use them for any purpose without owing you anything, since we&apos;d like the freedom
              to actually act on good ideas.
            </p>
          ),
        },
        {
          heading: 'General',
          body: (
            <p>
              If any part of these Terms is found unenforceable, the rest still applies. Our failure to enforce a
              provision isn&apos;t a waiver of our right to enforce it later. You may not assign your account or
              these Terms to someone else without our written consent. Neither of us is liable for delays caused by
              something genuinely outside our control (like a natural disaster or a widespread outage). To the
              extent the law allows it, any claim related to Repair Bee must be brought within one year after it
              arises.
            </p>
          ),
        },
        {
          heading: 'Governing law',
          body: (
            <p>
              Other than the arbitration agreement above (which the Federal Arbitration Act governs), these Terms
              are governed by the laws of {GOVERNING_STATE}, without regard to conflict-of-law principles, and any
              dispute not subject to arbitration must be brought in the state or federal courts located in{' '}
              {GOVERNING_STATE}.
            </p>
          ),
        },
        {
          heading: 'Changes to these Terms',
          body: (
            <p>
              We may update these Terms from time to time. We&apos;ll update the &quot;Last updated&quot; date
              above; continued use of Repair Bee after changes take effect means you accept the updated Terms. If
              we make a material change, we&apos;ll try to notify you by email.
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
