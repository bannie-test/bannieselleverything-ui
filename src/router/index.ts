import { createRouter, createWebHistory } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { useCustomerStore } from '@/stores/customer'

declare module 'vue-router' {
  interface RouteMeta {
    requiresCustomer?: boolean
    requiresAdmin?: boolean
    title?: string
  }
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/StorefrontLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/storefront/HomeView.vue') },
        { path: 'products', name: 'catalog', component: () => import('@/views/storefront/CatalogView.vue') },
        { path: 'products/:slug', name: 'product', component: () => import('@/views/storefront/ProductView.vue') },
        { path: 'cart', name: 'cart', component: () => import('@/views/storefront/CartView.vue') },
        { path: 'checkout', name: 'checkout', component: () => import('@/views/storefront/CheckoutView.vue') },
        { path: 'track', name: 'track-order', component: () => import('@/views/storefront/TrackOrderView.vue') },
        { path: 'orders/:number', name: 'order', component: () => import('@/views/storefront/OrderView.vue') },
        { path: 'account/login', name: 'login', component: () => import('@/views/storefront/LoginView.vue') },
        { path: 'account/register', name: 'register', component: () => import('@/views/storefront/RegisterView.vue') },
        ...(
          [
            ['orders', 'my-orders', () => import('@/views/storefront/MyOrdersView.vue')],
            ['wishlist', 'wishlist', () => import('@/views/storefront/WishlistView.vue')],
            ['notifications', 'notifications', () => import('@/views/storefront/NotificationsView.vue')],
            ['support', 'support', () => import('@/views/storefront/SupportView.vue')],
            ['support/:number', 'support-ticket', () => import('@/views/storefront/SupportTicketView.vue')],
            ['profile', 'profile', () => import('@/views/storefront/ProfileView.vue')],
            ['addresses', 'addresses', () => import('@/views/storefront/AddressesView.vue')],
          ] as const
        ).map(([path, name, component]) => ({ path: `account/${path}`, name, component, meta: { requiresCustomer: true } })),
      ],
    },
    { path: '/admin/login', name: 'admin-login', component: () => import('@/views/admin/AdminLoginView.vue') },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAdmin: true },
      children: [
        { path: '', name: 'admin-dashboard', component: () => import('@/views/admin/DashboardView.vue') },
        { path: 'orders', name: 'admin-orders', component: () => import('@/views/admin/OrdersView.vue') },
        { path: 'orders/:number', name: 'admin-order', component: () => import('@/views/admin/OrderDetailView.vue') },
        { path: 'products', name: 'admin-products', component: () => import('@/views/admin/ProductsView.vue') },
        { path: 'products/new', name: 'admin-product-new', component: () => import('@/views/admin/ProductEditView.vue') },
        { path: 'products/:id', name: 'admin-product-edit', component: () => import('@/views/admin/ProductEditView.vue') },
        { path: 'categories', name: 'admin-categories', component: () => import('@/views/admin/CategoriesView.vue') },
        { path: 'reviews', name: 'admin-reviews', component: () => import('@/views/admin/ReviewsView.vue') },
        { path: 'support', name: 'admin-support', component: () => import('@/views/admin/SupportView.vue') },
        { path: 'support/:number', name: 'admin-support-ticket', component: () => import('@/views/admin/SupportTicketView.vue') },
        { path: 'settings', name: 'admin-settings', component: () => import('@/views/admin/SettingsView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
})

router.beforeEach((to) => {
  if (to.matched.some((r) => r.meta.requiresAdmin) && !useAdminStore().isSignedIn) {
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }
  if (to.matched.some((r) => r.meta.requiresCustomer) && !useCustomerStore().isSignedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})
