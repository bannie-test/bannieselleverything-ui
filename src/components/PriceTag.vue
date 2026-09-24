<script setup lang="ts">
import { computed } from 'vue'
import { discountPercent, money } from '@/utils/format'

const props = withDefaults(defineProps<{ price: number; compareAt?: number | null; currency?: string; large?: boolean }>(), {
  compareAt: null,
  currency: 'VND',
  large: false,
})

const discount = computed(() => discountPercent(props.price, props.compareAt))
</script>

<template>
  <div class="flex flex-wrap items-baseline gap-x-2">
    <span :class="[large ? 'text-2xl' : 'text-base', discount ? 'text-red-600' : 'text-stone-900']" class="font-semibold">
      {{ money(price, currency) }}
    </span>
    <template v-if="discount">
      <s :class="large ? 'text-base' : 'text-xs'" class="text-stone-400">{{ money(compareAt!, currency) }}</s>
      <span class="rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600">−{{ discount }}%</span>
    </template>
  </div>
</template>
