<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { Category, SaveCategory } from '@/api/types'
import BilingualField from '@/components/BilingualField.vue'
import { pick, t } from '@/i18n'

const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const editingId = ref<string | null>(null) // null = the "add" form
const saving = ref(false)

const emptyForm = (): SaveCategory => ({ name: '', nameEn: '', slug: null, parentId: null, sortOrder: 0, isActive: true })
const form = reactive<SaveCategory>(emptyForm())

const topLevel = computed(() => categories.value.filter((c) => !c.parentId))
const childrenOf = (id: string) => categories.value.filter((c) => c.parentId === id)
// Only one level of nesting: a category with children can't become a child itself.
const parentOptions = computed(() => topLevel.value.filter((c) => c.id !== editingId.value))

async function load() {
  try {
    categories.value = (await http.get<Category[]>('/admin/categories')).data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function edit(c: Category) {
  editingId.value = c.id
  Object.assign(form, { name: c.name, nameEn: c.nameEn, slug: c.slug, parentId: c.parentId, sortOrder: c.sortOrder, isActive: c.isActive })
  error.value = null
}

function resetForm() {
  editingId.value = null
  Object.assign(form, emptyForm())
  errors.value = {}
}

async function save() {
  saving.value = true
  error.value = null
  errors.value = {}
  try {
    const payload = { ...form, nameEn: form.nameEn.trim(), slug: form.slug?.trim() || null }
    if (editingId.value) await http.put(`/admin/categories/${editingId.value}`, payload)
    else await http.post('/admin/categories', payload)
    resetForm()
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? t('Please fix the highlighted fields.') : errorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove(c: Category) {
  if (!confirm(t('Delete category “{name}”?', { name: pick(c.name, c.nameEn) }))) return
  error.value = null
  try {
    await http.delete(`/admin/categories/${c.id}`)
    if (editingId.value === c.id) resetForm()
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}
</script>

<template>
  <h1 class="text-2xl font-semibold">{{ $t('Categories') }}</h1>

  <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
    <div>
      <p v-if="error" class="alert-error mb-4">{{ error }}</p>
      <div v-if="loading" class="h-48 animate-pulse rounded-xl bg-stone-200" />
      <div v-else-if="!categories.length" class="card p-10 text-center text-stone-600">{{ $t('No categories yet. Add one using the form.') }}</div>
      <ul v-else class="card divide-y divide-stone-100">
        <template v-for="c in topLevel" :key="c.id">
          <li v-for="(row, i) in [c, ...childrenOf(c.id)]" :key="row.id" :class="{ 'bg-primary/5': editingId === row.id }" class="flex items-center justify-between gap-3 px-4 py-3">
            <div :class="{ 'pl-6': i > 0 }">
              <p class="font-medium">
                {{ pick(row.name, row.nameEn) }}
                <span v-if="!row.isActive" class="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-600">{{ $t('Hidden') }}</span>
              </p>
              <p class="font-mono text-xs text-stone-500">/{{ row.slug }}</p>
            </div>
            <div class="flex gap-2 text-sm">
              <button class="text-stone-600 hover:text-primary" @click="edit(row)">{{ $t('Edit') }}</button>
              <button class="text-stone-600 hover:text-red-600" @click="remove(row)">{{ $t('Delete') }}</button>
            </div>
          </li>
        </template>
      </ul>
    </div>

    <form class="card h-fit space-y-4 p-5" @submit.prevent="save">
      <h2 class="font-semibold">{{ editingId ? $t('Edit category') : $t('Add category') }}</h2>
      <BilingualField id="cat-name" v-model:vi="form.name" v-model:en="form.nameEn" :label="$t('Name')" required stacked :maxlength="200" :error="errors.name" :error-en="errors.nameEn" />
      <div>
        <label for="cat-slug" class="label">{{ $t('URL slug') }}</label>
        <input id="cat-slug" v-model="form.slug" :placeholder="$t('generated from name')" class="input font-mono text-xs" />
      </div>
      <div>
        <label for="cat-parent" class="label">{{ $t('Parent') }}</label>
        <select id="cat-parent" v-model="form.parentId" class="input" :disabled="!!editingId && childrenOf(editingId).length > 0">
          <option :value="null">— {{ $t('Top level') }} —</option>
          <option v-for="p in parentOptions" :key="p.id" :value="p.id">{{ pick(p.name, p.nameEn) }}</option>
        </select>
      </div>
      <div class="flex items-end gap-4">
        <div class="w-24">
          <label for="cat-sort" class="label">{{ $t('Order') }}</label>
          <input id="cat-sort" v-model.number="form.sortOrder" type="number" class="input" />
        </div>
        <label class="flex items-center gap-2 pb-2 text-sm">
          <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-primary" />
          {{ $t('Visible') }}
        </label>
      </div>
      <div class="flex gap-2">
        <button type="submit" class="btn btn-primary flex-1" :disabled="saving">{{ editingId ? $t('Save') : $t('Add category') }}</button>
        <button v-if="editingId" type="button" class="btn btn-secondary" @click="resetForm">{{ $t('Cancel') }}</button>
      </div>
    </form>
  </div>
</template>
