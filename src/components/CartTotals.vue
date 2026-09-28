<script setup lang="ts">
import type { Cart } from '@/api/types'
import { money } from '@/utils/format'

/** Subtotal → discounts → shipping → total, as priced by the API. */
defineProps<{ cart: Cart }>()
</script>

<template>
  <dl class="space-y-2 text-sm">
    <div class="flex justify-between">
      <dt class="text-stone-600">{{ cart.itemCount === 1 ? $t('Subtotal (1 item)') : $t('Subtotal ({n} items)', { n: cart.itemCount }) }}</dt>
      <dd>{{ money(cart.subtotalMinor, cart.currency) }}</dd>
    </div>
    <div v-if="cart.productDiscountMinor" class="flex justify-between text-red-600">
      <dt>{{ $t('Sale discounts') }}</dt>
      <dd>−{{ money(cart.productDiscountMinor, cart.currency) }}</dd>
    </div>
    <div v-if="cart.membershipDiscountMinor" class="flex justify-between text-red-600">
      <dt class="flex items-center gap-1.5">
        <span class="h-2 w-2 rounded-full" :style="{ background: cart.membership?.color }" aria-hidden="true" />
        {{ $t('{tier} member ({percent}%)', { tier: cart.membership?.name ?? '', percent: cart.membership?.discountPercent ?? 0 }) }}
      </dt>
      <dd>−{{ money(cart.membershipDiscountMinor, cart.currency) }}</dd>
    </div>
    <div v-if="cart.voucher?.applied && cart.voucherDiscountMinor" class="flex justify-between text-red-600">
      <dt>{{ $t('Voucher') }} <span class="font-mono">{{ cart.voucher.code }}</span></dt>
      <dd>−{{ money(cart.voucherDiscountMinor, cart.currency) }}</dd>
    </div>
    <div class="flex justify-between">
      <dt class="text-stone-600">{{ $t('Shipping') }}</dt>
      <dd>{{ cart.shippingMinor ? money(cart.shippingMinor, cart.currency) : $t('Free') }}</dd>
    </div>
    <div class="flex justify-between border-t border-stone-100 pt-3 text-base font-semibold">
      <dt>{{ $t('Total') }}</dt>
      <dd>{{ money(cart.totalMinor, cart.currency) }}</dd>
    </div>
    <p v-if="cart.productDiscountMinor + cart.membershipDiscountMinor + cart.voucherDiscountMinor > 0" class="text-right text-xs font-medium text-emerald-700">
      {{ $t('You save {amount}', { amount: money(cart.productDiscountMinor + cart.membershipDiscountMinor + cart.voucherDiscountMinor, cart.currency) }) }}
    </p>
  </dl>
</template>
