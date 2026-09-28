<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { errorMessage, fieldErrors, http, LAST_ORDER_EMAIL_KEY } from '@/api/client'
import type { Address, Order, PaymentMethod, SavedAddress } from '@/api/types'
import CartTotals from '@/components/CartTotals.vue'
import VoucherBox from '@/components/VoucherBox.vue'
import { useCartStore } from '@/stores/cart'
import { useCustomerStore } from '@/stores/customer'
import { useTenantStore } from '@/stores/tenant'
import { money } from '@/utils/format'
import { storage } from '@/utils/storage'

const router = useRouter()
const cartStore = useCartStore()
const customer = useCustomerStore()
const tenant = useTenantStore()

const email = ref('')
const notes = ref('')
const saveAddress = ref(true)
const address = reactive<Address>({ recipientName: '', phone: '', province: '', district: '', ward: '', streetAddress: '' })
const paymentMethod = ref<PaymentMethod>('CashOnDelivery')
const savedAddresses = ref<SavedAddress[]>([])
/** A saved address id, or 'new' to type one in. */
const addressChoice = ref<string>('new')
const errors = ref<Record<string, string>>({})
const submitError = ref<string | null>(null)
const submitting = ref(false)

// One key per checkout attempt: a double-click or a retry after a network error
// returns the same order instead of placing it twice.
const idempotencyKey = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const cart = computed(() => cartStore.cart)
const voucherBlocked = computed(() => cart.value.voucher !== null && !cart.value.voucher.applied)

const fields: { key: keyof Address; label: string; autocomplete: string; wide?: boolean }[] = [
  { key: 'recipientName', label: 'Full name', autocomplete: 'name' },
  { key: 'phone', label: 'Phone', autocomplete: 'tel' },
  { key: 'streetAddress', label: 'Street address', autocomplete: 'street-address', wide: true },
  { key: 'ward', label: 'Ward', autocomplete: 'address-level4' },
  { key: 'district', label: 'District', autocomplete: 'address-level3' },
  { key: 'province', label: 'Province / City', autocomplete: 'address-level1' },
]

function prefill() {
  const c = customer.customer
  if (!c) return
  email.value = c.email
  if (c.defaultAddress) {
    Object.assign(address, c.defaultAddress)
    saveAddress.value = false
  } else {
    address.recipientName ||= c.fullName
    address.phone ||= c.phone ?? ''
  }
}

async function loadSavedAddresses() {
  if (!customer.isSignedIn) return
  try {
    savedAddresses.value = (await http.get<SavedAddress[]>('/storefront/account/addresses')).data
    addressChoice.value = savedAddresses.value.find((a) => a.isDefault)?.id ?? savedAddresses.value[0]?.id ?? 'new'
  } catch {
    /* fall back to typing the address */
  }
}

onMounted(async () => {
  if (!cartStore.loaded) await cartStore.load().catch(() => {})
  await customer.restore()
  prefill()
  await loadSavedAddresses()
})
watch(() => customer.customer, prefill)

