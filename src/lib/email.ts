import { Resend } from 'resend';

import { formatCents } from '@/lib/utils';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend's default sandbox sender (no domain verification needed) only
// delivers to the account owner's own address — fine for building/testing
// this, but real pros won't receive anything until a verified domain
// replaces this. See README.
const FROM = process.env.RESEND_FROM_EMAIL || 'Repair Bee <onboarding@resend.dev>';

function origin() {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

function layout(heading: string, bodyHtml: string, ctaUrl: string, ctaLabel: string, maxWidthPx = 480) {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: ${maxWidthPx}px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
  <div style="background:#09090b; padding:20px 24px;">
    <span style="color:#ffffff; font-size:20px; font-weight:700;">Repair <span style="color:#f0b429;">Bee</span></span>
  </div>
  <div style="padding:28px 24px; color:#18181b;">
    <h1 style="font-size:18px; margin:0 0 14px; font-weight:700;">${heading}</h1>
    <div style="font-size:14px; line-height:1.6; color:#3f3f46;">${bodyHtml}</div>
    <a href="${ctaUrl}" style="display:inline-block; margin-top:20px; background:#f0b429; color:#09090b; padding:11px 22px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">${ctaLabel}</a>
  </div>
  <div style="padding:16px 24px; background:#fafafa; color:#a1a1aa; font-size:12px;">Repair Bee &middot; You're receiving this because of activity on your Repair Bee account.</div>
</div>`;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: string; contentType: string }[],
) {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html, attachments });
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
  }
}

export async function sendVerificationEmail(params: { to: string; token: string; redirect?: string }) {
  const url = `${origin()}/verify-email?token=${params.token}${
    params.redirect ? `&redirect=${encodeURIComponent(params.redirect)}` : ''
  }`;
  await sendEmail(
    params.to,
    'Verify your email for Repair Bee',
    layout(
      'Confirm your email address',
      `<p style="margin:0;">Click below to verify your email and activate your Repair Bee account. This link expires in 24 hours.</p>`,
      url,
      'Verify email',
    ),
  );
}

export async function sendPasswordResetEmail(params: { to: string; token: string }) {
  const url = `${origin()}/reset-password?token=${params.token}`;
  await sendEmail(
    params.to,
    'Reset your Repair Bee password',
    layout(
      'Reset your password',
      `<p style="margin:0;">Click below to choose a new password. This link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change.</p>`,
      url,
      'Reset password',
    ),
  );
}

export async function sendNewLeadEmail(params: {
  to: string;
  businessName: string;
  requestTitle: string;
  categoryName: string;
  city: string;
  state: string;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `New ${params.categoryName} lead in ${params.city}, ${params.state}`,
    layout(
      'A new job matches your service area',
      `<p style="margin:0 0 8px;"><strong>${params.requestTitle}</strong></p>
       <p style="margin:0;">${params.categoryName} &middot; ${params.city}, ${params.state}</p>`,
      url,
      'View & send a quote',
    ),
  );
}

// One email per matching pro for a whole batch of line items created from a
// single repair-document upload (one property, several requests at once) —
// rather than sendNewLeadEmail firing separately per line item that pro
// happens to match.
export async function sendNewLeadsBatchEmail(params: {
  to: string;
  businessName: string;
  items: { title: string; categoryName: string }[];
  city: string;
  state: string;
}) {
  const url = `${origin()}/dashboard/pro`;
  const itemsHtml = params.items
    .map((item) => `<li style="margin:0 0 4px;"><strong>${item.title}</strong> &middot; ${item.categoryName}</li>`)
    .join('');
  const count = params.items.length;
  await sendEmail(
    params.to,
    `${count} new lead${count === 1 ? '' : 's'} in ${params.city}, ${params.state}`,
    layout(
      `${count} new job${count === 1 ? ' matches' : 's match'} your service area`,
      `<p style="margin:0 0 8px;">From one property in ${params.city}, ${params.state}:</p>
       <ul style="margin:0; padding-left:20px;">${itemsHtml}</ul>`,
      url,
      'View & send quotes',
    ),
  );
}

export async function sendRequestsBatchSubmittedEmail(params: {
  to: string;
  items: { title: string }[];
  propertyAddress: string;
}) {
  const url = `${origin()}/dashboard/customer`;
  const itemsHtml = params.items.map((item) => `<li style="margin:0 0 4px;">${item.title}</li>`).join('');
  const count = params.items.length;
  await sendEmail(
    params.to,
    `${count} request${count === 1 ? '' : 's'} submitted — ${params.propertyAddress}`,
    layout(
      'Your requests are live',
      `<p style="margin:0 0 8px;">We've posted the following to matching pros for <strong>${params.propertyAddress}</strong>:</p>
       <ul style="margin:0; padding-left:20px;">${itemsHtml}</ul>
       <p style="margin:8px 0 0;">You'll get an email as soon as quotes start coming in.</p>`,
      url,
      'View your requests',
    ),
  );
}

