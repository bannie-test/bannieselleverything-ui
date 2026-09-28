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
        <p class="text-sm text-stone-500">{{ $t('Order') }}</p>
        <p class="font-mono text-lg font-semibold">{{ order.orderNumber }}</p>
      </div>
      <div class="text-right">
        <StatusBadge :status="order.status" />
        <p class="mt-1 text-xs text-stone-500">{{ $t('Placed {date}', { date: formatDateTime(order.placedAt) }) }}</p>
      </div>
    </div>

    <div v-if="order.status === 'AwaitingPayment' && bankTransfer" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:p-5">
      <h3 class="font-semibold">{{ $t('Complete your bank transfer') }}</h3>
      <p class="mt-1">{{ $t("We'll start preparing your order as soon as the payment arrives.") }}</p>
      <dl class="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
        <dt class="text-amber-800">{{ $t('Bank') }}</dt>
        <dd class="font-medium">{{ bankTransfer.bankName }}</dd>
        <dt class="text-amber-800">{{ $t('Account number') }}</dt>
        <dd class="font-mono font-medium select-all">{{ bankTransfer.accountNumber }}</dd>
        <dt class="text-amber-800">{{ $t('Account name') }}</dt>
        <dd class="font-medium">{{ bankTransfer.accountName }}</dd>
        <dt class="text-amber-800">{{ $t('Amount') }}</dt>
        <dd class="font-medium">{{ money(order.totalMinor, order.currency) }}</dd>
        <dt class="text-amber-800">{{ $t('Transfer note') }}</dt>
        <dd class="font-mono font-medium select-all">{{ order.orderNumber }}</dd>
      </dl>
    </div>

    <OrderTimeline :order="order" />

    <div class="card divide-y divide-stone-100">
      <div v-for="item in order.items" :key="item.productId" class="flex items-start justify-between gap-4 p-4">
        <div>
          <p class="font-medium">{{ item.productName }}</p>
          <p class="text-sm text-stone-500">{{ item.quantity }} × {{ money(item.unitPriceMinor, order.currency) }}</p>
          <p v-if="item.discountMinor" class="text-xs text-red-600">{{ $t('Sale') }} −{{ money(item.discountMinor, order.currency) }}</p>
        </div>
        <div class="text-right whitespace-nowrap">
          <p class="font-medium">{{ money(item.lineTotalMinor - item.discountMinor, order.currency) }}</p>
          <s v-if="item.discountMinor" class="text-xs text-stone-400">{{ money(item.lineTotalMinor, order.currency) }}</s>
        </div>
      </div>
      <dl class="space-y-1 p-4 text-sm">
        <div class="flex justify-between">
          <dt class="text-stone-600">{{ $t('Subtotal') }}</dt>
          <dd>{{ money(order.subtotalMinor, order.currency) }}</dd>
        </div>
        <div v-if="order.productDiscountMinor" class="flex justify-between text-red-600">
          <dt>{{ $t('Sale discounts') }}</dt>
          <dd>−{{ money(order.productDiscountMinor, order.currency) }}</dd>
        </div>
        <div v-if="order.membershipDiscountMinor" class="flex justify-between text-red-600">
          <dt>{{ $t('{tier} member discount', { tier: order.membershipTierName ?? '' }) }}</dt>
          <dd>−{{ money(order.membershipDiscountMinor, order.currency) }}</dd>
        </div>
        <div v-if="order.voucherDiscountMinor" class="flex justify-between text-red-600">
          <dt>{{ $t('Voucher') }} <span class="font-mono">{{ order.voucherCode }}</span></dt>
          <dd>−{{ money(order.voucherDiscountMinor, order.currency) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-stone-600">{{ $t('Shipping') }}</dt>
          <dd>{{ order.shippingMinor ? money(order.shippingMinor, order.currency) : $t('Free') }}</dd>
        </div>
        <div class="flex justify-between pt-2 text-base font-semibold">
          <dt>{{ $t('Total') }}</dt>
          <dd>{{ money(order.totalMinor, order.currency) }}</dd>
        </div>
      </dl>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="card p-4 text-sm">
        <h3 class="mb-2 font-semibold">{{ $t('Shipping to') }}</h3>
        <p>{{ order.shippingAddress.recipientName }} · {{ order.shippingAddress.phone }}</p>
        <p class="text-stone-600">
          {{ order.shippingAddress.streetAddress }}, {{ order.shippingAddress.ward }}, {{ order.shippingAddress.district }},
          {{ order.shippingAddress.province }}
        </p>
      </div>
      <div class="card p-4 text-sm">
        <h3 class="mb-2 font-semibold">{{ $t('Payment & contact') }}</h3>
        <p>
          {{ $t(paymentMethodLabels[order.paymentMethod]) }}
          <span v-if="order.paidAt" class="text-emerald-700"> · {{ $t('Paid {date}', { date: formatDateTime(order.paidAt) }) }}</span>
        </p>
        <p class="text-stone-600">{{ order.customerEmail }}</p>
        <p v-if="order.notes" class="mt-2 text-stone-600"><span class="font-medium text-stone-800">{{ $t('Note:') }}</span> {{ order.notes }}</p>
      </div>
    </div>
  </div>
</template>
