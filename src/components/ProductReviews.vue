<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import { t } from '@/i18n'
import type { Review, ReviewPage } from '@/api/types'
import { useCustomerStore } from '@/stores/customer'
import { formatDate } from '@/utils/format'
import PaginationBar from './PaginationBar.vue'
import StarInput from './StarInput.vue'
import StarRating from './StarRating.vue'

const props = defineProps<{ slug: string }>()
const emit = defineEmits<{ changed: [summary: ReviewPage['summary']] }>()

const route = useRoute()
const customer = useCustomerStore()

const data = ref<ReviewPage | null>(null)
const failed = ref(false)
const page = ref(1)
const mine = ref<Review | null>(null)
const editing = ref(false)
const form = reactive({ rating: 0, title: '', body: '' })
const saving = ref(false)
const formError = ref<string | null>(null)

const url = computed(() => `/storefront/products/${encodeURIComponent(props.slug)}/reviews`)
const maxBar = computed(() => Math.max(1, ...(data.value?.summary.distribution ?? [])))

async function load() {
  failed.value = false
  try {
    data.value = (await http.get<ReviewPage>(url.value, { params: { page: page.value } })).data
  } catch {
    failed.value = true
  }
}

async function loadMine() {
  mine.value = null
  if (!customer.isSignedIn) return
  try {
    const { data: review, status } = await http.get<Review>(`${url.value}/mine`)
    mine.value = status === 204 ? null : review
  } catch {
    /* treated as no review yet */
  }
}

watch(
  () => props.slug,
  () => {
    page.value = 1
    editing.value = false
    load()
    loadMine()
  },
  { immediate: true },
)
watch(page, load)
watch(() => customer.isSignedIn, loadMine)

function startEditing() {
  form.rating = mine.value?.rating ?? 0
  form.title = mine.value?.title ?? ''
  form.body = mine.value?.body ?? ''
  formError.value = null
  editing.value = true
}

async function save() {
  if (!form.rating) {
    formError.value = t('Choose a star rating.')
    return
  }
  saving.value = true
  formError.value = null
  try {
    mine.value = (await http.put<Review>(`${url.value}/mine`, { rating: form.rating, title: form.title || null, body: form.body || null })).data
    editing.value = false
    page.value = 1
    await load()
    if (data.value) emit('changed', data.value.summary)
  } catch (e) {
    formError.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm(t('Delete your review?'))) return
  saving.value = true
  try {
    await http.delete(`${url.value}/mine`)
    mine.value = null
    editing.value = false
    await load()
    if (data.value) emit('changed', data.value.summary)
  } catch (e) {
    formError.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section id="reviews" class="mt-12 scroll-mt-32">
    <h2 class="text-xl font-semibold">{{ $t('Customer reviews') }}</h2>
    <p v-if="failed" class="alert-error mt-4">{{ $t("We couldn't load reviews. Please refresh the page.") }}</p>

    <div v-else-if="data" class="mt-4 grid gap-8 lg:grid-cols-[18rem_1fr]">
      <div>
        <div class="flex items-center gap-3">
          <span class="text-4xl font-semibold">{{ data.summary.ratingAverage?.toFixed(1) ?? '–' }}</span>
          <div>
            <StarRating :rating="data.summary.ratingAverage" size="md" />
            <p class="text-sm text-stone-500">{{ data.summary.reviewCount === 1 ? $t('1 review') : $t('{n} reviews', { n: data.summary.reviewCount }) }}</p>
          </div>
        </div>
        <ul class="mt-4 space-y-1.5 text-sm">
          <li v-for="star in [5, 4, 3, 2, 1]" :key="star" class="flex items-center gap-2">
            <span class="w-12 text-stone-600">{{ $t('{n} star', { n: star }) }}</span>
            <span class="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
              <span class="block h-full rounded-full bg-amber-400" :style="{ width: `${(data.summary.distribution[star - 1]! / maxBar) * 100}%` }" />
            </span>
            <span class="w-6 text-right text-stone-500">{{ data.summary.distribution[star - 1] }}</span>
          </li>
        </ul>

        <div class="mt-6">
          <template v-if="!customer.isSignedIn">
            <p class="text-sm text-stone-600">{{ $t('Bought this product?') }}</p>
            <RouterLink :to="{ name: 'login', query: { redirect: `${route.fullPath}#reviews` } }" class="btn btn-secondary mt-2 w-full">
              {{ $t('Sign in to write a review') }}
            </RouterLink>
          </template>
          <button v-else-if="!editing" class="btn btn-secondary w-full" @click="startEditing">
            {{ mine ? $t('Edit your review') : $t('Write a review') }}
          </button>
        </div>
      </div>

      <div>
        <form v-if="editing" class="card mb-6 space-y-4 p-5" @submit.prevent="save">
          <h3 class="font-semibold">{{ mine ? $t('Edit your review') : $t('Write a review') }}</h3>
          <StarInput v-model="form.rating" />
          <div>
            <label for="review-title" class="label">{{ $t('Headline (optional)') }}</label>
            <input id="review-title" v-model="form.title" maxlength="200" class="input" :placeholder="$t('Sum it up in a few words')" />
          </div>
          <div>
            <label for="review-body" class="label">{{ $t('Review (optional)') }}</label>
            <textarea id="review-body" v-model="form.body" rows="4" maxlength="4000" class="input" :placeholder="$t('What did you like or dislike?')" />
          </div>
          <p v-if="formError" class="alert-error">{{ formError }}</p>
          <div class="flex flex-wrap gap-2">
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? $t('Saving…') : $t('Submit review') }}</button>
            <button type="button" class="btn btn-secondary" :disabled="saving" @click="editing = false">{{ $t('Cancel') }}</button>
            <button v-if="mine" type="button" class="btn btn-danger ml-auto" :disabled="saving" @click="remove">{{ $t('Delete') }}</button>
          </div>
        </form>

        <p v-if="data.reviews.items.length === 0 && !editing" class="card p-8 text-center text-stone-600">
          {{ $t('No reviews yet. Be the first to share your thoughts.') }}
        </p>
        <ul v-else class="divide-y divide-stone-100">
          <li v-for="r in data.reviews.items" :key="r.id" class="py-4 first:pt-0">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StarRating :rating="r.rating" />
              <p v-if="r.title" class="font-medium">{{ r.title }}</p>
            </div>
            <p class="mt-1 text-xs text-stone-500">
              {{ r.authorName }}<span v-if="r.isMine"> ({{ $t('you') }})</span> · {{ formatDate(r.createdAt) }}
              <span v-if="r.isVerifiedPurchase" class="ml-1 font-medium text-emerald-700">✓ {{ $t('Verified purchase') }}</span>
            </p>
            <p v-if="r.body" class="mt-2 text-sm leading-relaxed whitespace-pre-line text-stone-700">{{ r.body }}</p>
          </li>
        </ul>
        <PaginationBar class="mt-4" :page="data.reviews.page" :total-pages="data.reviews.totalPages" @change="(p) => (page = p)" />
      </div>
    </div>
    <div v-else class="mt-4 h-40 animate-pulse rounded-xl bg-stone-200" />
  </section>
</template>
