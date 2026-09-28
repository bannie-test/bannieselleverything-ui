<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { errorMessage } from '@/api/client'
import CartTotals from '@/components/CartTotals.vue'
import QuantityStepper from '@/components/QuantityStepper.vue'
import SuggestedProducts from '@/components/SuggestedProducts.vue'
import VoucherBox from '@/components/VoucherBox.vue'
import { useCartStore } from '@/stores/cart'
import { useCustomerStore } from '@/stores/customer'
import { money } from '@/utils/format'

const store = useCartStore()
const customer = useCustomerStore()
const busy = ref<string | null>(null)
const error = ref<string | null>(null)

const cart = computed(() => store.cart)
const hasUnavailable = computed(() => cart.value.items.some((i) => !i.available))
const voucherBlocked = computed(() => cart.value.voucher !== null && !cart.value.voucher.applied)
const productIds = computed(() => cart.value.items.map((i) => i.productId))

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

  <template v-else-if="cart.items.length === 0">
    <div class="card mt-6 p-10 text-center">
      <p class="font-medium">Your cart is empty</p>
      <p class="mt-1 text-sm text-stone-600">Find something you like and add it here.</p>
      <RouterLink :to="{ name: 'catalog' }" class="btn btn-primary mt-5">Start shopping</RouterLink>
    </div>
    <SuggestedProducts :product-ids="[]" title="Popular right now" />
  </template>

  <template v-else>
    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
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
                <div class="text-right whitespace-nowrap">
                  <p class="font-medium">{{ money(item.lineTotalMinor - item.discountMinor, cart.currency) }}</p>
                  <s v-if="item.discountMinor" class="text-xs text-stone-400">{{ money(item.lineTotalMinor, cart.currency) }}</s>
                </div>
              </div>
              <p class="text-sm text-stone-500">
                {{ money(item.unitPriceMinor - item.discountMinor / item.quantity, cart.currency) }} each
                <span v-if="item.discountName" class="ml-1 rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-on-accent">{{ item.discountName }}</span>
              </p>
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

      <aside class="card h-fit space-y-5 p-5 lg:sticky lg:top-32">
        <h2 class="font-semibold">Order summary</h2>
        <VoucherBox />
        <CartTotals :cart="cart" />
        <p v-if="!customer.isSignedIn" class="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
          Members get a standing discount on every order.
          <RouterLink :to="{ name: 'login', query: { redirect: '/cart' } }" class="link">Sign in</RouterLink> to see your price.
        </p>
        <div>
          <RouterLink
            :to="{ name: 'checkout' }"
            :class="{ 'pointer-events-none opacity-50': hasUnavailable || voucherBlocked }"
            :aria-disabled="hasUnavailable || voucherBlocked"
            class="btn btn-primary btn-lg w-full"
          >
            Checkout
          </RouterLink>
          <p v-if="hasUnavailable" class="mt-2 text-xs text-red-600">Fix the items marked above to continue.</p>
          <p v-else-if="voucherBlocked" class="mt-2 text-xs text-red-600">Remove the voucher that can't be used to continue.</p>
          <RouterLink :to="{ name: 'catalog' }" class="mt-3 block text-center text-sm text-stone-600 hover:text-primary">Continue shopping</RouterLink>
        </div>
      </aside>
    </div>

    <SuggestedProducts :product-ids="productIds" title="Customers also bought" />
  </template>
</template>
