import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { onUnauthorized } from './api/client'
import { useAdminStore } from './stores/admin'
import { useCustomerStore } from './stores/customer'
import { t } from './i18n'
// Applies the last-used color mode before the first paint.
import './utils/theme'
import './style.css'

const app = createApp(App).use(createPinia()).use(router)
app.config.globalProperties.$t = t

// An expired or revoked token signs that realm out and sends the user to its login page.
onUnauthorized((isAdmin) => {
  const current = router.currentRoute.value.fullPath
  if (isAdmin) {
    useAdminStore().signOut()
    router.push({ name: 'admin-login', query: { redirect: current } })
  } else {
    useCustomerStore().signOut()
    if (router.currentRoute.value.matched.some((r) => r.meta.requiresCustomer)) {
      router.push({ name: 'login', query: { redirect: current } })
    }
  }
})

app.mount('#app')