export async function sendNewMessageEmail(params: {
  to: string;
  requestTitle: string;
  senderName: string;
  messageBody: string;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  const preview = params.messageBody.length > 200 ? `${params.messageBody.slice(0, 200)}…` : params.messageBody;
  await sendEmail(
    params.to,
    `New message about "${params.requestTitle}"`,
    layout(
      `${params.senderName} sent you a message`,
      `<p style="margin:0 0 8px; color:#71717a;">Re: ${params.requestTitle}</p>
       <p style="margin:0; padding:12px; background:#fafafa; border-radius:8px; white-space:pre-wrap;">${preview}</p>`,
      url,
      'Reply',
    ),
  );
}

export async function sendQuoteSubmittedEmail(params: {
  to: string;
  requestTitle: string;
  propertyAddress: string;
  businessName: string;
  priceCents: number;
  isEstimate: boolean;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  const amountLabel = params.isEstimate ? `Estimate: ${formatCents(params.priceCents)}` : formatCents(params.priceCents);
  await sendEmail(
    params.to,
    `A pro quoted your job — "${params.requestTitle}"`,
    layout(
      'A pro has quoted your job',
      `<p style="margin:0 0 8px;"><strong>${params.businessName}</strong> quoted <strong>${params.requestTitle}</strong> at ${params.propertyAddress}.</p>
       <p style="margin:0;">${amountLabel}</p>`,
      url,
      'Click here to view',
    ),
  );
}

// Sent to the PRO right after their own quote goes live — not a Stripe
// receipt copy, but written to read like one: a pay-per-quote pro was just
// charged the flat quote fee and this confirms it for their records, while
// a subscriber (who owes nothing per quote) gets the same thank-you without
// any charge language.
export async function sendQuoteConfirmationEmail(params: {
  to: string;
  requestTitle: string;
  propertyAddress: string;
  requestId: string;
  feeChargedCents: number | null;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  const feeHtml = params.feeChargedCents
    ? `<p style="margin:0;">You were charged <strong>${formatCents(params.feeChargedCents)}</strong> for this quote — here's your receipt for your records.</p>`
    : `<p style="margin:0; color:#71717a;">No quote fee was charged — this one's covered by your subscription.</p>`;
  await sendEmail(
    params.to,
    `Receipt for your quote — "${params.requestTitle}"`,
    layout(
      'Thank you for the quote',
      `<p style="margin:0 0 8px;">Thank you for quoting <strong>${params.requestTitle}</strong> at ${params.propertyAddress}. The customer has been notified.</p>
       ${feeHtml}`,
      url,
      'View request',
    ),
  );
}

export async function sendRequestSubmittedEmail(params: { to: string; requestTitle: string; requestId: string }) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Request submitted — "${params.requestTitle}"`,
    layout(
      'Your request is live',
      `<p style="margin:0;">We've posted <strong>${params.requestTitle}</strong> to matching pros in your area. You'll get an email as soon as quotes start coming in.</p>`,
      url,
      'View request',
    ),
  );
}

export async function sendQuoteExpiringReminderEmail(params: {
  to: string;
  businessName: string;
  requestTitle: string;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Expiring soon — "${params.requestTitle}"`,
    layout(
      'This lead expires in 24 hours',
      `<p style="margin:0;">You haven't sent a quote for <strong>${params.requestTitle}</strong> yet — it closes to new quotes in about 24 hours. Send one now if you're interested.</p>`,
      url,
      'View & send a quote',
    ),
  );
}

export async function sendRequestExpiredEmail(params: { to: string; requestTitle: string; requestId: string }) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Request expired — "${params.requestTitle}"`,
    layout(
      'Your request closed without a hire',
      `<p style="margin:0 0 8px;"><strong>${params.requestTitle}</strong> didn't get booked within 72 hours, so it's closed to new quotes.</p>
       <p style="margin:0;">Still need this done? You can re-submit it in one click — no need to fill out the form again.</p>`,
      url,
      'View & re-submit',
    ),
  );
}

export interface QuoteRecapRow {
  categoryName: string;
  businessName: string;
  priceCents: number;
  isEstimate: boolean;
  avgRating: number;
  reviewCount: number;
  email: string;
  phone: string | null;
  responseTimeMs: number;
  responseTimeLabel: string;
}

export async function sendQuoteRecapEmail(params: { to: string; address: string; rows: QuoteRecapRow[]; csv: string }) {
  const url = `${origin()}/dashboard/customer`;
  const tableRows = params.rows
    .map(
      (r) => `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top;">${r.categoryName}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top;">
          <strong>${r.businessName}</strong><br/>
          <span style="color:#a1a1aa;font-size:12px;">
            ${r.avgRating > 0 ? `${r.avgRating.toFixed(1)}★ (${r.reviewCount})` : 'No ratings yet'} &middot; responded in ${r.responseTimeLabel}
          </span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top;">${formatCents(r.priceCents)}${r.isEstimate ? ' (est.)' : ''}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top;"><a href="mailto:${r.email}" style="color:#b06f12;">${r.email}</a></td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top;">${r.phone ? `<a href="tel:${r.phone}" style="color:#b06f12;">${r.phone}</a>` : '—'}</td>
      </tr>`,
    )
    .join('');

  await sendEmail(
    params.to,
    `Your quote recap — ${params.address}`,
    layout(
      'Here are the quotes you received',
      `<p style="margin:0 0 14px;">These requests at <strong>${params.address}</strong> closed without a booking, but ${params.rows.length} quote${params.rows.length === 1 ? '' : 's'} came in before they did — listed here with the highest-rated, fastest-responding pros first.</p>
       <table style="width:100%;border-collapse:collapse;font-size:13px;">
         <thead>
           <tr style="text-align:left;color:#71717a;">
             <th style="padding:6px 10px;border-bottom:2px solid #e4e4e7;">Trade</th>
             <th style="padding:6px 10px;border-bottom:2px solid #e4e4e7;">Pro</th>
             <th style="padding:6px 10px;border-bottom:2px solid #e4e4e7;">Quote</th>
             <th style="padding:6px 10px;border-bottom:2px solid #e4e4e7;">Email</th>
             <th style="padding:6px 10px;border-bottom:2px solid #e4e4e7;">Phone</th>
           </tr>
         </thead>
         <tbody>${tableRows}</tbody>
       </table>
       <p style="margin:16px 0 0;">A copy is also attached as a spreadsheet.</p>`,
      url,
      'View your dashboard',
      640,
    ),
    [{ filename: 'quote-recap.csv', content: params.csv, contentType: 'text/csv' }],
  );
}

export async function sendRevisionRequestedEmail(params: {
  to: string;
  requestTitle: string;
  customerName: string;
  message: string;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Revision requested — "${params.requestTitle}"`,
    layout(
      'The customer asked for a change to your quote',
      `<p style="margin:0 0 8px;">${params.customerName} would like a revision to your quote for <strong>${params.requestTitle}</strong>:</p>
       <p style="margin:0; padding:12px; background:#fafafa; border-radius:8px; white-space:pre-wrap;">${params.message}</p>
       <p style="margin:8px 0 0;">Update and resubmit your quote whenever you're ready — it replaces your current one.</p>`,
      url,
      'Update quote',
    ),
  );
}

