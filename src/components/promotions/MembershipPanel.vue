<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { MembershipTier, SaveMembershipTier } from '@/api/types'
import ColorField from '@/components/ColorField.vue'
import { money } from '@/utils/format'

const tiers = ref<MembershipTier[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const editingId = ref<string | null>(null)
const formOpen = ref(false)
const saving = ref(false)

const emptyForm = (): SaveMembershipTier => ({ name: '', minSpentMinor: 1_000_000, discountPercent: 3, color: '#94a3b8', benefits: null })
const form = reactive<SaveMembershipTier>(emptyForm())

async function load() {
  try {
    tiers.value = (await http.get<MembershipTier[]>('/admin/membership-tiers')).data
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
  errors.value = {}
  formOpen.value = true
}

function edit(t: MembershipTier) {
  editingId.value = t.id
  Object.assign(form, { name: t.name, minSpentMinor: t.minSpentMinor, discountPercent: t.discountPercent, color: t.color, benefits: t.benefits })
  errors.value = {}
  formOpen.value = true
}

async function save() {
  saving.value = true
  error.value = null
  errors.value = {}
  const payload = { ...form, benefits: form.benefits?.trim() || null, minSpentMinor: Number(form.minSpentMinor) || 0, discountPercent: Number(form.discountPercent) || 0 }
  try {
    if (editingId.value) await http.put(`/admin/membership-tiers/${editingId.value}`, payload)
    else await http.post('/admin/membership-tiers', payload)
    formOpen.value = false
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? 'Please fix the highlighted fields.' : errorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove(t: MembershipTier) {
  const members = t.memberCount ? ` Its ${t.memberCount} member${t.memberCount === 1 ? '' : 's'} will have no tier until their next delivered order.` : ''
  if (!confirm(`Delete tier “${t.name}”?${members}`)) return
  try {
    await http.delete(`/admin/membership-tiers/${t.id}`)
    if (editingId.value === t.id) formOpen.value = false
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}
</script>

<template>
  <div class="grid gap-6" :class="{ 'lg:grid-cols-[1fr_22rem]': formOpen }">
    <div>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-stone-600">
          Customers join a tier once their <strong>delivered</strong> orders reach its threshold. You can also assign tiers on the
          <RouterLink :to="{ name: 'admin-customers' }" class="link">Customers</RouterLink> page.
        </p>
        <button class="btn btn-primary" @click="openNew">+ New tier</button>
      </div>
      <p v-if="error && !formOpen" class="alert-error mb-4">{{ error }}</p>
      <div v-if="loading" class="h-48 animate-pulse rounded-xl bg-stone-200" />
      <div v-else-if="!tiers.length" class="card p-10 text-center text-stone-600">No tiers yet. Add one to start a loyalty program.</div>
      <ol v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="(t, i) in tiers" :key="t.id" :class="{ 'ring-2 ring-primary/30': editingId === t.id && formOpen }" class="card overflow-hidden">
          <div class="h-1.5" :style="{ background: t.color }" />
          <div class="p-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs text-stone-500">Level {{ i + 1 }}</p>
                <p class="text-lg font-semibold" :style="{ color: t.color }">{{ t.name }}</p>
              </div>
              <span class="pill bg-stone-100 text-stone-700">{{ t.discountPercent }}% off</span>
            </div>
            <p class="mt-2 text-sm text-stone-600">From {{ money(t.minSpentMinor) }} spent</p>
            <p v-if="t.benefits" class="mt-1 text-sm text-stone-500">{{ t.benefits }}</p>
            <div class="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-sm">
              <RouterLink :to="{ name: 'admin-customers', query: { tier: t.id } }" class="text-stone-600 hover:text-primary">
                {{ t.memberCount }} member{{ t.memberCount === 1 ? '' : 's' }}
              </RouterLink>
              <span>
                <button class="text-stone-600 hover:text-primary" @click="edit(t)">Edit</button>
                <button class="ml-3 text-stone-600 hover:text-red-600" @click="remove(t)">Delete</button>
              </span>
            </div>
          </div>
        </li>
      </ol>
    </div>

    <form v-if="formOpen" class="card h-fit space-y-4 p-5 lg:sticky lg:top-6" novalidate @submit.prevent="save">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">{{ editingId ? 'Edit tier' : 'New tier' }}</h2>
        <button type="button" class="text-stone-400 hover:text-stone-700" aria-label="Close" @click="formOpen = false">✕</button>
      </div>
      <div>
        <label for="t-name" class="label">Name</label>
        <input id="t-name" v-model="form.name" maxlength="100" placeholder="e.g. Gold" :class="{ 'input-error': errors.name }" class="input" />
        <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="t-min" class="label">Spend to join (₫)</label>
          <input id="t-min" v-model.number="form.minSpentMinor" type="number" min="0" step="100000" :class="{ 'input-error': errors.minSpentMinor }" class="input" />
        </div>
        <div>
          <label for="t-pct" class="label">Discount %</label>
          <input id="t-pct" v-model.number="form.discountPercent" type="number" min="0" max="100" :class="{ 'input-error': errors.discountPercent }" class="input" />
        </div>
      </div>
      <ColorField id="t-color" v-model="form.color" label="Badge color" :error="errors.color" />
      <div>
        <label for="t-benefits" class="label">Benefits <span class="font-normal text-stone-400">(shown to members)</span></label>
        <textarea id="t-benefits" v-model="form.benefits" rows="3" maxlength="1000" class="input" />
      </div>
      <p v-if="error" class="alert-error">{{ error }}</p>
      <button type="submit" class="btn btn-primary w-full" :disabled="saving">{{ saving ? 'Saving…' : editingId ? 'Save tier' : 'Create tier' }}</button>
    </form>
  </div>
</template>
