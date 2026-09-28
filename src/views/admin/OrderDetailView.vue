<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { AdminOrder, OrderStatus } from '@/api/types'
import OrderDetails from '@/components/OrderDetails.vue'
import { t } from '@/i18n'
import { statusActions, statusLabels } from '@/utils/format'

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
    error.value = errorMessage(e, t('Order not found.'))
  }
})

async function move(status: OrderStatus) {
  if (status === 'Cancelled' && !confirm(t('Cancel this order? Reserved stock will be returned to inventory.'))) return
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
  <div class="flex flex-wrap items-center justify-between gap-3">
    <RouterLink :to="{ name: 'admin-orders' }" class="text-sm text-stone-600 hover:text-primary">← {{ $t('All orders') }}</RouterLink>
    <RouterLink
      v-if="data"
      :to="{ name: 'admin-receipt', params: { number: data.order.orderNumber }, query: { print: '1' } }"
      target="_blank"
      class="btn btn-secondary"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v7H7v-7Z" />
      </svg>
      {{ $t('Print receipt') }}
    </RouterLink>
  </div>

  <p v-if="error" class="alert-error mt-4">{{ error }}</p>
  <div v-if="!data && !error" class="mt-4 h-64 animate-pulse rounded-xl bg-stone-200" />

  <div v-if="data" class="mt-4 grid gap-6 xl:grid-cols-[1fr_20rem]">
    <OrderDetails :order="data.order" />
    <aside class="space-y-4">
      <div class="card h-fit p-5">
        <h2 class="font-semibold">{{ $t('Next step') }}</h2>
        <p v-if="!data.nextStatuses.length" class="mt-2 text-sm text-stone-600">{{ $t('This order is complete. No further actions.') }}</p>
        <p v-if="data.order.status === 'AwaitingPayment'" class="mt-2 text-sm text-stone-600">
          {{ $t('Check your bank account for a transfer of the order total with note') }}
          <span class="font-mono font-medium">{{ data.order.orderNumber }}</span>{{ $t(', then confirm it here.') }}
        </p>

        <div v-if="data.nextStatuses.includes('Shipped')" class="mt-3 space-y-2">
          <div>
            <label for="carrier" class="label">{{ $t('Carrier') }}</label>
            <input id="carrier" v-model="shipping.carrier" maxlength="100" :placeholder="$t('GHN, GHTK, Viettel Post…')" class="input" />
          </div>
          <div>
            <label for="tracking" class="label">{{ $t('Tracking number') }}</label>
            <input id="tracking" v-model="shipping.trackingNumber" maxlength="100" class="input font-mono" />
          </div>
        </div>

        <div v-if="data.nextStatuses.length" class="mt-3">
          <label for="note" class="label">{{ $t('Note for the customer (optional)') }}</label>
          <input id="note" v-model="note" maxlength="500" class="input" :placeholder="$t('Shown on their order timeline')" />
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
            {{ $t(statusActions[s] ?? statusLabels[s]) }}
          </button>
        </div>
        <p class="mt-4 text-xs text-stone-500">
          {{ $t('Cancelling returns reserved stock to inventory. Shipped orders can no longer be cancelled. The customer is notified of every change.') }}
        </p>
      </div>

      <div v-if="data.order.status === 'Shipped' || data.order.status === 'Delivered'" class="card p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ $t('Tracking') }}</h2>
          <button v-if="!editingTracking" class="link text-sm" @click="editingTracking = true">{{ $t('Edit') }}</button>
        </div>
        <form v-if="editingTracking" class="mt-3 space-y-2" @submit.prevent="saveTracking">
          <input v-model="shipping.carrier" maxlength="100" :placeholder="$t('Carrier')" class="input" :aria-label="$t('Carrier')" />
          <input v-model="shipping.trackingNumber" maxlength="100" :placeholder="$t('Tracking number')" class="input font-mono" :aria-label="$t('Tracking number')" />
          <div class="flex gap-2">
            <button type="submit" class="btn btn-primary" :disabled="busy">{{ $t('Save') }}</button>
            <button type="button" class="btn btn-secondary" @click="editingTracking = false">{{ $t('Cancel') }}</button>
          </div>
        </form>
        <p v-else class="mt-2 text-sm text-stone-600">
          {{ data.order.shippingCarrier ?? $t('No carrier') }} · <span class="font-mono">{{ data.order.trackingNumber ?? $t('no tracking number') }}</span>
        </p>
      </div>
    </aside>
  </div>
</template>
