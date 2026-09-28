<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { MembershipTier, SaveMembershipTier } from '@/api/types'
import BilingualField from '@/components/BilingualField.vue'
import ColorField from '@/components/ColorField.vue'
import { pick, t as tr } from '@/i18n'
import { money } from '@/utils/format'

const tiers = ref<MembershipTier[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const editingId = ref<string | null>(null)
const formOpen = ref(false)
const saving = ref(false)

const emptyForm = (): SaveMembershipTier => ({
  name: '', nameEn: '', minSpentMinor: 1_000_000, discountPercent: 3, color: '#94a3b8', benefits: null, benefitsEn: null,
})
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
  Object.assign(form, {
    name: t.name, nameEn: t.nameEn, minSpentMinor: t.minSpentMinor, discountPercent: t.discountPercent, color: t.color,
    benefits: t.benefits, benefitsEn: t.benefitsEn,
  })
  errors.value = {}
  formOpen.value = true
}

async function save() {
  saving.value = true
  error.value = null
  errors.value = {}
  const payload = { ...form, benefits: form.benefits?.trim() || null, benefitsEn: form.benefitsEn?.trim() || null, minSpentMinor: Number(form.minSpentMinor) || 0, discountPercent: Number(form.discountPercent) || 0 }
  try {
    if (editingId.value) await http.put(`/admin/membership-tiers/${editingId.value}`, payload)
    else await http.post('/admin/membership-tiers', payload)
    formOpen.value = false
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? tr('Please fix the highlighted fields.') : errorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove(t: MembershipTier) {
  const members = t.memberCount ? ` ${tr('Its {n} member(s) will have no tier until their next delivered order.', { n: t.memberCount })}` : ''
  if (!confirm(`${tr('Delete tier “{name}”?', { name: pick(t.name, t.nameEn) })}${members}`)) return
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
          {{ $t('Customers join a tier once their delivered orders reach its threshold. You can also assign tiers on the') }}
          <RouterLink :to="{ name: 'admin-customers' }" class="link">{{ $t('Customers') }}</RouterLink> {{ $t('page.') }}
        </p>
        <button class="btn btn-primary" @click="openNew">+ {{ $t('New tier') }}</button>
      </div>
      <p v-if="error && !formOpen" class="alert-error mb-4">{{ error }}</p>
      <div v-if="loading" class="h-48 animate-pulse rounded-xl bg-stone-200" />
      <div v-else-if="!tiers.length" class="card p-10 text-center text-stone-600">{{ $t('No tiers yet. Add one to start a loyalty program.') }}</div>
      <ol v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="(t, i) in tiers" :key="t.id" :class="{ 'ring-2 ring-primary/30': editingId === t.id && formOpen }" class="card overflow-hidden">
          <div class="h-1.5" :style="{ background: t.color }" />
          <div class="p-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs text-stone-500">{{ $t('Level {n}', { n: i + 1 }) }}</p>
                <p class="text-lg font-semibold" :style="{ color: t.color }">{{ pick(t.name, t.nameEn) }}</p>
              </div>
              <span class="pill bg-stone-100 text-stone-700">{{ $t('{amount} off', { amount: `${t.discountPercent}%` }) }}</span>
            </div>
            <p class="mt-2 text-sm text-stone-600">{{ $t('From {amount} spent', { amount: money(t.minSpentMinor) }) }}</p>
            <p v-if="t.benefits" class="mt-1 text-sm text-stone-500">{{ pick(t.benefits, t.benefitsEn) }}</p>
            <div class="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-sm">
              <RouterLink :to="{ name: 'admin-customers', query: { tier: t.id } }" class="text-stone-600 hover:text-primary">
                {{ t.memberCount === 1 ? $t('1 member') : $t('{n} members', { n: t.memberCount }) }}
              </RouterLink>
              <span>
                <button class="text-stone-600 hover:text-primary" @click="edit(t)">{{ $t('Edit') }}</button>
                <button class="ml-3 text-stone-600 hover:text-red-600" @click="remove(t)">{{ $t('Delete') }}</button>
              </span>
            </div>
          </div>
        </li>
      </ol>
    </div>

    <form v-if="formOpen" class="card h-fit space-y-4 p-5 lg:sticky lg:top-6" novalidate @submit.prevent="save">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">{{ editingId ? $t('Edit tier') : $t('New tier') }}</h2>
        <button type="button" class="text-stone-400 hover:text-stone-700" :aria-label="$t('Close')" @click="formOpen = false">✕</button>
      </div>
      <BilingualField
        id="t-name"
        v-model:vi="form.name"
        v-model:en="form.nameEn"
        :label="$t('Name')"
        required
        stacked
        :maxlength="100"
        placeholder="Vàng"
        placeholder-en="Gold"
        :error="errors.name"
        :error-en="errors.nameEn"
      />
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="t-min" class="label">{{ $t('Spend to join (₫)') }}</label>
          <input id="t-min" v-model.number="form.minSpentMinor" type="number" min="0" step="100000" :class="{ 'input-error': errors.minSpentMinor }" class="input" />
        </div>
        <div>
          <label for="t-pct" class="label">{{ $t('Discount %') }}</label>
          <input id="t-pct" v-model.number="form.discountPercent" type="number" min="0" max="100" :class="{ 'input-error': errors.discountPercent }" class="input" />
        </div>
      </div>
      <ColorField id="t-color" v-model="form.color" :label="$t('Badge color')" :error="errors.color" />
      <div>
        <BilingualField
          id="t-benefits"
          v-model:vi="form.benefits"
          v-model:en="form.benefitsEn"
          :label="`${$t('Benefits')} (${$t('shown to members')})`"
          multiline
          stacked
          :rows="2"
          :maxlength="1000"
          :error="errors.benefits"
          :error-en="errors.benefitsEn"
        />
      </div>
      <p v-if="error" class="alert-error">{{ error }}</p>
      <button type="submit" class="btn btn-primary w-full" :disabled="saving">{{ saving ? $t('Saving…') : editingId ? $t('Save tier') : $t('Create tier') }}</button>
    </form>
  </div>
</template>
