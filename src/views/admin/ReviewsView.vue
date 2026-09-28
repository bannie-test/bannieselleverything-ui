<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { AdminReview, Paged } from '@/api/types'
import PaginationBar from '@/components/PaginationBar.vue'
import StarRating from '@/components/StarRating.vue'
import { t } from '@/i18n'
import { formatDate } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const result = ref<Paged<AdminReview> | null>(null)
const failed = ref(false)
const error = ref<string | null>(null)
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')

function update(patch: Record<string, string | number | undefined>) {
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries({ ...route.query, ...patch })) if (v !== undefined && v !== '') query[k] = String(v)
  router.push({ query })
}

async function load() {
  failed.value = false
  try {
    result.value = (
      await http.get<Paged<AdminReview>>('/admin/reviews', {
        params: { rating: route.query.rating || undefined, q: route.query.q || undefined, page: Number(route.query.page) || 1 },
      })
    ).data
  } catch {
    failed.value = true
  }
}
watch(() => route.query, load, { immediate: true })

async function remove(r: AdminReview) {
  if (!confirm(t("Remove this review by {name}? The product's rating will be recalculated.", { name: r.authorName }))) return
  error.value = null
  try {
    await http.delete(`/admin/reviews/${r.id}`)
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}
</script>

<template>
  <h1 class="text-2xl font-semibold">{{ $t('Reviews') }}</h1>
  <p class="mt-1 text-sm text-stone-600">{{ $t('Remove reviews that are abusive, spam or not about the product.') }}</p>

  <div class="mt-4 flex flex-wrap items-center gap-3">
    <div class="flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1 text-sm">
      <button
        v-for="r in [undefined, 5, 4, 3, 2, 1]"
        :key="r ?? 'all'"
        :class="String(route.query.rating ?? '') === String(r ?? '') ? 'bg-surface font-medium shadow-sm' : 'text-stone-600 hover:text-stone-900'"
        class="rounded-md px-3 py-1.5"
        @click="update({ rating: r, page: undefined })"
      >
        {{ r ? `${r}★` : $t('All') }}
      </button>
    </div>
    <form class="ml-auto" @submit.prevent="update({ q: search.trim(), page: undefined })">
      <input v-model="search" type="search" :placeholder="$t('Product or review text')" class="input w-64" :aria-label="$t('Search reviews')" />
    </form>
  </div>

  <p v-if="error" class="alert-error mt-4">{{ error }}</p>
  <p v-if="failed" class="alert-error mt-6">{{ $t("Couldn't load reviews.") }}</p>
  <div v-else-if="!result" class="mt-6 h-64 animate-pulse rounded-xl bg-stone-200" />
  <div v-else-if="result.items.length === 0" class="card mt-6 p-10 text-center text-stone-600">{{ $t('No reviews match.') }}</div>

  <template v-else>
    <ul class="card mt-6 divide-y divide-stone-100">
      <li v-for="r in result.items" :key="r.id" class="flex flex-wrap items-start justify-between gap-4 p-4">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <StarRating :rating="r.rating" />
            <RouterLink :to="{ name: 'product', params: { slug: r.productSlug } }" target="_blank" class="text-sm font-medium text-primary hover:underline">
              {{ r.productName }}
            </RouterLink>
          </div>
          <p v-if="r.title" class="mt-1 font-medium">{{ r.title }}</p>
          <p v-if="r.body" class="mt-1 text-sm whitespace-pre-line text-stone-700">{{ r.body }}</p>
          <p class="mt-1 text-xs text-stone-500">
            {{ r.authorName }} · {{ formatDate(r.createdAt) }}
            <span v-if="r.isVerifiedPurchase" class="text-emerald-700"> · {{ $t('Verified purchase') }}</span>
          </p>
        </div>
        <button class="btn btn-danger" @click="remove(r)">{{ $t('Remove') }}</button>
      </li>
    </ul>
    <PaginationBar class="mt-6" :page="result.page" :total-pages="result.totalPages" @change="(p) => update({ page: p })" />
  </template>
</template>
