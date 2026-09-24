import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { CUSTOMER_TOKEN_KEY, http } from '@/api/client'
import type { Customer, CustomerAuth } from '@/api/types'
import { storage } from '@/utils/storage'
import { useCartStore } from './cart'
import { useNotificationsStore } from './notifications'
import { useWishlistStore } from './wishlist'

export const useCustomerStore = defineStore('customer', () => {
  const token = ref<string | null>(storage.get(CUSTOMER_TOKEN_KEY))
  const customer = ref<Customer | null>(null)
  const isSignedIn = computed(() => Boolean(token.value))

  async function signedIn(auth: CustomerAuth) {
    token.value = auth.accessToken
    customer.value = auth.customer
    storage.set(CUSTOMER_TOKEN_KEY, auth.accessToken)
    // Keep what the guest put in the cart before signing in.
    await useCartStore().mergeGuestCart()
    startSession()
  }

  /** Per-customer data that lives alongside the session: wishlist hearts and the notification badge. */
  function startSession() {
    useWishlistStore().load().catch(() => {})
    useNotificationsStore().start()
  }

  async function login(email: string, password: string) {
    const { data } = await http.post<CustomerAuth>('/storefront/auth/login', { email, password })
    await signedIn(data)
  }

  async function register(payload: { email: string; password: string; fullName: string; phone?: string }) {
    const { data } = await http.post<CustomerAuth>('/storefront/auth/register', payload)
    await signedIn(data)
  }

  /** Restores the profile for a token kept from an earlier visit. */
  async function restore() {
    if (!token.value || customer.value) return
    try {
      customer.value = (await http.get<Customer>('/storefront/account/me')).data
      startSession()
    } catch {
      signOut()
    }
  }

  async function updateProfile(payload: { fullName: string; phone: string | null }) {
    customer.value = (await http.put<Customer>('/storefront/account/me', payload)).data
  }

  /** Keeps the cached profile's default address in step after address book changes. */
  async function reload() {
    customer.value = (await http.get<Customer>('/storefront/account/me')).data
  }

  function signOut() {
    token.value = null
    customer.value = null
    storage.set(CUSTOMER_TOKEN_KEY, null)
    useCartStore().reset()
    useWishlistStore().reset()
    useNotificationsStore().stop()
  }

  return { token, customer, isSignedIn, login, register, restore, updateProfile, reload, signOut }
})
