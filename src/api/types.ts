// Mirrors the API's DTOs. Money is always an integer amount in minor units (VND has none, so đồng).

export interface Paged<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface TenantInfo {
  slug: string
  name: string
  logoUrl: string | null
  primaryColor: string
  currency: string
  flatShippingMinor: number
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  /** Present only when the shop accepts bank transfers. */
  bankTransfer: BankTransferInfo | null
}

export interface BankTransferInfo {
  bankName: string
  accountNumber: string
  accountName: string
}

export interface CategoryRef {
  id: string
  name: string
  slug: string
}

export interface Category extends CategoryRef {
  parentId: string | null
  sortOrder: number
  isActive: boolean
}

export interface ProductSummary {
  id: string
  name: string
  slug: string
  priceMinor: number
  compareAtPriceMinor: number | null
  currency: string
  imageUrl: string | null
  inStock: boolean
  category: CategoryRef | null
  ratingAverage: number | null
  reviewCount: number
}

export interface ProductDetail {
  id: string
  name: string
  slug: string
  description: string | null
  priceMinor: number
  compareAtPriceMinor: number | null
  currency: string
  stockQuantity: number
  sku: string | null
  images: string[]
  attributes: Record<string, string>
  category: CategoryRef | null
  ratingAverage: number | null
  reviewCount: number
}

export interface CartItem {
  productId: string
  name: string
  slug: string
  imageUrl: string | null
  unitPriceMinor: number
  quantity: number
  lineTotalMinor: number
  stockQuantity: number
  available: boolean
}

export interface Cart {
  token: string | null
  items: CartItem[]
  itemCount: number
  subtotalMinor: number
  currency: string
}

export interface Address {
  recipientName: string
  phone: string
  province: string
  district: string
  ward: string
  streetAddress: string
}

export type OrderStatus =
  | 'Pending'
  | 'AwaitingPayment'
  | 'Paid'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded'

export type PaymentMethod = 'CashOnDelivery' | 'BankTransfer'

export interface OrderEvent {
  status: OrderStatus
  note: string | null
  occurredAt: string
}

export interface OrderItem {
  productId: string
  productName: string
  unitPriceMinor: number
  quantity: number
  lineTotalMinor: number
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  customerEmail: string
  isGuest: boolean
  subtotalMinor: number
  shippingMinor: number
  totalMinor: number
  currency: string
  shippingAddress: Address
  notes: string | null
  placedAt: string
  items: OrderItem[]
  canCancel: boolean
  paymentMethod: PaymentMethod
  paidAt: string | null
  shippingCarrier: string | null
  trackingNumber: string | null
  timeline: OrderEvent[]
}

export interface OrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  customerEmail: string
  recipientName: string
  totalMinor: number
  currency: string
  itemCount: number
  placedAt: string
}

export interface Customer {
  id: string
  email: string
  fullName: string
  phone: string | null
  defaultAddress: Address | null
}

export interface CustomerAuth {
  accessToken: string
  expiresAt: string
  customer: Customer
}

export interface ShopUser {
  id: string
  email: string
  fullName: string
  role: 'ShopOwner' | 'ShopStaff'
  tenantSlug: string
  tenantName: string
}

export interface AdminAuth {
  accessToken: string
  expiresAt: string
  user: ShopUser
}

export interface AdminProduct {
  id: string
  name: string
  slug: string
  description: string | null
  categoryId: string | null
  categoryName: string | null
  priceMinor: number
  compareAtPriceMinor: number | null
  currency: string
  stockQuantity: number
  sku: string | null
  isActive: boolean
  images: string[]
  attributes: Record<string, string>
  updatedAt: string
}

export interface SaveProduct {
  name: string
  slug: string | null
  description: string | null
  categoryId: string | null
  priceMinor: number
  compareAtPriceMinor: number | null
  stockQuantity: number
  sku: string | null
  isActive: boolean
  images: string[]
  attributes: Record<string, string>
}

export interface SaveCategory {
  name: string
  slug: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
}

export interface AdminOrder {
  order: Order
  nextStatuses: OrderStatus[]
}

export interface Dashboard {
  ordersToday: number
  revenueTodayMinor: number
  pendingOrders: number
  lowStockProducts: number
  activeProducts: number
  revenue30DaysMinor: number
  orders30Days: number
  currency: string
  daily: { date: string; revenueMinor: number; orders: number }[]
  awaitingPaymentOrders: number
  openSupportTickets: number
}

export interface SavedAddress extends Address {
  id: string
  isDefault: boolean
}

export interface Review {
  id: string
  rating: number
  title: string | null
  body: string | null
  authorName: string
  isVerifiedPurchase: boolean
  createdAt: string
  isMine: boolean
}

export interface ReviewPage {
  summary: {
    ratingAverage: number | null
    reviewCount: number
    /** Number of 1- to 5-star reviews at indexes 0 to 4. */
    distribution: number[]
  }
  reviews: Paged<Review>
}

export interface AdminReview {
  id: string
  productId: string
  productName: string
  productSlug: string
  rating: number
  title: string | null
  body: string | null
  authorName: string
  isVerifiedPurchase: boolean
  createdAt: string
}

export type NotificationType = 'OrderUpdate' | 'SupportReply'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  createdAt: string
  isRead: boolean
}

export type TicketStatus = 'Open' | 'Answered' | 'Closed'

export interface TicketSummary {
  number: string
  subject: string
  orderNumber: string | null
  status: TicketStatus
  createdAt: string
  lastMessageAt: string
  lastAuthor: 'Customer' | 'Staff'
}

export interface SupportMessage {
  id: string
  authorType: 'Customer' | 'Staff'
  authorName: string
  body: string
  createdAt: string
}

export interface Ticket {
  number: string
  subject: string
  orderNumber: string | null
  status: TicketStatus
  createdAt: string
  messages: SupportMessage[]
}

export interface AdminTicket {
  ticket: Ticket
  customerName: string
  customerEmail: string
  customerPhone: string | null
}

export interface AdminTicketSummary {
  ticket: TicketSummary
  customerName: string
  customerEmail: string
}

export interface ShopSettings {
  name: string
  logoUrl: string | null
  primaryColor: string
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  flatShippingMinor: number
  bankTransferEnabled: boolean
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
}
