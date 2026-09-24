<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { errorMessage, http, LAST_ORDER_EMAIL_KEY } from '@/api/client'
import type { Order } from '@/api/types'
import OrderDetails from '@/components/OrderDetails.vue'
import { useCustomerStore } from '@/stores/customer'
import { storage } from '@/utils/storage'

const route = useRoute()
const router = useRouter()
const customer = useCustomerStore()

const order = ref<Order | null>(null)
const error = ref<string | null>(null)
const cancelling = ref(false)
const justPlaced = computed(() => route.query.placed === '1')

async function load(number: string) {
  order.value = null
  error.value = null

  // Signed-in customers see their own orders; guests need the email used at checkout.
  if (customer.isSignedIn) {
    try {
      order.value = (await http.get<Order>(`/storefront/account/orders/${encodeURIComponent(number)}`)).data
      return
    } catch {
      /* may be a guest order placed before signing in */
    }
  }

  const email = storage.get(LAST_ORDER_EMAIL_KEY)
  if (!email) {
    await router.replace({ name: 'track-order', query: { number } })
    return
  }
  try {
    order.value = (await http.get<Order>(`/storefront/orders/${encodeURIComponent(number)}`, { params: { email } })).data
  } catch (e) {
    const status = (e as { response?: { status?: number } }).response?.status
    if (status === 404) await router.replace({ name: 'track-order', query: { number, notFound: '1' } })
    else error.value = errorMessage(e)
  }
}

watch(() => route.params.number, (n) => typeof n === 'string' && load(n), { immediate: true })

async function cancel() {
  if (!order.value || !confirm('Cancel this order?')) return
  cancelling.value = true
  error.value = null
  try {
    order.value = (await http.post<Order>(`/storefront/account/orders/${encodeURIComponent(order.value.orderNumber)}/cancel`)).data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div v-if="justPlaced && order" class="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
      <h1 class="text-xl font-semibold">Thank you! Your order has been placed.</h1>
      <p class="mt-1 text-sm">
        We'll confirm it shortly. Keep your order number <span class="font-mono font-semibold">{{ order.orderNumber }}</span> to track it.
      </p>
    </div>
    <div v-else class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Order details</h1>
      <RouterLink v-if="customer.isSignedIn" :to="{ name: 'my-orders' }" class="link text-sm">← My orders</RouterLink>
    </div>

    <p v-if="error" class="alert-error mb-4">{{ error }}</p>
    <div v-if="!order && !error" class="h-64 animate-pulse rounded-xl bg-stone-200" />

    <template v-if="order">
      <OrderDetails :order="order" />
      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink :to="{ name: 'catalog' }" class="btn btn-primary">Continue shopping</RouterLink>
        <button v-if="order.canCancel && customer.isSignedIn" class="btn btn-danger" :disabled="cancelling" @click="cancel">
          {{ cancelling ? 'Cancelling…' : 'Cancel order' }}
        </button>
      </div>
      <p v-if="order.isGuest && order.status === 'Pending'" class="mt-3 text-sm text-stone-600">
        Need to change or cancel this order? Contact the shop with your order number.
      </p>
    </template>
  </div>
</template>
