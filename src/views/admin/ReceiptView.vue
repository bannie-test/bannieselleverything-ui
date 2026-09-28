<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { AdminOrder, ShopSettings } from '@/api/types'
import { useTenantStore } from '@/stores/tenant'
import { formatDateTime, money, statusLabels } from '@/utils/format'

type Format = 'a4' | 'thermal'

const route = useRoute()
const order = ref<AdminOrder['order'] | null>(null)
const shop = ref<ShopSettings | null>(null)
const error = ref<string | null>(null)
const format = ref<Format>(route.query.format === 'thermal' ? 'thermal' : 'a4')

const print = () => window.print()
useTenantStore().load().catch(() => {})

onMounted(async () => {
  try {
    const number = encodeURIComponent(String(route.params.number))
    const [o, s] = await Promise.all([http.get<AdminOrder>(`/admin/orders/${number}`), http.get<ShopSettings>('/admin/settings')])
    order.value = o.data.order
    shop.value = s.data
    document.title = `Receipt ${o.data.order.orderNumber}`
    if (route.query.print === '1') {
      await nextTick()
      // Give images (the logo) a moment so they make it into the print.
      setTimeout(print, 300)
    }
  } catch (e) {
    error.value = errorMessage(e, 'Order not found.')
  }
})

const currency = computed(() => order.value?.currency ?? 'VND')
const m = (v: number) => money(v, currency.value)
const units = computed(() => order.value?.items.reduce((n, i) => n + i.quantity, 0) ?? 0)
const address = computed(() => {
  const a = order.value?.shippingAddress
  return a ? [a.streetAddress, a.ward, a.district, a.province].filter(Boolean).join(', ') : ''
})
</script>

