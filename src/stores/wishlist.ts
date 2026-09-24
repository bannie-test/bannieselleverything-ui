import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '@/api/client'

/** Ids of the signed-in customer's saved products, so any product card can show and toggle its heart. */
export const useWishlistStore = defineStore('wishlist', () => {
  const ids = ref(new Set<string>())
  const loaded = ref(false)

  async function load() {
    ids.value = new Set((await http.get<string[]>('/storefront/account/wishlist/ids')).data)
    loaded.value = true
  }

  function has(productId: string) {
    return ids.value.has(productId)
  }

  /** Optimistic: the heart flips at once and flips back if the request fails. */
  async function toggle(productId: string) {
    const adding = !ids.value.has(productId)
    const next = new Set(ids.value)
    if (adding) next.add(productId)
    else next.delete(productId)
    ids.value = next
    try {
      if (adding) await http.put(`/storefront/account/wishlist/${productId}`)
      else await http.delete(`/storefront/account/wishlist/${productId}`)
    } catch (error) {
      const reverted = new Set(ids.value)
      if (adding) reverted.delete(productId)
      else reverted.add(productId)
      ids.value = reverted
      throw error
    }
  }

  function reset() {
    ids.value = new Set()
    loaded.value = false
  }

  return { ids, loaded, load, has, toggle, reset }
})
