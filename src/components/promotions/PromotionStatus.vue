<script setup lang="ts">
import type { PromotionStatus } from '@/api/types'

defineProps<{ status: PromotionStatus }>()

const styles: Record<PromotionStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Scheduled: 'bg-sky-50 text-sky-700 ring-sky-200',
  Expired: 'bg-stone-100 text-stone-500 ring-stone-200',
  'Used up': 'bg-stone-100 text-stone-500 ring-stone-200',
  Off: 'bg-stone-100 text-stone-500 ring-stone-200',
}
</script>

<template>
  <span :class="styles[status]" class="pill ring-1 ring-inset">{{ $t(status) }}</span>
</template>
