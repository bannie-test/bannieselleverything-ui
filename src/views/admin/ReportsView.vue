<script setup lang="ts">
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { errorMessage, http } from '@/api/client'
import type { CustomerReport, OrderReport, ProductReport, SalesReport } from '@/api/types'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAdminStore } from '@/stores/admin'
import { intlLocale, t as tr } from '@/i18n'
import { downloadCsv } from '@/utils/csv'
import { formatDate, formatDateTime, isoDate, money, statusLabels } from '@/utils/format'
import { chartColors } from '@/utils/theme'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

type Tab = 'sales' | 'orders' | 'products' | 'customers'
const tabs: { key: Tab; label: string; title: string }[] = [
  { key: 'sales', label: 'Sales', title: 'Sales report' },
  { key: 'orders', label: 'Orders', title: 'Order report' },
  { key: 'products', label: 'Goods', title: 'Goods report' },
  { key: 'customers', label: 'Customers', title: 'Customer report' },
]

const route = useRoute()
const router = useRouter()
const admin = useAdminStore()

const tab = computed<Tab>(() => (tabs.some((t) => t.key === route.query.tab) ? (route.query.tab as Tab) : 'sales'))
const today = isoDate()
const from = computed(() => (typeof route.query.from === 'string' ? route.query.from : isoDate(new Date(Date.now() - 29 * 86_400_000))))
const to = computed(() => (typeof route.query.to === 'string' ? route.query.to : today))

const fromInput = ref(from.value)
const toInput = ref(to.value)
watch([from, to], ([f, t]) => ((fromInput.value = f), (toInput.value = t)))

const sales = ref<SalesReport | null>(null)
const orders = ref<OrderReport | null>(null)
const products = ref<ProductReport | null>(null)
const customers = ref<CustomerReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const productFilter = ref<'all' | 'sold' | 'low'>('all')

function go(patch: Record<string, string | undefined>) {
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries({ ...route.query, ...patch })) if (typeof v === 'string' && v) query[k] = v
  router.replace({ query })
}

function preset(kind: 'today' | '7' | '30' | '90' | 'month' | 'lastMonth' | 'year') {
  const now = new Date()
  const d = (y: number, m: number, day: number) => isoDate(new Date(y, m, day))
  const ranges = {
    today: [today, today],
    '7': [isoDate(new Date(Date.now() - 6 * 86_400_000)), today],
    '30': [isoDate(new Date(Date.now() - 29 * 86_400_000)), today],
    '90': [isoDate(new Date(Date.now() - 89 * 86_400_000)), today],
    month: [d(now.getFullYear(), now.getMonth(), 1), today],
    lastMonth: [d(now.getFullYear(), now.getMonth() - 1, 1), d(now.getFullYear(), now.getMonth(), 0)],
    year: [d(now.getFullYear(), 0, 1), today],
  } as const
  const [f, t] = ranges[kind]
  go({ from: f, to: t })
}

watch(
  () => [tab.value, from.value, to.value] as const,
  async ([t, f, tt]) => {
    loading.value = true
    error.value = null
    try {
      const params = { from: f, to: tt }
      if (t === 'sales') sales.value = (await http.get<SalesReport>('/admin/reports/sales', { params })).data
      else if (t === 'orders') orders.value = (await http.get<OrderReport>('/admin/reports/orders', { params })).data
      else if (t === 'products') products.value = (await http.get<ProductReport>('/admin/reports/products', { params })).data
      else customers.value = (await http.get<CustomerReport>('/admin/reports/customers', { params })).data
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
    if (t === 'sales') drawChart()
  },
  { immediate: true },
)

const current = computed(() => ({ sales: sales.value, orders: orders.value, products: products.value, customers: customers.value })[tab.value])
const currency = computed(() => current.value?.period.currency ?? 'VND')
const m = (v: number) => money(v, currency.value)
const title = computed(() => tr(tabs.find((t) => t.key === tab.value)!.title))

const visibleProducts = computed(() => {
  const rows = products.value?.products ?? []
  if (productFilter.value === 'sold') return rows.filter((r) => r.unitsSold > 0)
  if (productFilter.value === 'low') return rows.filter((r) => !r.isDeleted && r.stock <= r.lowStockThreshold)
  return rows
})

// ---- Chart ----
const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

async function drawChart() {
  await nextTick()
  chart?.destroy()
  chart = null
  const d = sales.value
  if (!canvas.value || !d) return
  const shortDate = new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short' })
  const compact = new Intl.NumberFormat(intlLocale(), { notation: 'compact', maximumFractionDigits: 1 })
  const colors = chartColors()
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--tenant-primary').trim() || '#2563eb'
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels: d.daily.map((x) => shortDate.format(new Date(`${x.date}T00:00:00`))),
      datasets: [{ data: d.daily.map((x) => x.netMinor), backgroundColor: primary, borderRadius: 3, maxBarThickness: 24 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const day = d.daily[ctx.dataIndex]!
              return `${tr('{amount} net', { amount: money(day.netMinor, d.period.currency) })} · ${day.orders === 1 ? tr('1 order') : tr('{n} orders', { n: day.orders })}`
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12, color: colors.tick } },
        y: { beginAtZero: true, border: { display: false }, grid: { color: colors.grid }, ticks: { color: colors.tick, callback: (v) => compact.format(Number(v)) } },
      },
    },
  })
}
onBeforeUnmount(() => chart?.destroy())

