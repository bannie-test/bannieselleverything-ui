<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { AdminCustomer, MembershipTier, Paged } from '@/api/types'
import PaginationBar from '@/components/PaginationBar.vue'
import { pick } from '@/i18n'
import { formatDate, money } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const result = ref<Paged<AdminCustomer> | null>(null)
const tiers = ref<MembershipTier[]>([])
const failed = ref(false)
const error = ref<string | null>(null)
const savingId = ref<string | null>(null)
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')

onMounted(async () => {
  tiers.value = (await http.get<MembershipTier[]>('/admin/membership-tiers').catch(() => ({ data: [] }))).data
})

function update(patch: Record<string, string | number | undefined>) {
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries({ ...route.query, ...patch })) if (v !== undefined && v !== '') query[k] = String(v)
  router.push({ query })
}

async function load() {
  failed.value = false
  const q = route.query
  try {
    result.value = (
      await http.get<Paged<AdminCustomer>>('/admin/customers', {
        params: { q: q.q || undefined, tierId: q.tier || undefined, sort: q.sort || undefined, page: Number(q.page) || 1 },
      })
    ).data
  } catch {
    failed.value = true
  }
}
watch(() => route.query, load, { immediate: true })

async function setTier(c: AdminCustomer, tierId: string) {
  savingId.value = c.id
  error.value = null
  try {
    await http.put(`/admin/customers/${c.id}/tier`, { tierId: tierId || null })
    const t = tiers.value.find((x) => x.id === tierId)
    c.tier = t ? { id: t.id, name: pick(t.name, t.nameEn), color: t.color } : null
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    savingId.value = null
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-2xl font-semibold">{{ $t('Customers') }}</h1>
    <RouterLink :to="{ name: 'admin-promotions', params: { tab: 'membership' } }" class="btn btn-secondary">{{ $t('Membership tiers') }}</RouterLink>
  </div>

  <div class="mt-4 flex flex-wrap items-center gap-3">
    <form @submit.prevent="update({ q: search.trim(), page: undefined })">
      <input v-model="search" type="search" :placeholder="$t('Name, email or phone')" class="input w-64" :aria-label="$t('Search customers')" />
    </form>
    <select class="input w-auto" :aria-label="$t('Tier')" :value="str(route.query.tier)" @change="update({ tier: ($event.target as HTMLSelectElement).value, page: undefined })">
      <option value="">{{ $t('All tiers') }}</option>
      <option v-for="t in tiers" :key="t.id" :value="t.id">{{ pick(t.name, t.nameEn) }}</option>
    </select>
    <select class="input w-auto" :aria-label="$t('Sort')" :value="str(route.query.sort)" @change="update({ sort: ($event.target as HTMLSelectElement).value, page: undefined })">
      <option value="">{{ $t('Newest') }}</option>
      <option value="spent">{{ $t('Top spenders') }}</option>
      <option value="orders">{{ $t('Most orders') }}</option>
      <option value="name">{{ $t('Name A–Z') }}</option>
    </select>
  </div>

  <p v-if="error" class="alert-error mt-4">{{ error }}</p>
  <p v-if="failed" class="alert-error mt-6">{{ $t("Couldn't load customers.") }}</p>
  <div v-else-if="!result" class="mt-6 h-64 animate-pulse rounded-xl bg-stone-200" />
  <div v-else-if="!result.items.length" class="card mt-6 p-10 text-center text-stone-600">
    {{ Object.keys(route.query).length ? $t('No customers match.') : $t('No registered customers yet. Guests who check out without an account appear in the customer report.') }}
  </div>

  <template v-else>
    <p class="mt-4 text-sm text-stone-500">{{ result.totalCount === 1 ? $t('1 customer') : $t('{n} customers', { n: result.totalCount }) }}</p>
    <div class="card mt-2 overflow-x-auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ $t('Customer') }}</th>
            <th class="text-right">{{ $t('Orders') }}</th>
            <th class="text-right">{{ $t('Spent') }}</th>
            <th>{{ $t('Last order') }}</th>
            <th>{{ $t('Joined') }}</th>
            <th>{{ $t('Membership') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in result.items" :key="c.id" class="hover:bg-stone-50">
            <td>
              <p class="font-medium">{{ c.fullName }}</p>
              <p class="text-xs text-stone-500">{{ c.email }}<template v-if="c.phone"> · {{ c.phone }}</template></p>
            </td>
            <td class="text-right">
              <RouterLink v-if="c.orderCount" :to="{ name: 'admin-orders', query: { q: c.email } }" class="link">{{ c.orderCount }}</RouterLink>
              <span v-else class="text-stone-400">0</span>
            </td>
            <td class="text-right whitespace-nowrap" :title="$t('Delivered orders')">{{ money(c.spentMinor) }}</td>
            <td class="whitespace-nowrap text-stone-600">{{ c.lastOrderAt ? formatDate(c.lastOrderAt) : '—' }}</td>
            <td class="whitespace-nowrap text-stone-600">{{ formatDate(c.createdAt) }}</td>
            <td>
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: c.tier?.color ?? '#e7e5e4' }" aria-hidden="true" />
                <select
                  class="input w-36 py-1"
                  :value="c.tier?.id ?? ''"
                  :disabled="savingId === c.id || !tiers.length"
                  :aria-label="$t('Membership tier for {name}', { name: c.fullName })"
                  @change="setTier(c, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">{{ $t('No tier') }}</option>
                  <option v-for="t in tiers" :key="t.id" :value="t.id">{{ pick(t.name, t.nameEn) }}</option>
                </select>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-2 text-xs text-stone-500">{{ $t('Spent counts delivered orders only. Customers move up tiers automatically when an order is delivered; a tier you set here is never lowered automatically.') }}</p>
    <PaginationBar class="mt-6" :page="result.page" :total-pages="result.totalPages" @change="(p) => update({ page: p })" />
  </template>
</template>
