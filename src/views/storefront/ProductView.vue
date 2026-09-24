<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { ProductDetail } from '@/api/types'
import PriceTag from '@/components/PriceTag.vue'
import QuantityStepper from '@/components/QuantityStepper.vue'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const cart = useCartStore()

const product = ref<ProductDetail | null>(null)
const notFound = ref(false)
const loadError = ref(false)
const activeImage = ref(0)
const quantity = ref(1)
const adding = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const inCart = computed(() => cart.cart.items.find((i) => i.productId === product.value?.id)?.quantity ?? 0)
const maxAddable = computed(() => Math.max(0, Math.min(99, (product.value?.stockQuantity ?? 0) - inCart.value)))

watch(
  () => route.params.slug,
  async (slug) => {
    if (typeof slug !== 'string') return
    product.value = null
    notFound.value = false
    loadError.value = false
    message.value = null
    activeImage.value = 0
    quantity.value = 1
    try {
      product.value = (await http.get<ProductDetail>(`/storefront/products/${encodeURIComponent(slug)}`)).data
      document.title = product.value.name
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 404) notFound.value = true
      else loadError.value = true
    }
  },
  { immediate: true },
)

async function addToCart() {
  if (!product.value) return
  adding.value = true
  message.value = null
  try {
    await cart.add(product.value.id, quantity.value)
    message.value = { type: 'success', text: `Added ${quantity.value} to your cart.` }
    quantity.value = 1
  } catch (error) {
    message.value = { type: 'error', text: errorMessage(error) }
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <div v-if="notFound" class="py-16 text-center">
    <h1 class="text-2xl font-semibold">Product not found</h1>
    <p class="mt-2 text-stone-600">It may have been removed or is no longer available.</p>
    <RouterLink :to="{ name: 'catalog' }" class="btn btn-primary mt-6">Browse products</RouterLink>
  </div>

  <p v-else-if="loadError" class="alert-error">We couldn't load this product. Please refresh the page.</p>

  <div v-else-if="!product" class="grid gap-8 md:grid-cols-2">
    <div class="aspect-square animate-pulse rounded-2xl bg-stone-200" />
    <div class="space-y-4">
      <div class="h-8 w-2/3 animate-pulse rounded bg-stone-200" />
      <div class="h-6 w-1/3 animate-pulse rounded bg-stone-200" />
      <div class="h-24 animate-pulse rounded bg-stone-200" />
    </div>
  </div>

  <div v-else>
    <nav class="mb-4 text-sm text-stone-500" aria-label="Breadcrumb">
      <RouterLink :to="{ name: 'catalog' }" class="hover:text-primary">Products</RouterLink>
      <template v-if="product.category">
        <span class="mx-1.5">/</span>
        <RouterLink :to="{ name: 'catalog', query: { category: product.category.slug } }" class="hover:text-primary">
          {{ product.category.name }}
        </RouterLink>
      </template>
    </nav>

    <div class="grid gap-8 md:grid-cols-2 lg:gap-12">
      <div>
        <div class="aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
          <img v-if="product.images.length" :src="product.images[activeImage]" :alt="product.name" class="h-full w-full object-cover" />
        </div>
        <div v-if="product.images.length > 1" class="mt-3 flex gap-2">
          <button
            v-for="(img, i) in product.images"
            :key="img"
            :class="i === activeImage ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'"
            class="h-16 w-16 overflow-hidden rounded-lg border border-stone-200"
            :aria-label="`Show image ${i + 1}`"
            @click="activeImage = i"
          >
            <img :src="img" alt="" class="h-full w-full object-cover" />
          </button>
        </div>
      </div>

      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ product.name }}</h1>
        <PriceTag class="mt-3" large :price="product.priceMinor" :compare-at="product.compareAtPriceMinor" :currency="product.currency" />

        <p class="mt-3 text-sm">
          <span v-if="product.stockQuantity === 0" class="font-medium text-red-600">Out of stock</span>
          <span v-else-if="product.stockQuantity <= 5" class="font-medium text-amber-700">Only {{ product.stockQuantity }} left</span>
          <span v-else class="text-emerald-700">In stock</span>
        </p>

        <div v-if="product.stockQuantity > 0" class="mt-6 flex flex-wrap items-center gap-3">
          <QuantityStepper v-model="quantity" :max="Math.max(1, maxAddable)" :disabled="maxAddable === 0" />
          <button class="btn btn-primary btn-lg flex-1 sm:flex-none" :disabled="adding || maxAddable === 0" @click="addToCart">
            {{ adding ? 'Adding…' : 'Add to cart' }}
          </button>
        </div>
        <p v-if="inCart && maxAddable === 0 && product.stockQuantity > 0" class="mt-2 text-sm text-stone-600">
          You already have all available stock in your cart.
        </p>

        <div v-if="message" :class="message.type === 'success' ? 'alert-success' : 'alert-error'" class="mt-4 flex items-center justify-between gap-3">
          <span>{{ message.text }}</span>
          <RouterLink v-if="message.type === 'success'" :to="{ name: 'cart' }" class="font-semibold whitespace-nowrap underline">View cart</RouterLink>
        </div>

        <div v-if="product.description" class="mt-8">
          <h2 class="font-semibold">Description</h2>
          <p class="mt-2 leading-relaxed whitespace-pre-line text-stone-700">{{ product.description }}</p>
        </div>

        <dl v-if="product.sku || Object.keys(product.attributes).length" class="mt-6 divide-y divide-stone-100 border-y border-stone-100 text-sm">
          <div v-for="(value, key) in product.attributes" :key="key" class="flex justify-between py-2">
            <dt class="text-stone-500">{{ key }}</dt>
            <dd>{{ value }}</dd>
          </div>
          <div v-if="product.sku" class="flex justify-between py-2">
            <dt class="text-stone-500">SKU</dt>
            <dd class="font-mono">{{ product.sku }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>
