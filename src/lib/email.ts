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

function layout(heading: string, bodyHtml: string, ctaUrl: string, ctaLabel: string) {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
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

async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
  }
}

export async function sendVerificationEmail(params: { to: string; token: string }) {
  const url = `${origin()}/verify-email?token=${params.token}`;
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
  businessName: string;
  priceCents: number;
  isEstimate: boolean;
  requestId: string;
}) {
  const url = `${origin()}/requests/${params.requestId}`;
  const amountLabel = params.isEstimate ? `Estimate: ${formatCents(params.priceCents)}` : formatCents(params.priceCents);
  await sendEmail(
    params.to,
    `New quote submitted — "${params.requestTitle}"`,
    layout(
      'A quote has been submitted',
      `<p style="margin:0 0 8px;"><strong>${params.businessName}</strong> submitted a quote for <strong>${params.requestTitle}</strong>.</p>
       <p style="margin:0;">${amountLabel}</p>`,
      url,
      'View quote',
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