// ---- Export ----
function exportCsv() {
  const suffix = `${from.value}_${to.value}`
  if (tab.value === 'sales' && sales.value) {
    downloadCsv(`sales_${suffix}.csv`, [
      { header: tr('Date'), value: (r) => r.date },
      { header: tr('Orders'), value: (r) => r.orders },
      { header: tr('Units'), value: (r) => r.units },
      { header: tr('Gross sales'), value: (r) => r.grossMinor },
      { header: tr('Discounts'), value: (r) => r.discountMinor },
      { header: tr('Net sales'), value: (r) => r.netMinor },
      { header: tr('Shipping'), value: (r) => r.shippingMinor },
      { header: tr('Collected'), value: (r) => r.collectedMinor },
    ], sales.value.daily)
  } else if (tab.value === 'orders' && orders.value) {
    downloadCsv(`orders_${suffix}.csv`, [
      { header: tr('Order'), value: (r) => r.orderNumber },
      { header: tr('Placed at'), value: (r) => r.placedAt },
      { header: tr('Status'), value: (r) => tr(statusLabels[r.status]) },
      { header: tr('Customer'), value: (r) => r.recipientName },
      { header: tr('Email'), value: (r) => r.customerEmail },
      { header: tr('Guest'), value: (r) => (r.isGuest ? tr('yes') : tr('no')) },
      { header: tr('Units'), value: (r) => r.units },
      { header: tr('Subtotal'), value: (r) => r.subtotalMinor },
      { header: tr('Discount'), value: (r) => r.discountMinor },
      { header: tr('Shipping'), value: (r) => r.shippingMinor },
      { header: tr('Total'), value: (r) => r.totalMinor },
      { header: tr('Voucher'), value: (r) => r.voucherCode },
    ], orders.value.orders)
  } else if (tab.value === 'products' && products.value) {
    downloadCsv(`goods_${suffix}.csv`, [
      { header: tr('Product'), value: (r) => r.name },
      { header: tr('SKU'), value: (r) => r.sku },
      { header: tr('Category'), value: (r) => r.category },
      { header: tr('Units sold'), value: (r) => r.unitsSold },
      { header: tr('Gross sales'), value: (r) => r.grossMinor },
      { header: tr('Product discounts'), value: (r) => r.discountMinor },
      { header: tr('Net sales'), value: (r) => r.netMinor },
      { header: tr('Stock'), value: (r) => r.stock },
      { header: tr('Low-stock threshold'), value: (r) => r.lowStockThreshold },
      { header: tr('Status'), value: (r) => (r.isDeleted ? tr('deleted') : r.isActive ? tr('visible') : tr('hidden')) },
    ], visibleProducts.value)
  } else if (tab.value === 'customers' && customers.value) {
    downloadCsv(`customers_${suffix}.csv`, [
      { header: tr('Name'), value: (r) => r.name },
      { header: tr('Email'), value: (r) => r.email },
      { header: tr('Account'), value: (r) => (r.isRegistered ? tr('registered') : tr('guest')) },
      { header: tr('Tier'), value: (r) => r.tier },
      { header: tr('Orders'), value: (r) => r.orders },
      { header: tr('Units'), value: (r) => r.units },
      { header: tr('Spent'), value: (r) => r.spentMinor },
      { header: tr('First order'), value: (r) => r.firstOrderAt },
      { header: tr('Last order'), value: (r) => r.lastOrderAt },
    ], customers.value.customers)
  }
}

const print = () => window.print()
</script>

