<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { http } from '@/api/client'
import type { OrderSummary, Paged } from '@/api/types'
import AccountShell from '@/components/AccountShell.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatDateTime, money } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const result = ref<Paged<OrderSummary> | null>(null)
const failed = ref(false)

watch(
  () => route.query.page,
  async (page) => {
    failed.value = false
    try {
      result.value = (await http.get<Paged<OrderSummary>>('/storefront/account/orders', { params: { page: Number(page) || 1 } })).data
    } catch {
      failed.value = true
    }
  },
  { immediate: true },
)
</script>

<template>
  <AccountShell title="My orders">
    <p v-if="failed" class="alert-error">We couldn't load your orders. Please refresh the page.</p>
    <div v-else-if="!result" class="h-40 animate-pulse rounded-xl bg-stone-200" />

    <div v-else-if="result.items.length === 0" class="card p-10 text-center">
      <p class="font-medium">No orders yet</p>
      <RouterLink :to="{ name: 'catalog' }" class="btn btn-primary mt-4">Start shopping</RouterLink>
    </div>

    <template v-else>
      <ul class="card divide-y divide-stone-100">
        <li v-for="o in result.items" :key="o.id">
          <RouterLink :to="{ name: 'order', params: { number: o.orderNumber } }" class="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-stone-50">
            <div>
              <p class="font-mono font-semibold">{{ o.orderNumber }}</p>
              <p class="text-sm text-stone-500">{{ formatDateTime(o.placedAt) }} · {{ o.itemCount }} item{{ o.itemCount === 1 ? '' : 's' }}</p>
            </div>
            <div class="flex items-center gap-4">
              <StatusBadge :status="o.status" />
              <p class="font-semibold">{{ money(o.totalMinor, o.currency) }}</p>
            </div>
          </RouterLink>
        </li>
      </ul>
      <PaginationBar class="mt-6" :page="result.page" :total-pages="result.totalPages" @change="(p) => router.push({ query: { page: p } })" />
    </template>
  </AccountShell>
</template>
