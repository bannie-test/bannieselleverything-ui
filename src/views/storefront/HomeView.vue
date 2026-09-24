<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { http } from '@/api/client'
import type { Paged, ProductSummary } from '@/api/types'
import ProductCard from '@/components/ProductCard.vue'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const newest = ref<ProductSummary[]>([])
const loading = ref(true)
const failed = ref(false)

onMounted(async () => {
  try {
    const { data } = await http.get<Paged<ProductSummary>>('/storefront/products', { params: { sort: 'newest', pageSize: 8 } })
    newest.value = data.items
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-white sm:px-12 sm:py-16">
    <div class="relative z-10 max-w-lg">
      <p class="text-sm font-medium tracking-wide uppercase opacity-80">Welcome to</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{{ tenant.info?.name }}</h1>
      <p class="mt-3 opacity-90">
        Thoughtfully made everyday goods. Pay cash on delivery, with flat-rate shipping nationwide.
      </p>
      <RouterLink :to="{ name: 'catalog' }" class="btn btn-lg mt-6 bg-white text-stone-900 hover:bg-stone-100">Shop all products</RouterLink>
    </div>
    <div class="absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-white/10" aria-hidden="true" />
    <div class="absolute top-6 right-24 h-24 w-24 rounded-full bg-white/10" aria-hidden="true" />
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

  <section class="mt-10">
    <div class="flex items-end justify-between">
      <h2 class="text-xl font-semibold">New arrivals</h2>
      <RouterLink :to="{ name: 'catalog' }" class="link text-sm">View all</RouterLink>
    </div>
    <p v-if="failed" class="alert-error mt-4">We couldn't load products. Please refresh the page.</p>
    <div class="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      <template v-if="loading">
        <div v-for="i in 8" :key="i" class="aspect-[3/4] animate-pulse rounded-xl bg-stone-200" />
      </template>
      <ProductCard v-for="p in newest" v-else :key="p.id" :product="p" />
    </div>
  </section>
</template>
