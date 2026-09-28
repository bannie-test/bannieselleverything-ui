<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { http } from '@/api/client'
import type { Paged, ProductSummary } from '@/api/types'
import ProductCard from '@/components/ProductCard.vue'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const newest = ref<ProductSummary[]>([])
const featured = ref<ProductSummary[]>([])
const loading = ref(true)
const failed = ref(false)

const theme = computed(() => tenant.info?.theme)
const heroStyle = computed(() =>
  theme.value?.heroImageUrl
    ? { backgroundImage: `linear-gradient(90deg, rgb(0 0 0 / 0.6), rgb(0 0 0 / 0.15)), url("${theme.value.heroImageUrl}")` }
    : {},
)

onMounted(async () => {
  try {
    const [n, f] = await Promise.all([
      http.get<Paged<ProductSummary>>('/storefront/products', { params: { sort: 'newest', pageSize: 8 } }),
      http.get<Paged<ProductSummary>>('/storefront/products', { params: { featured: true, pageSize: 8 } }),
    ])
    newest.value = n.data.items
    featured.value = f.data.items
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section
    :style="heroStyle"
    :class="theme?.heroImageUrl ? 'bg-stone-800 text-white' : 'bg-primary text-on-primary'"
    class="relative overflow-hidden rounded-2xl bg-cover bg-center px-6 py-12 sm:px-12 sm:py-16"
  >
    <div class="relative z-10 max-w-lg">
      <p v-if="!theme?.heroTitle" class="text-sm font-medium tracking-wide uppercase opacity-80">Welcome to</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{{ theme?.heroTitle || tenant.info?.name }}</h1>
      <p class="mt-3 opacity-90">
        {{ theme?.heroSubtitle || 'Thoughtfully made everyday goods. Pay cash on delivery, with flat-rate shipping nationwide.' }}
      </p>
      <RouterLink :to="{ name: 'catalog' }" class="btn btn-lg mt-6 bg-white text-stone-900 hover:bg-stone-100">Shop all products</RouterLink>
    </div>
    <template v-if="!theme?.heroImageUrl">
      <div class="absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-white/10" aria-hidden="true" />
      <div class="absolute top-6 right-24 h-24 w-24 rounded-full bg-white/10" aria-hidden="true" />
    </template>
  </section>

  <section v-if="tenant.tree().length" class="mt-10">
    <h2 class="text-xl font-semibold">Shop by category</h2>
    <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <RouterLink
        v-for="c in tenant.tree()"
        :key="c.id"
        :to="{ name: 'catalog', query: { category: c.slug } }"
        class="card flex items-center justify-between p-4 transition hover:border-primary hover:shadow-sm"
      >
        <span class="font-medium">{{ c.name }}</span>
        <span class="text-primary" aria-hidden="true">→</span>
      </RouterLink>
    </div>
  </section>

  <p v-if="failed" class="alert-error mt-10">We couldn't load products. Please refresh the page.</p>

  <section v-if="loading || featured.length" class="mt-10">
    <h2 class="text-xl font-semibold">Featured</h2>
    <div class="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      <template v-if="loading">
        <div v-for="i in 4" :key="i" class="aspect-[3/4] animate-pulse rounded-xl bg-stone-200" />
      </template>
      <ProductCard v-for="p in featured" v-else :key="p.id" :product="p" />
    </div>
  </section>

  <section class="mt-10">
    <div class="flex items-end justify-between">
      <h2 class="text-xl font-semibold">New arrivals</h2>
      <RouterLink :to="{ name: 'catalog' }" class="link text-sm">View all</RouterLink>
    </div>
    <div class="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      <template v-if="loading">
        <div v-for="i in 8" :key="i" class="aspect-[3/4] animate-pulse rounded-xl bg-stone-200" />
      </template>
      <ProductCard v-for="p in newest" v-else :key="p.id" :product="p" />
    </div>
  </section>
</template>
