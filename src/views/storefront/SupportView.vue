<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { OrderSummary, Paged, Ticket, TicketSummary } from '@/api/types'
import AccountShell from '@/components/AccountShell.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { useTenantStore } from '@/stores/tenant'
import { ticketStatusLabels, timeAgo } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()

const result = ref<Paged<TicketSummary> | null>(null)
const failed = ref(false)
const orders = ref<OrderSummary[]>([])
// Arriving from an order page ("Get help with this order") opens the form with that order picked.
const showForm = ref(typeof route.query.order === 'string')
const form = reactive({ subject: '', message: '', orderNumber: typeof route.query.order === 'string' ? route.query.order : '' })
const errors = ref<Record<string, string>>({})
const submitError = ref<string | null>(null)
const submitting = ref(false)

async function load() {
  failed.value = false
  try {
    result.value = (await http.get<Paged<TicketSummary>>('/storefront/account/support', { params: { page: Number(route.query.page) || 1 } })).data
  } catch {
    failed.value = true
  }
}
watch(() => route.query.page, load, { immediate: true })

onMounted(async () => {
  try {
    orders.value = (await http.get<Paged<OrderSummary>>('/storefront/account/orders')).data.items
  } catch {
    /* the order picker is optional */
  }
})

async function submit() {
  submitting.value = true
  errors.value = {}
  submitError.value = null
  try {
    const { data } = await http.post<Ticket>('/storefront/account/support', {
      subject: form.subject,
      message: form.message,
      orderNumber: form.orderNumber || null,
    })
    await router.push({ name: 'support-ticket', params: { number: data.number } })
  } catch (e) {
    errors.value = fieldErrors(e)
    submitError.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    submitting.value = false
  }
}

const statusStyles: Record<TicketSummary['status'], string> = {
  Open: 'bg-amber-50 text-amber-800 ring-amber-200',
  Answered: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Closed: 'bg-stone-100 text-stone-600 ring-stone-200',
}
</script>

<template>
  <AccountShell :title="$t('Customer support')">
    <template #actions>
      <button v-if="!showForm" class="btn btn-primary" @click="showForm = true">{{ $t('New request') }}</button>
    </template>

    <form v-if="showForm" class="card mb-6 space-y-4 p-5" novalidate @submit.prevent="submit">
      <h2 class="font-semibold">{{ $t('How can we help?') }}</h2>
      <div>
        <label for="subject" class="label">{{ $t('Subject') }}</label>
        <input id="subject" v-model="form.subject" maxlength="200" required :class="{ 'input-error': errors.subject }" class="input" />
        <p v-if="errors.subject" class="field-error">{{ errors.subject }}</p>
      </div>
      <div>
        <label for="order" class="label">{{ $t('Related order (optional)') }}</label>
        <select id="order" v-model="form.orderNumber" class="input">
          <option value="">{{ $t('Not about a specific order') }}</option>
          <option v-if="form.orderNumber && !orders.some((o) => o.orderNumber === form.orderNumber)" :value="form.orderNumber">
            {{ form.orderNumber }}
          </option>
          <option v-for="o in orders" :key="o.id" :value="o.orderNumber">{{ o.orderNumber }}</option>
        </select>
      </div>
      <div>
        <label for="message" class="label">{{ $t('Message') }}</label>
        <textarea id="message" v-model="form.message" rows="5" maxlength="4000" required :class="{ 'input-error': errors.message }" class="input" />
        <p v-if="errors.message" class="field-error">{{ errors.message }}</p>
      </div>
      <p v-if="submitError" class="alert-error">{{ submitError }}</p>
      <div class="flex gap-2">
        <button type="submit" class="btn btn-primary" :disabled="submitting">{{ submitting ? $t('Sending…') : $t('Send') }}</button>
        <button type="button" class="btn btn-secondary" @click="showForm = false">{{ $t('Cancel') }}</button>
      </div>
    </form>

    <p v-if="failed" class="alert-error">{{ $t("We couldn't load your requests. Please refresh the page.") }}</p>
    <div v-else-if="!result" class="h-40 animate-pulse rounded-xl bg-stone-200" />
    <div v-else-if="result.items.length === 0 && !showForm" class="card p-10 text-center">
      <p class="font-medium">{{ $t('No support requests yet') }}</p>
      <p class="mt-1 text-sm text-stone-600">{{ $t('Questions about an order, a product or a return? Send us a message.') }}</p>
      <p v-if="tenant.info?.contactPhone" class="mt-3 text-sm text-stone-600">{{ $t('Prefer to call?') }} {{ tenant.info.contactPhone }}</p>
    </div>
    <template v-else-if="result.items.length">
      <ul class="card divide-y divide-stone-100">
        <li v-for="t in result.items" :key="t.number">
          <RouterLink :to="{ name: 'support-ticket', params: { number: t.number } }" class="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-stone-50">
            <div class="min-w-0">
              <p class="truncate font-medium">{{ t.subject }}</p>
              <p class="text-sm text-stone-500">
                <span class="font-mono">{{ t.number }}</span>
                <template v-if="t.orderNumber"> · {{ $t('Order') }} <span class="font-mono">{{ t.orderNumber }}</span></template>
                · {{ timeAgo(t.lastMessageAt) }}
              </p>
            </div>
            <span :class="statusStyles[t.status]" class="rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset">
              {{ $t(ticketStatusLabels[t.status]) }}
            </span>
          </RouterLink>
        </li>
      </ul>
      <PaginationBar class="mt-6" :page="result.page" :total-pages="result.totalPages" @change="(p) => router.push({ query: { page: p } })" />
    </template>
  </AccountShell>
</template>
