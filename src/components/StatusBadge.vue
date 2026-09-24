<script setup lang="ts">
import type { OrderStatus } from '@/api/types'
import { statusLabels } from '@/utils/format'

defineProps<{ status: OrderStatus }>()

const styles: Record<OrderStatus, string> = {
  Pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  AwaitingPayment: 'bg-amber-50 text-amber-800 ring-amber-200',
  Paid: 'bg-sky-50 text-sky-800 ring-sky-200',
  Processing: 'bg-sky-50 text-sky-800 ring-sky-200',
  Shipped: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  Delivered: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Cancelled: 'bg-stone-100 text-stone-600 ring-stone-200',
  Refunded: 'bg-stone-100 text-stone-600 ring-stone-200',
}
</script>

<template>
  <span :class="styles[status]" class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset">
    {{ statusLabels[status] }}
  </span>
</template>
