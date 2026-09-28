<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'

const props = withDefaults(defineProps<{ rating: number | null; count?: number | null; size?: 'sm' | 'md' | 'lg' }>(), {
  count: null,
  size: 'sm',
})

/** Fill fraction (0–1) of each of the five stars, so 3.5 shows three and a half. */
const fills = computed(() => [0, 1, 2, 3, 4].map((i) => Math.min(1, Math.max(0, (props.rating ?? 0) - i))))
const sizeClass = computed(() => ({ sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' })[props.size])
const label = computed(() => (props.rating == null ? t('No ratings yet') : t('Rated {rating} out of 5', { rating: props.rating.toFixed(1) })))
</script>

<template>
  <span class="inline-flex items-center gap-1" :aria-label="label" role="img">
    <span class="inline-flex" aria-hidden="true">
      <span v-for="(fill, i) in fills" :key="i" :class="sizeClass" class="relative">
        <svg viewBox="0 0 20 20" class="absolute inset-0 h-full w-full text-stone-300" fill="currentColor">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
        <span class="absolute inset-0 overflow-hidden" :style="{ width: `${fill * 100}%` }">
          <svg viewBox="0 0 20 20" :class="sizeClass" class="text-amber-400" fill="currentColor">
            <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
        </span>
      </span>
    </span>
    <span v-if="count !== null" class="text-xs text-stone-500">({{ count }})</span>
  </span>
</template>
