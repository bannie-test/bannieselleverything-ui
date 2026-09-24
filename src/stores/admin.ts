import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ADMIN_TOKEN_KEY, http } from '@/api/client'
import type { AdminAuth, ShopUser } from '@/api/types'
import { storage } from '@/utils/storage'

export const useAdminStore = defineStore('admin', () => {
  const token = ref<string | null>(storage.get(ADMIN_TOKEN_KEY))
  const user = ref<ShopUser | null>(null)
  const isSignedIn = computed(() => Boolean(token.value))

  async function login(email: string, password: string) {
    const { data } = await http.post<AdminAuth>('/admin/auth/login', { email, password })
    token.value = data.accessToken
    user.value = data.user
    storage.set(ADMIN_TOKEN_KEY, data.accessToken)
  }

  async function restore() {
    if (!token.value || user.value) return
    try {
      user.value = (await http.get<ShopUser>('/admin/auth/me')).data
    } catch {
      signOut()
    }
  }

  function signOut() {
    token.value = null
    user.value = null
    storage.set(ADMIN_TOKEN_KEY, null)
  }

  return { token, user, isSignedIn, login, restore, signOut }
})
