<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { http } from '@/api/client'
import type { Paged, ProductSummary } from '@/api/types'
import PaginationBar from '@/components/PaginationBar.vue'
import { t } from '@/i18n'
import ProductCard from '@/components/ProductCard.vue'
import { useTenantStore } from '@/stores/tenant'
import { minorDigits } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()

const result = ref<Paged<ProductSummary> | null>(null)
const loading = ref(true)
const failed = ref(false)

// The URL is the source of truth, so filters survive reloads and are shareable.
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const category = computed(() => (typeof route.query.category === 'string' ? route.query.category : ''))
const sort = computed(() => (typeof route.query.sort === 'string' ? route.query.sort : 'newest'))
const page = computed(() => Number(route.query.page) || 1)
const minPrice = computed(() => (typeof route.query.minPrice === 'string' ? Number(route.query.minPrice) || undefined : undefined))
const maxPrice = computed(() => (typeof route.query.maxPrice === 'string' ? Number(route.query.maxPrice) || undefined : undefined))
const inStock = computed(() => route.query.inStock === '1')
const onSale = computed(() => route.query.onSale === '1')
const minRating = computed(() => (typeof route.query.minRating === 'string' ? Number(route.query.minRating) || undefined : undefined))
const activeFilters = computed(() => [minPrice.value, maxPrice.value, minRating.value].some((v) => v !== undefined) || inStock.value || onSale.value)

// Prices in the URL and API are minor units; the inputs show whole currency units.
const currency = computed(() => tenant.info?.currency ?? 'VND')
const scale = computed(() => 10 ** minorDigits(currency.value))
const priceInputs = reactive({ min: '', max: '' })
// Small screens: filters fold away so products stay above the fold.
const filtersOpen = ref(false)
watch(
  [minPrice, maxPrice, scale],
  () => {
    priceInputs.min = minPrice.value ? String(minPrice.value / scale.value) : ''
    priceInputs.max = maxPrice.value ? String(maxPrice.value / scale.value) : ''
  },
  { immediate: true },
)

function applyPrice() {
  const toMinor = (v: string) => (v.trim() && Number(v) > 0 ? String(Math.round(Number(v) * scale.value)) : undefined)
  update({ minPrice: toMinor(priceInputs.min), maxPrice: toMinor(priceInputs.max), page: undefined })
}

function clearFilters() {
  update({ minPrice: undefined, maxPrice: undefined, inStock: undefined, onSale: undefined, minRating: undefined, page: undefined })
}

const currentCategory = computed(() => tenant.categories.find((c) => c.slug === category.value))
const heading = computed(() => {
  if (q.value) return t('Results for “{q}”', { q: q.value })
  return currentCategory.value?.name ?? t('All products')
})

function update(patch: Record<string, string | number | undefined>) {
  const query = { ...route.query, ...patch }
  for (const key of Object.keys(query)) if (query[key] === '' || query[key] === undefined) delete query[key]
  router.push({ query: query as Record<string, string> })
}

