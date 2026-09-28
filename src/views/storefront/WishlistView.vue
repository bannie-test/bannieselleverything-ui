<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { http } from '@/api/client'
import type { ProductSummary } from '@/api/types'
import AccountShell from '@/components/AccountShell.vue'
import ProductCard from '@/components/ProductCard.vue'
import { useWishlistStore } from '@/stores/wishlist'

const wishlist = useWishlistStore()
const products = ref<ProductSummary[] | null>(null)
const failed = ref(false)

// Un-hearting a card removes it from the page straight away.
const visible = computed(() => products.value?.filter((p) => wishlist.has(p.id)) ?? [])

onMounted(async () => {
  try {
    products.value = (await http.get<ProductSummary[]>('/storefront/account/wishlist')).data
    if (!wishlist.loaded) await wishlist.load()
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <AccountShell :title="$t('Wishlist')">
    <p v-if="failed" class="alert-error">{{ $t("We couldn't load your wishlist. Please refresh the page.") }}</p>
    <div v-else-if="!products" class="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
      <div v-for="i in 3" :key="i" class="aspect-[3/4] animate-pulse rounded-xl bg-stone-200" />
    </div>
    <div v-else-if="visible.length === 0" class="card p-10 text-center">
      <p class="font-medium">{{ $t('Your wishlist is empty') }}</p>
      <p class="mt-1 text-sm text-stone-600">{{ $t('Tap the heart on any product to save it for later.') }}</p>
      <RouterLink :to="{ name: 'catalog' }" class="btn btn-primary mt-4">{{ $t('Browse products') }}</RouterLink>
    </div>
    <div v-else class="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
      <ProductCard v-for="p in visible" :key="p.id" :product="p" />
    </div>
  </AccountShell>
</template>
