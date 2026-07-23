import { listEnquiries } from '@/lib/enquiries'
import { outstanding, received } from '@/lib/money'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** RFC 4180: quote everything, double any embedded quotes. */
function cell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

/** Cents to a plain decimal, so a spreadsheet reads it as a number. */
function money(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '' : (cents / 100).toFixed(2)
}

export async function GET(request: Request) {
  const year = new URL(request.url).searchParams.get('year') ?? ''

  const enquiries = (await listEnquiries(2000)).filter(
    (e) => e.status !== 'declined' && (!year || e['Event date'].startsWith(year))
  )

  const header = [
    'Event date', 'Name', 'Email', 'Phone', 'Occasion', 'Type', 'Servings',
    'Status', 'Quoted', 'Deposit', 'Deposit paid', 'Final', 'Paid in full',
    'Received', 'Outstanding', 'Enquiry received',
  ]

  const rows = enquiries
    .sort((a, b) => a['Event date'].localeCompare(b['Event date']))
    .map((e) =>
      [
        e['Event date'], e.Name, e.Email, e.Phone ?? '', e.Occasion ?? '',
        e.Category ?? '', e.Servings ?? '', e.status,
        money(e.quotedAmount), money(e.depositAmount), e.depositPaid ? 'yes' : 'no',
        money(e.finalAmount), e.paidInFull ? 'yes' : 'no',
        money(received(e)), money(outstanding(e)), e.createdAt.slice(0, 10),
      ].map(cell).join(',')
    )

  // Excel assumes the system encoding without a byte-order mark, which mangles
  // any accented name in the export.
  const csv = '﻿' + [header.map(cell).join(','), ...rows].join('\r\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sannidhis-bakery-${year || 'all'}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
