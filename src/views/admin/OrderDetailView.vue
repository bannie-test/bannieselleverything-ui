<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { AdminOrder, OrderStatus } from '@/api/types'
import OrderDetails from '@/components/OrderDetails.vue'
import { statusActions } from '@/utils/format'

const route = useRoute()
const data = ref<AdminOrder | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)
const shipping = reactive({ carrier: '', trackingNumber: '' })
const note = ref('')
const editingTracking = ref(false)

const url = () => `/admin/orders/${encodeURIComponent(String(route.params.number))}`

function apply(next: AdminOrder) {
  data.value = next
  shipping.carrier = next.order.shippingCarrier ?? ''
  shipping.trackingNumber = next.order.trackingNumber ?? ''
}

onMounted(async () => {
  try {
    apply((await http.get<AdminOrder>(url())).data)
  } catch (e) {
    error.value = errorMessage(e, 'Order not found.')
  }
})

async function move(status: OrderStatus) {
  if (status === 'Cancelled' && !confirm('Cancel this order? Reserved stock will be returned to inventory.')) return
  busy.value = true
  error.value = null
  try {
    apply(
      (
        await http.post<AdminOrder>(`${url()}/status`, {
          status,
          shippingCarrier: status === 'Shipped' ? shipping.carrier || null : null,
          trackingNumber: status === 'Shipped' ? shipping.trackingNumber || null : null,
          note: note.value || null,
        })
      ).data,
    )
    note.value = ''
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

async function saveTracking() {
  busy.value = true
  error.value = null
  try {
    apply((await http.put<AdminOrder>(`${url()}/tracking`, { shippingCarrier: shipping.carrier || null, trackingNumber: shipping.trackingNumber || null })).data)
    editingTracking.value = false
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

  <div v-if="data" class="mt-4 grid gap-6 xl:grid-cols-[1fr_20rem]">
    <OrderDetails :order="data.order" />
    <aside class="space-y-4">
      <div class="card h-fit p-5">
        <h2 class="font-semibold">Next step</h2>
        <p v-if="!data.nextStatuses.length" class="mt-2 text-sm text-stone-600">This order is complete. No further actions.</p>
        <p v-if="data.order.status === 'AwaitingPayment'" class="mt-2 text-sm text-stone-600">
          Check your bank account for a transfer of the order total with note
          <span class="font-mono font-medium">{{ data.order.orderNumber }}</span>, then confirm it here.
        </p>

        <div v-if="data.nextStatuses.includes('Shipped')" class="mt-3 space-y-2">
          <div>
            <label for="carrier" class="label">Carrier</label>
            <input id="carrier" v-model="shipping.carrier" maxlength="100" placeholder="GHN, GHTK, Viettel Post…" class="input" />
          </div>
          <div>
            <label for="tracking" class="label">Tracking number</label>
            <input id="tracking" v-model="shipping.trackingNumber" maxlength="100" class="input font-mono" />
          </div>
        </div>

        <div v-if="data.nextStatuses.length" class="mt-3">
          <label for="note" class="label">Note for the customer (optional)</label>
          <input id="note" v-model="note" maxlength="500" class="input" placeholder="Shown on their order timeline" />
        </div>

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
        <p class="mt-4 text-xs text-stone-500">
          Cancelling returns reserved stock to inventory. Shipped orders can no longer be cancelled. The customer is notified of every change.
        </p>
      </div>

      <div v-if="data.order.status === 'Shipped' || data.order.status === 'Delivered'" class="card p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Tracking</h2>
          <button v-if="!editingTracking" class="link text-sm" @click="editingTracking = true">Edit</button>
        </div>
        <form v-if="editingTracking" class="mt-3 space-y-2" @submit.prevent="saveTracking">
          <input v-model="shipping.carrier" maxlength="100" placeholder="Carrier" class="input" aria-label="Carrier" />
          <input v-model="shipping.trackingNumber" maxlength="100" placeholder="Tracking number" class="input font-mono" aria-label="Tracking number" />
          <div class="flex gap-2">
            <button type="submit" class="btn btn-primary" :disabled="busy">Save</button>
            <button type="button" class="btn btn-secondary" @click="editingTracking = false">Cancel</button>
          </div>
        </form>
        <p v-else class="mt-2 text-sm text-stone-600">
          {{ data.order.shippingCarrier ?? 'No carrier' }} · <span class="font-mono">{{ data.order.trackingNumber ?? 'no tracking number' }}</span>
        </p>
      </div>
    </aside>
  </div>
</template>