export async function sendProjectUpdateEmail(params: {
  to: string;
  requestTitle: string;
  businessName: string;
  note: string;
  photoCount: number;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Progress update — "${params.requestTitle}"`,
    layout(
      'A new progress update was posted',
      `<p style="margin:0 0 8px;"><strong>${params.businessName}</strong> posted an update on <strong>${params.requestTitle}</strong>${params.photoCount > 0 ? ` with ${params.photoCount} photo${params.photoCount === 1 ? '' : 's'}` : ''}:</p>
       <p style="margin:0; padding:12px; background:#fafafa; border-radius:8px; white-space:pre-wrap;">${params.note}</p>`,
      url,
      'View update',
    ),
  );
}

export async function sendProInvitedEmail(params: {
  to: string;
  businessName: string;
  requestTitle: string;
  categoryName: string;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `You've been invited to quote — "${params.requestTitle}"`,
    layout(
      'A job was sent your way',
      `<p style="margin:0 0 8px;">Repair Bee thinks <strong>${params.businessName}</strong> would be a great fit for this ${params.categoryName} job:</p>
       <p style="margin:0;"><strong>${params.requestTitle}</strong></p>`,
      url,
      'View & send a quote',
    ),
  );
}

export async function sendAppointmentScheduledEmail(params: {
  to: string;
  requestTitle: string;
  scheduledDate: Date;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  const dateLabel = params.scheduledDate.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  await sendEmail(
    params.to,
    `Appointment scheduled — "${params.requestTitle}"`,
    layout(
      'An appointment date was set',
      `<p style="margin:0;">The appointment for <strong>${params.requestTitle}</strong> is set for <strong>${dateLabel}</strong>.</p>`,
      url,
      'View details',
    ),
  );
}

export async function sendAppointmentReminderEmail(params: {
  to: string;
  requestTitle: string;
  scheduledDate: Date;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  const dateLabel = params.scheduledDate.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  await sendEmail(
    params.to,
    `Reminder: upcoming appointment — "${params.requestTitle}"`,
    layout(
      'Upcoming appointment reminder',
      `<p style="margin:0;">Just a reminder — the appointment for <strong>${params.requestTitle}</strong> is coming up on <strong>${dateLabel}</strong>.</p>`,
      url,
      'View details',
    ),
  );
}

export async function sendChangeOrderSubmittedEmail(params: { to: string; requestTitle: string; requestId: string }) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Change order submitted — "${params.requestTitle}"`,
    layout(
      'Your change order is in',
      `<p style="margin:0;">We've sent your change order for <strong>${params.requestTitle}</strong> to the customer for approval.</p>`,
      url,
      'View request',
    ),
  );
}

