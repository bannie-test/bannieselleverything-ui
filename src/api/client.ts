import axios, { AxiosError } from 'axios'
import { storage } from '@/utils/storage'

// Same-origin: the dev server (and the Worker in production) proxies /api to the backend,
// forwarding this shop's host so the API knows which tenant we are.
export const http = axios.create({ baseURL: '/api' })

export const CUSTOMER_TOKEN_KEY = 'customer-token'
export const ADMIN_TOKEN_KEY = 'admin-token'
export const CART_TOKEN_KEY = 'cart-token'
/** Email of the last guest order, so its confirmation page can load without asking again. */
export const LAST_ORDER_EMAIL_KEY = 'last-order-email'

// Admin calls carry the shop-admin token, storefront calls the customer token. Guest
// carts are identified by an opaque token the API hands out on the first add-to-cart.
http.interceptors.request.use((config) => {
  const isAdmin = config.url?.startsWith('/admin') ?? false
  const token = storage.get(isAdmin ? ADMIN_TOKEN_KEY : CUSTOMER_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`

  const cartToken = storage.get(CART_TOKEN_KEY)
  if (!isAdmin && cartToken) config.headers['X-Cart-Token'] = cartToken
  return config
})

/** Called when a request comes back 401 so the owning store can sign the user out. */
const unauthorizedHandlers: Array<(isAdmin: boolean) => void> = []
export function onUnauthorized(handler: (isAdmin: boolean) => void) {
  unauthorizedHandlers.push(handler)
}

http.interceptors.response.use(undefined, (error: AxiosError) => {
  const url = error.config?.url ?? ''
  const hadToken = Boolean(error.config?.headers?.Authorization)
  if (error.response?.status === 401 && hadToken && !url.includes('/auth/login')) {
    unauthorizedHandlers.forEach((h) => h(url.startsWith('/admin')))
  }
  return Promise.reject(error)
})

interface ProblemDetails {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

/** A human-readable message from an API error (ProblemDetails) or a network failure. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof AxiosError) {
    const problem = error.response?.data as ProblemDetails | string | undefined
    if (typeof problem === 'string' && problem) return problem
    if (problem && typeof problem === 'object') {
      if (problem.errors) {
        const first = Object.values(problem.errors).flat()[0]
        if (first) return first
      }
      if (problem.detail) return problem.detail
      if (problem.title && error.response?.status !== 500) return problem.title
    }
    if (!error.response) return 'Cannot reach the server. Check your connection.'
  }
  return fallback
}

/** Per-field validation messages from a 400 ValidationProblemDetails, keyed by camelCase field name. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AxiosError)) return {}
  const errors = (error.response?.data as ProblemDetails | undefined)?.errors ?? {}
  return Object.fromEntries(
    Object.entries(errors).map(([key, messages]) => [
      key
        .split('.')
        .map((part) => part.charAt(0).toLowerCase() + part.slice(1))
        .join('.'),
      messages[0] ?? '',
    ]),
  )
}
