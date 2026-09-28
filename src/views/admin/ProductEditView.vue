<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { AdminProduct, Category, ProductRef, SaveProduct } from '@/api/types'
import ImagesEditor from '@/components/ImagesEditor.vue'
import ProductPicker from '@/components/ProductPicker.vue'
import { discountPercent, formatDateTime, money } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const id = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))

const categories = ref<Category[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const saved = ref(false)
const meta = ref<{ createdAt: string; updatedAt: string } | null>(null)

const form = reactive<SaveProduct>({
  name: '',
  slug: null,
  description: null,
  categoryId: null,
  priceMinor: 0,
  compareAtPriceMinor: null,
  stockQuantity: 0,
  lowStockThreshold: 5,
  sku: null,
  isActive: true,
  isFeatured: false,
  images: [],
  attributes: {},
  suggestedProductIds: [],
})
// Edited as rows so order is kept and duplicates can be typed before they're fixed.
const attributeRows = ref<{ key: string; value: string }[]>([])
const suggested = ref<ProductRef[]>([])
let savedSnapshot = ''

function snapshot() {
  return JSON.stringify({ form, attributeRows: attributeRows.value, suggested: suggested.value.map((s) => s.id) })
}
const dirty = computed(() => !loading.value && snapshot() !== savedSnapshot)

function load(p: AdminProduct) {
  Object.assign(form, {
    name: p.name, slug: p.slug, description: p.description, categoryId: p.categoryId, priceMinor: p.priceMinor,
    compareAtPriceMinor: p.compareAtPriceMinor, stockQuantity: p.stockQuantity, lowStockThreshold: p.lowStockThreshold,
    sku: p.sku, isActive: p.isActive, isFeatured: p.isFeatured, images: [...p.images], attributes: p.attributes,
    suggestedProductIds: p.suggestedProductIds,
  })
  attributeRows.value = Object.entries(p.attributes).map(([key, value]) => ({ key, value }))
  suggested.value = p.suggestedProducts
  meta.value = { createdAt: p.createdAt, updatedAt: p.updatedAt }
}

onMounted(async () => {
  try {
    const [cats, product] = await Promise.all([
      http.get<Category[]>('/admin/categories'),
      id.value ? http.get<AdminProduct>(`/admin/products/${id.value}`) : Promise.resolve(null),
    ])
    categories.value = cats.data
    if (product) load(product.data)
  } catch (e) {
    error.value = errorMessage(e, 'Product not found.')
  } finally {
    loading.value = false
    savedSnapshot = snapshot()
  }
})

onBeforeRouteLeave(() => !dirty.value || confirm('You have unsaved changes. Leave without saving?'))

const topCategories = computed(() => categories.value.filter((c) => !c.parentId))
const childrenOf = (parentId: string) => categories.value.filter((c) => c.parentId === parentId)

const stockState = computed(() => {
  if (form.stockQuantity <= 0) return { label: 'Out of stock', tone: 'bg-red-50 text-red-700', shopper: 'Out of stock' }
  if (form.stockQuantity <= form.lowStockThreshold)
    return { label: 'Running low', tone: 'bg-amber-50 text-amber-800', shopper: `Only ${form.stockQuantity} left` }
  return { label: 'In stock', tone: 'bg-emerald-50 text-emerald-700', shopper: 'In stock' }
})
const salePercent = computed(() => discountPercent(form.priceMinor, form.compareAtPriceMinor))

const duplicateKeys = computed(() => {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const r of attributeRows.value) {
    const k = r.key.trim().toLowerCase()
    if (!k) continue
    if (seen.has(k)) dupes.add(k)
    seen.add(k)
  }
  return dupes
})

function addAttribute() {
  attributeRows.value.push({ key: '', value: '' })
}

function moveAttribute(i: number, delta: number) {
  const rows = attributeRows.value
  const j = i + delta
  if (j < 0 || j >= rows.length) return
  ;[rows[i], rows[j]] = [rows[j]!, rows[i]!]
}

async function save() {
  if (duplicateKeys.value.size) {
    error.value = 'Each specification name can only be used once.'
    return
  }
  saving.value = true
  error.value = null
  errors.value = {}
  saved.value = false
  const payload: SaveProduct = {
    ...form,
    slug: form.slug?.trim() || null,
    sku: form.sku?.trim() || null,
    description: form.description?.trim() || null,
    compareAtPriceMinor: form.compareAtPriceMinor || null,
    lowStockThreshold: Math.max(0, Math.floor(form.lowStockThreshold || 0)),
    attributes: Object.fromEntries(attributeRows.value.filter((r) => r.key.trim() && r.value.trim()).map((r) => [r.key.trim(), r.value.trim()])),
    suggestedProductIds: suggested.value.map((s) => s.id),
  }
  try {
    const { data } = id.value
      ? await http.put<AdminProduct>(`/admin/products/${id.value}`, payload)
      : await http.post<AdminProduct>('/admin/products', payload)
    load(data)
    savedSnapshot = snapshot()
    saved.value = true
    if (!id.value) await router.replace({ name: 'admin-product-edit', params: { id: data.id } })
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? 'Please fix the highlighted fields.' : errorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!id.value || !confirm(`Delete “${form.name}”? It will disappear from the storefront. Past orders keep their details.`)) return
  try {
    await http.delete(`/admin/products/${id.value}`)
    savedSnapshot = snapshot()
    await router.replace({ name: 'admin-products' })
  } catch (e) {
    error.value = errorMessage(e)
  }
}
</script>

