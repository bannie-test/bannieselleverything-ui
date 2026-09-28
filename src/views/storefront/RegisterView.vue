<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { errorMessage, fieldErrors } from '@/api/client'
import { useCustomerStore } from '@/stores/customer'

const route = useRoute()
const router = useRouter()
const customer = useCustomerStore()

const form = reactive({ fullName: '', email: '', phone: '', password: '' })
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const submitting = ref(false)

async function submit() {
  submitting.value = true
  errors.value = {}
  error.value = null
  try {
    await customer.register({ ...form, phone: form.phone || undefined })
    const r = route.query.redirect
    await router.replace(typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) error.value = errorMessage(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm py-4">
    <h1 class="text-2xl font-semibold">{{ $t('Create an account') }}</h1>
    <p class="mt-1 text-sm text-stone-600">
      {{ $t('Already have one?') }}
      <RouterLink :to="{ name: 'login', query: route.query }" class="link">{{ $t('Sign in') }}</RouterLink>
    </p>

    <form class="card mt-6 space-y-4 p-5" novalidate @submit.prevent="submit">
      <p v-if="error" class="alert-error">{{ error }}</p>
      <div>
        <label for="fullName" class="label">{{ $t('Full name') }}</label>
        <input id="fullName" v-model="form.fullName" required autocomplete="name" :class="{ 'input-error': errors.fullName }" class="input" />
        <p v-if="errors.fullName" class="field-error">{{ errors.fullName }}</p>
      </div>
      <div>
        <label for="email" class="label">{{ $t('Email') }}</label>
        <input id="email" v-model="form.email" type="email" required autocomplete="email" :class="{ 'input-error': errors.email }" class="input" />
        <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
      </div>
      <div>
        <label for="phone" class="label">{{ $t('Phone') }} <span class="font-normal text-stone-400">({{ $t('optional') }})</span></label>
        <input id="phone" v-model="form.phone" type="tel" autocomplete="tel" class="input" />
      </div>
      <div>
        <label for="password" class="label">{{ $t('Password') }}</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          :class="{ 'input-error': errors.password }"
          class="input"
        />
        <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        <p v-else class="mt-1 text-xs text-stone-500">{{ $t('At least 8 characters.') }}</p>
      </div>
      <button type="submit" class="btn btn-primary w-full" :disabled="submitting">{{ submitting ? $t('Creating account…') : $t('Create account') }}</button>
    </form>
  </div>
</template>
