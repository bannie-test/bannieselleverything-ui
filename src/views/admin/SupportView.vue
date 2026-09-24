<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { http } from '@/api/client'
import type { AdminTicketSummary, Paged, TicketStatus } from '@/api/types'
import PaginationBar from '@/components/PaginationBar.vue'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const result = ref<Paged<AdminTicketSummary> | null>(null)
const failed = ref(false)
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')

// From the shop's side: Open needs a reply, Answered waits on the customer.
const tabs: { status?: TicketStatus; label: string }[] = [
  { status: 'Open', label: 'Needs reply' },
  { status: 'Answered', label: 'Answered' },
  { status: 'Closed', label: 'Closed' },
  { label: 'All' },
]
const styles: Record<TicketStatus, string> = {
  Open: 'bg-amber-50 text-amber-800 ring-amber-200',
  Answered: 'bg-sky-50 text-sky-800 ring-sky-200',
  Closed: 'bg-stone-100 text-stone-600 ring-stone-200',
}
const labels: Record<TicketStatus, string> = { Open: 'Needs reply', Answered: 'Answered', Closed: 'Closed' }

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
        await http.get<Paged<AdminTicketSummary>>('/admin/support', {
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
  <h1 class="text-2xl font-semibold">Support</h1>

  <div class="mt-4 flex flex-wrap items-center gap-3">
    <div class="flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1 text-sm">
      <button
        v-for="t in tabs"
        :key="t.label"
        :class="(route.query.status ?? undefined) === t.status ? 'bg-white font-medium shadow-sm' : 'text-stone-600 hover:text-stone-900'"
        class="rounded-md px-3 py-1.5"
        @click="update({ status: t.status, page: undefined })"
      >
        {{ t.label }}
      </button>
    </div>
    <form class="ml-auto" @submit.prevent="update({ q: search.trim(), page: undefined })">
      <input v-model="search" type="search" placeholder="Ticket, order, subject or email" class="input w-64" aria-label="Search tickets" />
    </form>
  </div>

  <p v-if="failed" class="alert-error mt-6">Couldn't load support requests.</p>
  <div v-else-if="!result" class="mt-6 h-64 animate-pulse rounded-xl bg-stone-200" />
  <div v-else-if="result.items.length === 0" class="card mt-6 p-10 text-center text-stone-600">No support requests here.</div>

  <template v-else>
    <div class="card mt-6 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
          <tr>
            <th class="px-4 py-3 font-medium">Request</th>
            <th class="px-4 py-3 font-medium">Customer</th>
            <th class="px-4 py-3 font-medium">Last message</th>
            <th class="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
          <tr v-for="{ ticket: t, customerName, customerEmail } in result.items" :key="t.number" class="hover:bg-stone-50">
            <td class="px-4 py-3">
              <RouterLink :to="{ name: 'admin-support-ticket', params: { number: t.number } }" class="font-medium text-primary hover:underline">
                {{ t.subject }}
              </RouterLink>
              <p class="text-xs text-stone-500">
                <span class="font-mono">{{ t.number }}</span>
                <template v-if="t.orderNumber"> · <span class="font-mono">{{ t.orderNumber }}</span></template>
              </p>
            </td>
            <td class="px-4 py-3">
              <p>{{ customerName }}</p>
              <p class="text-xs text-stone-500">{{ customerEmail }}</p>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-stone-600">
              {{ formatDateTime(t.lastMessageAt) }}
              <p class="text-xs text-stone-500">by {{ t.lastAuthor === 'Staff' ? 'shop' : 'customer' }}</p>
            </td>
            <td class="px-4 py-3">
              <span :class="styles[t.status]" class="rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset">{{ labels[t.status] }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar class="mt-6" :page="result.page" :total-pages="result.totalPages" @change="(p) => update({ page: p })" />
  </template>
</template>
