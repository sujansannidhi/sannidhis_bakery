/**
 * Money helpers.
 *
 * Amounts are stored as whole cents. Storing 12.34 as a float and adding a few
 * hundred of them together produces answers like 1234.0000000002, which is fine
 * until it appears on something the owner treats as their books.
 */

export function toCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '').trim()
  if (cleaned === '') return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

export function fromCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return (cents / 100).toFixed(2)
}

export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

/**
 * What actually came in for an order.
 *
 * Only counts amounts marked paid. A quote is a hope, not income, and the whole
 * point of the accounting page is to show money received.
 */
export function received(order: {
  depositAmount?: number | null
  depositPaid?: boolean
  finalAmount?: number | null
  paidInFull?: boolean
}): number {
  let total = 0
  if (order.depositPaid && order.depositAmount) total += order.depositAmount
  if (order.paidInFull && order.finalAmount) total += order.finalAmount
  return total
}

/** Still owed on an order we have quoted. */
export function outstanding(order: {
  quotedAmount?: number | null
  depositAmount?: number | null
  depositPaid?: boolean
  finalAmount?: number | null
  paidInFull?: boolean
}): number {
  if (!order.quotedAmount) return 0
  return Math.max(0, order.quotedAmount - received(order))
}
