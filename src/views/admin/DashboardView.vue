<script setup lang="ts">
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { http } from '@/api/client'
import type { Dashboard } from '@/api/types'
import { intlLocale, t } from '@/i18n'
import { money } from '@/utils/format'
import { chartColors } from '@/utils/theme'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const data = ref<Dashboard | null>(null)
const failed = ref(false)
const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null


onMounted(async () => {
  try {
    data.value = (await http.get<Dashboard>('/admin/dashboard')).data
  } catch {
    failed.value = true
    return
  }
  await nextTick()
  if (!canvas.value || !data.value) return

  const d = data.value
  const shortDate = new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short' })
  const compact = new Intl.NumberFormat(intlLocale(), { notation: 'compact', maximumFractionDigits: 1 })
  const colors = chartColors()
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--tenant-primary').trim() || '#2563eb'
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels: d.daily.map((x) => shortDate.format(new Date(x.date))),
      datasets: [{ data: d.daily.map((x) => x.revenueMinor), backgroundColor: primary, borderRadius: 4, maxBarThickness: 24 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const day = d.daily[ctx.dataIndex]!
              return `${money(day.revenueMinor, d.currency)} · ${day.orders === 1 ? t('1 order') : t('{n} orders', { n: day.orders })}`
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
})

onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <h1 class="text-2xl font-semibold">{{ $t('Dashboard') }}</h1>

  <p v-if="failed" class="alert-error mt-6">{{ $t("Couldn't load the dashboard. Please refresh.") }}</p>
  <div v-else-if="!data" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-xl bg-stone-200" />
  </div>

  <template v-else>
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="card p-4">
        <p class="text-sm text-stone-500">{{ $t('Revenue today') }}</p>
        <p class="mt-1 text-2xl font-semibold">{{ money(data.revenueTodayMinor, data.currency) }}</p>
        <p class="text-xs text-stone-500">{{ data.ordersToday === 1 ? $t('1 order') : $t('{n} orders', { n: data.ordersToday }) }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-stone-500">{{ $t('Last 30 days') }}</p>
        <p class="mt-1 text-2xl font-semibold">{{ money(data.revenue30DaysMinor, data.currency) }}</p>
        <p class="text-xs text-stone-500">{{ $t('{n} orders', { n: data.orders30Days }) }}</p>
      </div>
      <RouterLink :to="{ name: 'admin-orders', query: { status: 'Pending' } }" class="card p-4 transition hover:border-amber-300">
        <p class="text-sm text-stone-500">{{ $t('Awaiting confirmation') }}</p>
        <p class="mt-1 text-2xl font-semibold" :class="{ 'text-amber-700': data.pendingOrders }">{{ data.pendingOrders }}</p>
        <p class="text-xs text-stone-500">{{ $t('orders to review') }} →</p>
      </RouterLink>
      <RouterLink :to="{ name: 'admin-products', query: { lowStock: '1' } }" class="card p-4 transition hover:border-red-300">
        <p class="text-sm text-stone-500">{{ $t('Low stock') }}</p>
        <p class="mt-1 text-2xl font-semibold" :class="{ 'text-red-700': data.lowStockProducts }">{{ data.lowStockProducts }}</p>
        <p class="text-xs text-stone-500">{{ $t('of {n} active products', { n: data.activeProducts }) }} →</p>
      </RouterLink>
      <RouterLink :to="{ name: 'admin-orders', query: { status: 'AwaitingPayment' } }" class="card p-4 transition hover:border-amber-300">
        <p class="text-sm text-stone-500">{{ $t('Awaiting bank transfer') }}</p>
        <p class="mt-1 text-2xl font-semibold" :class="{ 'text-amber-700': data.awaitingPaymentOrders }">{{ data.awaitingPaymentOrders }}</p>
        <p class="text-xs text-stone-500">{{ $t('payments to confirm') }} →</p>
      </RouterLink>
      <RouterLink :to="{ name: 'admin-support', query: { status: 'Open' } }" class="card p-4 transition hover:border-amber-300">
        <p class="text-sm text-stone-500">{{ $t('Support requests') }}</p>
        <p class="mt-1 text-2xl font-semibold" :class="{ 'text-amber-700': data.openSupportTickets }">{{ data.openSupportTickets }}</p>
        <p class="text-xs text-stone-500">{{ $t('waiting for a reply') }} →</p>
      </RouterLink>
    </div>

    <div class="card mt-6 p-4 sm:p-5">
      <h2 class="font-semibold">{{ $t('Daily revenue') }}</h2>
      <p class="text-sm text-stone-500">{{ $t('Last 30 days, excluding cancelled orders') }}</p>
      <div class="mt-4 h-64">
        <canvas ref="canvas" role="img" :aria-label="$t('Bar chart of daily revenue for the last 30 days')" />
      </div>
    </div>
  </template>
</template>
