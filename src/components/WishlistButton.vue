<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useWishlistStore } from '@/stores/wishlist'

const props = withDefaults(defineProps<{ productId: string; variant?: 'icon' | 'button' }>(), { variant: 'icon' })

const wishlist = useWishlistStore()
const customer = useCustomerStore()
const router = useRouter()
const route = useRoute()
const busy = ref(false)
const saved = computed(() => wishlist.has(props.productId))

async function toggle() {
  // Guests are sent to sign in and brought back here.
  if (!customer.isSignedIn) {
    await router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  busy.value = true
  try {
    await wishlist.toggle(props.productId)
  } catch {
    /* reverted by the store */
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    v-if="variant === 'icon'"
    type="button"
    :aria-pressed="saved"
    :aria-label="saved ? 'Remove from wishlist' : 'Save to wishlist'"
    :disabled="busy"
    class="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-105"
    @click.prevent.stop="toggle"
  >
    <svg viewBox="0 0 24 24" class="h-5 w-5" :class="saved ? 'fill-red-500 text-red-500' : 'fill-none text-stone-700'" stroke="currentColor" stroke-width="1.8">
      <path stroke-linejoin="round" d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.8 3.9 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.7 1.2-1.6 2.7-2.7 4.7-2.7 3.4 0 5.6 3.3 4.5 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />
    </svg>
  </button>
  <button v-else type="button" :aria-pressed="saved" class="btn btn-secondary btn-lg" :disabled="busy" @click="toggle">
    <svg viewBox="0 0 24 24" class="h-5 w-5" :class="saved ? 'fill-red-500 text-red-500' : 'fill-none'" stroke="currentColor" stroke-width="1.8">
      <path stroke-linejoin="round" d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.8 3.9 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.7 1.2-1.6 2.7-2.7 4.7-2.7 3.4 0 5.6 3.3 4.5 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />
    </svg>
    {{ saved ? 'Saved' : 'Save' }}
  </button>
</template>
