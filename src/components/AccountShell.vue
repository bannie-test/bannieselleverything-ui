<script setup lang="ts">
import { useCustomerStore } from '@/stores/customer'
import AccountNav from './AccountNav.vue'

defineProps<{ title: string }>()
const customer = useCustomerStore()
</script>

<template>
  <div class="flex flex-col gap-6 lg:flex-row">
    <aside class="lg:w-52 lg:shrink-0">
      <p class="mb-2 hidden truncate px-3 text-sm text-stone-500 lg:block">{{ customer.customer?.fullName }}</p>
      <AccountNav />
    </aside>
    <section class="min-w-0 flex-1">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-semibold">{{ title }}</h1>
        <slot name="actions" />
      </div>
      <slot />
    </section>
  </div>
</template>
