<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { errorMessage } from '@/api/client'
import { useAdminStore } from '@/stores/admin'

const route = useRoute()
const router = useRouter()
const admin = useAdminStore()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

async function submit() {
  submitting.value = true
  error.value = null
  try {
    await admin.login(email.value, password.value)
    const r = route.query.redirect
    await router.replace(typeof r === 'string' && r.startsWith('/admin') ? r : { name: 'admin-dashboard' })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-stone-900 px-4">
    <div class="w-full max-w-sm">
      <p class="text-center text-xs tracking-wider text-stone-400 uppercase">Shop admin</p>
      <h1 class="mt-1 text-center text-2xl font-semibold text-white">Sign in to manage your shop</h1>
      <form class="card mt-6 space-y-4 p-6" @submit.prevent="submit">
        <p v-if="error" class="alert-error">{{ error }}</p>
        <div>
          <label for="email" class="label">Email</label>
          <input id="email" v-model="email" type="email" required autocomplete="username" class="input" />
        </div>
        <div>
          <label for="password" class="label">Password</label>
          <input id="password" v-model="password" type="password" required autocomplete="current-password" class="input" />
        </div>
        <button type="submit" class="btn btn-primary w-full" :disabled="submitting">{{ submitting ? 'Signing in…' : 'Sign in' }}</button>
      </form>
      <RouterLink :to="{ name: 'home' }" class="mt-4 block text-center text-sm text-stone-400 hover:text-white">← Back to storefront</RouterLink>
    </div>
  </div>
</template>
