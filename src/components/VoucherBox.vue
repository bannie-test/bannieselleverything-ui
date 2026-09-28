<script setup lang="ts">
import { computed, ref } from 'vue'
import { errorMessage } from '@/api/client'
import { useCartStore } from '@/stores/cart'
import { money } from '@/utils/format'

const store = useCartStore()
const code = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

const voucher = computed(() => store.cart.voucher)

async function apply() {
  if (!code.value.trim()) return
  busy.value = true
  error.value = null
  try {
    await store.applyVoucher(code.value.trim())
    code.value = ''
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

async function remove() {
  busy.value = true
  error.value = null
  try {
    await store.removeVoucher()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="voucher" :class="voucher.applied ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'" class="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
      <div class="min-w-0">
        <p class="font-mono font-semibold">{{ voucher.code }}</p>
        <p v-if="voucher.applied" class="text-emerald-800">
          {{ voucher.type === 'FreeShipping' ? 'Free shipping' : `−${money(voucher.discountMinor, store.cart.currency)}` }}<template v-if="voucher.description"> · {{ voucher.description }}</template>
        </p>
        <p v-else class="text-amber-900">{{ voucher.message }}</p>
      </div>
      <button type="button" class="shrink-0 text-stone-500 hover:text-red-600" :disabled="busy" @click="remove">Remove</button>
    </div>
    <form v-else class="flex gap-2" @submit.prevent="apply">
      <input v-model="code" placeholder="Voucher code" maxlength="40" class="input font-mono uppercase" aria-label="Voucher code" autocomplete="off" />
      <button type="submit" class="btn btn-secondary shrink-0" :disabled="busy || !code.trim()">{{ busy ? '…' : 'Apply' }}</button>
    </form>
    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>
