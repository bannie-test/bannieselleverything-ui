<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { ProductDetail } from '@/api/types'
import PriceTag from '@/components/PriceTag.vue'
import ProductReviews from '@/components/ProductReviews.vue'
import QuantityStepper from '@/components/QuantityStepper.vue'
import SuggestedProducts from '@/components/SuggestedProducts.vue'
import StarRating from '@/components/StarRating.vue'
import WishlistButton from '@/components/WishlistButton.vue'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const cart = useCartStore()

const product = ref<ProductDetail | null>(null)
const notFound = ref(false)
const loadError = ref(false)
const activeImage = ref(0)
const quantity = ref(1)
const adding = ref(false)
const tab = ref<'description' | 'specs'>('description')
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const inCart = computed(() => cart.cart.items.find((i) => i.productId === product.value?.id)?.quantity ?? 0)
const maxAddable = computed(() => Math.max(0, Math.min(99, (product.value?.stockQuantity ?? 0) - inCart.value)))

const availability = computed(() => {
  const p = product.value
  if (!p) return null
  if (p.stockQuantity === 0) return { text: 'Out of stock', class: 'text-red-600', dot: 'bg-red-500' }
  if (p.stockQuantity <= p.lowStockThreshold) return { text: `Only ${p.stockQuantity} left — order soon`, class: 'text-amber-700', dot: 'bg-amber-500' }
  return { text: 'In stock', class: 'text-emerald-700', dot: 'bg-emerald-500' }
})

/** Attributes plus the fixed facts shoppers expect in a spec table. */
const specs = computed(() => {
  const p = product.value
  if (!p) return []
  const rows = Object.entries(p.attributes).map(([name, value]) => ({ name, value, mono: false }))
  if (p.category) rows.push({ name: 'Category', value: p.parentCategory ? `${p.parentCategory.name} › ${p.category.name}` : p.category.name, mono: false })
  if (p.sku) rows.push({ name: 'SKU', value: p.sku, mono: true })
  return rows
})

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
    tab.value = 'description'
    try {
      product.value = (await http.get<ProductDetail>(`/storefront/products/${encodeURIComponent(slug)}`)).data
      document.title = product.value.name
      if (!product.value.description) tab.value = 'specs'
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 404) notFound.value = true
      else loadError.value = true
    }
  },
  { immediate: true },
)

