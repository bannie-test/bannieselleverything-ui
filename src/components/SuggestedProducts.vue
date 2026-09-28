<script setup lang="ts">
import { ref, watch } from 'vue'
import { http } from '@/api/client'
import type { ProductSummary } from '@/api/types'
import ProductCard from './ProductCard.vue'

/** "You may also like" for a product (one id) or a cart (several). Renders nothing when there's nothing to suggest. */
const props = withDefaults(defineProps<{ productIds: string[]; title?: string; limit?: number }>(), { title: 'You may also like', limit: 4 })

const items = ref<ProductSummary[]>([])
const loading = ref(true)

watch(
  () => props.productIds.join(','),
  async () => {
    loading.value = true
    try {
      const { data } = await http.get<ProductSummary[]>('/storefront/suggestions', {
        params: { productId: props.productIds, limit: props.limit },
        paramsSerializer: { indexes: null },
      })
      items.value = data
    } catch {
      items.value = []
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <section v-if="loading || items.length" class="mt-12">
    <h2 class="text-xl font-semibold">{{ title }}</h2>
    <div class="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
      <template v-if="loading">
        <div v-for="i in limit" :key="i" class="aspect-[3/4] animate-pulse rounded-xl bg-stone-200" />
      </template>
      <ProductCard v-for="p in items" v-else :key="p.id" :product="p" />
    </div>
  </section>
</template>
