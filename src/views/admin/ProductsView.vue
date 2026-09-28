<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { http } from '@/api/client'
import type { AdminProduct, Category, Paged } from '@/api/types'
import PaginationBar from '@/components/PaginationBar.vue'
import { pick } from '@/i18n'
import { formatDate, money } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const result = ref<Paged<AdminProduct> | null>(null)
const categories = ref<Category[]>([])
const failed = ref(false)
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')

const sorts = [
  { value: '', label: 'Recently updated' },
  { value: 'created', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'stock', label: 'Lowest stock' },
  { value: 'price', label: 'Highest price' },
]

onMounted(async () => {
  categories.value = (await http.get<Category[]>('/admin/categories').catch(() => ({ data: [] }))).data
})

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
          params: {
            q: query.q || undefined,
            lowStock: query.lowStock === '1' || undefined,
            categoryId: query.category || undefined,
            isActive: query.visibility === 'visible' ? true : query.visibility === 'hidden' ? false : undefined,
            isFeatured: query.featured === '1' || undefined,
            sort: query.sort || undefined,
            page: Number(query.page) || 1,
          },
        })
      ).data
    } catch {
      failed.value = true
    }
  },
  { immediate: true },
)

const str = (v: unknown) => (typeof v === 'string' ? v : '')
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-2xl font-semibold">{{ $t('Products') }}</h1>
    <RouterLink :to="{ name: 'admin-product-new' }" class="btn btn-primary">+ {{ $t('Add product') }}</RouterLink>
  </div>

  <div class="mt-4 flex flex-wrap items-center gap-3">
    <form @submit.prevent="update({ q: search.trim(), page: undefined })">
      <input v-model="search" type="search" :placeholder="$t('Search name or SKU')" class="input w-56" :aria-label="$t('Search products')" />
    </form>
    <select class="input w-auto" :aria-label="$t('Category')" :value="str(route.query.category)" @change="update({ category: ($event.target as HTMLSelectElement).value, page: undefined })">
      <option value="">{{ $t('All categories') }}</option>
      <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.parentId ? '— ' : '' }}{{ pick(c.name, c.nameEn) }}</option>
    </select>
    <select class="input w-auto" :aria-label="$t('Visibility')" :value="str(route.query.visibility)" @change="update({ visibility: ($event.target as HTMLSelectElement).value, page: undefined })">
      <option value="">{{ $t('Visible & hidden') }}</option>
      <option value="visible">{{ $t('Visible only') }}</option>
      <option value="hidden">{{ $t('Hidden only') }}</option>
    </select>
    <select class="input w-auto" :aria-label="$t('Sort')" :value="str(route.query.sort)" @change="update({ sort: ($event.target as HTMLSelectElement).value, page: undefined })">
      <option v-for="s in sorts" :key="s.value" :value="s.value">{{ $t(s.label) }}</option>
    </select>
    <label class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="h-4 w-4 accent-primary"
        :checked="route.query.lowStock === '1'"
        @change="update({ lowStock: ($event.target as HTMLInputElement).checked ? '1' : undefined, page: undefined })"
      />
      {{ $t('Running low') }}
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="h-4 w-4 accent-primary"
        :checked="route.query.featured === '1'"
        @change="update({ featured: ($event.target as HTMLInputElement).checked ? '1' : undefined, page: undefined })"
      />
      {{ $t('Featured') }}
    </label>
  </div>

  <p v-if="failed" class="alert-error mt-6">{{ $t("Couldn't load products.") }}</p>
  <div v-else-if="!result" class="mt-6 h-64 animate-pulse rounded-xl bg-stone-200" />
  <div v-else-if="result.items.length === 0" class="card mt-6 p-10 text-center text-stone-600">
    <template v-if="Object.keys(route.query).length">{{ $t('No products match these filters.') }}</template>
    <template v-else>{{ $t('No products yet.') }} <RouterLink :to="{ name: 'admin-product-new' }" class="link">{{ $t('Add your first product') }}</RouterLink>.</template>
  </div>

  <template v-else>
    <p class="mt-4 text-sm text-stone-500">{{ result.totalCount === 1 ? $t('1 product') : $t('{n} products', { n: result.totalCount }) }}</p>
    <div class="card mt-2 overflow-x-auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ $t('Product') }}</th>
            <th>{{ $t('Category') }}</th>
            <th class="text-right">{{ $t('Price') }}</th>
            <th class="text-right">{{ $t('Stock') }}</th>
            <th>{{ $t('Status') }}</th>
            <th>{{ $t('Updated') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in result.items" :key="p.id" class="hover:bg-stone-50">
            <td>
              <RouterLink :to="{ name: 'admin-product-edit', params: { id: p.id } }" class="flex items-center gap-3">
                <img v-if="p.images[0]" :src="p.images[0]" alt="" class="h-10 w-10 rounded-md object-cover" />
                <span v-else class="h-10 w-10 rounded-md bg-stone-100" />
                <span>
                  <span class="block font-medium text-stone-900 hover:text-primary">{{ pick(p.name, p.nameEn) }}</span>
                  <span v-if="p.sku" class="font-mono text-xs text-stone-500">{{ p.sku }}</span>
                </span>
              </RouterLink>
            </td>
            <td class="text-stone-600">{{ pick(p.categoryName, p.categoryNameEn) ?? '—' }}</td>
            <td class="text-right whitespace-nowrap">
              {{ money(p.priceMinor, p.currency) }}
              <s v-if="p.compareAtPriceMinor" class="block text-xs text-stone-400">{{ money(p.compareAtPriceMinor, p.currency) }}</s>
            </td>
            <td class="text-right whitespace-nowrap">
              <span :class="p.stockQuantity === 0 ? 'font-semibold text-red-600' : p.isLowStock ? 'font-semibold text-amber-700' : ''">{{ p.stockQuantity }}</span>
              <span v-if="p.isLowStock" class="block text-xs text-stone-500">{{ p.stockQuantity === 0 ? $t('sold out') : $t('warn ≤ {n}', { n: p.lowStockThreshold }) }}</span>
            </td>
            <td>
              <div class="flex flex-wrap gap-1">
                <span :class="p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'" class="pill">{{ p.isActive ? $t('Visible') : $t('Hidden') }}</span>
                <span v-if="p.isFeatured" class="pill bg-accent/15 text-stone-800">★ {{ $t('Featured') }}</span>
              </div>
            </td>
            <td class="whitespace-nowrap text-stone-500">{{ formatDate(p.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar class="mt-6" :page="result.page" :total-pages="result.totalPages" @change="(p) => update({ page: p })" />
  </template>
</template>
