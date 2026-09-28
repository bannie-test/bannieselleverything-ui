<script setup lang="ts">
import { computed } from 'vue'
import { discountPercent, money } from '@/utils/format'

/**
 * Shows the price a shopper pays. With a running discount (`discounted`), the regular price
 * (or the higher compare-at price) is struck through next to it.
 */
const props = withDefaults(
  defineProps<{ price: number; compareAt?: number | null; discounted?: number | null; currency?: string; large?: boolean }>(),
  { compareAt: null, discounted: null, currency: 'VND', large: false },
)

const pays = computed(() => props.discounted ?? props.price)
const was = computed(() => {
  const candidates = [props.compareAt, props.discounted !== null ? props.price : null].filter((v): v is number => v !== null && v > pays.value)
  return candidates.length ? Math.max(...candidates) : null
})
const percent = computed(() => discountPercent(pays.value, was.value))
</script>

<template>
  <div class="flex flex-wrap items-baseline gap-x-2">
    <span :class="[large ? 'text-2xl' : 'text-base', percent ? 'text-red-600' : 'text-stone-900']" class="font-semibold">
      {{ money(pays, currency) }}
    </span>
    <template v-if="percent">
      <s :class="large ? 'text-base' : 'text-xs'" class="text-stone-400">{{ money(was!, currency) }}</s>
      <span class="rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-on-accent">−{{ percent }}%</span>
    </template>
  </div>
</template>
