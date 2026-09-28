import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CART_TOKEN_KEY, http } from '@/api/client'
import type { Cart } from '@/api/types'
import { storage } from '@/utils/storage'

const emptyCart = (): Cart => ({
  token: null,
  items: [],
  itemCount: 0,
  subtotalMinor: 0,
  currency: 'VND',
  productDiscountMinor: 0,
  membership: null,
  membershipDiscountMinor: 0,
  voucher: null,
  voucherDiscountMinor: 0,
  shippingMinor: 0,
  totalMinor: 0,
})

export const useCartStore = defineStore('cart', () => {
  const cart = ref<Cart>(emptyCart())
  const loaded = ref(false)

  function apply(next: Cart) {
    cart.value = next
    // Guest carts come with a token; customer carts don't need one.
    if (next.token) storage.set(CART_TOKEN_KEY, next.token)
    loaded.value = true
  }

  async function load() {
    apply((await http.get<Cart>('/storefront/cart')).data)
  }

  async function add(productId: string, quantity = 1) {
    apply((await http.post<Cart>('/storefront/cart/items', { productId, quantity })).data)
  }

  async function setQuantity(productId: string, quantity: number) {
    apply((await http.put<Cart>(`/storefront/cart/items/${productId}`, { quantity })).data)
  }

  async function remove(productId: string) {
    apply((await http.delete<Cart>(`/storefront/cart/items/${productId}`)).data)
  }

  async function applyVoucher(code: string) {
    apply((await http.put<Cart>('/storefront/cart/voucher', { code })).data)
  }

  async function removeVoucher() {
    apply((await http.delete<Cart>('/storefront/cart/voucher')).data)
  }

  async function mergeGuestCart() {
    const { data } = await http.post<Cart>('/storefront/cart/merge')
    storage.set(CART_TOKEN_KEY, null)
    apply(data)
  }

  /** After checkout or sign-out: forget the cart locally. */
  function reset() {
    storage.set(CART_TOKEN_KEY, null)
    cart.value = emptyCart()
  }

  return { cart, loaded, load, add, setQuantity, remove, applyVoucher, removeVoucher, mergeGuestCart, reset }
})