export async function sendChangeOrderApprovalRequestedEmail(params: {
  to: string;
  requestTitle: string;
  businessName: string;
  description: string;
  additionalPriceCents: number;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Change order needs your approval — "${params.requestTitle}"`,
    layout(
      'Additional work proposed',
      `<p style="margin:0 0 8px;"><strong>${params.businessName}</strong> proposed additional work on <strong>${params.requestTitle}</strong> for ${formatCents(params.additionalPriceCents)}:</p>
       <p style="margin:0; padding:12px; background:#fafafa; border-radius:8px; white-space:pre-wrap;">${params.description}</p>`,
      url,
      'Review change order',
    ),
  );
}

export async function sendChangeOrderApprovedEmail(params: {
  to: string;
  requestTitle: string;
  additionalPriceCents: number;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Change order approved — "${params.requestTitle}"`,
    layout(
      'The customer approved your change order',
      `<p style="margin:0;">Your change order for <strong>${params.requestTitle}</strong> (${formatCents(params.additionalPriceCents)}) was approved.</p>`,
      url,
      'View request',
    ),
  );
}

export async function sendChangeOrderDeclinedEmail(params: { to: string; requestTitle: string; requestId: string }) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Change order declined — "${params.requestTitle}"`,
    layout(
      'The customer declined your change order',
      `<p style="margin:0;">Your change order for <strong>${params.requestTitle}</strong> was declined.</p>`,
      url,
      'View request',
    ),
  );
}

export async function sendQuoteNotSelectedEmail(params: { to: string; requestTitle: string; requestId: string }) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Quote not selected — "${params.requestTitle}"`,
    layout(
      'The customer went with another quote',
      `<p style="margin:0;">The customer chose a different pro for <strong>${params.requestTitle}</strong>. No action needed — keep an eye out for new leads in your area.</p>`,
      url,
      'View request',
    ),
  );
}

export async function sendQuoteRevisedEmail(params: {
  to: string;
  requestTitle: string;
  businessName: string;
  priceCents: number;
  isEstimate: boolean;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  const amountLabel = params.isEstimate ? `Estimate: ${formatCents(params.priceCents)}` : formatCents(params.priceCents);
  await sendEmail(
    params.to,
    `Quote revised — "${params.requestTitle}"`,
    layout(
      'A quote was updated',
      `<p style="margin:0 0 8px;"><strong>${params.businessName}</strong> revised their quote for <strong>${params.requestTitle}</strong>.</p>
       <p style="margin:0;">New amount: ${amountLabel}</p>`,
      url,
      'View quote',
    ),
  );
}

export async function sendQuoteAcceptedEmail(params: {
  to: string;
  businessName: string;
  requestTitle: string;
  customerName: string;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Your quote was accepted — "${params.requestTitle}"`,
    layout(
      'You got the job!',
      `<p style="margin:0;">${params.customerName} accepted your quote for <strong>${params.requestTitle}</strong>. Coordinate scheduling and payment directly with them.</p>`,
      url,
      'View job details',
    ),
  );
}

export async function sendSubscriptionPastDueEmail(params: { to: string; businessName: string }) {
  const url = `${origin()}/dashboard/pro`;
  await sendEmail(
    params.to,
    'Your Repair Bee subscription payment failed',
    layout(
      'Update your billing to keep seeing leads',
      `<p style="margin:0;">We couldn't process your latest subscription payment. Your account will lose access to job leads until this is resolved.</p>`,
      url,
      'Update billing',
    ),
  );
}

