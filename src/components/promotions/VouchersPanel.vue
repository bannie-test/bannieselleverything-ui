<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { SaveVoucher, Voucher } from '@/api/types'
import { formatDate, fromLocalInput, money, offLabel, toLocalInput } from '@/utils/format'
import PromotionStatus from './PromotionStatus.vue'

const vouchers = ref<Voucher[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const editingId = ref<string | null>(null)
const formOpen = ref(false)
const saving = ref(false)
const copied = ref<string | null>(null)

const emptyForm = (): SaveVoucher => ({
  code: '', description: null, type: 'Percentage', value: 10, maxDiscountMinor: null, minSubtotalMinor: 0,
  startsAt: null, endsAt: null, usageLimit: null, perCustomerLimit: 1, isActive: true,
})
const form = reactive<SaveVoucher>(emptyForm())
const startsAt = ref('')
const endsAt = ref('')

async function load() {
  try {
    vouchers.value = (await http.get<Voucher[]>('/admin/vouchers')).data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function openNew() {
  editingId.value = null
  Object.assign(form, emptyForm())
  startsAt.value = ''
  endsAt.value = ''
  errors.value = {}
  formOpen.value = true
}

function edit(v: Voucher) {
  editingId.value = v.id
  Object.assign(form, v)
  startsAt.value = toLocalInput(v.startsAt)
  endsAt.value = toLocalInput(v.endsAt)
  errors.value = {}
  formOpen.value = true
}

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  form.code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

async function copy(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    copied.value = code
    setTimeout(() => (copied.value = null), 1500)
  } catch {
    /* clipboard blocked; the code is visible anyway */
  }
}

const blankToNull = (v: number | null | string) => (v === '' || v === null || Number.isNaN(Number(v)) ? null : Number(v))

async function save() {
  saving.value = true
  error.value = null
  errors.value = {}
  const payload: SaveVoucher = {
    ...form,
    code: form.code.trim().toUpperCase(),
    description: form.description?.trim() || null,
    value: form.type === 'FreeShipping' ? 0 : Number(form.value) || 0,
    maxDiscountMinor: form.type === 'Percentage' ? blankToNull(form.maxDiscountMinor) : null,
    minSubtotalMinor: Number(form.minSubtotalMinor) || 0,
    usageLimit: blankToNull(form.usageLimit),
    perCustomerLimit: blankToNull(form.perCustomerLimit),
    startsAt: fromLocalInput(startsAt.value),
    endsAt: fromLocalInput(endsAt.value),
  }
  try {
    if (editingId.value) await http.put(`/admin/vouchers/${editingId.value}`, payload)
    else await http.post('/admin/vouchers', payload)
    formOpen.value = false
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? 'Please fix the highlighted fields.' : errorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove(v: Voucher) {
  if (!confirm(`Delete voucher ${v.code}? Customers can no longer use it; past orders keep their discount.`)) return
  try {
    await http.delete(`/admin/vouchers/${v.id}`)
    if (editingId.value === v.id) formOpen.value = false
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}
</script>

<template>
  <div class="grid gap-6" :class="{ 'lg:grid-cols-[1fr_24rem]': formOpen }">
    <div>
      <div class="mb-3 flex justify-end">
        <button class="btn btn-primary" @click="openNew">+ New voucher</button>
      </div>
      <p v-if="error && !formOpen" class="alert-error mb-4">{{ error }}</p>
      <div v-if="loading" class="h-48 animate-pulse rounded-xl bg-stone-200" />
      <div v-else-if="!vouchers.length" class="card p-10 text-center text-stone-600">No vouchers yet.</div>
      <div v-else class="card overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Benefit</th>
              <th class="text-right">Used</th>
              <th>Valid</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in vouchers" :key="v.id" :class="{ 'bg-primary/5': editingId === v.id && formOpen }">
              <td>
                <button class="font-mono font-semibold hover:text-primary" :title="'Copy code'" @click="copy(v.code)">{{ v.code }}</button>
                <span v-if="copied === v.code" class="ml-2 text-xs text-emerald-700">Copied</span>
                <p v-if="v.description" class="max-w-56 truncate text-xs text-stone-500">{{ v.description }}</p>
              </td>
              <td class="text-sm">
                {{ offLabel(v.type, v.value) }}
                <span v-if="v.maxDiscountMinor" class="block text-xs text-stone-500">up to {{ money(v.maxDiscountMinor) }}</span>
                <span v-if="v.minSubtotalMinor" class="block text-xs text-stone-500">min. spend {{ money(v.minSubtotalMinor) }}</span>
              </td>
              <td class="text-right whitespace-nowrap">
                {{ v.usedCount }}<span class="text-stone-400"> / {{ v.usageLimit ?? '∞' }}</span>
                <span v-if="v.perCustomerLimit" class="block text-xs text-stone-500">{{ v.perCustomerLimit }}× per customer</span>
              </td>
              <td class="text-xs whitespace-nowrap text-stone-600">
                <template v-if="!v.startsAt && !v.endsAt">Always</template>
                <template v-else>{{ v.startsAt ? formatDate(v.startsAt) : 'Now' }} – {{ v.endsAt ? formatDate(v.endsAt) : 'no end' }}</template>
              </td>
              <td><PromotionStatus :status="v.status" /></td>
              <td class="text-right whitespace-nowrap">
                <button class="text-sm text-stone-600 hover:text-primary" @click="edit(v)">Edit</button>
                <button class="ml-3 text-sm text-stone-600 hover:text-red-600" @click="remove(v)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <form v-if="formOpen" class="card h-fit space-y-4 p-5 lg:sticky lg:top-6" novalidate @submit.prevent="save">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">{{ editingId ? 'Edit voucher' : 'New voucher' }}</h2>
        <button type="button" class="text-stone-400 hover:text-stone-700" aria-label="Close" @click="formOpen = false">✕</button>
      </div>
      <div>
        <label for="v-code" class="label">Code</label>
        <div class="flex gap-2">
          <input id="v-code" v-model="form.code" placeholder="e.g. WELCOME10" maxlength="40" :class="{ 'input-error': errors.code }" class="input font-mono uppercase" />
          <button type="button" class="btn btn-secondary shrink-0" @click="generateCode">Generate</button>
        </div>
        <p v-if="errors.code" class="field-error">{{ errors.code }}</p>
      </div>
      <div>
        <label for="v-desc" class="label">Description <span class="font-normal text-stone-400">(shown to customers)</span></label>
        <input id="v-desc" v-model="form.description" maxlength="500" class="input" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div :class="{ 'col-span-2': form.type === 'FreeShipping' }">
          <label for="v-type" class="label">Type</label>
          <select id="v-type" v-model="form.type" class="input">
            <option value="Percentage">Percent off</option>
            <option value="FixedAmount">Amount off</option>
            <option value="FreeShipping">Free shipping</option>
          </select>
        </div>
        <div v-if="form.type !== 'FreeShipping'">
          <label for="v-value" class="label">{{ form.type === 'Percentage' ? 'Percent' : 'Amount (₫)' }}</label>
          <input id="v-value" v-model.number="form.value" type="number" min="1" :step="form.type === 'Percentage' ? 1 : 1000" :class="{ 'input-error': errors.value }" class="input" />
        </div>
      </div>
      <p v-if="errors.value" class="field-error">{{ errors.value }}</p>
      <div class="grid grid-cols-2 gap-3">
        <div v-if="form.type === 'Percentage'">
          <label for="v-max" class="label">Max discount (₫)</label>
          <input id="v-max" v-model.number="form.maxDiscountMinor" type="number" min="0" step="1000" placeholder="No cap" class="input" />
        </div>
        <div :class="{ 'col-span-2': form.type !== 'Percentage' }">
          <label for="v-min" class="label">Minimum spend (₫)</label>
          <input id="v-min" v-model.number="form.minSubtotalMinor" type="number" min="0" step="1000" class="input" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="v-limit" class="label">Total uses</label>
          <input id="v-limit" v-model.number="form.usageLimit" type="number" min="1" placeholder="Unlimited" :class="{ 'input-error': errors.usageLimit }" class="input" />
        </div>
        <div>
          <label for="v-per" class="label">Per customer</label>
          <input id="v-per" v-model.number="form.perCustomerLimit" type="number" min="1" placeholder="Unlimited" class="input" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="v-start" class="label">Valid from</label>
          <input id="v-start" v-model="startsAt" type="datetime-local" class="input text-xs" />
        </div>
        <div>
          <label for="v-end" class="label">Valid until</label>
          <input id="v-end" v-model="endsAt" type="datetime-local" :min="startsAt" :class="{ 'input-error': errors.endsAt }" class="input text-xs" />
        </div>
      </div>
      <p v-if="errors.endsAt" class="field-error">{{ errors.endsAt }}</p>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-primary" />
        Turned on
      </label>
      <p v-if="error" class="alert-error">{{ error }}</p>
      <button type="submit" class="btn btn-primary w-full" :disabled="saving">{{ saving ? 'Saving…' : editingId ? 'Save voucher' : 'Create voucher' }}</button>
    </form>
  </div>
</template>