<template>
  <!-- Screen header -->
  <div class="flex flex-wrap items-center justify-between gap-3 print:hidden">
    <h1 class="text-2xl font-semibold">{{ $t('Reports') }}</h1>
    <div class="flex gap-2">
      <button class="btn btn-secondary" :disabled="!current || loading" @click="exportCsv">{{ $t('Export CSV') }}</button>
      <button class="btn btn-primary" :disabled="!current || loading" @click="print">{{ $t('Print') }}</button>
    </div>
  </div>

  <!-- Print header -->
  <div class="mb-6 hidden border-b border-stone-300 pb-3 print:block">
    <p class="text-sm text-stone-600">{{ admin.settings?.name }}</p>
    <h1 class="text-xl font-semibold">{{ title }}</h1>
    <p v-if="current" class="text-sm text-stone-600">
      {{ formatDate(current.period.from) }} – {{ formatDate(current.period.to) }} · {{ $t('generated {date}', { date: formatDateTime(current.period.generatedAt) }) }}
    </p>
  </div>

  <div class="mt-4 flex flex-wrap items-center gap-3 print:hidden">
    <div class="inline-flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1" role="tablist">
      <button v-for="t in tabs" :key="t.key" role="tab" :aria-selected="tab === t.key" :class="tab === t.key ? 'tab-active' : ''" class="tab" @click="go({ tab: t.key })">
        {{ $t(t.label) }}
      </button>
    </div>
    <form class="flex flex-wrap items-center gap-2 text-sm" @submit.prevent="go({ from: fromInput, to: toInput })">
      <input v-model="fromInput" type="date" :max="toInput" class="input w-auto" :aria-label="$t('From')" />
      <span class="text-stone-400">{{ $t('to') }}</span>
      <input v-model="toInput" type="date" :min="fromInput" class="input w-auto" :aria-label="$t('To')" />
      <button type="submit" class="btn btn-secondary">{{ $t('Apply') }}</button>
    </form>
    <div class="flex flex-wrap gap-1 text-xs">
      <button v-for="[k, label] in ([['today', 'Today'], ['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['month', 'This month'], ['lastMonth', 'Last month'], ['year', 'This year']] as const)" :key="k" class="rounded-full border border-stone-200 bg-surface px-2.5 py-1 text-stone-600 hover:border-stone-300 hover:text-stone-900" @click="preset(k)">
        {{ $t(label) }}
      </button>
    </div>
  </div>

  <p v-if="error" class="alert-error mt-6">{{ error }}</p>
  <div v-else-if="loading && !current" class="mt-6 h-96 animate-pulse rounded-xl bg-stone-200" />

  <div v-else-if="current" :class="{ 'opacity-60': loading }" class="mt-6 space-y-6 transition-opacity">
    <!-- Sales -->
    <template v-if="tab === 'sales' && sales">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Net sales') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ m(sales.totals.netMinor) }}</p>
          <p class="text-xs text-stone-500">{{ $t('{gross} gross − {discounts} discounts', { gross: m(sales.totals.grossMinor), discounts: m(sales.totals.discountMinor) }) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Collected (incl. shipping)') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ m(sales.totals.collectedMinor) }}</p>
          <p class="text-xs text-stone-500">{{ $t('{amount} shipping', { amount: m(sales.totals.shippingMinor) }) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Orders') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ sales.totals.orders }}</p>
          <p class="text-xs text-stone-500">{{ $t('{units} units · {cancelled} cancelled', { units: sales.totals.units, cancelled: sales.totals.cancelledOrders }) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Average order') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ m(sales.totals.averageOrderMinor) }}</p>
          <p class="text-xs text-stone-500">{{ $t('collected per order') }}</p>
        </div>
      </div>

      <div class="card p-4 sm:p-5 print:hidden">
        <h2 class="font-semibold">{{ $t('Net sales per day') }}</h2>
        <p class="text-sm text-stone-500">{{ $t('Excluding cancelled and refunded orders') }}</p>
        <div class="mt-4 h-64"><canvas ref="canvas" role="img" :aria-label="$t('Bar chart of net sales per day')" /></div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div class="card overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ $t('Date') }}</th>
                <th class="text-right">{{ $t('Orders') }}</th>
                <th class="text-right">{{ $t('Units') }}</th>
                <th class="text-right">{{ $t('Gross') }}</th>
                <th class="text-right">{{ $t('Discounts') }}</th>
                <th class="text-right">{{ $t('Net') }}</th>
                <th class="text-right">{{ $t('Collected') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in [...sales.daily].reverse()" :key="d.date" :class="{ 'text-stone-400 print:hidden': !d.orders }">
                <td class="whitespace-nowrap">{{ formatDate(d.date) }}</td>
                <td class="text-right">{{ d.orders }}</td>
                <td class="text-right">{{ d.units }}</td>
                <td class="text-right whitespace-nowrap">{{ m(d.grossMinor) }}</td>
                <td class="text-right whitespace-nowrap">{{ d.discountMinor ? `−${m(d.discountMinor)}` : '—' }}</td>
                <td class="text-right font-medium whitespace-nowrap">{{ m(d.netMinor) }}</td>
                <td class="text-right whitespace-nowrap">{{ m(d.collectedMinor) }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t-2 border-stone-200 font-semibold">
              <tr>
                <td class="px-4 py-2.5">{{ $t('Total') }}</td>
                <td class="px-4 py-2.5 text-right">{{ sales.totals.orders }}</td>
                <td class="px-4 py-2.5 text-right">{{ sales.totals.units }}</td>
                <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ m(sales.totals.grossMinor) }}</td>
                <td class="px-4 py-2.5 text-right whitespace-nowrap">−{{ m(sales.totals.discountMinor) }}</td>
                <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ m(sales.totals.netMinor) }}</td>
                <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ m(sales.totals.collectedMinor) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="card h-fit p-4">
          <h2 class="font-semibold">{{ $t('By category') }}</h2>
          <p class="text-xs text-stone-500">{{ $t('Net of product discounts') }}</p>
          <p v-if="!sales.byCategory.length" class="mt-3 text-sm text-stone-500">{{ $t('No sales in this period.') }}</p>
          <ul class="mt-3 space-y-3 text-sm">
            <li v-for="c in sales.byCategory" :key="c.category">
              <div class="flex justify-between gap-2">
                <span class="truncate">{{ c.category }}</span>
                <span class="font-medium whitespace-nowrap">{{ m(c.netMinor) }}</span>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div class="h-full rounded-full bg-primary" :style="{ width: `${Math.max(2, (c.netMinor / Math.max(1, sales.byCategory[0]!.netMinor)) * 100)}%` }" />
              </div>
              <p class="text-xs text-stone-500">{{ $t('{n} units', { n: c.units }) }}</p>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <!-- Orders -->
    <template v-else-if="tab === 'orders' && orders">
      <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('All orders') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ orders.totalOrders }}</p>
        </div>
        <div v-for="s in orders.byStatus" :key="s.status" class="card p-4">
          <StatusBadge :status="s.status" />
          <p class="mt-2 text-2xl font-semibold">{{ s.orders }}</p>
          <p class="text-xs text-stone-500">{{ m(s.totalMinor) }}</p>
        </div>
      </div>
      <p v-if="orders.truncated" class="alert-warning">{{ $t('Showing the newest {n} orders. Narrow the dates to see the rest.', { n: orders.orders.length.toLocaleString() }) }}</p>
      <div v-if="!orders.orders.length" class="card p-10 text-center text-stone-600">{{ $t('No orders in this period.') }}</div>
      <div v-else class="card overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ $t('Order') }}</th>
              <th>{{ $t('Placed') }}</th>
              <th>{{ $t('Customer') }}</th>
              <th>{{ $t('Status') }}</th>
              <th class="text-right">{{ $t('Units') }}</th>
              <th class="text-right">{{ $t('Discount') }}</th>
              <th class="text-right">{{ $t('Total') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in orders.orders" :key="o.orderNumber">
              <td>
                <RouterLink :to="{ name: 'admin-order', params: { number: o.orderNumber } }" class="font-mono font-medium text-primary hover:underline print:text-stone-900">{{ o.orderNumber }}</RouterLink>
              </td>
              <td class="whitespace-nowrap text-stone-600">{{ formatDateTime(o.placedAt) }}</td>
              <td>
                <p>{{ o.recipientName }}<span v-if="o.isGuest" class="ml-1 text-xs text-stone-400">({{ $t('guest') }})</span></p>
                <p class="text-xs text-stone-500">{{ o.customerEmail }}</p>
              </td>
              <td><StatusBadge :status="o.status" /></td>
              <td class="text-right">{{ o.units }}</td>
              <td class="text-right whitespace-nowrap">
                {{ o.discountMinor ? `−${m(o.discountMinor)}` : '—' }}
                <span v-if="o.voucherCode" class="block font-mono text-xs text-stone-500">{{ o.voucherCode }}</span>
              </td>
              <td class="text-right font-medium whitespace-nowrap">{{ m(o.totalMinor) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Goods -->
    <template v-else-if="tab === 'products' && products">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Products') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ products.inventory.products }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Units in stock') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ products.inventory.unitsInStock.toLocaleString() }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Stock value') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ m(products.inventory.stockValueMinor) }}</p>
          <p class="text-xs text-stone-500">{{ $t('at list price') }}</p>
        </div>
        <button class="card p-4 text-left hover:border-amber-300 print:hidden" @click="productFilter = 'low'">
          <p class="text-sm text-stone-500">{{ $t('Running low') }}</p>
          <p class="mt-1 text-2xl font-semibold" :class="{ 'text-amber-700': products.inventory.lowStock }">{{ products.inventory.lowStock }}</p>
        </button>
        <button class="card p-4 text-left hover:border-red-300 print:hidden" @click="productFilter = 'low'">
          <p class="text-sm text-stone-500">{{ $t('Out of stock') }}</p>
          <p class="mt-1 text-2xl font-semibold" :class="{ 'text-red-700': products.inventory.outOfStock }">{{ products.inventory.outOfStock }}</p>
        </button>
      </div>
      <div class="inline-flex gap-1 rounded-lg bg-stone-100 p-1 print:hidden">
        <button v-for="[k, label] in ([['all', 'All products'], ['sold', 'Sold in period'], ['low', 'Needs restock']] as const)" :key="k" :class="productFilter === k ? 'tab-active' : ''" class="tab" @click="productFilter = k">
          {{ $t(label) }}
        </button>
      </div>
      <div class="card overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ $t('Product') }}</th>
              <th>{{ $t('Category') }}</th>
              <th class="text-right">{{ $t('Units sold') }}</th>
              <th class="text-right">{{ $t('Gross') }}</th>
              <th class="text-right">{{ $t('Net') }}</th>
              <th class="text-right">{{ $t('Stock') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!visibleProducts.length"><td colspan="6" class="py-8 text-center text-stone-500">{{ $t('Nothing to show.') }}</td></tr>
            <tr v-for="p in visibleProducts" :key="p.productId">
              <td>
                <RouterLink v-if="!p.isDeleted" :to="{ name: 'admin-product-edit', params: { id: p.productId } }" class="font-medium hover:text-primary">{{ p.name }}</RouterLink>
                <span v-else class="text-stone-500">{{ p.name }} <span class="text-xs">({{ $t('deleted') }})</span></span>
                <span v-if="p.sku" class="block font-mono text-xs text-stone-500">{{ p.sku }}</span>
              </td>
              <td class="text-stone-600">{{ p.category ?? '—' }}</td>
              <td class="text-right">{{ p.unitsSold }}</td>
              <td class="text-right whitespace-nowrap">{{ m(p.grossMinor) }}</td>
              <td class="text-right font-medium whitespace-nowrap">{{ m(p.netMinor) }}</td>
              <td class="text-right whitespace-nowrap">
                <template v-if="p.isDeleted">—</template>
                <span v-else :class="p.stock === 0 ? 'font-semibold text-red-600' : p.stock <= p.lowStockThreshold ? 'font-semibold text-amber-700' : ''">{{ p.stock }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Customers -->
    <template v-else-if="tab === 'customers' && customers">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Buyers') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ customers.buyers }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Repeat buyers') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ customers.repeatBuyers }}</p>
          <p class="text-xs text-stone-500">{{ $t('{n}% ordered more than once', { n: customers.buyers ? Math.round((customers.repeatBuyers / customers.buyers) * 100) : 0 }) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('New accounts') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ customers.newAccounts }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Guest orders') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ customers.guestOrders }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">{{ $t('Average spend') }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ m(customers.averageSpendMinor) }}</p>
          <p class="text-xs text-stone-500">{{ $t('per buyer') }}</p>
        </div>
      </div>
      <div v-if="!customers.customers.length" class="card p-10 text-center text-stone-600">{{ $t('No buyers in this period.') }}</div>
      <div v-else class="card overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ $t('Customer') }}</th>
              <th>{{ $t('Tier') }}</th>
              <th class="text-right">{{ $t('Orders') }}</th>
              <th class="text-right">{{ $t('Units') }}</th>
              <th class="text-right">{{ $t('Spent') }}</th>
              <th>{{ $t('Last order') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in customers.customers" :key="c.email">
              <td>
                <p class="font-medium">{{ c.name }}<span v-if="!c.isRegistered" class="ml-1 text-xs font-normal text-stone-400">({{ $t('guest') }})</span></p>
                <p class="text-xs text-stone-500">{{ c.email }}</p>
              </td>
              <td>{{ c.tier ?? '—' }}</td>
              <td class="text-right">{{ c.orders }}</td>
              <td class="text-right">{{ c.units }}</td>
              <td class="text-right font-medium whitespace-nowrap">{{ m(c.spentMinor) }}</td>
              <td class="whitespace-nowrap text-stone-600">{{ formatDate(c.lastOrderAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
