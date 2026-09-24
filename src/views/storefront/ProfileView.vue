<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { errorMessage, fieldErrors, http } from '@/api/client'
import AccountShell from '@/components/AccountShell.vue'
import { useCustomerStore } from '@/stores/customer'

const customer = useCustomerStore()

const profile = reactive({ fullName: '', phone: '' })
const profileErrors = ref<Record<string, string>>({})
const profileMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const savingProfile = ref(false)

const password = reactive({ currentPassword: '', newPassword: '', confirm: '' })
const passwordErrors = ref<Record<string, string>>({})
const passwordMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const savingPassword = ref(false)

watch(
  () => customer.customer,
  (c) => {
    profile.fullName = c?.fullName ?? ''
    profile.phone = c?.phone ?? ''
  },
  { immediate: true },
)

async function saveProfile() {
  savingProfile.value = true
  profileErrors.value = {}
  profileMessage.value = null
  try {
    await customer.updateProfile({ fullName: profile.fullName, phone: profile.phone || null })
    profileMessage.value = { type: 'success', text: 'Profile saved.' }
  } catch (e) {
    profileErrors.value = fieldErrors(e)
    if (!Object.keys(profileErrors.value).length) profileMessage.value = { type: 'error', text: errorMessage(e) }
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  passwordErrors.value = {}
  passwordMessage.value = null
  if (password.newPassword !== password.confirm) {
    passwordErrors.value = { confirm: "The passwords don't match." }
    return
  }
  savingPassword.value = true
  try {
    await http.post('/storefront/account/password', { currentPassword: password.currentPassword, newPassword: password.newPassword })
    Object.assign(password, { currentPassword: '', newPassword: '', confirm: '' })
    passwordMessage.value = { type: 'success', text: 'Password changed. Use your new password next time you sign in.' }
  } catch (e) {
    passwordErrors.value = fieldErrors(e)
    if (!Object.keys(passwordErrors.value).length) passwordMessage.value = { type: 'error', text: errorMessage(e) }
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <AccountShell title="Profile">
    <div class="grid gap-6 xl:grid-cols-2">
      <form class="card space-y-4 p-5" novalidate @submit.prevent="saveProfile">
        <h2 class="font-semibold">Personal details</h2>
        <div>
          <label for="email" class="label">Email</label>
          <input id="email" :value="customer.customer?.email" disabled class="input" />
          <p class="mt-1 text-xs text-stone-500">Your email is your sign-in and can't be changed here.</p>
        </div>
        <div>
          <label for="fullName" class="label">Full name</label>
          <input id="fullName" v-model="profile.fullName" autocomplete="name" required :class="{ 'input-error': profileErrors.fullName }" class="input" />
          <p v-if="profileErrors.fullName" class="field-error">{{ profileErrors.fullName }}</p>
        </div>
        <div>
          <label for="phone" class="label">Phone (optional)</label>
          <input id="phone" v-model="profile.phone" type="tel" autocomplete="tel" :class="{ 'input-error': profileErrors.phone }" class="input" />
          <p v-if="profileErrors.phone" class="field-error">{{ profileErrors.phone }}</p>
        </div>
        <p v-if="profileMessage" :class="profileMessage.type === 'success' ? 'alert-success' : 'alert-error'">{{ profileMessage.text }}</p>
        <button type="submit" class="btn btn-primary" :disabled="savingProfile">{{ savingProfile ? 'Saving…' : 'Save changes' }}</button>
      </form>

      <form class="card space-y-4 p-5" novalidate @submit.prevent="changePassword">
        <h2 class="font-semibold">Change password</h2>
        <div>
          <label for="currentPassword" class="label">Current password</label>
          <input id="currentPassword" v-model="password.currentPassword" type="password" autocomplete="current-password" required class="input" />
        </div>
        <div>
          <label for="newPassword" class="label">New password</label>
          <input
            id="newPassword"
            v-model="password.newPassword"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            :class="{ 'input-error': passwordErrors.newPassword }"
            class="input"
          />
          <p v-if="passwordErrors.newPassword" class="field-error">{{ passwordErrors.newPassword }}</p>
          <p v-else class="mt-1 text-xs text-stone-500">At least 8 characters.</p>
        </div>
        <div>
          <label for="confirm" class="label">Confirm new password</label>
          <input id="confirm" v-model="password.confirm" type="password" autocomplete="new-password" required :class="{ 'input-error': passwordErrors.confirm }" class="input" />
          <p v-if="passwordErrors.confirm" class="field-error">{{ passwordErrors.confirm }}</p>
        </div>
        <p v-if="passwordMessage" :class="passwordMessage.type === 'success' ? 'alert-success' : 'alert-error'">{{ passwordMessage.text }}</p>
        <button type="submit" class="btn btn-primary" :disabled="savingPassword">{{ savingPassword ? 'Changing…' : 'Change password' }}</button>
      </form>
    </div>
  </AccountShell>
</template>
