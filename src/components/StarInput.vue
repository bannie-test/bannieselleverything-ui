<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '@/i18n'

const rating = defineModel<number>({ required: true })
const hover = ref(0)
const labels = computed(() => [t('Terrible'), t('Poor'), t('Okay'), t('Good'), t('Excellent')])
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="flex" role="radiogroup" :aria-label="$t('Rating')" @mouseleave="hover = 0">
      <button
        v-for="star in 5"
        :key="star"
        type="button"
        role="radio"
        :aria-checked="rating === star"
        :aria-label="`${star === 1 ? $t('1 star') : $t('{n} stars', { n: star })}: ${labels[star - 1]}`"
        class="p-0.5 focus-visible:outline-2 focus-visible:outline-primary"
        @mouseenter="hover = star"
        @click="rating = star"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" class="h-7 w-7" :class="star <= (hover || rating) ? 'text-amber-400' : 'text-stone-300'">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      </button>
    </div>
    <span class="text-sm text-stone-600">{{ labels[(hover || rating) - 1] ?? $t('Choose a rating') }}</span>
  </div>
</template>
