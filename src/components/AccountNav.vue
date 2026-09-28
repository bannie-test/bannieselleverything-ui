<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'

const route = useRoute()
const notifications = useNotificationsStore()

const links = [
  { name: 'my-orders', label: 'Orders' },
  { name: 'wishlist', label: 'Wishlist' },
  { name: 'notifications', label: 'Notifications' },
  { name: 'support', label: 'Support' },
  { name: 'profile', label: 'Profile' },
  { name: 'addresses', label: 'Addresses' },
]

function isActive(name: string) {
  return route.name === name || (name === 'support' && route.name === 'support-ticket')
}
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto pb-2 text-sm lg:flex-col lg:overflow-visible" :aria-label="$t('Account')">
    <RouterLink
      v-for="link in links"
      :key="link.name"
      :to="{ name: link.name }"
      :class="isActive(link.name) ? 'bg-primary/10 font-medium text-primary' : 'text-stone-700 hover:bg-stone-100'"
      class="flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 whitespace-nowrap"
    >
      {{ $t(link.label) }}
      <span
        v-if="link.name === 'notifications' && notifications.unread"
        class="rounded-full bg-primary px-1.5 text-xs font-semibold text-white"
      >
        {{ notifications.unread }}
      </span>
    </RouterLink>
  </nav>
</template>
