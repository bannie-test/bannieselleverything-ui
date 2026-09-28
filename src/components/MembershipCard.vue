<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { http } from '@/api/client'
import type { MyMembership } from '@/api/types'
import { money } from '@/utils/format'

/** The signed-in customer's tier and progress to the next one. Hidden when the shop has no tiers. */
const data = ref<MyMembership | null>(null)

onMounted(async () => {
  try {
    data.value = (await http.get<MyMembership>('/storefront/account/membership')).data
  } catch {
    data.value = null
  }
})

const progress = computed(() => {
  const d = data.value
  if (!d?.next) return 100
  const start = d.current?.minSpentMinor ?? 0
  const span = d.next.minSpentMinor - start
  return span <= 0 ? 100 : Math.min(100, Math.max(0, ((d.spentMinor - start) / span) * 100))
})
</script>

<template>
  <section v-if="data && data.tiers.length" class="card overflow-hidden">
    <div class="h-1.5" :style="{ background: data.current?.color ?? '#e7e5e4' }" />
    <div class="p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm text-stone-500">Membership</p>
          <p class="text-xl font-semibold" :style="data.current ? { color: data.current.color } : {}">
            {{ data.current ? `${data.current.name} member` : 'Not a member yet' }}
          </p>
          <p v-if="data.current" class="text-sm text-stone-600">
            {{ data.current.discountPercent }}% off every order<template v-if="data.current.benefits"> · {{ data.current.benefits }}</template>
          </p>
        </div>
        <p class="text-right text-sm text-stone-600">
          <span class="block font-semibold text-stone-900">{{ money(data.spentMinor, data.currency) }}</span>
          spent on delivered orders
        </p>
      </div>

      <div v-if="data.next" class="mt-4">
        <div class="h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100">
          <div class="h-full rounded-full transition-all" :style="{ width: `${progress}%`, background: data.next.color }" />
        </div>
        <p class="mt-2 text-sm text-stone-600">
          Spend <span class="font-semibold text-stone-900">{{ money(data.remainingMinor, data.currency) }}</span> more to reach
          <span class="font-semibold" :style="{ color: data.next.color }">{{ data.next.name }}</span> and get {{ data.next.discountPercent }}% off.
        </p>
      </div>
      <p v-else class="mt-3 text-sm text-stone-600">You've reached our top tier. Thank you!</p>

      <details class="mt-4 text-sm">
        <summary class="cursor-pointer text-stone-600 hover:text-stone-900">All tiers</summary>
        <ul class="mt-2 divide-y divide-stone-100">
          <li v-for="t in data.tiers" :key="t.id" class="flex items-center justify-between gap-3 py-2">
            <span class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full" :style="{ background: t.color }" />
              <span class="font-medium">{{ t.name }}</span>
              <span class="text-stone-500">from {{ money(t.minSpentMinor, data.currency) }}</span>
            </span>
            <span class="text-stone-600">{{ t.discountPercent }}% off</span>
          </li>
        </ul>
      </details>
    </div>
  </section>
</template>
