<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { useTenantStore } from '@/stores/tenant'

const admin = useAdminStore()
const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)

watch(() => route.fullPath, () => (menuOpen.value = false))
// The tenant store applies the shop's brand color to buttons and focus rings here too.
onMounted(() => Promise.all([admin.restore(), useTenantStore().load().catch(() => {})]))

const links = [
  { name: 'admin-dashboard', label: 'Dashboard', exact: true },
  { name: 'admin-orders', label: 'Orders' },
  { name: 'admin-products', label: 'Products' },
  { name: 'admin-categories', label: 'Categories' },
  { name: 'admin-reviews', label: 'Reviews' },
  { name: 'admin-support', label: 'Support' },
  { name: 'admin-settings', label: 'Settings' },
]

function isActive(link: (typeof links)[number]) {
  if (link.exact) return route.name === link.name
  return typeof route.name === 'string' && route.name.startsWith(link.name.replace(/s$/, ''))
}

function signOut() {
  admin.signOut()
  router.push({ name: 'admin-login' })
}
</script>

<template>
  <div class="min-h-screen md:flex">
    <aside class="border-b border-stone-800 bg-stone-900 text-stone-300 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <div class="flex items-center justify-between px-4 py-4 md:block">
        <div>
          <p class="text-xs tracking-wider text-stone-500 uppercase">Shop admin</p>
          <p class="truncate font-semibold text-white">{{ admin.user?.tenantName ?? '…' }}</p>
        </div>
        <button class="p-1 md:hidden" aria-label="Menu" @click="menuOpen = !menuOpen">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <nav :class="menuOpen ? 'block' : 'hidden'" class="space-y-1 px-2 pb-4 md:block">
        <RouterLink
          v-for="link in links"
          :key="link.name"
          :to="{ name: link.name }"
          :class="isActive(link) ? 'bg-stone-800 text-white' : 'hover:bg-stone-800/60 hover:text-white'"
          class="block rounded-lg px-3 py-2 text-sm"
        >
          {{ link.label }}
        </RouterLink>
        <hr class="my-3 border-stone-800" />
        <RouterLink :to="{ name: 'home' }" target="_blank" class="block rounded-lg px-3 py-2 text-sm hover:bg-stone-800/60 hover:text-white">
          View storefront ↗
        </RouterLink>
        <div class="px-3 pt-3 text-xs text-stone-500">
          <p class="truncate">{{ admin.user?.email }}</p>
          <button class="mt-1 text-stone-300 hover:text-white" @click="signOut">Sign out</button>
        </div>
      </nav>
    </aside>

    <main class="min-w-0 flex-1 px-4 py-6 sm:px-8">
      <RouterView />
    </main>
  </div>
</template>
