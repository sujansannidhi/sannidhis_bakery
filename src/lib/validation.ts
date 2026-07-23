import { z } from 'zod'

/**
 * The shape of an order enquiry, validated on the server.
 *
 * Until now this form posted straight to Formspree from the browser, so the only
 * checks that existed ran in the visitor's tab and could be bypassed by anyone
 * who opened dev tools. These run on our own route handler, where they cannot
 * be skipped — which is what the original brief asked for and the previous
 * setup made impossible.
 *
 * Field names match the labels the form already submits, so the emails the owner
 * receives keep reading the same way.
 */

const trimmed = (max: number) => z.string().trim().max(max)

export const enquirySchema = z.object({
  Name: trimmed(120).min(1, 'Please tell us your name.'),

  Email: trimmed(200)
    .min(1, 'We need an email address to reply to.')
    .email('That email address does not look right.'),

  Phone: trimmed(40).optional().or(z.literal('')),

  'Event date': z
    .string()
    .trim()
    .min(1, 'When is it for?')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'That date is not a real date.')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'That date is not a real date.')
    .refine((value) => {
      const target = new Date(`${value}T00:00:00`)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return target.getTime() >= today.getTime()
    }, 'That date has already passed.')
    .refine((value) => {
      // Ten years out is not a birthday, it is a bot or a typo.
      const target = new Date(`${value}T00:00:00`)
      const limit = new Date()
      limit.setFullYear(limit.getFullYear() + 10)
      return target.getTime() <= limit.getTime()
    }, 'That date is too far away.'),

  Occasion: trimmed(80).optional().or(z.literal('')),
  Servings: trimmed(40).optional().or(z.literal('')),
  Category: trimmed(60).optional().or(z.literal('')),

  'What you would like': trimmed(4000).min(
    1,
    'Tell us roughly what you are after.'
  ),

  Dietary: trimmed(500).optional().or(z.literal('')),
  Budget: trimmed(40).optional().or(z.literal('')),
  Notes: trimmed(4000).optional().or(z.literal('')),
  'Started from': trimmed(120).optional().or(z.literal('')),
})

export type Enquiry = z.infer<typeof enquirySchema>

export const ENQUIRY_STATUSES = [
  'new',
  'quoted',
  'confirmed',
  'completed',
  'declined',
] as const

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number]

export const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: 'New',
  quoted: 'Quoted',
  confirmed: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
}

export const enquiryUpdateSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES).optional(),
  adminNotes: z.string().trim().max(4000).optional(),
})

/** Turns a Zod error into the `{ field: message }` shape the form already renders. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