async function placeOrder() {
  submitting.value = true
  errors.value = {}
  submitError.value = null
  try {
    const { data } = await http.post<Order>(
      '/storefront/checkout',
      {
        email: customer.isSignedIn ? null : email.value,
        shippingAddress: addressChoice.value === 'new' ? address : null,
        addressId: addressChoice.value === 'new' ? null : addressChoice.value,
        notes: notes.value || null,
        saveAddress: customer.isSignedIn && addressChoice.value === 'new' && saveAddress.value,
        paymentMethod: paymentMethod.value,
      },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    )
    cartStore.reset()
    storage.set(LAST_ORDER_EMAIL_KEY, data.customerEmail)
    await router.replace({ name: 'order', params: { number: data.orderNumber }, query: { placed: '1' } })
  } catch (error) {
    errors.value = fieldErrors(error)
    submitError.value = Object.keys(errors.value).length ? 'Please fix the highlighted fields.' : errorMessage(error)
    // Stock or price problems: refresh the cart so the summary shows what changed.
    cartStore.load().catch(() => {})
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <h1 class="text-2xl font-semibold">Checkout</h1>

  <div v-if="cartStore.loaded && cart.items.length === 0" class="card mt-6 p-10 text-center">
    <p class="font-medium">Your cart is empty</p>
    <RouterLink :to="{ name: 'catalog' }" class="btn btn-primary mt-5">Start shopping</RouterLink>
  </div>

  <form v-else class="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]" novalidate @submit.prevent="placeOrder">
    <div class="space-y-6">
      <section class="card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-semibold">Contact</h2>
          <p v-if="!customer.isSignedIn" class="text-sm text-stone-600">
            Have an account?
            <RouterLink :to="{ name: 'login', query: { redirect: '/checkout' } }" class="link">Sign in</RouterLink>
          </p>
        </div>
        <div class="mt-4">
          <label for="email" class="label">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            :disabled="customer.isSignedIn"
            :class="{ 'input-error': errors.email }"
            class="input"
          />
          <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
          <p v-else class="mt-1 text-xs text-stone-500">We'll send order updates here. You'll need it to track a guest order.</p>
        </div>
      </section>

      <section class="card p-5">
        <h2 class="font-semibold">Shipping address</h2>
        <div v-if="savedAddresses.length" class="mt-4 space-y-2" role="radiogroup" aria-label="Saved addresses">
          <label
            v-for="a in savedAddresses"
            :key="a.id"
            :class="addressChoice === a.id ? 'border-primary bg-primary/5' : 'border-stone-200 hover:border-stone-300'"
            class="flex cursor-pointer gap-3 rounded-lg border-2 p-3 text-sm"
          >
            <input v-model="addressChoice" type="radio" name="address" :value="a.id" class="mt-1 h-4 w-4 accent-primary" />
            <span>
              <span class="font-medium">{{ a.recipientName }}</span> · {{ a.phone }}
              <span v-if="a.isDefault" class="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">Default</span>
              <span class="block text-stone-600">{{ a.streetAddress }}, {{ a.ward }}, {{ a.district }}, {{ a.province }}</span>
            </span>
          </label>
          <label
            :class="addressChoice === 'new' ? 'border-primary bg-primary/5' : 'border-stone-200 hover:border-stone-300'"
            class="flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-sm font-medium"
          >
            <input v-model="addressChoice" type="radio" name="address" value="new" class="h-4 w-4 accent-primary" />
            Ship to a different address
          </label>
        </div>
        <div v-if="addressChoice === 'new'" class="mt-4 grid gap-4 sm:grid-cols-2">
          <div v-for="f in fields" :key="f.key" :class="{ 'sm:col-span-2': f.wide }">
            <label :for="f.key" class="label">{{ f.label }}</label>
            <input
              :id="f.key"
              v-model="address[f.key]"
              :autocomplete="f.autocomplete"
              :type="f.key === 'phone' ? 'tel' : 'text'"
              required
              :class="{ 'input-error': errors[`shippingAddress.${f.key}`] }"
              class="input"
            />
            <p v-if="errors[`shippingAddress.${f.key}`]" class="field-error">{{ errors[`shippingAddress.${f.key}`] }}</p>
          </div>
        </div>
        <label v-if="customer.isSignedIn && addressChoice === 'new'" class="mt-4 flex items-center gap-2 text-sm">
          <input v-model="saveAddress" type="checkbox" class="h-4 w-4 accent-primary" />
          Save this address to my account
        </label>
      </section>

      <section class="card p-5">
        <h2 class="font-semibold">Payment</h2>
        <div class="mt-3 space-y-2" role="radiogroup" aria-label="Payment method">
          <label
            :class="paymentMethod === 'CashOnDelivery' ? 'border-primary bg-primary/5' : 'border-stone-200 hover:border-stone-300'"
            class="flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-sm"
          >
            <input v-model="paymentMethod" type="radio" name="payment" value="CashOnDelivery" class="h-4 w-4 accent-primary" />
            <span>
              <span class="block font-medium">Cash on delivery</span>
              <span class="text-stone-600">Pay the courier when your order arrives.</span>
            </span>
          </label>
          <label
            v-if="tenant.info?.bankTransfer"
            :class="paymentMethod === 'BankTransfer' ? 'border-primary bg-primary/5' : 'border-stone-200 hover:border-stone-300'"
            class="flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-sm"
          >
            <input v-model="paymentMethod" type="radio" name="payment" value="BankTransfer" class="h-4 w-4 accent-primary" />
            <span>
              <span class="block font-medium">Bank transfer</span>
              <span class="text-stone-600">
                Transfer to {{ tenant.info.bankTransfer.bankName }} after placing the order. We ship once the payment arrives.
              </span>
            </span>
          </label>
        </div>
        <label for="notes" class="label mt-4">Order note (optional)</label>
        <textarea id="notes" v-model="notes" rows="2" maxlength="2000" class="input" placeholder="Delivery instructions, gift message…" />
      </section>
    </div>

    <aside class="card h-fit p-5 lg:sticky lg:top-32">
      <h2 class="font-semibold">Your order</h2>
      <ul class="mt-4 max-h-64 space-y-3 overflow-y-auto text-sm">
        <li v-for="item in cart.items" :key="item.productId" class="flex justify-between gap-3">
          <span class="min-w-0">
            <span class="line-clamp-1">{{ item.name }}</span>
            <span class="text-stone-500">× {{ item.quantity }}</span>
            <span v-if="!item.available" class="block text-xs text-red-600">Not enough stock</span>
          </span>
          <span class="text-right whitespace-nowrap">
            {{ money(item.lineTotalMinor - item.discountMinor, cart.currency) }}
            <s v-if="item.discountMinor" class="block text-xs text-stone-400">{{ money(item.lineTotalMinor, cart.currency) }}</s>
          </span>
        </li>
      </ul>
      <div class="mt-4 border-t border-stone-100 pt-4">
        <VoucherBox />
      </div>
      <CartTotals class="mt-4 border-t border-stone-100 pt-4" :cart="cart" />
      <p v-if="voucherBlocked" class="alert-error mt-4">Remove the voucher that can't be used, or fix what it needs, to place your order.</p>
      <p v-if="submitError" class="alert-error mt-4">{{ submitError }}</p>
      <button type="submit" class="btn btn-primary btn-lg mt-5 w-full" :disabled="submitting || !cartStore.loaded || voucherBlocked">
        {{ submitting ? 'Placing order…' : 'Place order' }}
      </button>
      <RouterLink :to="{ name: 'cart' }" class="mt-3 block text-center text-sm text-stone-600 hover:text-primary">Back to cart</RouterLink>
    </aside>
  </form>
</template>