export async function sendProWelcomeEmail(params: {
  to: string;
  businessName: string;
  quotePriceDollars: number;
  subscriptionPriceDollars: number;
}) {
  const url = `${origin()}/dashboard/pro`;
  await sendEmail(
    params.to,
    'Welcome to Repair Bee — here’s how it works',
    layout(
      'Welcome to Repair Bee!',
      `<p style="margin:0 0 14px;">Thanks for joining, ${params.businessName}. Here's what to expect.</p>

       <p style="margin:0 0 2px; font-weight:600; color:#18181b;">What happens next</p>
       <p style="margin:0 0 14px;">Our team reviews every new pro profile before it goes live — this usually takes a day or two. You'll get a separate email the moment you're verified.</p>

       <p style="margin:0 0 2px; font-weight:600; color:#18181b;">How leads work</p>
       <p style="margin:0 0 14px;">Once verified, you'll see every job that matches your service categories and area — free to view, no obligation. Leads aren't assigned to one pro; everyone who matches gets to look and decide whether to send a quote.</p>

       <p style="margin:0 0 2px; font-weight:600; color:#18181b;">Be quick to quote</p>
       <p style="margin:0 0 14px;">Speed matters. Customers often go with whoever responds first and quotes clearly — the faster you review a lead and send a quote, the better your odds of winning the job.</p>

       <p style="margin:0 0 2px; font-weight:600; color:#18181b;">Pay-per-quote vs. subscription</p>
       <p style="margin:0 0 6px;">You choose how you pay for sending quotes, and can switch anytime from your dashboard:</p>
       <ul style="margin:0 0 14px; padding-left:18px;">
         <li style="margin:0 0 4px;"><strong>Pay-per-quote ($${params.quotePriceDollars}/quote)</strong> — the default. No monthly cost, you only pay when you actually send a quote. Good for testing the waters.</li>
         <li><strong>Subscription ($${params.subscriptionPriceDollars}/month)</strong> — unlimited quotes, no per-quote fee. Pays for itself once you're quoting regularly.</li>
       </ul>

       <p style="margin:0 0 2px; font-weight:600; color:#18181b;">Get the most out of your profile</p>
       <p style="margin:0 0 14px;">Select every category you're legally qualified to perform, not just your main trade — more categories means more matching leads. Adding your license/insurance info and portfolio photos helps too; fuller profiles stand out to customers.</p>

       <p style="margin:0 0 2px; font-weight:600; color:#18181b;">Stay active</p>
       <p style="margin:0;">Account and quoting activity is monitored — if engagement stays low for a prolonged period, it could lead to account suspension or removal, to help keep Repair Bee a high-quality platform for everyone.</p>`,
      url,
      'Go to your dashboard',
    ),
  );
}

export async function sendProVerifiedEmail(params: { to: string; businessName: string }) {
  const url = `${origin()}/dashboard/pro`;
  await sendEmail(
    params.to,
    "You're verified on Repair Bee",
    layout(
      "You're verified!",
      `<p style="margin:0;">Your pro profile has been reviewed and verified. You can now subscribe to start seeing and quoting job leads in your area.</p>`,
      url,
      'Go to your dashboard',
    ),
  );
}

export async function sendWaitlistJoinedEmail(params: { to: string; categoryName: string; city: string; state: string }) {
  const url = `${origin()}/dashboard/pro`;
  await sendEmail(
    params.to,
    `You're on the waitlist for ${params.categoryName} in ${params.city}`,
    layout(
      "You're on the waitlist",
      `<p style="margin:0;">${params.categoryName} in ${params.city}, ${params.state} is at capacity right now. We'll email you the moment a spot opens up — no action needed until then.</p>`,
      url,
      'View your dashboard',
    ),
  );
}

