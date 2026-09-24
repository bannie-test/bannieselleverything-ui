<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { errorMessage } from '@/api/client'
import QuantityStepper from '@/components/QuantityStepper.vue'
import { useCartStore } from '@/stores/cart'
import { useTenantStore } from '@/stores/tenant'
import { money } from '@/utils/format'

const store = useCartStore()
const tenant = useTenantStore()
const busy = ref<string | null>(null)
const error = ref<string | null>(null)

const cart = computed(() => store.cart)
const shipping = computed(() => tenant.info?.flatShippingMinor ?? 0)
const hasUnavailable = computed(() => cart.value.items.some((i) => !i.available))

async function run(productId: string, action: () => Promise<void>) {
  busy.value = productId
  error.value = null
  try {
    await action()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <h1 class="text-2xl font-semibold">Your cart</h1>

  <div v-if="!store.loaded" class="mt-6 h-40 animate-pulse rounded-xl bg-stone-200" />

  <div v-else-if="cart.items.length === 0" class="card mt-6 p-10 text-center">
    <p class="font-medium">Your cart is empty</p>
    <p class="mt-1 text-sm text-stone-600">Find something you like and add it here.</p>
    <RouterLink :to="{ name: 'catalog' }" class="btn btn-primary mt-5">Start shopping</RouterLink>
  </div>

  <div v-else class="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
    <div>
      <p v-if="error" class="alert-error mb-4">{{ error }}</p>
      <ul class="card divide-y divide-stone-100">
        <li v-for="item in cart.items" :key="item.productId" :class="{ 'opacity-60': busy === item.productId }" class="flex gap-4 p-4">
          <RouterLink :to="{ name: 'product', params: { slug: item.slug } }" class="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100 sm:h-24 sm:w-24">
            <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="h-full w-full object-cover" />
          </RouterLink>
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <div class="flex justify-between gap-3">
              <RouterLink :to="{ name: 'product', params: { slug: item.slug } }" class="font-medium hover:text-primary">{{ item.name }}</RouterLink>
              <p class="font-medium whitespace-nowrap">{{ money(item.lineTotalMinor, cart.currency) }}</p>
            </div>
            <p class="text-sm text-stone-500">{{ money(item.unitPriceMinor, cart.currency) }} each</p>
            <p v-if="!item.available" class="text-sm font-medium text-red-600">
              {{ item.stockQuantity === 0 ? 'Out of stock — please remove it.' : `Only ${item.stockQuantity} left — lower the quantity.` }}
            </p>
            <div class="mt-auto flex items-center justify-between gap-3">
              <QuantityStepper
                :model-value="item.quantity"
                :max="Math.max(item.quantity, Math.min(99, item.stockQuantity))"
                :disabled="busy !== null"
                @update:model-value="(q) => run(item.productId, () => store.setQuantity(item.productId, q))"
              />
              <button class="text-sm text-stone-500 hover:text-red-600" :disabled="busy !== null" @click="run(item.productId, () => store.remove(item.productId))">
                Remove
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <aside class="card h-fit p-5 lg:sticky lg:top-32">
      <h2 class="font-semibold">Order summary</h2>
      <dl class="mt-4 space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-stone-600">Subtotal ({{ cart.itemCount }} items)</dt>
          <dd>{{ money(cart.subtotalMinor, cart.currency) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-stone-600">Shipping</dt>
          <dd>{{ shipping ? money(shipping, cart.currency) : 'Free' }}</dd>
        </div>
        <div class="flex justify-between border-t border-stone-100 pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd>{{ money(cart.subtotalMinor + shipping, cart.currency) }}</dd>
        </div>
      </dl>
      <RouterLink
        :to="{ name: 'checkout' }"
        :class="{ 'pointer-events-none opacity-50': hasUnavailable }"
        :aria-disabled="hasUnavailable"
        class="btn btn-primary btn-lg mt-5 w-full"
      >
        Checkout
      </RouterLink>
      <p v-if="hasUnavailable" class="mt-2 text-xs text-red-600">Fix the items marked above to continue.</p>
      <RouterLink :to="{ name: 'catalog' }" class="mt-3 block text-center text-sm text-stone-600 hover:text-primary">Continue shopping</RouterLink>
    </aside>
  </div>
</template>