function showImage(delta: number) {
  const count = product.value?.images.length ?? 0
  if (count > 1) activeImage.value = (activeImage.value + delta + count) % count
}

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
      <template v-if="product.parentCategory">
        <span class="mx-1.5">/</span>
        <RouterLink :to="{ name: 'catalog', query: { category: product.parentCategory.slug } }" class="hover:text-primary">{{ product.parentCategory.name }}</RouterLink>
      </template>
      <template v-if="product.category">
        <span class="mx-1.5">/</span>
        <RouterLink :to="{ name: 'catalog', query: { category: product.category.slug } }" class="hover:text-primary">{{ product.category.name }}</RouterLink>
      </template>
    </nav>

    <div class="grid gap-8 md:grid-cols-2 lg:gap-12">
      <!-- Gallery -->
      <div>
        <div
          class="group relative aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          tabindex="0"
          aria-roledescription="carousel"
          :aria-label="`${product.name} images`"
          @keydown.left.prevent="showImage(-1)"
          @keydown.right.prevent="showImage(1)"
        >
          <img v-if="product.images.length" :src="product.images[activeImage]" :alt="`${product.name}, image ${activeImage + 1} of ${product.images.length}`" class="h-full w-full object-cover" />
          <template v-if="product.images.length > 1">
            <button class="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="Previous image" @click="showImage(-1)">‹</button>
            <button class="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="Next image" @click="showImage(1)">›</button>
            <span class="absolute right-3 bottom-3 rounded-full bg-stone-900/70 px-2 py-0.5 text-xs text-white">{{ activeImage + 1 }} / {{ product.images.length }}</span>
          </template>
          <span v-if="product.discountedPriceMinor !== null" class="absolute top-3 left-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent">Sale</span>
        </div>
        <div v-if="product.images.length > 1" class="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="(img, i) in product.images"
            :key="img"
            :class="i === activeImage ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'"
            class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200"
            :aria-label="`Show image ${i + 1}`"
            :aria-current="i === activeImage"
            @click="activeImage = i"
          >
            <img :src="img" alt="" class="h-full w-full object-cover" />
          </button>
        </div>
      </div>

      <!-- Buy box -->
      <div>
        <p v-if="product.category" class="text-sm text-stone-500">{{ product.category.name }}</p>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ product.name }}</h1>
        <a href="#reviews" class="mt-2 inline-flex items-center gap-2 text-sm text-stone-600 hover:text-primary">
          <StarRating :rating="product.ratingAverage" size="md" />
          <span>{{ product.reviewCount ? `${product.ratingAverage?.toFixed(1)} · ${product.reviewCount} review${product.reviewCount === 1 ? '' : 's'}` : 'No reviews yet' }}</span>
        </a>
        <PriceTag
          class="mt-3"
          large
          :price="product.priceMinor"
          :compare-at="product.compareAtPriceMinor"
          :discounted="product.discountedPriceMinor"
          :currency="product.currency"
        />
        <p v-if="product.discountName" class="mt-1 text-sm font-medium text-red-600">{{ product.discountName }}</p>

        <p v-if="availability" class="mt-3 flex items-center gap-2 text-sm font-medium" :class="availability.class">
          <span class="h-2 w-2 rounded-full" :class="availability.dot" aria-hidden="true" />
          {{ availability.text }}
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          <template v-if="product.stockQuantity > 0">
            <QuantityStepper v-model="quantity" :max="Math.max(1, maxAddable)" :disabled="maxAddable === 0" />
            <button class="btn btn-primary btn-lg flex-1 sm:flex-none" :disabled="adding || maxAddable === 0" @click="addToCart">
              {{ adding ? 'Adding…' : 'Add to cart' }}
            </button>
          </template>
          <WishlistButton :product-id="product.id" variant="button" />
        </div>
        <p v-if="inCart && maxAddable === 0 && product.stockQuantity > 0" class="mt-2 text-sm text-stone-600">
          You already have all available stock in your cart.
        </p>
        <p v-else-if="inCart" class="mt-2 text-sm text-stone-600">{{ inCart }} already in your cart.</p>

        <div v-if="message" :class="message.type === 'success' ? 'alert-success' : 'alert-error'" class="mt-4 flex items-center justify-between gap-3">
          <span>{{ message.text }}</span>
          <RouterLink v-if="message.type === 'success'" :to="{ name: 'cart' }" class="font-semibold whitespace-nowrap underline">View cart</RouterLink>
        </div>

        <ul class="mt-6 space-y-1.5 border-t border-stone-100 pt-4 text-sm text-stone-600">
          <li>🚚 Cash on delivery nationwide</li>
          <li>↩ Cancel free of charge until the shop starts processing your order</li>
        </ul>

        <!-- Details -->
        <div v-if="product.description || specs.length" class="mt-8">
          <div class="flex gap-6 border-b border-stone-200 text-sm" role="tablist">
            <button
              v-if="product.description"
              role="tab"
              :aria-selected="tab === 'description'"
              :class="tab === 'description' ? 'border-primary text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'"
              class="-mb-px border-b-2 pb-2 font-medium"
              @click="tab = 'description'"
            >
              Description
            </button>
            <button
              v-if="specs.length"
              role="tab"
              :aria-selected="tab === 'specs'"
              :class="tab === 'specs' ? 'border-primary text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'"
              class="-mb-px border-b-2 pb-2 font-medium"
              @click="tab = 'specs'"
            >
              Specifications
            </button>
          </div>
          <p v-if="tab === 'description'" class="mt-4 leading-relaxed whitespace-pre-line text-stone-700">{{ product.description }}</p>
          <dl v-else class="mt-2 divide-y divide-stone-100 text-sm">
            <div v-for="row in specs" :key="row.name" class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-2.5">
              <dt class="text-stone-500">{{ row.name }}</dt>
              <dd :class="{ 'font-mono': row.mono }">{{ row.value }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <ProductReviews
      :slug="product.slug"
      @changed="(s) => product && Object.assign(product, { ratingAverage: s.ratingAverage, reviewCount: s.reviewCount })"
    />
    <SuggestedProducts :product-ids="[product.id]" />
  </div>
</template>