export async function sendWaitlistSpotOfferedEmail(params: {
  to: string;
  businessName: string;
  categoryName: string;
  city: string;
  state: string;
  expiresAt: Date;
}) {
  const url = `${origin()}/dashboard/pro`;
  await sendEmail(
    params.to,
    `A ${params.categoryName} spot opened up in ${params.city} — claim it`,
    layout(
      'A spot opened up for you',
      `<p style="margin:0 0 8px;">Good news, ${params.businessName} — a ${params.categoryName} spot in ${params.city}, ${params.state} is open, and you're next on the waitlist.</p>
       <p style="margin:0 0 8px; padding:12px; background:#fafafa; border-radius:8px;">Claim it by <strong>${params.expiresAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</strong> or it goes to the next pro in line.</p>`,
      url,
      'Claim your spot',
    ),
  );
}

export async function sendProNotBiddingAlertEmail(params: { to: string; businessName: string; reason: string }) {
  const url = `${origin()}/admin/pros`;
  await sendEmail(
    params.to,
    `Pro not bidding: ${params.businessName}`,
    layout(
      'A verified pro has gone quiet',
      `<p style="margin:0 0 8px;"><strong>${params.businessName}</strong> ${params.reason}</p>
       <p style="margin:0;">Worth a check-in — they may be overwhelmed, have availability issues, or need a nudge.</p>`,
      url,
      'Review pros',
    ),
  );
}

export async function sendProLowRatingAlertEmail(params: {
  to: string;
  businessName: string;
  badReviewCount: number;
  reviewCount: number;
}) {
  const url = `${origin()}/admin/pros`;
  const percent = Math.round((params.badReviewCount / params.reviewCount) * 100);
  await sendEmail(
    params.to,
    `Quality concern: ${params.businessName}`,
    layout(
      'A verified pro is getting a lot of bad reviews',
      `<p style="margin:0 0 8px;"><strong>${params.businessName}</strong> has ${params.badReviewCount} of ${params.reviewCount} reviews (${percent}%) at 2 stars or below.</p>
       <p style="margin:0;">Worth a look at what's going wrong before more customers have a bad experience.</p>`,
      url,
      'Review pros',
    ),
  );
}

export async function sendProHighDeclineRateAlertEmail(params: {
  to: string;
  businessName: string;
  declinedCount: number;
  sampleSize: number;
}) {
  const url = `${origin()}/admin/pros`;
  const percent = Math.round((params.declinedCount / params.sampleSize) * 100);
  await sendEmail(
    params.to,
    `Quality concern: ${params.businessName}`,
    layout(
      'A verified pro is turning down most of their leads',
      `<p style="margin:0 0 8px;"><strong>${params.businessName}</strong> has declined ${params.declinedCount} of their last ${params.sampleSize} matching leads (${percent}%) instead of quoting.</p>
       <p style="margin:0;">Worth checking whether they're overcommitted, no longer taking this kind of work, or holding a spot another pro could use.</p>`,
      url,
      'Review pros',
    ),
  );
}

export async function sendAdminErrorAlertEmail(params: { to: string; source: string; message: string }) {
  const url = `${origin()}/admin/errors`;
  await sendEmail(
    params.to,
    `[Repair Bee] Error in ${params.source}`,
    layout(
      'Something threw an error',
      `<p style="margin:0 0 8px;"><strong>${params.source}</strong></p>
       <p style="margin:0; font-family: monospace; font-size:13px; color:#52525b;">${params.message}</p>`,
      url,
      'View error log',
    ),
  );
}

export async function sendNewProPendingEmail(params: { to: string; businessName: string }) {
  const url = `${origin()}/admin/pros`;
  await sendEmail(
    params.to,
    `New pro awaiting verification: ${params.businessName}`,
    layout(
      'A new pro profile needs review',
      `<p style="margin:0;"><strong>${params.businessName}</strong> just created a pro profile and is waiting on verification before they can subscribe.</p>`,
      url,
      'Review pros',
    ),
  );
}

export async function sendBookingCancelledEmail(params: {
  to: string;
  requestTitle: string;
  cancelledByLabel: string;
  reason: string | null;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  await sendEmail(
    params.to,
    `Booking cancelled — "${params.requestTitle}"`,
    layout(
      'A booking was cancelled',
      `<p style="margin:0 0 8px;">${params.cancelledByLabel} cancelled the booking for <strong>${params.requestTitle}</strong>.</p>
       ${params.reason ? `<p style="margin:0; padding:12px; background:#fafafa; border-radius:8px;">"${params.reason}"</p>` : ''}`,
      url,
      'View details',
    ),
  );
}
