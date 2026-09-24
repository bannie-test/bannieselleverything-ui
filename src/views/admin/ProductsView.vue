<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { http } from '@/api/client'
import type { AdminProduct, Paged } from '@/api/types'
import PaginationBar from '@/components/PaginationBar.vue'
import { money } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const result = ref<Paged<AdminProduct> | null>(null)
const failed = ref(false)
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')

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
        await http.get<Paged<AdminProduct>>('/admin/products', {
          params: { q: query.q || undefined, lowStock: query.lowStock === '1' || undefined, page: Number(query.page) || 1 },
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
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-2xl font-semibold">Products</h1>
    <RouterLink :to="{ name: 'admin-product-new' }" class="btn btn-primary">+ Add product</RouterLink>
  </div>

  <div class="mt-4 flex flex-wrap items-center gap-3">
    <form @submit.prevent="update({ q: search.trim(), page: undefined })">
      <input v-model="search" type="search" placeholder="Search name or SKU" class="input w-64" aria-label="Search products" />
    </form>
    <label class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="h-4 w-4 accent-primary"
        :checked="route.query.lowStock === '1'"
        @change="update({ lowStock: ($event.target as HTMLInputElement).checked ? '1' : undefined, page: undefined })"
      />
      Low stock only (≤ 5)
    </label>
  </div>

  <p v-if="failed" class="alert-error mt-6">Couldn't load products.</p>
  <div v-else-if="!result" class="mt-6 h-64 animate-pulse rounded-xl bg-stone-200" />
  <div v-else-if="result.items.length === 0" class="card mt-6 p-10 text-center text-stone-600">
    No products yet. <RouterLink :to="{ name: 'admin-product-new' }" class="link">Add your first product</RouterLink>.
  </div>

  <template v-else>
    <div class="card mt-6 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
          <tr>
            <th class="px-4 py-3 font-medium">Product</th>
            <th class="px-4 py-3 font-medium">Category</th>
            <th class="px-4 py-3 text-right font-medium">Price</th>
            <th class="px-4 py-3 text-right font-medium">Stock</th>
            <th class="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
          <tr v-for="p in result.items" :key="p.id" class="hover:bg-stone-50">
            <td class="px-4 py-3">
              <RouterLink :to="{ name: 'admin-product-edit', params: { id: p.id } }" class="flex items-center gap-3">
                <img v-if="p.images[0]" :src="p.images[0]" alt="" class="h-10 w-10 rounded-md object-cover" />
                <span v-else class="h-10 w-10 rounded-md bg-stone-100" />
                <span>
                  <span class="block font-medium text-stone-900 hover:text-primary">{{ p.name }}</span>
                  <span v-if="p.sku" class="font-mono text-xs text-stone-500">{{ p.sku }}</span>
                </span>
              </RouterLink>
            </td>
            <td class="px-4 py-3 text-stone-600">{{ p.categoryName ?? '—' }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">{{ money(p.priceMinor, p.currency) }}</td>
            <td class="px-4 py-3 text-right" :class="p.stockQuantity === 0 ? 'font-semibold text-red-600' : p.stockQuantity <= 5 ? 'font-semibold text-amber-700' : ''">
              {{ p.stockQuantity }}
            </td>
            <td class="px-4 py-3">
              <span :class="p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'" class="rounded-full px-2 py-0.5 text-xs font-medium">
                {{ p.isActive ? 'Active' : 'Hidden' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar class="mt-6" :page="result.page" :total-pages="result.totalPages" @change="(p) => update({ page: p })" />
  </template>
</template>
