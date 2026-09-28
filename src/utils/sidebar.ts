import type { RouteLocationRaw } from 'vue-router'
import type { SidebarKey } from '@/api/types'

interface SidebarEntry {
  label: string
  to: RouteLocationRaw
  /** Route name for exact matching, or a prefix of the route names that belong to this entry. */
  route: string
  match: string
  exact?: boolean
  /** SVG path (24×24, stroked). */
  icon: string
}

/** Must match TenantAppearance.SidebarKeys on the API. */
export const sidebarKeys: SidebarKey[] = ['dashboard', 'orders', 'products', 'categories', 'customers', 'promotions', 'reports', 'settings']

export const sidebarDefaults: Record<SidebarKey, SidebarEntry> = {
  dashboard: {
    label: 'Dashboard',
    to: { name: 'admin-dashboard' },
    route: 'admin-dashboard',
    match: 'admin-dashboard',
    exact: true,
    icon: 'M4 13h6V4H4v9Zm10 7h6V11h-6v9ZM4 20h6v-4H4v4Zm10-16v4h6V4h-6Z',
  },
  orders: {
    label: 'Orders',
    to: { name: 'admin-orders' },
    route: 'admin-orders',
    match: 'admin-order',
    icon: 'M6 3h12l1 5H5l1-5Zm-1 5h14v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8Zm4 4h6',
  },
  products: {
    label: 'Products',
    to: { name: 'admin-products' },
    route: 'admin-products',
    match: 'admin-product',
    icon: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v18m8-13.5-8 4.5-8-4.5',
  },
  categories: {
    label: 'Categories',
    to: { name: 'admin-categories' },
    route: 'admin-categories',
    match: 'admin-categories',
    icon: 'M4 6h7v5H4V6Zm9 0h7v5h-7V6Zm-9 7h7v5H4v-5Zm9 0h7v5h-7v-5Z',
  },
  customers: {
    label: 'Customers',
    to: { name: 'admin-customers' },
    route: 'admin-customers',
    match: 'admin-customers',
    icon: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m17 0v-1a4 4 0 0 0-3-3.87M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6-6.87a3.5 3.5 0 0 1 0 6.74',
  },
  promotions: {
    label: 'Promotions',
    to: { name: 'admin-promotions', params: { tab: 'discounts' } },
    route: 'admin-promotions',
    match: 'admin-promotions',
    icon: 'M9 15 15 9m-5.5.5h.01m4.99 5h.01M4 12l1.5-1.5V8a2.5 2.5 0 0 1 2.5-2.5h2.5L12 4l1.5 1.5H16A2.5 2.5 0 0 1 18.5 8v2.5L20 12l-1.5 1.5V16a2.5 2.5 0 0 1-2.5 2.5h-2.5L12 20l-1.5-1.5H8A2.5 2.5 0 0 1 5.5 16v-2.5L4 12Z',
  },
  reports: {
    label: 'Reports',
    to: { name: 'admin-reports' },
    route: 'admin-reports',
    match: 'admin-reports',
    icon: 'M4 20V10m6 10V4m6 16v-7m4 7H3',
  },
  settings: {
    label: 'Settings',
    to: { name: 'admin-settings' },
    route: 'admin-settings',
    match: 'admin-settings',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.3 7.3 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.3 7.3 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.3 7.3 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.3 7.3 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  },
}
