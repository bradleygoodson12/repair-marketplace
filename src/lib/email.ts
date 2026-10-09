import { Resend } from 'resend';

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
  <div style="padding:16px 24px; background:#fafafa; color:#a1a1aa; font-size:12px;">Repair Bee &middot; You're receiving this because you have an active pro account.</div>
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
