<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { http } from '@/api/client'
import type { OrderStatus, OrderSummary, Paged } from '@/api/types'
import PaginationBar from '@/components/PaginationBar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatDateTime, money, statusLabels } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const result = ref<Paged<OrderSummary> | null>(null)
const failed = ref(false)
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')

const statuses: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

function update(patch: Record<string, string | number | undefined>) {
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries({ ...route.query, ...patch })) if (v !== undefined && v !== '') query[k] = String(v)
  router.push({ query })
}

watch(
  () => route.query,
  async (query) => {
    failed.value = false
    try {
      result.value = (
        await http.get<Paged<OrderSummary>>('/admin/orders', {
          params: { status: query.status || undefined, q: query.q || undefined, page: Number(query.page) || 1 },
        })
      ).data
    } catch {
      failed.value = true
    }
  },
  { immediate: true },
)
</script>

<template>
  <h1 class="text-2xl font-semibold">Orders</h1>

  <div class="mt-4 flex flex-wrap items-center gap-3">
    <div class="flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1 text-sm">
      <button
        v-for="s in [undefined, ...statuses]"
        :key="s ?? 'all'"
        :class="(route.query.status ?? undefined) === s ? 'bg-white shadow-sm font-medium' : 'text-stone-600 hover:text-stone-900'"
        class="rounded-md px-3 py-1.5"
        @click="update({ status: s, page: undefined })"
      >
        {{ s ? statusLabels[s] : 'All' }}
      </button>
    </div>
    <form class="ml-auto" @submit.prevent="update({ q: search.trim(), page: undefined })">
      <input v-model="search" type="search" placeholder="Order number or email" class="input w-64" aria-label="Search orders" />
    </form>
  </div>

  <p v-if="failed" class="alert-error mt-6">Couldn't load orders.</p>
  <div v-else-if="!result" class="mt-6 h-64 animate-pulse rounded-xl bg-stone-200" />
  <div v-else-if="result.items.length === 0" class="card mt-6 p-10 text-center text-stone-600">No orders match.</div>

  <template v-else>
    <div class="card mt-6 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
          <tr>
            <th class="px-4 py-3 font-medium">Order</th>
            <th class="px-4 py-3 font-medium">Customer</th>
            <th class="px-4 py-3 font-medium">Placed</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
          <tr v-for="o in result.items" :key="o.id" class="hover:bg-stone-50">
            <td class="px-4 py-3">
              <RouterLink :to="{ name: 'admin-order', params: { number: o.orderNumber } }" class="font-mono font-medium text-primary hover:underline">
                {{ o.orderNumber }}
              </RouterLink>
            </td>
            <td class="px-4 py-3">
              <p>{{ o.recipientName }}</p>
              <p class="text-xs text-stone-500">{{ o.customerEmail }}</p>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-stone-600">{{ formatDateTime(o.placedAt) }}</td>
            <td class="px-4 py-3"><StatusBadge :status="o.status" /></td>
            <td class="px-4 py-3 text-right font-medium whitespace-nowrap">{{ money(o.totalMinor, o.currency) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar class="mt-6" :page="result.page" :total-pages="result.totalPages" @change="(p) => update({ page: p })" />
  </template>
</template>