let requestId = 0
watch(
  () => route.query,
  async () => {
    const id = ++requestId
    loading.value = true
    failed.value = false
    try {
      const { data } = await http.get<Paged<ProductSummary>>('/storefront/products', {
        params: {
          q: q.value || undefined,
          category: category.value || undefined,
          sort: sort.value,
          minPrice: minPrice.value,
          maxPrice: maxPrice.value,
          inStock: inStock.value || undefined,
          onSale: onSale.value || undefined,
          minRating: minRating.value,
          page: page.value,
          pageSize: 12,
        },
      })
      if (id === requestId) result.value = data
    } catch {
      if (id === requestId) failed.value = true
    } finally {
      if (id === requestId) loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col gap-6 lg:flex-row">
    <aside class="lg:w-56 lg:shrink-0">
      <h2 class="mb-2 text-sm font-semibold text-stone-500 uppercase">{{ $t('Categories') }}</h2>
      <nav class="flex gap-2 overflow-x-auto pb-2 text-sm lg:flex-col lg:gap-0.5 lg:overflow-visible">
        <RouterLink
          :to="{ name: 'catalog', query: q ? { q } : {} }"
          :class="!category ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-stone-100'"
          class="shrink-0 rounded-lg px-3 py-1.5 whitespace-nowrap"
        >
          {{ $t('All products') }}
        </RouterLink>
        <template v-for="c in tenant.tree()" :key="c.id">
          <RouterLink
            :to="{ name: 'catalog', query: { category: c.slug } }"
            :class="category === c.slug ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-stone-100'"
            class="shrink-0 rounded-lg px-3 py-1.5 whitespace-nowrap"
          >
            {{ c.name }}
          </RouterLink>
          <RouterLink
            v-for="child in c.children"
            :key="child.id"
            :to="{ name: 'catalog', query: { category: child.slug } }"
            :class="category === child.slug ? 'bg-primary/10 font-medium text-primary' : 'text-stone-600 hover:bg-stone-100'"
            class="shrink-0 rounded-lg px-3 py-1.5 whitespace-nowrap lg:pl-6"
          >
            {{ child.name }}
          </RouterLink>
        </template>
      </nav>

      <button
        class="btn btn-secondary mt-3 w-full lg:hidden"
        :aria-expanded="filtersOpen"
        aria-controls="catalog-filters"
        @click="filtersOpen = !filtersOpen"
      >
        {{ filtersOpen ? $t('Hide filters') : $t('Filters') }}<span v-if="activeFilters" class="h-2 w-2 rounded-full bg-primary" :aria-label="$t('active')" />
      </button>

      <div id="catalog-filters" :class="filtersOpen ? 'block' : 'hidden lg:block'" class="mt-4 space-y-5 border-t border-stone-200 pt-4 text-sm">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-stone-500 uppercase">{{ $t('Filters') }}</h2>
          <button v-if="activeFilters" class="text-xs text-primary hover:underline" @click="clearFilters">{{ $t('Clear') }}</button>
        </div>

        <form class="space-y-2" @submit.prevent="applyPrice">
          <p class="font-medium">{{ $t('Price ({currency})', { currency }) }}</p>
          <div class="flex items-center gap-2">
            <input v-model="priceInputs.min" type="number" min="0" inputmode="numeric" :placeholder="$t('Min')" class="input" :aria-label="$t('Minimum price')" />
            <span class="text-stone-400">–</span>
            <input v-model="priceInputs.max" type="number" min="0" inputmode="numeric" :placeholder="$t('Max')" class="input" :aria-label="$t('Maximum price')" />
          </div>
          <button type="submit" class="btn btn-secondary w-full py-1.5">{{ $t('Apply') }}</button>
        </form>

        <fieldset class="space-y-2">
          <legend class="mb-2 font-medium">{{ $t('Availability') }}</legend>
          <label class="flex items-center gap-2">
            <input type="checkbox" class="h-4 w-4 accent-primary" :checked="inStock" @change="update({ inStock: inStock ? undefined : '1', page: undefined })" />
            {{ $t('In stock only') }}
          </label>
          <label class="flex items-center gap-2">
            <input type="checkbox" class="h-4 w-4 accent-primary" :checked="onSale" @change="update({ onSale: onSale ? undefined : '1', page: undefined })" />
            {{ $t('On sale') }}
          </label>
        </fieldset>

        <fieldset class="space-y-2">
          <legend class="mb-2 font-medium">{{ $t('Customer rating') }}</legend>
          <label v-for="r in [undefined, 4, 3, 2]" :key="r ?? 'any'" class="flex items-center gap-2">
            <input
              type="radio"
              name="minRating"
              class="h-4 w-4 accent-primary"
              :checked="minRating === r"
              @change="update({ minRating: r, page: undefined })"
            />
            {{ r ? $t('{n}★ & up', { n: r }) : $t('Any rating') }}
          </label>
        </fieldset>
      </div>
    </aside>

    <section class="min-w-0 flex-1">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold">{{ heading }}</h1>
          <p v-if="result" class="text-sm text-stone-500">{{ result.totalCount === 1 ? $t('1 product') : $t('{n} products', { n: result.totalCount }) }}</p>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <span class="text-stone-600">{{ $t('Sort by') }}</span>
          <select :value="sort" class="input w-auto" @change="update({ sort: ($event.target as HTMLSelectElement).value, page: undefined })">
            <option value="newest">{{ $t('Newest') }}</option>
            <option value="price_asc">{{ $t('Price: low to high') }}</option>
            <option value="price_desc">{{ $t('Price: high to low') }}</option>
            <option value="rating">{{ $t('Top rated') }}</option>
            <option value="name">{{ $t('Name') }}</option>
          </select>
        </label>
      </div>

      <p v-if="failed" class="alert-error">{{ $t("We couldn't load products. Please try again.") }}</p>

      <div v-else-if="loading && !result" class="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
        <div v-for="i in 6" :key="i" class="aspect-[3/4] animate-pulse rounded-xl bg-stone-200" />
      </div>

      <div v-else-if="result && result.items.length === 0" class="card p-10 text-center">
        <p class="font-medium">{{ $t('No products found') }}</p>
        <p class="mt-1 text-sm text-stone-600">{{ $t('Try a different search, loosen the filters or browse all products.') }}</p>
        <RouterLink :to="{ name: 'catalog' }" class="btn btn-secondary mt-4">{{ $t('Clear filters') }}</RouterLink>
      </div>

      <template v-else-if="result">
        <div :class="{ 'opacity-60': loading }" class="grid grid-cols-2 gap-3 transition sm:gap-5 md:grid-cols-3">
          <ProductCard v-for="p in result.items" :key="p.id" :product="p" />
        </div>
        <PaginationBar class="mt-8" :page="result.page" :total-pages="result.totalPages" @change="(p) => update({ page: p })" />
      </template>
    </section>
  </div>
</template>
