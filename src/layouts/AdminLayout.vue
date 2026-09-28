<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import type { SidebarItem, SidebarKey, SidebarStyle } from '@/api/types'
import { useAdminStore } from '@/stores/admin'
import { useTenantStore } from '@/stores/tenant'
import { sidebarDefaults, sidebarKeys } from '@/utils/sidebar'

const admin = useAdminStore()
const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)

watch(() => route.fullPath, () => (menuOpen.value = false))
// The tenant store applies the shop's theme here too; the settings carry the sidebar layout.
onMounted(() => Promise.all([admin.restore(), admin.loadSettings().catch(() => {}), useTenantStore().load().catch(() => {})]))

const appearance = computed(() => admin.settings?.appearance)
const compact = computed(() => appearance.value?.sidebarCompact ?? false)

const links = computed(() => {
  const items: SidebarItem[] = appearance.value?.sidebarItems ?? sidebarKeys.map((key) => ({ key, label: null, visible: true }))
  return items
    .filter((i) => i.visible)
    .map((i) => ({ ...sidebarDefaults[i.key], key: i.key, label: i.label || sidebarDefaults[i.key].label }))
})

function isActive(key: SidebarKey) {
  const d = sidebarDefaults[key]
  const name = typeof route.name === 'string' ? route.name : ''
  return d.exact ? name === d.route : name.startsWith(d.match)
}

const styles: Record<SidebarStyle, { aside: string; muted: string; active: string; idle: string; rule: string }> = {
  dark: {
    aside: 'bg-stone-900 text-stone-300 border-stone-800',
    muted: 'text-stone-500',
    active: 'bg-stone-800 text-white',
    idle: 'hover:bg-stone-800/60 hover:text-white',
    rule: 'border-stone-800',
  },
  light: {
    aside: 'bg-white text-stone-700 border-stone-200',
    muted: 'text-stone-400',
    active: 'bg-primary/10 text-primary font-medium',
    idle: 'hover:bg-stone-100 hover:text-stone-900',
    rule: 'border-stone-200',
  },
  brand: {
    aside: 'bg-primary text-on-primary border-black/10',
    muted: 'opacity-70',
    active: 'bg-black/20 font-medium',
    idle: 'opacity-85 hover:bg-black/10 hover:opacity-100',
    rule: 'border-black/15',
  },
}
const style = computed(() => styles[appearance.value?.sidebarStyle ?? 'dark'])

function signOut() {
  admin.signOut()
  router.push({ name: 'admin-login' })
}
</script>

<template>
  <div class="min-h-screen md:flex">
    <aside
      :class="[style.aside, compact ? 'md:w-16' : 'md:w-60']"
      class="border-b md:sticky md:top-0 md:h-screen md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0 print:hidden"
    >
      <div class="flex items-center justify-between px-4 py-4 md:block" :class="{ 'md:px-2 md:text-center': compact }">
        <div class="min-w-0">
          <p class="text-xs tracking-wider uppercase" :class="[style.muted, { 'md:hidden': compact }]">Shop admin</p>
          <p class="truncate font-semibold" :class="{ 'md:hidden': compact }">{{ admin.settings?.name ?? admin.user?.tenantName ?? '…' }}</p>
          <p v-if="compact" class="hidden text-lg font-bold md:block" :title="admin.settings?.name">{{ (admin.settings?.name ?? '?').charAt(0) }}</p>
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
          :key="link.key"
          :to="link.to"
          :title="compact ? link.label : undefined"
          :class="[isActive(link.key) ? style.active : style.idle, { 'md:justify-center md:px-0': compact }]"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" :d="link.icon" />
          </svg>
          <span :class="{ 'md:sr-only': compact }">{{ link.label }}</span>
        </RouterLink>
        <hr class="my-3" :class="style.rule" />
        <RouterLink
          :to="{ name: 'home' }"
          target="_blank"
          :title="compact ? 'View storefront' : undefined"
          :class="[style.idle, { 'md:justify-center md:px-0': compact }]"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
          <span :class="{ 'md:sr-only': compact }">View storefront</span>
        </RouterLink>
        <div class="px-3 pt-3 text-xs" :class="[style.muted, { 'md:hidden': compact }]">
          <p class="truncate">{{ admin.user?.email }}</p>
          <button class="mt-1 underline-offset-2 hover:underline" @click="signOut">Sign out</button>
        </div>
        <button v-if="compact" class="hidden w-full py-2 text-xs md:block" :class="style.muted" title="Sign out" @click="signOut">⎋</button>
      </nav>
    </aside>

    <main class="min-w-0 flex-1 px-4 py-6 sm:px-8 print:p-0">
      <RouterView />
    </main>
  </div>
</template>
