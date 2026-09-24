<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { http } from '@/api/client'
import type { Paged, ProductSummary } from '@/api/types'
import PaginationBar from '@/components/PaginationBar.vue'
import ProductCard from '@/components/ProductCard.vue'
import { useTenantStore } from '@/stores/tenant'

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

const currentCategory = computed(() => tenant.categories.find((c) => c.slug === category.value))
const heading = computed(() => {
  if (q.value) return `Results for “${q.value}”`
  return currentCategory.value?.name ?? 'All products'
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
        params: { q: q.value || undefined, category: category.value || undefined, sort: sort.value, page: page.value, pageSize: 12 },
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
      <h2 class="mb-2 text-sm font-semibold text-stone-500 uppercase">Categories</h2>
      <nav class="flex gap-2 overflow-x-auto pb-2 text-sm lg:flex-col lg:gap-0.5 lg:overflow-visible">
        <RouterLink
          :to="{ name: 'catalog', query: q ? { q } : {} }"
          :class="!category ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-stone-100'"
          class="shrink-0 rounded-lg px-3 py-1.5 whitespace-nowrap"
        >
          All products
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
    </aside>

    <section class="min-w-0 flex-1">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold">{{ heading }}</h1>
          <p v-if="result" class="text-sm text-stone-500">{{ result.totalCount }} product{{ result.totalCount === 1 ? '' : 's' }}</p>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <span class="text-stone-600">Sort by</span>
          <select :value="sort" class="input w-auto" @change="update({ sort: ($event.target as HTMLSelectElement).value, page: undefined })">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <p v-if="failed" class="alert-error">We couldn't load products. Please try again.</p>

      <div v-else-if="loading && !result" class="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
        <div v-for="i in 6" :key="i" class="aspect-[3/4] animate-pulse rounded-xl bg-stone-200" />
      </div>

      <div v-else-if="result && result.items.length === 0" class="card p-10 text-center">
        <p class="font-medium">No products found</p>
        <p class="mt-1 text-sm text-stone-600">Try a different search or browse all products.</p>
        <RouterLink :to="{ name: 'catalog' }" class="btn btn-secondary mt-4">Clear filters</RouterLink>
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
