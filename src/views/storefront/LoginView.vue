<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { errorMessage } from '@/api/client'
import { useCustomerStore } from '@/stores/customer'

const route = useRoute()
const router = useRouter()
const customer = useCustomerStore()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

/** Only follow same-site paths, never an absolute URL from the query string. */
function redirectTarget() {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/'
}

async function submit() {
  submitting.value = true
  error.value = null
  try {
    await customer.login(email.value, password.value)
    await router.replace(redirectTarget())
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm py-4">
    <h1 class="text-2xl font-semibold">Sign in</h1>
    <p class="mt-1 text-sm text-stone-600">
      New here?
      <RouterLink :to="{ name: 'register', query: route.query }" class="link">Create an account</RouterLink>
    </p>

    <form class="card mt-6 space-y-4 p-5" @submit.prevent="submit">
      <p v-if="error" class="alert-error">{{ error }}</p>
      <div>
        <label for="email" class="label">Email</label>
        <input id="email" v-model="email" type="email" required autocomplete="email" class="input" />
      </div>
      <div>
        <label for="password" class="label">Password</label>
        <input id="password" v-model="password" type="password" required autocomplete="current-password" class="input" />
      </div>
      <button type="submit" class="btn btn-primary w-full" :disabled="submitting">{{ submitting ? 'Signing in…' : 'Sign in' }}</button>
    </form>
    <p class="mt-4 text-center text-sm text-stone-600">
      Checked out as a guest? <RouterLink :to="{ name: 'track-order' }" class="link">Track your order</RouterLink>
    </p>
  </div>
</template>
