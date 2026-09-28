<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import type { SidebarItem, SidebarKey, SidebarStyle } from '@/api/types'
import LanguageSwitch from '@/components/LanguageSwitch.vue'
import { pick, t } from '@/i18n'
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
const position = computed(() => appearance.value?.sidebarPosition ?? 'left')
const top = computed(() => position.value === 'top')

const links = computed(() => {
  const items: SidebarItem[] = appearance.value?.sidebarItems ?? sidebarKeys.map((key) => ({ key, label: null, visible: true }))
  return items
    .filter((i) => i.visible)
    // A label the owner typed is shown as-is; the defaults follow the admin's language.
    .map((i) => ({ ...sidebarDefaults[i.key], key: i.key, label: i.label || t(sidebarDefaults[i.key].label) }))
})

function isActive(key: SidebarKey) {
  const d = sidebarDefaults[key]
  const name = typeof route.name === 'string' ? route.name : ''
  return d.exact ? name === d.route : name.startsWith(d.match)
}

// The menu keeps its chosen look in both color modes: `theme-light` pins the original palette.
const styles: Record<SidebarStyle, { aside: string; muted: string; active: string; idle: string; rule: string }> = {
  dark: {
    aside: 'bg-stone-900 text-stone-300 border-stone-800',
    muted: 'text-stone-500',
    active: 'bg-stone-800 text-white',
    idle: 'hover:bg-stone-800/60 hover:text-white',
    rule: 'border-stone-800',
  },
  light: {
    aside: 'bg-surface text-stone-700 border-stone-200',
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

const shopName = computed(() => (admin.settings ? pick(admin.settings.name, admin.settings.nameEn) : (admin.user?.tenantName ?? '…')))

function signOut() {
  admin.signOut()
  router.push({ name: 'admin-login' })
}
</script>

<template>
  <div class="min-h-screen" :class="{ 'md:flex': !top, 'md:flex-row-reverse': position === 'right' }">
    <aside
      :class="[
        style.aside,
        top
          ? 'sticky top-0 z-30'
          : ['md:sticky md:top-0 md:h-screen md:shrink-0 md:overflow-y-auto md:border-b-0', position === 'right' ? 'md:border-l' : 'md:border-r', compact ? 'md:w-16' : 'md:w-60'],
      ]"
      class="theme-light border-b print:hidden"
    >
      <div
        class="flex items-center justify-between gap-4 px-4"
        :class="top ? 'py-3 md:py-2' : ['py-4 md:block', { 'md:px-2 md:text-center': compact }]"
      >
        <div class="min-w-0 shrink-0">
          <p class="text-xs tracking-wider uppercase" :class="[style.muted, { 'md:hidden': compact }]">{{ $t('Shop admin') }}</p>
          <p class="truncate font-semibold" :class="{ 'md:hidden': compact, 'max-w-48': top }">{{ shopName }}</p>
          <p v-if="compact" class="hidden text-lg font-bold md:block" :title="shopName">{{ shopName.charAt(0) }}</p>
        </div>

        <!-- Top bar: the menu runs across the header on wide screens. -->
        <nav v-if="top" class="hidden min-w-0 flex-1 gap-1 overflow-x-auto md:flex">
          <RouterLink
            v-for="link in links"
            :key="link.key"
            :to="link.to"
            :title="compact ? link.label : undefined"
            :class="isActive(link.key) ? style.active : style.idle"
            class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap"
          >
            <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" :d="link.icon" />
            </svg>
            <span :class="{ 'sr-only': compact }">{{ link.label }}</span>
          </RouterLink>
        </nav>
        <div v-if="top" class="hidden shrink-0 items-center gap-3 text-xs md:flex">
          <RouterLink :to="{ name: 'home' }" target="_blank" :title="$t('View storefront')" :class="style.idle" class="rounded-lg p-2">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
            <span class="sr-only">{{ $t('View storefront') }}</span>
          </RouterLink>
          <LanguageSwitch />
          <div class="text-right" :class="style.muted">
            <p class="max-w-40 truncate">{{ admin.user?.email }}</p>
            <button class="underline-offset-2 hover:underline" @click="signOut">{{ $t('Sign out') }}</button>
          </div>
        </div>

        <button class="p-1 md:hidden" :aria-label="$t('Menu')" @click="menuOpen = !menuOpen">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <!-- Column menu; with the top bar it is only the small-screen dropdown. -->
      <nav :class="[menuOpen ? 'block' : 'hidden', top ? 'md:hidden' : 'md:block']" class="space-y-1 px-2 pb-4">
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
          :title="compact ? $t('View storefront') : undefined"
          :class="[style.idle, { 'md:justify-center md:px-0': compact }]"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
          <span :class="{ 'md:sr-only': compact }">{{ $t('View storefront') }}</span>
        </RouterLink>
        <div class="px-3 pt-3 text-xs" :class="[style.muted, { 'md:hidden': compact }]">
          <p class="truncate">{{ admin.user?.email }}</p>
          <div class="mt-1 flex items-center justify-between gap-2">
            <button class="underline-offset-2 hover:underline" @click="signOut">{{ $t('Sign out') }}</button>
            <LanguageSwitch />
          </div>
        </div>
        <div v-if="compact" class="hidden flex-col items-center gap-2 pt-2 md:flex" :class="style.muted">
          <LanguageSwitch compact />
          <button class="py-1 text-xs" :title="$t('Sign out')" @click="signOut">⎋</button>
        </div>
      </nav>
    </aside>

    <main class="min-w-0 flex-1 px-4 py-6 sm:px-8 print:p-0">
      <RouterView />
    </main>
  </div>
</template>
