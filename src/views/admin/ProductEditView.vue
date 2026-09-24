<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { AdminProduct, Category, SaveProduct } from '@/api/types'

const route = useRoute()
const router = useRouter()
const id = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))

const categories = ref<Category[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const saved = ref(false)

const form = reactive<SaveProduct>({
  name: '',
  slug: null,
  description: null,
  categoryId: null,
  priceMinor: 0,
  compareAtPriceMinor: null,
  stockQuantity: 0,
  sku: null,
  isActive: true,
  images: [],
  attributes: {},
})
// Edited as text: one image URL per line, "Key: Value" per attribute line.
const imagesText = ref('')
const attributesText = ref('')

onMounted(async () => {
  try {
    const [cats, product] = await Promise.all([
      http.get<Category[]>('/admin/categories'),
      id.value ? http.get<AdminProduct>(`/admin/products/${id.value}`) : Promise.resolve(null),
    ])
    categories.value = cats.data
    if (product) {
      const p = product.data
      Object.assign(form, {
        name: p.name, slug: p.slug, description: p.description, categoryId: p.categoryId, priceMinor: p.priceMinor,
        compareAtPriceMinor: p.compareAtPriceMinor, stockQuantity: p.stockQuantity, sku: p.sku, isActive: p.isActive,
      })
      imagesText.value = p.images.join('\n')
      attributesText.value = Object.entries(p.attributes).map(([k, v]) => `${k}: ${v}`).join('\n')
    }
  } catch (e) {
    error.value = errorMessage(e, 'Product not found.')
  } finally {
    loading.value = false
  }
})

const previewImages = computed(() => imagesText.value.split('\n').map((l) => l.trim()).filter(Boolean))

function parseAttributes(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const i = line.indexOf(':')
    if (i > 0 && line.slice(i + 1).trim()) result[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return result
}

async function save() {
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
    images: previewImages.value,
    attributes: parseAttributes(attributesText.value),
  }
  try {
    if (id.value) {
      const { data } = await http.put<AdminProduct>(`/admin/products/${id.value}`, payload)
      form.slug = data.slug
      saved.value = true
    } else {
      const { data } = await http.post<AdminProduct>('/admin/products', payload)
      await router.replace({ name: 'admin-product-edit', params: { id: data.id } })
      form.slug = data.slug
      saved.value = true
    }
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
    await router.replace({ name: 'admin-products' })
  } catch (e) {
    error.value = errorMessage(e)
  }
}
</script>

<template>
  <RouterLink :to="{ name: 'admin-products' }" class="text-sm text-stone-600 hover:text-primary">← All products</RouterLink>
  <h1 class="mt-2 text-2xl font-semibold">{{ id ? 'Edit product' : 'New product' }}</h1>

  <div v-if="loading" class="mt-6 h-96 animate-pulse rounded-xl bg-stone-200" />

  <form v-else class="mt-6 grid gap-6 xl:grid-cols-[1fr_20rem]" novalidate @submit.prevent="save">
    <div class="space-y-6">
      <section class="card space-y-4 p-5">
        <div>
          <label for="name" class="label">Name</label>
          <input id="name" v-model="form.name" required :class="{ 'input-error': errors.name }" class="input" />
          <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
        </div>
        <div>
          <label for="description" class="label">Description</label>
          <textarea id="description" v-model="form.description" rows="5" class="input" />
        </div>
        <div>
          <label for="images" class="label">Image URLs <span class="font-normal text-stone-400">(one per line, first is the main image)</span></label>
          <textarea id="images" v-model="imagesText" rows="3" class="input font-mono text-xs" placeholder="https://…" :class="{ 'input-error': errors.images }" />
          <p v-if="errors.images" class="field-error">{{ errors.images }}</p>
          <div v-if="previewImages.length" class="mt-2 flex flex-wrap gap-2">
            <img v-for="src in previewImages" :key="src" :src="src" alt="" class="h-16 w-16 rounded-md border border-stone-200 object-cover" />
          </div>
        </div>
        <div>
          <label for="attributes" class="label">Attributes <span class="font-normal text-stone-400">(one “Name: Value” per line)</span></label>
          <textarea id="attributes" v-model="attributesText" rows="3" class="input" placeholder="Material: Cotton&#10;Origin: Vietnam" />
        </div>
      </section>

      <section class="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label for="price" class="label">Price (₫)</label>
          <input id="price" v-model.number="form.priceMinor" type="number" min="0" step="1000" :class="{ 'input-error': errors.priceMinor }" class="input" />
          <p v-if="errors.priceMinor" class="field-error">{{ errors.priceMinor }}</p>
        </div>
        <div>
          <label for="compareAt" class="label">Compare-at price (₫) <span class="font-normal text-stone-400">(optional)</span></label>
          <input id="compareAt" v-model.number="form.compareAtPriceMinor" type="number" min="0" step="1000" :class="{ 'input-error': errors.compareAtPriceMinor }" class="input" />
          <p v-if="errors.compareAtPriceMinor" class="field-error">{{ errors.compareAtPriceMinor }}</p>
          <p v-else class="mt-1 text-xs text-stone-500">Shown struck through to indicate a sale.</p>
        </div>
        <div>
          <label for="stock" class="label">Stock quantity</label>
          <input id="stock" v-model.number="form.stockQuantity" type="number" min="0" :class="{ 'input-error': errors.stockQuantity }" class="input" />
          <p v-if="errors.stockQuantity" class="field-error">{{ errors.stockQuantity }}</p>
        </div>
        <div>
          <label for="sku" class="label">SKU <span class="font-normal text-stone-400">(optional)</span></label>
          <input id="sku" v-model="form.sku" class="input font-mono" />
        </div>
      </section>
    </div>

    <aside class="space-y-4">
      <section class="card space-y-4 p-5">
        <label class="flex items-center gap-2 text-sm font-medium">
          <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-primary" />
          Visible on storefront
        </label>
        <div>
          <label for="category" class="label">Category</label>
          <select id="category" v-model="form.categoryId" class="input">
            <option :value="null">— None —</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.parentId ? '— ' : '' }}{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label for="slug" class="label">URL slug</label>
          <input id="slug" v-model="form.slug" placeholder="generated from name" :class="{ 'input-error': errors.slug }" class="input font-mono text-xs" />
          <p v-if="errors.slug" class="field-error">{{ errors.slug }}</p>
        </div>
      </section>

      <p v-if="error" class="alert-error">{{ error }}</p>
      <p v-if="saved" class="alert-success">Saved.</p>
      <button type="submit" class="btn btn-primary w-full" :disabled="saving">{{ saving ? 'Saving…' : id ? 'Save changes' : 'Create product' }}</button>
      <RouterLink v-if="id && form.slug" :to="{ name: 'product', params: { slug: form.slug } }" target="_blank" class="btn btn-secondary w-full">
        View on storefront ↗
      </RouterLink>
      <button v-if="id" type="button" class="btn btn-danger w-full" @click="remove">Delete product</button>
    </aside>
  </form>
</template>
