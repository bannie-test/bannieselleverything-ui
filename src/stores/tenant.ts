import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '@/api/client'
import type { Category, TenantInfo } from '@/api/types'

/** The shop this subdomain belongs to. Loaded once at boot; drives branding and navigation. */
export const useTenantStore = defineStore('tenant', () => {
  const info = ref<TenantInfo | null>(null)
  const categories = ref<Category[]>([])
  const notFound = ref(false)
  let loading: Promise<void> | null = null

  function load() {
    loading ??= (async () => {
      try {
        const [tenant, cats] = await Promise.all([
          http.get<TenantInfo>('/storefront/tenant-info'),
          http.get<Category[]>('/storefront/categories'),
        ])
        info.value = tenant.data
        categories.value = cats.data
        document.documentElement.style.setProperty('--tenant-primary', tenant.data.primaryColor)
        document.title = tenant.data.name
      } catch (error) {
        notFound.value = (error as { response?: { status?: number } }).response?.status === 404
        loading = null
        if (!notFound.value) throw error
      }
    })()
    return loading
  }

  /** Top-level categories, each with its active children. */
  function tree() {
    return categories.value
      .filter((c) => !c.parentId)
      .map((parent) => ({ ...parent, children: categories.value.filter((c) => c.parentId === parent.id) }))
  }

  return { info, categories, notFound, load, tree }
})
