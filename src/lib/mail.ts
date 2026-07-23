import 'server-only'

import nodemailer from 'nodemailer'
import site from '@/content/site.json'

/**
 * Outgoing email.
 *
 * Gmail over SMTP with an app password — chosen because it works today without
 * owning a domain. Everything that sends mail goes through this file, so moving
 * to Resend or SES later is a single-file change, the same isolation that made
 * swapping the order endpoint a one-line edit.
 *
 * Requires 2-factor authentication on the Google account; app passwords cannot
 * be generated without it.
 */

const FROM_NAME = "Sannidhi's Bakery"

export function isMailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

function transport() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD are not set.')
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

export type SendResult = { ok: true } | { ok: false; message: string }

export type Attachment = { filename: string; content: Buffer; contentType: string }

export async function sendMail({
  to,
  subject,
  text,
  replyTo,
  attachments,
}: {
  to: string
  subject: string
  text: string
  replyTo?: string
  attachments?: Attachment[]
}): Promise<SendResult> {
  if (!isMailConfigured()) {
    return { ok: false, message: 'Email is not configured yet.' }
  }

  try {
    await transport().sendMail({
      from: `"${FROM_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      replyTo: replyTo ?? process.env.GMAIL_USER,
      attachments,
    })
    return { ok: true }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error.'
    console.error('[mail] send failed:', detail)
    return { ok: false, message: detail }
  }
}

/**
 * Fetch an uploaded image (design PNG or inspiration photo) so it can ride along
 * as an email attachment. Best-effort: a fetch failure returns null and the
 * email still sends, just with the URL in the body instead.
 */
export async function fetchAttachment(
  url: string,
  filename: string
): Promise<Attachment | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') ?? 'image/png'
    const content = Buffer.from(await response.arrayBuffer())
    return { filename, content, contentType }
  } catch {
    return null
  }
}

/**
 * The notification to the owner, sent on every submission. Repeats the whole
 * enquiry in plain text and carries the cake design / photo as attachments —
 * this is the "email me every time" requirement, met by our own Gmail rather
 * than Formspree, which cannot attach anything.
 */
export function ownerNotification(enquiry: Record<string, string | undefined>): {
  subject: string
  text: string
  replyTo: string | undefined
} {
  const rows: [string, string | undefined][] = [
    ['Name', enquiry.Name],
    ['Email', enquiry.Email],
    ['Phone', enquiry.Phone],
    ['Event date', enquiry['Event date']],
    ['Occasion', enquiry.Occasion],
    ['Type', enquiry.Category],
    ['How many', enquiry.Servings],
    ['What they would like', enquiry['What you would like']],
    ['Cake design', enquiry['Cake design']],
    ['Allergies / dietary', enquiry.Dietary],
    ['Budget', enquiry.Budget],
    ['Anything else', enquiry.Notes],
    ['Started from', enquiry['Started from']],
  ]

  const body = rows
    .filter(([, v]) => v && v.trim())
    .map(([label, v]) => `${label}: ${v}`)
    .join('\n')

  const attached: string[] = []
  if (enquiry.cakeDesignImageUrl) attached.push('their cake design')
  if (enquiry.inspirationPhotoUrl) attached.push('an inspiration photo')
  const note = attached.length
    ? `\n\n${attached.join(' and ')} ${attached.length === 1 ? 'is' : 'are'} attached.`
    : ''

  return {
    subject: `New enquiry — ${enquiry.Name ?? 'someone'}${enquiry['Event date'] ? `, ${enquiry['Event date']}` : ''}`,
    text: `A new order enquiry came in.\n\n${body}${note}\n\nReply straight to this email to reach them.`,
    // So the owner can hit reply and reach the customer directly.
    replyTo: enquiry.Email,
  }
}

/**
 * Plain text, not HTML.
 *
 * A one-person bakery replying by hand looks more credible in plain text than in
 * a templated HTML email, it cannot render badly in any client, and it is far
 * less likely to be filed as promotional.
 */
export function confirmationEmail(enquiry: Record<string, string | undefined>) {
  const firstName = (enquiry.Name ?? '').split(' ')[0] || 'there'
  const lead = site.leadTime.summary

  const details = [
    ['Date', enquiry['Event date']],
    ['Occasion', enquiry.Occasion],
    ['Type', enquiry.Category],
    ['How many people', enquiry.Servings],
    ['What you asked for', enquiry['What you would like']],
    ['Allergies or dietary', enquiry.Dietary],
    ['Budget', enquiry.Budget],
    ['Anything else', enquiry.Notes],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')

  return {
    subject: `We've got your enquiry — ${FROM_NAME}`,
    text: `Hi ${firstName},

Thanks for getting in touch. This is just to confirm your enquiry reached us —
it is not a booking yet.

Here is what you sent, so you have a copy:

${details}

What happens next: we read every enquiry ourselves, so it will be a person
replying and not an automatic message. We will come back to you with what we can
make and what it would cost. Nothing is confirmed until we have both agreed the
design and the date${lead ? `, and we usually need ${lead}` : ''}.

If your event is soon, message us on Instagram (@${site.contact.instagram}) as
well so it is not sitting in an inbox.

Thanks,
${FROM_NAME}
`,
  }
}

/** Starting text for a quote. The owner edits it before it goes anywhere. */
export function quoteTemplate(
  enquiry: Record<string, string | undefined>,
  amount: string
) {
  const firstName = (enquiry.Name ?? '').split(' ')[0] || 'there'
  return {
    subject: `Your cake quote — ${FROM_NAME}`,
    body: `Hi ${firstName},

Thanks for your patience. For ${enquiry.Occasion ? `your ${enquiry.Occasion.toLowerCase()} ` : ''}on ${enquiry['Event date']}, we can make what you described for ${amount}.

That covers the design as you described it. If you would like to change the size
or the decoration, tell me and I will re-quote — no obligation either way.

To go ahead, reply to this email and I will send you the deposit details. The
date is not held until the deposit is in.

Thanks,
${FROM_NAME}
`,
  }
}
