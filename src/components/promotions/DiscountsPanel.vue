<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { AdminProduct, Category, Discount, Paged, ProductRef, SaveDiscount } from '@/api/types'
import ProductPicker from '@/components/ProductPicker.vue'
import { formatDateTime, fromLocalInput, offLabel, toLocalInput } from '@/utils/format'
import PromotionStatus from './PromotionStatus.vue'

const discounts = ref<Discount[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const editingId = ref<string | null>(null)
const formOpen = ref(false)
const saving = ref(false)

const emptyForm = (): SaveDiscount => ({
  name: '', type: 'Percentage', value: 10, scope: 'AllProducts', categoryIds: [], productIds: [], startsAt: null, endsAt: null, isActive: true,
})
const form = reactive<SaveDiscount>(emptyForm())
const products = ref<ProductRef[]>([])
const startsAt = ref('')
const endsAt = ref('')

const topCategories = computed(() => categories.value.filter((c) => !c.parentId))
const childrenOf = (id: string) => categories.value.filter((c) => c.parentId === id)
const categoryName = (id: string) => categories.value.find((c) => c.id === id)?.name ?? 'deleted category'

async function load() {
  try {
    const [d, c] = await Promise.all([http.get<Discount[]>('/admin/discounts'), http.get<Category[]>('/admin/categories')])
    discounts.value = d.data
    categories.value = c.data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function scopeLabel(d: Discount) {
  if (d.scope === 'AllProducts') return 'All products'
  if (d.scope === 'Categories') return d.categoryIds.map(categoryName).join(', ')
  return `${d.productIds.length} product${d.productIds.length === 1 ? '' : 's'}`
}

function windowLabel(d: Discount) {
  if (!d.startsAt && !d.endsAt) return 'No end date'
  if (!d.startsAt) return `Until ${formatDateTime(d.endsAt!)}`
  if (!d.endsAt) return `From ${formatDateTime(d.startsAt)}`
  return `${formatDateTime(d.startsAt)} – ${formatDateTime(d.endsAt)}`
}

function openNew() {
  editingId.value = null
  Object.assign(form, emptyForm())
  products.value = []
  startsAt.value = ''
  endsAt.value = ''
  errors.value = {}
  formOpen.value = true
}

async function edit(d: Discount) {
  editingId.value = d.id
  Object.assign(form, { ...d, categoryIds: [...d.categoryIds], productIds: [...d.productIds] })
  startsAt.value = toLocalInput(d.startsAt)
  endsAt.value = toLocalInput(d.endsAt)
  errors.value = {}
  products.value = []
  formOpen.value = true
  if (d.productIds.length) {
    const { data } = await http.get<Paged<AdminProduct>>('/admin/products', { params: { ids: d.productIds, pageSize: 100 }, paramsSerializer: { indexes: null } })
    products.value = data.items.map((p) => ({ id: p.id, name: p.name, sku: p.sku, imageUrl: p.images[0] ?? null, isActive: p.isActive }))
  }
}

function toggleCategory(id: string, checked: boolean) {
  form.categoryIds = checked ? [...form.categoryIds, id] : form.categoryIds.filter((c) => c !== id)
}

async function save() {
  saving.value = true
  error.value = null
  errors.value = {}
  const payload: SaveDiscount = {
    ...form,
    value: Number(form.value) || 0,
    productIds: products.value.map((p) => p.id),
    startsAt: fromLocalInput(startsAt.value),
    endsAt: fromLocalInput(endsAt.value),
  }
  try {
    if (editingId.value) await http.put(`/admin/discounts/${editingId.value}`, payload)
    else await http.post('/admin/discounts', payload)
    formOpen.value = false
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? 'Please fix the highlighted fields.' : errorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove(d: Discount) {
  if (!confirm(`Delete discount “${d.name}”? Prices go back to normal straight away.`)) return
  try {
    await http.delete(`/admin/discounts/${d.id}`)
    if (editingId.value === d.id) formOpen.value = false
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
        <button class="btn btn-primary" @click="openNew">+ New discount</button>
      </div>
      <p v-if="error && !formOpen" class="alert-error mb-4">{{ error }}</p>
      <div v-if="loading" class="h-48 animate-pulse rounded-xl bg-stone-200" />
      <div v-else-if="!discounts.length" class="card p-10 text-center text-stone-600">No discounts yet. Create one to put products on sale.</div>
      <div v-else class="card overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Discount</th>
              <th>Applies to</th>
              <th>When</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in discounts" :key="d.id" :class="{ 'bg-primary/5': editingId === d.id && formOpen }">
              <td>
                <p class="font-medium">{{ d.name }}</p>
                <p class="text-xs text-stone-500">{{ offLabel(d.type, d.value) }}{{ d.type === 'FixedAmount' ? ' each' : '' }}</p>
              </td>
              <td class="max-w-56 truncate text-stone-600">{{ scopeLabel(d) }}</td>
              <td class="text-xs text-stone-600">{{ windowLabel(d) }}</td>
              <td><PromotionStatus :status="d.status" /></td>
              <td class="text-right whitespace-nowrap">
                <button class="text-sm text-stone-600 hover:text-primary" @click="edit(d)">Edit</button>
                <button class="ml-3 text-sm text-stone-600 hover:text-red-600" @click="remove(d)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <form v-if="formOpen" class="card h-fit space-y-4 p-5 lg:sticky lg:top-6" novalidate @submit.prevent="save">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">{{ editingId ? 'Edit discount' : 'New discount' }}</h2>
        <button type="button" class="text-stone-400 hover:text-stone-700" aria-label="Close" @click="formOpen = false">✕</button>
      </div>
      <div>
        <label for="d-name" class="label">Name</label>
        <input id="d-name" v-model="form.name" placeholder="e.g. Summer sale" :class="{ 'input-error': errors.name }" class="input" />
        <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
        <p v-else class="hint">Shown to shoppers next to the sale price.</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="d-type" class="label">Type</label>
          <select id="d-type" v-model="form.type" class="input">
            <option value="Percentage">Percent off</option>
            <option value="FixedAmount">Amount off each</option>
          </select>
        </div>
        <div>
          <label for="d-value" class="label">{{ form.type === 'Percentage' ? 'Percent' : 'Amount (₫)' }}</label>
          <input id="d-value" v-model.number="form.value" type="number" min="1" :max="form.type === 'Percentage' ? 100 : undefined" :step="form.type === 'Percentage' ? 1 : 1000" :class="{ 'input-error': errors.value }" class="input" />
        </div>
      </div>
      <p v-if="errors.value" class="field-error">{{ errors.value }}</p>

      <fieldset>
        <legend class="label">Applies to</legend>
        <div class="flex flex-wrap gap-3 text-sm">
          <label v-for="[k, label] in ([['AllProducts', 'All products'], ['Categories', 'Categories'], ['Products', 'Specific products']] as const)" :key="k" class="flex items-center gap-1.5">
            <input v-model="form.scope" type="radio" :value="k" class="accent-primary" />
            {{ label }}
          </label>
        </div>
      </fieldset>
      <div v-if="form.scope === 'Categories'">
        <div class="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-stone-200 p-3 text-sm">
          <template v-for="c in topCategories" :key="c.id">
            <label class="flex items-center gap-2">
              <input type="checkbox" class="accent-primary" :checked="form.categoryIds.includes(c.id)" @change="toggleCategory(c.id, ($event.target as HTMLInputElement).checked)" />
              {{ c.name }} <span v-if="childrenOf(c.id).length" class="text-xs text-stone-400">(+ subcategories)</span>
            </label>
            <label v-for="child in childrenOf(c.id)" :key="child.id" class="flex items-center gap-2 pl-6">
              <input type="checkbox" class="accent-primary" :checked="form.categoryIds.includes(child.id)" @change="toggleCategory(child.id, ($event.target as HTMLInputElement).checked)" />
              {{ child.name }}
            </label>
          </template>
          <p v-if="!categories.length" class="text-stone-500">No categories yet.</p>
        </div>
        <p v-if="errors.categoryIds" class="field-error">{{ errors.categoryIds }}</p>
      </div>
      <div v-if="form.scope === 'Products'">
        <ProductPicker v-model="products" :max="200" :ordered="false" />
        <p v-if="errors.productIds" class="field-error">{{ errors.productIds }}</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="d-start" class="label">Starts</label>
          <input id="d-start" v-model="startsAt" type="datetime-local" class="input text-xs" />
        </div>
        <div>
          <label for="d-end" class="label">Ends</label>
          <input id="d-end" v-model="endsAt" type="datetime-local" :min="startsAt" :class="{ 'input-error': errors.endsAt }" class="input text-xs" />
        </div>
      </div>
      <p v-if="errors.endsAt" class="field-error">{{ errors.endsAt }}</p>
      <p v-else class="hint -mt-2">Leave empty to start now and run until you turn it off.</p>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-primary" />
        Turned on
      </label>
      <p v-if="error" class="alert-error">{{ error }}</p>
      <button type="submit" class="btn btn-primary w-full" :disabled="saving">{{ saving ? 'Saving…' : editingId ? 'Save discount' : 'Create discount' }}</button>
    </form>
  </div>
</template>
