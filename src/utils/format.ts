import type { OrderStatus } from '@/api/types'

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
  Processing: 'Confirm & start processing',
  Shipped: 'Mark as shipped',
  Delivered: 'Mark as delivered',
  Cancelled: 'Cancel order',
}

export function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null
  return Math.round((1 - price / compareAt) * 100)
}
