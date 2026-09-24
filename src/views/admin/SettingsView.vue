<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { ShopSettings } from '@/api/types'
import { minorDigits } from '@/utils/format'

const form = ref<ShopSettings | null>(null)
const failed = ref(false)
const errors = ref<Record<string, string>>({})
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const saving = ref(false)
// Shipping is stored in minor units; the input shows whole currency units (VND has no minor unit).
const shippingInput = ref('')
const scale = 10 ** minorDigits('VND')

onMounted(async () => {
  try {
    form.value = (await http.get<ShopSettings>('/admin/settings')).data
    shippingInput.value = String(form.value.flatShippingMinor / scale)
  } catch {
    failed.value = true
  }
})

async function save() {
  if (!form.value) return
  saving.value = true
  errors.value = {}
  message.value = null
  try {
    const body = { ...form.value, flatShippingMinor: Math.round((Number(shippingInput.value) || 0) * scale) }
    form.value = (await http.put<ShopSettings>('/admin/settings', body)).data
    document.documentElement.style.setProperty('--tenant-primary', form.value.primaryColor)
    message.value = { type: 'success', text: 'Settings saved. Customers see the changes next time they load the shop.' }
  } catch (e) {
    errors.value = fieldErrors(e)
    message.value = { type: 'error', text: Object.keys(errors.value).length ? 'Please fix the highlighted fields.' : errorMessage(e) }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <h1 class="text-2xl font-semibold">Settings</h1>

  <p v-if="failed" class="alert-error mt-6">Couldn't load settings.</p>
  <div v-else-if="!form" class="mt-6 h-64 animate-pulse rounded-xl bg-stone-200" />

  <form v-else class="mt-6 max-w-2xl space-y-6" novalidate @submit.prevent="save">
    <section class="card space-y-4 p-5">
      <h2 class="font-semibold">Shop</h2>
      <div>
        <label for="name" class="label">Shop name</label>
        <input id="name" v-model="form.name" required :class="{ 'input-error': errors.name }" class="input" />
        <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div>
          <label for="logo" class="label">Logo URL (optional)</label>
          <input id="logo" v-model="form.logoUrl" type="url" placeholder="https://…" :class="{ 'input-error': errors.logoUrl }" class="input" />
          <p v-if="errors.logoUrl" class="field-error">{{ errors.logoUrl }}</p>
        </div>
        <div>
          <label for="color" class="label">Brand color</label>
          <div class="flex items-center gap-2">
            <input id="color" v-model="form.primaryColor" type="color" class="h-9 w-12 cursor-pointer rounded border border-stone-300" />
            <input v-model="form.primaryColor" :class="{ 'input-error': errors.primaryColor }" class="input font-mono" aria-label="Brand color hex" />
          </div>
          <p v-if="errors.primaryColor" class="field-error">{{ errors.primaryColor }}</p>
        </div>
      </div>
    </section>

    <section class="card space-y-4 p-5">
      <h2 class="font-semibold">Contact</h2>
      <p class="-mt-2 text-sm text-stone-600">Shown in the storefront footer and on the support page.</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="contactEmail" class="label">Email</label>
          <input id="contactEmail" v-model="form.contactEmail" type="email" :class="{ 'input-error': errors.contactEmail }" class="input" />
          <p v-if="errors.contactEmail" class="field-error">{{ errors.contactEmail }}</p>
        </div>
        <div>
          <label for="contactPhone" class="label">Phone</label>
          <input id="contactPhone" v-model="form.contactPhone" type="tel" class="input" />
        </div>
      </div>
      <div>
        <label for="address" class="label">Address</label>
        <input id="address" v-model="form.address" class="input" />
      </div>
    </section>

    <section class="card space-y-4 p-5">
      <h2 class="font-semibold">Shipping & payment</h2>
      <div class="max-w-xs">
        <label for="shipping" class="label">Flat shipping fee (VND)</label>
        <input id="shipping" v-model="shippingInput" type="number" min="0" inputmode="numeric" :class="{ 'input-error': errors.flatShippingMinor }" class="input" />
        <p v-if="errors.flatShippingMinor" class="field-error">{{ errors.flatShippingMinor }}</p>
        <p v-else class="mt-1 text-xs text-stone-500">Set to 0 for free shipping.</p>
      </div>

      <p class="text-sm">Cash on delivery is always available.</p>
      <label class="flex items-center gap-2 text-sm font-medium">
        <input v-model="form.bankTransferEnabled" type="checkbox" class="h-4 w-4 accent-primary" />
        Accept bank transfers
      </label>
      <div v-if="form.bankTransferEnabled" class="grid gap-4 rounded-lg bg-stone-50 p-4 sm:grid-cols-2">
        <div>
          <label for="bankName" class="label">Bank</label>
          <input id="bankName" v-model="form.bankName" placeholder="Vietcombank" :class="{ 'input-error': errors.bankName }" class="input" />
          <p v-if="errors.bankName" class="field-error">{{ errors.bankName }}</p>
        </div>
        <div>
          <label for="bankAccountNumber" class="label">Account number</label>
          <input id="bankAccountNumber" v-model="form.bankAccountNumber" :class="{ 'input-error': errors.bankAccountNumber }" class="input font-mono" />
          <p v-if="errors.bankAccountNumber" class="field-error">{{ errors.bankAccountNumber }}</p>
        </div>
        <div class="sm:col-span-2">
          <label for="bankAccountName" class="label">Account holder name</label>
          <input id="bankAccountName" v-model="form.bankAccountName" :class="{ 'input-error': errors.bankAccountName }" class="input" />
          <p v-if="errors.bankAccountName" class="field-error">{{ errors.bankAccountName }}</p>
        </div>
        <p class="text-xs text-stone-500 sm:col-span-2">
          Customers see these details after ordering and use the order number as the transfer note. Confirm each payment from the order page.
        </p>
      </div>
    </section>

    <p v-if="message" :class="message.type === 'success' ? 'alert-success' : 'alert-error'">{{ message.text }}</p>
    <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save settings' }}</button>
  </form>
</template>
