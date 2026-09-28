<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import DiscountsPanel from '@/components/promotions/DiscountsPanel.vue'
import MembershipPanel from '@/components/promotions/MembershipPanel.vue'
import VouchersPanel from '@/components/promotions/VouchersPanel.vue'

const route = useRoute()
const tab = computed(() => String(route.params.tab))

const tabs = [
  { key: 'discounts', label: 'Discounts', blurb: 'Automatic sale prices on products or categories. No code needed.' },
  { key: 'vouchers', label: 'Vouchers', blurb: 'Codes customers enter in their cart.' },
  { key: 'membership', label: 'Membership', blurb: 'Loyalty tiers with a standing discount, earned by spending.' },
]
const current = computed(() => tabs.find((t) => t.key === tab.value) ?? tabs[0]!)
</script>

<template>
  <h1 class="text-2xl font-semibold">Promotions</h1>
  <div class="mt-4 inline-flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1" role="tablist">
    <RouterLink
      v-for="t in tabs"
      :key="t.key"
      role="tab"
      :aria-selected="tab === t.key"
      :to="{ name: 'admin-promotions', params: { tab: t.key } }"
      :class="tab === t.key ? 'tab-active' : ''"
      class="tab"
    >
      {{ t.label }}
    </RouterLink>
  </div>
  <p class="mt-2 text-sm text-stone-500">{{ current.blurb }}</p>

  <div class="mt-6">
    <DiscountsPanel v-if="tab === 'discounts'" />
    <VouchersPanel v-else-if="tab === 'vouchers'" />
    <MembershipPanel v-else />
  </div>

  <p class="mt-8 text-xs text-stone-500">
    How they combine: each product line gets its best automatic discount, then the member percentage applies to what's left, then the voucher.
  </p>
</template>
