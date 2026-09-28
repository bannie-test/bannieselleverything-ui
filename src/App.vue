<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { locale } from '@/i18n'

// The API returns shop content (product names, categories…) in the chosen language, so a
// language switch remounts the page and everything it shows is fetched again.
const pageKey = computed(() => locale.value)
</script>

<template>
  <RouterView :key="pageKey" />
</template>
