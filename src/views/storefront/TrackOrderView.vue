<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LAST_ORDER_EMAIL_KEY } from '@/api/client'
import { storage } from '@/utils/storage'

const route = useRoute()
const router = useRouter()
const number = ref(typeof route.query.number === 'string' ? route.query.number : '')
const email = ref('')
const notFound = ref(route.query.notFound === '1')

function submit() {
  // The email goes to storage, not the URL, so it doesn't end up in history or logs.
  storage.set(LAST_ORDER_EMAIL_KEY, email.value.trim())
  notFound.value = false
  router.push({ name: 'order', params: { number: number.value.trim().toUpperCase() } })
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-2xl font-semibold">{{ $t('Track your order') }}</h1>
    <p class="mt-1 text-sm text-stone-600">{{ $t('Enter the order number from your confirmation and the email you used at checkout.') }}</p>

    <p v-if="notFound" class="alert-error mt-4">{{ $t("We couldn't find an order with that number and email.") }}</p>

    <form class="card mt-6 space-y-4 p-5" @submit.prevent="submit">
      <div>
        <label for="number" class="label">{{ $t('Order number') }}</label>
        <input id="number" v-model="number" required placeholder="SO260924-ABCDE" class="input font-mono uppercase" />
      </div>
      <div>
        <label for="email" class="label">{{ $t('Email') }}</label>
        <input id="email" v-model="email" type="email" required autocomplete="email" class="input" />
      </div>
      <button type="submit" class="btn btn-primary w-full">{{ $t('Find order') }}</button>
    </form>
  </div>
</template>
