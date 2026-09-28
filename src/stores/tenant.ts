import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { http } from '@/api/client'
import type { Category, TenantInfo } from '@/api/types'
import { locale } from '@/i18n'
import { applyTheme } from '@/utils/theme'

/** The shop this subdomain belongs to. Loaded once at boot; drives branding and navigation. */
export const useTenantStore = defineStore('tenant', () => {
  const info = ref<TenantInfo | null>(null)
  const categories = ref<Category[]>([])
  const notFound = ref(false)
  let loading: Promise<void> | null = null
  // The shop name, theme texts and categories come in the reader's language: load them again after a switch.
  watch(locale, () => (loading = null))

  function apply(tenant: TenantInfo) {
    info.value = tenant
    applyTheme({ primaryColor: tenant.primaryColor, ...tenant.theme })
    document.title = tenant.name
  }

  function load() {
    loading ??= (async () => {
      try {
        const [tenant, cats] = await Promise.all([
          http.get<TenantInfo>('/storefront/tenant-info'),
          http.get<Category[]>('/storefront/categories'),
        ])
        categories.value = cats.data
        apply(tenant.data)
      } catch (error) {
        notFound.value = (error as { response?: { status?: number } }).response?.status === 404
        loading = null
        if (!notFound.value) throw error
      }
    })()
    return loading
  }

  /** Re-reads the shop after its settings were saved, so the new theme shows right away. */
  async function refresh() {
    apply((await http.get<TenantInfo>('/storefront/tenant-info')).data)
  }

  /** Top-level categories, each with its active children. */
  function tree() {
    return categories.value
      .filter((c) => !c.parentId)
      .map((parent) => ({ ...parent, children: categories.value.filter((c) => c.parentId === parent.id) }))
  }

  return { info, categories, notFound, load, refresh, tree }
})
