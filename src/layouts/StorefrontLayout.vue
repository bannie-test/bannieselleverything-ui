<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useCustomerStore } from '@/stores/customer'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const cart = useCartStore()
const customer = useCustomerStore()
const route = useRoute()
const router = useRouter()

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const menuOpen = ref(false)
const bootError = ref(false)

watch(() => route.fullPath, () => (menuOpen.value = false))
watch(
  () => route.query.q,
  (q) => (search.value = typeof q === 'string' ? q : ''),
)

onMounted(async () => {
  try {
    await tenant.load()
    if (tenant.notFound) return
    await customer.restore()
    await cart.load()
  } catch {
    bootError.value = true
  }
})

function submitSearch() {
  router.push({ name: 'catalog', query: search.value.trim() ? { q: search.value.trim() } : {} })
}

function signOut() {
  customer.signOut()
  router.push({ name: 'home' })
}
</script>

<template>
  <div v-if="tenant.notFound" class="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
    <h1 class="text-2xl font-semibold">Shop not found</h1>
    <p class="text-stone-600">There's no shop at this address. Check the link and try again.</p>
  </div>

  <div v-else class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6">
        <button class="-ml-1 p-1 md:hidden" aria-label="Menu" @click="menuOpen = !menuOpen">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <RouterLink :to="{ name: 'home' }" class="flex shrink-0 items-center gap-2">
          <img v-if="tenant.info?.logoUrl" :src="tenant.info.logoUrl" alt="" class="h-8 w-8 rounded" />
          <span class="text-lg font-bold tracking-tight text-primary">{{ tenant.info?.name ?? '' }}</span>
        </RouterLink>

        <form class="hidden flex-1 md:block" role="search" @submit.prevent="submitSearch">
          <input v-model="search" type="search" placeholder="Search products…" class="input max-w-md" aria-label="Search products" />
        </form>

        <nav class="ml-auto flex items-center gap-1 text-sm sm:gap-3">
          <template v-if="customer.isSignedIn">
            <RouterLink :to="{ name: 'my-orders' }" class="hidden rounded-lg px-2 py-1.5 hover:bg-stone-100 sm:inline">My orders</RouterLink>
            <button class="hidden rounded-lg px-2 py-1.5 text-stone-600 hover:bg-stone-100 sm:inline" @click="signOut">Sign out</button>
          </template>
          <RouterLink v-else :to="{ name: 'login' }" class="hidden rounded-lg px-2 py-1.5 hover:bg-stone-100 sm:inline">Sign in</RouterLink>

          <RouterLink :to="{ name: 'cart' }" class="relative rounded-lg p-2 hover:bg-stone-100" aria-label="Cart">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              />
            </svg>
            <span
              v-if="cart.cart.itemCount"
              class="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white"
            >
              {{ cart.cart.itemCount }}
            </span>
          </RouterLink>
        </nav>
      </div>

      <!-- Category bar (desktop) -->
      <div class="hidden border-t border-stone-100 md:block">
        <div class="mx-auto flex max-w-6xl gap-6 px-4 text-sm">
          <RouterLink :to="{ name: 'catalog' }" class="py-2.5 text-stone-700 hover:text-primary">All products</RouterLink>
          <div v-for="c in tenant.tree()" :key="c.id" class="group relative">
            <RouterLink :to="{ name: 'catalog', query: { category: c.slug } }" class="block py-2.5 text-stone-700 hover:text-primary">
              {{ c.name }}
            </RouterLink>
            <div
              v-if="c.children.length"
              class="invisible absolute top-full left-0 z-30 min-w-44 rounded-lg border border-stone-200 bg-white py-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
            >
              <RouterLink
                v-for="child in c.children"
                :key="child.id"
                :to="{ name: 'catalog', query: { category: child.slug } }"
                class="block px-4 py-2 hover:bg-stone-50"
              >
                {{ child.name }}
              </RouterLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="menuOpen" class="border-t border-stone-100 px-4 pt-3 pb-4 md:hidden">
        <form role="search" class="mb-3" @submit.prevent="submitSearch">
          <input v-model="search" type="search" placeholder="Search products…" class="input" aria-label="Search products" />
        </form>
        <nav class="flex flex-col text-sm">
          <RouterLink :to="{ name: 'catalog' }" class="py-2">All products</RouterLink>
          <template v-for="c in tenant.tree()" :key="c.id">
            <RouterLink :to="{ name: 'catalog', query: { category: c.slug } }" class="py-2">{{ c.name }}</RouterLink>
            <RouterLink
              v-for="child in c.children"
              :key="child.id"
              :to="{ name: 'catalog', query: { category: child.slug } }"
              class="py-2 pl-4 text-stone-600"
            >
              {{ child.name }}
            </RouterLink>
          </template>
          <hr class="my-2 border-stone-200" />
          <template v-if="customer.isSignedIn">
            <RouterLink :to="{ name: 'my-orders' }" class="py-2">My orders</RouterLink>
            <button class="py-2 text-left" @click="signOut">Sign out</button>
          </template>
          <template v-else>
            <RouterLink :to="{ name: 'login' }" class="py-2">Sign in</RouterLink>
            <RouterLink :to="{ name: 'track-order' }" class="py-2">Track an order</RouterLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <div v-if="bootError" class="alert-error mb-6">We couldn't load the shop. Please refresh the page.</div>
      <RouterView />
    </main>

    <footer class="border-t border-stone-200 bg-white">
      <div class="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-stone-600 sm:grid-cols-3">
        <div>
          <p class="font-semibold text-stone-900">{{ tenant.info?.name }}</p>
          <p v-if="tenant.info?.address" class="mt-1">{{ tenant.info.address }}</p>
        </div>
        <div>
          <p class="font-semibold text-stone-900">Contact</p>
          <p v-if="tenant.info?.contactPhone" class="mt-1">{{ tenant.info.contactPhone }}</p>
          <p v-if="tenant.info?.contactEmail">{{ tenant.info.contactEmail }}</p>
        </div>
        <div>
          <p class="font-semibold text-stone-900">Help</p>
          <RouterLink :to="{ name: 'track-order' }" class="mt-1 block hover:text-primary">Track an order</RouterLink>
          <p>Cash on delivery nationwide</p>
        </div>
      </div>
    </footer>
  </div>
</template>
