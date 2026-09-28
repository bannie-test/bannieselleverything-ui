<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { Address, SavedAddress } from '@/api/types'
import AccountShell from '@/components/AccountShell.vue'
import { useCustomerStore } from '@/stores/customer'

const customer = useCustomerStore()
const addresses = ref<SavedAddress[] | null>(null)
const failed = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)

/** null: form closed; 'new': adding; otherwise the id being edited. */
const editing = ref<string | null>(null)
const form = reactive<Address & { isDefault: boolean }>({
  recipientName: '', phone: '', province: '', district: '', ward: '', streetAddress: '', isDefault: false,
})
const errors = ref<Record<string, string>>({})

const fields: { key: keyof Address; label: string; autocomplete: string; wide?: boolean }[] = [
  { key: 'recipientName', label: 'Full name', autocomplete: 'name' },
  { key: 'phone', label: 'Phone', autocomplete: 'tel' },
  { key: 'streetAddress', label: 'Street address', autocomplete: 'street-address', wide: true },
  { key: 'ward', label: 'Ward', autocomplete: 'address-level4' },
  { key: 'district', label: 'District', autocomplete: 'address-level3' },
  { key: 'province', label: 'Province / City', autocomplete: 'address-level1' },
]

async function load() {
  try {
    addresses.value = (await http.get<SavedAddress[]>('/storefront/account/addresses')).data
  } catch {
    failed.value = true
  }
}
onMounted(load)

function open(address?: SavedAddress) {
  errors.value = {}
  error.value = null
  editing.value = address?.id ?? 'new'
  Object.assign(form, address ?? {
    recipientName: customer.customer?.fullName ?? '', phone: customer.customer?.phone ?? '',
    province: '', district: '', ward: '', streetAddress: '', isDefault: !addresses.value?.length,
  })
}

/** Every change can move the default, so reload the list and the cached profile afterwards. */
async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = null
  try {
    await action()
    await Promise.all([load(), customer.reload()])
    return true
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) error.value = errorMessage(e)
    return false
  } finally {
    busy.value = false
  }
}

async function save() {
  const body = { ...form }
  const ok = await run(() =>
    editing.value === 'new' ? http.post('/storefront/account/addresses', body) : http.put(`/storefront/account/addresses/${editing.value}`, body),
  )
  if (ok) editing.value = null
}

function makeDefault(a: SavedAddress) {
  return run(() => http.post(`/storefront/account/addresses/${a.id}/default`))
}

function remove(a: SavedAddress) {
  if (!confirm(`Delete the address for ${a.recipientName}?`)) return
  return run(() => http.delete(`/storefront/account/addresses/${a.id}`))
}
</script>

<template>
  <AccountShell title="Addresses">
    <template #actions>
      <button v-if="editing === null" class="btn btn-primary" @click="open()">Add address</button>
    </template>

    <p v-if="error" class="alert-error mb-4">{{ error }}</p>

    <form v-if="editing !== null" class="card mb-6 p-5" novalidate @submit.prevent="save">
      <h2 class="font-semibold">{{ editing === 'new' ? 'New address' : 'Edit address' }}</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div v-for="f in fields" :key="f.key" :class="{ 'sm:col-span-2': f.wide }">
          <label :for="`addr-${f.key}`" class="label">{{ f.label }}</label>
          <input
            :id="`addr-${f.key}`"
            v-model="form[f.key]"
            :autocomplete="f.autocomplete"
            :type="f.key === 'phone' ? 'tel' : 'text'"
            required
            :class="{ 'input-error': errors[f.key] }"
            class="input"
          />
          <p v-if="errors[f.key]" class="field-error">{{ errors[f.key] }}</p>
        </div>
      </div>
      <label class="mt-4 flex items-center gap-2 text-sm">
        <input v-model="form.isDefault" type="checkbox" class="h-4 w-4 accent-primary" />
        Use as my default shipping address
      </label>
      <div class="mt-4 flex gap-2">
        <button type="submit" class="btn btn-primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save address' }}</button>
        <button type="button" class="btn btn-secondary" :disabled="busy" @click="editing = null">Cancel</button>
      </div>
    </form>

    <p v-if="failed" class="alert-error">We couldn't load your addresses. Please refresh the page.</p>
    <div v-else-if="!addresses" class="h-40 animate-pulse rounded-xl bg-stone-200" />
    <div v-else-if="addresses.length === 0 && editing === null" class="card p-10 text-center">
      <p class="font-medium">No saved addresses</p>
      <p class="mt-1 text-sm text-stone-600">Save an address to check out faster next time.</p>
    </div>
    <ul v-else class="grid gap-4 sm:grid-cols-2">
      <li v-for="a in addresses" :key="a.id" :class="{ 'border-primary': a.isDefault }" class="card flex flex-col p-4 text-sm">
        <p class="font-medium">
          {{ a.recipientName }}
          <span v-if="a.isDefault" class="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Default</span>
        </p>
        <p class="text-stone-600">{{ a.phone }}</p>
        <p class="mt-1 text-stone-600">{{ a.streetAddress }}, {{ a.ward }}, {{ a.district }}, {{ a.province }}</p>
        <div class="mt-auto flex flex-wrap gap-3 pt-3 text-sm">
          <button class="link" :disabled="busy" @click="open(a)">Edit</button>
          <button v-if="!a.isDefault" class="link" :disabled="busy" @click="makeDefault(a)">Set as default</button>
          <button class="ml-auto text-red-700 hover:underline" :disabled="busy" @click="remove(a)">Delete</button>
        </div>
      </li>
    </ul>
  </AccountShell>
</template>
