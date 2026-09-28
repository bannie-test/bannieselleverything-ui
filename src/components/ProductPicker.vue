<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { http } from '@/api/client'
import type { AdminProduct, Paged, ProductRef } from '@/api/types'
import { pick as inLanguage } from '@/i18n'

/** Search-and-pick an ordered list of products. */
const props = withDefaults(defineProps<{ excludeId?: string | null; max?: number; placeholder?: string; ordered?: boolean }>(), {
  excludeId: null,
  max: 12,
  placeholder: undefined,
  ordered: true,
})
const selected = defineModel<ProductRef[]>({ required: true })

const query = ref('')
const results = ref<ProductRef[]>([])
const searching = ref(false)
const open = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(query, (q) => {
  clearTimeout(timer)
  timer = setTimeout(() => search(q), 250)
})
onBeforeUnmount(() => clearTimeout(timer))

async function search(q: string) {
  searching.value = true
  try {
    const { data } = await http.get<Paged<AdminProduct>>('/admin/products', { params: { q: q.trim() || undefined, pageSize: 8, sort: 'name' } })
    results.value = data.items
      .filter((p) => p.id !== props.excludeId && !selected.value.some((s) => s.id === p.id))
      .map((p) => ({ id: p.id, name: p.name, nameEn: p.nameEn, sku: p.sku, imageUrl: p.images[0] ?? null, isActive: p.isActive }))
  } catch {
    results.value = []
  } finally {
    searching.value = false
  }
}

function pick(p: ProductRef) {
  if (selected.value.length >= props.max) return
  selected.value = [...selected.value, p]
  results.value = results.value.filter((r) => r.id !== p.id)
}

function remove(id: string) {
  selected.value = selected.value.filter((s) => s.id !== id)
}

function move(i: number, delta: number) {
  const next = [...selected.value]
  const j = i + delta
  if (j < 0 || j >= next.length) return
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  selected.value = next
}

function focus() {
  open.value = true
  if (!results.value.length) search(query.value)
}
</script>

<template>
  <div>
    <ul v-if="selected.length" class="mb-3 divide-y divide-stone-100 rounded-lg border border-stone-200">
      <li v-for="(p, i) in selected" :key="p.id" class="flex items-center gap-3 px-3 py-2 text-sm">
        <span v-if="ordered" class="w-5 text-center text-xs text-stone-400">{{ i + 1 }}</span>
        <img v-if="p.imageUrl" :src="p.imageUrl" alt="" class="h-9 w-9 rounded object-cover" />
        <span v-else class="h-9 w-9 rounded bg-stone-100" />
        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium">{{ inLanguage(p.name, p.nameEn) }}</span>
          <span class="text-xs text-stone-500">{{ p.sku ?? '' }}<template v-if="!p.isActive"> · {{ $t('hidden') }}</template></span>
        </span>
        <template v-if="ordered">
          <button type="button" class="px-1 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-30" :disabled="i === 0" :aria-label="$t('Move up')" @click="move(i, -1)">▲</button>
          <button type="button" class="px-1 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-30" :disabled="i === selected.length - 1" :aria-label="$t('Move down')" @click="move(i, 1)">▼</button>
        </template>
        <button type="button" class="text-stone-400 hover:text-red-600" :aria-label="$t('Remove {name}', { name: inLanguage(p.name, p.nameEn) })" @click="remove(p.id)">✕</button>
      </li>
    </ul>

    <div v-if="selected.length < max" class="relative">
      <input
        v-model="query"
        type="search"
        :placeholder="placeholder ?? $t('Search products by name or SKU')"
        class="input"
        :aria-label="$t('Search products to add')"
        @focus="focus"
        @blur="open = false"
      />
      <ul
        v-if="open && (results.length || searching)"
        class="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-stone-200 bg-surface py-1 text-sm shadow-lg"
      >
        <li v-if="searching && !results.length" class="px-3 py-2 text-stone-500">{{ $t('Searching…') }}</li>
        <li v-for="p in results" :key="p.id">
          <button type="button" class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-stone-50" @mousedown.prevent="pick(p)">
            <img v-if="p.imageUrl" :src="p.imageUrl" alt="" class="h-8 w-8 rounded object-cover" />
            <span v-else class="h-8 w-8 rounded bg-stone-100" />
            <span class="min-w-0 flex-1 truncate">{{ inLanguage(p.name, p.nameEn) }}</span>
            <span class="text-xs text-stone-400">{{ p.sku }}</span>
          </button>
        </li>
      </ul>
    </div>
    <p class="hint">{{ $t('{count}/{max} selected', { count: selected.length, max }) }}</p>
  </div>
</template>
