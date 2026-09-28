<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { AdminTicket, TicketStatus } from '@/api/types'
import SupportThread from '@/components/SupportThread.vue'
import { t } from '@/i18n'

const route = useRoute()
const data = ref<AdminTicket | null>(null)
const error = ref<string | null>(null)
const reply = ref('')
const busy = ref(false)

// Named from the shop's side, as in the support list.
const statusLabels: Record<TicketStatus, string> = { Open: 'Needs reply', Answered: 'Answered', Closed: 'Closed' }

const url = () => `/admin/support/${encodeURIComponent(String(route.params.number))}`

onMounted(async () => {
  try {
    data.value = (await http.get<AdminTicket>(url())).data
  } catch (e) {
    error.value = errorMessage(e, t('Request not found.'))
  }
})

async function run(action: () => Promise<{ data: AdminTicket }>) {
  busy.value = true
  error.value = null
  try {
    data.value = (await action()).data
    return true
  } catch (e) {
    error.value = errorMessage(e)
    return false
  } finally {
    busy.value = false
  }
}

async function send() {
  if (!reply.value.trim()) return
  if (await run(() => http.post<AdminTicket>(`${url()}/messages`, { body: reply.value }))) reply.value = ''
}

function setStatus(status: TicketStatus) {
  return run(() => http.post<AdminTicket>(`${url()}/status`, { status }))
}
</script>

<template>
  <RouterLink :to="{ name: 'admin-support' }" class="text-sm text-stone-600 hover:text-primary">← {{ $t('All requests') }}</RouterLink>

  <p v-if="error" class="alert-error mt-4">{{ error }}</p>
  <div v-if="!data && !error" class="mt-4 h-64 animate-pulse rounded-xl bg-stone-200" />

  <div v-if="data" class="mt-4 grid gap-6 xl:grid-cols-[1fr_18rem]">
    <div>
      <h1 class="text-xl font-semibold">{{ data.ticket.subject }}</h1>
      <p class="mb-4 text-sm text-stone-500"><span class="font-mono">{{ data.ticket.number }}</span> · {{ $t(statusLabels[data.ticket.status]) }}</p>
      <SupportThread :messages="data.ticket.messages" own="Staff" />
      <form class="card mt-4 space-y-3 p-4" @submit.prevent="send">
        <label for="reply" class="label">{{ $t('Reply to {name}', { name: data.customerName }) }}</label>
        <textarea id="reply" v-model="reply" rows="4" maxlength="4000" class="input" />
        <p class="text-xs text-stone-500">{{ $t('The customer gets a notification in their account.') }}</p>
        <button type="submit" class="btn btn-primary" :disabled="busy || !reply.trim()">{{ busy ? $t('Sending…') : $t('Send reply') }}</button>
      </form>
    </div>

    <aside class="space-y-4">
      <div class="card p-5 text-sm">
        <h2 class="font-semibold">{{ $t('Customer') }}</h2>
        <p class="mt-2">{{ data.customerName }}</p>
        <p class="text-stone-600">{{ data.customerEmail }}</p>
        <p v-if="data.customerPhone" class="text-stone-600">{{ data.customerPhone }}</p>
        <RouterLink
          v-if="data.ticket.orderNumber"
          :to="{ name: 'admin-order', params: { number: data.ticket.orderNumber } }"
          class="link mt-3 inline-block"
        >
          {{ $t('View order {number}', { number: data.ticket.orderNumber }) }} →
        </RouterLink>
      </div>
      <div class="card p-5">
        <h2 class="font-semibold">{{ $t('Status') }}</h2>
        <button v-if="data.ticket.status !== 'Closed'" class="btn btn-secondary mt-3 w-full" :disabled="busy" @click="setStatus('Closed')">
          {{ $t('Close request') }}
        </button>
        <button v-else class="btn btn-secondary mt-3 w-full" :disabled="busy" @click="setStatus('Open')">{{ $t('Reopen') }}</button>
      </div>
    </aside>
  </div>
</template>
