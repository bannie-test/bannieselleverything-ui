<script setup lang="ts">
import { computed } from 'vue'
import type { Order, OrderStatus } from '@/api/types'
import { formatDateTime, statusLabels } from '@/utils/format'

const props = defineProps<{ order: Order }>()

/** The happy path for this order's payment method; the progress bar shows how far along it is. */
const steps = computed<OrderStatus[]>(() =>
  props.order.paymentMethod === 'BankTransfer'
    ? ['AwaitingPayment', 'Paid', 'Processing', 'Shipped', 'Delivered']
    : ['Pending', 'Processing', 'Shipped', 'Delivered'],
)
const stepLabels: Partial<Record<OrderStatus, string>> = {
  AwaitingPayment: 'Placed',
  Pending: 'Placed',
  Paid: 'Paid',
  Processing: 'Confirmed',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
}
const reached = computed(() => steps.value.indexOf(props.order.status))
const stopped = computed(() => props.order.status === 'Cancelled' || props.order.status === 'Refunded')
const events = computed(() => [...props.order.timeline].reverse())
</script>

<template>
  <div class="card p-4 sm:p-5">
    <h3 class="font-semibold">{{ $t('Delivery progress') }}</h3>

    <ol v-if="!stopped" class="mt-4 grid text-center text-xs" :style="{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }">
      <li v-for="(step, i) in steps" :key="step" class="relative flex flex-col items-center gap-1.5">
        <span v-if="i > 0" :class="i <= reached ? 'bg-primary' : 'bg-stone-200'" class="absolute top-2.5 right-1/2 h-0.5 w-full" aria-hidden="true" />
        <span
          :class="i <= reached ? 'border-primary bg-primary text-white' : 'border-stone-300 bg-surface text-stone-400'"
          class="relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2"
          aria-hidden="true"
        >
          <svg v-if="i <= reached" viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3"><path d="M7.7 13.3 4.4 10l-1.2 1.2 4.5 4.5 9.1-9.1-1.2-1.2z" /></svg>
        </span>
        <span :class="i <= reached ? 'font-medium text-stone-900' : 'text-stone-500'">{{ $t(stepLabels[step] ?? '') }}</span>
      </li>
    </ol>

    <p v-if="order.trackingNumber || order.shippingCarrier" class="mt-4 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
      {{ $t('Shipped with') }} <span class="font-medium">{{ order.shippingCarrier ?? $t('courier') }}</span>
      <template v-if="order.trackingNumber">
        · {{ $t('Tracking no.') }} <span class="font-mono font-medium select-all">{{ order.trackingNumber }}</span>
      </template>
    </p>

    <ul class="mt-4 space-y-3 border-l border-stone-200 pl-4 text-sm">
      <li v-for="(e, i) in events" :key="i" class="relative">
        <span :class="i === 0 ? 'bg-primary' : 'bg-stone-300'" class="absolute top-1.5 -left-[1.3rem] h-2 w-2 rounded-full" aria-hidden="true" />
        <p :class="{ 'font-medium': i === 0 }">{{ e.note ?? $t(statusLabels[e.status]) }}</p>
        <p class="text-xs text-stone-500">{{ formatDateTime(e.occurredAt) }}</p>
      </li>
      <li v-if="!events.length" class="relative">
        <span class="absolute top-1.5 -left-[1.3rem] h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
        <p class="font-medium">{{ $t('Order placed') }}</p>
        <p class="text-xs text-stone-500">{{ formatDateTime(order.placedAt) }}</p>
      </li>
    </ul>
  </div>
</template>
