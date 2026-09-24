<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { ProductSummary } from '@/api/types'
import PriceTag from './PriceTag.vue'
import StarRating from './StarRating.vue'
import WishlistButton from './WishlistButton.vue'

defineProps<{ product: ProductSummary }>()
</script>

<template>
  <!-- The heart sits beside the link, not inside it: a button can't be nested in an anchor. -->
  <div class="group relative">
    <RouterLink
      :to="{ name: 'product', params: { slug: product.slug } }"
      class="flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:shadow-md"
    >
      <div class="relative aspect-square overflow-hidden bg-stone-100">
        <img
          v-if="product.imageUrl"
          :src="product.imageUrl"
          :alt="product.name"
          loading="lazy"
          class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span
          v-if="!product.inStock"
          class="absolute top-2 left-2 rounded-full bg-stone-900/80 px-2.5 py-1 text-xs font-medium text-white"
        >
          Sold out
        </span>
      </div>
      <div class="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p v-if="product.category" class="text-xs text-stone-500">{{ product.category.name }}</p>
        <h3 class="line-clamp-2 text-sm font-medium text-stone-900 sm:text-base">{{ product.name }}</h3>
        <StarRating v-if="product.reviewCount" :rating="product.ratingAverage" :count="product.reviewCount" />
        <PriceTag
          class="mt-auto pt-1"
          :price="product.priceMinor"
          :compare-at="product.compareAtPriceMinor"
          :currency="product.currency"
        />
      </div>
    </RouterLink>
    <WishlistButton :product-id="product.id" class="absolute top-2 right-2" />
  </div>
</template>