<template>
  <div class="min-h-screen bg-stone-100 py-6 print:bg-white print:py-0">
    <!-- Toolbar: never printed -->
    <div class="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 print:hidden">
      <RouterLink v-if="order" :to="{ name: 'admin-order', params: { number: order.orderNumber } }" class="text-sm text-stone-600 hover:text-primary">← Back to order</RouterLink>
      <div class="flex items-center gap-2">
        <div class="inline-flex gap-1 rounded-lg bg-stone-200 p-1 text-sm" role="tablist" aria-label="Paper size">
          <button :class="format === 'a4' ? 'tab-active' : ''" class="tab" @click="format = 'a4'">A4 / Letter</button>
          <button :class="format === 'thermal' ? 'tab-active' : ''" class="tab" @click="format = 'thermal'">80 mm receipt</button>
        </div>
        <button class="btn btn-primary" :disabled="!order" @click="print">Print</button>
      </div>
    </div>

    <p v-if="error" class="alert-error mx-auto max-w-3xl">{{ error }}</p>
    <div v-else-if="!order" class="mx-auto h-96 max-w-3xl animate-pulse rounded-xl bg-stone-200" />

    <!-- A4 invoice-style receipt -->
    <article v-else-if="format === 'a4'" class="mx-auto max-w-3xl bg-white p-8 text-sm text-stone-900 shadow-sm sm:p-12 print:max-w-none print:p-0 print:shadow-none">
      <header class="flex flex-wrap items-start justify-between gap-6 border-b border-stone-200 pb-6">
        <div class="flex items-start gap-3">
          <img v-if="shop?.logoUrl" :src="shop.logoUrl" alt="" class="h-12 w-12 rounded object-cover" />
          <div>
            <p class="text-lg font-bold">{{ shop?.name }}</p>
            <p v-if="shop?.address" class="text-stone-600">{{ shop.address }}</p>
            <p class="text-stone-600">{{ [shop?.contactPhone, shop?.contactEmail].filter(Boolean).join(' · ') }}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-2xl font-semibold tracking-tight">Receipt</p>
          <p class="font-mono">{{ order.orderNumber }}</p>
          <p class="text-stone-600">{{ formatDateTime(order.placedAt) }}</p>
          <p class="mt-1 text-xs text-stone-500 uppercase">{{ statusLabels[order.status] }}</p>
        </div>
      </header>

      <section class="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p class="text-xs font-semibold tracking-wide text-stone-500 uppercase">Ship to</p>
          <p class="mt-1 font-medium">{{ order.shippingAddress.recipientName }}</p>
          <p>{{ order.shippingAddress.phone }}</p>
          <p class="text-stone-600">{{ address }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wide text-stone-500 uppercase">Customer</p>
          <p class="mt-1">{{ order.customerEmail }}</p>
          <p class="text-stone-600">{{ order.isGuest ? 'Guest checkout' : 'Registered customer' }}<template v-if="order.membershipTierName"> · {{ order.membershipTierName }} member</template></p>
          <p class="mt-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">Payment</p>
          <p>Cash on delivery</p>
        </div>
      </section>

      <table class="w-full border-y border-stone-200">
        <thead class="text-left text-xs text-stone-500 uppercase">
          <tr class="border-b border-stone-200">
            <th class="py-2 pr-2 font-medium">#</th>
            <th class="py-2 pr-2 font-medium">Item</th>
            <th class="py-2 pr-2 text-right font-medium">Unit price</th>
            <th class="py-2 pr-2 text-right font-medium">Qty</th>
            <th class="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
          <tr v-for="(item, i) in order.items" :key="item.productId" class="align-top">
            <td class="py-2 pr-2 text-stone-500">{{ i + 1 }}</td>
            <td class="py-2 pr-2">
              {{ item.productName }}
              <span v-if="item.discountMinor" class="block text-xs text-stone-500">Sale −{{ m(item.discountMinor) }}</span>
            </td>
            <td class="py-2 pr-2 text-right whitespace-nowrap">{{ m(item.unitPriceMinor) }}</td>
            <td class="py-2 pr-2 text-right">{{ item.quantity }}</td>
            <td class="py-2 text-right whitespace-nowrap">{{ m(item.lineTotalMinor - item.discountMinor) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-4 flex justify-end">
        <dl class="w-full max-w-xs space-y-1">
          <div class="flex justify-between"><dt class="text-stone-600">Subtotal ({{ units }} items)</dt><dd>{{ m(order.subtotalMinor) }}</dd></div>
          <div v-if="order.productDiscountMinor" class="flex justify-between"><dt class="text-stone-600">Sale discounts</dt><dd>−{{ m(order.productDiscountMinor) }}</dd></div>
          <div v-if="order.membershipDiscountMinor" class="flex justify-between"><dt class="text-stone-600">Member discount</dt><dd>−{{ m(order.membershipDiscountMinor) }}</dd></div>
          <div v-if="order.voucherDiscountMinor" class="flex justify-between"><dt class="text-stone-600">Voucher {{ order.voucherCode }}</dt><dd>−{{ m(order.voucherDiscountMinor) }}</dd></div>
          <div class="flex justify-between"><dt class="text-stone-600">Shipping</dt><dd>{{ order.shippingMinor ? m(order.shippingMinor) : 'Free' }}</dd></div>
          <div class="flex justify-between border-t border-stone-300 pt-2 text-base font-semibold"><dt>Total</dt><dd>{{ m(order.totalMinor) }}</dd></div>
        </dl>
      </div>

      <p v-if="order.notes" class="mt-6 rounded-lg bg-stone-50 p-3 text-stone-700 print:border print:border-stone-200"><span class="font-medium">Note:</span> {{ order.notes }}</p>
      <footer class="mt-10 border-t border-stone-200 pt-4 text-center text-xs text-stone-500">Thank you for shopping with {{ shop?.name }}.</footer>
    </article>

    <!-- 80 mm thermal receipt -->
    <article v-else class="mx-auto w-[80mm] bg-white p-4 font-mono text-[11px] leading-snug text-black shadow-sm print:w-auto print:p-0 print:shadow-none">
      <div class="text-center">
        <p class="text-sm font-bold">{{ shop?.name }}</p>
        <p v-if="shop?.address">{{ shop.address }}</p>
        <p v-if="shop?.contactPhone">{{ shop.contactPhone }}</p>
      </div>
      <p class="my-2 border-t border-dashed border-black" />
      <p>Order: {{ order.orderNumber }}</p>
      <p>Date: {{ formatDateTime(order.placedAt) }}</p>
      <p>To: {{ order.shippingAddress.recipientName }} · {{ order.shippingAddress.phone }}</p>
      <p class="my-2 border-t border-dashed border-black" />
      <div v-for="item in order.items" :key="item.productId" class="mb-1">
        <p>{{ item.productName }}</p>
        <p class="flex justify-between"><span>{{ item.quantity }} × {{ m(item.unitPriceMinor) }}</span><span>{{ m(item.lineTotalMinor - item.discountMinor) }}</span></p>
        <p v-if="item.discountMinor" class="text-right">(sale −{{ m(item.discountMinor) }})</p>
      </div>
      <p class="my-2 border-t border-dashed border-black" />
      <p class="flex justify-between"><span>Subtotal</span><span>{{ m(order.subtotalMinor) }}</span></p>
      <p v-if="order.productDiscountMinor" class="flex justify-between"><span>Sale</span><span>−{{ m(order.productDiscountMinor) }}</span></p>
      <p v-if="order.membershipDiscountMinor" class="flex justify-between"><span>Member</span><span>−{{ m(order.membershipDiscountMinor) }}</span></p>
      <p v-if="order.voucherDiscountMinor" class="flex justify-between"><span>{{ order.voucherCode }}</span><span>−{{ m(order.voucherDiscountMinor) }}</span></p>
      <p class="flex justify-between"><span>Shipping</span><span>{{ order.shippingMinor ? m(order.shippingMinor) : 'Free' }}</span></p>
      <p class="mt-1 flex justify-between text-sm font-bold"><span>TOTAL</span><span>{{ m(order.totalMinor) }}</span></p>
      <p class="mt-1">Payment: cash on delivery</p>
      <p class="my-2 border-t border-dashed border-black" />
      <p class="text-center">Thank you!</p>
    </article>
  </div>
</template>
