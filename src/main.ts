import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { onUnauthorized } from './api/client'
import { useAdminStore } from './stores/admin'
import { useCustomerStore } from './stores/customer'
import './style.css'

const app = createApp(App).use(createPinia()).use(router)

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
