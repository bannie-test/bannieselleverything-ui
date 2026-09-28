<script setup lang="ts">
import { computed } from 'vue'
import { type Locale, locale, locales, setLocale } from '@/i18n'

/** `compact`: one button that shows the current language and switches to the other. */
defineProps<{ compact?: boolean }>()

const current = computed(() => locale.value)
const other = computed(() => locales.find((l) => l.key !== locale.value)!)

function select(key: Locale) {
  setLocale(key)
}
</script>

<!-- VI | EN toggle. Inherits the surrounding text color, so it works on light, dark and brand backgrounds. -->
<template>
  <button
    v-if="compact"
    type="button"
    :title="other.label"
    :lang="other.key"
    class="rounded-md border border-current/20 px-1.5 py-1 text-xs font-medium opacity-80 hover:opacity-100"
    @click="select(other.key)"
  >
    {{ locales.find((l) => l.key === current)!.short }}
  </button>
  <div v-else class="inline-flex shrink-0 overflow-hidden rounded-md border border-current/20 text-xs font-medium" role="group" :aria-label="$t('Language')">
    <button
      v-for="l in locales"
      :key="l.key"
      type="button"
      :title="l.label"
      :lang="l.key"
      :aria-pressed="current === l.key"
      :class="current === l.key ? 'bg-current/15' : 'opacity-60 hover:opacity-100'"
      class="px-2 py-1"
      @click="select(l.key)"
    >
      {{ l.short }}
    </button>
  </div>
</template>
