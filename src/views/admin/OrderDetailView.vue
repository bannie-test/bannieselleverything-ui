<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { AdminOrder, OrderStatus } from '@/api/types'
import OrderDetails from '@/components/OrderDetails.vue'
import { statusActions } from '@/utils/format'

const route = useRoute()
const data = ref<AdminOrder | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)

const url = () => `/admin/orders/${encodeURIComponent(String(route.params.number))}`

onMounted(async () => {
  try {
    data.value = (await http.get<AdminOrder>(url())).data
  } catch (e) {
    error.value = errorMessage(e, 'Order not found.')
  }
})

async function move(status: OrderStatus) {
  if (status === 'Cancelled' && !confirm('Cancel this order? Reserved stock will be returned to inventory.')) return
  busy.value = true
  error.value = null
  try {
    data.value = (await http.post<AdminOrder>(`${url()}/status`, { status })).data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <RouterLink :to="{ name: 'admin-orders' }" class="text-sm text-stone-600 hover:text-primary">← All orders</RouterLink>

  <p v-if="error" class="alert-error mt-4">{{ error }}</p>
  <div v-if="!data && !error" class="mt-4 h-64 animate-pulse rounded-xl bg-stone-200" />

  <div v-if="data" class="mt-4 grid gap-6 xl:grid-cols-[1fr_18rem]">
    <OrderDetails :order="data.order" />
    <aside class="card h-fit p-5">
      <h2 class="font-semibold">Next step</h2>
      <p v-if="!data.nextStatuses.length" class="mt-2 text-sm text-stone-600">This order is complete. No further actions.</p>
      <div class="mt-3 flex flex-col gap-2">
        <button
          v-for="s in data.nextStatuses"
          :key="s"
          :class="s === 'Cancelled' ? 'btn-danger' : 'btn-primary'"
          class="btn w-full"
          :disabled="busy"
          @click="move(s)"
        >
          {{ statusActions[s] ?? s }}
        </button>
      </div>
      <p class="mt-4 text-xs text-stone-500">Cancelling returns reserved stock to inventory. Shipped orders can no longer be cancelled.</p>
    </aside>
  </div>
</template>
