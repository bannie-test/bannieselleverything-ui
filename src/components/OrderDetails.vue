<script setup lang="ts">
import type { BankTransferInfo, Order } from '@/api/types'
import { formatDateTime, money, paymentMethodLabels } from '@/utils/format'
import OrderTimeline from './OrderTimeline.vue'
import StatusBadge from './StatusBadge.vue'

/** Pass the shop's bank details to show transfer instructions while the order awaits payment. */
defineProps<{ order: Order; bankTransfer?: BankTransferInfo | null }>()
</script>

<template>
  <div class="space-y-4">
    <div class="card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div>
        <p class="text-sm text-stone-500">Order</p>
        <p class="font-mono text-lg font-semibold">{{ order.orderNumber }}</p>
      </div>
      <div class="text-right">
        <StatusBadge :status="order.status" />
        <p class="mt-1 text-xs text-stone-500">Placed {{ formatDateTime(order.placedAt) }}</p>
      </div>
    </div>

    <div v-if="order.status === 'AwaitingPayment' && bankTransfer" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:p-5">
      <h3 class="font-semibold">Complete your bank transfer</h3>
      <p class="mt-1">We'll start preparing your order as soon as the payment arrives.</p>
      <dl class="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
        <dt class="text-amber-800">Bank</dt>
        <dd class="font-medium">{{ bankTransfer.bankName }}</dd>
        <dt class="text-amber-800">Account number</dt>
        <dd class="font-mono font-medium select-all">{{ bankTransfer.accountNumber }}</dd>
        <dt class="text-amber-800">Account name</dt>
        <dd class="font-medium">{{ bankTransfer.accountName }}</dd>
        <dt class="text-amber-800">Amount</dt>
        <dd class="font-medium">{{ money(order.totalMinor, order.currency) }}</dd>
        <dt class="text-amber-800">Transfer note</dt>
        <dd class="font-mono font-medium select-all">{{ order.orderNumber }}</dd>
      </dl>
    </div>

    <OrderTimeline :order="order" />

    <div class="card divide-y divide-stone-100">
      <div v-for="item in order.items" :key="item.productId" class="flex items-start justify-between gap-4 p-4">
        <div>
          <p class="font-medium">{{ item.productName }}</p>
          <p class="text-sm text-stone-500">{{ item.quantity }} × {{ money(item.unitPriceMinor, order.currency) }}</p>
        </div>
        <p class="font-medium whitespace-nowrap">{{ money(item.lineTotalMinor, order.currency) }}</p>
      </div>
      <dl class="space-y-1 p-4 text-sm">
        <div class="flex justify-between">
          <dt class="text-stone-600">Subtotal</dt>
          <dd>{{ money(order.subtotalMinor, order.currency) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-stone-600">Shipping</dt>
          <dd>{{ order.shippingMinor ? money(order.shippingMinor, order.currency) : 'Free' }}</dd>
        </div>
        <div class="flex justify-between pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd>{{ money(order.totalMinor, order.currency) }}</dd>
        </div>
      </dl>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="card p-4 text-sm">
        <h3 class="mb-2 font-semibold">Shipping to</h3>
        <p>{{ order.shippingAddress.recipientName }} · {{ order.shippingAddress.phone }}</p>
        <p class="text-stone-600">
          {{ order.shippingAddress.streetAddress }}, {{ order.shippingAddress.ward }}, {{ order.shippingAddress.district }},
          {{ order.shippingAddress.province }}
        </p>
      </div>
      <div class="card p-4 text-sm">
        <h3 class="mb-2 font-semibold">Payment & contact</h3>
        <p>
          {{ paymentMethodLabels[order.paymentMethod] }}
          <span v-if="order.paidAt" class="text-emerald-700"> · Paid {{ formatDateTime(order.paidAt) }}</span>
        </p>
        <p class="text-stone-600">{{ order.customerEmail }}</p>
        <p v-if="order.notes" class="mt-2 text-stone-600"><span class="font-medium text-stone-800">Note:</span> {{ order.notes }}</p>
      </div>
    </div>
  </div>
</template>
