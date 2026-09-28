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
  theme: StorefrontTheme
  /** Present only when the shop accepts bank transfers. */
  bankTransfer: BankTransferInfo | null
}

export interface BankTransferInfo {
  bankName: string
  accountNumber: string
  accountName: string
}

export type FontFamily = 'system' | 'inter' | 'be-vietnam-pro' | 'nunito' | 'lora' | 'playfair'
export type CornerStyle = 'sharp' | 'rounded' | 'pill'
export type SidebarStyle = 'dark' | 'light' | 'brand'
export type SidebarKey =
  | 'dashboard'
  | 'orders'
  | 'products'
  | 'categories'
  | 'reviews'
  | 'customers'
  | 'support'
  | 'promotions'
  | 'reports'
  | 'settings'

export interface StorefrontTheme {
  accentColor: string
  fontFamily: FontFamily
  cornerStyle: CornerStyle
  heroTitle: string | null
  heroSubtitle: string | null
  heroImageUrl: string | null
  announcementText: string | null
}

export interface SidebarItem {
  key: SidebarKey
  label: string | null
  visible: boolean
}

export interface Appearance extends StorefrontTheme {
  sidebarStyle: SidebarStyle
  sidebarCompact: boolean
  sidebarItems: SidebarItem[]
}

export interface ShopSettings {
  slug: string
  name: string
  logoUrl: string | null
  primaryColor: string
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  currency: string
  flatShippingMinor: number
  bankTransferEnabled: boolean
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  appearance: Appearance
}

export type SaveShopSettings = Omit<ShopSettings, 'slug' | 'currency'>

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
  /** Price after the best running automatic discount; null when none applies. */
  discountedPriceMinor: number | null
  lowStock: boolean
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
  parentCategory: CategoryRef | null
  discountedPriceMinor: number | null
  discountName: string | null
  lowStockThreshold: number
  ratingAverage: number | null
  reviewCount: number
}

export interface CartItem {
  productId: string
  categoryId: string | null
  name: string
  slug: string
  imageUrl: string | null
  /** List price. */
  unitPriceMinor: number
  quantity: number
  lineTotalMinor: number
  /** Automatic discount on the whole line. */
  discountMinor: number
  discountName: string | null
  stockQuantity: number
  available: boolean
}

export type VoucherType = 'Percentage' | 'FixedAmount' | 'FreeShipping'

export interface MembershipQuote {
  tierId: string
  name: string
  discountPercent: number
  color: string
}

export interface VoucherQuote {
  code: string
  description: string | null
  type: VoucherType
  discountMinor: number
  /** False when the code can't be used right now; `message` says why. */
  applied: boolean
  message: string | null
}

export interface Cart {
  token: string | null
  items: CartItem[]
  itemCount: number
  subtotalMinor: number
  currency: string
  productDiscountMinor: number
  membership: MembershipQuote | null
  membershipDiscountMinor: number
  voucher: VoucherQuote | null
  voucherDiscountMinor: number
  shippingMinor: number
  totalMinor: number
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
  discountMinor: number
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
  productDiscountMinor: number
  membershipDiscountMinor: number
  voucherDiscountMinor: number
  voucherCode: string | null
  membershipTierName: string | null
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
  discountMinor: number
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
  createdAt: string
  lowStockThreshold: number
  isLowStock: boolean
  isFeatured: boolean
  suggestedProductIds: string[]
  /** Filled on the single-product endpoints only. */
  suggestedProducts: ProductRef[]
}

export interface ProductRef {
  id: string
  name: string
  sku: string | null
  imageUrl: string | null
  isActive: boolean
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
  lowStockThreshold: number
  isFeatured: boolean
  suggestedProductIds: string[]
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

// ---- Promotions ----

export type DiscountType = 'Percentage' | 'FixedAmount'
export type DiscountScope = 'AllProducts' | 'Categories' | 'Products'
export type PromotionStatus = 'Active' | 'Scheduled' | 'Expired' | 'Used up' | 'Off'

export interface Discount {
  id: string
  name: string
  type: DiscountType
  value: number
  scope: DiscountScope
  categoryIds: string[]
  productIds: string[]
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  status: PromotionStatus
}

export type SaveDiscount = Omit<Discount, 'id' | 'status'>

export interface Voucher {
  id: string
  code: string
  description: string | null
  type: VoucherType
  value: number
  maxDiscountMinor: number | null
  minSubtotalMinor: number
  startsAt: string | null
  endsAt: string | null
  usageLimit: number | null
  perCustomerLimit: number | null
  usedCount: number
  isActive: boolean
  status: PromotionStatus
}

export type SaveVoucher = Omit<Voucher, 'id' | 'status' | 'usedCount'>

export interface MembershipTier {
  id: string
  name: string
  minSpentMinor: number
  discountPercent: number
  color: string
  benefits: string | null
  memberCount: number
}

export type SaveMembershipTier = Omit<MembershipTier, 'id' | 'memberCount'>

export interface MyMembership {
  current: MembershipTier | null
  spentMinor: number
  next: MembershipTier | null
  remainingMinor: number
  tiers: MembershipTier[]
  currency: string
}

export interface AdminCustomer {
  id: string
  email: string
  fullName: string
  phone: string | null
  tier: { id: string; name: string; color: string } | null
  orderCount: number
  /** Total of delivered orders, which membership tiers are based on. */
  spentMinor: number
  lastOrderAt: string | null
  createdAt: string
}

// ---- Reports ----

export interface ReportPeriod {
  from: string
  to: string
  currency: string
  generatedAt: string
}

export interface SalesTotals {
  orders: number
  units: number
  grossMinor: number
  discountMinor: number
  netMinor: number
  shippingMinor: number
  collectedMinor: number
  averageOrderMinor: number
  cancelledOrders: number
}

export interface SalesDay extends Omit<SalesTotals, 'averageOrderMinor' | 'cancelledOrders'> {
  date: string
}

export interface SalesReport {
  period: ReportPeriod
  totals: SalesTotals
  daily: SalesDay[]
  byCategory: { category: string; units: number; netMinor: number }[]
}

export interface OrderReportRow {
  orderNumber: string
  placedAt: string
  status: OrderStatus
  customerEmail: string
  recipientName: string
  isGuest: boolean
  units: number
  subtotalMinor: number
  discountMinor: number
  shippingMinor: number
  totalMinor: number
  voucherCode: string | null
}

export interface OrderReport {
  period: ReportPeriod
  totalOrders: number
  byStatus: { status: OrderStatus; orders: number; totalMinor: number }[]
  orders: OrderReportRow[]
  truncated: boolean
}

export interface ProductReportRow {
  productId: string
  name: string
  sku: string | null
  category: string | null
  unitsSold: number
  grossMinor: number
  discountMinor: number
  netMinor: number
  stock: number
  lowStockThreshold: number
  isActive: boolean
  isDeleted: boolean
}

export interface ProductReport {
  period: ReportPeriod
  inventory: { products: number; unitsInStock: number; stockValueMinor: number; lowStock: number; outOfStock: number }
  products: ProductReportRow[]
}

export interface CustomerReportRow {
  email: string
  name: string
  isRegistered: boolean
  tier: string | null
  orders: number
  units: number
  spentMinor: number
  firstOrderAt: string
  lastOrderAt: string
}

export interface CustomerReport {
  period: ReportPeriod
  newAccounts: number
  buyers: number
  repeatBuyers: number
  guestOrders: number
  averageSpendMinor: number
  customers: CustomerReportRow[]
}
