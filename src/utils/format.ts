import type { OrderStatus, PaymentMethod, TicketStatus } from '@/api/types'

const moneyFormatters = new Map<string, Intl.NumberFormat>()

/** 190000, "VND" → "190.000 ₫". Amounts are minor units; VND has no minor unit. */
export function money(amountMinor: number, currency = 'VND'): string {
  let formatter = moneyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { style: 'currency', currency })
    moneyFormatters.set(currency, formatter)
  }
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 0
  return formatter.format(amountMinor / 10 ** digits)
}

/** Decimal places of the currency's minor unit: 0 for VND, 2 for USD. */
export function minorDigits(currency = 'VND'): number {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 0
}

const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

export const statusLabels: Record<OrderStatus, string> = {
  Pending: 'Awaiting confirmation',
  AwaitingPayment: 'Awaiting payment',
  Paid: 'Paid',
  Processing: 'Processing',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
  Refunded: 'Refunded',
}

/** Verb for the button that moves an order into this status. */
export const statusActions: Partial<Record<OrderStatus, string>> = {
  Paid: 'Confirm payment received',
  Processing: 'Confirm & start processing',
  Shipped: 'Mark as shipped',
  Delivered: 'Mark as delivered',
  Cancelled: 'Cancel order',
}

export function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null
  return Math.round((1 - price / compareAt) * 100)
}

const dateOnly = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })

/** "2026-09-28" or an ISO timestamp → "28 Sept 2026". */
export function formatDate(value: string): string {
  return dateOnly.format(new Date(value.length === 10 ? `${value}T00:00:00` : value))
}

/** ISO timestamp → value for an <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value → ISO timestamp, or null when empty. */
export function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

/** Today in the browser's time zone as "YYYY-MM-DD". */
export function isoDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "10% off", "50.000 ₫ off" or "Free shipping". */
export function offLabel(type: 'Percentage' | 'FixedAmount' | 'FreeShipping', value: number, currency = 'VND'): string {
  if (type === 'Percentage') return `${value}% off`
  if (type === 'FixedAmount') return `${money(value, currency)} off`
  return 'Free shipping'
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CashOnDelivery: 'Cash on delivery',
  BankTransfer: 'Bank transfer',
}

export const ticketStatusLabels: Record<TicketStatus, string> = {
  Open: 'Waiting for the shop',
  Answered: 'Shop replied',
  Closed: 'Closed',
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "5 minutes ago", "yesterday"; falls back to a date after a week. */
export function timeAgo(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(seconds)
  if (abs < 60) return 'just now'
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  if (abs < 604800) return relative.format(Math.round(seconds / 86400), 'day')
  return dateOnly.format(new Date(iso))
}