<template>
  <RouterLink :to="{ name: 'admin-products' }" class="text-sm text-stone-600 hover:text-primary">← All products</RouterLink>
  <div class="mt-2 flex flex-wrap items-center gap-3">
    <h1 class="text-2xl font-semibold">{{ id ? form.name || 'Edit product' : 'New product' }}</h1>
    <span v-if="id && !loading" :class="form.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'" class="pill">
      {{ form.isActive ? 'Visible' : 'Hidden' }}
    </span>
    <span v-if="form.isFeatured" class="pill bg-accent/15 text-stone-800">★ Featured</span>
  </div>

  <div v-if="loading" class="mt-6 h-96 animate-pulse rounded-xl bg-stone-200" />

  <form v-else class="mt-6 grid gap-6 xl:grid-cols-[1fr_20rem]" novalidate @submit.prevent="save">
    <div class="space-y-6">
      <section class="card space-y-4 p-5">
        <h2 class="font-semibold">General</h2>
        <div>
          <label for="name" class="label">Name</label>
          <input id="name" v-model="form.name" required maxlength="300" :class="{ 'input-error': errors.name }" class="input" />
          <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
        </div>
        <div>
          <label for="category" class="label">Category</label>
          <select id="category" v-model="form.categoryId" class="input">
            <option :value="null">— None —</option>
            <template v-for="c in topCategories" :key="c.id">
              <option :value="c.id">{{ c.name }}{{ c.isActive ? '' : ' (hidden)' }}</option>
              <option v-for="child in childrenOf(c.id)" :key="child.id" :value="child.id">&nbsp;&nbsp;— {{ child.name }}{{ child.isActive ? '' : ' (hidden)' }}</option>
            </template>
          </select>
        </div>
        <div>
          <label for="description" class="label">Description</label>
          <textarea id="description" v-model="form.description" rows="6" maxlength="10000" :class="{ 'input-error': errors.description }" class="input" />
          <p class="hint">{{ (form.description ?? '').length.toLocaleString() }}/10,000 characters. Line breaks are kept on the storefront.</p>
        </div>
      </section>

      <section class="card p-5">
        <h2 class="mb-3 font-semibold">Images</h2>
        <ImagesEditor v-model="form.images" :error="errors.images" />
      </section>

      <section class="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 class="font-semibold sm:col-span-2">Pricing</h2>
        <div>
          <label for="price" class="label">Price (₫)</label>
          <input id="price" v-model.number="form.priceMinor" type="number" min="0" step="1000" :class="{ 'input-error': errors.priceMinor }" class="input" />
          <p v-if="errors.priceMinor" class="field-error">{{ errors.priceMinor }}</p>
          <p v-else class="hint">{{ money(form.priceMinor || 0) }}</p>
        </div>
        <div>
          <label for="compareAt" class="label">Compare-at price (₫) <span class="font-normal text-stone-400">(optional)</span></label>
          <input id="compareAt" v-model.number="form.compareAtPriceMinor" type="number" min="0" step="1000" :class="{ 'input-error': errors.compareAtPriceMinor }" class="input" />
          <p v-if="errors.compareAtPriceMinor" class="field-error">{{ errors.compareAtPriceMinor }}</p>
          <p v-else class="hint">{{ salePercent ? `Shown struck through: ${salePercent}% off.` : 'Shown struck through to indicate a sale.' }}</p>
        </div>
        <p class="text-xs text-stone-500 sm:col-span-2">
          Running discounts from <RouterLink :to="{ name: 'admin-promotions', params: { tab: 'discounts' } }" class="link">Promotions</RouterLink> apply on top of this price.
        </p>
      </section>

      <section class="card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-semibold">Inventory</h2>
          <span :class="stockState.tone" class="pill">{{ stockState.label }}</span>
        </div>
        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label for="stock" class="label">Available items</label>
            <input id="stock" v-model.number="form.stockQuantity" type="number" min="0" :class="{ 'input-error': errors.stockQuantity }" class="input" />
            <p v-if="errors.stockQuantity" class="field-error">{{ errors.stockQuantity }}</p>
          </div>
          <div>
            <label for="threshold" class="label">Low-stock warning at</label>
            <input id="threshold" v-model.number="form.lowStockThreshold" type="number" min="0" :class="{ 'input-error': errors.lowStockThreshold }" class="input" />
            <p v-if="errors.lowStockThreshold" class="field-error">{{ errors.lowStockThreshold }}</p>
            <p v-else class="hint">{{ form.lowStockThreshold ? `Warn at ${form.lowStockThreshold} or fewer` : 'Warn only when sold out' }}</p>
          </div>
          <div>
            <label for="sku" class="label">SKU <span class="font-normal text-stone-400">(optional)</span></label>
            <input id="sku" v-model="form.sku" maxlength="100" :class="{ 'input-error': errors.sku }" class="input font-mono" />
          </div>
        </div>
        <p class="mt-3 text-xs text-stone-500">
          Shoppers see: <span class="font-medium text-stone-700">“{{ stockState.shopper }}”</span>. Running-low products are flagged on the dashboard and in the product list.
        </p>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">Specifications</h2>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="attributeRows.length >= 50" @click="addAttribute">+ Add row</button>
        </div>
        <p class="text-sm text-stone-500">Material, size, origin… shown as a table on the product page.</p>
        <div v-if="attributeRows.length" class="mt-3 space-y-2">
          <div v-for="(row, i) in attributeRows" :key="i" class="flex items-center gap-2">
            <div class="flex flex-col">
              <button type="button" class="px-1 text-[10px] text-stone-500 hover:text-stone-900 disabled:opacity-30" :disabled="i === 0" aria-label="Move up" @click="moveAttribute(i, -1)">▲</button>
              <button type="button" class="px-1 text-[10px] text-stone-500 hover:text-stone-900 disabled:opacity-30" :disabled="i === attributeRows.length - 1" aria-label="Move down" @click="moveAttribute(i, 1)">▼</button>
            </div>
            <input
              v-model="row.key"
              placeholder="Name, e.g. Material"
              maxlength="100"
              :class="{ 'input-error': duplicateKeys.has(row.key.trim().toLowerCase()) }"
              class="input w-2/5"
              :aria-label="`Specification ${i + 1} name`"
            />
            <input v-model="row.value" placeholder="Value, e.g. Cotton" maxlength="500" class="input flex-1" :aria-label="`Specification ${i + 1} value`" />
            <button type="button" class="px-1 text-stone-400 hover:text-red-600" :aria-label="`Remove specification ${i + 1}`" @click="attributeRows.splice(i, 1)">✕</button>
          </div>
          <p v-if="duplicateKeys.size" class="field-error">Each name can only be used once.</p>
        </div>
      </section>

      <section class="card p-5">
        <h2 class="font-semibold">Suggested products</h2>
        <p class="mb-3 text-sm text-stone-500">
          Shown first under “You may also like”. The storefront fills any remaining spots with products often bought together and others from the same category.
        </p>
        <ProductPicker v-model="suggested" :exclude-id="id" :max="12" />
        <p v-if="errors.suggestedProductIds" class="field-error">{{ errors.suggestedProductIds }}</p>
      </section>
    </div>

    <aside class="space-y-4 xl:sticky xl:top-6 xl:self-start">
      <section class="card space-y-3 p-5">
        <h2 class="font-semibold">Visibility</h2>
        <label class="flex items-start gap-3 text-sm">
          <input v-model="form.isActive" type="checkbox" class="mt-0.5 h-4 w-4 accent-primary" />
          <span>
            <span class="font-medium">Visible on storefront</span>
            <span class="block text-xs text-stone-500">Untick to hide it without deleting. Hidden products can't be bought.</span>
          </span>
        </label>
        <label class="flex items-start gap-3 text-sm">
          <input v-model="form.isFeatured" type="checkbox" class="mt-0.5 h-4 w-4 accent-primary" />
          <span>
            <span class="font-medium">Featured</span>
            <span class="block text-xs text-stone-500">Listed in the “Featured” section of the home page.</span>
          </span>
        </label>
      </section>

      <section class="card space-y-3 p-5">
        <div>
          <label for="slug" class="label">URL slug</label>
          <input id="slug" v-model="form.slug" placeholder="generated from name" :class="{ 'input-error': errors.slug }" class="input font-mono text-xs" />
          <p v-if="errors.slug" class="field-error">{{ errors.slug }}</p>
          <p v-else-if="form.slug" class="hint truncate">/products/{{ form.slug }}</p>
        </div>
        <dl v-if="meta" class="space-y-1 border-t border-stone-100 pt-3 text-xs">
          <div class="flex justify-between gap-2">
            <dt class="text-stone-500">Created</dt>
            <dd>{{ formatDateTime(meta.createdAt) }}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-stone-500">Last updated</dt>
            <dd>{{ formatDateTime(meta.updatedAt) }}</dd>
          </div>
        </dl>
      </section>

      <p v-if="error" class="alert-error">{{ error }}</p>
      <p v-if="saved && !dirty" class="alert-success">Saved.</p>
      <button type="submit" class="btn btn-primary w-full" :disabled="saving">{{ saving ? 'Saving…' : id ? 'Save changes' : 'Create product' }}</button>
      <p v-if="dirty" class="text-center text-xs text-amber-700">Unsaved changes</p>
      <RouterLink v-if="id && form.slug && form.isActive" :to="{ name: 'product', params: { slug: form.slug } }" target="_blank" class="btn btn-secondary w-full">
        View on storefront ↗
      </RouterLink>
      <button v-if="id" type="button" class="btn btn-danger w-full" @click="remove">Delete product</button>
    </aside>
  </form>
</template>
