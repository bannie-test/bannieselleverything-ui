<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { Ticket } from '@/api/types'
import AccountShell from '@/components/AccountShell.vue'
import SupportThread from '@/components/SupportThread.vue'
import { t } from '@/i18n'
import { ticketStatusLabels } from '@/utils/format'

const route = useRoute()
const ticket = ref<Ticket | null>(null)
const error = ref<string | null>(null)
const reply = ref('')
const busy = ref(false)

const url = () => `/storefront/account/support/${encodeURIComponent(String(route.params.number))}`

watch(
  () => route.params.number,
  async () => {
    ticket.value = null
    error.value = null
    try {
      ticket.value = (await http.get<Ticket>(url())).data
    } catch (e) {
      error.value = errorMessage(e, t('Request not found.'))
    }
  },
  { immediate: true },
)

async function send() {
  if (!reply.value.trim()) return
  busy.value = true
  error.value = null
  try {
    ticket.value = (await http.post<Ticket>(`${url()}/messages`, { body: reply.value })).data
    reply.value = ''
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

async function close() {
  busy.value = true
  try {
    ticket.value = (await http.post<Ticket>(`${url()}/close`)).data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AccountShell :title="ticket?.subject ?? $t('Support request')">
    <template #actions>
      <RouterLink :to="{ name: 'support' }" class="link text-sm">← {{ $t('All requests') }}</RouterLink>
    </template>

    <p v-if="error" class="alert-error mb-4">{{ error }}</p>
    <div v-if="!ticket && !error" class="h-64 animate-pulse rounded-xl bg-stone-200" />

    <template v-if="ticket">
      <p class="mb-4 text-sm text-stone-600">
        <span class="font-mono">{{ ticket.number }}</span> · {{ $t(ticketStatusLabels[ticket.status]) }}
        <template v-if="ticket.orderNumber">
          · {{ $t('Order') }}
          <RouterLink :to="{ name: 'order', params: { number: ticket.orderNumber } }" class="link font-mono">{{ ticket.orderNumber }}</RouterLink>
        </template>
      </p>

      <SupportThread :messages="ticket.messages" own="Customer" />

      <form class="card mt-4 space-y-3 p-4" @submit.prevent="send">
        <label for="reply" class="label">{{ ticket.status === 'Closed' ? $t('Reply to reopen this request') : $t('Reply') }}</label>
        <textarea id="reply" v-model="reply" rows="3" maxlength="4000" class="input" />
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary" :disabled="busy || !reply.trim()">{{ busy ? $t('Sending…') : $t('Send') }}</button>
          <button v-if="ticket.status !== 'Closed'" type="button" class="btn btn-secondary ml-auto" :disabled="busy" @click="close">
            {{ $t('Mark as resolved') }}
          </button>
        </div>
      </form>
    </template>
  </AccountShell>
</template>
