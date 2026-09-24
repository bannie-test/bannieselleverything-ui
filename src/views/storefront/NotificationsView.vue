<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { http } from '@/api/client'
import type { AppNotification, Paged } from '@/api/types'
import AccountShell from '@/components/AccountShell.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { formatDateTime, timeAgo } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const store = useNotificationsStore()
const result = ref<Paged<AppNotification> | null>(null)
const failed = ref(false)

async function load() {
  failed.value = false
  try {
    result.value = (await http.get<Paged<AppNotification>>('/storefront/account/notifications', { params: { page: Number(route.query.page) || 1 } })).data
  } catch {
    failed.value = true
  }
}
watch(() => route.query.page, load, { immediate: true })

async function open(n: AppNotification) {
  if (!n.isRead) {
    n.isRead = true
    http.post(`/storefront/account/notifications/${n.id}/read`).then(store.refresh, () => {})
  }
  // Links are storefront paths the API produced; only follow same-site ones.
  if (n.link?.startsWith('/') && !n.link.startsWith('//')) await router.push(n.link)
}

async function markAllRead() {
  await http.post('/storefront/account/notifications/read-all')
  result.value?.items.forEach((n) => (n.isRead = true))
  store.refresh()
}
</script>

<template>
  <AccountShell title="Notifications">
    <template #actions>
      <button v-if="result?.items.some((n) => !n.isRead)" class="btn btn-secondary" @click="markAllRead">Mark all as read</button>
    </template>

    <p v-if="failed" class="alert-error">We couldn't load notifications. Please refresh the page.</p>
    <div v-else-if="!result" class="h-40 animate-pulse rounded-xl bg-stone-200" />
    <div v-else-if="result.items.length === 0" class="card p-10 text-center">
      <p class="font-medium">No notifications yet</p>
      <p class="mt-1 text-sm text-stone-600">Order updates and replies from the shop will show up here.</p>
    </div>
    <template v-else>
      <ul class="card divide-y divide-stone-100">
        <li v-for="n in result.items" :key="n.id">
          <button class="flex w-full items-start gap-3 p-4 text-left hover:bg-stone-50" @click="open(n)">
            <span :class="n.isRead ? 'bg-transparent' : 'bg-primary'" class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :aria-label="n.isRead ? undefined : 'Unread'" />
            <span class="min-w-0 flex-1">
              <span :class="{ 'font-semibold': !n.isRead }" class="block">{{ n.title }}</span>
              <span class="block text-sm text-stone-600">{{ n.body }}</span>
              <time class="mt-1 block text-xs text-stone-500" :datetime="n.createdAt" :title="formatDateTime(n.createdAt)">{{ timeAgo(n.createdAt) }}</time>
            </span>
          </button>
        </li>
      </ul>
      <PaginationBar class="mt-6" :page="result.page" :total-pages="result.totalPages" @change="(p) => router.push({ query: { page: p } })" />
    </template>
  </AccountShell>
</template>
